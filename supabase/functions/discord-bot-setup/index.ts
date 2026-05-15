/* discord-bot-setup v1 — Sprint Q2.1
 *
 * POST { server_id, dry_run? }
 *
 * Usa DISCORD_BOT_TOKEN (Bot scope) para criar a estrutura inicial do server:
 *   - Categorias: 📊 GERAL · 🏢 VERTICAIS · 🤝 CROSS
 *   - Canais: anuncios, equipa-geral, executivo, v2..v10, cross-funcional
 *   - Webhook em #equipa-geral (default p/ todos os agents)
 *   - Webhook em #executivo (default p/ C-suite)
 *
 * Idempotente: se canal/webhook já existe, salta.
 *
 * Resposta:
 *   { ok, server_id, channels: {...}, general_webhook_url, executivo_webhook_url }
 *
 * Próximo passo (chamado pelo dashboard a seguir):
 *   - Bulk-upsert 16+ rows em system.agent_channels via RPC agent_channel_upsert
 */

const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN") || ""
const DISCORD_API = "https://discord.com/api/v10"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

const authHeaders = {
  "Authorization": `Bot ${BOT_TOKEN}`,
  "Content-Type": "application/json",
  "User-Agent": "Property007/1.0 (proptech-platform)",
}

// Estrutura desejada — ordem importa (categories primeiro, depois children)
type ChannelSpec = { name: string; type: number; topic?: string; parent_key?: string }

const STRUCTURE: Record<string, ChannelSpec> = {
  // Categories (type 4)
  cat_geral:       { name: "📊 GERAL",            type: 4 },
  cat_verticais:   { name: "🏢 VERTICAIS",        type: 4 },
  cat_cross:       { name: "🤝 CROSS-FUNCIONAL",  type: 4 },

  // GERAL children (type 0 = text)
  anuncios:        { name: "anuncios",        type: 0, parent_key: "cat_geral",   topic: "Avisos do sistema · Mário publica · agents read-only" },
  equipa_geral:    { name: "equipa-geral",    type: 0, parent_key: "cat_geral",   topic: "💬 Todos os agents falam aqui. Webhook default. Mário monitora." },
  executivo:       { name: "executivo",       type: 0, parent_key: "cat_geral",   topic: "🎯 C-suite only (CEO, CFO, CTO, CMO, COO)" },

  // VERTICAIS children
  v2_condominios:  { name: "v2-condominios",  type: 0, parent_key: "cat_verticais", topic: "🏢 V2 Condomínios — Orquestrador, Atendimento, Financeiro, Manutenção, Seguros" },
  v3_seguros:      { name: "v3-seguros",      type: 0, parent_key: "cat_verticais", topic: "🛡️ V3 Seguros — Sofia + cross V2" },
  v4_energia:      { name: "v4-energia",      type: 0, parent_key: "cat_verticais", topic: "⚡ V4 Energia — Enzo + cross V2" },
  v5_manutencao:   { name: "v5-manutencao",   type: 0, parent_key: "cat_verticais", topic: "🔧 V5 Manutenção — Bia (Maintenance Concierge)" },
  v6_reabilitacao: { name: "v6-reabilitacao", type: 0, parent_key: "cat_verticais", topic: "🏗️ V6 Reabilitação — em construção" },
  v7_real_estate:  { name: "v7-real-estate",  type: 0, parent_key: "cat_verticais", topic: "🏘️ V7 Real Estate — em construção" },
  v8_rentals:      { name: "v8-rentals",      type: 0, parent_key: "cat_verticais", topic: "🛏️ V8 Rentals — em construção" },
  v9_baas:         { name: "v9-baas",         type: 0, parent_key: "cat_verticais", topic: "🏦 V9 BaaS Swan — em construção" },
  v10_owners:      { name: "v10-owners",      type: 0, parent_key: "cat_verticais", topic: "⭐ V10 Owners Club — em construção" },

  // CROSS children
  cross_funcional: { name: "cross-funcional", type: 0, parent_key: "cat_cross",     topic: "🤝 Conversas entre Compliance, Financeiro, Atendimento, Docs, Comunicação" },
}

async function discordFetch(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${DISCORD_API}${path}`, {
    ...init,
    headers: { ...authHeaders, ...(init?.headers || {}) },
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`discord_api ${res.status} ${path}: ${txt.slice(0, 300)}`)
  }
  return await res.json()
}

async function getOrCreateChannel(
  guildId: string,
  spec: ChannelSpec,
  parentId: string | null,
  existing: any[]
): Promise<{ id: string; name: string; created: boolean }> {
  // Match by name (case-insensitive) + parent_id + type
  const found = existing.find(c =>
    c.name?.toLowerCase() === spec.name.toLowerCase() &&
    c.type === spec.type &&
    (spec.type === 4 ? !c.parent_id : c.parent_id === parentId)
  )
  if (found) {
    return { id: found.id, name: found.name, created: false }
  }
  const body: Record<string, unknown> = {
    name: spec.name,
    type: spec.type,
  }
  if (spec.topic) body.topic = spec.topic
  if (parentId) body.parent_id = parentId

  const created = await discordFetch(`/guilds/${guildId}/channels`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  return { id: created.id, name: created.name, created: true }
}

async function getOrCreateWebhook(channelId: string, name: string): Promise<{ url: string; created: boolean; id: string }> {
  const existing = await discordFetch(`/channels/${channelId}/webhooks`)
  const found = existing.find((w: any) => w.name === name)
  if (found) {
    return {
      id: found.id,
      url: `https://discord.com/api/webhooks/${found.id}/${found.token}`,
      created: false,
    }
  }
  const wh = await discordFetch(`/channels/${channelId}/webhooks`, {
    method: "POST",
    body: JSON.stringify({ name }),
  })
  return {
    id: wh.id,
    url: `https://discord.com/api/webhooks/${wh.id}/${wh.token}`,
    created: true,
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405, headers: cors })

  if (!BOT_TOKEN) {
    return new Response(JSON.stringify({ error: "DISCORD_BOT_TOKEN secret not set" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }

  try {
    const { server_id, dry_run = false } = await req.json()
    if (!server_id) {
      return new Response(JSON.stringify({ error: "server_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    // 1. Verificar que bot está no server
    const guild = await discordFetch(`/guilds/${server_id}`)

    // 2. Listar canais existentes
    const existing = await discordFetch(`/guilds/${server_id}/channels`)

    if (dry_run) {
      return new Response(JSON.stringify({
        ok: true, dry_run: true,
        guild_name: guild.name,
        existing_channels: existing.map((c: any) => ({ name: c.name, type: c.type, id: c.id })),
        would_create: Object.entries(STRUCTURE).map(([k, s]) => ({
          key: k, name: s.name, type: s.type, parent_key: s.parent_key,
          already_exists: !!existing.find((c: any) => c.name?.toLowerCase() === s.name.toLowerCase() && c.type === s.type),
        })),
      }), { headers: { ...cors, "Content-Type": "application/json" } })
    }

    // 3. Criar categorias primeiro (sem parent)
    const channelMap: Record<string, { id: string; name: string; created: boolean }> = {}
    for (const [key, spec] of Object.entries(STRUCTURE)) {
      if (spec.type === 4) {
        channelMap[key] = await getOrCreateChannel(server_id, spec, null, existing)
      }
    }
    // Refresh existing após categorias
    const afterCategories = await discordFetch(`/guilds/${server_id}/channels`)

    // 4. Criar text channels com parent
    for (const [key, spec] of Object.entries(STRUCTURE)) {
      if (spec.type === 0 && spec.parent_key) {
        const parentId = channelMap[spec.parent_key]?.id
        if (!parentId) continue
        channelMap[key] = await getOrCreateChannel(server_id, spec, parentId, afterCategories)
      }
    }

    // 5. Criar webhooks em equipa-geral + executivo
    const generalChannelId = channelMap.equipa_geral?.id
    const executivoChannelId = channelMap.executivo?.id

    let generalWebhook: any = null
    let executivoWebhook: any = null

    if (generalChannelId) {
      generalWebhook = await getOrCreateWebhook(generalChannelId, "Property007 Team")
    }
    if (executivoChannelId) {
      executivoWebhook = await getOrCreateWebhook(executivoChannelId, "Property007 Executive")
    }

    return new Response(JSON.stringify({
      ok: true,
      server_id,
      guild_name: guild.name,
      channels: Object.fromEntries(
        Object.entries(channelMap).map(([k, v]) => [k, { id: v.id, name: v.name, created: v.created }])
      ),
      general_channel_id: generalChannelId,
      executivo_channel_id: executivoChannelId,
      general_webhook_url: generalWebhook?.url,
      general_webhook_created: generalWebhook?.created,
      executivo_webhook_url: executivoWebhook?.url,
      executivo_webhook_created: executivoWebhook?.created,
    }), { headers: { ...cors, "Content-Type": "application/json" } })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
