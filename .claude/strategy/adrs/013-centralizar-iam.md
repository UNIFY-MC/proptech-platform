# ADR-013 — Centralização IAM em schema `iam`

> **Data:** 2026-05-13
> **Estado:** Aceite (Mário aprovou plano `verifica-o-projeto-v2-zippy-flask.md` §3 P1 + §4)
> **Owner:** Mário Carvalho
> **Branch:** `feat/iam-centralization`
> **Plano-mãe:** [verifica-o-projeto-v2-zippy-flask.md](../../plans/verifica-o-projeto-v2-zippy-flask.md)

---

## Contexto

PropTech Platform tem 6 apps em construção (V2 Condomínios PROD, V5 Manutenção PROD, V4 Energia em construção, dashboard, V3/V6/V7/V8 futuras). Cada vertical estava prestes a inventar o seu próprio modelo de permissões:

- **V2 Condomínios** criou `v2_condominios.permission_groups` + `permission_grants` + `staff_login_aliases` + `activity_logs` + `portal_tokens` (Fase G da Sprint V2)
- **V5 Manutenção** usa `core.staff_roles` directamente em RLS policies — modelo binário (admin/support/readonly)
- **V3 Seguros** (a criar) iria inventar 3ª versão se nada mudasse

Resultado actual: **login bossmc/MCpratas funciona em V2** mas para fazer V5 ou V4 reconhecerem o mesmo utilizador é preciso replicar lógica. Cada vertical tem matriz de permissões própria → custo operacional cresce N×verticais.

## Decisão

Criar schema **`iam`** (Identity and Access Management) em V1 Core Hub `hkmvszkpxjbxmnixzqbl` como **fonte única** para identidade + permissões cross-vertical.

### Tabelas a migrar de `v2_condominios.*` → `iam.*`

| Origem | Destino | Notas |
|---|---|---|
| `v2_condominios.permission_groups` | `iam.permission_groups` | 4 grupos (condomino, operacional, administrador, developer) — seed igual |
| `v2_condominios.portal_sections` | `iam.permission_sections` | Renomeado para clareza. 14 secções V2 + acrescentar prefixo vertical (ex: `v2.fracoes`, `v5.ordens`, `v4.simulador`) |
| `v2_condominios.permission_grants` | `iam.permission_grants` | Mantém estrutura (group_code + section_code + 4 booleans can_*) |
| `v2_condominios.staff_login_aliases` | `iam.staff_login_aliases` | `bossmc`, `mario`, `admin` aliases |
| `v2_condominios.portal_tokens` | `iam.portal_tokens` | 62 condóminos com tokens UUID |
| `v2_condominios.activity_logs` | `iam.activity_logs` | Log unificado para todas as verticais |
| `v2_condominios.kpis_ano_fechado` | (fica em v2 — domain logic V2) | — |
| `v2_condominios.kpis_detalhe` | (fica em v2 — domain logic V2) | — |

### RPCs a criar/mover

```sql
iam.has_permission(p_section text, p_action text) RETURNS boolean
iam.get_my_permissions() RETURNS jsonb
iam.set_permission_grant(p_group, p_section, p_action, p_value) RETURNS boolean
iam.staff_login_lookup(p_alias) RETURNS jsonb
iam.portal_token_login(p_token uuid) RETURNS jsonb
iam.log_activity(p_tipo, p_detalhe, p_resultado, p_origem, p_extra) RETURNS bigint
```

As versões em `v2_condominios.*` ficam como **proxies** que delegam para `iam.*` durante 1 sprint (dual-mode) e depois são removidas.

### Naming convention para secções cross-vertical

Padrão: `<prefixo_vertical>.<seccao_slug>`

Exemplos:
- `v2.prestacao_contas`, `v2.fracoes`, `v2.condominos`, `v2.recebimentos`, `v2.bancos`, `v2.faturas`, `v2.documentos`, `v2.mora`, `v2.assembleias`, `v2.seguros`, `v2.energia`, `v2.permissoes`
- `v5.catalogo`, `v5.ordens`, `v5.prestadores`, `v5.subscricoes`
- `v4.simulador`, `v4.leads`, `v4.contratos`
- `marketing.leads`, `marketing.campanhas`
- `system.inbox`, `system.approvals`

Vantagem: matrix `iam.permission_grants` mostra TODAS as verticais num só sítio, ordenado por prefixo.

### Auth flow unificado

1. User entra em qualquer app (`v2-condominios`, `v5-manutencao`, `v4-energia`, `dashboard`)
2. Supabase Auth devolve JWT
3. App chama `iam.get_my_permissions()` → recebe `{ "v2.fracoes": {view:true,edit:true,...}, "v5.ordens": {...} }`
4. App esconde/mostra secções conforme permissões
5. Cada acção sensível chama `iam.has_permission('v5.ordens', 'edit')` server-side

### RLS unificada

Helper SQL function `iam.user_can(section, action)`:
```sql
CREATE FUNCTION iam.user_can(p_section text, p_action text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT iam.has_permission(p_section, p_action);
$$;
```

RLS policies em qualquer vertical:
```sql
CREATE POLICY frac_read ON v2_condominios.fracoes
  FOR SELECT TO authenticated
  USING (iam.user_can('v2.fracoes', 'view'));
```

## Consequências

**Positivas:**
- V3 Seguros nasce já com permissões em `iam.*` (zero duplicação)
- Equipa interna gere TUDO numa só matriz visual em `dashboard /permissoes`
- Logs centralizados em `iam.activity_logs` → audit trail unificado
- RLS consistente entre verticais (1 helper, N tabelas)
- `bossmc` continua a funcionar em V2 sem disrupção

**Negativas / trade-offs:**
- 1 sprint de dual-write (V2 produção escreve em `v2_condominios.*` E `iam.*` simultaneamente)
- RPCs `v2_condominios.has_permission()` etc. tornam-se proxies — pequena overhead
- 6 tabelas a migrar — Backfill ~150 rows (4 groups + 14 sections + 43 grants + 3 aliases + 62 tokens + 50 logs)

## Alternativas consideradas

1. **`auth` schema** — Supabase reserva esse nome (auth.users). Rejeitado.
2. **`permissoes` (PT)** — menos claro internacionalmente, e cria padrão para outros schemas em PT (`utilizadores`, `categorias`) que misturava com convenção Postgres maioritariamente EN. Rejeitado.
3. **Manter dispersos por vertical** — V3 inventava modelo próprio. Cross-sell V2↔V5↔V10 impraticável sem identidade unificada. **Rejeitado pelo plano-mãe.**
4. **Auth0 / Clerk externo** — vendor lock-in, $$$ por user, sem RLS Postgres nativa. Rejeitado.

## Execução

### Sprint A.1 — Schema + RPCs + backfill (esta sprint)

1. ✅ Criar branch `feat/iam-centralization`
2. ⏳ Migration `2026XXXX_iam_schema.sql` (cria schema + 6 tabelas + 6 RPCs + RLS)
3. ⏳ Backfill: `INSERT INTO iam.* SELECT * FROM v2_condominios.*` (data idêntica)
4. ⏳ Update RPCs `v2_condominios.*_perm*` → delegate para `iam.*`
5. ⏳ Smoke test: login `bossmc/MCpratas` continua a funcionar via novo path

### Sprint A.2 — Frontend V2 lê de `iam.*`

1. `apps/v2-condominios/src/views/Permissoes.jsx` → `v2Client.schema('iam').from(...)`
2. `@proptech/auth` exporta hook `usePermission(section, action)`
3. Build + smoke test V2

### Sprint A.3 — V5 adopta `iam`

1. `apps/v5-manutencao/src/lib/auth.js` → `iam.has_permission`
2. Inserir secções V5 em `iam.permission_sections` (`v5.catalogo`, `v5.ordens`, `v5.prestadores`, `v5.subscricoes`)
3. Migrar RLS policies V5 para usar `iam.user_can(...)`

### Sprint A.4 — V3/V4 nascem em `iam`

1. `vertical-builder` agent atualizado com checklist: usar `iam` desde linha 1
2. V3 Seguros (a criar) regista secções em `iam.permission_sections` ao bootstrap

## Verificação end-to-end

Quando Sprint A.4 terminar:

1. **Login `bossmc/MCpratas`** em V2, V5, V4 — todos reconhecem ✅
2. **Dashboard `/permissoes`** mostra matriz com prefixo (v2.* / v5.* / v4.*) ✅
3. **`v2_condominios.permission_groups` tem TRIGGER** que escreve também em `iam.permission_groups` (dual-write) ✅
4. **V3 nasce com `INSERT INTO iam.permission_sections` em vez de criar schema próprio** ✅
5. **RLS policy `v5.ordens_trabalho`** delega para `iam.user_can('v5.ordens', 'view')` ✅

## Cross-impact

- **V2 Condomínios** (PROD): 0 downtime. UI continua a funcionar; dual-write durante 1 sprint.
- **V5 Manutenção**: refactor das RLS policies — risco médio, mitigado por testes E2E.
- **V4 Energia**: passa a usar `iam` para `simulador`/`leads` (antes não tinha permissões — passa a ter).
- **V3 Seguros** (futura): blueprint pronta — `vertical-builder` agent saberá usar.
- **Dashboard**: vista `/permissoes` cross-vertical (antes só V2).

## Próximos ADRs encadeados

- **ADR-014** — Centralização Billing (`core.subscricoes`, `core.faturas`, `core.recebimentos`)
- **ADR-015** — Schema `marketing` (CRM + cross-sell rules)
- **ADR-016** — `system.agent_runs` + `system.agent_policies` (Agentic Ops cross-vertical)
