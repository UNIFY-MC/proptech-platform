# V5 Manutenção — Roadmap pós-3.5

> **Status actual (28 Abr 2026, manhã):** Sprint 1B.1.1 + 1B.1.2 + 1B.2.1 + 1B.2.2 fechadas (commits `5a41135`, `53683aa`, `5aca88d`, `09e95ca` em branch `feat/v5-3.5-polish`).
>
> **Marco atingido:** Agente Vision em produção. Smoke test E2E real passou — Bosch SMV41D10EU/56 (máquina lavar loiça encastrável de 26 anos) identificada via OCR de número de série e código FD, em 4 iterations a €0.0864.
>
> **Próximo:** decidir 1B.2.5 (bug fixes interlúdio) ou 1B.2.3 (UI AdicionarCamaraScreen). Em paralelo: arrancar V2 scaffold + extrair `packages/db` + `packages/auth`.
>
> **Decisão estratégica (28 Abr):** V2 e V5 evoluem em paralelo (não sequencial). Mediação seguros + parcerias energia confirmadas como vector de upsell V5. Tese financeira validada — V2 sustenta operação enquanto V5 escala.

---

## Sumário executivo

App cliente está em ~80% das funcionalidades core. **Onda 1B em curso** com 4 sprints fechadas e agente Vision em produção. Falta UI cliente para "fechar o ciclo" (ler equipamentos criados pelo agente).

1. **Onda 1B** — Câmara IA real (✅ infraestrutura) + UI câmara + AI Expert com tool use + IPMA — **EM CURSO**
2. **Onda 2** — Scout proactivo + RAG documentos + comparação tarifários energia + Stripe
3. **Onda 3** — Prestador V5 completo + agents prestador + features unique (QR code, antes/depois, magic link WhatsApp)
4. **Onda 4** — Admin mínimo + agents admin + Capacitor + TestFlight público

**Duração total revista:** 10-13 semanas (acima da estimativa original de 8-11) — incluindo Sprint 1B.5 dedicada a fundações (`packages/*` + V2 scaffold paralelo).

**Princípio:** sempre algo testável a cada 1.5-2 semanas. Sem big-bang.

---

## Princípios arquitecturais

### Identidade interna vs pública

| Interna (não rebrand) | Pública (rebrand livre) |
|---|---|
| Schema `v5_manutencao` | Nome app: "V5 Manutenção" → futuro "Zelo" |
| Path `apps/v5-manutencao/` | Logo / favicon |
| Test users `+v5*` | Domínio público |
| Commits `feat(v5-...)` | Email sender display name |
| Documentação interna | Bundle ID iOS/Android |

Centralizado em `src/config/branding.js` (já feito Sprint 3.5).

### Ecossistema de agentes coordenados (Onda 2 — decisão 28 Abr 16:00)

A plataforma Onda 2 é um ecossistema de agentes, não um conjunto de scrapers hardcoded:

```
image_inspector  →  identifica equipamento via foto
       ↓
equipamento_enricher  →  busca specs/manual/foto oficial na web e propõe
       ↓
docs_curator  →  indexa manual em pgvector (chunks semânticos)
       ↓
casa_advisor  →  responde com base em manuais oficiais + specs reais
```

**Princípio unificador:** cada agente tem system prompt próprio + tools próprias + audit log.
Nenhum scraper hardcoded. Tudo observável, debuggable, resiliente a mudanças de site.
Esta é a defensibilidade a longo prazo da plataforma.

**Razão de usar agentes em vez de scrapers:**
- Robusto a mudanças de site (não quebra quando bosch.pt reorganiza HTML)
- Auditável via `agent_audit_log` (Regra AA)
- User confirma findings antes de guardar (HITL para dados sensíveis)
- Funciona para fabricantes não previstos (não há lista hardcoded)
- Falhas são input para refinamento de prompt — aprende com uso

### Vision call vs Agent (importante)

```
Modo "Vision call" (1 chamada API):
  user input → API → response

Modo "Agent" (loop com tool use):
  user input → agent decide tools necessárias → 
  chama BD/IPMA/catálogo/agenda → 
  orquestra resposta com contexto real → 
  human-in-loop em decisões críticas → 
  audit log
```

Toda IA daqui em diante é modo **Agent**. Já não há "chamadas Claude isoladas".

✅ **Validado em 1B.2.2:** image_inspector usa 4 tools (lookup → create → catálogo search → final), 4 iterations típicas, custo real €0.08/análise.

### Schema agents

✅ **Implementado em 1B.1.1:**
- `core.agent_audit_log` — todas chamadas agents (audit per iteration + per tool execution)
- `core.agent_policies` — policies por org per agent
- `core.api_usage` — rate limiting per user (auto-cleanup 30 dias)
- `core.fn_can_use_api(endpoint, limit, window_hours)` SECURITY DEFINER

### Anti-padrões PROIBIDOS (CLAUDE.md, reforçar)

Regras vivas descobertas em produção, não teóricas:

- **W** — RLS sem GRANT (403 silencioso)
- **X** — SECURITY DEFINER sem GRANT EXECUTE (42501 silencioso)
- **Y** — PostgREST embeds copy-paste entre schemas (categoria_id vs categoria)
- **Z** — Audit RLS checklist sistemático
- **AA** — Edge Functions: nunca redeploy sem ler `tool_error` real (Regra crítica — pagou-se em 1B.2.2)
- **BB** — Validação categórica em executor de agentes (não em BD)
- **CC** — Helpers DEV `window.__test*` tolerantes a string|object (lição 1B.2.2 deploy v3)

Adicionalmente:
- DEMO_*/MOCK_*/FAKE_*/HARDCODED_* fora de testes
- Empty states alarmistas ("Casa em Risco" para score=null)
- `.single()` sem garantia ≥1 row

---

## Roadmap das 4 ondas

```
Onda 1B → 1B.5 → Onda 2 → Onda 3 → Onda 4
   ↓        ↓       ↓        ↓        ↓
 cliente fundações proactivo prestador admin
   IA    + V2     + €€€    + V5      + erp
2 sem   1 sem    3 sem     3-4 sem  1-2 sem
```

Total: 10-13 semanas.

Beta testing entre cada onda (3-10 pessoas próximas). Decisão go/no-go.

---

## ONDA 1B — Cliente IA core

**Duração:** 2-2.5 semanas (revista de 1.5-2)
**Objectivo:** entregar wow factor IA que diferencia V5 de competidores
**Beta testers necessários:** 3-5 pessoas

### Sprint 1B.1 — Setup infraestrutura agents ✅ COMPLETED (28 Abr)

#### ✅ Tarefa 1B.1.1 — Schema agents (commit `5a41135`)
- [x] Criar `core.agent_audit_log` (audit per iteration + per tool execution)
- [x] Criar `core.agent_policies`
- [x] Criar `core.api_usage` (rate limit 30-dias auto-cleanup)
- [x] Helper `core.fn_can_use_api(endpoint, limit, window_hours)` SECURITY DEFINER
- [x] GRANTs apropriados (regra W)
- [x] Seeds: v5.image_inspector + v5.casa_advisor
- [x] SQL: `sql/26_v5_1b_1_1_agents_schema.sql`
- [x] Smoke test passou via browser console com `.schema('core')`

#### ✅ Tarefa 1B.1.2 — Cliente Anthropic SDK (commit `53683aa`)
- [x] Anthropic Workspace dedicada V5 (Workspace ID em secret `ANTHROPIC_API_KEY`)
- [x] Budget alert €30/mês inicial (vai precisar revisão — ver custos reais abaixo)
- [x] Modelo: **Sonnet 4.6** confirmado (não Opus 4.7 inicial — Sonnet suficiente para Vision)
- [x] `_shared/agents/types.ts` — interfaces partilhadas
- [x] `_shared/agents/anthropic.ts` — client + cost calc (PRICING map: Sonnet 4.6 $3/$15 MTok, USD_TO_EUR=0.92)
- [x] `_shared/agents/runAgent.ts` — tool use loop max_iterations=20, audit duplo
- [x] `supabase/functions/agent-test/index.ts` — Edge Function template E2E
- [x] `sql/27_v5_1b_1_2_seed_test_echo.sql` — seed `v5.test_echo`

**Lições críticas anotadas em CLAUDE.md:**
- API keys via PowerShell `Read-Host` introduzem newline invisível (header parse error). Usar copy-paste directo
- `npm:@anthropic-ai/sdk@0.30.0` exacto sem semver no Deno
- `new Anthropic({apiKey, fetch: globalThis.fetch})` obrigatório
- `src/supa.js` expõe `window.supabase`, `window.supaCore`, `window.supaPublic` em DEV permanente

### Sprint 1B.2 — Agent `v5.image_inspector` ✅ COMPLETED (28 Abr)

**System prompt:** Inspector da Casa. Recebe fotos, identifica equipamento + problemas + health score. pt-PT, conciso.

#### ✅ Sub-sprint 1B.2.1 — Infraestrutura image_inspector (commit `5aca88d`)
- [x] Bucket Supabase Storage `equipamentos-fotos` (privado, 10MB max, jpeg/png/webp/heic, RLS por foldername=pessoa_id)
- [x] Path convention: `{pessoa_id}/inspecoes/{session_id}/{seq}_{ts}.jpg`
- [x] pg_trgm extension + `v5_manutencao.fn_match_existing_equipamento` (fuzzy match score 0.0-1.0)
- [x] 4 tools em `_shared/agents/tools/equipamento.ts`:
  - `equipamento.lookup`
  - `equipamento.create`
  - `equipamento.update`
  - `catalogo.search_servico_relevante`
- [x] System prompt v5.image_inspector pt-PT (74 linhas) — fluxo obrigatório, regras data_instalacao_precisao (exact/year_only/estimated), 14 categorias whitelist, 8 issues controlados
- [x] Validação categórica em executor (Regra BB) — não BD
- [x] `sql/28_v5_1b_2_1_bucket_and_helper.sql` + `sql/29_v5_1b_2_1_update_policies.sql`

#### ✅ Sub-sprint 1B.2.2 — Edge Function Vision E2E (commit `09e95ca`)
- [x] `supabase/functions/agent-image-inspector/index.ts` — pipeline completo (auth → rate limit duplo 3/dia + 10/mês via SELECT count → upload bucket → signed URL 5min → runAgent com objective array Vision content blocks)
- [x] `src/lib/imageCompression.js` — OffscreenCanvas, max 1568px, JPEG q85
- [x] `window.__testImageInspector(file, opts)` — helper DEV tolerante a string|object (Regra CC)
- [x] `runAgent.ts` actualizado: `objective: string|unknown[]`, `sessionId` injection
- [x] **4 deploys evolutivos durante sprint** (3 fixes diagnosticados via Regra AA, não especulativos):
  1. `orgIds[0]` → `orgIds.includes(loc.organization_id)` (user com múltiplas orgs)
  2. `organizationId = loc.organization_id` (org da localização, não da pessoa)
  3. Helper opts: `typeof opts === 'string' ? {localizacao_id: opts} : opts` (bug 22P02 invalid uuid)
  4. Debug logs `[debug-403]` adicionados+removidos pre-commit

**🎯 Smoke test E2E com foto real:**
- Foto: `IMG_8915.JPG` 1.53MB → comprimida 1176x1568 232KB
- Localização teste: Negrelho `824cc90a-aa4e-4f2d-8d77-86332fdcd205` (Caldas da Rainha)
- Resultado: success=true, iterations=4, sessionId=`357e4a1e-b1db-47e3-82aa-254758c9aa20`
- Equipamento criado: `a42393da-0c28-48cd-86de-5e0ec8d0db25` (Bosch SMV41D10EU/56, máquina lavar loiça encastrável, fabricada Janeiro 1999, ~26 anos, OCR leu serial 269010281057004045 e código FD 9901)
- **Custo real: €0.0864** (24.219 input tokens + 1.413 output)

**Notas custo (importante para budget):**
- Custo médio por análise (4 iterations típicas): **€0.08-0.10**
- Free tier 3/dia + 10/mês = max ~€1/user/mês
- Cada iteration carrega foto + system prompt + histórico → input cresce a cada iteration
- **Estimativa original era irrealista (€0.005)** — assumia 1 call sem contexto. Tool use loop com 4 iterations é o caso real
- **prompt_cache adiado para Onda 2** (poupança esperada 60-70%, €0.025-0.035/análise)

### Sprint 1B.2.3 — UI AdicionarCamaraScreen (PRÓXIMO — 3-4 dias)

**Objectivo:** UI cliente para tirar foto e invocar `agent-image-inspector`. Hoje só funciona via console DEV.

#### Componentes
- [ ] `AdicionarCamaraScreen.jsx` em `src/screens/` (NOVO ficheiro — não meter em App.jsx, recomendação Sprint 1B.5)
- [ ] Tirar foto (mobile getUserMedia + fallback file input)
- [ ] Selector localização (caso user tenha múltiplas)
- [ ] Botão "Analisar com IA" → invoca `agent-image-inspector` (já feito em 1B.2.2)
- [ ] Loading state com mensagem progressiva
- [ ] Após sucesso → redirect para `EquipamentoFichaScreen.jsx` (NOVO)
- [ ] Toast graceful em caso de falha (free tier excedido → upsell Home+)

#### `EquipamentoFichaScreen.jsx` (NOVO)
- [ ] Mostrar foto principal do equipamento
- [ ] Dados extraídos pelo agente (marca, modelo, idade, serial)
- [ ] `dados_ia.confianca_identificacao` visível
- [ ] `dados_ia.issues_detectados` como cards
- [ ] CTA: "Pedir manutenção" → ServicosListaScreen filtrado

#### Refresh CasaScreen
- [ ] Listagem equipamentos da localização activa
- [ ] Aparecer equipamento criado pelo agente
- [ ] Long-press → ficha completa

#### Smoke test 1B.2.3
- [ ] Mario tira foto via app web (localhost:5175) — fluxo completo
- [ ] Mario tira foto via mobile real (Capacitor preview no iPhone)
- [ ] 3 equipamentos diferentes testados (caldeira/AC/electrodoméstico)

### Sprint 1B.2.5 — Bug fixes interlúdio (NOVO — 1-2h)

**Razão:** bugs descobertos durante 1B.2.x bloqueiam testes reais.

#### Bugs prioritários
- [ ] **#1 (alta):** `ImovelWizard.jsx` linha 152 — "Erro ao guardar". Root cause: payload sem `organization_id`, RLS `localizacoes_org` rejeita 42501. Fix: pegar `organization_id` do `ImovelAtivoContext` e meter no payload. (~30 min)
- [ ] **#2:** `App.jsx` query a `v5_manutencao.ordens` mas tabela é `ordens_trabalho` → 404. (~10 min)
- [ ] **#3:** Modal/drawer fecha em copy-paste no chat. `onClickOutside` mal configurado. (~20 min)
- [ ] **#4:** Distrito como dropdown PT (18 distritos + ilhas) + autopreencher CP via API CTT. (~45 min)
- [ ] **#5:** Sistemas "comuns" (CCTV, Elevador, Limpeza partes comuns) só visíveis para `categoria='condominio'`. (~20 min)

**Decisão de execução:** fix do #1 antes de 1B.2.3 (bloqueante para criar localizações de teste). Restantes podem entrar em 1B.5 ou backlog.

### Sprint 1B.3 — Agent `v5.casa_advisor` (4-5 dias)

**System prompt:** Conselheiro da Casa. Conhece tudo (equipamentos + alertas + score + agenda + ordens). Recomenda com base em dados reais. Sugere ordens concretas com preços.

#### Tools
- [ ] `casa.get_full_context` → snapshot completo
- [ ] `weather.next_7_days` → IPMA cache 12h
- [ ] `equipamento.due_for_service` → idade vs período legal
- [ ] `catalogo.search_services` → procurar serviços relevantes
- [ ] `catalogo.estimate_price` → estimativa para o caso
- [ ] `agenda.find_slots` → próximos 7-14 dias
- [ ] `pedidos.create_rfq_draft` → rascunho RFQ (requires confirm)
- [ ] `notifications.set_followup` → criar lembrete

#### UI
- [ ] AI Expert chat reescrito (era stub) — em ficheiro separado `AIExpertScreen.jsx`
- [ ] Chips sugestão dinâmicas (não hardcoded) baseados em alertas + última conversa
- [ ] Streaming responses (UX melhor)
- [ ] Histórico conversas em `core.agent_conversations` (criar tabela)

#### Rate limit
- [ ] Free: 3 turns/dia · 1ª conversa/mês +20pts
- [ ] Home+: ilimitado · agendar via chat +75pts

### Sprint 1B.4 — IPMA + Score evolução (1-2 dias)

#### IPMA
- [ ] `src/lib/ipma.js` — wrapper api.ipma.pt
- [ ] Cache 12h em `localStorage` (request reduz custo)
- [ ] Helper `getMeteoLocation(lat, lon, days=7)`
- [ ] Usado por `casa_advisor` (tool) + UI alerta meteo
- [ ] Fallback se API down: dados do dia anterior em cache

#### Score evolução
- [ ] Tabela `casa.score_history` (snapshot mensal)
- [ ] Cron mensal calcula snapshot
- [ ] UI gráfico Recharts (12 meses passado + 3 projecção)
- [ ] Card em `CasaScreen.jsx`

### ⭐ Sprint 1B.5 — Fundações + V2 scaffold paralelo (NOVO — 5-7 dias)

**Razão:** decisão estratégica 28 Abr. Necessário antes do V2 arrancar a sério para evitar duplicação V5↔V2.

**Princípio:** fundações **mínimas suficientes** para V2 nascer limpo. Não fazer `packages/ui-*` ou `agent-runtime` ainda — adiar para quando 3+ apps existirem.

#### Parte A — Fundações mínimas (2-3 dias)
- [ ] Extrair `packages/db/` — cliente Supabase + tipos auto-gerados via `supabase gen types`
- [ ] Extrair `packages/auth/` — AuthContext + useOrganization() + login/recover
- [ ] V5 migra para consumir os packages (não duplica código)
- [ ] Migrations com timestamp `YYYYMMDDHHMM_descricao.sql` adoptadas a partir do próximo SQL
- [ ] Decompor `App.jsx` (10523 linhas) — incremental: cada novo screen vai para `src/screens/<Name>.jsx`

#### Parte B — V2 scaffold (3-4 dias)
- [ ] `apps/v2-condominios/` (React+Vite+JS, mesmo stack que V5)
- [ ] Login + Home vazia a correr em `localhost:5174`
- [ ] Lê de `packages/auth` + `packages/db`
- [ ] Importar v63 prataowners read-only (queries de listagem)
- [ ] Schema V2: `v2_condominios.*` aplicado em separado
- [ ] 1 vista funcional: extracto bancário read-only

#### Critério de fecho 1B.5
- [ ] V5 ainda funciona (regression-free) consumindo packages/db + packages/auth
- [ ] V2 corre em localhost:5174 com login a funcionar
- [ ] 2-3 síndicos podem consultar dados v63 no V2 (read-only)
- [ ] Migrations timestamp aplicadas a partir do próximo SQL
- [ ] Pelo menos 1 screen do V5 movido de App.jsx para ficheiro próprio (`AdicionarCamaraScreen.jsx`)
- [ ] CLAUDE.md actualizado com regras descobertas

### Sprint 1B.6 — Smoke test Onda 1B (1-2 dias)

- [ ] Recrutar 3-5 amigos próximos
- [ ] Cada um: signup, foto de 1 equipamento real, 3 perguntas ao AI Expert
- [ ] Feedback via WhatsApp
- [ ] Decisão go/no-go Onda 2

### Custos REAIS Onda 1B (revistos com base em medição real 28 Abr)

| Item | €/user/mês (realista) | 100 users beta |
|---|---|---|
| image_inspector (10 análises/mês free) | **€0.80-1.00** | €80-100 |
| casa_advisor (5 turns/mês × ~€0.10/turn) | €0.50 | €50 |
| **Total Onda 1B** | **€1.30-1.50** | **€130-150** |

**⚠️ Discrepância vs estimativa original (€27/mês):** custo real ~5× mais alto. Razões:
- Vision com tool use loop carrega foto + contexto a cada iteration
- 4 iterations típicas (inspecionar → criar → procurar serviço → resumir)
- System prompt + tools schema = ~3.500 tokens fixos por iteration

**Mitigações já planeadas:**
- Onda 2: prompt_cache → 60-70% redução (€0.025-0.035/análise)
- Free tier estreito: 3/dia + 10/mês limita exposição
- Home+ €6.90/mês: cobre custo real com margem

### Critério de fecho Onda 1B (revisto)
- [x] Câmara IA funcional ponta-a-ponta (✅ via console DEV)
- [ ] Câmara IA acessível via UI (1B.2.3)
- [ ] AI Expert responde com contexto real da casa (1B.3)
- [ ] IPMA cache funcional (1B.4)
- [ ] Fundações `packages/db` + `packages/auth` extraídas (1B.5)
- [ ] V2 scaffold a correr em paralelo (1B.5)
- [ ] 3-5 beta testers validaram positivamente (1B.6)
- [ ] Custo API <€150/mês para 100 users
- [x] CLAUDE.md actualizado com notas Onda 1B (em curso, vivo)
- [x] Audit RLS + GRANTs limpo (validado 1B.2.x)

---

## ONDA 2 — Tchanã proactivo + monetização

**Duração:** 2.5-3 semanas
**Objectivo:** automação que trabalha pelo user + começar a cobrar
**Beta testers:** mesmos 3-5 (avaliar retenção)

### Sprint 2.1 — Agent `v5.scout` (3-4 dias)

**System prompt:** Corres todas as noites 03h. Olhas casa de cada user activo. Crias 0-3 alertas concretos no feed para ele descobrir de manhã. NUNCA crias ordens — só alertas.

#### Tools (sem human-in-loop, só lê + cria alertas)
- [ ] `users.list_active` → utilizadores activos últimos 30 dias
- [ ] `casa.get_snapshot` → estado casa
- [ ] `weather.next_72h` → IPMA
- [ ] `equipamento.legal_due_dates` → caldeiras anual, AC bi-anual
- [ ] `seasonality.month_relevance` → pinturas primavera, AC pre-verão
- [ ] `alertas.create` → injectar no feed AlertActions

#### Cron
- [ ] Edge Function `scout-nightly` agendada via Supabase cron
- [ ] 03:00 GMT (mais barato API)
- [ ] Batches 50 users · paralelizado
- [ ] Skip users sem actividade últimos 60 dias (custo)

#### Rate limit
- [ ] Free: OFF (apenas Home+)
- [ ] Home+: 1 run/noite/casa

### Sprint 2.1b — Agente `v5.equipamento_enricher` (NOVO — decisão arquitectural 28 Abr 16:00)

> **Numeração provisória** — sprint numbers Onda 2 a rever quando planning for feito.
> Dependências: Sprint 1B.5 (fundações) + schema catálogo (Onda 2.X).

**Conceito:** dado um equipamento identificado pelo image_inspector, este agente busca na web specs completas, fotos oficiais, manual, preço médio, rating — e propõe ao user antes de guardar.

**Custo estimado:**
- web_search: ~€0.01-0.02
- web_fetch: ~€0.005 por página
- Extracção Sonnet 4.6 (HTML grande): ~€0.10-0.15
- PDF download: bandwidth + Storage
- **Total 1ª vez: €0.15-0.30/equipamento**
- Match subsequente (catálogo já existente): €0.005 (lookup)

**Rate limit:** free 1/dia (auto-suficiente) · Home+ 10/mês · Equipa Pro 100/mês

#### Schema core.agent_policies
```sql
INSERT INTO core.agent_policies (
  agent_key, model, max_iterations, max_tokens,
  rate_limit_daily, rate_limit_monthly, enabled
) VALUES (
  'v5.equipamento_enricher',
  'claude-sonnet-4-6',
  15,        -- exploração + extracção são longas
  16000,     -- páginas web são grandes
  3,
  30,
  true
);
```

#### Tools necessárias (a criar)
- `equipamento.match_catalogo(marca, modelo, threshold)` — lookup antes de criar
- `equipamento.save_to_catalogo(payload)` — guarda no catálogo partilhado
- `equipamento.update_with_modelo_catalogo(equip_id, modelo_id)` — liga equipamento ao catálogo
- `web.search(query)` — Anthropic tool (já existe no SDK)
- `web.fetch(url)` — Anthropic tool (já existe no SDK)
- `pdf.download_to_storage(url, path)` — descarrega manual para Storage
- `present_to_user(preview_payload)` — **HITL**: mostra preview ao user e bloqueia para aprovação
- `agent.report_findings(found, missing, confidence)` — relatório final

#### Workflow ideal
```
1. Lookup catálogo — talvez já existe (skip se match > 0.8)
2. web_search: "<marca> <modelo> manual oficial"
3. web_fetch site oficial fabricante — extracção specs
4. Extrair: fotos, manual PDF, specs técnicas, preço médio, rating
5. Validação: specs batem com categoria esperada?
6. present_to_user: "Encontrei isto. Confirmas?" — HITL obrigatório
7. User aprova → save_to_catalogo + UPDATE equipamento com modelo_id
8. Trigger docs_curator (Sprint 2.2) para indexar manual
```

#### Riscos
- **Direitos imagem:** disclaimer automático + takedown rápido (never hotlink, sempre Storage)
- **Match ambíguo:** SMV41D10EU vs SMV41D10EU/56 — agente reporta percentagem + user confirma se < 80%
- **Cold start:** primeiros 100 users sem catálogo → custo 1ª vez maior, decresce com uso
- **Confiança match:** agente inclui `confidence` numérico na resposta antes de guardar

#### Schema catálogo (a criar em Onda 2.X)
```sql
CREATE TABLE v5_manutencao.equipamento_modelos_catalogo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca text NOT NULL,
  modelo text NOT NULL,
  nome_display text,
  categoria text NOT NULL,
  subcategoria text,
  specs jsonb,                    -- consumo, dimensoes, potencia, etc.
  foto_url text,                  -- Storage bucket (não hotlink externo)
  manual_url text,                -- caminho no bucket
  preco_medio_eur numeric,
  rating_medio numeric,
  ano_lancamento integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  fonte_url text,
  confianca_dados text CHECK (confianca_dados IN ('alta','media','baixa'))
);
```

---

### Sprint 2.2 — Agent `v5.docs_curator` (RAG) (5-7 dias)

**Conceito:** OCR de qualquer documento + indexação vetorial para agents fazerem perguntas sobre eles.

#### Schema
- [ ] `documentos.conteudo_extraido` (text) — texto raw OCR
- [ ] `documentos.metadata_extraida` (jsonb) — estruturado por tipo
- [ ] Habilitar `pgvector` extension no Supabase
- [ ] `documentos.embedding` vector(1536)
- [ ] Index vetorial (`ivfflat` ou `hnsw`)

#### Edge Function `vision-ocr-doc`
- [ ] Recebe PDF/imagem + tipo doc
- [ ] Claude Vision OCR
- [ ] Prompts específicos por tipo:
  - **Manual equipamento** → marca, modelo, periodicidade serviço, código erro
  - **Garantia** → data fim, condições, marca/modelo, valor
  - **Contrato manutenção** → periodicidade, próxima visita, valor
  - **Relatório técnico** (inspecção) → data próxima, observações
  - **Planta casa** (PDF arquitecto) → áreas por divisão, m², tipologia
  - **Fatura energia** → consumo mensal, comercializador, plano (vai para Sprint 2.3)
  - **Apólice seguro** → cobertura, franquia, fim renovação
- [ ] Embeddings via Voyage AI ou OpenAI text-embedding-3-small
- [ ] INSERT em `documentos.conteudo_extraido` + `embedding`

#### Schema chunks (decisão 28 Abr 16:00 — detalhado)
```sql
CREATE TABLE v5_manutencao.equipamento_modelo_doc_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id uuid REFERENCES v5_manutencao.equipamento_modelos_catalogo(id),
  doc_tipo text CHECK (doc_tipo IN ('manual', 'guia_rapido', 'dicas_resolucao', 'especificacoes')),
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(1536),         -- OpenAI text-embedding-3-small
  metadata jsonb,                 -- { section, page, source_url }
  created_at timestamptz DEFAULT now()
);

CREATE INDEX ix_doc_chunks_embedding
  ON v5_manutencao.equipamento_modelo_doc_chunks
  USING hnsw (embedding vector_cosine_ops);
```

#### Tool agents
- [ ] `docs.search_dicas_resolucao(equipamento_id, query)` — embedding query → vector search top 5 → chunks com source citation
- [ ] `docs.search_relevante(query, pessoa_id, top_k=3)` → vector search genérico
- [ ] Disponível para `casa_advisor`, `image_inspector`, `scout`, `energy_analyst`

#### UI
- [ ] `DocsScreen.jsx` ganha upload (já existe stub)
- [ ] Após upload: indica "OCR em curso" → mostra metadata extraída
- [ ] User pode editar metadata se OCR errou

#### Rate limit
- [ ] Free: 5 OCR/mês
- [ ] Home+: ilimitado

### Sprint 2.2b — `v5.casa_advisor` + docs (integração) (NOVO — decisão 28 Abr 16:00)

> **Dependência:** Sprint 2.2 (docs_curator indexado) deve estar completo.

**Conceito:** casa_advisor já existente (Sprint 1B.3) ganha acesso ao RAG de manuais. Custo incremental: ~€0.03/conversa (vector search barato). Valor enorme: responde com base em manuais reais do equipamento do user.

#### Expansão do system prompt casa_advisor
```
Tool: docs.search_dicas_resolucao
  → Quando user menciona problema com equipamento específico:
    1. Identifica equipamento (contexto user ou pergunta)
    2. docs.search_dicas_resolucao(equipamento_id, query)
    3. Cita manual: "Segundo o manual Bosch SMV41D10EU, pág. 12..."
    4. Sugere acção concreta
    5. Opcional: "Quer agendar técnico?"

Tool: equipamento.fetch_specs
  → Puxa specs do catálogo (consumo, dimensões, potência)
  → Para perguntas "quantos kWh consome a minha máquina de lavar?"
```

#### Exemplo de conversa com RAG
```
User: "Máquina lavar loiça deixa loiça com manchas. O que faço?"

casa_advisor:
1. Identifica: Bosch SMV41D10EU (da localização activa)
2. docs.search_dicas_resolucao('manchas loiça')
   → "Manual Bosch §4.2: Verificar nível sal regenerador.
       Se nível baixo, as manchas brancas indicam calcário."
3. Responde: "Segundo o manual da tua Bosch, precisas de verificar
   o nível de sal regenerador. Quer que agende manutenção?"
```

#### Custo por conversa (estimado)
- Vector search (embedding query): €0.0001
- Sonnet 4.6 com contexto chunks: ~€0.02-0.03
- **Total: €0.03/conversa** (vs €0.10 sem RAG — mais barato e mais preciso)

### Sprint 2.3 — Agent `v5.energy_analyst` + comparação tarifários (5-6 dias)

#### Parte A — OCR fatura energia
- [ ] Reutiliza Sprint 2.2 (mesmo Edge Function `vision-ocr-doc`)
- [ ] Prompt específico fatura → consumo kWh, comercializador, plano, potência kVA, tipo tarifa, valor pago
- [ ] INSERT em `consumos_energia` (`fonte='ocr_fatura'`)

#### Parte B — Comparação tarifários
- [ ] Nova tabela `core.tarifarios_energia`:
  ```sql
  CREATE TABLE core.tarifarios_energia (
    id uuid PK,
    comercializador text,
    plano_nome text,
    tipo_tarifa text CHECK (tipo_tarifa IN ('simples','bi-horario','tri-horario')),
    potencia_kva numeric,
    preco_kwh_simples numeric,
    preco_kwh_vazio numeric,
    preco_kwh_cheia numeric,
    preco_kwh_ponta numeric,
    termo_fixo_mensal numeric,
    desconto_fidelizacao_pct numeric,
    valido_desde date,
    valido_ate date,
    ativo boolean DEFAULT true,
    fonte_url text,
    last_verified date
  );
  ```
- [ ] Seed manual top 5 comercializadores × 3 planos = 15 rows
- [ ] Comercializadores incluídos: EDP Comercial, Galp Power, Endesa, Iberdrola, Goldenergy
- [ ] Função `core.fn_comparar_tarifarios(p_consumo_anual_kwh, p_potencia_kva, p_distribuicao_horaria jsonb)` SECURITY DEFINER

#### Agent `v5.energy_analyst`
- [ ] Tools: `energy.parse_fatura`, `energy.calculate_profile`, `energy.compare_tarifarios`, `equipamento.estimate_consumption`
- [ ] System prompt: análise consumo + recomendação troca

#### UI
- [ ] `EnergiaScreen.jsx` reescrito
- [ ] Card "Foi possível poupar €X/ano":
  - Tarifário actual (extraído OCR)
  - Top 3 alternativas com poupança
  - Botão "Saber mais" → info para trocar (sem affiliate inicialmente)
- [ ] "Equipamentos que mais consomem" (se assessment completo)

#### Manutenção tarifários
- [ ] Mario actualiza preços manualmente 1×/mês (15 min)
- [ ] V2 futura: scraper ERSE ou API

### Sprint 2.4 — Stripe + rate limits formais (4-5 dias)

#### Stripe setup
- [ ] Stripe account business + verificação
- [ ] Plano "Home+" 6.90€/mês criado
- [ ] Plano "Home Pro" 12.90€/mês criado (V2 features)
- [ ] Webhooks → activar plano em `core.subscricoes`
- [ ] Crédito 10% mensal (já no schema)

#### UI subscrição
- [ ] `SubscricaoScreen.jsx` ligado ao Stripe Checkout
- [ ] Gestão: cancelar, mudar plano, ver fatura
- [ ] Banner "Tens 2/10 análises grátis. Upgrade para ilimitado →" em features rate-limited

#### Schema
- [ ] `core.subscricoes` actualizar para Stripe IDs
- [ ] `core.api_usage` consultado para enforce rate limits
- [ ] RPC `core.fn_get_user_tier(p_pessoa_id)` → `'free'` | `'home_plus'` | `'home_pro'`

### Sprint 2.5 — Voice input Whisper (2-3 dias)

#### Voice input
- [ ] Integração Whisper API (PT-PT)
- [ ] Botão 🎤 em campos longos:
  - `OrcamentoWizardScreen` step descrição
  - `AIExpertScreen` chat input
  - `CWishlist` adicionar item
  - `IntervencaoScreen` notas
- [ ] Preview transcrição antes de submit (user pode editar)

#### Rate limit
- [ ] Free: 5 transcrições/mês
- [ ] Home+: ilimitado

### Sprint 2.6 — prompt_cache para image_inspector + casa_advisor (NOVO — 1-2 dias)

**Razão:** custo real Onda 1B 5× acima do esperado. prompt_cache é alavanca obvia.

- [ ] Habilitar `cache_control` em system prompt + tools schema do image_inspector
- [ ] Habilitar mesmo no casa_advisor
- [ ] Medir custo antes/depois — esperado 60-70% redução em iterations 2-N
- [ ] Atualizar `core.api_usage` para incluir `cache_read_tokens` separado
- [ ] Documentar em CLAUDE.md a decisão de quando usar cache vs não

### Sprint 2.7 — Smoke test Onda 2 (2-3 dias)

- [ ] Mesmos beta testers + 2-3 novos
- [ ] Cada um: upload 1 manual + 1 fatura energia + 1 sessão scout
- [ ] Verificar que scout cria alerts úteis (não spam)
- [ ] Verificar conversion: 1+ users compra Home+
- [ ] Decisão go/no-go Onda 3

### Custos esperados Onda 2 (100 users beta) — REVISTO

| Item | €/user/mês | Total |
|---|---|---|
| Onda 1B (com prompt_cache aplicado) | €0.50 | €50 |
| scout nightly | €0.60 | €60 |
| docs_curator OCR (2/mês) | €0.04 | €4 |
| docs_curator queries (3/mês) | €0.10 | €10 |
| energy_analyst | €0.05 | €5 |
| Voice Whisper (2/mês) | €0.04 | €4 |
| **Total Onda 2** | **€1.33** | **€133** |

### Break-even (revisto)
- 30% conversão Home+ × 100 users × €6.90 = €207. Cobre custos.
- 20% conversão = €138. Cobre tangencialmente.
- 10% conversão = €69. **Insuficiente** → ajustar rate limits ou subir Home+.

### Critério de fecho Onda 2
- [ ] Scout cria alerts úteis (validação subjectiva beta testers)
- [ ] OCR fatura energia funcional + comparação tarifários mostra poupança real
- [ ] OCR docs ≥3 tipos testados (manual, garantia, planta)
- [ ] Stripe ligado · pelo menos 1 conversão real
- [ ] Voice input testado em 3+ ecrãs
- [ ] prompt_cache aplicado e custo medido
- [ ] Custo API <€150 no mês para 100 users
- [ ] CLAUDE.md actualizado · audit limpo

---

## ONDA 3 — Prestador V5

**Duração:** 3-4 semanas
**Objectivo:** marketplace 2-sided funcional · ordens fluem end-to-end
**Beta testers:** 5 prestadores piloto + 20 clientes beta

### Sprint 3.1 — Wireframes prestador (1-2 dias)

- [ ] Desenhar todos os ecrãs prestador antes de codar
- [ ] Login (mesmo) → wizard signup → inbox → agenda → ordem detalhe → chat → concluir → fatura → perfil
- [ ] Validar com 1-2 prestadores reais via WhatsApp screenshots

### Sprint 3.2 — Signup dual real (3-4 dias)

- [ ] LoginScreen ganha selector "Sou cliente / Sou prestador"
- [ ] Cliente: signup actual (mantido)
- [ ] Prestador: novo wizard
- [ ] Schema:
  - [ ] `core.memberships.role` permite `'prestador'` (já existe?)
  - [ ] `v5_manutencao.prestador_perfis` (novo) — formação, alvará, IBAN, seguro RC
  - [ ] `v5_manutencao.prestador_especialidades` — N:N com `categorias`
  - [ ] `v5_manutencao.prestador_areas` — códigos postais cobertos
- [ ] RLS: prestador `pendente_aprovacao` não vê inbox · só vê wizard

### Sprint 3.3 — Wizard prestador (4-5 dias)

Steps:
- [ ] Step 1 — Dados pessoais (já no signup base)
- [ ] Step 2 — Profissão e formação (carregar PDF certificados → OCR via `docs_curator`)
- [ ] Step 3 — Especialidades (multi-select de categorias V5)
- [ ] Step 4 — Área de actuação (códigos postais — feature CP autocomplete vem aqui)
- [ ] Step 5 — Documentos legais (alvará, RC seguro, IBAN)
- [ ] Step 6 — Foto perfil + bio curta + portfolio (fotos trabalhos passados)
- [ ] Submit → estado `pendente_aprovacao` → notifica admin (email)

### Sprint 3.4 — Magic link WhatsApp para prestadores (2 dias)

**Razão:** recrutamento prestador é gargalo. Magic link via WhatsApp reduz fricção.

- [ ] Função `core.fn_invite_prestador_whatsapp(phone, name)` — gera magic link único
- [ ] Edge Function `send-whatsapp-invite` → Twilio WA Business API ou Resend SMS fallback
- [ ] Landing `/onboard/<token>` → 1-click abre app + pré-popula formulário com nome+telefone
- [ ] Mario tem painel para enviar batches de convites

### Sprint 3.5 — Inbox prestador + aceitar ordem (4-5 dias)

- [ ] `PrestadorInboxScreen.jsx` — lista ordens disponíveis filtradas por área + especialidades
- [ ] Card por ordem: cliente (anónimo até aceite), área, valor estimado, urgência
- [ ] Botão "Ver detalhes" → modal com mais info
- [ ] Botão "Aceitar" → vai para "as minhas ordens"
- [ ] Notificações push (Capacitor futuro · email/SMS por agora)

### Sprint 3.6 — Agent `v5.matchmaker` (3-4 dias)

**System prompt do MASTER §7.3:** atribui melhor prestador a pedido (score + distância + disponibilidade).

#### Tools
- [ ] `prestadores.list_disponiveis` → filtrados por área + especialidade + activos
- [ ] `prestadores.score_match` → calcular fit (rating, histórico, distância)
- [ ] `prestadores.notify` → push notification top 3 prestadores
- [ ] `ordem.update_status` → marcar como `notificada`

#### Cron / event
- [ ] Trigger quando ordem fica `aberta`
- [ ] Notifica top 3 com janela 30 min para resposta
- [ ] Se ninguém aceita → expande para top 10

### Sprint 3.7 — Chat ordem + concluir + avaliação (4-5 dias)

- [ ] `mensagens_chat` table já existe (do schema V5)
- [ ] UI chat dentro `OrdemDetalheScreen` (cliente e prestador)
- [ ] Real-time via Supabase Realtime
- [ ] Marcar como concluído (prestador)
- [ ] Cliente avalia 1-5 estrelas + comentário
- [ ] Pontos: cliente +50, prestador +rating proporcional
- [ ] Estado final `concluida_avaliada`

### Sprint 3.8 — Antes/Depois automático (2-3 dias)

- [ ] Prestador tira foto antes (quando começa) e depois (quando termina)
- [ ] Componente `BeforeAfterSlider` (swipe horizontal)
- [ ] Cliente recebe push "Vê o resultado"
- [ ] Botão "Partilhar" → gera imagem composta com watermark V5 + envia WhatsApp/redes

### Sprint 3.9 — QR Code equipamento (2-3 dias)

- [ ] Cada equipamento tem QR único: `app.zelo.pt/eq/<uuid>`
- [ ] Mario imprime stickers iniciais (manual)
- [ ] Landing pública mostra: tipo equipamento + última intervenção (sem PII)
- [ ] Auth → mostra ficha completa
- [ ] Prestador no local: scan → histórico instantâneo

### Sprint 3.10 — Modo cliente + prestador (Sandra) (2-3 dias)

- [ ] AuthContext: detecta múltiplos roles
- [ ] Mode switcher header (Uber-style)
- [ ] Default: última escolha persistida
- [ ] RLS + helpers atualizados:
  - [ ] `auth.current_active_mode()` lê JWT custom claim
  - [ ] `auth.current_prestador_id()`
  - [ ] `auth.is_prestador_approved()`
- [ ] Sandra pode contratar Ricardo (ambos prestadores) sem comissão

### Sprint 3.11 — Agent `v5.assistente_prestador` (3-4 dias)

**System prompt:** assistente do prestador. Ajuda a gerir agenda, responder a clientes, decidir que ordens aceitar.

#### Tools
- [ ] `prestador.get_inbox` → ordens disponíveis
- [ ] `prestador.get_agenda_hoje` → próximos compromissos
- [ ] `prestador.get_distancia` → calcular distância à ordem
- [ ] `prestador.estimate_revenue_dia` → resumo financeiro
- [ ] `prestador.draft_resposta_cliente` → rascunho chat
- [ ] `prestador.aceitar_ordem` → aceita ordem (requires confirm)

#### UI
- [ ] Chat AI em PrestadorScreen
- [ ] Wow factor: "Que ordens valem mais hoje?" / "Manda mensagem ao Sr. João"

### Sprint 3.12 — Smoke test Onda 3 (3-5 dias)

- [ ] Recrutar 5 prestadores piloto via WhatsApp Mario
- [ ] Onboarding via magic link
- [ ] Aprovar manualmente
- [ ] 20 clientes beta criam ordens
- [ ] Validar fluxo end-to-end
- [ ] Decisão go/no-go Onda 4

### Custos esperados Onda 3 (100 users + 10 prestadores)

| Item | €/mês |
|---|---|
| Itens anteriores (Onda 2) | €133 |
| matchmaker (10 ordens/dia) | €15 |
| assistente_prestador (5 turns/prestador) | €5 |
| **Total Onda 3** | **€153** |

### Critério de fecho Onda 3
- [ ] 5 prestadores piloto onboarded
- [ ] 5+ ordens completas end-to-end (cliente cria → prestador aceita → executa → cliente avalia)
- [ ] Antes/Depois testado em 3+ ordens
- [ ] QR codes funcionais em 5+ equipamentos
- [ ] Sandra (cliente+prestador) testada
- [ ] CLAUDE.md actualizado · audit limpo

---

## ONDA 4 — Admin mínimo + Capacitor

**Duração:** 1.5-2 semanas
**Objectivo:** ferramenta admin mínima + app stores
**Beta testers:** públicos via TestFlight + Play Store internal

### Sprint 4.1 — Mini-painel staff dentro V5 (4-5 dias)

**Razão:** Fase 6 ERP completo (Next.js separado) fica para depois. Por agora, admin tools dentro do V5 mobile usando `is_staff()`.

#### Ecrãs novos (só visíveis se `isStaff===true`)
- [ ] `StaffDashboardScreen` — KPIs básicos: users activos, ordens em curso, revenue mês
- [ ] `StaffPrestadoresScreen` — lista prestadores · aprovar/suspender · ver KPIs
- [ ] `StaffClientesScreen` — search clientes · ver perfil · anonimizar manual
- [ ] `StaffStaffRolesScreen` — gerir staff_roles (granular)
- [ ] `StaffAuditScreen` — ver `agent_audit_log` recentes (todas chamadas IA)

#### RPCs guard `is_staff()` em todos
- [ ] Já feito em 3.4D para alguns. Auditar e completar.

### Sprint 4.2 — Agent `admin.supervisor` (2-3 dias)

**System prompt do MASTER §7.4:** corre diariamente 07h. Detecta padrões e gera briefing.

#### Tools
- [ ] `metrics.daily_revenue`
- [ ] `metrics.churn_signal_users` → users que param de usar
- [ ] `metrics.prestador_ratings_trend` → ratings a cair
- [ ] `metrics.anomalies` → spike fraude, etc.
- [ ] `briefing.send_email_admin` → envia summary

#### UI
- [ ] Card no `StaffDashboardScreen` com briefing matinal
- [ ] Email diário 07h para admins

### Sprint 4.3 — Agent `support.triage` (2-3 dias)

#### Tools
- [ ] `tickets.list_pendentes`
- [ ] `tickets.classify_intent` → categoria (pagamento / técnica / prestador / docs)
- [ ] `faq.search` → resposta automática se possível
- [ ] `tickets.suggest_response` → rascunho para human approval
- [ ] `tickets.escalate_human` → marca como needs_human

#### UI
- [ ] `StaffSupportScreen` — inbox tickets · agent rascunha resposta · admin aprova 1-click
- [ ] Reduz custo support 50%+ (estimativa)

### Sprint 4.4 — Capacitor App Store prep (3-4 dias)

#### Setup
- [ ] `npx cap init` no projecto V5
- [ ] iOS + Android targets
- [ ] Bundle ID: `pt.zelo.app` (ou outro confirmado por Mario)
- [ ] Splash screen + app icon (placeholder por agora · final no rebrand)
- [ ] Plugins essenciais: camera, push notifications, deep links, geolocation, preferences

#### Adaptações código
- [ ] Storage crítico: `@capacitor/preferences` em vez de localStorage
- [ ] Safe-area insets (iOS notch + Android status bar)
- [ ] Touch targets ≥44pt
- [ ] Theme-color meta
- [ ] Deep links `v5manutencao://` (ou `zelo://`)

#### Build
- [ ] `npm run build` + `npx cap sync ios` + `npx cap sync android`
- [ ] Xcode build para TestFlight
- [ ] Android Studio build para Play Store internal

### Sprint 4.5 — TestFlight + Play Internal (2-3 dias)

- [ ] Submeter TestFlight (Apple)
- [ ] Submeter Play Store internal testing (Google)
- [ ] Lista de testers: 20-30 pessoas (mix beta clientes + prestadores)
- [ ] Recolher feedback estruturado
- [ ] Decisão: público ou Onda 5

### Custos Onda 4
- Apple Developer: €99/ano
- Google Play: €25 one-time
- Custos API: ~€155/mês (mantém Onda 3 + supervisor + support.triage)

### Critério de fecho Onda 4
- [ ] 20+ testers TestFlight + Play Internal
- [ ] Mini-admin funcional para gestão diária
- [ ] supervisor + support.triage agents activos
- [ ] App estável em 5+ dispositivos diferentes
- [ ] CLAUDE.md final actualizado · roadmap revisão

---

## Decisões — actualizadas 28 Abril 2026

### A. API key + budget Anthropic — ✅ RESOLVIDO
- [x] **Workspace dedicada V5** — secret `ANTHROPIC_API_KEY` em Supabase
- [x] **Budget alert mensal:** €30 Onda 1B inicial → ⚠️ pode precisar revisão para €100-150 Onda 1B (custo real 5× estimado)
- [x] **Modelo:** Claude Sonnet 4.6 confirmado para todos os agentes (não Opus 4.7)
- [x] PRICING map confirmado: $3/$15 MTok input/output, USD_TO_EUR=0.92

### B. Codename de trabalho — ⏳ PENDENTE
- [ ] **"Zelo"** confirmas para BRAND constants? Pode mudar quando rebrand formal.
- [ ] Internamente continua "V5 Manutenção" para schemas/paths/commits

### C. Beta testers Onda 1B (3-5 pessoas) — ⏳ PENDENTE
- [ ] Identificados? Família/amigos próximos.
- [ ] Briefing: tirar foto de 1 equipamento real + fazer 3 perguntas à AI Expert + dar feedback via WhatsApp.

### D. Features OCR adicionais — ✅ RESOLVIDO
- [x] **OCR docs (RAG)** Onda 2 — confirmado SIM
- [x] **Comparação tarifários energia** Onda 2 — confirmado SIM (validado por contactos directos com comercializadoras)
- [x] **MVP comparação:** 5 comercializadores curados manualmente — confirmado

### E. Ordem das ondas — ✅ REVISTA
- ~~1B → 2 → 3 → 4~~ (original)
- ✅ **1B → 1B.5 (fundações + V2 paralelo) → 2 → 3 → 4** (revista 28 Abr)
- Razão: V2 tem demanda pre-validada (síndicos a querer testar) + receita v63 a sustentar

### F. Magic link WhatsApp para prestadores — ⏳ PENDENTE
- [ ] Twilio WA Business API ou Resend SMS fallback?
- [ ] Recomendação anterior mantida: começar Resend SMS, migrar Twilio WA quando tiver tracção.

### G. QR Code stickers físicos — ⏳ PENDENTE
- [ ] Tu imprimes inicialmente (próximos 50 equipamentos)?
- [ ] Long-term: sticker entregue com cada onboarding · custo €0.20/sticker via Vistaprint.

### H. App Store name — ⏳ PENDENTE
- [ ] Bundle ID iOS/Android: `pt.zelo.app` ou outro?
- [ ] App Store display name: "Zelo" ou "V5 Manutenção" inicial?
- [ ] Recomendo: lançar TestFlight como "Zelo (beta)" para testar reactions ao nome.

### NOVA — I. Mediação seguros + parcerias energia — ✅ VALIDADO
- [x] Mario tem certificado mediação seguros ASF (resolve barreira regulatória)
- [x] Contactos directos com comercializadoras energia
- [x] Decisão estratégica: V5 com upsell energia/seguros + V2 condomínios em paralelo
- ⚠️ **Cautela:** mediação seguros é responsabilidade pessoal Mario. Audit trail crítico desde dia 1 quando agentes IA aconselharem produtos seguros (Onda 5+)

### NOVA — J. V2 condomínios paralelo — ✅ DECIDIDO 28 Abr
- [x] V2 arranca em paralelo (Sprint 1B.5), não sequencial
- [x] v63 prataowners read-only no V2 primeiro, write features Fase 1 (semanas 9-16)
- [x] Síndicos pre-validados a querer testar
- [ ] Confirmar tipo síndicos (profissionais vs auto-síndicos) — afecta features
- [ ] Confirmar categoria principal dos 5 prestadores V5

---

## Backlog UX — descoberto durante Onda 1B (NOVO)

**Não bloqueante, exceto #1.** Entra em Sprint 1B.2.5 ou 1B.5.

### Sprint 1B.6 candidata — Histórico de manutenções na ficha (observação Mario 28 Abr 16:30)

**Distinção semântica importante (decidida 28 Abr):**
- "Análise IA" = identificação automática por foto (agente, sem intervenção humana)
- "Manutenção/Reparação" = intervenção profissional (certificada, faturável, relevante para AT)
- Os dois NÃO devem ser misturados — são linhas de tempo diferentes

**Pendente:**
- [ ] Schema check: `ordens_trabalho` tem coluna `equipamento_id`?
      → Se não: `ALTER TABLE v5_manutencao.ordens_trabalho ADD COLUMN IF NOT EXISTS equipamento_id uuid;` (FK opcional — um pedido pode não ter equipamento)
- [ ] Query: `ordens_trabalho WHERE equipamento_id = X AND estado IN ('concluida', 'concluida_avaliada')`
- [ ] Render no bloco "Manutenções e reparações" da ficha:
      data · prestador (nome) · categoria · custo · descrição curta
- [ ] Nota disclaimer UI: "IA não substitui certificação técnica profissional"
- [ ] Clarificar aos clientes que "Análise IA" é auxiliar, não auditável

- [x] **#1 (alta):** ImovelWizard.jsx "Erro ao guardar" — payload sem organization_id, RLS rejeita ✅ 1B.2.5
- [ ] **#1b (média):** ImovelWizard sem selector de organização. Multi-org users vêem 1ª org por convenção. Adicionar selector quando user tiver 2+ memberships activos. (Sprint 1B.5 ou Fase 6.)
- [ ] **#2:** App.jsx query `ordens` em vez de `ordens_trabalho` (404)
- [ ] **#3:** Modal/drawer fecha em copy-paste (onClickOutside mal config)
- [ ] **#4:** Distrito como dropdown PT + autopreencher CP via API CTT
- [ ] **#5:** Sistemas "comuns" (CCTV, Elevador) só visíveis para `categoria='condominio'`

---

## Backlog 3.6 (descobertas Sprint 3.5)

**Não bloqueante.** Faz quando voltar a haver janela.

- [ ] Schema missões hierarquia formal (ordem + prerequisito_missao_id) — adiado de Sprint 3.5.4
- [ ] Favicon real (substituir placeholder 🏠 emoji) — depende de logo
- [ ] Loading consistency pass (skeleton vs spinner conventions)
- [ ] CPs autocomplete (lista CTT 250k entradas) — pode entrar Onda 3 wizard prestador
- [ ] Outras descobertas de smoke test G

---

## Pós-Onda 4 — backlog longo prazo

### Fase 5 (MASTER) — Stripe avançado
- Crédito 10% mensal automático
- Founding 200 trial 3 meses Pro grátis
- Plano enterprise para empresas

### Fase 6 (MASTER) — Admin ERP dedicado
- `apps/v5-admin-erp/` em Next.js 14
- Audit Center UI completo
- Dashboards customizáveis
- Migrar mini-admin V5 → ERP separado

### Fase 7 (MASTER) — V10 Copilot (paralelo, não V5)
- Apps separadas, BD própria
- Não toca V5 directamente

### Fase 8 (MASTER) — B2B Condo + Empresa no V5
- Multi-tenant condomínios
- Empresas como cliente especial

### Fundações longo prazo (descobertas 28 Abr) — NOVO

Adiadas para quando justificar (3+ apps existentes ou dor real):

- [ ] `packages/agent-runtime` — extrair `_shared/agents/` para package npm partilhado V2/V5
- [ ] `packages/ui-tokens` + `packages/ui-primitives` + `packages/ui-patterns` — design system real
- [ ] Storybook + Chromatic — visual regression
- [ ] **`core.events`** — schema bus para event sourcing leve cross-vertical (espinha dorsal multi-vertical)
- [ ] Orquestrador "equipas de agentes" (`agent_teams`, `agent_workflows`, `agent_handoffs`, `agent_messages`) — quando tivermos 3+ agentes
- [ ] Versioning prompts/tools (`core.agent_prompts` versionados + A/B test)
- [ ] Knowledge base agentes via pgvector (`packages/agent-knowledge`)
- [ ] Decisão arquitectural: 1 Edge Function por agente vs `agent-router` central — recomendação: híbrido
- [ ] Vertical-as-package (`packages/v5-domain` + `apps/v5-mobile` + `apps/v5-admin`) — quando 2+ apps por vertical
- [ ] Ambientes dev/staging/prod separados (~€25/mês staging Supabase)
- [ ] Observabilidade Sentry + Logflare
- [ ] Capacitor iOS-readiness no V5 antes de exigir do V2

### Features wow descobertas mas adiadas

- **Gémeo digital 3D** da casa (Three.js · longo prazo)
- **Modo casa partilhada** (família multi-user numa casa)
- **OCR cartão cidadão** para signup (skip 5 campos)
- **OCR boletim ITED** (compliance)
- **OCR etiqueta energética** (quando user adiciona equipamento manual)
- **OCR recibo pagamento** (auto-update ordens · histórico gastos)
- **Voice notes** (recordings persistidos para review futuro)

### Affiliate program comercializadores energia
- Negociação com Selectra ou directo (€15-50 por troca facilitada)
- Mario já tem contactos directos — pode arrancar Onda 5

### Service troca assistida (premium)
- "Tratamos da troca por ti" — Mario recolhe info + comunica com comercializador
- Custo: €X · Onda 5+

---

## Custos API agregados (estimativa 100 users active) — REVISTO 28 Abr

| Onda | Custo €/mês (revisto) | Acumulado |
|---|---|---|
| 1B | **€130-150** (sem prompt_cache) | €150 |
| 2 | **€133** (com prompt_cache aplicado em 2.6) | €133 |
| 3 | **€153** | €153 |
| 4 | **€155** | €155 |

**Receita esperada (30% conversão Home+):** €207/mês.
**Receita esperada (50% conversão Home+):** €345/mês.
**Break-even:** ~30% conversão à Onda 2 (com prompt_cache aplicado).

⚠️ **Onda 1B sem prompt_cache:** custo pode ultrapassar receita até Sprint 2.6 ser aplicada. Mitigação: rate limits agressivos free tier (3/dia + 10/mês).

---

## Riscos identificados

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Custos API rebentam budget antes de prompt_cache (Onda 1B) | **Alta** (era média) | Rate limits agressivos · prioritizar Sprint 2.6 |
| Beta testers não compreendem value IA | Baixa | Onboarding com vídeo curto · WhatsApp follow-up |
| Prestadores não convertem em piloto | Alta | Magic link WhatsApp · Mario contacta directamente · pool inicial 5 |
| Tarifários energia desactualizados rapidamente | Alta | Mario actualiza 1×/mês manual · auto-scrape ERSE Fase 5+ |
| App Store rejeita por moderação IA | Baixa | Disclaimer claro "IA não substitui profissional" · human review opcional |
| Capacitor build issues iOS/Android | Média | Tempo extra Sprint 4.4 · buffer 2 dias |
| **NOVO:** V5/V2 divergem por falta de fundações | Média | Sprint 1B.5 dedicada — packages/db + packages/auth extraídas |
| **NOVO:** Mediação seguros sem audit trail = risco licença Mario | Média | Audit log obrigatório dia 1 quando agente IA tocar em produtos seguros |
| **NOVO:** Prestadores "interessados" não converterem em activos | Média | Validar 5 prestadores reais com 3+ ordens ≥4★ antes de construir para 100 |

---

## Aprendizagens consolidadas (CLAUDE.md vivo)

Regras descobertas em produção, não teóricas:

| Regra | Lição |
|---|---|
| W | RLS sem GRANT = 403 silencioso |
| X | SECURITY DEFINER sem GRANT EXECUTE = 42501 silencioso |
| Y | PostgREST embeds: `categoria_id` vs `categoria` (naming colisão schemas) |
| Z | Audit RLS checklist sistemático após qualquer mudança |
| AA | **Edge Functions: nunca redeploy sem ler `tool_error` real** (pagou-se em 1B.2.2 — 3 fixes diagnosticados, não especulativos) |
| BB | Validação categórica em executor de agentes, não BD (whitelist em código) |
| CC | Helpers DEV `window.__test*` tolerantes a string\|object (lição 1B.2.2 deploy v3) |

---

## Aprovação para arrancar próximo passo

Decisões já tomadas em 28 Abr permitem arrancar **três frentes em paralelo**:

1. **Sprint 1B.2.5** (1-2h) — fix #1 ImovelWizard antes de qualquer coisa
2. **Sprint 1B.2.3** (3-4 dias) — UI AdicionarCamaraScreen + EquipamentoFichaScreen
3. **Sprint 1B.5 paralelo** (5-7 dias) — extrair packages/db + auth + scaffold V2

Para Mario confirmar antes de arrancar:

```
Próximo arranque:
1. Avançar 1B.2.5 (fix #1) primeiro? [SIM/NÃO]
2. Depois 1B.2.3 (UI câmara) ou 1B.5 (fundações)? [1B.2.3 / 1B.5 / paralelo]
3. Decisões pendentes B (codename), C (beta testers), F (magic link), G (QR), H (bundle): [respostas]
4. Confirmar tipo síndicos V2 (profissionais/auto/mix): [resposta]
5. Confirmar categoria 5 prestadores V5 (limpezas/canalização/mix): [resposta]
```

---

## Anexos para Notion

### Estrutura sugerida no Notion

```
📁 V5 Manutenção
   ├── 🗺️ Roadmap (este documento)
   ├── 📊 KPIs Tracker (criar quando Onda 4)
   ├── 🤖 Agents Library (subpages por agent)
   │   ├── v5.image_inspector ✅ COMPLETED 28 Abr
   │   ├── v5.casa_advisor (Onda 1B.3)
   │   ├── v5.scout (Onda 2.1)
   │   ├── v5.docs_curator (Onda 2.2)
   │   ├── v5.energy_analyst (Onda 2.3)
   │   ├── v5.matchmaker (Onda 3.6)
   │   ├── v5.assistente_prestador (Onda 3.11)
   │   ├── admin.supervisor (Onda 4.2)
   │   └── support.triage (Onda 4.3)
   ├── 📝 Decisões arquitecturais (ADRs)
   ├── 🐛 Bug log (smoke tests + UX backlog 28 Abr)
   ├── 👥 Beta testers (CRM mini)
   └── 💰 Custos API (mensal — actualizar com valores reais 1B.2.2)
```

### Linked databases úteis

- **Tarefas Onda atual** — view filtrada `Onda = "1B"` + `Status != "Done"`
- **Beta testers** — colunas: nome, contacto, onda recrutado, feedback, NPS
- **Custos API** — colunas: mês, agent, calls, custo €, observações

---

**Documento criado:** 27 Abril 2026
**Última actualização:** 28 Abril 2026 (tarde) — fecho 1B.2.3b + decisão arquitectural Onda 2 (equipamento_enricher + docs_curator schema + casa_advisor RAG integration + princípio ecossistema agentes)
**Próxima revisão:** após fecho Sprint 1B.5 (fundações + V2 scaffold)
**Autor:** Claude (chat) + Mario
