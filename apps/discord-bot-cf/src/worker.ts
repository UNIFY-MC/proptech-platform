/* proptech-discord Worker — entry HTTP
 *
 * Rotas:
 *   GET /         → status simples
 *   GET /health   → proxy para BotDO/health
 *   GET /start    → força wake-up do BotDO (chama connect se idle)
 *   GET /stop     → fecha WS (debug)
 *
 * Cron handler (scheduled):
 *   pinga BotDO a cada 5min para garantir que está vivo (defensive heartbeat).
 *
 * Toda a lógica WebSocket vive no Durable Object BotDO (src/bot-do.ts).
 */

import { BotDO } from "./bot-do"
export { BotDO }

export interface Env {
  BOT_DO: DurableObjectNamespace
  DISCORD_BOT_TOKEN: string
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
}

function getStub(env: Env): DurableObjectStub {
  // Singleton — sempre o mesmo DO
  const id = env.BOT_DO.idFromName("singleton")
  return env.BOT_DO.get(id)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    if (path === "/") {
      return Response.json({
        ok: true,
        service: "proptech-discord",
        version: "0.1.0",
        endpoints: ["/health", "/start", "/stop"],
      })
    }

    if (path === "/health" || path === "/start" || path === "/stop") {
      const stub = getStub(env)
      return stub.fetch(request)
    }

    return new Response("not found", { status: 404 })
  },

  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    // Cron tick a cada 5min — chama /health para garantir DO acordado
    const stub = getStub(env)
    try {
      await stub.fetch("https://internal/health")
    } catch (e) {
      console.error("[scheduled] ping failed:", e)
    }
  },
}
