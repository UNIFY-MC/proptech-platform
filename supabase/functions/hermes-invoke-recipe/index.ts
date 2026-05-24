/* hermes-invoke-recipe v1 — ADR-018 Phase 1B
 *
 * Wrapper REST para Hermes Agent (Nous Research, self-hosted) invocar recipes
 * do CookAI catalog (system.recipes) com api_key auth + permission grants.
 *
 * Fluxo:
 *  1. Hermes envia POST com x-api-key header + body { recipe_slug | recipe_id, payload, idempotency_key? }
 *  2. EF valida api_key via iam.api_key_can('system.recipes_exec', 'create')
 *  3. EF verifica que recipe existe + active
 *  4. EF cria system.tasks (kind='recipe_invoke') via RPC system.task_create
 *  5. EF devolve { task_id, recipe_slug, status: 'queued' }
 *  6. Hermes faz polling GET (futuro: subscribe Realtime) para resultado
 *
 * Pattern D7-1 do ADR-018: Hermes orquestra → CookAI executa.
 *
 * Auth: x-api-key header (não JWT). verify_jwt=false. Validação custom via iam.api_key_can.
 *
 * Audit: cada invocação loga em core.agent_audit_log via system.task_create trigger.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type,x-api-key,x-idempotency-key",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed", allow: ["POST", "OPTIONS"] }, 405)
  }

  try {
    // 1. Extrair api_key do header (ou Authorization: Bearer <key>)
    const apiKey =
      req.headers.get("x-api-key") ||
      (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "")

    if (!apiKey || apiKey.length < 16) {
      return json({ error: "missing_or_invalid_api_key" }, 401)
    }

    // 2. Parse body
    let body: { recipe_slug?: string; recipe_id?: string; payload?: unknown; idempotency_key?: string }
    try {
      body = await req.json()
    } catch {
      return json({ error: "invalid_json_body" }, 400)
    }

    const recipeSlug    = (body.recipe_slug || "").trim()
    const recipeId      = (body.recipe_id || "").trim()
    const payload       = body.payload || {}
    const idempotencyKey =
      body.idempotency_key ||
      req.headers.get("x-idempotency-key") ||
      crypto.randomUUID()

    if (!recipeSlug && !recipeId) {
      return json({ error: "missing_recipe_slug_or_id" }, 400)
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY)

    // 3. Validar api_key + permission via iam.api_key_can
    //    (RPC SECURITY DEFINER que faz bcrypt match + check permission_grants)
    const { data: canExec, error: permErr } = await sb.schema("iam").rpc("api_key_can", {
      p_api_key: apiKey,
      p_section: "system.recipes_exec",
      p_action:  "create",
    })

    if (permErr) {
      console.error("api_key_can_error", permErr)
      return json({ error: "permission_check_failed", detail: permErr.message }, 500)
    }

    if (canExec !== true) {
      return json({ error: "forbidden_invalid_key_or_no_permission" }, 403)
    }

    // 4. Resolver recipe (slug → id) + validar active
    let resolvedRecipeId = recipeId
    let resolvedSlug     = recipeSlug
    let recipeName       = ""
    let recipeAgent      = ""

    const recipeQuery = sb
      .schema("system")
      .from("recipes")
      .select("id, slug, name, status, employee_id")
      .limit(1)

    const { data: recipeRow, error: rErr } = recipeId
      ? await recipeQuery.eq("id", recipeId).maybeSingle()
      : await recipeQuery.eq("slug", recipeSlug).maybeSingle()

    if (rErr) {
      return json({ error: "recipe_lookup_failed", detail: rErr.message }, 500)
    }
    if (!recipeRow) {
      return json({ error: "recipe_not_found", recipe_slug: recipeSlug, recipe_id: recipeId }, 404)
    }
    if (recipeRow.status !== "active") {
      return json({
        error: "recipe_not_active",
        recipe_slug: recipeRow.slug,
        current_status: recipeRow.status,
      }, 409)
    }

    resolvedRecipeId = recipeRow.id
    resolvedSlug     = recipeRow.slug
    recipeName       = recipeRow.name
    recipeAgent      = recipeRow.employee_id || ""

    // 5. Idempotência: verificar se já existe task com este idempotency_key
    //    Tasks recentes (últimas 24h) com source_kind='hermes' + tag idempotency_key
    const idemTag = `idempotency:${idempotencyKey}`
    const { data: existing } = await sb
      .schema("system")
      .from("tasks")
      .select("id, status")
      .contains("tags", [idemTag])
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1)
      .maybeSingle()

    if (existing) {
      return json({
        ok: true,
        task_id: existing.id,
        recipe_slug: resolvedSlug,
        status: existing.status,
        idempotency_key: idempotencyKey,
        note: "task_already_exists_returning_existing",
      })
    }

    // 6. Criar task via RPC system.task_create
    const title = `Hermes: ${recipeName}`
    const description = `Invocado por Hermes Agent (Nous Research) via REST API.\n\n**Recipe:** ${resolvedSlug}\n**Idempotency key:** ${idempotencyKey}\n\n**Payload:**\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``

    // TODO Phase 1B+1: criar migration que expande tasks_kind_check para incluir 'recipe_invoke'
    // Por agora usa kind='task' com tag 'recipe_invoke' para distinção (constraint-safe)
    const { data: taskId, error: tErr } = await sb.schema("system").rpc("task_create", {
      p_title: title,
      p_description_md: description,
      p_kind: "task",
      p_priority: "normal",
      p_vertical: null,
      p_owner_agent_id: recipeAgent || null,
      p_source_kind: "hermes",
      p_source_id: null,
      p_payload: {
        recipe: {
          id: resolvedRecipeId,
          slug: resolvedSlug,
          name: recipeName,
          employee_id: recipeAgent,
        },
        invocation: {
          payload,
          idempotency_key: idempotencyKey,
          invoked_at: new Date().toISOString(),
        },
      },
      p_tags: [
        "hermes",
        "recipe_invoke",
        `recipe:${resolvedSlug}`,
        idemTag,
      ],
    })

    if (tErr) {
      console.error("task_create_failed", tErr)
      return json({ error: "task_create_failed", detail: tErr.message }, 500)
    }

    return json({
      ok: true,
      task_id: taskId,
      recipe_slug: resolvedSlug,
      recipe_name: recipeName,
      status: "queued",
      idempotency_key: idempotencyKey,
    }, 202)
  } catch (e) {
    console.error("unexpected_error", e)
    return json({ error: "internal_error", detail: String(e) }, 500)
  }
})
