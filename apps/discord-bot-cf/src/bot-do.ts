/* BotDO — Durable Object que segura WS Discord Gateway
 *
 * Estratégia:
 *   - 1 instância única (singleton via idFromName('singleton'))
 *   - WebSocket OUTGOING para Discord Gateway (não usa Hibernating WS porque
 *     Hibernating só se aplica a WS incoming/acceptado)
 *   - Heartbeat via DO Alarm (sobrevive a evictions melhor que setInterval)
 *   - Estado persistido em storage: session_id, sequence, resume_url
 *   - Reconnect automático com backoff exponencial
 *   - Forward MESSAGE_CREATE → Supabase discord-inbound edge fn
 */

interface Env {
  DISCORD_BOT_TOKEN: string
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
}

// Intents bitwise: GUILDS (1<<0) + GUILD_MESSAGES (1<<9) + MESSAGE_CONTENT (1<<15)
const INTENTS = (1 << 0) | (1 << 9) | (1 << 15)

interface BotState {
  sessionId: string | null
  sequence: number | null
  resumeUrl: string | null
  heartbeatInterval: number
  heartbeatAcked: boolean
  reconnectAttempts: number
  msgCount: number
  lastEventAt: number
  startedAt: number
}

export class BotDO {
  private state: DurableObjectState
  private env: Env
  private ws: WebSocket | null = null
  private mem: BotState

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
    this.mem = {
      sessionId: null,
      sequence: null,
      resumeUrl: null,
      heartbeatInterval: 41250,
      heartbeatAcked: true,
      reconnectAttempts: 0,
      msgCount: 0,
      lastEventAt: Date.now(),
      startedAt: Date.now(),
    }

    // Hidrata estado persistente assincronamente
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get<Partial<BotState>>("state")
      if (stored) {
        this.mem = { ...this.mem, ...stored, heartbeatAcked: true, startedAt: Date.now() }
      }
    })
  }

  private log(...args: unknown[]) {
    console.log(`[BotDO ${new Date().toISOString()}]`, ...args)
  }

  private async persist() {
    await this.state.storage.put("state", {
      sessionId: this.mem.sessionId,
      sequence: this.mem.sequence,
      resumeUrl: this.mem.resumeUrl,
      msgCount: this.mem.msgCount,
    })
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const path = url.pathname

    if (path === "/health") {
      return Response.json({
        ok: true,
        ws_state: this.ws ? ["CONNECTING", "OPEN", "CLOSING", "CLOSED"][this.ws.readyState] : "null",
        session_id: this.mem.sessionId,
        sequence: this.mem.sequence,
        messages_forwarded: this.mem.msgCount,
        reconnect_attempts: this.mem.reconnectAttempts,
        last_event_ago_s: Math.round((Date.now() - this.mem.lastEventAt) / 1000),
        uptime_s: Math.round((Date.now() - this.mem.startedAt) / 1000),
        has_alarm: (await this.state.storage.getAlarm()) !== null,
      })
    }

    if (path === "/start") {
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        this.connect()
        return Response.json({ ok: true, action: "connecting" })
      }
      return Response.json({ ok: true, action: "already_connected", ws_state: this.ws.readyState })
    }

    if (path === "/stop") {
      if (this.ws) {
        this.ws.close(1000, "manual stop")
        return Response.json({ ok: true, action: "closing" })
      }
      return Response.json({ ok: true, action: "noop_not_connected" })
    }

    return new Response("not found", { status: 404 })
  }

  // Alarm handler — usado para heartbeat
  async alarm() {
    try {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.log("[alarm] WS not open — triggering reconnect")
        this.connect()
        return
      }

      if (!this.mem.heartbeatAcked) {
        this.log("[alarm] previous heartbeat NOT acked — closing for reconnect")
        try { this.ws.close(4000, "heartbeat timeout") } catch {}
        this.connect()
        return
      }

      this.mem.heartbeatAcked = false
      this.ws.send(JSON.stringify({ op: 1, d: this.mem.sequence }))

      // Schedule next heartbeat
      await this.state.storage.setAlarm(Date.now() + this.mem.heartbeatInterval)
    } catch (e) {
      this.log("[alarm] error:", String(e))
      // Tenta reagendar para não perder o loop
      await this.state.storage.setAlarm(Date.now() + 30_000)
    }
  }

  private connect() {
    const url = this.mem.resumeUrl
      ? `${this.mem.resumeUrl}?v=10&encoding=json`
      : "wss://gateway.discord.gg/?v=10&encoding=json"

    this.log("[gateway] connecting", url)
    try {
      this.ws = new WebSocket(url)
    } catch (e) {
      this.log("[gateway] new WebSocket() threw:", String(e))
      this.scheduleReconnect()
      return
    }

    this.ws.addEventListener("open", () => {
      this.log("[gateway] open")
      this.mem.heartbeatAcked = true
      this.mem.reconnectAttempts = 0
    })

    this.ws.addEventListener("message", (event: MessageEvent) => {
      this.mem.lastEventAt = Date.now()
      this.handleMessage(event.data as string).catch((e) => {
        this.log("[handleMessage] error:", String(e))
      })
    })

    this.ws.addEventListener("close", (event: CloseEvent) => {
      this.log(`[gateway] close code=${event.code} reason="${event.reason}"`)
      this.scheduleReconnect()
    })

    this.ws.addEventListener("error", (event: Event) => {
      this.log("[gateway] error event", (event as any).message || "unknown")
    })
  }

  private async handleMessage(raw: string) {
    let data: any
    try { data = JSON.parse(raw) } catch { return }
    if (data.s) this.mem.sequence = data.s

    // OPCODE 10 — HELLO
    if (data.op === 10) {
      this.mem.heartbeatInterval = data.d.heartbeat_interval
      this.log(`[gateway] HELLO heartbeat=${this.mem.heartbeatInterval}ms`)
      // Arranca heartbeat via alarm
      await this.state.storage.setAlarm(Date.now() + this.mem.heartbeatInterval)

      // Tenta RESUME se temos sessão
      if (this.mem.sessionId && this.mem.sequence != null) {
        this.log("[gateway] RESUME attempt")
        this.ws!.send(JSON.stringify({
          op: 6,
          d: {
            token: this.env.DISCORD_BOT_TOKEN,
            session_id: this.mem.sessionId,
            seq: this.mem.sequence,
          },
        }))
      } else {
        this.log("[gateway] IDENTIFY")
        this.ws!.send(JSON.stringify({
          op: 2,
          d: {
            token: this.env.DISCORD_BOT_TOKEN,
            intents: INTENTS,
            properties: { os: "linux", browser: "proptech-discord", device: "proptech-discord" },
            presence: { status: "online", activities: [{ name: "PropTech", type: 3 }] },
          },
        }))
      }
      return
    }

    // OPCODE 11 — HEARTBEAT ACK
    if (data.op === 11) {
      this.mem.heartbeatAcked = true
      return
    }

    // OPCODE 9 — INVALID SESSION
    if (data.op === 9) {
      this.log("[gateway] INVALID SESSION — clearing session, will re-identify")
      this.mem.sessionId = null
      this.mem.resumeUrl = null
      await this.persist()
      setTimeout(() => { try { this.ws?.close(1000) } catch {} }, 1500)
      return
    }

    // OPCODE 7 — RECONNECT requested
    if (data.op === 7) {
      this.log("[gateway] server asked RECONNECT")
      try { this.ws?.close(4000) } catch {}
      return
    }

    // OPCODE 0 — DISPATCH
    if (data.op === 0) {
      if (data.t === "READY") {
        this.mem.sessionId = data.d.session_id
        this.mem.resumeUrl = data.d.resume_gateway_url
        await this.persist()
        this.log(`[gateway] READY session=${this.mem.sessionId} guilds=${data.d.guilds?.length || 0}`)
      }
      if (data.t === "RESUMED") {
        this.log("[gateway] RESUMED")
      }
      if (data.t === "MESSAGE_CREATE") {
        const m = data.d
        if (m.author?.bot) return  // anti-loop
        this.log(`[msg] #${m.channel_id} @${m.author?.username}: ${(m.content || "").slice(0, 80)}`)
        await this.forward(m).catch((e) => this.log("[forward] error:", String(e)))
      }
    }
  }

  private async forward(msg: any): Promise<void> {
    const body = {
      channel_id:      msg.channel_id,
      guild_id:        msg.guild_id,
      author_id:       msg.author?.id,
      author_username: msg.author?.username,
      author_bot:      msg.author?.bot,
      content:         msg.content,
      message_id:      msg.id,
      mentions:        (msg.mentions || []).map((u: any) => ({ id: u.id, username: u.username })),
      attachments:     msg.attachments || [],
      raw_event:       "MESSAGE_CREATE",
    }
    const res = await fetch(`${this.env.SUPABASE_URL}/functions/v1/discord-inbound`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${this.env.SUPABASE_ANON_KEY}`,
        "apikey":        this.env.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => "")
      this.log(`[forward] discord-inbound ${res.status}: ${txt.slice(0, 200)}`)
    } else {
      this.mem.msgCount++
      await this.persist()
    }
  }

  private scheduleReconnect() {
    const delay = Math.min(1000 * (2 ** this.mem.reconnectAttempts), 30_000)
    this.mem.reconnectAttempts++
    this.log(`[gateway] reconnect in ${delay}ms (attempt ${this.mem.reconnectAttempts})`)
    setTimeout(() => this.connect(), delay)
  }
}
