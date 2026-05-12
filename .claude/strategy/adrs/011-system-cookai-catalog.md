---
id: ADR-011
title: System CookAI Catalog — Skills, Recipes, Integrations, Context Docs
date: 2026-05-12
status: Proposed
deciders: [architect-proptech]
sprint: B
---

# ADR-011 · System CookAI Catalog — Skills, Recipes, Integrations, Context Docs

## Status

Proposto · 2026-05-12 · Aguarda aprovação Mário antes de migration

---

## Context

Sprint A entregou Bia runtime E2E com `system.inbox_items`, `system.inbox_reads` e
`system.approvals_queue` (ADR-010). As Skills, Recipes e Integrations de cada employee
vivem actualmente como frontmatter YAML em `.claude/employees/*.md` e fluem read-only
para `apps/dashboard/public/data.json` via gray-matter parser. A UI do dashboard mostra
estes dados mas não permite CRUD.

Sprint B Fase B2 requer a página `/context` com CRUD completo de Skills, Recipes,
Integrations e Context Docs. Isto exige que estes objectos existam em base de dados como
entidades mutáveis em runtime — não apenas como snapshots estáticos em ficheiros `.md`.

O padrão CookAI mapeia: Context → Skills → Recipes → Integrations → Employee.
A plataforma adopta este modelo para todos os employees presentes e futuros (Bia V5,
employees V2, marketing, etc.).

---

## Decisions

### D1 · Schema: `system`, não `core`

Skills, Recipes, Integrations e Context Docs são metadados operacionais do sistema de
agentes — não entidades de negócio transversais. `core.*` aloja `pessoas`, `imoveis`,
`leads`, `memberships` — objectos que qualquer vertical precisa de conhecer para operar
o negócio. `system.*` aloja infra operacional interna: inbox, approvals, e agora o
catálogo de capacidades dos agentes.

Um cliente externo que use a API da plataforma não precisa de ver `system.skills`. Já
precisaria de ver `core.imoveis`. Este é o critério de separação.

Alternativa rejeitada: `core.*` — confunde dados de negócio com metadados de agentes,
viola a semântica que ADR-010 já estabeleceu.

### D2 · `employee_id` como `text` com convenção `'v5.bia'`, sem tabela `system.employees`

Employees vivem em `.md` em Git com propósito deliberado: versioning, edição sem deploy,
portabilidade. Criar `system.employees` agora introduz segunda source-of-truth antes da
primeira estar estável. O custo de sincronização supera o benefício de FK referencial.

Implementação: coluna `employee_id text NOT NULL` com CHECK constraint
`employee_id ~ '^v[0-9]+\.[a-z_]+$'` para garantir convenção sem tabela.

Trigger de reavaliação: quando existirem ≥3 employees em produção activa E o dashboard
precisar de criar/activar/desactivar employees via UI → criar `system.employees` com ADR
próprio.

Alternativa rejeitada: `system.employees` agora — over-engineering prematuro, segunda
source-of-truth desnecessária.

### D3 · `system.recipes` é separado de `core.agent_policies` — não colapsar

`core.agent_policies`: governance de agente — quem pode fazer o quê, a que custo, rate
limits, approval_required_tools. É política de segurança e controlo.

`system.recipes`: workflow definition — sequência de skills com trigger, schedule,
payload_schema. É definição de como o trabalho flui.

São ortogonais. Uma recipe pode existir sem policy associada (trigger manual sem
approval). Uma policy pode existir sem recipe (rate limit global). Colapsar os dois cria
dependência de deploy entre governance e workflow.

Relação: `system.recipes` pode referenciar `agent_name` para lookup em
`core.agent_policies`, mas são tabelas independentes.

### D4 · Naming limpo sem prefixo

Tabelas: `system.skills`, `system.recipes`, `system.integrations`, `system.context_docs`.
Junctions: `system.recipe_skills`, `system.employee_skills`, `system.employee_integrations`.

Sem prefixo `cookai_` — o schema `system` é o namespace. Consistente com `system.inbox_items`
e `system.approvals_queue` já existentes (ADR-010).

### D5 · RLS via `public.is_staff()` com coluna `status` em vez de flag `approved_by_admin`

`public.is_staff()` (definida em Sprint 3.4D, usa `core.staff_roles`) aplica-se a todas
as tabelas novas: staff faz CRUD, authenticated lê, service_role bypassa.

Para evitar lixo no catálogo sem overhead burocrático: coluna
`status text CHECK ('draft','active','deprecated') DEFAULT 'draft'` em `system.skills` e
`system.recipes`. Só items `active` são visíveis aos agentes em runtime.

Flag `approved_by_admin` rejeitada: workflow de aprovação desnecessário enquanto Mário
for único admin. Acrescenta-se quando houver multi-admin ou marketplace de skills.

### D6 · Junction tables para M2M com integridade referencial

`skill_ids text[]` em recipes e `employee_ids text[]` em integrations são rejeitados.
Arrays de slugs sem FK não garantem integridade — renomear um skill corromperia recipes
silenciosamente.

Junctions com FK:
- `system.recipe_skills(recipe_id uuid FK, skill_id uuid FK, step_order int)` — preserva
  ordem de execução e tem FK real
- `system.employee_skills(employee_id text, skill_id uuid FK)`
- `system.employee_integrations(employee_id text, integration_id uuid FK)`

### D7 · Source-of-truth: DB é mutável runtime; `.md` é snapshot de versioning

Após sync inicial (`.md` → DB), o DB torna-se source-of-truth para runtime. Os ficheiros
`.md` permanecem como snapshot em Git para histórico e portabilidade (podem regenerar DB
se necessário).

Sync re-corre quando há divergência significativa ou novo employee é adicionado.
Não é automático — é operação manual via script.

---

## DDL Proposto

```sql
-- system.skills
CREATE TABLE system.skills (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  slug           text NOT NULL UNIQUE,
  description    text,
  category       text,
  code_ref       text,           -- path relativo ao ficheiro de implementação
  status         text NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','active','deprecated')),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- system.integrations
CREATE TABLE system.integrations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  slug           text NOT NULL UNIQUE,
  type           text NOT NULL CHECK (type IN ('mcp','api','webhook','cli')),
  enabled        bool NOT NULL DEFAULT false,
  config         jsonb DEFAULT '{}'::jsonb,  -- refs e endpoints, NUNCA secrets
  status         text NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','active','deprecated')),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- system.recipes
CREATE TABLE system.recipes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  slug           text NOT NULL UNIQUE,
  employee_id    text NOT NULL CHECK (employee_id ~ '^v[0-9]+\.[a-z_]+$'),
  trigger        text NOT NULL CHECK (trigger IN ('cron','event','manual')),
  cron_expr      text,           -- NULL se trigger != 'cron'
  event_pattern  text,           -- NULL se trigger != 'event'
  payload_schema jsonb DEFAULT '{}'::jsonb,
  active         bool NOT NULL DEFAULT false,
  status         text NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','active','deprecated')),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  CONSTRAINT cron_requires_expr CHECK (
    trigger != 'cron' OR cron_expr IS NOT NULL
  )
);

-- system.context_docs
CREATE TABLE system.context_docs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    text CHECK (employee_id ~ '^v[0-9]+\.[a-z_]+$'),  -- NULL = global
  title          text NOT NULL,
  type           text NOT NULL
                 CHECK (type IN ('sop','icp','call_recap','adr','never_rule')),
  source_url     text,
  content        text,
  tags           text[] DEFAULT '{}',
  updated_at     timestamptz DEFAULT now(),
  created_at     timestamptz DEFAULT now()
);

-- Junctions
CREATE TABLE system.recipe_skills (
  recipe_id      uuid NOT NULL REFERENCES system.recipes(id) ON DELETE CASCADE,
  skill_id       uuid NOT NULL REFERENCES system.skills(id) ON DELETE RESTRICT,
  step_order     int NOT NULL DEFAULT 0,
  PRIMARY KEY (recipe_id, skill_id)
);

CREATE TABLE system.employee_skills (
  employee_id    text NOT NULL CHECK (employee_id ~ '^v[0-9]+\.[a-z_]+$'),
  skill_id       uuid NOT NULL REFERENCES system.skills(id) ON DELETE RESTRICT,
  PRIMARY KEY (employee_id, skill_id)
);

CREATE TABLE system.employee_integrations (
  employee_id    text NOT NULL CHECK (employee_id ~ '^v[0-9]+\.[a-z_]+$'),
  integration_id uuid NOT NULL REFERENCES system.integrations(id) ON DELETE RESTRICT,
  PRIMARY KEY (employee_id, integration_id)
);

-- Indexes
CREATE INDEX ON system.recipes(employee_id);
CREATE INDEX ON system.context_docs(employee_id);
CREATE INDEX ON system.skills(status);
CREATE INDEX ON system.recipes(active, status);

-- updated_at trigger (reutilizar pattern existente se disponível)
CREATE OR REPLACE FUNCTION system.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_skills_updated_at
  BEFORE UPDATE ON system.skills
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

CREATE TRIGGER trg_recipes_updated_at
  BEFORE UPDATE ON system.recipes
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

CREATE TRIGGER trg_integrations_updated_at
  BEFORE UPDATE ON system.integrations
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

CREATE TRIGGER trg_context_docs_updated_at
  BEFORE UPDATE ON system.context_docs
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

-- RLS
ALTER TABLE system.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.context_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.recipe_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.employee_integrations ENABLE ROW LEVEL SECURITY;

-- Skills: authenticated lê active, staff faz CRUD completo
CREATE POLICY "skills_read_active" ON system.skills
  FOR SELECT TO authenticated
  USING (status = 'active' OR public.is_staff());

CREATE POLICY "skills_staff_write" ON system.skills
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Recipes: staff CRUD
CREATE POLICY "recipes_read" ON system.recipes
  FOR SELECT TO authenticated USING (public.is_staff());

CREATE POLICY "recipes_staff_write" ON system.recipes
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Integrations: staff CRUD
CREATE POLICY "integrations_read" ON system.integrations
  FOR SELECT TO authenticated USING (public.is_staff());

CREATE POLICY "integrations_staff_write" ON system.integrations
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Context docs: employee_id NULL = global (todos lêem), específico = só staff
CREATE POLICY "context_docs_read" ON system.context_docs
  FOR SELECT TO authenticated
  USING (employee_id IS NULL OR public.is_staff());

CREATE POLICY "context_docs_staff_write" ON system.context_docs
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Junctions: herdam acesso do staff
CREATE POLICY "recipe_skills_staff" ON system.recipe_skills
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "employee_skills_staff" ON system.employee_skills
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "employee_integrations_staff" ON system.employee_integrations
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Realtime (opcional — só se dashboard precisar de live updates no /context)
-- ALTER PUBLICATION supabase_realtime ADD TABLE system.skills;
-- ALTER PUBLICATION supabase_realtime ADD TABLE system.recipes;
```

---

## Consequences

### Pros

- Schema `system` mantém coesão com ADR-010 — infra operacional num único namespace
- Junctions com FK garantem integridade referencial — sem corrupção silenciosa por renaming
- `status` column resolve o problema de "lixo no catálogo" sem workflow burocrático
- `core.agent_policies` mantém-se intocável — governance separada de workflow definition
- `employee_id text` evita segunda source-of-truth prematura; CHECK constraint garante convenção
- RLS via `public.is_staff()` existente — zero trabalho adicional de função
- Realtime comentado mas preparado — activar quando /context precisar de live collaboration

### Cons

- 7 tabelas novas (4 principais + 3 junctions) aumentam complexidade do schema
- Sync inicial `.md` → DB requer script dedicado (não está coberto por esta migration)
- `employee_id text` sem FK significa que employees podem ser deletados de `.md` sem erro de DB — mitigado por CHECK constraint e convenção documentada
- Realtime em `system.skills` pode ser excessivo para catálogo que muda raramente — deixado comentado por defeito

### Migration path

1. Aplicar DDL acima como migration `20260512_system_cookai_catalog.sql`
2. Criar script `scripts/sync-employees-to-db.js` que lê `.md` via gray-matter e faz upsert nas 7 tabelas
3. Executar sync inicial manualmente
4. Sprint B Fase B2: construir `/context` page no dashboard com CRUD via Supabase client
5. `.md` passa a ser gerado a partir de DB (inverter fluxo) OU mantém-se como backup manual — decisão após B2 estar estável

---

## Alternativas consideradas

### A1 · Tabelas em `core.*`

Rejeitada. Skills e recipes são metadados de agentes, não dados de negócio. Colocar em
`core` mistura dois mundos com ciclos de vida diferentes. Um utilizador externo com acesso
à API de negócio não deve ter visibilidade sobre como os agentes internos estão configurados.

### A2 · Manter em `.md` + JSON estático com CRUD via ficheiros em Git

Rejeitada. CRUD de ficheiros em Git requer backend dedicado (GitHub API), latência alta,
sem transaccionalidade, sem RLS. Também impossibilita que agentes se auto-configurem em
runtime (ex: Bia criar nova recipe ao detectar padrão recorrente).

### A3 · Colapsar `recipes` em `core.agent_policies`

Rejeitada. Governance (policies) e workflow (recipes) têm semânticas, ciclos de vida e
consumidores diferentes. Ver D3 acima.

### A4 · `employee_ids text[]` em `system.integrations` (sem junction)

Rejeitada. Arrays sem FK não têm integridade referencial — renomear employee quebra
silenciosamente. Junction table tem custo marginal e elimina classe de bugs.

---

## References

- `ADR-010` — Command Center Pivot · schema `system.*` · `inbox_items` · `approvals_queue`
- `.claude/employees/bia.md` — estrutura frontmatter actual (skills/recipes/integrations como YAML)
- `.claude/strategy/research/cookai-walkthrough.md` — modelo CookAI: Context → Skills → Recipes → Integrations → Employee
- `core.agent_policies` — governance de agentes (rate limits, approval_required_tools, model)
- `public.is_staff()` — função RLS existente desde Sprint 3.4D, usa `core.staff_roles`
