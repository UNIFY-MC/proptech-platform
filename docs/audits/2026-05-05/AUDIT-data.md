# AUDIT-data · PropTech Platform · Supabase & Infra de Dados · 2026-05-05

> Audit read-only de dados e infra Supabase. Produzido por supabase-designer.
> Projecto auditado: `hkmvszkpxjbxmnixzqbl` (V1 Core Hub, Paris eu-west-3).
> Zero SQL executado. Zero migrations aplicadas.

---

## Status

### Projecto Supabase activo

| Campo | Valor |
|---|---|
| ID | `hkmvszkpxjbxmnixzqbl` |
| Nome | V1 Core Hub |
| Região | eu-west-3 (Paris) |
| Estado | Activo e com dados de produção (74 pessoas, 87 agent audit log rows, 205k codigos postais) |
| Linkado ao Supabase CLI via | `apps/v5-manutencao/supabase/.temp/linked-project.json` |

---

### Schemas existentes vs planeados (CLAUDE.md)

| Schema | Planeado em CLAUDE.md | Existe em Supabase | Tabelas activas | Rows c/ dados |
|---|---|---|---|---|
| `core` | Sim | **Sim** | 18 tabelas | pessoas 74, imoveis 97, organizations 6, agent_audit_log 87, codigos_postais 205k |
| `system` | Nao (emergiu de ADR-010) | **Sim** | 3 tabelas | inbox_items 6, approvals_queue 3, inbox_reads 0 |
| `v4_energia` | Sim | **Sim** | 8 tabelas | acordos_comercializadoras 8, contratos_energia 7, restantes 0 |
| `v5_manutencao` | Nao (CLAUDE.md lista como app, nao schema) | **Sim** | ~45 tabelas | catalogo_servicos 16, codigos_postais 205k, magic_links 8, recibos_servico 2, advisor_sessoes 5, advisor_mensagens 18 |
| `v2_condominios` | Nao (CLAUDE.md menciona apenas V2 como vertical futura) | **Sim** | 16 tabelas | todas vazias (0 rows) |
| `v3_seguros` | Sim | **Sim** | 4 tabelas | todas vazias (0 rows) |
| `public` | (legacy) | **Sim** | 18 tabelas | servicos 199, ordens 17, subcategorias 45, + 3 backups sem RLS |
| `v9_swan` | Sim | **Nao** | — | — |
| `v10_owners_club` | Sim | **Nao** | — | — |

**Nota sobre schema planeado `core`:** O CLAUDE.md define para o schema `core` as tabelas: `pessoas`, `imoveis`, `empresas`, `servicos_ativos`, `leads`, `oportunidades`, `interacoes`, `ofertas`, `api_keys`, `staff`. Desses, `servicos_ativos` e `oportunidades` existem com nomes ligeiramente diferentes (`core.servicos_activos` e `core.crm_oportunidades`). A tabela `core.empresas` nao existe — as organizacoes estao em `core.organizations` (escopo mais amplo). A tabela `core.ofertas` nao existe.

---

### Migrations versionadas

#### `supabase/migrations/` (raiz) — 2 ficheiros

| Ficheiro | O que faz |
|---|---|
| `20260504_system_grants_anon_authenticated.sql` | Formaliza GRANTs manuais aplicados em 2026-05-04 — USAGE no schema `system`, SELECT/INSERT/UPDATE/DELETE em todas as tabelas de `system` para os roles `anon` e `authenticated`. O ficheiro e explicitamente marcado como "registo historico — ja aplicado". |
| `20260505_system_open_internal.sql` | Relaxa as RLS policies do schema `system` para uso interno sem auth real (ver seccao Riscos RLS). Drop de policies por staff; substituicao por policies `USING (true)` para todos os roles. Tambem drop da FK `inbox_reads.user_id → auth.users` e set de default `00000000-0000-0000-0000-000000000001`. |

**Observacao:** Estes 2 ficheiros na raiz `supabase/migrations/` existem localmente mas **nao** aparecem no registo oficial de migrations do Supabase (`supabase_migrations.schema_migrations`). O Supabase CLI traceia migrations por timestamp+nome via a tabela `supabase_migrations`. Quando se aplica via `apply_migration()` MCP, a migration e registada. Estes 2 ficheiros foram aparentemente aplicados via SQL Editor directamente — o Supabase tem as alteracoes em vigor, mas sem registo de migration. Nao ha risco imediato, mas quebra a rastreabilidade de "o que foi aplicado quando".

#### `apps/v5-manutencao/supabase/migrations/` — 13 ficheiros

| Ficheiro | O que faz |
|---|---|
| `20260422_catalogo_canalizacao.sql` | Catalogo de canalizacao (servicos de canalização) no schema `public` |
| `20260422_catalogo_completo.sql` | Catalogo completo de servicos V5 no schema `public` |
| `20260423_fix_popular_variants.sql` | Fix para variantes populares agrupadas |
| `20260423_temp_anon_insert_ordens.sql` | Policy temporaria anon INSERT em ordens (usado em dev pre-auth) |
| `20260423_ordens_numero_sequencial.sql` | Adiciona numeracao sequencial a ordens de trabalho |
| `20260423_fix_ordens_rls_pre_auth.sql` | Fix RLS em ordens antes da auth estar activa |
| `20260424_auth_uid_ordens_policies.sql` | RLS em ordens com `auth.uid()` (post-auth real) |
| `20260424_admin_write_servicos.sql` | GRANT write em servicos para role admin |
| `20260424_cliente_moradas.sql` | Tabela `public.cliente_moradas` |
| `20260424_perfis_fiscal.sql` | Tabela `v5_manutencao.perfis_fiscais` |
| `20260424_wishlist.sql` | Tabela wishlist (lista de items desejados por cliente) |
| `20260424_ordens_estado_pendente_orcamento.sql` | Adiciona estado `pendente_orcamento` ao enum de ordens |
| `03c_v5_3_3_10_suporte.sql` | Tabelas `tickets_suporte` e `mensagens_suporte` com RLS permissiva de demo (depois substituida pela migration `17_*`) |

**Inconsistencia critica:** Os 3 ficheiros mais recentes e importantes — `20260505_v2_condominios_schema.sql`, `20260505_v3_seguros_schema.sql`, `20260505_v4_energia_schema.sql` — aparecem no registo oficial de migrations do Supabase (timestamps `20260505164739`, `20260505164826`, `20260505164908`) mas **nao existem fisicamente** em `apps/v5-manutencao/supabase/migrations/`. Foram aplicados via MCP `apply_migration()` directamente, sem ficheiro local correspondente criado no repositorio. O Supabase tem os schemas em producao, o git nao tem os ficheiros fonte. **Divida de documentacao critica.**

#### `apps/v5-manutencao/sql/` — 40 ficheiros (duas convencoes coexistem)

**Serie sequencial (01–29):** Migrations historicas do desenvolvimento inicial da V5. Numeracao simples, sem timestamp. Aplicadas por ordem num projecto anterior ou manualmente.

| Intervalo | Descricao geral |
|---|---|
| `01_*` a `03_*` | Core multitenant, organization_id, casa schema, seeds demo |
| `04_*` a `06_*` | Faturacao, imovel, orcamentos |
| `07_*` a `10_*` | UX sub-grupos, admin, combos, servico detalhe |
| `11_*` a `13_*` | Planos, imagens, equipa |
| `14_*` a `20_*` | Auth, onboarding RPC, RLS helpers, RLS completo, fixes |
| `22_*` a `24_*` | Nome split, staff roles, RPC guards |
| `26_*` a `29_*` | Agents schema, seeds, bucket/helper, update policies |

**Serie timestamp (202604xx–202605xx):** Introducida a meio do desenvolvimento, convencao de data ISO. Coexiste com a sequencial.

| Ficheiro | Descricao |
|---|---|
| `202604281530_*` | Equipamento extras |
| `202604291700_*` | Casa advisor schema (advisor_sessoes, advisor_mensagens) |
| `202604291800_*` | Fix core service_role grants |
| `202604291900_*` | Advisor sessoes — adicionar coluna idioma |
| `202604301400_*` | Codigos postais e weather forecast cache |
| `202605010001_*` | Sprint 1D foundations — magic_links, prestadores_parceiros, recibos_servico |

---

## Inconsistencias

### A. Migrations v2_condominios + v3_seguros + v4_energia vivem em `apps/v5-manutencao/supabase/migrations/` — e correcto?

**Nao.** E arquitecturalmente incorrecta esta localizacao por 3 razoes:

1. **Nomes errados:** As migrations `20260505_v2_condominios_schema.sql`, `20260505_v3_seguros_schema.sql`, `20260505_v4_energia_schema.sql` foram criadas em `apps/v5-manutencao/supabase/migrations/` — mas nao existem fisicamente la (foram aplicadas via MCP sem ficheiro local). Se existissem, o problema seria que uma pasta de V5 conteria migrations de V2, V3 e V4.

2. **Localizacao correcta:** Migrations transversais a multiplos schemas devem viver em `supabase/migrations/` (raiz), associadas ao projecto Supabase V1 Core Hub. O CLI esta linkado ao projecto via `apps/v5-manutencao/supabase/.temp/` mas o repositorio de migrations de toda a plataforma devia estar centralizado na raiz.

3. **Rastreabilidade nula:** As 3 migrations dos schemas v2_condominios, v3_seguros, v4_energia estao no Supabase (confirmado via `list_migrations`) mas os SQL fonte nao existem em ficheiro no repositorio git. E impossivel rever, replicar ou fazer rollback sem recriar o SQL de memoria.

**Analogia contabilistica:** E como ter lancamentos no sistema de contabilidade (Supabase confirmou) mas sem o documento original de suporte (o ficheiro SQL) — viola o principio da documentacao dos actos.

### B. Dois sistemas de numeracao em `apps/v5-manutencao/sql/` — risco de ordem de aplicacao

**Sim, ha risco.** Os 40 ficheiros em `sql/` usam duas convencoes:

- **Sequencial (`01_` a `29_`):** Depende de ordem alfabetica/numerica. Um ficheiro `09_*` aplica antes de `10_*`. Funciona se nao houver gaps — mas ha: falta `11_*` na serie (existe `11_v5_3_3_14_ux7_planos.sql` mas esta no final da lista Glob, fora de ordem). Ha tambem `01b_*` e `05b_*` que dependem de `01_*` e `05_*` respectivamente — correcto.

- **Timestamp (`202604xx_*`):** Convencao correcta (ISO date garante ordem). O problema e a coexistencia: o ficheiro `202604281530_*` (timestamp) e processado depois de `29_*` (sequencial) se a ferramenta ordena alfanumericamente, mas antes de `29_*` em termos de data de criacao.

**Risco real:** Se alguem aplicar os ficheiros de `sql/` em ordem alfabetica (o que e o comportamento padrao de `psql \i` ou de scripts shell que usam `ls`), a ordem nao e garantida:
- `01_*` (correcto, vem antes de `26_*`)
- `202604281530_*` (vem antes de `26_*` alfabeticamente, mas depende de `26_*` pelo schema de agents)
- `29_*` e `202605010001_*` podem colidir em dependencias

**O `03c_v5_3_3_10_suporte.sql`** e um caso especial: esta em `apps/v5-manutencao/supabase/migrations/` (nao em `sql/`) mas o nome nao tem timestamp — e sequencial. Inconsistencia adicional de pasta.

### C. `agent-casa-advisor` e `agent-image-inspector` — estado real vs documentado

O AUDIT-RAW.md indicava que `agent-casa-advisor` "nao existe em `supabase/functions/`". Apos consulta directa ao Supabase:

**DIVERGENCIA ENCONTRADA:**

| Edge Function | Estado no Supabase | Ficheiro em `supabase/functions/` | Status |
|---|---|---|---|
| `agent-casa-advisor` | **ACTIVA** (version 4, criada 2026-04-27) | Nao existe | Deployed mas nao versionada no repo |
| `agent-image-inspector` | **ACTIVA** (version 12, ultima update 2026-04-27) | Nao existe | Deployed mas nao versionada no repo |
| `gerar-magic-link` | **ACTIVA** (version 5) | Existe em `supabase/functions/` | Correcta |
| `delete-account` | **ACTIVA** (version 6) | Existe em `supabase/functions/` | Correcta |
| `v4-energia-lead` | **ACTIVA** (version 5) | Existe em `supabase/functions/` | Correcta |

**Surpresa adicional:** Existem **10 edge functions deployed** que nao estao versionadas em `supabase/functions/`:
`core-api`, `core-invite`, `core-setup`, `github-deploy`, `github-push`, `auth-test`, `admin-ui-test`, `agent-test`, `weather-forecast`, `prestador-onboarding`.

O repositorio `supabase/functions/` tem apenas 3 funcoes (`delete-account`, `gerar-magic-link`, `v4-energia-lead`) mas o Supabase tem **15 edge functions activas**.

---

## Riscos RLS

### Migration `20260505_system_open_internal.sql` — o que foi relaxado e porquê

Esta migration foi aplicada a 2026-05-05 (commit `a7aafec`) com a mensagem "relax system.* policies for internal use (1 user, vercel-protected)".

**O que faz:**
- Dropa as policies originais de staff (`staff_read_inbox_items`, `staff_archive_inbox_items`, etc.) das 3 tabelas do schema `system`
- Cria policies `USING (true)` para SELECT e `USING (true) WITH CHECK (true)` para ALL — ou seja, **qualquer pessoa com a chave anon ou authenticated pode ler e escrever em `system.inbox_items`, `system.inbox_reads` e `system.approvals_queue`**
- Remove a FK de `inbox_reads.user_id → auth.users` e define um UUID hardcoded `00000000-0000-0000-0000-000000000001` como default

**Razao declarada:** O Command Center esta em fase de desenvolvimento com "1 utilizador, protegido por Vercel password". A auth real (via `public.is_staff()`) esta anotada como trabalho futuro com o comentario "Quando precisar de Auth real, reverter para USING (public.is_staff())".

**Avaliacao de risco:**

| Risco | Severidade | Contexto mitigante |
|---|---|---|
| `system.approvals_queue` e publica para escrita | **ALTO** | A Vercel password protege o frontend, mas a anon key e publica — qualquer pessoa que conheca a anon key e o URL do Supabase pode aprovar/rejeitar acoes de agentes |
| `system.inbox_items` e publica para escrita | **MEDIO** | Pode injectar notificacoes falsas no dashboard do Mário |
| FK dropped para `auth.users` | **BAIXO** | Perdeu-se a integridade referencial para read state multi-user — mas com 1 utilizador o impacto e nulo agora |
| UUID hardcoded como user_id | **BAIXO** | Tecnicamente divida — quando se adicionar multi-user, ha que limpar estes registos |

**Conclusao:** Esta e uma decisao de pragmatismo de dev (acelerar sprint) aceitavel a curto prazo se o Command Center for genuinamente so-para-Mário e a anon key nao estiver exposta a terceiros. Mas requer rollback para `is_staff()` antes de qualquer share publico do URL.

### Avaliacao de cobertura RLS por schema

#### Schema `core` — **Bom, com ressalvas**

Todas as 18 tabelas tem `rls_enabled: true`. Os helpers de RLS (`public.current_pessoa_id()`, `public.current_organization_ids()`, `public.is_staff()`, `public.has_org_role()`) estao em producao e correctamente definidos com `SECURITY DEFINER SET search_path = ''`.

Ressalva: `core.staff` e `core.staff_roles` sao dois mecanismos paralelos para o mesmo conceito (staff da plataforma). O `core.staff` e um registo legacy com 1 row; o `core.staff_roles` e o mecanismo activo (2 rows, usado por `is_staff()`). Ha risco de confusao futura se um agente usar `core.staff` para verificar permissoes pensando que e a fonte canonica.

#### Schema `system` — **RLS activo mas policies abertas** (ver seccao acima)

#### Schema `v5_manutencao` — **Bom**

Cobertura completa. A migration `17_v5_3_4c_rls_v5_manutencao.sql` define 4 categorias de policies claramente documentadas:
- **PER_ORG** (Batch C1-C4): 13 tabelas com `organization_id = ANY(current_organization_ids())`
- **PER_PESSOA** (Tarefa D): 8 tabelas com `pessoa_id = public.current_pessoa_id()`
- **PUBLICO** (Tarefa E): 12 tabelas com SELECT livre para `anon, authenticated` (catalogo, planos, combos, FAQ)
- **SISTEMA/indirect** (Tarefa F): 5 tabelas acessiveis via JOIN com tabela pai (equipamentos, ordens, subscricoes)

**Excecao:** `tickets_suporte` e `mensagens_suporte` tinham policy publica (`public_rw`) na migration original `03c_*`, correctamente substituida pela migration `17_*` com policies per-pessoa. A migracao e correcta mas deixou rastro de DROP POLICY no ficheiro `17_*` que confirma a correcao intencional.

#### Schema `v2_condominios` — **RLS activo, policies bem desenhadas, 0 dados**

16 tabelas com RLS activo. Policies em 2 niveis: staff (via `public.is_staff()`) com acesso total por edificio; condominos (via helper `v2_condominios.get_my_edificios()`, funcao SECURITY DEFINER propria do schema) com SELECT limitado aos seus edificios. O `audit_log` e write-only para staff/system, sem SELECT para condominos.

#### Schema `v3_seguros` — **RLS activo, 0 dados**

4 tabelas com RLS activo. Policies seguem o mesmo padrao do v2_condominios (is_staff + get_my_edificios). `simulacoes` tem restricao adicional de CREATE so por staff.

#### Schema `v4_energia` — **RLS activo, dados em 2 tabelas**

8 tabelas com RLS activo. Tabelas com dados reais: `acordos_comercializadoras` (8 rows) e `contratos_energia` (7 rows). As 6 tabelas do schema V2/condo (comercializadores, contratos, tarifas, simulacoes, alertas_consumo, certificados_energeticos) tem 0 dados.

#### Schema `public` — **RISCO CRITICO: 5 tabelas sem RLS**

O advisor Supabase identificou 5 tabelas sem RLS:

| Tabela | Rows | Risco |
|---|---|---|
| `public.file_deploy` | 0 | Baixo (vazia, mas expose estrutura) |
| `public.servicos_backup_20260423` | 30 | **Medio** — backup com dados de producao V5 exposto |
| `public.categorias_backup_20260423` | 1 | Baixo |
| `public.subcategorias_backup_20260423` | 7 | Baixo |
| `public.frequency_templates` | 8 | Baixo |

**O risco mais concreto:** `public.servicos_backup_20260423` tem 30 rows de dados reais (servicos com precos, descricoes, etc.) expostos sem restricao — qualquer pessoa com a anon key pode fazer `SELECT * FROM public.servicos_backup_20260423`. Os backups deviam ter sido criados, usados, e dropados — nao persistidos com dados.

**SQL de remediacao (nao aplicar agora — requer decisao de Mário):**
```sql
-- Opção 1: dropar as tabelas de backup (recomendada se dados ja nao sao necessarios)
DROP TABLE public.servicos_backup_20260423;
DROP TABLE public.categorias_backup_20260423;
DROP TABLE public.subcategorias_backup_20260423;

-- Opção 2: activar RLS + deny all (se quiser preservar os dados)
ALTER TABLE public.servicos_backup_20260423 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_backup_20260423 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategorias_backup_20260423 ENABLE ROW LEVEL SECURITY;
-- (sem policies = deny all implícito)

-- Para as outras 2 (sem dados sensiveis, mas boa higiene):
ALTER TABLE public.file_deploy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frequency_templates ENABLE ROW LEVEL SECURITY;
```

---

## Edge Functions deployed vs versionadas

### Inventario completo (Supabase activo vs repo git)

| Slug | Status Supabase | Em `supabase/functions/` | verify_jwt | Observacao |
|---|---|---|---|---|
| `core-api` | ACTIVA (v16) | Nao | false | Funcao principal de API — versao 16 indica uso intenso |
| `core-invite` | ACTIVA (v5) | Nao | false | Convites de utilizadores |
| `core-setup` | ACTIVA (v5) | Nao | false | Setup inicial |
| `github-deploy` | ACTIVA (v5) | Nao | false | Deploy via GitHub |
| `github-push` | ACTIVA (v8) | Nao | false | Push via GitHub |
| `auth-test` | ACTIVA (v5) | Nao | false | Funcao de teste — devia ser removida de producao |
| `admin-ui-test` | ACTIVA (v5) | Nao | false | Funcao de teste — idem |
| `agent-test` | ACTIVA (v6) | Nao | true | Funcao de teste com JWT — idem |
| `v4-energia-lead` | ACTIVA (v5) | **Sim** | true | Correctamente versionada |
| `delete-account` | ACTIVA (v6) | **Sim** | true | Correctamente versionada |
| `gerar-magic-link` | ACTIVA (v5) | **Sim** | true | Correctamente versionada |
| `agent-image-inspector` | ACTIVA (v12) | Nao | true | Funcao de agente activa, nao versionada |
| `agent-casa-advisor` | ACTIVA (v4) | Nao | true | Funcao de agente activa, nao versionada |
| `weather-forecast` | ACTIVA (v4) | Nao | true | Funcao de cache meteo, nao versionada |
| `prestador-onboarding` | ACTIVA (v3) | Nao | false | Funcao critica Sprint 1D, nao versionada |

**Resumo:** 15 edge functions activas em Supabase. Apenas 3 estao versionadas no repositorio git. 12 funcoes deployed sem fonte rastreavel em git.

**verify_jwt = false** em 7 funcoes (core-api, core-invite, core-setup, github-deploy, github-push, auth-test, admin-ui-test, prestador-onboarding). `prestador-onboarding` e `verify_jwt: false` intencionalmente (prestadores nao tem JWT), mas as funcoes de `*-test` deviam ser removidas.

---

## Registo de migrations no Supabase vs convencao de nomes

O Supabase registou **93 migrations** no total (via `supabase_migrations.schema_migrations`). A convencao de nomes e inconsistente:

- Migrations antigas (Abril 2026): nome descritivo sem prefixo de data (`core_schema_pessoas_imoveis_rgpd`)
- Migrations recentes: prefixo `20260505_` no nome mesmo quando o timestamp ja e parte da versao (`20260505164739` version + `20260505_v2_condominios_schema` name = redundancia)
- `03c_v5_3_3_10_suporte` — nome sequencial V3 antigo dentro do sistema de migrations com timestamp

---

## Proximas Accoes (recomendacoes do supabase-designer)

**1. Criar os ficheiros SQL fonte das 3 migrations v2/v3/v4 em falta no git** — Prioridade Alta

As migrations `20260505_v2_condominios_schema`, `20260505_v3_seguros_schema` e `20260505_v4_energia_schema` estao aplicadas no Supabase mas o SQL fonte nao existe em `apps/v5-manutencao/supabase/migrations/`. Ha que criar esses 3 ficheiros a partir do estado actual do Supabase (via `execute_sql` + `pg_dump` schema-only), colocar em `apps/v5-manutencao/supabase/migrations/` e commitar. Sem isto, qualquer rebuild do projecto a partir do zero nao consegue replicar a infra.

**2. Versionar em git as edge functions criticas nao rastreadas** — Prioridade Alta

No minimo `agent-casa-advisor`, `agent-image-inspector`, `prestador-onboarding` e `weather-forecast` devem ter o seu `index.ts` copiado para `supabase/functions/<slug>/index.ts` e commitado. As funcoes `core-api`, `core-invite`, `core-setup` tambem devem ser versionadas. Usar `mcp__supabase__get_edge_function` para obter o codigo fonte de cada uma.

**3. Reverter RLS do schema `system` para `is_staff()` antes de qualquer exposicao externa** — Prioridade Media

A migration `20260505_system_open_internal.sql` deixou as 3 tabelas de `system` com policies abertas. O proprio ficheiro documenta como reverter: `USING (public.is_staff())`. Esta mudanca deve acontecer quando a auth do Command Center for ligada a utilizadores reais (mesmo que seja so o Mário).

**4. Dropar ou proteger as tabelas de backup em `public`** — Prioridade Media

`public.servicos_backup_20260423` (com 30 rows de dados) e as 2 outras tabelas de backup estao sem RLS. A accao mais simples: verificar com o Mário se os dados sao ainda necessarios, e se nao, fazer DROP. Se forem necessarios como referencia, activar RLS + deny all e criar uma migration para isso.

**5. Remover as edge functions de teste de producao** — Prioridade Baixa

`auth-test`, `admin-ui-test` e `agent-test` sao funcoes de desenvolvimento que estao activas em producao. Nao causam risco directo (as primeiras 2 tem `verify_jwt: false` mas sem acesso a dados sensiveis), mas aumentam a superficie de ataque desnecessariamente e poluem o inventario de funcoes. Deviam ser deletadas via dashboard Supabase.

---

## Factos relevantes descobertos nesta audit

- O V1 Core Hub tem **74 pessoas reais** e **62 servicos activos** em `core.*` — nao e verdadeiramente "vazio" como documentado em CLAUDE.md. Tem dados sincronizados do V2 Condo Hub e dados proprios do V5.
- `core.codigos_postais` tem **205.817 rows** — maior tabela da plataforma, importada para geocodificacao de V5.
- `core.agent_audit_log` tem **87 rows** com tracking de execucoes de agentes, incluindo `cost_eur` e tokens. Ha infra de billing de AI em producao.
- A edge function `core-api` esta na **versao 16** — indica que foi o componente mais iterado desde Abril 2026.
- `v4_energia` tem dois "ramos": 2 tabelas com dados reais (`acordos_comercializadoras`, `contratos_energia`) que sao do contexto V5/manutencao (servicos de energia do imovel), e 6 tabelas vazias que sao do contexto V2/condominios (energia dos edificios). O schema `v4_energia` esta a ser partilhado entre dois contextos de negocio distintos — potencial de confusao futura.

---

*Produzido por supabase-designer · 2026-05-05T21:30Z · Read-only audit · Zero SQL executado*
