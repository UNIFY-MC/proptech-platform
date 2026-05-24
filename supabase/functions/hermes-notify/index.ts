/* hermes-notify v1 — ADR-018 Phase 2B
 *
 * Outbound: CookAI / agentes internos → Hermes Agent (Nous Research) via Discord webhook.
 *
 * Padrão D7-2 do ADR-018:
 *   "CookAI notifica → Hermes acta"
 *
 * Fluxo:
 *   1. Serviço interno (cron, recipe, trigger) faz POST com payload de notificação
 *   2. EF resolve webhook_url de system.agent_channels WHERE agent_id='hermes_executor'
 *   3. Opcionalmente enriquece body lendo do source_table (approvals_queue | tasks | swarm_discoveries)
 *   4. Formata embed Discord (cor por urgência, emoji por event_type) em PT-PT
 *   5. POSTa para Discord webhook (Hermes Agent escuta canal #hermes e age)
 *   6. Regista em core.agent_audit_log (agent_name='hermes_notify' → Source 6 activity_unified)
 *
 * Idempotência: agent_audit_log NÃO tem unique key — caller deve garantir não enviar duplicados.
 * (Para idempotência por approval_id / task_id, caller deve verificar previously sent.)
 *
 * Auth: verify_jwt=true (default). Esperado service_role do caller interno.
 *
 * Fallback gracioso:
 *   - webhook_url IS NULL ou active=false → 503 com mensagem clara (estado placeholder válido)
 *   - row de canal não existe → 404
 *   - Discord rejeita → 502 com detalhe
 *
 * Refs: ADR-018 Phase 2B, migration 202605240300 (Source 6 activity_unified + seed channel placeholder)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

const HERMES_AGENT_ID = "hermes_executor"

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })

type EventType = "approval_required" | "task_completed" | "task_failed" | "discovery_alert" | "custom"
type Urgency   = "low" | "normal" | "high" | "critical"

interface NotifyBody {
  event_type: EventType
  source_table?: "system.approvals_queue" | "system.tasks" | "system.swarm_discoveries" | null
  source_id?: string | null
  subject: string
  body_md?: string
  urgency?: Urgency
  vertical?: string | null
  pessoa_id?: string | null
  workspace_id?: string | null
  extra?: Record<string, unknown>
}

// Discord embed colours (decimal)
const COLOR_BY_URGENCY: Record<Urgency, number> = {
  low:      0x6b6458,  // muted grey
  normal:   0x1a5296,  // blue (PropTech canónico)
  high:     0x8c6508,  // gold (atenção)
  critical: 0x8b1a1a,  // red (urgente)
}

const EMOJI_BY_EVENT: Record<EventType, string> = {
  approval_required: "🔐",
  task_completed:    "✅",
  task_failed:       "❌",
  discovery_alert:   "🔍",
  custom:            "📢",
}

const TITLE_BY_EVENT: Record<EventType, string> = {
  approval_required: "Aprovação requerida",
  task_completed:    "Tarefa concluída",
  task_failed:       "Tarefa falhou",
  discovery_alert:   "Descoberta swarm",
  custom:            "Notificação",
}

type Sb = ReturnType<typeof createClient>

async function enrichFromSource(
  sb: Sb,
  table: NonNullable<NotifyBody["source_table"]>,
  id: string,
): Promise<string | null> {
  try {
    if (table === "system.approvals_queue") {
      const { data } = await sb.schema("system").from("approvals_queue")
        .select("source_agent, action_type, draft_message, target_vertical, status")
        .eq("id", id).maybeSingle()
      if (!data) return null
      const parts = [
        `**Agente origem:** ${data.source_agent || "—"}`,
        `**Tipo de acção:** ${data.action_type || "—"}`,
        `**Vertical:** ${data.target_vertical || "—"}`,
        `**Estado:** ${data.status || "pending"}`,
      ]
      if (data.draft_message) {
        parts.push("", "**Mensagem proposta:**", String(data.draft_message).slice(0, 500))
      }
      return parts.join("\n")
    }
    if (table === "system.tasks") {
      const { data } = await sb.schema("system").from("tasks")
        .select("title, status, kind, priority, owner_agent_id, description_md")
        .eq("id", id).maybeSingle()
      if (!data) return null
      const parts = [
        `**Título:** ${data.title || "—"}`,
        `**Estado:** ${data.status || "—"}`,
        `**Kind:** ${data.kind || "—"}`,
        `**Prioridade:** ${data.priority || "normal"}`,
        `**Owner:** ${data.owner_agent_id || "—"}`,
      ]
      if (data.description_md) {
        parts.push("", String(data.description_md).slice(0, 500))
      }
      return parts.join("\n")
    }
    if (table === "system.swarm_discoveries") {
      const { data } = await sb.schema("system").from("swarm_discoveries")
        .select("title, summary, kind, significance, source_url, niche_id")
        .eq("id", id).maybeSingle()
      if (!data) return null
      const parts = [
        `**Título:** ${data.title || "—"}`,
        `**Kind:** ${data.kind || "—"}`,
        `**Significância:** ${data.significance ?? "—"}`,
        `**Niche:** ${data.niche_id || "—"}`,
      ]
      if (data.source_url) parts.push(`**Fonte:** ${data.source_url}`)
      if (data.summary)    parts.push("", String(data.summary).slice(0, 500))
      return parts.join("\n")
    }
  } catch (e) {
    console.warn("enrich_from_source_failed", table, id, e)
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return json({ error: "method_not_allowed", allow: ["POST", "OPTIONS"] }, 405)

  let body: NotifyBody
  try {
    body = await req.json()
  } catch {
    return json({ error: "invalid_json_body" }, 400)
  }

  const subject   = (body.subject || "").trim()
  const eventType = (body.event_type || "custom") as EventType
  const urgency   = (body.urgency   || "normal")  as Urgency

  if (!subject) {
    return json({ error: "missing_subject" }, 400)
  }
  if (!(eventType in EMOJI_BY_EVENT)) {
    return json({ error: "invalid_event_type", allowed: Object.keys(EMOJI_BY_EVENT) }, 400)
  }
  if (!(urgency in COLOR_BY_URGENCY)) {
    return json({ error: "invalid_urgency", allowed: Object.keys(COLOR_BY_URGENCY) }, 400)
  }

  const sb: Sb = createClient(SUPABASE_URL, SERVICE_KEY)

  // 1. Resolver canal Hermes
  const { data: channel, error: chErr } = await sb.schema("system").from("agent_channels")
    .select("webhook_url, active, channel_name, display_name")
    .eq("agent_id", HERMES_AGENT_ID)
    .eq("channel_type", "discord")
    .maybeSingle()

  if (chErr) {
    return json({ error: "channel_lookup_failed", detail: chErr.message }, 500)
  }
  if (!channel) {
    return json({
      error: "hermes_channel_not_seeded",
      hint: "Verificar migration 202605240300 (seed system.agent_channels para hermes_executor).",
    }, 404)
  }
  if (!channel.active || !channel.webhook_url) {
    return json({
      ok: false,
      skipped: "hermes_channel_inactive_or_placeholder",
      hint:
        "webhook_url ainda não preenchido. " +
        "Mário deve: (1) Discord → Server Settings → Integrations → Webhooks → criar webhook em #hermes; " +
        "(2) UPDATE system.agent_channels SET webhook_url='<URL>', channel_id='<snowflake>', active=true " +
        "WHERE agent_id='hermes_executor' AND channel_type='discord';",
    }, 503)
  }

  // 2. Enriquecer body com contexto da source row (se aplicável)
  let bodyMd = (body.body_md || "").trim()
  if (!bodyMd && body.source_table && body.source_id) {
    const enriched = await enrichFromSource(sb, body.source_table, body.source_id)
    if (enriched) bodyMd = enriched
  }

  // 3. Construir embed Discord PT-PT
  const emoji = EMOJI_BY_EVENT[eventType]
  const title = `${emoji} ${TITLE_BY_EVENT[eventType]}: ${subject}`.slice(0, 256)

  const fields: { name: string; value: string; inline?: boolean }[] = []
  if (body.vertical)    fields.push({ name: "Vertical",     value: body.vertical,                                                        inline: true })
  if (body.source_table) fields.push({ name: "Source",       value: body.source_table.replace("system.", ""),                             inline: true })
  if (body.source_id)   fields.push({ name: "Source ID",    value: `\`${body.source_id.slice(0, 8)}…\``,                                  inline: true })
  if (body.pessoa_id)   fields.push({ name: "Pessoa",       value: `\`${body.pessoa_id.slice(0, 8)}…\``,                                  inline: true })

  // Extra fields (max 5 para evitar lotação Discord)
  if (body.extra && typeof body.extra === "object") {
    const extraKeys = Object.keys(body.extra).slice(0, 5)
    for (const k of extraKeys) {
      const v = body.extra[k]
      const valStr = typeof v === "object" ? JSON.stringify(v).slice(0, 200) : String(v).slice(0, 200)
      fields.push({ name: k, value: valStr || "—", inline: true })
    }
  }

  const embed: Record<string, unknown> = {
    title,
    color: COLOR_BY_URGENCY[urgency],
    description: bodyMd ? bodyMd.slice(0, 4000) : undefined,
    fields: fields.length > 0 ? fields : undefined,
    timestamp: new Date().toISOString(),
    footer: { text: `PropTech · ${eventType} · urgência ${urgency}` },
  }

  const username = channel.display_name?.trim() || "Property007 · Hermes"

  const discordPayload: Record<string, unknown> = {
    username: username.slice(0, 80),
    embeds: [embed],
  }

  // 4. POST Discord webhook (wait=true para receber id da mensagem)
  const webhookUrl = channel.webhook_url.includes("?")
    ? `${channel.webhook_url}&wait=true`
    : `${channel.webhook_url}?wait=true`

  const startedAt = Date.now()
  let discordRes: Response
  try {
    discordRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordPayload),
    })
  } catch (e) {
    return json({ error: "discord_fetch_failed", detail: String(e) }, 502)
  }

  if (!discordRes.ok) {
    const errText = await discordRes.text()
    return json({
      error: "discord_post_failed",
      status: discordRes.status,
      detail: errText.slice(0, 400),
    }, 502)
  }

  let discordMessage: { id?: string; channel_id?: string } = {}
  try {
    discordMessage = await discordRes.json()
  } catch {
    // wait=true devolve sempre JSON, mas tolera falha de parse
  }
  const durationMs = Date.now() - startedAt

  // 5. Registar em core.agent_audit_log (agent_name='hermes_notify' → Source 6)
  //    A materialized view activity_unified faz refresh por cron */1min.
  const { data: auditRow, error: auditErr } = await sb.schema("core").from("agent_audit_log").insert({
    agent_name: "hermes_notify",
    objective: subject,
    tool_name: "discord_webhook_post",
    tool_input: {
      event_type: eventType,
      urgency,
      source_table: body.source_table || null,
      source_id:    body.source_id    || null,
      vertical:     body.vertical     || null,
    },
    tool_output: {
      discord_message_id: discordMessage.id || null,
      discord_channel_id: discordMessage.channel_id || channel.channel_name || null,
      embed_title: title,
    },
    duration_ms: durationMs,
    stop_reason: "discord_post_ok",
    pessoa_id: body.pessoa_id || null,
    organization_id: body.workspace_id || null,
  }).select("id").maybeSingle()

  if (auditErr) {
    // Não falhar a EF se o audit falhou — Discord post já foi feito com sucesso.
    console.warn("[hermes-notify] audit_log_insert_failed:", auditErr.message)
  }

  return json({
    ok: true,
    discord_message_id: discordMessage.id || null,
    audit_log_id: auditRow?.id || null,
    duration_ms: durationMs,
    event_type: eventType,
    urgency,
  })
})
