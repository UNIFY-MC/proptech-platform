# DB Specialist Review — Phase 5

> **Workflow:** Brownfield Discovery · Phase 5 (DB Specialist Review)
> **Produzido por:** supabase-designer
> **Data:** 2026-05-23
> **Inputs:** technical-debt-DRAFT.md · SCHEMA.md · DB-AUDIT.md
> **Veredicto:** NEEDS REVISION

---

## Veredicto Geral

**NEEDS REVISION**

O draft captura correctamente as dívidas DB mais visíveis e a sua severidade está geralmente correcta. No entanto, existem **quatro problemas estruturais** que o architect deve corrigir antes do documento final:

1. Duas dívidas CRITICAL estão sub-estimadas no esforço real (DB-001 e DB-004 são XL, não M e L).
2. Seis dívidas DB relevantes não foram capturadas — três delas com impacto CRITICAL ou HIGH.
3. A dependência entre DB-002 (views SECURITY DEFINER) e DB-004 (RPCs SECURITY DEFINER) é mais forte do que o draft sugere — devem ser tratadas como um único programa de segurança, não em paralelo.
4. DB-012 foi classificado como LOW mas o risco de coupling cross-projecto é estruturalmente HIGH quando o cutover se aproxima.

---

## Por Debt (DB-001 a DB-012)

| ID | Original Severity | Revised Severity | Confirmada? | Esforço Original | Esforço Revisto | Nota |
|----|---|---|---|---|---|---|
| DB-001 | CRITICAL | CRITICAL | SIM | M | **XL** | Ver detalhe abaixo |
| DB-002 | CRITICAL | CRITICAL | SIM | M | **L** | Ver detalhe abaixo |
| DB-003 | CRITICAL | CRITICAL | SIM | L | **XL** | Ver detalhe abaixo |
| DB-004 | CRITICAL | CRITICAL | SIM | L | **XL** | Ver detalhe abaixo |
| DB-005 | HIGH | **CRITICAL** | SIM — severity revista | M | M | Ver detalhe abaixo |
| DB-006 | HIGH | HIGH | SIM | S+M | S+M | Confirmado |
| DB-007 | HIGH | HIGH | SIM | M | M | Confirmado — dependente de ARCH-002 |
| DB-008 | MEDIUM | MEDIUM | SIM | S+M | S+M | Confirmado — V2 produção: dupla aprovação |
| DB-009 | MEDIUM | MEDIUM | SIM | M | M | Confirmado mas ver nota sobre sequência |
| DB-010 | MEDIUM | MEDIUM | SIM | S | S | Confirmado — decisão simples, não bloqueante |
| DB-011 | MEDIUM | MEDIUM | SIM | S | S | Confirmado — quick win válido |
| DB-012 | LOW | **HIGH** | REJEITADO — severity revista | S | M | Ver detalhe abaixo |

---

## Detalhe por Debt Revisto

### DB-001 — Tabelas sem RLS (Esforço M → XL)

O draft estima M baseado em "activar RLS + policy mínima em 22 tabelas". A realidade é mais complexa:

- Das 14 tabelas V1 sem RLS, pelo menos 9 são `system.*` (motor agentic em uso activo). Activar RLS com `USING (false)` nestas tabelas vai quebrar imediatamente todas as Edge Functions que chamam `system.*` directamente via client anon ou sem service_role explícito. Antes de activar RLS, é necessário auditar cada Edge Function que lê estas tabelas e confirmar que usa service_role (não anon_key).
- As 8 tabelas V2 sem RLS estão em produção real. Qualquer policy errada em `configuracoes` ou `envios_log` pode quebrar funcionalidades existentes. Requer testes em staging antes de produção.
- `core.codigos_postais` (205 817 rows, RLS activo mas zero policies = deny total) deve ser tratada em conjunto com DB-001. Se há queries authenticated que precisam de ler códigos postais, estão a falhar silenciosamente agora.

**Esforço real:** XL (2–3 semanas para auditar + implementar + testar sem quebrar produção).

**Nota adicional:** O draft diz "a maioria pode ser `USING (false)` ou `USING (is_staff())`". Discordo — `system.*` precisa de `service_role` bypass, não de policies `authenticated`. Usar `USING (is_staff())` em tabelas do motor agentic cria risco de o swarm não conseguir escrever em runtime.

---

### DB-002 — Vistas SECURITY DEFINER (Esforço M → L)

O draft subestima o impacto do "teste de regressão por view". Com 40 vistas:

- Cada vista SECURITY DEFINER existe porque algo depende dela a correr com privilégios elevados. Converter para SECURITY INVOKER sem perceber esse "algo" vai quebrar queries.
- As vistas CRM Attio (`core.list_records`, `core.get_activity_timeline`) têm 208 invocações registadas (`core.ask_property007_intent` — 208 instâncias anon/authenticated). Mesmo que essa contagem seja de uma RPC e não das vistas, indica actividade real.
- Requer: (1) inventário de quem chama cada vista, (2) teste de conversão em ambiente isolado, (3) deploy incremental.

**Esforço real:** L (1–2 semanas com metodologia incremental).

---

### DB-003 — 215 Migrations sem ficheiro SQL (Esforço L → XL)

O draft propõe `supabase db dump` como solução. Importante corrigir esta assumpção:

- `supabase db dump` produz um dump do schema actual, **não** as migrations individuais. O resultado seria um ficheiro monolítico que não representa o histórico de alterações — não resolve a rastreabilidade.
- A solução correcta é `supabase migration new` + reconstrução de cada migration a partir do diff entre estados. Para 215 migrations, isso é impraticável literalmente.
- **Abordagem viável:** criar uma única migration "snapshot" que representa o estado actual (via `pg_dump --schema-only`), marcá-la como baseline, e aplicar todas as novas migrations com ficheiro local a partir daí. O histórico pre-baseline fica documentado em nota — não é recuperável sem logs do Supabase Dashboard.
- Adicionalmente: os 5 ficheiros locais com naming divergente (ex: `20260513_iam_schema.sql` vs remote `20260512162753`) criam risco de re-aplicação dupla se alguém fizer `supabase db push` — devem ser reconciliados ou eliminados.

**Esforço real:** XL (criar baseline snapshot + estabelecer processo de ficheiro-primeiro para todas as migrations futuras + reconciliar os 5 ficheiros divergentes).

---

### DB-004 — 106+112 RPCs SECURITY DEFINER (Esforço L → XL)

O draft agrupa as 218 funções como se fossem homogéneas. A análise por categoria é muito diferente:

- **62 funções com `search_path` mutável** — estas são o risco mais imediato. Um atacante que consiga injectar uma função no search_path pode executar código arbitrário com privilégios de `postgres`. Fix simples: `SET search_path = schema_name` em cada função. Mas com 62 funções, é trabalho mecânico mas extenso.
- **106 funções acessíveis por `anon`** — a maioria destas são provavelmente funções de uso público legítimo (ex: `core.ask_property007_intent` que tem 208 chamadas). Revogar `anon` em bloco vai quebrar funcionalidades. Requer análise função a função.
- **112 funções acessíveis por `authenticated`** — menor risco (o utilizador já está autenticado), mas funções que cruzam schemas com SECURITY DEFINER podem escalar privilégios.
- A presença de `swarm_claim_next_niche` (SELECT FOR UPDATE SKIP LOCKED) como SECURITY DEFINER é correcta para evitar race conditions — mas deve ser auditada para confirmar que não expõe dados de outros schemas.

**Esforço real:** XL (3–4 semanas de auditoria sistemática — não se pode fazer em bloco sem risco de quebrar produção).

---

### DB-005 — Schema `v1_owners_club` (Severity HIGH → CRITICAL)

O draft classifica como HIGH. Rejeito — deve ser CRITICAL por razão técnica específica:

- Em PostgreSQL, `ALTER SCHEMA ... RENAME` **invalida todas as funções e views que referenciam o schema pelo nome**. Com um schema chamado `v1_owners_club` que tem FKs ou referências implícitas em outras tabelas/funções, o rename vai quebrar essas referências em silêncio (funções ficam "invalid" no pg_proc).
- Com 6 rows e 3 tabelas, o impacto de dados é baixo — mas o rename é uma operação de risco médio-alto em produção porque requer auditoria de todas as dependências antes de executar.
- O naming `v1_owners_club` pode estar a confundir queries de agentes que fazem `information_schema.tables WHERE table_schema LIKE 'v1%'` — o que pode incluir este schema em operações V1 Core Hub erroneamente.

**Migration a preparar (antes de executar):**
```sql
-- Passo 1: auditar dependências
SELECT routine_schema, routine_name, routine_definition
FROM information_schema.routines
WHERE routine_definition ILIKE '%v1_owners_club%';

SELECT viewname, definition
FROM pg_views
WHERE definition ILIKE '%v1_owners_club%';

-- Só depois de confirmar zero dependências:
-- ALTER SCHEMA v1_owners_club RENAME TO v10_owners_club;
```

---

### DB-012 — `v2-legacy-bridge-cron` (Severity LOW → HIGH)

O draft classifica como LOW porque "faz parte do plano de cutover". Discordo da severidade por razão estrutural:

- A bridge cron cria uma **dependência em tempo real de V1 para V2 produção** (`eozklslwfaqujaijvdnl`). Se V2 tiver uma janela de manutenção, ou se as RLS policies de V2 mudarem (o que acontece com double-approval), a bridge falha silenciosamente — sem alertas, sem monitoring documentado.
- O draft menciona "adicionar alerta de falha da cron" como esforço S. Mas o risco real é que os dados em `v2_new` ficam desactualizados sem qualquer notificação, e o cutover (fase F do ADR-V2-003) pode acontecer com dados stale sem que ninguém perceba.
- Com 7+ branches sprint não mergeadas (OPS-004), qualquer desenvolvimento em `v2_new` que dependa de dados actualizados está a correr sobre dados potencialmente desactualizados.

**Esforço revisto:** M (implementar monitoring + alertas de falha + documentar SLA de freshness dos dados em `v2_new`).

---

## Debts em Falta — Adicionar ao Draft

### DB-013 · `auth_rls_initplan` em 38 policies V1 · HIGH (NOVO)

**Área:** Database / Performance
**Descrição:** O advisor reporta 38 policies em V1 com `auth.<function>()` (ex: `auth.uid()`, `auth.role()`) avaliado por row, não uma vez por query. Isto é o equivalente a fazer um sub-SELECT em cada linha da tabela — em tabelas com muitas rows, é degradação de performance garantida. Em V2, 5 casos foram corrigidos (3 persistem). Em V1 com 38 casos e tabelas como `core.pessoas` (79 rows — por agora) ou `core.recebimentos` (525 rows), o impacto cresce linearmente com os dados.

**Impacto:** Performance de queries RLS pode ser 10–100x mais lenta em tabelas críticas do CRM conforme os dados crescem. O advisor classifica como WARN mas em produção com volume é ERROR funcional.

**Esforço:** M (substituir `auth.uid()` por `(select auth.uid())` nas 38 policies — fix mecânico mas requer teste)

**Migration exemplo:**
```sql
-- Antes (reavaliado por row):
CREATE POLICY "owner_only" ON core.pessoas
  FOR ALL USING (auth.uid() = user_id);

-- Depois (avaliado uma vez por query):
CREATE POLICY "owner_only" ON core.pessoas
  FOR ALL USING ((select auth.uid()) = user_id);
```

**Dependências:** Pode ser feito em paralelo com DB-001.

---

### DB-014 · 110 Foreign Keys sem índice em V1 · HIGH (NOVO)

**Área:** Database / Performance
**Descrição:** O advisor reporta 110 FKs sem índice de cobertura em V1. O draft menciona apenas os 9 casos em V2 (já capturados em DB-AUDIT.md). Os 110 casos em V1 não aparecem como dívida DB numerada no draft — estão mencionados no DB-AUDIT mas sem ID de debt. Com 217 tabelas e o schema `system` a crescer de 3 para 34 tabelas, FKs sem índice causam:

- Slow DELETE em cascade: PostgreSQL faz sequential scan na tabela filha para encontrar rows referenciadas.
- Slow JOIN em queries cross-schema (ex: `v5_manutencao JOIN core.pessoas`).
- Lock contention em deletes concorrentes.

**Impacto:** Degradação progressiva em operações de escrita e JOIN. Com 110 FKs afectadas e schemas em crescimento, o impacto vai piorar.

**Esforço:** L (criação de índices em batch — pode ser feito `CONCURRENTLY` sem downtime, mas requer análise para não duplicar índices existentes nos 341 unused)

**Migration exemplo:**
```sql
-- Padrão para cada FK sem índice identificada:
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_<tabela>_<coluna>_fk
  ON <schema>.<tabela> (<coluna_fk>);
```

**Nota importante:** Devem ser criados DEPOIS da limpeza dos 341 índices não utilizados (DB-009) para não duplicar trabalho e não mascarar o problema de over-indexing.

**Dependências:** DB-009 deve preceder (ou ser paralelo cuidadosamente).

---

### DB-015 · 149 `multiple_permissive_policies` em V1 · HIGH (NOVO)

**Área:** Database / Performance e Segurança
**Descrição:** 149 policies "permissivas múltiplas" em V1 (advisor WARN). Quando uma tabela tem múltiplas policies permissivas para o mesmo role, PostgreSQL avalia TODAS elas com OR lógico — o utilizador tem acesso se qualquer uma passar. O impacto é duplo:

1. **Performance:** Cada query avalia N policies em vez de 1. Com 149 casos, queries RLS têm overhead proporcional.
2. **Segurança:** Se uma policy foi criada "temporariamente" e esquecida, pode dar acesso não intencional.

O draft menciona este número no DB-AUDIT mas não o trata como dívida DB numerada. As tabelas `marketing.*` e `system.*` são as mais afectadas (ver DB-AUDIT secção `rls_policy_always_true`).

**Esforço:** M (auditar policies por tabela, consolidar onde possível, eliminar duplicados ou policies always_true)

**Dependências:** DB-001 (alguns casos são tabelas que precisam de RLS revisto em conjunto).

---

### DB-016 · PostgREST schema exposure não verificada para `iam` e `v2_new` · MEDIUM (NOVO)

**Área:** Database / Configuração / Fiabilidade
**Descrição:** O DB-AUDIT documenta (secção "Schemas custom expostos") que a fonte de verdade real é `pg_roles.rolconfig` da role `authenticator`, e que Dashboard UI e Management API "mentem" (ADR-V2-002). Com 3 schemas novos criados desde a baseline (`iam`, `marketing`, `v2_new`), não existe confirmação de que estão expostos via PostgREST. Se `iam.*` não estiver exposto, as RPCs `iam.has_permission()` e `iam.get_my_permissions()` falham para chamadas REST de frontend — silenciosamente, produzindo 404 ou PGRST106. Dado que o schema IAM é usado como guard RLS cross-vertical (ADR-013), uma falha aqui afecta TODAS as verticais.

**Acção de diagnóstico (read-only, sem risco):**
```sql
SELECT rolconfig FROM pg_roles WHERE rolname = 'authenticator';
```
O resultado deve incluir `pgrst.db_schemas` com todos os schemas necessários.

**Esforço:** S (verificar + executar ALTER ROLE se necessário — procedimento documentado em ADR-V2-002)

**Dependências:** Bloqueia correcto funcionamento de IAM em REST.

---

### DB-017 · Extensões `pg_net` e `http` ambas instaladas em `public` · MEDIUM (NOVO)

**Área:** Database / Segurança / Conformidade
**Descrição:** O advisor assinala `pg_net`, `unaccent`, e `http` como `extension_in_public` (WARN). O problema específico de ter `pg_net` e `http` em `public` é que funções no schema `public` com SECURITY DEFINER podem invocar HTTP calls externas com os privilégios do owner. Qualquer role `authenticated` que tenha EXECUTE numa função `public.*` que usa `pg_net` pode potencialmente fazer exfiltração de dados via webhook. O draft não capturou esta dívida como item específico.

**Esforço:** M (mover extensões para schema `extensions` — requer testar que todas as funções que as usam continuam a funcionar com search_path correcto)

**Dependências:** DB-004 (search_path fixes) deve ser feito em conjunto.

---

### DB-018 · `core.codigos_postais` (205 817 rows) com deny total — queries a falhar silenciosamente · MEDIUM (NOVO)

**Área:** Database / Funcionalidade / RLS
**Descrição:** `core.codigos_postais` tem RLS activo mas zero policies (deny total implícito). O advisor reporta `rls_enabled_no_policy` para esta tabela. Com 205 817 rows de dados de códigos postais que são necessários para autocomplete de moradas e validação de endereços, qualquer query de `authenticated` a esta tabela retorna 0 rows (não um erro — RLS deny silencioso). Se alguma funcionalidade de V4 Energia (contratos com morada) ou V5 Manutenção (serviços por localização) depende de validar códigos postais via REST, está a falhar silenciosamente agora.

**Acção:** Confirmar se existe alguma RPC ou view que exponha `codigos_postais` via `service_role` para contornar o deny. Se não existir, criar policy de leitura pública:
```sql
-- Opção A: leitura pública (tabela de referência, sem dados pessoais)
CREATE POLICY "public_read" ON core.codigos_postais
  FOR SELECT USING (true);
-- Justificação: dados de referência geográfica sem PII

-- Opção B: apenas service_role (já é o comportamento actual via deny)
-- Neste caso, criar RPC SECURITY DEFINER para exposição controlada
```

**Esforço:** S (decisão + migration simples)

**Dependências:** —

---

## Top 3 Remediations Prioritárias

### #1 — DB-004 + DB-002: Programa de Segurança SECURITY DEFINER (CRITICAL, XL)

Estas duas dívidas devem ser tratadas como um único programa, não em paralelo independente. A razão: resolver DB-002 (vistas) sem resolver DB-004 (funções) deixa a superfície de ataque quase intacta. E resolver DB-004 sem DB-002 pode quebrar vistas que dependem de funções SECURITY DEFINER.

**Fase 1 — Fix imediato de baixo risco (search_path):**
```sql
-- Para cada função com search_path mutável (62 casos):
-- Exemplo para core.dedup_check_pessoa:
ALTER FUNCTION core.dedup_check_pessoa(...)
  SET search_path = core, public, extensions;

-- Para todas as funções SECURITY DEFINER, adicionar:
-- SET search_path = <schema_da_funcao>, extensions;
-- Isto elimina o risco de injection sem quebrar funcionalidade.
```

**Fase 2 — Revogação selectiva de anon (por categoria):**
```sql
-- Para funções que não precisam de acesso anon:
REVOKE EXECUTE ON FUNCTION <schema>.<funcao>(<args>) FROM anon;

-- Manter apenas funções explicitamente públicas:
-- core.ask_property007_intent (uso documentado)
-- iam.portal_token_login (login de condóminos)
-- v5_manutencao funções de magic_link (uso legítimo anon)
```

**Fase 3 — Converter vistas para SECURITY INVOKER:**
```sql
-- Para cada vista identificada como não-critica:
CREATE OR REPLACE VIEW core.v_pessoas_activas
  WITH (security_invoker = true) AS
  SELECT ... FROM core.pessoas WHERE ...;
-- Nota: só disponível em Postgres 15+ (Supabase usa 15.x — confirmar)
```

**Rollback plan:** Qualquer alteração de REVOKE pode ser revertida com GRANT EXECUTE imediatamente. Para vistas, manter a versão SECURITY DEFINER em comentário SQL antes de substituir.

---

### #2 — DB-001: Activar RLS sem quebrar Edge Functions (CRITICAL, XL)

**Abordagem recomendada (diferente do draft):**

Não usar `USING (false)` nem `USING (is_staff())` como primeira opção para tabelas `system.*`. A abordagem correcta para tabelas do motor agentic é confirmar que **todas as Edge Functions que as usam passam pelo service_role client**, e depois activar RLS com deny-by-default (sem policies = deny):

```sql
-- Passo 1: Para tabelas system.* usadas exclusivamente por Edge Functions:
ALTER TABLE system.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.useful_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.swarm_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.niche_icp_cards ENABLE ROW LEVEL SECURITY;
-- Sem policies = service_role bypass automático, anon/authenticated negado

-- Passo 2: Para tabelas public.* backup (dropar, não proteger):
-- public.servicos_backup_20260423 → candidata a DROP TABLE
-- public.categorias_backup_20260423 → candidata a DROP TABLE
-- public.subcategorias_backup_20260423 → candidata a DROP TABLE

-- Passo 3: Para public.file_deploy e public.frequency_templates:
ALTER TABLE public.file_deploy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_public" ON public.file_deploy
  FOR ALL USING (false);
-- Justificação: tabela de infra interna, nunca deve ser acessível via REST

ALTER TABLE public.frequency_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.frequency_templates
  FOR SELECT USING (auth.role() = 'authenticated');
-- Justificação: templates são dados de referência para utilizadores autenticados
```

**Antes de activar RLS em system.*:** Fazer grep de todas as Edge Functions por `supabase.from('system.')` sem `serviceRoleKey` — qualquer hit é um break potencial.

**Rollback plan:** `ALTER TABLE <tabela> DISABLE ROW LEVEL SECURITY;` — reversível instantaneamente.

---

### #3 — DB-003: Baseline Migration Snapshot (CRITICAL, XL)

**Abordagem viável (correcção ao draft):**

```sql
-- ESTA ABORDAGEM NÃO É EXECUTAR EM SUPABASE —
-- é o procedimento para o supabase-designer coordenar com o architect.

-- Passo 1: Exportar schema actual como baseline
-- (a executar via supabase CLI, não via MCP apply_migration):
-- supabase db dump --schema-only -f supabase/migrations/20260523000000_baseline_snapshot.sql

-- Passo 2: Marcar no Supabase que esta migration representa o baseline
-- (inserir na tabela supabase_migrations com nota)
-- INSERT INTO supabase_migrations.schema_migrations(version, name)
-- VALUES ('20260523000000', 'baseline_snapshot_brownfield_phase5');

-- Passo 3: Reconciliar os 5 ficheiros locais divergentes
-- Renomear ou eliminar ficheiros locais cujos nomes não correspondem ao remoto
-- Documentar em CLAUDE.md que o git-history pré-baseline não é recuperável

-- Passo 4: Estabelecer regra no processo:
-- TODA migration futura = ficheiro local PRIMEIRO, apply_migration DEPOIS
-- Nunca o inverso.
```

**Rollback plan:** Não se aplica — é operação de documentação, não de alteração de schema. O snapshot não muda nada em produção.

---

## Recomendação para Phase 8 (Documento Final)

O architect deve incorporar as seguintes alterações antes de emitir o documento final:

### Revisões de severity/esforço obrigatórias

1. **DB-001:** Esforço M → XL. Acrescentar nota sobre risco de quebrar Edge Functions em `system.*` e necessidade de auditoria prévia. Remover recomendação de `USING (is_staff())` para tabelas agentic.

2. **DB-003:** Esforço L → XL. Corrigir descrição: `supabase db dump` não resolve rastreabilidade. A solução correcta é baseline snapshot + processo forward-only documentado. Acrescentar risco dos 5 ficheiros locais divergentes que podem causar re-aplicação dupla.

3. **DB-004:** Esforço L → XL. Acrescentar categorização das 218 funções (62 search_path + 106 anon + 112 authenticated) com estratégias distintas por categoria. Remover sugestão de "converter para SECURITY INVOKER onde adequado" sem primeiro resolver search_path.

4. **DB-005:** Severity HIGH → CRITICAL. Acrescentar aviso sobre `ALTER SCHEMA RENAME` e invalidação de dependências. Acrescentar query de diagnóstico de dependências obrigatória antes do rename.

5. **DB-012:** Severity LOW → HIGH. Justificação: dependência cross-projecto sem monitoring em contexto de cutover iminente é risco estrutural, não operacional menor.

### Dívidas novas a adicionar (DB-013 a DB-018)

- **DB-013** (HIGH): `auth_rls_initplan` em 38 policies V1 — performance RLS.
- **DB-014** (HIGH): 110 FKs sem índice em V1 — omitida do draft, impacto crescente.
- **DB-015** (HIGH): 149 multiple_permissive_policies — performance + segurança.
- **DB-016** (MEDIUM): PostgREST schema exposure não verificada para `iam` e `v2_new`.
- **DB-017** (MEDIUM): `pg_net` e `http` em schema `public` — risco de exfiltração.
- **DB-018** (MEDIUM): `core.codigos_postais` deny total a provocar falhas silenciosas.

### Revisão do Sumário Quantitativo

Com as revisões de severity e as 6 dívidas novas, a contagem de Database muda:

| Severity | Draft (DB) | Revisto (DB) | Delta |
|----------|-----------|--------------|-------|
| CRITICAL | 4 | 5 (+DB-005) | +1 |
| HIGH | 3 | 6 (+DB-013, DB-014, DB-015, DB-012 reclassificado) | +3 |
| MEDIUM | 5 | 7 (+DB-016, DB-017, DB-018) | +2 |
| LOW | 1 | 0 (DB-012 reclassificado) | -1 |
| **Total** | **13** | **18** | **+5** |

### Revisão das Dependências entre DB debts

O draft apresenta as dívidas DB como relativamente independentes. A sequência correcta é:

```
DB-009 (limpar índices unused)
  → DB-014 (criar índices FK em falta)

DB-016 (verificar PostgREST exposure)
  → Deve ser feito PRIMEIRO (pre-requisito para tudo o resto funcionar via REST)

DB-001 (activar RLS)
  → DB-013 (corrigir initplan nas policies criadas)
  → DB-015 (consolidar multiple permissive policies)

DB-004 (search_path fix) + DB-017 (mover extensões)
  → Devem ser coordenados (funções que usam pg_net/http precisam de search_path actualizado)

DB-004 + DB-002
  → Programa conjunto (não paralelo independente)

DB-005 (rename schema)
  → Deve ser o ÚLTIMO dos critical (muitas dependências potenciais)
```

---

*Produzido por supabase-designer · 2026-05-23 · Brownfield Discovery Phase 5*
*Veredicto: NEEDS REVISION — 5 revisões obrigatórias + 6 dívidas novas*
*Próximo: Phase 6 — UX Specialist Review (aiox-ux valida secção Frontend)*
