---
id: ADR-018
title: Integração Hermes Agent (Nous Research) como executivo externo de Mário
date: 2026-05-23
status: Draft (D2 ✅ Confirmado · D4 [PENDING — a descobrir] · D6 [PENDING — Mário valida tabela detalhada] · D3 confirma via Discord Dev Portal)
deciders: [mario-carvalho, aiox-master]
sprint: feat/adr-018-hermes-integration
related: [ADR-010 Command Center, ADR-011 CookAI Catalog, ADR-013 IAM, ADR-014 Billing, ADR-V11-004 CRM, ADR-V11-005 Truth Engine, ADR-017 Squad Sales]
implemented_in: PENDING (após Mário responder 4 decisões)
notion: 34084147-fa60-813d-94fe-d7f72d47d8bd (Visão & Arquitectura — pendente sync)
---

# ADR-018 · Integração Hermes Agent (Nous Research) como executivo externo

## Status

**Draft** · 2026-05-23 · branch `feat/adr-018-hermes-integration` (from `origin/main`).

Aguarda 4 decisões Mário para passar a **Accepted**. Decisões marcadas `[PENDING]` no corpo do documento.

---

## Context

### O problema

Em 2026-05-23, Mário confirmou ter o **Hermes Agent da Nous Research** (`https://hermes-agent.nousresearch.com/`, open-source MIT, v0.14.0) **operacional num servidor pessoal**, ligado ao channel `#hermes` no Discord do server `PropTech`. Screenshot enviada mostra capabilities reais: Command Approval Required UI nativo, tool execution `uv run python` + `uvx --with google-api-python-client`, manipulação Google Calendar (calendário lendario.ai), streaming responses iterativas, memory cross-message.

O Hermes substituiu o papel da Bia ("interface conversacional do Mário com o sistema") mas:
- Vive **FORA** do monorepo `proptech-platform` (self-hosted)
- Não está documentado em CLAUDE.md root
- Não tem ADR formal
- Não tem protocolo definido para invocar recipes/skills do CookAI catalog (ADR-011) que está dentro do monorepo
- Coexiste com agents internos Bia/Mia/orquestrador-condo/financeiro-condo/etc. sem mapping claro de responsabilidades

Sem ADR, o risco é: **duplicação silenciosa** (Hermes faz tarefas que CookAI agents já fazem ou vice-versa), **drift de capabilities** (skills do Hermes não documentadas reaprendidas pelo CookAI), e **opacidade operacional** (Mário sabe que Hermes existe; agentes do monorepo não sabem que Hermes pode invocá-los).

### O catalisador

Decisão Mário 2026-05-23 (sessão `ede1fb47`): *"o hermes da nous também está configurado, por isso substituimos a bia"*. WebFetch confirmou Hermes Agent = produto oficial Nous Research, self-hosted, open-source MIT, com 6+ canais nativos (Discord, Telegram, Slack, WhatsApp, Signal, Email, CLI).

ARCH-002 brownfield Critical (2026-05-23): rename Bia→Mia em curso mas incompleto — `bia-chat` v20 + `mia-chat` v4 coexistem em V1 Edge Functions a queimar tokens duplicados desde >1 semana. Hermes acrescenta camada nova ao puzzle.

### Custos de não decidir

- **Operacional:** Mário usa Hermes ad-hoc mas CookAI agents não sabem que existe → não invocam, não reportam, não aprendem
- **Financeiro:** triple-billing potencial (Hermes + Mia + bia-chat legacy) sem visibilidade unificada de custo
- **Governance:** se Hermes invocar destrutivamente recursos do proptech-platform (DELETE, INSERTs em V2 produção), não há audit trail formal
- **Estratégico:** todo o trabalho de skills/recipes/employees do CookAI (ADR-011) perde valor se Hermes virar "shadow CookAI" não integrado

---

## Decisões

### D1 · Hermes vive externo ao monorepo (CONFIRMADO)

Hermes Agent corre **self-hosted no servidor pessoal de Mário** (não em `apps/` do proptech-platform). Razões:

1. Hermes Agent é projecto da Nous Research — manter como dependência externa permite sync upstream sem fork
2. Self-hosted dá Mário controlo total sobre memory persistente (built-in Hermes feature)
3. Não competir com CookAI — Hermes é **executivo** (orquestra), CookAI agents são **departamentos** (especialistas)

**Não copiar código Hermes para `apps/hermes-*/`.** Manter como cliente externo do API Supabase.

### D2 · Hermes hosted em VPS Ubuntu + Anthropic API direct (CONFIRMADO 2026-05-23)

Mário confirma: Hermes corre **Ubuntu** com **Anthropic API** (cliente paga tokens próprios).

**Recomendação aiox-master:** **Hetzner Cloud CAX11** (€3.79/mês, ARM neoverse, 4 vCPU + 8GB RAM + 40GB SSD + 20TB tráfego, Frankfurt EU) ou **CX22** x86 (€4.51/mês, 2 vCPU + 4GB RAM) se Hermes não correr ARM-native.

**Custos totais estimados Hermes operacional:**

| Componente | Custo/mês | Notas |
|---|---|---|
| VPS Hetzner CAX11 (ARM) | €3.79 | Ubuntu 24.04 LTS, EU Frankfurt, RGPD-compliant |
| Hermes Agent v0.14.0 (MIT open-source) | €0 | install via `hermes setup` |
| Anthropic API (Mário's key) | €5-20 | Uso moderado, dentro do cap mensal €100 (ADR-004) |
| Discord Bot Token | €0 | Free Discord Developer Portal |
| **TOTAL** | **~€10-25/mês** | vs €500-2000/mês de managed agents enterprise |

**Alternativas rejeitadas:**
- DigitalOcean Basic ($6 = €5.50/mês): mais caro para menos recursos
- AWS EC2 t3.small: ~€15/mês + complexidade IAM/VPC
- Oracle Cloud Free Tier (24GB ARM forever): zero SLA, setup complexo — risco solo founder
- Servidor doméstico: depende de uptime ISP residencial + Cloudflare Tunnel — instável

**Impacto da decisão:** EU localization (Frankfurt) para RGPD compliance + latência baixa PT-EU. Firewall config permite outbound Anthropic API + Discord WebSocket + Supabase REST (do hermes-invoke-recipe).

### D3 · Bot Discord do Hermes é separado do `property007` (CONFIRMADO pelo Mário a 2026-05-23 com "Não sei")

Hipótese forte: Hermes Agent v0.14.0 tem integração Discord built-in que **usa Bot Token próprio** (não passa por `apps/discord-bot/` Fly.io que faz routing para CookAI agents). Logo:

- `apps/discord-bot/` (Fly.io) → escuta channels gerais + per-vertical → POST `discord-inbound` EF → routing 7 CookAI agents (bia/orquestrador-condo/financeiro-condo/etc.)
- Bot Hermes (Nous Research stack) → escuta `#hermes` channel → executa nativamente com tools próprias + invoca CookAI quando necessário

Os dois bots coexistem no mesmo server Discord `PropTech` em channels disjuntos.

**Acção:** Mário deve confirmar via Discord Developer Portal quais bots estão no server e respectivos channels.

### D4 · Memory model do Hermes é **[PENDING — Mário decide ou descobre]**

Opções:
- **A**: Built-in (Hermes Agent v0.14.0 tem persistent memory próprio — provável)
- **B**: Letta / MemGPT integration
- **C**: Mem0 managed service
- **D**: Vector store próprio em `pgvector` Supabase
- **E**: Não sabe / a definir

**Posição actual da memória PropTech:**
- `system.tasks` (curto prazo runtime — missions)
- `core.agent_audit_log` (audit — quem fez o quê quando)
- Zero tabelas `*memory*`, `*conversations*`, embeddings em agents
- Conclusão: memory long-term **não está no Supabase** hoje

Se Hermes usar memory **própria** (opção A), o proptech-platform não precisa de schema novo. Se Mário quiser memory **unificada** (Hermes ↔ CookAI agents), criar `dm.agent_memory` com pgvector — mas isto é trabalho separado, fora do scope deste ADR.

### D5 · Hermes invoca CookAI via Supabase API com role scoped (PROPOSTO)

Para Hermes invocar recipes/skills/missions do CookAI sem ter acesso total:

```sql
-- 1. Row em system.api_keys (futuro schema — ADR-018 cria)
INSERT INTO system.api_keys (name, role, description)
VALUES ('hermes_executor', 'hermes', 'Hermes Agent (Nous Research) — invoca recipes CookAI');

-- 2. Permission grants whitelist via iam.permission_grants
INSERT INTO iam.permission_grants (api_key_id, section, action) VALUES
  ('<hermes-key-id>', 'system.recipes', 'execute'),
  ('<hermes-key-id>', 'system.tasks', 'create'),
  ('<hermes-key-id>', 'core.pessoas', 'read'),
  ('<hermes-key-id>', 'core.empresas', 'read'),
  ('<hermes-key-id>', 'core.imoveis', 'read'),
  ('<hermes-key-id>', 'core.condominios', 'read'),
  ('<hermes-key-id>', 'core.activity_unified', 'read'),
  ('<hermes-key-id>', 'system.swarm_discoveries', 'read');

-- 3. Edge Function 'hermes-invoke-recipe' (wrapper REST)
--    POST { recipe_id, payload, idempotency_key }
--    → valida api_key + permission → cria system.tasks → trigger recipe → devolve task_id
--    Hermes faz polling ou subscribe Realtime para resultado
```

**Whitelist de RPCs que Hermes pode invocar (não tabelas directas):**
- `core.get_record_summary(type, id)` — context
- `core.list_records(type, filters)` — search
- `core.search_records(query, types[])` — full-text
- `core.get_activity_timeline(record_type, record_id, limit)` — history
- `core.create_task(type, payload)` — invocar trabalho
- `core.queue_approval(action, payload, reason)` — pedir aprovação Mário (volta via Discord `#hermes`)
- `core.ask_property007_intent(natural_language)` — router NL

### D6 · Tools mapping Hermes vs CookAI agents — **[PENDING — Mário valida tabela detalhada]**

Mário pediu split detalhado tarefa-a-tarefa antes de decidir. Tabela completa:

| # | Tarefa concreta | Hermes (executivo) | CookAI agents (departamentos) | Notas |
|---|---|---|---|---|
| 1 | Mário escreve em Discord `#hermes` "que aconteceu ontem em V2?" | ✅ recebe + responde | ❌ | Hermes consulta `core.activity_unified` via D5 RPC `get_activity_timeline` |
| 2 | Mário pede "gera Word com relatório financeiro V2 mês passado" | ✅ tools próprias (uv+python+docx) | ❌ | Hermes acede `core.cliente_360` via D5 RPC |
| 3 | Lead inbound chega via Meta Lead Ads (webhook) | ❌ não envolvido | ✅ Edge fn `meta-leads-webhook` → recipe `qualify-and-engage` | CookAI auto-trigger |
| 4 | Lead qualificado precisa de outreach personalizado | ❌ não envolvido | ✅ recipe usa squad-sales skills (Neil Rackham, Sandler) | ADR-017 squad-sales |
| 5 | Avisos de mora condóminos V2 sábado 10h | ❌ | ✅ recipe `avisos-mora` cron Sáb 10h (V10 Copilot agent `v2.cobrador`) | Background autopilot |
| 6 | Upload fatura energia V4 (cliente faz no simulador) | ❌ | ✅ Edge fn `v4-energia-ocr-fatura` + agent `v4.energia_agent` | ADR-V4-002 |
| 7 | Mário pede "marca reunião com administrador X amanhã 14h" | ✅ Google Calendar via tools próprias (já demonstrado) | ❌ | Hermes built-in |
| 8 | Mário pede "pesquisa concorrência V4 últimos 7 dias" | ❌ delega | ✅ Truth Engine swarm `system.swarm_discoveries WHERE source ~ 'meta-ads-edp-galp'` | Hermes faz GET via D5 RPC + apresenta |
| 9 | Aprovar mora envio (€500+) | ✅ Discord reaction 👍/👎 dispara webhook | ✅ dashboard `/approvals` UI alternativo | Dois canais válidos |
| 10 | Mário pede "código Python que processa CSV X" | ✅ Hermes corre `uv run python` | ❌ | Hermes tools |
| 11 | Recibo digital V5 (owner→prestador magic link) | ❌ | ✅ Edge fn `gerar-magic-link` + recipe `recibo-digital` | V5 produção, ADR-condo-001 |
| 12 | Bia daily roundup 08:00 (sumário de novidades V5+V2) | ❌ | ✅ Edge fn `daily-roundup` cron + agent Bia/Mia | Cook AI scheduled |
| 13 | Mário escreve "agenda recipe X para correr todas as 2ªs 9h" | ✅ recebe + cria via `system.schedules` insert via API | ❌ | Hermes wrapper de CookAI scheduling |
| 14 | Discovery call B2B preparação (qualify-prospect) | ✅ Hermes invoca skill `sales-qualify-prospect` via D5 | ✅ skill executa (squad-sales) | Hermes orchestrador, squad-sales executa |
| 15 | Erro 500 em prataowners.pt (V2 produção) | ✅ Hermes recebe alerta + RCA inicial | ⚠ ops-builder agent faz RCA draft | Hermes triagem, ops-builder profunda |
| 16 | Cross-sell V2→V4 (condómino V2 com tarifa energia alta) | ❌ | ✅ `growth.cross_sell_rules` cron diário + recipe gera oportunidade | ADR-015 |
| 17 | Mário cria nova vertical V6 Reabilitação (Q1 2027) | ✅ Hermes ajuda spec + research mercado | ✅ vertical-builder agent scaffolda apps/v6-reabilitacao/ | Hermes consultivo, agent técnico |
| 18 | Hermes detecta padrão repetido (5x esta semana) | ✅ propõe nova skill | ✅ Mário promove + skill vira recipe CookAI | D7 padrão 3 |
| 19 | Email outbound transactional (factura, lembrete) | ❌ | ✅ Resend via CookAI recipes (padrão Phase 3 Leads Machine) | Email = CookAI sempre |
| 20 | Audit financeiro mensal de custos AI | ✅ Hermes faz query summary | ✅ dados vêm de `core.api_usage` | Hermes apresenta, dados do CookAI |

**Pattern emergente:**
- **Hermes (~30% das tarefas):** conversação, web research, scheduling NL, doc creation, triagem rápida, aprovações Discord
- **CookAI (~60% das tarefas):** vertical-specific, autopilot scheduled, leads pipeline, cross-sell, integrations
- **Shared (~10%):** approvals (Discord OU dashboard), proposta de skills novas, audit reporting

**Decisão pendente:** Mário valida split global OU pede ajustes em tarefas específicas (responder em texto livre indicando # da tarefa + alteração).

### D7 · 5 padrões agente↔Hermes (CANÓNICO)

Sempre que o Hermes interage com o proptech-platform, segue um destes 5 padrões:

1. **Hermes orquestra → CookAI executa**
   - Hermes recebe pedido Mário em Discord `#hermes`
   - Decide qual recipe CookAI invocar
   - POST `hermes-invoke-recipe` → cria task
   - Polling ou Realtime para resultado
   - Reporta de volta no Discord

2. **CookAI escala → Hermes notifica Mário**
   - CookAI recipe falha ou requer human input
   - INSERT em `system.approvals_queue` com `target_channel='hermes'`
   - Edge Function `hermes-notify` POSTa para webhook Hermes ou Discord directly
   - Mário responde em Discord `#hermes` → Hermes processa decisão → fecha approval

3. **Hermes detecta padrão → propõe nova skill CookAI**
   - Hermes faz mesma tarefa N vezes (memory built-in detecta padrão)
   - Hermes propõe: "Mário, vejo que pediste isto 5x esta semana. Crio skill `<x>` no CookAI?"
   - Mário aprova → Hermes faz POST `system.skills/create` (DRAFT status)
   - Mário promove a `active` no dashboard `/skills`

4. **Hermes faz Truth Engine query → consume swarm_discoveries**
   - Hermes pergunta "que descobertas há sobre EDP esta semana?"
   - GET `system.swarm_discoveries WHERE source ~ 'meta-ads-edp-galp' AND created_at >= now() - 7d`
   - Reporta sumário no Discord

5. **Hermes acede activity_unified para context cross-vertical**
   - Hermes pergunta "o que aconteceu com este condómino nas últimas 24h?"
   - GET `core.get_activity_timeline('pessoa', '<id>', 50)` — UNION 7 sources (ADR-V11-004 D4)
   - Apresenta timeline + sugere acção

### D8 · Bia deprecada (relacionado ARCH-002 brownfield Critical)

Com Hermes a assumir o papel de "interface conversacional Mário ↔ sistema":
- **Bia** (agent dashboard CookAI) → deprecada (ARCH-002 conclui rename)
- **Mia** (sucessora técnica de Bia) → mantém como agent dashboard **especializado em V5 + condomínios** (não tem ambição de cobrir tudo)
- **Hermes** → camada acima, executivo cross-vertical, conversacional, com memory long-term

**Acção:** completar branch `chore/rename-bia-jarvis-mia` + deprecar `bia-chat` v20 + remover views Bia do dashboard (separado deste ADR, mas dependente). Ver brownfield Phase 2A.

---

## Alternativas Consideradas

### A1 · Não integrar Hermes formalmente — manter standalone

Mário continua a usar Hermes ad-hoc. CookAI agents não sabem que existe.

**Rejeitada:** drift de capabilities, duplicação silenciosa, opacidade operacional. Mário acaba a fazer trabalho que CookAI agents já fazem (ou vice-versa).

### A2 · Migrar tudo para Hermes — descartar CookAI

Hermes vira o único sistema de agents. CookAI catalog é abandonado.

**Rejeitada:** CookAI já tem 92 skills + 49 recipes + schedules + triggers + employees em produção. Refactor catastrófico. Perde-se UI dashboard que Mário usa diariamente. Multi-tenant Owners Club (V10) + ADR-V11-004 CRM Attio assumem CookAI como pivot — descartar quebra tudo.

### A3 · Hermes-as-a-CookAI-skill (Hermes vira skill no system.skills)

Em vez de Hermes invocar CookAI, CookAI agents invocariam Hermes via skill `query-hermes`.

**Rejeitada:** inverte hierarquia natural. Mário fala primeiro com Hermes (que é mais conversacional, com memory long-term). CookAI agents executam trabalho especializado. Hermes-as-skill criaria latência (CookAI → Hermes → CookAI loops).

### A4 · Escolhida — Hermes executivo externo + CookAI interno + protocol API

Hermes invoca CookAI via `hermes-invoke-recipe` EF com role scoped. 5 padrões canónicos (D7) definem interacções permitidas. CookAI continua a evoluir independentemente. Hermes ganha sync upstream Nous Research sem fork.

---

## Consequências

### Positivas

- **Camadas claras** — Mário fala com Hermes (conversação + memory long-term); CookAI agents executam vertical-specific
- **Sync upstream** — Hermes Agent v0.14.0 evolui sem fork (Mário corre `hermes update` quando quiser)
- **Memory unificada via API** — Hermes memory built-in + CookAI audit_log + activity_unified = full picture cross-vertical via API
- **Audit trail formal** — toda invocação Hermes→CookAI passa por `hermes-invoke-recipe` que loga em `core.agent_audit_log`
- **5 padrões D7** previnem improvisação — qualquer interacção Hermes↔CookAI tem template
- **Cost discipline** — Hermes tokens (own bill) + CookAI tokens (Anthropic via Supabase Vault) ficam separados, identificáveis

### Negativas

- **Mais uma dependência externa** — Hermes Agent v0.14.0 é open-source mas evolui (breaking changes possíveis)
- **2 bots Discord no mesmo server** — risco de Mário confundir qual responde a quê (mitigação: channels disjuntos)
- **API surface — `hermes-invoke-recipe` Edge Function é endpoint público** com api_key auth (risco se key vazar)
- **Mária bottleneck** — todas as orquestrações passam por Mário a falar no Discord `#hermes`. Hermes ainda não fala sozinho com CookAI sem prompt humano (a confirmar D6)

### Neutras

- Mia continua a existir como agent dashboard especializado V5 — não vira "mini-Hermes"
- ADR-018 não toca em produção V2 (intocável)
- Schema `system.api_keys` precisa de ser criado (não existe ainda — Phase 1 work)

---

## Implementação

### Phase 1 (sprint após Mário responder D2 + D4 + D6 + D8 details)

1. Documentar Hermes em CLAUDE.md root — secção nova "🤖 Hermes — Executivo Externo (Nous Research)"
2. Criar `system.api_keys` table (se não existir) — schema mínimo: id, name, role, description, api_key_hash, created_at, last_used_at, active
3. Migration seed: row para Hermes com `name='hermes_executor'`, role='hermes'
4. Criar `iam.permission_grants` rows para 8+ permissions whitelisted (D5)
5. Criar Edge Function `hermes-invoke-recipe`:
   - Auth: validate api_key header
   - Body: `{ recipe_id | recipe_slug, payload, idempotency_key }`
   - Logic: validate permission → create `system.tasks` → trigger recipe → return task_id + estimated duration
   - Logs: tudo em `core.agent_audit_log` com `agent_id='hermes_executor'`
6. Smoke test E2E: Hermes invoca recipe simples (ex: `bia-daily-roundup`) → recipe executa → result devolvido

### Phase 2 (após Phase 1 estável)

1. Source 8 em `core.activity_unified` materialized view — adicionar UNION com Hermes interactions (via `core.agent_audit_log WHERE agent_id='hermes_executor'`)
2. Edge Function `hermes-notify` — outbound do CookAI para Hermes (D7 pattern 2: CookAI escala → Hermes notifica)
3. Documentar 5 padrões D7 com exemplos concretos em `apps/dashboard/docs/hermes-integration.md`
4. Pattern 3 (Hermes propõe skill) — UI dashboard `/skills` filtro "Proposta por Hermes" + workflow aprovação

### Phase 3 (futuro)

1. Avaliar substituição de bia-chat v20 EF por proxy Hermes (ARCH-002 finalization)
2. Memory unificada (se Mário decidir): tabela `dm.agent_memory` com pgvector + sync bidireccional Hermes↔Supabase
3. Workspace switcher multi-tenant (Gap 5 Leads Machine) deve considerar Hermes per-tenant ou shared

---

## Validation

### Phase 1 acceptance criteria

```sql
-- 1. system.api_keys com row Hermes
SELECT name, role, active FROM system.api_keys WHERE name = 'hermes_executor';
-- Esperado: 1 row, role='hermes', active=true

-- 2. iam.permission_grants whitelist completo
SELECT section, action FROM iam.permission_grants
WHERE api_key_id = (SELECT id FROM system.api_keys WHERE name='hermes_executor');
-- Esperado: 8+ rows

-- 3. Edge Function hermes-invoke-recipe deployed e active
-- Via MCP Supabase: list_edge_functions → procurar 'hermes-invoke-recipe' status='ACTIVE'

-- 4. Smoke test E2E (curl manual ou Hermes real)
-- POST https://hkmvszkpxjbxmnixzqbl.supabase.co/functions/v1/hermes-invoke-recipe
-- Headers: x-api-key: <hermes_api_key>
-- Body: {"recipe_slug": "bia-daily-roundup", "payload": {}, "idempotency_key": "smoke-test-001"}
-- Esperado: 200 OK + {"task_id": "...", "status": "queued"}

-- 5. Audit log capturou
SELECT * FROM core.agent_audit_log
WHERE agent_id = 'hermes_executor' ORDER BY created_at DESC LIMIT 5;
-- Esperado: rows com tool_called='invoke-recipe', sem tool_error
```

---

## References

- Hermes Agent landing: https://hermes-agent.nousresearch.com/ (v0.14.0, MIT)
- Install: `curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash`
- ADR-010 — Command Center Pivot (apps/dashboard agentic infra)
- ADR-011 — CookAI Catalog (system.skills + recipes + integrations + context_docs)
- ADR-013 — Centralizar IAM (iam.permission_grants pattern)
- ADR-V11-004 — CRM Attio Multi-Workspace (core.activity_unified 7 sources)
- ADR-V11-005 — Truth Engine Swarm (system.swarm_discoveries)
- ARCH-002 brownfield Critical — Bia→Mia rename incompleto (relacionado D8)
- [project-hermes-agent-nous memory](file:///C:/Users/mario/.claude/projects/c--Users-mario-dev-proptech-platform/memory/project_hermes_agent_nous.md) — detalhes operacionais Hermes
- [project-ai-first-principle memory](file:///C:/Users/mario/.claude/projects/c--Users-mario-dev-proptech-platform/memory/project_ai_first_principle.md) — princípio fundador agentic AI-first

---

## Follow-ups

- [ ] **Mário responde D2** (onde Hermes hosted) — para documentar na memory
- [ ] **Mário responde D4** (memory model interno) — para evitar duplicação Supabase
- [ ] **Mário responde D6** (tools split Hermes vs CookAI) — para D6 ficar Accepted
- [ ] **Mário confirma D3** (bot Discord separado de property007) — via Discord Developer Portal
- [ ] Phase 1: criar `system.api_keys` + iam.permission_grants + Edge Function `hermes-invoke-recipe`
- [ ] Phase 1: smoke test E2E Hermes → CookAI
- [ ] Phase 2: Source 8 em `core.activity_unified`
- [ ] Phase 3: Bia deprecation (ARCH-002 brownfield)
- [ ] Trigger `notion-librarian` para sync ADR-018 com Notion "Visão & Arquitectura"
