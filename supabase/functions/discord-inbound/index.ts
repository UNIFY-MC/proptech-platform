/* discord-inbound v1 — Sprint Q2
 *
 * Recebe webhook do Discord (configurado em discord.com/developers/applications)
 * Tipo de mensagem: MESSAGE_CREATE com mention ao bot OU DM ao bot.
 *
 * Pipeline:
 * 1. Valida assinatura (header X-Signature-Ed25519)
 * 2. Se INTERACTION_PING (Discord verifica endpoint), responde PONG
 * 3. Senão classifica intent via Claude Haiku → agent_id
 * 4. Cria task system.tasks kind='discord_mention'
 * 5. Responde 200 OK para Discord
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || ""
const DISCORD_PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY") || ""
const MODEL = "claude-haiku-4-5-20251001"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type,x-signature-ed25519,x-signature-timestamp",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

async function verifyDiscordSignature(
  body: string,
  signature: string | null,
  timestamp: string | null,
): Promise<boolean> {
  if (!DISCORD_PUBLIC_KEY) return true  // dev mode: skip verification
  if (!signature || !timestamp) return false
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      hexToBytes(DISCORD_PUBLIC_KEY),
      { name: "Ed25519" },
      false,
      ["verify"],
    )
    return await crypto.subtle.verify(
      "Ed25519",
      key,
      hexToBytes(signature),
      new TextEncoder().encode(timestamp + body),
    )
  } catch {
    return false
  }
}

const ROUTING_HEADS = [
  { id: "bia",                desc: "operations V5, manutenção, prestadores, avarias" },
  { id: "orquestrador-condo", desc: "operações V2 condomínio, assembleias, gestão geral" },
  { id: "diretor-marketing",  desc: "marketing, conteúdo, campanhas, leads pipeline" },
  { id: "gestor-leads",       desc: "sales, leads qualification, follow-up" },
  { id: "financeiro-condo",   desc: "finance V2, quotas, faturas, mora, juros" },
  { id: "atendimento-condo",  desc: "support V2, dúvidas condóminos, comunicação" },
  { id: "compliance-condo",   desc: "legal V2, RGPD, Código Civil, DL 268/94, prazos legais" },
]

async function routeIntent(message: string): Promise<string> {
  const sys = `És router de intents. Escolhe o agent que melhor responde.\n\n` +
    ROUTING_HEADS.map(h => `- ${h.id}: ${h.desc}`).join("\n") +
    `\n\nResponde APENAS com agent_id (uma palavra). Default em dúvida: orquestrador-condo.`

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 30,
        system: sys,
        messages: [{ role: "user", content: message }],
      }),
    })
    if (!res.ok) return "orquestrador-condo"
    const data = await res.json()
    const text = (data.content?.[0]?.text || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "")
    return ROUTING_HEADS.find(h => h.id === text)?.id || "orquestrador-condo"
  } catch {
    return "orquestrador-condo"
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405, headers: cors })

  try {
    const bodyText = await req.text()
    const signature = req.headers.get("x-signature-ed25519")
    const timestamp = req.headers.get("x-signature-timestamp")

    const verified = await verifyDiscordSignature(bodyText, signature, timestamp)
    if (!verified) {
      return new Response("invalid signature", { status: 401, headers: cors })
    }

    const body = JSON.parse(bodyText)

    // Discord PING (verification quando configuras o interaction endpoint)
    if (body.type === 1) {
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    // Outbound webhook events (configurado via "Outgoing webhook" em servidor)
    // ou Discord Slash Command / Application Command
    // Formato esperado: { type:'mention'|'dm', content, author: { id, username }, channel_id, message_id }
    const messageContent: string = body.content || body.data?.options?.[0]?.value || ""
    const authorId: string = body.author?.id || body.member?.user?.id || ""
    const authorName: string = body.author?.username || body.member?.user?.username || "unknown"
    const channelId: string = body.channel_id || ""
    const messageId: string = body.id || body.token || ""
    const kind: string = body.type === "dm" ? "discord_dm" : "discord_mention"

    // Anexos do Discord (ficheiros que o Mário envia à Sandra)
    const rawAttachments: any[] = Array.isArray(body.attachments) ? body.attachments : []

    // Sem texto E sem anexos → nada a fazer
    if (!messageContent && rawAttachments.length === 0) {
      return new Response(JSON.stringify({ error: "no_content_to_route" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY)

    // Descarrega cada anexo do CDN do Discord e guarda em Storage (condo-uploads).
    // Assim a Sandra (e as recipes) conseguem ler o ficheiro via service role.
    const UPLOAD_BUCKET = "condo-uploads"
    const storedAttachments: any[] = []
    for (const att of rawAttachments) {
      try {
        const url = att.url || att.proxy_url
        if (!url) continue
        const res = await fetch(url)
        if (!res.ok) { storedAttachments.push({ filename: att.filename, error: `download ${res.status}` }); continue }
        const bytes = new Uint8Array(await res.arrayBuffer())
        const safe = String(att.filename || "anexo").replace(/[^\w.\-]+/g, "_")
        const stamp = new Date().toISOString().replace(/[:.]/g, "-")
        const objectPath = `recipes/discord/${stamp}-${safe}`
        const { error: upErr } = await sb.storage.from(UPLOAD_BUCKET).upload(objectPath, bytes, {
          upsert: true, contentType: att.content_type || undefined,
        })
        if (upErr) { storedAttachments.push({ filename: att.filename, error: upErr.message }); continue }
        storedAttachments.push({
          filename: att.filename,
          content_type: att.content_type || null,
          size: att.size ?? bytes.length,
          storage_path: `${UPLOAD_BUCKET}/${objectPath}`,
        })
      } catch (e) {
        storedAttachments.push({ filename: att?.filename, error: String(e) })
      }
    }

    // Texto efectivo para routing (se só há anexo, usa nome do ficheiro como pista)
    const routingText = messageContent ||
      `ficheiro ${storedAttachments.map((a) => a.filename).filter(Boolean).join(", ")}`

    // Classifica intent → escolhe agent. Anexo XLSX de carregadores → orquestrador-condo (Sandra).
    let agentId = await routeIntent(routingText)
    const hasSpreadsheet = storedAttachments.some((a) =>
      /\.(xlsx|xls|csv)$/i.test(a.filename || "") || /spreadsheet|excel|csv/i.test(a.content_type || ""))
    if (hasSpreadsheet && /carregad|quota|eletric|kwh|contagem/i.test(routingText)) {
      agentId = "orquestrador-condo"
    }

    // Cria task
    const baseTitle = messageContent || `Anexo: ${storedAttachments.map((a) => a.filename).filter(Boolean).join(", ") || "ficheiro"}`
    const title = baseTitle.length > 60 ? baseTitle.slice(0, 57) + "…" : baseTitle
    const attachmentsMd = storedAttachments.length
      ? `\n\n**Anexos (${storedAttachments.length}):**\n` +
        storedAttachments.map((a) => a.storage_path
          ? `- \`${a.filename}\` → \`${a.storage_path}\``
          : `- \`${a.filename}\` ⚠️ ${a.error}`).join("\n")
      : ""
    const { data: taskId, error: tErr } = await sb.schema("system").rpc("task_create", {
      p_title: title,
      p_description_md: `**Do Discord ${kind === 'discord_dm' ? '(DM)' : '(mention)'} por @${authorName}:**\n\n${messageContent || '(sem texto)'}${attachmentsMd}`,
      p_kind: kind,
      p_priority: "normal",
      p_vertical: null,
      p_owner_agent_id: agentId,
      p_source_kind: "discord",
      p_source_id: null,
      p_payload: {
        discord: {
          author_id: authorId,
          author_name: authorName,
          channel_id: channelId,
          message_id: messageId,
          raw_content: messageContent,
        },
        attachments: storedAttachments,
      },
      p_tags: ["discord", `kind:${kind}`, `author:${authorName}`,
        ...(storedAttachments.length ? ["has-attachment"] : [])],
    })

    if (tErr) {
      return new Response(JSON.stringify({ error: "task_create_failed", detail: tErr.message }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({
      ok: true,
      task_id: taskId,
      routed_to: agentId,
      attachments_stored: storedAttachments,
    }), { headers: { ...cors, "Content-Type": "application/json" } })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
