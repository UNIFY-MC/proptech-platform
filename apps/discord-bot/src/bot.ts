/* Property007 Discord Bot — Gateway listener
 *
 * Conecta ao Discord Gateway WebSocket, ouve MESSAGE_CREATE events,
 * e reencaminha para a edge fn `discord-inbound` da Supabase.
 *
 * Vars env obrigatórias:
 *   DISCORD_BOT_TOKEN
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 *
 * Health endpoint HTTP (porta 8080) para Fly.io ping.
 */

const TOKEN          = Deno.env.get("DISCORD_BOT_TOKEN") || ""
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL") || ""
const SUPABASE_ANON  = Deno.env.get("SUPABASE_ANON_KEY") || ""
const PORT           = parseInt(Deno.env.get("PORT") || "8080")

if (!TOKEN || !SUPABASE_URL || !SUPABASE_ANON) {
  console.error("[bot] Missing env vars: DISCORD_BOT_TOKEN, SUPABASE_URL, SUPABASE_ANON_KEY")
  Deno.exit(1)
}

// Intents bitwise — precisamos: GUILDS (1) + GUILD_MESSAGES (512) + MESSAGE_CONTENT (32768)
const INTENTS = (1 << 0) | (1 << 9) | (1 << 15)

const state = {
  ws: null as WebSocket | null,
  sequence: null as number | null,
  sessionId: null as string | null,
  resumeUrl: null as string | null,
  heartbeatTimer: 0,
  heartbeatAcked: true,
  reconnectAttempts: 0,
  lastEventAt: Date.now(),
  msgCount: 0,
}

function log(...args: unknown[]) {
  console.log(`[${new Date().toISOString()}]`, ...args)
}

async function forwardToSupabase(msg: any) {
  try {
    const body = {
      channel_id:      msg.channel_id,
      guild_id:        msg.guild_id,
      author_id:       msg.author.id,
      author_username: msg.author.username,
      author_bot:      msg.author.bot,
      content:         msg.content,
      message_id:      msg.id,
      mentions:        (msg.mentions || []).map((m: any) => ({ id: m.id, username: m.username })),
      attachments:     msg.attachments || [],
      raw_event:       "MESSAGE_CREATE",
    }
    const res = await fetch(`${SUPABASE_URL}/functions/v1/discord-inbound`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON}`,
        "apikey":        SUPABASE_ANON,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      log(`[forward] discord-inbound ${res.status}: ${(await res.text()).slice(0, 150)}`)
    } else {
      state.msgCount++
    }
  } catch (e) {
    log(`[forward] error: ${String(e)}`)
  }
}

function startHeartbeat(interval: number) {
  if (state.heartbeatTimer) clearInterval(state.heartbeatTimer)
  state.heartbeatTimer = setInterval(() => {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return
    if (!state.heartbeatAcked) {
      log("[heartbeat] no ACK from last beat — closing for reconnect")
      state.ws.close(4000)
      return
    }
    state.heartbeatAcked = false
    state.ws.send(JSON.stringify({ op: 1, d: state.sequence }))
  }, interval)
}

function connect() {
  const url = state.resumeUrl
    ? `${state.resumeUrl}?v=10&encoding=json`
    : "wss://gateway.discord.gg/?v=10&encoding=json"

  log(`[gateway] connecting to ${url}`)
  state.ws = new WebSocket(url)

  state.ws.onopen = () => {
    log("[gateway] connected")
    state.heartbeatAcked = true
    state.reconnectAttempts = 0
  }

  state.ws.onmessage = (event) => {
    state.lastEventAt = Date.now()
    let data: any
    try { data = JSON.parse(event.data as string) } catch { return }
    if (data.s) state.sequence = data.s

    // OPCODE 10 — HELLO
    if (data.op === 10) {
      const interval = data.d.heartbeat_interval
      log(`[gateway] hello — heartbeat ${interval}ms`)
      startHeartbeat(interval)

      // RESUME se temos sessão
      if (state.sessionId && state.sequence != null) {
        log("[gateway] resuming session")
        state.ws!.send(JSON.stringify({
          op: 6,
          d: { token: TOKEN, session_id: state.sessionId, seq: state.sequence },
        }))
      } else {
        // IDENTIFY
        log("[gateway] identifying")
        state.ws!.send(JSON.stringify({
          op: 2,
          d: {
            token: TOKEN,
            intents: INTENTS,
            properties: { os: "linux", browser: "property007-bot", device: "property007-bot" },
            presence: { status: "online", activities: [{ name: "Property007", type: 3 }] },
          },
        }))
      }
    }

    // OPCODE 11 — HEARTBEAT ACK
    if (data.op === 11) {
      state.heartbeatAcked = true
    }

    // OPCODE 9 — INVALID SESSION (precisa de re-identify)
    if (data.op === 9) {
      log("[gateway] invalid session — re-identifying")
      state.sessionId = null
      state.resumeUrl = null
      setTimeout(() => state.ws?.close(), 1500)
    }

    // OPCODE 7 — RECONNECT
    if (data.op === 7) {
      log("[gateway] server asked reconnect")
      state.ws?.close(4000)
    }

    // OPCODE 0 — DISPATCH
    if (data.op === 0) {
      if (data.t === "READY") {
        state.sessionId = data.d.session_id
        state.resumeUrl = data.d.resume_gateway_url
        log(`[gateway] READY — session ${state.sessionId} — ${data.d.guilds.length} guilds`)
      }
      if (data.t === "RESUMED") {
        log("[gateway] RESUMED")
      }
      if (data.t === "MESSAGE_CREATE") {
        // Skip mensagens do próprio bot
        if (data.d.author?.bot) return
        log(`[message] #${data.d.channel_id} @${data.d.author?.username}: ${(data.d.content || "").slice(0, 80)}`)
        forwardToSupabase(data.d).catch(() => {})
      }
    }
  }

  state.ws.onclose = (event) => {
    log(`[gateway] closed code=${event.code} reason="${event.reason}"`)
    if (state.heartbeatTimer) clearInterval(state.heartbeatTimer)
    state.heartbeatTimer = 0
    // Backoff exponencial: 1s, 2s, 4s, 8s, 16s, max 30s
    const delay = Math.min(1000 * (2 ** state.reconnectAttempts), 30_000)
    state.reconnectAttempts++
    log(`[gateway] reconnecting in ${delay}ms (attempt ${state.reconnectAttempts})`)
    setTimeout(() => connect(), delay)
  }

  state.ws.onerror = (e) => {
    log(`[gateway] error: ${(e as any).message || "unknown"}`)
  }
}

// HTTP health endpoint para Fly.io
Deno.serve({ port: PORT }, (req) => {
  const url = new URL(req.url)
  if (url.pathname === "/health" || url.pathname === "/") {
    return Response.json({
      ok: true,
      ws_state: state.ws ? ["CONNECTING","OPEN","CLOSING","CLOSED"][state.ws.readyState] : "null",
      session_id: state.sessionId,
      sequence: state.sequence,
      messages_forwarded: state.msgCount,
      reconnect_attempts: state.reconnectAttempts,
      last_event_ago_s: Math.round((Date.now() - state.lastEventAt) / 1000),
    })
  }
  return new Response("not found", { status: 404 })
})

log(`[bot] Property007 Discord listener starting · health on :${PORT}`)
connect()
