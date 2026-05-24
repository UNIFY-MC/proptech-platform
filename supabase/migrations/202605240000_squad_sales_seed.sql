-- =============================================================================
-- Migration: 202605240000_squad_sales_seed.sql
-- Aguarda aplicação Mário -- generated 2026-05-24 por supabase-designer
--
-- Objectivo:
--   1. ADD COLUMN source_squad + source_path em system.agent_profile (aditivo)
--   2. INDEX em (source_squad) para query "todos os agents de uma squad"
--   3. SEED 9 rows em system.agent_profile (squad-sales: chief + 8 specialists)
--   4. SEED 9 rows em system.skills (9 tasks, category='sales')
--   5. SEED 2 rows em system.context_docs (checklists deal-qualification + discovery-quality)
--
-- Reversão trivial:
--   DELETE FROM system.context_docs WHERE source_url LIKE 'squads/sales/%';
--   DELETE FROM system.skills WHERE category = 'sales' AND code_ref LIKE 'squads/sales/%';
--   DELETE FROM system.agent_profile WHERE source_squad = 'sales';
--   DROP INDEX IF EXISTS system.idx_agent_profile_source_squad;
--   ALTER TABLE system.agent_profile DROP COLUMN IF EXISTS source_squad;
--   ALTER TABLE system.agent_profile DROP COLUMN IF EXISTS source_path;
--   -- Reverter constraint (se quiseres remover 'squad_agent' do kind):
--   ALTER TABLE system.agent_profile DROP CONSTRAINT agent_profile_kind_check;
--   ALTER TABLE system.agent_profile ADD CONSTRAINT agent_profile_kind_check
--     CHECK (kind = ANY (ARRAY['persona'::text, 'condo'::text, 'system'::text]));
--
-- Referência: ADR-017 (.claude/strategy/adrs/017-squad-sales-adoption.md)
-- Branch: feat/squad-sales-install · PR #62
-- =============================================================================

-- =============================================================================
-- PARTE 1 — DDL aditiva em system.agent_profile
-- =============================================================================

-- Adicionar coluna source_squad: slug da squad de origem (ex: 'sales')
ALTER TABLE system.agent_profile
  ADD COLUMN IF NOT EXISTS source_squad text;

-- Adicionar coluna source_path: path relativo do ficheiro markdown fonte
ALTER TABLE system.agent_profile
  ADD COLUMN IF NOT EXISTS source_path text;

-- Index para query "todos os agents de uma squad"
-- Ex: SELECT * FROM system.agent_profile WHERE source_squad = 'sales';
CREATE INDEX IF NOT EXISTS idx_agent_profile_source_squad
  ON system.agent_profile (source_squad)
  WHERE source_squad IS NOT NULL;

COMMENT ON COLUMN system.agent_profile.source_squad IS
  'Slug da squad de origem (ex: ''sales'', ''marketing''). NULL = agent nativo da plataforma.';

COMMENT ON COLUMN system.agent_profile.source_path IS
  'Path relativo no repositório para o ficheiro markdown do agent (ex: squads/sales/agents/neil-rackham.md).';

-- =============================================================================
-- PARTE 1b — Expandir agent_profile_kind_check para incluir 'squad_agent'
-- Constraint actual: kind IN ('persona', 'condo', 'system')
-- Squad agents são categoria nova (não persona individual, não condo, não system)
-- Aditivo: não remove valores existentes, só adiciona 'squad_agent'
-- =============================================================================

ALTER TABLE system.agent_profile
  DROP CONSTRAINT IF EXISTS agent_profile_kind_check;

ALTER TABLE system.agent_profile
  ADD CONSTRAINT agent_profile_kind_check
  CHECK (kind = ANY (ARRAY['persona'::text, 'condo'::text, 'system'::text, 'squad_agent'::text]));

-- =============================================================================
-- PARTE 2 — SEED system.agent_profile (9 rows — squad Sales)
-- Idempotência: ON CONFLICT (agent_id) DO NOTHING
-- agent_id usa prefixo 'sales.' para namespace limpo, sem colidir com agents nativos
-- =============================================================================

INSERT INTO system.agent_profile
  (agent_id, name, role, tagline, tier, model, kind, status, description, source_squad, source_path)
VALUES
  -- Orchestrador
  (
    'sales.sales_chief',
    'Sales Chief',
    'Sales Squad Orchestrator',
    '8 elite sales minds. One diagnostic system. The right framework for every deal.',
    'orchestrator',
    'claude-sonnet-4-6',
    'squad_agent',
    'active',
    'Orquestrador do Sales Squad. Diagnostica a situação de vendas e encaminha para o especialista correcto com base em 6 dimensões (nicho, fase, complexidade, problema, buyer, urgência). Entry point para todas as operações de vendas.',
    'sales',
    'squads/sales/agents/sales-chief.md'
  ),
  -- Tier 0 — Diagnosis
  (
    'sales.neil_rackham',
    'Neil Rackham',
    'SPIN Selling Diagnostician',
    'The best sellers are not the best talkers -- they are the best questioners.',
    'tier_0_diagnosis',
    'claude-sonnet-4-6',
    'squad_agent',
    'active',
    'SPIN Selling — discovery e qualificação consultiva. 35.000 calls analisadas. Framework: Situation, Problem, Implication, Need-Payoff. Especialista em complex B2B discovery e desenvolvimento de needs implícitas → explícitas.',
    'sales',
    'squads/sales/agents/neil-rackham.md'
  ),
  -- Tier 1 — Masters
  (
    'sales.david_sandler',
    'David Sandler',
    'Sandler Selling System',
    'The Pain Funnel -- systematically uncovers real pain until the prospect sells themselves.',
    'tier_1_master',
    'claude-sonnet-4-6',
    'squad_agent',
    'active',
    'Sandler Submarine System — processo de vendas completo com qualificação forte. 7 passos: Bonding, Upfront Contract, Pain, Budget, Decision, Fulfillment, Post-Sell. Especialista em deals que estagnam por qualificação fraca.',
    'sales',
    'squads/sales/agents/david-sandler.md'
  ),
  (
    'sales.keenan',
    'Keenan',
    'Gap Selling Specialist',
    'If there is no gap, there is no sale.',
    'tier_1_master',
    'claude-sonnet-4-6',
    'squad_agent',
    'active',
    'Gap Selling — venda centrada no problema. Framework: Current State → Future State → The Gap (= urgência de compra). Especialista em SaaS B2B e deals onde o buyer diz "estamos bem com o que temos".',
    'sales',
    'squads/sales/agents/keenan.md'
  ),
  (
    'sales.chris_voss',
    'Chris Voss',
    'Tactical Empathy Negotiator',
    'Tactical empathy and calibrated questions that disarm resistance without conceding.',
    'tier_1_master',
    'claude-sonnet-4-6',
    'squad_agent',
    'active',
    'Never Split the Difference — negociação de alto risco. Ferramentas: Mirroring, Labeling, Calibrated Questions, Accusation Audit. Especialista em objecções de preço, deals parados e negociação com procurement.',
    'sales',
    'squads/sales/agents/chris-voss.md'
  ),
  -- Tier 2 — Systematizers
  (
    'sales.challenger',
    'Challenger Sale',
    'Enterprise Insight Seller',
    'Teach the buyer something new about their own business.',
    'tier_2_systematizer',
    'claude-sonnet-4-6',
    'squad_agent',
    'active',
    'The Challenger Sale (Dixon & Adamson) — Teach-Tailor-Take Control. Pesquisa de 6.000 reps. Especialista em enterprise com 5+ stakeholders, mercados commoditizados, e mobilização de consenso interno.',
    'sales',
    'squads/sales/agents/challenger-sale.md'
  ),
  (
    'sales.jeb_blount',
    'Jeb Blount',
    'Fanatical Prospector',
    'Multi-channel prospecting discipline combined with emotional intelligence.',
    'tier_2_systematizer',
    'claude-sonnet-4-6',
    'squad_agent',
    'active',
    'Fanatical Prospecting + Sales EQ — pipeline e prospecção multi-canal. Lei dos 30 dias, Golden Hours, Triple-Touch Sequence. Especialista em pipeline vazio e cadências de outreach (telefone + email + social).',
    'sales',
    'squads/sales/agents/jeb-blount.md'
  ),
  (
    'sales.chet_holmes',
    'Chet Holmes',
    'Ultimate Sales Machine Builder',
    'Pigheaded discipline applied to the 12 key areas of an unstoppable sales machine.',
    'tier_2_systematizer',
    'claude-sonnet-4-6',
    'squad_agent',
    'active',
    'Ultimate Sales Machine — sistematização de vendas e Dream 100. 12 estratégias-chave. Stadium Pitch para education-based marketing. Especialista em construir máquinas de vendas escaláveis e targeting de best buyers.',
    'sales',
    'squads/sales/agents/chet-holmes.md'
  ),
  -- Tier 3 — Specialists
  (
    'sales.aaron_ross',
    'Aaron Ross',
    'Predictable Revenue Architect',
    'Built the outbound engine that added $100M ARR to Salesforce.',
    'tier_3_specialist',
    'claude-sonnet-4-6',
    'squad_agent',
    'active',
    'Predictable Revenue + Cold Calling 2.0 — motor de outbound e especialização SDR/AE. 3 tipos de leads: Seeds, Nets, Spears. Especialista em escalar de founder-led sales para equipa estruturada com receita previsível.',
    'sales',
    'squads/sales/agents/aaron-ross.md'
  )
ON CONFLICT (agent_id) DO NOTHING;

-- =============================================================================
-- PARTE 3 — SEED system.skills (9 tasks, category='sales')
-- Idempotência: ON CONFLICT (slug) DO NOTHING (constraint skills_slug_key existe)
-- Slugs com prefixo 'sales-' para namespace limpo
-- =============================================================================

INSERT INTO system.skills
  (name, slug, description, category, code_ref, status, owner_employee_id, visibility, verticals_scope, connectors, context_files, auto_generated)
VALUES
  (
    'Diagnose Deal',
    'sales-diagnose-deal',
    'Diagnóstico completo do deal usando Sales Chief + routing para especialista correcto. Avalia 6 dimensões: nicho, fase do ciclo, complexidade, tipo de problema, perfil do buyer, urgência.',
    'sales',
    'squads/sales/tasks/diagnose-deal.md',
    'active',
    'sales.sales_chief',
    'team',
    '{*}',
    '{}',
    '[]',
    false
  ),
  (
    'Qualify Prospect',
    'sales-qualify-prospect',
    'Qualificação de prospect usando SPIN (Neil Rackham) + Gap Selling (Keenan) + Sandler Pain Funnel. Output: score de qualificação 0-42 + veredicto A/B/C/D + acções correctivas.',
    'sales',
    'squads/sales/tasks/qualify-prospect.md',
    'active',
    'sales.sales_chief',
    'team',
    '{*}',
    '{}',
    '[]',
    false
  ),
  (
    'Create Cold Outreach',
    'sales-create-cold-outreach',
    'Criação de sequências de cold outreach usando Aaron Ross Cold Calling 2.0 + Chet Holmes Dream 100. Inclui email, LinkedIn e telefone. Adaptado por nicho (SaaS SMB, enterprise, serviços, infoproduto).',
    'sales',
    'squads/sales/tasks/create-cold-outreach.md',
    'active',
    'sales.aaron_ross',
    'team',
    '{*}',
    '{}',
    '[]',
    false
  ),
  (
    'Negotiate Deal',
    'sales-negotiate-deal',
    'Preparação e execução de negociação usando Chris Voss Tactical Empathy. Ferramentas: Mirroring, Labeling, Calibrated Questions, Accusation Audit. Inclui defesa de preço e gestão de procurement.',
    'sales',
    'squads/sales/tasks/negotiate-deal.md',
    'active',
    'sales.chris_voss',
    'team',
    '{*}',
    '{}',
    '[]',
    false
  ),
  (
    'Close Deal',
    'sales-close-deal',
    'Metodologia de fecho usando David Sandler Submarine System. Post-Sell incluído para prevenir buyer''s remorse. Adaptado por tipo de deal: transaccional, mid-market, enterprise.',
    'sales',
    'squads/sales/tasks/close-deal.md',
    'active',
    'sales.david_sandler',
    'team',
    '{*}',
    '{}',
    '[]',
    false
  ),
  (
    'Create Followup Sequence',
    'sales-create-followup',
    'Criação de sequências de follow-up multi-estágio para deals em qualquer fase do pipeline. Inclui templates por situação: post-demo, post-proposal, stalled deal, ghosted prospect.',
    'sales',
    'squads/sales/tasks/create-followup-sequence.md',
    'active',
    'sales.sales_chief',
    'team',
    '{*}',
    '{}',
    '[]',
    false
  ),
  (
    'Create Email Sequences',
    'sales-create-email-sequences',
    'Criação de sequências de email marketing: nurture, launch, cart abandonment, onboarding, upsell. Frameworks: Chet Holmes Stadium Pitch + Jeb Blount Fanatical Prospecting adaptado para email.',
    'sales',
    'squads/sales/tasks/create-email-sequences.md',
    'active',
    'sales.chet_holmes',
    'team',
    '{*}',
    '{}',
    '[]',
    false
  ),
  (
    'Create Sales Copy',
    'sales-create-sales-copy',
    'Criação de copy de vendas: sales page, VSL, webinar script, proposta comercial, landing page. Baseado em frameworks comprovados de persuasão e estrutura narrativa de vendas.',
    'sales',
    'squads/sales/tasks/create-sales-copy.md',
    'active',
    'sales.chet_holmes',
    'team',
    '{*}',
    '{}',
    '[]',
    false
  ),
  (
    'Create Sales Scripts',
    'sales-create-sales-scripts',
    'Criação de scripts de vendas: discovery call, demo, closing call, gestão de objecções, DMs, triagem. Inclui variantes por nicho e fase do ciclo. Baseado em todos os 8 frameworks da squad.',
    'sales',
    'squads/sales/tasks/create-sales-scripts.md',
    'active',
    'sales.sales_chief',
    'team',
    '{*}',
    '{}',
    '[]',
    false
  )
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- PARTE 4 — SEED system.context_docs (2 checklists)
-- Idempotência: INSERT ... SELECT ... WHERE NOT EXISTS
-- Nota: ON CONFLICT (source_url) NÃO funciona com índice único parcial
--   (WHERE source_url IS NOT NULL). Postgres exige índice único TOTAL.
-- Solução: usar SELECT + WHERE NOT EXISTS — mesmo comportamento, sintaxe compatível.
-- O índice parcial é mantido só para evitar duplicados acidentais.
-- =============================================================================

-- Criar índice único parcial para evitar duplicados acidentais por source_url
-- (só para rows com source_url preenchido — não afecta rows existentes com source_url NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_context_docs_source_url_unique
  ON system.context_docs (source_url)
  WHERE source_url IS NOT NULL;

-- Checklist 1: Deal Qualification (14 items)
INSERT INTO system.context_docs
  (employee_id, title, type, source_url, content, tags, folder_path, file_name, is_folder)
SELECT
  NULL,
  'Deal Qualification Checklist (14 items)',
  'never_rule',
  'squads/sales/checklists/deal-qualification-checklist.md',
    '# Deal Qualification Checklist

**Purpose:** Verificar se um deal está qualificado para avançar no pipeline
**Used by:** sales-chief, neil-rackham, david-sandler, keenan
**Scoring:** 0-3 per item (0=absent, 1=weak, 2=adequate, 3=strong)
**Pass threshold:** >= 21/30 (70%) = Qualified, 15-20 = Conditional, <15 = Disqualify

## 1. Pain Identification (Neil Rackham / Keenan)
- 1.1 Problem identified (0-3): Prospect articulated a specific business problem
- 1.2 Implications developed (0-3): Consequences of not solving are quantified ($/time/risk)
- 1.3 Personal pain (0-3): Individual stakeholder has personal stake (career, stress, reputation)

## 2. Gap Quantification (Keenan)
- 2.1 Current State mapped (0-3): Clear picture of how things work today
- 2.2 Future State defined (0-3): Prospect articulated what "solved" looks like
- 2.3 Gap quantified (0-3): Dollar/time value of the gap calculated

## 3. Budget (David Sandler)
- 3.1 Budget range confirmed (0-3): Prospect shared investment range
- 3.2 Funding source identified (0-3): Know where the money comes from
- 3.3 ROI justified (0-3): Investment vs. cost-of-problem ratio >= 3:1

## 4. Decision Process (David Sandler)
- 4.1 Decision maker identified (0-3): Know who signs (name + title)
- 4.2 Decision process mapped (0-3): Know the steps, timeline, and who else is involved
- 4.3 Champion confirmed (0-3): Internal advocate who will sell when you are not in the room

## 5. Competitive Position
- 5.1 Differentiator clear (0-3): Prospect understands why us vs. alternatives
- 5.2 Status quo addressed (0-3): Cost of doing nothing > cost of change

## Scoring: A (28-42 fast-track) | B (21-27 proceed) | C (15-20 gaps) | D (<15 disqualify)',
  ARRAY['sales', 'qualification', 'checklist'],
  'squads/sales/checklists',
  'deal-qualification-checklist.md',
  false
WHERE NOT EXISTS (
  SELECT 1 FROM system.context_docs
  WHERE source_url = 'squads/sales/checklists/deal-qualification-checklist.md'
);

-- Checklist 2: Discovery Quality (13 items)
INSERT INTO system.context_docs
  (employee_id, title, type, source_url, content, tags, folder_path, file_name, is_folder)
SELECT
  NULL,
  'Discovery Quality Checklist (13 items)',
  'never_rule',
  'squads/sales/checklists/discovery-quality-checklist.md',
    '# Discovery Quality Checklist

**Purpose:** Avaliar a qualidade de uma discovery call usando frameworks SPIN + Gap Selling
**Used by:** neil-rackham, keenan, sales-chief
**Scoring:** 0-3 per item (0=not done, 1=superficial, 2=adequate, 3=excellent)
**Pass threshold:** >= 24/36 (67%) = Good Discovery, 18-23 = Needs Work, <18 = Redo

## 1. Preparation (Pre-Call)
- 1.1 Company research done (0-3): Industry, size, recent news, tech stack known
- 1.2 Stakeholder research done (0-3): Role, tenure, LinkedIn insights, likely priorities
- 1.3 Hypothesis prepared (0-3): 2-3 problem hypotheses based on research

## 2. SPIN Execution (Neil Rackham)
- 2.1 Situation questions limited (0-3): Max 3-4 situation questions (not interrogation)
- 2.2 Problem questions asked (0-3): At least 2 problems uncovered from prospect perspective
- 2.3 Implication questions developed (0-3): Each problem explored 2+ layers deep (consequences)
- 2.4 Need-Payoff questions used (0-3): Prospect articulated value of solving (in their words)

## 3. Gap Analysis (Keenan)
- 3.1 Current State articulated (0-3): Prospect described how they do things today
- 3.2 Impact quantified (0-3): Numbers attached to the problem (cost, time, risk)
- 3.3 Future State envisioned (0-3): Prospect described what success looks like
- 3.4 Emotional connection made (0-3): Personal impact acknowledged (not just metrics)

## 4. Call Management
- 4.1 Talk ratio appropriate (0-3): Rep talked < 40% (prospect > 60%)
- 4.2 Next step secured (0-3): Concrete advance (not just "let us stay in touch")

## Scoring: Excellent (30-42) | Good (24-29) | Needs Work (18-23) | Redo (<18)',
  ARRAY['sales', 'discovery', 'checklist', 'spin'],
  'squads/sales/checklists',
  'discovery-quality-checklist.md',
  false
WHERE NOT EXISTS (
  SELECT 1 FROM system.context_docs
  WHERE source_url = 'squads/sales/checklists/discovery-quality-checklist.md'
);

-- =============================================================================
-- VALIDATION QUERIES — Correr DEPOIS de aplicar para confirmar
-- =============================================================================
-- 1. Confirmar colunas adicionadas:
--    SELECT column_name, data_type
--    FROM information_schema.columns
--    WHERE table_schema='system' AND table_name='agent_profile'
--      AND column_name IN ('source_squad','source_path');
--    -- Esperado: 2 rows
--
-- 2. Confirmar 9 agents da squad sales:
--    SELECT agent_id, name, tier, status
--    FROM system.agent_profile
--    WHERE source_squad = 'sales'
--    ORDER BY tier, name;
--    -- Esperado: 9 rows
--
-- 3. Confirmar 9 skills com category='sales':
--    SELECT slug, name, status, code_ref
--    FROM system.skills
--    WHERE category = 'sales'
--    ORDER BY slug;
--    -- Esperado: 9 rows
--
-- 4. Confirmar 2 checklists em context_docs:
--    SELECT title, type, tags, source_url
--    FROM system.context_docs
--    WHERE 'sales' = ANY(tags)
--    ORDER BY title;
--    -- Esperado: 2 rows
--
-- 5. Confirmar idempotência (correr 2x):
--    -- Re-correr esta migration inteira deve produzir 0 erros e 0 inserts novos
-- =============================================================================
