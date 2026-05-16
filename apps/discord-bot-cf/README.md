# proptech-discord — Listener Discord Gateway (CF Workers + Durable Objects)

Bot listener always-on para Discord. Worker recebe HTTP, Durable Object segura
WebSocket persistente ao Discord Gateway v10, reencaminha `MESSAGE_CREATE` para
a edge function `discord-inbound` da Supabase.

## Stack

- **Cloudflare Worker** — entry HTTP + cron 5min (wake-up defensivo)
- **Durable Object `BotDO`** — singleton, 1 instância global, segura WS
- **Heartbeat via DO Alarm** — sobrevive a evictions melhor que setInterval
- **State persistido** — `session_id`, `sequence`, `resume_url`, `msg_count`

## Deploy (≈5 min)

Pré-requisito: conta Cloudflare + `wrangler` instalado e autenticado.

```powershell
cd apps\discord-bot-cf
npm install
wrangler deploy
```

Devolve `Published proptech-discord (.../...workers.dev)`.

## Secrets (correr uma vez)

```powershell
wrangler secret put DISCORD_BOT_TOKEN
# cola o bot token (não é o public key — é o Bot Token de Bot tab)

wrangler secret put SUPABASE_URL
# https://hkmvszkpxjbxmnixzqbl.supabase.co

wrangler secret put SUPABASE_ANON_KEY
# anon key do Supabase Dashboard → Project Settings → API
```

## Arrancar o bot

Após deploy, fazer um GET para acordar o DO e abrir a primeira conexão:

```powershell
curl https://proptech-discord.<sub>.workers.dev/start
```

Resposta esperada:
```json
{ "ok": true, "action": "connecting" }
```

Verificar status:
```powershell
curl https://proptech-discord.<sub>.workers.dev/health
```

Resposta esperada após ~3s:
```json
{
  "ok": true,
  "ws_state": "OPEN",
  "session_id": "abc123...",
  "messages_forwarded": 0,
  "reconnect_attempts": 0,
  "last_event_ago_s": 1,
  "has_alarm": true
}
```

## Verificar no Discord

1. Abre Discord → server `proptech`
2. Sidebar membros → bot `property007` aparece **Online** (verde)
3. Escreve em qualquer canal: `@property007 olá`
4. Em ~5s deve aparecer task em `/tasks` no dashboard

## Logs ao vivo

```powershell
wrangler tail
```

## Custos (free tier CF)

- 100k requests/dia free Workers
- 1M DO requests/mês free
- DO storage 1GB free
- Cron triggers ilimitados free

Estimativa real: ~78k DO requests/mês (8% do free). Margem 12x antes de pagar.

## Endpoints

| Rota | Acção |
|---|---|
| `GET /` | Info do serviço |
| `GET /health` | Status do bot (ws_state, session, msg count) |
| `GET /start` | Acorda DO + abre WS (se fechado) |
| `GET /stop` | Fecha WS (debug) |

## Arquitectura

```
Discord Gateway WSS
        ↑
   [BotDO singleton]
   ├─ WebSocket persistente
   ├─ Alarm-based heartbeat
   ├─ Session resume state (storage)
   └─ Forward MESSAGE_CREATE ↓
        ↓
   Supabase discord-inbound
   ├─ Classify intent (Claude Haiku)
   ├─ Pick agent
   └─ Create system.tasks
```

## Fallback

Existe ainda `apps/discord-bot/` (Deno + Fly.io) — código equivalente, arquivado
como plano B caso CF tenha problemas. Não desactivar até CF estar estável 7 dias.
