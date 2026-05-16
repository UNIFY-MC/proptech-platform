# Property007 Discord Bot

Listener Gateway WebSocket → reencaminha `MESSAGE_CREATE` para `discord-inbound` edge fn.

## Setup Fly.io (Mário · ~3 min)

1. **Cria conta** em https://fly.io (grátis, pede cartão para anti-abuse mas free tier não cobra)

2. **Instala flyctl** (CLI):
   ```bash
   # Windows PowerShell
   iwr https://fly.io/install.ps1 -useb | iex
   ```

3. **Login + deploy:**
   ```bash
   cd apps/discord-bot
   flyctl auth login          # abre browser
   flyctl launch --no-deploy  # cria app (responde Yes a tudo, NÃO add Postgres)
   ```

4. **Configura secrets:**
   ```bash
   flyctl secrets set \
     DISCORD_BOT_TOKEN="<o token actual da Supabase>" \
     SUPABASE_URL="https://hkmvszkpxjbxmnixzqbl.supabase.co" \
     SUPABASE_ANON_KEY="<anon key Supabase>"
   ```

5. **Deploy:**
   ```bash
   flyctl deploy
   ```

6. **Verifica:**
   ```bash
   flyctl logs           # vê o bot a conectar
   flyctl status         # vê machine running
   curl https://property007-discord-bot.fly.dev/health  # health endpoint
   ```

## Como funciona

- Bot abre WebSocket gateway Discord (sempre-online)
- Ao receber MESSAGE_CREATE em qualquer canal do server `proptech`:
  - Skip se autor for bot (anti-loop)
  - POST para `discord-inbound` edge fn com `{ channel_id, author, content, message_id, mentions }`
  - Edge fn faz classify + routing + chama agent
- Reconnects automáticos com backoff exponencial
- Resume session quando possível (não perde mensagens em micro-disconnects)
- Heartbeat ACK monitoring

## Custos

Fly.io free tier:
- 3x shared-cpu-1x 256MB VMs grátis (usamos 1)
- 160GB bandwidth grátis
- Apenas custa se ultrapassar — não vai

## Debug

```bash
flyctl logs --tail              # logs ao vivo
flyctl ssh console              # shell na VM
flyctl restart                  # restart machine
```
