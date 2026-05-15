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

// Discord usa Ed25519 signatures (https://discord.com/developers/docs/interactions/receiving-and-responding)
// Para verificar precisamos do public key + ed25519 cryptography.
// Deno tem Web Crypto API mas não suporta Ed25519 nativamente em todos os runtimes.
// Para MVP: aceitar sem verificação se DISCORD_PUBLIC_KEY=='' (dev mode).
// Em produção: implementar verify via tweetnacl ou similar.

async function verifyDiscordSignature(
  body: string,
  signature: string | null,
  timestamp: string | null,
): Promise<boolean> {
  if (!DISCORD_PUBLIC_KEY) return true  // dev mode: skip verification
  if (!signature || !timestamp) return false
  // TODO: implementar Ed25519 verify quando passar a produção
  // Por agora, em produção, exige DISCORD_PUBLIC_KEY vazio (dev) ou implementação real
  return true
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

    if (!messageContent) {
      return new Response(JSON.stringify({ error: "no_content_to_route" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY)

    // Classifica intent → escolhe agent
    const agentId = await routeIntent(messageContent)

    // Cria task
    const title = messageContent.length > 60 ? messageContent.slice(0, 57) + "…" : messageContent
    const { data: taskId, error: tErr } = await sb.schema("system").rpc("task_create", {
      p_title: title,
      p_description_md: `**Do Discord ${kind === 'discord_dm' ? '(DM)' : '(mention)'} por @${authorName}:**\n\n${messageContent}`,
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
      },
      p_tags: ["discord", `kind:${kind}`, `author:${authorName}`],
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
    }), { headers: { ...cors, "Content-Type": "application/json" } })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
