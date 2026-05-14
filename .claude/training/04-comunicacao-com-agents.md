# 04 — Comunicação com Agents

> 🎯 **Objectivo:** decidir como tu (e clientes) comunicam com os AI employees.
> 📋 **Pré-requisitos:** [03 — Curso Operations 101](03-curso-operations-101.md).

---

## O problema

CookAI tem agents que vivem no Discord + Slack — Serge `[01:25:33]`:
> "Every single day, they will report back at 7am, before I wake up. These agents have access to every single tool that you wouldn't have access to as an employee."

Nós **temos os agents** (16 dept heads) mas falta o **canal de comunicação fluído**:
- Hoje: tu vais a [/chat](http://localhost:5180/chat) e escreves
- Falta: agents postam updates · mentions disparam tasks · mobile WhatsApp acessível em movimento

---

## 5 canais possíveis (matriz de comparação)

| Canal | Tu → agent | Agent → tu | Async | Mobile | Cliente | Setup | Custo |
|---|---|---|---|---|---|---|---|
| **/chat** dashboard | ✅ | ✅ | ❌ | ⚠ | ❌ | ✅ existe | 0€ |
| **Discord** privado | ✅ | ✅ | ✅ | ✅ | ❌ | 2h dev | 0€ |
| **Slack** workspace | ✅ | ✅ | ✅ | ✅ | ⚠ paid | 3h dev | 7€/user/mês |
| **WhatsApp** (Unipile/Evolution) | ✅ | ✅ | ✅ | ✅ | ✅ | 3h dev | 19€/mês ou self-host |
| **Email** (AgentMail) | ⚠ | ✅ | ✅ | ✅ | ✅ | já existe ✅ | 0€ (Resend free tier) |

---

## Recomendação — arquitectura híbrida

```
                    ┌──────────────┐
                    │  Mário (tu)  │
                    └──┬───────────┘
                       │
       ┌───────────────┼────────────────┐
       │               │                │
  ESCRITÓRIO       MOBILIDADE       MOBILIDADE
  /chat dashboard   Discord app    WhatsApp business
       │               │                │
       ▼               ▼                ▼
   agent-chat    Discord webhook  Unipile webhook
   edge fn       edge fn          edge fn
       │               │                │
       └───────────────┼────────────────┘
                       │
                       ▼
               ┌──────────────┐
               │  AI Agents   │
               │ (16 dept hds)│
               └──┬───────────┘
                  │
       ┌──────────┼──────────┐
       │          │          │
  Discord    /tasks       Email reply
  reply post mission       (gmail-send)
  on channel
```

**Princípio**: tu escolhes o canal por **contexto**:
- **Dashboard /chat**: trabalho profundo no escritório
- **Discord**: ver updates de agents enquanto fazes outra coisa
- **WhatsApp**: ditar instruções em movimento ("Bia, lê isto" + áudio)
- **Email**: comunicação formal (cliente → agent)

---

## Implementação por fase

### Fase 1 — já temos (Sprint M ✅)

**[/chat](http://localhost:5180/chat) — Property007 dashboard**:
- Tu escreves "Bia, faz X"
- Edge fn `agent-chat` resolve → agent responde inline
- Sidebar "TASKS · CHATS" lista chats recentes (Sprint P — Active Agents Widget)

**Email** (Sprint M):
- Cliente manda email → classify-intent → draft writer → tu approves → reply
- Detalhe completo em [03 — Curso Operations 101](03-curso-operations-101.md) secção 12:00

---

### Fase 2 — Discord bridge (Sprint Q futuro, 6h dev)

**Setup**:
1. Cria workspace privado `Property007` no Discord (gratuito)
2. Channels:
   - `#bia` · `#diretor-marketing` · `#financeiro-condo` · `#orquestrador` · etc.
   - `#daily-roundup` (Daily Roundup posto pelo bot às 8h)
   - `#approvals` (notificações needs_human)
3. Cria Discord bot via [discord.com/developers](https://discord.com/developers/applications)
4. Adicionar webhook URL ao Property007 secrets

**Edge fn `discord-bridge`**:
- Receive POST do Discord (mensagens em channels)
- Mapeia channel → agent_id
- Cria `task` no agent OU adiciona como `task_comment` se reply numa thread

**Edge fn `discord-post`**:
- Bot posta updates: daily roundup, task completed, mission needs review
- Mentions `@Property007` → cria task

**Resultado**:
- Manhã: abres Discord no telemóvel → vês resumo `#daily-roundup`
- Mensagens em qualquer canal → automaticamente registadas como tasks/comments
- Approve via Discord reaction (👍 emoji = approve, 👎 = request revision)

---

### Fase 3 — WhatsApp via Unipile (Sprint R futuro, 3h dev)

> **Unipile escolhido sobre Evolution API** por: unified API (WhatsApp + LinkedIn + IG + Email num só), SaaS managed (zero VPS).

**Setup**:
1. Conta unipile.com → 19€/mês plan starter
2. Liga 1 número WhatsApp business via QR scan
3. Configura webhook → Property007 edge fn `unipile-inbox`
4. Mapeia messages por sender:
   - `+351 91X XXX XXX` (Mário) → criar task assigned to dept apropriado via classify
   - `+351 21X XXX XXX` (condóminos Prata Owners) → routing para `atendimento-condo`

**Casos de uso**:
- **Tu**: gravas áudio no telemóvel "Bia, prepara plano mora Prata Owners" → Whisper transcreve → agent recebe + executa
- **Cliente**: condómino manda WhatsApp "Tubo rebentou Apt 4D" → Bia triage → cria OT prestador → cliente recebe confirmação no mesmo WhatsApp

**Vantagem Unipile vs Evolution API**:
- Self-hosted Evolution: 4€/mês VPS + 2h setup + gestão tokens
- Unipile: 19€/mês mas inclui LinkedIn + IG + Email num só endpoint · zero ops

---

### Fase 4 — Email (já temos Sprint M, refinement futuro)

[/clients/email](http://localhost:5180/clients/email) AgentMail config:
- Domain por cliente (`mail.prataowners.pt`)
- DNS records SPF/DKIM/DMARC
- Mailboxes (`condominio@mail.prataowners.pt`)

**Cliente manda email** → `gmail-inbound` edge fn → draft → tu approves → `gmail-send` via Resend.

**Setup Resend** (5 min):
1. resend.com → cria conta · adiciona domain `property007.pt`
2. Adiciona 3 DNS records (SPF/DKIM/DMARC)
3. Cria API key
4. Em Supabase project secrets: `RESEND_API_KEY=re_xxx` + `[email protected]`
5. `gmail-send` automatic switches "draft" → "live" mode

---

## Discord vs Slack — qual escolher

| Critério | Discord | Slack |
|---|---|---|
| Custo | gratuito | 7€/user/mês |
| Search histórico | ilimitado | 90 dias free, ilimitado paid |
| Threads | ✅ | ✅ |
| Webhooks / Bots | ✅ | ✅ |
| Voice channels (call agents) | ✅ | ❌ paid only |
| Image/file sharing | 8MB free / 50MB nitro | 1GB free |
| Mobile app quality | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Empresarial perception | médio | alto |
| Personalização canais | alto | médio |

**Recomendação**: **Discord** para Property007 internal (tu + agents). Slack se algum dia tiver clientes B2B grandes.

---

## Skill `unipile-messaging` proposta

Para uso em recipes que precisam enviar WhatsApp / LinkedIn / IG message:

```sql
INSERT INTO system.skills (tag, name, description, category, status, connectors, fallback_agent, receipt_md, prompt_template)
VALUES ('unipile-messaging', 'Unipile Messaging',
  'Envia mensagem em WhatsApp/LinkedIn/Instagram/Facebook via Unipile unified API',
  'communication', 'active',
  ARRAY['unipile'], 'comunicacao-condo',
  E'1. Identifica platform (whatsapp/linkedin/instagram/facebook)\n2. Confirma sender autorizado e recipient válido\n3. Chama Unipile API POST /messages com body + attachments\n4. Regista message_id em payload.unipile.message_id\n5. Marca step done com link ao reply futuro',
  'Envia {{platform}} para {{recipient}} com mensagem {{body}}.'
);
```

Recipes podem usar:
- `daily-maintenance-triage` step 5: substituir `compose-pedido-msg` por `unipile-messaging` quando prestador prefere WhatsApp vs email

---

## Tabela final de decisão — Mário's setup recomendado

| O que | Onde | Quando |
|---|---|---|
| **Trabalho profundo / configuração** | dashboard /chat + /tasks | Manhã + tarde |
| **Updates passivos** | Discord #daily-roundup mobile | Pausa café · viagem |
| **Instrução improvisada** | WhatsApp ditar áudio | Mobilidade |
| **Comunicação formal cliente** | Email Property007 (AgentMail) | 24/7 automated |
| **Voz directa cliente** | Vapi (Sprint futuro) | Atendimento incoming |

---

**Próximo**: [05 — Integrações Prioritárias](05-integracoes-prioritarias.md)
