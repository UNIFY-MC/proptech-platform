# ADR-016 — Schema `dashboard` para o Dashboard Next.js Standalone

> **Data:** 2026-07-01
> **Estado:** Proposto (aguarda validação do Mário antes de qualquer migration)
> **Owner:** Mário Carvalho
> **Branch:** a criar — `feat/dashboard-nextjs`
> **Depende de:** ADR-013 (`iam`), ADR-014 (`core`), ADR-015 (`marketing`/`growth`), ADR-V2-002 (PostgREST rolconfig)

---

## Contexto

O dashboard V1 (`apps/dashboard/`, Vite + JavaScript) vai ser replicado num projecto standalone Next.js + TypeScript que aponta ao V1 Core Hub (`hkmvszkpxjbxmnixzqbl`). A estratégia de migração escolhida é **schema novo com views de transição**: a app nova lê dados reais desde o dia 1 via views sobre os schemas existentes (`system`, `core`, `growth`/`marketing`, `public`/`cookai_*`), convertendo view → tabela módulo a módulo ao longo de sprints seguintes.

Esta abordagem exige criar um schema dedicado para alojar:
1. Views de transição (aliases limpas sobre schemas existentes)
2. Tabelas novas específicas do dashboard (preferências UI, saved filters, widget layout)
3. RPCs/funções utilitárias do dashboard que agregam dados cross-schema

A decisão de naming deste schema é o objecto deste ADR.

---

## Decisão

O schema chama-se **`dashboard`**.

### Justificação

A convenção canónica da plataforma (Opção C, confirmada nos ADRs 013/014/015) distingue dois tipos de schemas em V1 Core Hub:

| Tipo | Padrão | Exemplos existentes |
|---|---|---|
| **Verticais de negócio** | `vN_<nome>` | `v2_condominios`, `v3_seguros`, `v4_energia`, `v5_manutencao` |
| **Transversais funcionais** | nome simples, sem prefixo | `core`, `iam`, `system`, `marketing` |

O schema do dashboard é **transversal funcional**: serve a camada de apresentação do hub central, agrega dados de múltiplas verticais, e não representa um produto vendável individualmente. Segue exactamente o padrão dos schemas `system` e `marketing`.

O candidato `v1_dashboard` foi rejeitado (ver Alternativas).

### Estrutura interna do schema `dashboard`

Tabelas previstas (a confirmar em ADR de execução / `supabase-designer`):

```
dashboard.widget_layouts    — configuração por utilizador de widgets no ecrã
dashboard.saved_filters     — filtros guardados por utilizador
dashboard.notifications     — inbox de notificações do hub (complementa system.inbox_items)
```

Views de transição (exemplos — lista completa a definir em sprint de implementação):

```sql
-- Vista sobre system.inbox_items (sem transformação — alias limpo)
CREATE VIEW dashboard.inbox AS
  SELECT * FROM system.inbox_items;

-- Vista sobre growth.leads + growth.oportunidades (agregação)
CREATE VIEW dashboard.funil_resumo AS
  SELECT vertical, count(*) as leads, ...
  FROM growth.leads GROUP BY vertical;

-- Vista sobre core.pessoas + core.servicos_ativos
CREATE VIEW dashboard.clientes_activos AS
  SELECT p.id, p.nome, p.email, count(sa.id) as servicos
  FROM core.pessoas p
  LEFT JOIN core.servicos_ativos sa ON sa.pessoa_id = p.id
  GROUP BY p.id;
```

---

## Consequências

### Positivas

- Naming coerente com convenção canónica (`core`, `iam`, `system`, `marketing`, **`dashboard``)
- App Next.js arranca a ler dados reais imediatamente via views — sem esperar migrações de dados
- Views de transição isolam a app de mudanças internas nos schemas fonte
- Tabelas específicas do dashboard ficam separadas do domínio de negócio (`core`, `system`)
- Conversão gradual view → tabela feita módulo a módulo sem disrupção

### Negativas / Trade-offs

- Schema adicional a expor no PostgREST (ver Riscos abaixo)
- Views sobre schemas com RLS têm comportamento que exige atenção (ver Riscos)
- Nome `dashboard` é genérico — se a plataforma tiver dashboards por vertical no futuro, o naming pode colidir (mitigação: schemas de dashboard por vertical seguiriam padrão `v2_dashboard`, `v3_dashboard` — o schema transversal mantém `dashboard` simples)

---

## Alternativas consideradas

### A — `v1_dashboard`

**Rejeitado.** O prefixo `vN_` está reservado para verticais de negócio com schema próprio. V1 no naming canónico é o "Core Hub" como produto — não um schema. Usar `v1_dashboard` criaria precedente errado: outros agentes poderiam inferir que existe um schema `v1_core`, `v1_iam`, etc. A convenção transversal sem prefixo é mais limpa e coerente.

### B — Sem schema novo: views directamente em `public` ou em `core`

**Rejeitado.** `public` já tem tabelas legacy (`cookai_*`) — misturar views de dashboard aumenta entropia. `core` é schema de domínio de negócio (pessoas, imóveis, serviços) — não de apresentação. A separação de responsabilidades exige schema próprio.

### C — Usar directamente os schemas existentes (`core`, `system`, `growth`) sem views de transição

**Rejeitado.** A app Next.js ficaria acoplada às estruturas internas de cada schema. Qualquer refactor em `system` ou `growth` quebraria queries da app. As views de transição são a camada de isolamento — e precisam de um namespace (schema) para viver.

### D — Schema `hub` ou `ops`

**Rejeitado.** `hub` tem conotação com Core Hub (poderia confundir-se com schema `core`). `ops` poderia confundir-se com `system` (que já aloja operações de agentes). `dashboard` é o nome mais expressivo e sem ambiguidade no contexto desta plataforma.

---

## Riscos identificados para a estratégia de views de transição

### R1 — Views sobre tabelas com RLS: o `SECURITY INVOKER` é obrigatório

Por defeito, uma VIEW em Postgres é `SECURITY DEFINER` (corre com permissões do owner, não do utilizador que invoca). Isto significa que a view **bypassa as RLS policies** das tabelas fonte — qualquer utilizador que aceda à view via PostgREST vê todos os dados, independentemente das políticas RLS em `core`, `system`, ou `growth`.

**Mitigação obrigatória:** todas as views em `dashboard` devem ser criadas com `SECURITY INVOKER`:

```sql
CREATE VIEW dashboard.clientes_activos
  WITH (security_invoker = true) AS
  SELECT ...;
```

Com `security_invoker = true`, a view corre com as permissões do utilizador que a invoca — as RLS policies das tabelas fonte aplicam-se normalmente.

**Atenção:** `security_invoker` para views foi introduzido no PostgreSQL 15. Supabase usa PostgreSQL 15+ (confirmar antes da migration).

### R2 — Exposição do schema `dashboard` no PostgREST

O schema `dashboard` terá de ser adicionado ao `pgrst.db_schemas` da role `authenticator` (conforme ADR-V2-002). A lista actual (registada no ADR-V2-002) é:

```
public, graphql_public, core, system, v2_condominios, v3_seguros, v4_energia, v5_manutencao, v1_owners_club, marketing
```

Deverá passar a incluir `dashboard`:

```sql
ALTER ROLE authenticator SET pgrst.db_schemas =
  'public, graphql_public, core, system, iam, marketing, v2_condominios, v3_seguros,
   v4_energia, v5_manutencao, v1_owners_club, dashboard';
NOTIFY pgrst, 'reload config';
```

**Nota:** verificar se `iam` já está na lista (não aparece no snapshot do ADR-V2-002 — pode ter sido adicionado em sprint posterior). Confirmar com `SELECT rolconfig FROM pg_roles WHERE rolname = 'authenticator'` antes de aplicar.

### R3 — Views de transição podem mascarar problemas de performance

Uma view sobre `growth.leads` com GROUP BY corre uma query completa em cada pedido REST. Se a tabela crescer, a view fica lenta. A conversão view → tabela (materializada ou real) deve acontecer antes que o volume o torne crítico.

**Mitigação:** para views de agregação, usar `MATERIALIZED VIEW` com cron de refresh (ex: a cada 15 minutos), em vez de view simples. Views de alias directo (1:1 com tabela fonte, sem agregação) mantêm-se como views simples.

### R4 — Schemas `growth` vs `marketing`: inconsistência de naming

O ADR-015 chama o schema de `marketing`, mas a implementação real em `apps/dashboard/src/App.jsx` usa rotas `/growth/funnel`, `/growth/leads`, `/growth/oportunidades`, `/growth/rules` — e o ADR-015 usa internamente o nome `growth.*` nas tabelas. Antes de criar views de transição do dashboard sobre este schema, confirmar com `SELECT schema_name FROM information_schema.schemata` qual o nome real do schema no Supabase.

---

## Próximos passos (fora do scope deste ADR)

1. **Confirmar nome real do schema growth/marketing** no Supabase via SQL antes de criar views
2. **`supabase-designer`** cria migration `20260701_dashboard_schema.sql`:
   - `CREATE SCHEMA dashboard`
   - Primeiras views de transição (inbox, funil_resumo, clientes_activos) com `security_invoker = true`
   - GRANT USAGE em `dashboard` para roles `anon` e `authenticated`
3. **Exposição PostgREST**: `ALTER ROLE authenticator SET pgrst.db_schemas = '..., dashboard'`
4. **App Next.js** configurada com `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_ANON_KEY` apontando a `hkmvszkpxjbxmnixzqbl`
5. **ADR-017** (a criar): estratégia de conversão view → tabela por módulo (critérios, sequência, rollback)
