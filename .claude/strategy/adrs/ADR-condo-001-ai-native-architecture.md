---
id: ADR-condo-001
title: Arquitectura AI-Native para Administração de Condomínios (V2 novo no V1 Core Hub)
date: 2026-05-05
status: Aceite
deciders: [architect-proptech, Mário Carvalho]
vertical: V2 Condomínios
sprint: 1C (validação arquitectural)
---

# ADR-condo-001 · Arquitectura AI-Native para Administração de Condomínios

## Estado

**Aceite** · 2026-05-05

---

## Contexto

A plataforma PropTech tem em produção o V2 legacy (`eozklslwfaqujaijvdnl`) — um Supabase com 30 tabelas e ~5.000 linhas de dados reais de clientes (Property 007 LDA, `prataowners.pt`). Este sistema legacy é intocável e mantém-se em produção.

A decisão é construir uma **nova implementação AI-native de V2 — Condomínios** de raiz no V1 Core Hub (`hkmvszkpxjbxmnixzqbl`), onde os agentes IA são os "employees" operacionais, e o Mário actua exclusivamente como supervisor que aprova excepções e decisões de alto impacto.

Este ADR documenta quatro decisões inter-relacionadas que formam a arquitectura completa:

1. **Sistema de cron** para triggers automáticos temporais dos employees
2. **Multi-tenancy de edifícios** e como o RLS garante isolamento entre carteiras
3. **Sistema de audit trail** — quais employees escrevem em `audit_log` e quando
4. **Custo estimado de LLM** para os 11 employees activos

O trigger para este ADR veio do `orquestrador-condo`, confirmado em `.claude/state/triggers.md`.

---

## Roster de Employees (para referência)

| Employee | Modelo | Custo/mês | Trigger primário |
|---|---|---|---|
| `orquestrador-condo` | Opus | ~$15 | Cron diário + eventos |
| `financeiro-condo` | Sonnet | ~$8 | Cron Dia 1 + Dia 15 |
| `atendimento-condo` | Haiku | ~$3 | Webhook contínuo |
| `manutencao-condo` | Sonnet | ~$10 | Evento (avaria) |
| `assembleia-condo` | Sonnet | ~$6 | Cron mensal + manual |
| `docs-condo` | Sonnet | ~$8 | Webhook + upload |
| `compliance-condo` | Sonnet | ~$6 | Cron semanal |
| `energia-condo` | Sonnet | ~$7 | Cron Dia 1 + trimestral |
| `seguros-condo` | Sonnet | ~$7 | Cron Dia 1 + anual |
| `comunicacao-condo` | Haiku | ~$2 | Evento (após aprovação) |
| `importador-v2` | Opus | uso único | Manual (one-shot) |

---

## Decisão 1 — Sistema de Cron para Triggers Temporais

### Alternativas avaliadas

**Opção A — pg_cron (Supabase built-in, SQL puro)**

`pg_cron` é uma extensão Postgres que corre directamente no servidor de base de dados. Configura-se com SQL (`cron.schedule(...)`) e invoca Edge Functions por HTTP.

- Vantagens: nativo no Supabase desde sempre, sem infra extra, logs em `cron.job_run_details` (tabela Postgres).
- Desvantagens: configuração exclusivamente por SQL (sem UI), retry em falha limitado, logs pouco acessíveis ao Mário, gestão de schedules implica ter acesso SQL ao Supabase.

**Opção B — Supabase Cron (produto novo Supabase, 2025)**

O Supabase Cron é a camada de produto construída sobre pg_cron com UI nativa no dashboard do Supabase. Permite criar, editar e monitorizar schedules visualmente. Invoca Edge Functions directamente no mesmo projecto, sem latência de rede externa.

- Vantagens: UI no dashboard (Mário pode ver e suspender schedules sem SQL), construído sobre pg_cron (sem nova dependência de infra), invocação directa de Edge Functions no mesmo projecto (sem HTTP externo), alinhamento total com a stack existente.
- Desvantagens: produto mais recente (funcionalidades em maturação contínua), ainda sem suporte a retry automático com backoff.

**Opção C — CronCreate (Claude Code tool / harness)**

Schedules geridos pelo harness Claude Code.

- Eliminada imediatamente: depende de sessão Claude activa, não é infra sempre-on. Não é adequado para produção autónoma. Um employee financeiro tem de gerar quotas no Dia 1 às 06h00 independentemente de haver sessão Claude aberta.

**Opção D — Vercel Cron Jobs**

Schedules definidos em `vercel.json`, invocam Edge Functions Supabase por HTTP externo.

- Vantagens: UI clara na dashboard Vercel, familiar.
- Desvantagens: plano hobby Vercel limitado a 2 cron jobs (projecto tem 8+ schedules distintos); plano Pro custa €20/mês de infra extra; invocação por HTTP externo implica autenticação (service role key ou shared secret nos headers); latência extra Vercel → Supabase; adiciona uma dependência de plataforma externa onde não há necessidade.

### Decisão: Opção B — Supabase Cron

O Supabase Cron é a escolha correcta pelos seguintes motivos concretos:

1. **Alinhamento zero-overhead**: toda a plataforma já corre em Supabase. Não se introduz nova plataforma de infra.
2. **UI acessível**: Mário pode ver no dashboard Supabase quais schedules estão activos, quando correram pela última vez, e suspender um schedule sem precisar de escrever SQL — relevante dado o perfil não-programador.
3. **Invocação directa**: Edge Functions no mesmo projecto são invocadas internamente, sem HTTP externo nem autenticação extra entre serviços.
4. **Base sólida**: é pg_cron por baixo — tecnologia madura com anos de produção em Postgres. A camada de produto adiciona UI sem mudar a fiabilidade subjacente.
5. **Custo zero adicional**: incluído no plano Supabase Pro existente.

**Schedule canónico dos employees** (a configurar em Supabase Cron):

```
0 6 1 * *     orquestrador-condo/monthly-close   (Dia 1, 06h00 — lança financeiro+energia+seguros+compliance)
0 9 15 * *    orquestrador-condo/mora-run         (Dia 15, 09h00 — lança financeiro mora)
0 7 * * *     orquestrador-condo/daily-check      (Diário, 07h00 — SLAs + aprovações + digest)
30 8 5 * *    comunicacao-condo/quota-reminders    (Dia 5, 08h30 — lembretes quota)
0 6 * * 1     compliance-condo/weekly-report       (2ª feira, 06h00 — prazos 30 dias)
30 7 * * 2    seguros-condo/sinistros-followup     (3ª feira, 07h30 — acompanhar sinistros)
0 7 * * 5     manutencao-condo/ots-digest          (6ª feira, 07h00 — digest OTs semana)
0 6 1 1,4,7,10 * energia-condo/tariff-audit        (Jan/Abr/Jul/Out, Dia 1 — simulação tarifária)
0 8 1 1 *     seguros-condo/annual-audit           (Janeiro Dia 1 — auditoria cobertura anual)
```

**Nota técnica**: cada schedule invoca uma Edge Function no V1 Core Hub (`hkmvszkpxjbxmnixzqbl`) por nome. A Edge Function do `orquestrador-condo` é o ponto de entrada principal para triggers globais (monthly-close, mora-run) — lança os outros employees em paralelo. Employees com schedules próprios (compliance, seguros, manutencao) são invocados directamente pelo Supabase Cron para evitar overhead desnecessário de orquestração quando o trigger é simples e não global.

---

## Decisão 2 — Multi-Tenancy de Edifícios e RLS

### Contexto

O V2 AI-native vai gerir múltiplos edifícios (condomínios). Cada employee deve operar exclusivamente sobre os edifícios da carteira activa — nunca aceder a dados de outro edifício.

Há dois níveis de isolamento necessários:

1. **Isolamento entre edifícios** — financeiro-condo a processar Edifício A nunca lê dados do Edifício B.
2. **Isolamento entre utilizadores do portal** — condóminos do Edifício A não vêem dados do Edifício B (relevante para portal futuro).

### Decisão: RLS via `edificio_id` como coluna de tenancy em todas as tabelas de `v2_condominios`

**Princípio**: todas as tabelas do schema `v2_condominios` têm coluna `edificio_id UUID NOT NULL REFERENCES core.imoveis(id)`. O RLS filtra por `edificio_id` usando policies baseadas em `auth.uid()` e a tabela de assignments.

**Tabela de assignments** (`core.staff_roles` ou nova `core.edificio_assignments`): mapeia `staff_id → edificio_id` com role (gestor / leitura / admin). Os employees IA usam a service role key e filtram `edificio_id` explicitamente no query (não dependem de RLS para si próprios — são backend services com acesso total). O RLS protege o portal de condóminos e futuras integrações externas.

**Para os employees IA**: cada invocação recebe `edificio_id` como parâmetro obrigatório no payload. O orquestrador é responsável por passar o `edificio_id` correcto ao delegar. Nunca se processa "todos os edifícios" sem iterar explicitamente a lista de `core.imoveis WHERE status='activo'`.

**Regra NUNCA para os employees**: nenhum employee faz `SELECT * FROM v2_condominios.recebimentos` sem cláusula `WHERE edificio_id = $edificio_id`. Violação desta regra é considerada bug crítico de dados.

**RLS policies para portal de condóminos** (futuro):

```sql
-- Exemplo: condóminos só vêem as suas fracções
CREATE POLICY "condomino_fracoes" ON v2_condominios.fracoes
  FOR SELECT USING (
    edificio_id IN (
      SELECT edificio_id FROM v2_condominios.condominos
      WHERE pessoa_id = (SELECT id FROM core.pessoas WHERE auth_uid = auth.uid())
    )
  );
```

---

## Decisão 3 — Sistema de Audit Trail

### Contexto

A questão é: todos os employees escrevem em `audit_log`? Ou apenas os que fazem mudanças financeiras?

### Decisão: Audit trail universal com severidade por tipo de acção

**Todos os employees escrevem em `v2_condominios.audit_log`**, mas com categorias de severidade distintas:

| Severidade | Quem gera | Exemplos |
|---|---|---|
| `info` | Qualquer employee | Quotas geradas, reconciliação concluída, documento arquivado |
| `action` | Employees que escrevem dados | Recebimento registado, OT aberta, apólice criada |
| `approval` | Orquestrador (após aprovação Mário) | Aviso mora enviado, OT adjudicada, comunicação executada |
| `security` | Qualquer employee | Tentativa de acesso a edifício não autorizado, erro de autenticação |

**Justificação**: audit trail completo é a prova legal de que o sistema operou correctamente. Para Mário como TOC e administrador de condomínios, poder provar que "o aviso de mora foi gerado no Dia 15 e aprovado pelo Mário às 14h32 do dia X" tem valor legal directo. Um audit trail parcial (apenas financeiro) cria lacunas que seriam problemáticas numa auditoria ou litígio.

**Schema da tabela**:

```sql
CREATE TABLE v2_condominios.audit_log (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  edificio_id  UUID NOT NULL REFERENCES core.imoveis(id),
  employee_id  TEXT NOT NULL,           -- 'financeiro-condo', 'orquestrador-condo', etc.
  action       TEXT NOT NULL,           -- 'quota_generated', 'mora_detected', 'ot_opened', etc.
  severity     TEXT NOT NULL CHECK (severity IN ('info', 'action', 'approval', 'security')),
  entity_type  TEXT,                    -- 'recebimento', 'ot', 'apolice', etc.
  entity_id    UUID,                    -- FK para o objecto afectado (opcional)
  payload      JSONB,                   -- detalhes da acção (valores, diffs, contexto)
  approval_id  UUID REFERENCES system.approvals_queue(id), -- se resultou de aprovação
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index para queries frequentes do Command Center
CREATE INDEX idx_audit_edificio_date ON v2_condominios.audit_log (edificio_id, created_at DESC);
CREATE INDEX idx_audit_employee ON v2_condominios.audit_log (employee_id, created_at DESC);
CREATE INDEX idx_audit_severity ON v2_condominios.audit_log (severity, created_at DESC);
```

**Excepções (não escrevem em audit_log)**:
- `atendimento-condo`: escreve em `v2_condominios.historico_pedidos` (registo de triagem, não audit de negócio).
- `comunicacao-condo`: escreve em `v2_condominios.comunicacoes` (registo de envios com tracking). A entrada em `audit_log` é criada pelo `orquestrador-condo` com severity `approval` quando a comunicação é executada.

---

## Decisão 4 — Custo Estimado de LLM (Orçamento Mensal)

### Pressupostos

- Plataforma começa com piloto de 3-5 edifícios.
- Volume inicial: ~100-200 pedidos/mês (avarias, quotas, documentos, emails).
- Custos Anthropic API (Maio 2026): Opus ~$15/M tokens input, ~$75/M output; Sonnet ~$3/M input, ~$15/M output; Haiku ~$0.25/M input, ~$1.25/M output.

### Estimativa por employee (fase piloto, 5 edifícios)

| Employee | Modelo | Runs/mês | Tokens/run (est.) | Custo/mês (est.) |
|---|---|---|---|---|
| `orquestrador-condo` | Opus | ~60 | ~2.000 input + 500 output | ~$15 |
| `financeiro-condo` | Sonnet | ~15 | ~3.000 input + 1.000 output | ~$8 |
| `atendimento-condo` | Haiku | ~200 | ~500 input + 200 output | ~$3 |
| `manutencao-condo` | Sonnet | ~30 | ~2.500 input + 800 output | ~$10 |
| `assembleia-condo` | Sonnet | ~10 | ~4.000 input + 2.000 output | ~$6 |
| `docs-condo` | Sonnet | ~100 | ~1.500 input + 500 output | ~$8 |
| `compliance-condo` | Sonnet | ~12 | ~3.000 input + 1.000 output | ~$6 |
| `energia-condo` | Sonnet | ~10 | ~3.000 input + 1.000 output | ~$7 |
| `seguros-condo` | Sonnet | ~10 | ~3.000 input + 1.000 output | ~$7 |
| `comunicacao-condo` | Haiku | ~300 | ~300 input + 100 output | ~$2 |
| `importador-v2` | Opus | 1 (one-shot) | ~10.000 input + 3.000 output | ~$5 (único) |

**Total mensal fase piloto (5 edifícios): ~$72/mês**

**Nota**: o `importador-v2` é uso único (migração do V2 legacy). Excluindo-o, o custo recorrente é ~$67/mês.

**Escalabilidade**: o custo escala predominantemente com o número de edifícios e volume de pedidos, não linearmente com o número de employees (a maioria dos employees tem runs fixos por mês independentes do volume). Para 20 edifícios estima-se ~€180-220/mês. Para 50 edifícios ~€350-450/mês. O ARPU de administração de condomínios em Portugal é €15-30/fracção/mês — 50 edifícios com média de 20 fracções = ~€15.000-30.000/mês de receita. Custo LLM seria <2% da receita neste cenário.

**Alerta de custo**: configurar alertas no Anthropic Console para >$150/mês. Activar cache de prompts (Prompt Caching API) para os employees com contexto estático longo (financeiro-condo, compliance-condo) — pode reduzir custo em 30-40%.

---

## Consequências

### Positivas

- **Autonomia operacional real**: Mário deixa de fazer trabalho operacional. Os employees executam; Mário aprova excepções.
- **Rastro legal completo**: audit trail universal + registo de comunicações = prova de toda a actividade, relevante como TOC e administrador.
- **Escalabilidade linear de edifícios**: adicionar um edifício é registar em `core.imoveis` + migrar dados — nenhum employee precisa de ser reconfigurado.
- **Custo LLM previsível e baixo** relativamente à receita gerada.
- **Stack unificada**: tudo no V1 Core Hub. Não há nova plataforma de infra.

### Negativas / Riscos

- **Dependência da API Anthropic**: se a API falhar, os employees param. Mitigação: retry com backoff exponencial em cada Edge Function; alerts para Mário via Supabase Realtime se cron falhar.
- **Supabase Cron é produto relativamente novo**: sem retry automático nativo em caso de falha da Edge Function. Mitigação: cada Edge Function implementa idempotência (verificar se a acção já foi feita antes de a executar) e escreve resultado em `audit_log` mesmo em caso de erro.
- **Custo LLM pode escalar com bugs**: um loop ou edge case que cause muitas invocações inesperadas pode gerar custos. Mitigação: alerta Anthropic Console + rate limiting por employee na Edge Function.
- **V2 legacy permanece separado**: durante o período de transição, existe duplicação de dados entre V2 legacy e V2 AI-native. A migração via `importador-v2` resolve isto, mas requer validação cuidadosa edifício a edifício.

---

## Alternativas Consideradas

### Cron: Opção A (pg_cron SQL puro) — Rejeitada

Funcionalmente equivalente ao Supabase Cron mas sem UI. O Mário precisaria de acesso SQL para ver ou alterar schedules — incompatível com o perfil não-programador. O Supabase Cron é pg_cron com UI, não uma alternativa diferente.

### Cron: Opção C (CronCreate/Claude Code) — Rejeitada

Não é infra sempre-on. Depende de sessão Claude activa. Incompatível com requisito de autonomia operacional 24/7.

### Cron: Opção D (Vercel Cron) — Rejeitada

Adiciona plataforma externa desnecessária. Plano hobby insuficiente (2 jobs; projecto precisa de 9+). Autenticação HTTP extra entre Vercel e Supabase aumenta superfície de falha. Custo Pro Vercel adicional sem benefício face ao Supabase Cron nativo.

### Audit trail parcial (só financeiro) — Rejeitada

Lacunas no audit trail criam problemas legais e operacionais. O custo de escrever em `audit_log` é negligenciável (INSERT simples). O benefício de ter rastreabilidade completa supera largamente o overhead.

### Workspace switcher multi-tenant (vs. filtro por vertical) — Diferida para Year 2

Multi-tenancy real com isolamento de billing e subdomain por cliente (ex: administrador B com os seus próprios employees) é uma decisão correcta para Year 2 quando houver mais de 1 gestor usando a plataforma. Actualmente o único utilizador é o Mário. Ver ADR-010 D4 para fundamentação.

---

## Próximos Passos

1. **`supabase-designer`**: criar schema `v2_condominios.*` no V1 Core Hub — ver trigger activo em `.claude/state/triggers.md`. Incluir tabela `audit_log` conforme DDL acima.
2. **`supabase-designer`**: configurar Supabase Cron com os 9 schedules definidos neste ADR.
3. **`supabase-designer`**: criar schemas `v3_seguros.*` e `v4_energia.*` (ver trigger activo).
4. **`importador-v2`**: após schema criado, migrar 1 edifício piloto para validar dados.
5. **Mário**: activar alertas de custo no Anthropic Console (threshold: $150/mês).
6. **Mário**: configurar Prompt Caching nos employees Sonnet com contexto longo.

---

*ADR gerado por architect-proptech · 2026-05-05*
*Trigger: orquestrador-condo → architect-proptech (.claude/state/triggers.md)*
*Employees referenciados: .claude/employees/*-condo.md*
*Blueprint: .claude/strategy/command-centre-condo.md*
