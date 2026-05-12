---
id: ADR-V4-001
title: Motor BD-driven + Ingestão ERSE/OMIE — V4 Energia
date: 2026-05-12
status: Aceite
deciders: [architect-proptech, mario]
sprint: feat/v4-data-layer
vertical: V4 Energia
---

# ADR-V4-001 · Motor BD-driven + Ingestão ERSE/OMIE

## Estado

**Aceite** — decisão tomada pelo Mário em 2026-05-12, conforme plano aprovado em `.claude/plans/diz-me-o-que-est-groovy-taco.md`.

---

## Contexto

A V4 Energia tem app React funcional e lead capture operacional (7 contratos em pipeline). O motor de comparação tarifária (`apps/v4-energia/src/lib/motor.js`) usa TAR 2026 ERSE e spreads dos 8 comercializadores completamente hardcoded em JavaScript. A tabela `v4_energia.tarifas` existe no Supabase (`hkmvszkpxjbxmnixzqbl`) mas está vazia — o motor ignora-a totalmente.

Este desacoplamento tem dois problemas concretos:

1. **Actualização de preços exige re-deploy** — mudar um spread obriga a editar código, commitar e fazer deploy, o que é inaceitável para dados de mercado que mudam mensalmente.
2. **Sem suporte a tarifas indexadas** — o mercado OMIE DAM (preço horário) está a crescer; sem tabela própria não é possível calcular propostas indexadas.

A análise competitiva (Notion `34284147-fa60-8177-a35c-ef819dd16cac`) confirma que o Manie e o Trafero já têm dados actualizados automaticamente. O nosso USP (contexto condomínio + desconto grupo) só é defensável se os preços base forem correctos.

Este ADR decide a arquitectura do data layer de tarifas, o modelo de ingestão automática e o alinhamento do design system.

---

## Decisão

### 1. Motor passa a ser BD-driven (async)

O `motor.js` é refactorizado para função `async calcularPropostas(kwh, kva, segmento)` que:

- Chama `fetchTarifasActivas()` em `v4_energia.tarifas` (filtrada por `ativo = true`, `data_inicio_validade <= now()`, `data_fim_validade IS NULL OR data_fim_validade > now()`, segmento de potência aplicável)
- Mantém a fórmula TAR 2026 ERSE inalterada (regulatório — não muda com spreads)
- Usa **fallback hardcoded** se a BD devolver 0 rows (protecção operacional para produção)
- Ordena propostas por poupança (menor custo mensal primeiro)

**Analogia contabilística:** é como ter os preços de custo numa folha de obra em vez de escritos à mão no orçamento — a fórmula do IVA não muda, mas os valores base vêm de um registo central actualizável.

### 2. Extensão de `v4_energia.tarifas` (ALTER TABLE)

A tabela existente tem estrutura básica (`comercializador_id`, `nome_plano`, `preco_kwh`, `valida_desde`, `valida_ate`, `activa`). Adicionam-se as colunas em falta para suportar o mercado real:

```sql
ALTER TABLE v4_energia.tarifas
  ADD COLUMN tipo_energia      TEXT NOT NULL DEFAULT 'electricidade'
    CHECK (tipo_energia IN ('electricidade', 'gas')),
  ADD COLUMN tipo_tarifa       TEXT NOT NULL DEFAULT 'simples'
    CHECK (tipo_tarifa IN ('simples', 'bi_horaria', 'tri_horaria', 'indexada')),
  ADD COLUMN tipo_oferta       TEXT NOT NULL DEFAULT 'fixa'
    CHECK (tipo_oferta IN ('fixa', 'indexada', 'promocional', 'verde')),
  ADD COLUMN tensao            TEXT NOT NULL DEFAULT 'BTN'
    CHECK (tensao IN ('BTN', 'BTE')),
  ADD COLUMN periodo_horario   TEXT NOT NULL DEFAULT 'simples'
    CHECK (periodo_horario IN ('simples', 'ponta', 'cheia', 'vazio', 'super_vazio')),
  ADD COLUMN potencia_kva_min  NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN potencia_kva_max  NUMERIC(6,2) NOT NULL DEFAULT 999,
  ADD COLUMN data_inicio_validade TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN data_fim_validade    TIMESTAMPTZ,
  ADD COLUMN ativo             BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN fonte_ingestao    TEXT DEFAULT 'manual'
    CHECK (fonte_ingestao IN ('manual', 'erse_scraper', 'api_parceiro')),
  ADD COLUMN hash_conteudo     TEXT;   -- SHA-256 do payload ingerido (deduplicação)

-- Renomear campos para consistência com convenção canónica do projecto
-- (valida_desde / valida_ate passam a ser cobertos por data_inicio_validade / data_fim_validade)
-- Manter valida_desde e valida_ate como colunas legacy durante período de transição

-- Índices
CREATE INDEX idx_tarifas_ativo_validade
  ON v4_energia.tarifas (ativo, data_inicio_validade, data_fim_validade)
  WHERE ativo = true;

CREATE INDEX idx_tarifas_comercializador_tipo
  ON v4_energia.tarifas (comercializador_id, tipo_energia, tipo_tarifa, tensao);

CREATE INDEX idx_tarifas_potencia_range
  ON v4_energia.tarifas (potencia_kva_min, potencia_kva_max);
```

**Nota sobre campos existentes:** `valida_desde` (DATE) e `valida_ate` (DATE) permanecem sem alteração para não quebrar queries existentes. As novas colunas `data_inicio_validade` / `data_fim_validade` (TIMESTAMPTZ) são o campo canónico para ingestão automática. Numa migration futura (pós-Fase 2 estabilizada) os campos legacy serão removidos.

### 3. Nova tabela `v4_energia.omie_dam_horario`

Para suporte a tarifas indexadas (OMIE DAM — Mercado Diário Ibérico de Electricidade):

```sql
CREATE TABLE v4_energia.omie_dam_horario (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data            DATE NOT NULL,
  hora            SMALLINT NOT NULL CHECK (hora BETWEEN 0 AND 23),
  preco_eur_mwh   NUMERIC(10,4) NOT NULL,  -- 4 casas: precisão OMIE é 2 mas margem de segurança
  zona            TEXT NOT NULL DEFAULT 'PT'
    CHECK (zona IN ('PT', 'ES')),           -- preparar futuro expansão ES
  created_at      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_omie_data_hora_zona UNIQUE (data, hora, zona)
);

-- RLS: staff pode ler e escrever; anon e condómino só leitura
ALTER TABLE v4_energia.omie_dam_horario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_all_omie" ON v4_energia.omie_dam_horario
  FOR ALL TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

CREATE POLICY "public_read_omie" ON v4_energia.omie_dam_horario
  FOR SELECT TO anon, authenticated
  USING (true);

-- Índices
CREATE INDEX idx_omie_data_desc ON v4_energia.omie_dam_horario (data DESC);
CREATE INDEX idx_omie_data_zona ON v4_energia.omie_dam_horario (data, zona);
```

**O que é o OMIE DAM:** o Operador do Mercado Ibérico de Energia publica diariamente, às 12h30 UTC, os preços por hora para o mercado PT e ES. As tarifas "indexadas" que os comercializadores oferecem (ex: Coopernico Verde Indexado) baseia-se directamente nestes preços. Sem esta tabela não é possível calcular propostas indexadas.

### 4. Seed inicial de `v4_energia.comercializadores` e `v4_energia.tarifas`

Os 8 comercializadores em `acordos_comercializadoras` são migrados para `comercializadores` (catálogo) e cada um recebe 1 tarifa simples em `tarifas` com os spreads actuais. Isto garante que o motor BD-driven produz resultados idênticos ao motor hardcoded actual no dia D.

```sql
-- Seed comercializadores (8 actuais da acordos_comercializadoras)
INSERT INTO v4_energia.comercializadores (nome, activo) VALUES
  ('Eni Plenitude', true),
  ('Luzboa', true),
  ('Ibelectra', true),
  ('Goldenergy', true),
  ('Coopernico', true),
  ('Endesa', true),
  ('Galp Power', true),
  ('EDP Comercial', true);

-- Seed tarifas (1 plano simples por comercializador, spreads do Notion estratégico)
-- Executado por supabase-designer com UUIDs reais após INSERT comercializadores
-- preco_kwh = TAR_ENERGIA (0.0689) + spread_kwh (da acordos_comercializadoras)
-- Exemplo: Eni Plenitude → 0.0689 + 0.0600 = 0.1289 €/kWh total
```

### 5. Edge Functions de ingestão automática

#### `v4-ingest-erse` (semanal — Domingo 03h00 Lisboa)

Localização: `apps/v5-manutencao/supabase/functions/v4-ingest-erse/index.ts`

**Racional de localização:** as Edge Functions partilham infra com V5 manutenção (projecto `hkmvszkpxjbxmnixzqbl`). Não existe projecto Supabase separado para V4. Esta é a convenção estabelecida — todas as Edge Functions vivem em `apps/v5-manutencao/supabase/functions/`.

**Lógica:**
1. Fetch HTML de `https://www.precoenergia.pt/` (simulador ERSE público — sem autenticação, dados públicos)
2. Parse DOM: extrair tabela de tarifas por comercializador/potência/ciclo
3. Para cada tarifa encontrada:
   - Calcular `hash_conteudo = SHA-256(comercializador + plano + preco + validade)`
   - Se hash já existe em `v4_energia.tarifas` → skip (sem duplicado)
   - Se hash novo → INSERT com `data_inicio_validade = now()`, `fonte_ingestao = 'erse_scraper'`
   - Marcar tarifas antigas do mesmo comercializador/tipo como `ativo = false`
4. Audit log em `core.audit_log`: `{ fonte: 'v4-ingest-erse', rows_ingeridas: N, hash_pagina: X }`
5. Se `rows_ingeridas < 5` → INSERT em `system.inbox_items` com `tipo = 'alerta'`, `titulo = 'ERSE scraper retornou < 5 tarifas'`, `destinatario = 'mario'`

**Schedule:** `0 3 * * 0` (Domingo 03h00 UTC+0 = 03h00-04h00 Lisboa conforme DST)

#### `v4-ingest-omie` (diário — 13h00 Lisboa)

Localização: `apps/v5-manutencao/supabase/functions/v4-ingest-omie/index.ts`

**Lógica:**
1. Fetch endpoint público OMIE: `https://www.omie.es/en/file-download-list?parents[]=marginalpdbc` (ficheiro CSV diário DAM Portugal)
2. Parse CSV: extrair 24 rows (hora 0-23) com `preco_eur_mwh`
3. Upsert em `v4_energia.omie_dam_horario` com `ON CONFLICT (data, hora, zona) DO NOTHING` (idempotente)
4. Audit log em `core.audit_log`
5. Se 2 dias consecutivos sem rows novas → alerta em `system.inbox_items`

**Schedule:** `0 13 * * *` (13h00 Lisboa — após publicação DAM às 12h30 UTC)

**Nota de risco:** O endpoint OMIE é público mas a estrutura do ficheiro pode mudar. O scraper ERSE é zona cinzenta legal (scraping de dados regulatórios públicos). Ambos devem ter testes de contrato que alertam se o schema do response mudar.

### 6. Alinhamento design system V4 com v1-core

Substituir `apps/v4-energia/src/styles/tokens.css` pelos tokens canónicos definidos em CLAUDE.md:
- Cores: `--blue: #1a5296`, `--green: #2d6a4f`, `--gold: #8c6508`, `--red: #8b1a1a`
- Tipografia: Inter (body) + JetBrains Mono (números, labels, badges)
- Dark mode persistente em `localStorage.v1theme` (chave partilhada com v1-core)
- Remover todas as referências a amber/teal

Esta decisão é de alinhamento de plataforma, não de preferência visual — a V4 faz parte do mesmo ecossistema que V1 e V5 e o utilizador não deve sentir mudança de contexto visual.

---

## Alternativas consideradas

### A — Motor continua hardcoded, spreads actualizados por deploy mensal

**Rejeitada.** Actualizar spreads exige ciclo completo de código (editar JS, commitar, PR, deploy). Com 8 comercializadores e actualizações mensais, o risco de erro e o custo operacional acumulam rapidamente. Não escala para mais comercializadores. Rejeitada por insustentabilidade operacional.

### B — Motor BD-driven mas sem ingestão automática (seed manual)

**Rejeitada como solução permanente, aceitável como estado transitório.** A Fase 1 (motor BD-driven + seed manual) é necessária como pré-requisito da Fase 2. Mas parar aqui significa que os preços ficam desactualizados em semanas, e o Manie actualiza em tempo real. Rejeitada como destino final; aceite como estado intermédio durante construção da Fase 2.

### C — Usar API directa das comercializadoras (após acordo de parceria)

**Não disponível agora.** Requer 3-6 meses de negociação com Eni, Ibelectra, Luzboa. É o estado ideal (Fase 3 do Notion) mas não pode bloquear a data layer actual. A arquitectura proposta é compatível com esta evolução — `fonte_ingestao = 'api_parceiro'` já está previsto.

### D — Comprar feed de dados de tarifas de terceiro (agregador)

**Rejeitada por custo e dependência.** Não existe agregador PT/ES confiável a custo razoável para este volume. O ERSE disponibiliza dados públicos gratuitamente via `precoenergia.pt`. Dependência de terceiro para dados regulatórios é risco desnecessário.

### E — Manter tokens amber/teal em V4 (identidade visual diferenciada por vertical)

**Rejeitada.** O custo de manutenção de dois design systems é superior ao benefício de diferenciação visual por vertical. A plataforma é uma, o utilizador é o mesmo — consistência visual reduz confusão. Amber/teal são tokens não canónicos que não estão definidos em CLAUDE.md.

---

## Consequências

### Positivas

- Actualizar preços em produção passa a ser um `UPDATE v4_energia.tarifas SET ativo = false WHERE ...` seguido de INSERT — sem deploy, sem código
- A ingestão semanal ERSE garante que os spreads reflectem o mercado real (actualmente os spreads hardcoded têm mais de 1 mês)
- A tabela `omie_dam_horario` habilita propostas indexadas (Coopernico Verde Indexado, Endesa Indexada) que representam ~15-20% do mercado e crescem
- O fallback hardcoded protege a produção: se a BD estiver vazia (primeira instalação ou falha de ingestão), o simulador continua a funcionar com valores conservadores
- Alinhamento design elimina divergência entre V4 e o resto da plataforma

### Negativas / Riscos

- O scraper ERSE (`precoenergia.pt`) é zona cinzenta legal — dados públicos mas sem API oficial. Se o HTML mudar, a ingestão falha silenciosamente sem os testes de contrato
- O endpoint OMIE é público mas a estrutura do ficheiro CSV pode mudar a qualquer momento (OMIE publica changelog com pouco aviso)
- A migração ALTER TABLE numa tabela com RLS activo requer atenção às policies existentes — os índices novos não afectam RLS mas as colunas adicionadas precisam de verificação nas policies `staff_all` e `public_read`
- `calcularPropostas()` torna-se async — todos os componentes React que chamam `runMotor()` precisam de actualização para `await calcularPropostas()`, o que implica refactor nos componentes `ClienteSimulator.jsx` e potencialmente `StaffLeads.jsx`

### Cross-vertical — análise obrigatória

#### V5 Manutenção pode consumir `v4_energia.omie_dam_horario`?

**Sim, com condições.** Os custos de energia das partes comuns de condomínios (elevadores, iluminação, bombas) são relevantes para orçamentos de manutenção. A tabela `omie_dam_horario` pode ser consultada pela V5 para estimar custos de energia em orçamentos de obras. A RLS `public_read_omie` já permite leitura por qualquer utilizador autenticado, pelo que não há bloqueio técnico. A integração deve ser feita pela V5 quando necessária — não requer alteração de schema agora.

**Recomendação:** nenhuma acção imediata. Registar em `opportunities.md` para sprint V5 futuro.

#### V2 Condomínios precisa de `v4_energia.tarifas` para dashboard energia?

**Potencialmente sim, mas não neste sprint.** O `v2_condominios.contratos` (tabela de contratos do edifício) tem `preco_kwh` e `comercializador_id`. Uma vista de comparação "tarifa actual vs. melhor tarifa disponível" seria valiosa para o administrador do condomínio. No entanto, V2 produção é `eozklslwfaqujaijvdnl` (instância separada) e V4 tarifas vivem em `hkmvszkpxjbxmnixzqbl`. A query cross-instância não é possível directamente em Supabase — exigiria Edge Function intermediária.

**Recomendação:** nenhuma acção imediata. Quando V2 migrar para V1 Core Hub, a integração torna-se trivial. Registar como oportunidade.

#### V10 Owners Club tem caso de uso para preços energia?

**Sim, futuro.** O Owners Club é o programa de fidelidade — poderá incluir benefício "melhor tarifa garantida" para membros. Requer acordos com comercializadoras (Fase 3 do roadmap V4). Não há acção técnica agora. A arquitectura proposta é compatível — `tipo_oferta = 'promocional'` em `tarifas` pode ser filtrado para ofertas exclusivas de clube.

**Recomendação:** nenhuma acção imediata.

---

## Spec de Migration SQL completa

Ficheiro a criar: `apps/v5-manutencao/supabase/migrations/20260512_v4_data_layer.sql`

```sql
-- ============================================================
-- ADR-V4-001: Motor BD-driven + Ingestão ERSE/OMIE
-- Data: 2026-05-12
-- Projecto: hkmvszkpxjbxmnixzqbl (V1 Core Hub)
-- ============================================================

-- 1. EXTENSÃO DE v4_energia.tarifas
-- -----------------------------------------------------------
ALTER TABLE v4_energia.tarifas
  ADD COLUMN IF NOT EXISTS tipo_energia TEXT NOT NULL DEFAULT 'electricidade'
    CONSTRAINT ck_tarifas_tipo_energia
    CHECK (tipo_energia IN ('electricidade', 'gas')),

  ADD COLUMN IF NOT EXISTS tipo_tarifa TEXT NOT NULL DEFAULT 'simples'
    CONSTRAINT ck_tarifas_tipo_tarifa
    CHECK (tipo_tarifa IN ('simples', 'bi_horaria', 'tri_horaria', 'indexada')),

  ADD COLUMN IF NOT EXISTS tipo_oferta TEXT NOT NULL DEFAULT 'fixa'
    CONSTRAINT ck_tarifas_tipo_oferta
    CHECK (tipo_oferta IN ('fixa', 'indexada', 'promocional', 'verde')),

  ADD COLUMN IF NOT EXISTS tensao TEXT NOT NULL DEFAULT 'BTN'
    CONSTRAINT ck_tarifas_tensao
    CHECK (tensao IN ('BTN', 'BTE')),

  ADD COLUMN IF NOT EXISTS periodo_horario TEXT NOT NULL DEFAULT 'simples'
    CONSTRAINT ck_tarifas_periodo_horario
    CHECK (periodo_horario IN ('simples', 'ponta', 'cheia', 'vazio', 'super_vazio')),

  ADD COLUMN IF NOT EXISTS potencia_kva_min NUMERIC(6,2) NOT NULL DEFAULT 0
    CONSTRAINT ck_tarifas_potencia_min CHECK (potencia_kva_min >= 0),

  ADD COLUMN IF NOT EXISTS potencia_kva_max NUMERIC(6,2) NOT NULL DEFAULT 999
    CONSTRAINT ck_tarifas_potencia_max CHECK (potencia_kva_max > 0),

  ADD COLUMN IF NOT EXISTS data_inicio_validade TIMESTAMPTZ NOT NULL DEFAULT now(),

  ADD COLUMN IF NOT EXISTS data_fim_validade TIMESTAMPTZ
    CONSTRAINT ck_tarifas_validade_range
    CHECK (data_fim_validade IS NULL OR data_fim_validade > data_inicio_validade),

  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true,

  ADD COLUMN IF NOT EXISTS fonte_ingestao TEXT DEFAULT 'manual'
    CONSTRAINT ck_tarifas_fonte
    CHECK (fonte_ingestao IN ('manual', 'erse_scraper', 'api_parceiro')),

  ADD COLUMN IF NOT EXISTS hash_conteudo TEXT,

  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Unique constraint para deduplicação por ingestão
ALTER TABLE v4_energia.tarifas
  ADD CONSTRAINT uq_tarifas_hash UNIQUE (hash_conteudo)
  DEFERRABLE INITIALLY DEFERRED;

-- Índices
CREATE INDEX IF NOT EXISTS idx_tarifas_ativo_validade
  ON v4_energia.tarifas (ativo, data_inicio_validade, data_fim_validade)
  WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_tarifas_comercializador_tipo
  ON v4_energia.tarifas (comercializador_id, tipo_energia, tipo_tarifa, tensao);

CREATE INDEX IF NOT EXISTS idx_tarifas_potencia_range
  ON v4_energia.tarifas (potencia_kva_min, potencia_kva_max);


-- 2. NOVA TABELA: v4_energia.omie_dam_horario
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS v4_energia.omie_dam_horario (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data           DATE NOT NULL,
  hora           SMALLINT NOT NULL
    CONSTRAINT ck_omie_hora CHECK (hora BETWEEN 0 AND 23),
  preco_eur_mwh  NUMERIC(10,4) NOT NULL
    CONSTRAINT ck_omie_preco CHECK (preco_eur_mwh >= 0),
  zona           TEXT NOT NULL DEFAULT 'PT'
    CONSTRAINT ck_omie_zona CHECK (zona IN ('PT', 'ES')),
  created_at     TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_omie_data_hora_zona UNIQUE (data, hora, zona)
);

COMMENT ON TABLE v4_energia.omie_dam_horario IS
  'Preços horários OMIE DAM (Mercado Diário Ibérico de Electricidade). '
  'Ingeridos diariamente pela Edge Function v4-ingest-omie às 13h00 Lisboa. '
  'Usados para calcular propostas de tarifas indexadas.';

COMMENT ON COLUMN v4_energia.omie_dam_horario.hora IS
  'Hora UTC (0-23). O OMIE publica em UTC. Converter para Lisboa ao apresentar.';

COMMENT ON COLUMN v4_energia.omie_dam_horario.preco_eur_mwh IS
  'Preço em EUR/MWh. Para converter a EUR/kWh: preco_eur_mwh / 1000.';

ALTER TABLE v4_energia.omie_dam_horario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_all_omie"
  ON v4_energia.omie_dam_horario
  FOR ALL TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

CREATE POLICY "public_read_omie"
  ON v4_energia.omie_dam_horario
  FOR SELECT TO anon, authenticated
  USING (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_omie_data_desc
  ON v4_energia.omie_dam_horario (data DESC);

CREATE INDEX IF NOT EXISTS idx_omie_data_zona
  ON v4_energia.omie_dam_horario (data, zona);


-- 3. SEED: v4_energia.comercializadores (8 actuais)
-- -----------------------------------------------------------
-- Apenas se tabela estiver vazia (idempotente)
INSERT INTO v4_energia.comercializadores (nome, activo)
SELECT * FROM (VALUES
  ('Eni Plenitude',  true),
  ('Luzboa',         true),
  ('Ibelectra',      true),
  ('Goldenergy',     true),
  ('Coopernico',     true),
  ('Endesa',         true),
  ('Galp Power',     true),
  ('EDP Comercial',  true)
) AS v(nome, activo)
WHERE NOT EXISTS (SELECT 1 FROM v4_energia.comercializadores LIMIT 1);


-- 4. SEED: v4_energia.tarifas (1 plano simples por comercializador)
-- -----------------------------------------------------------
-- Executado apenas se tarifas estiver vazia E comercializadores tiver 8 rows
-- preco_kwh = TAR_ENERGIA ERSE 2026 (0.0689) + spread do Notion estratégico
-- Nota: supabase-designer deve confirmar UUIDs e completar este seed
DO $$
DECLARE
  v_eni   UUID;
  v_luz   UUID;
  v_ibe   UUID;
  v_gol   UUID;
  v_cop   UUID;
  v_end   UUID;
  v_gal   UUID;
  v_edp   UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM v4_energia.tarifas LIMIT 1) THEN
    RAISE NOTICE 'Tarifas já têm dados — seed ignorado.';
    RETURN;
  END IF;

  SELECT id INTO v_eni FROM v4_energia.comercializadores WHERE nome = 'Eni Plenitude' LIMIT 1;
  SELECT id INTO v_luz FROM v4_energia.comercializadores WHERE nome = 'Luzboa' LIMIT 1;
  SELECT id INTO v_ibe FROM v4_energia.comercializadores WHERE nome = 'Ibelectra' LIMIT 1;
  SELECT id INTO v_gol FROM v4_energia.comercializadores WHERE nome = 'Goldenergy' LIMIT 1;
  SELECT id INTO v_cop FROM v4_energia.comercializadores WHERE nome = 'Coopernico' LIMIT 1;
  SELECT id INTO v_end FROM v4_energia.comercializadores WHERE nome = 'Endesa' LIMIT 1;
  SELECT id INTO v_gal FROM v4_energia.comercializadores WHERE nome = 'Galp Power' LIMIT 1;
  SELECT id INTO v_edp FROM v4_energia.comercializadores WHERE nome = 'EDP Comercial' LIMIT 1;

  INSERT INTO v4_energia.tarifas
    (comercializador_id, nome_plano, preco_kwh, tipo_energia, tipo_tarifa,
     tipo_oferta, tensao, periodo_horario,
     potencia_kva_min, potencia_kva_max,
     data_inicio_validade, ativo, fonte_ingestao,
     valida_desde)
  VALUES
    -- preco_kwh = TAR 0.0689 + spread (Notion estratégico)
    (v_eni, 'Eni Plenitude Simples BTN', 0.1289, 'electricidade', 'simples', 'fixa', 'BTN', 'simples', 1.15, 41.4,  now(), true, 'manual', CURRENT_DATE),
    (v_luz, 'Luzboa Simples BTN',        0.1319, 'electricidade', 'simples', 'fixa', 'BTN', 'simples', 1.15, 41.4,  now(), true, 'manual', CURRENT_DATE),
    (v_ibe, 'Ibelectra Simples BTN',     0.1379, 'electricidade', 'simples', 'fixa', 'BTN', 'simples', 1.15, 41.4,  now(), true, 'manual', CURRENT_DATE),
    (v_gol, 'Goldenergy Simples BTN',    0.1429, 'electricidade', 'simples', 'fixa', 'BTN', 'simples', 1.15, 41.4,  now(), true, 'manual', CURRENT_DATE),
    (v_cop, 'Coopernico Simples BTN',    0.1399, 'electricidade', 'simples', 'verde', 'BTN', 'simples', 1.15, 41.4, now(), true, 'manual', CURRENT_DATE),
    (v_end, 'Endesa Simples BTN',        0.1509, 'electricidade', 'simples', 'fixa', 'BTN', 'simples', 1.15, 41.4,  now(), true, 'manual', CURRENT_DATE),
    (v_gal, 'Galp Power Simples BTN',    0.1569, 'electricidade', 'simples', 'fixa', 'BTN', 'simples', 1.15, 41.4,  now(), true, 'manual', CURRENT_DATE),
    (v_edp, 'EDP Comercial Simples BTN', 0.1751, 'electricidade', 'simples', 'fixa', 'BTN', 'simples', 1.15, 41.4,  now(), true, 'manual', CURRENT_DATE);

  RAISE NOTICE 'Seed tarifas: 8 planos inseridos.';
END;
$$;


-- 5. CRON SCHEDULES (via Supabase Dashboard ou pg_cron)
-- -----------------------------------------------------------
-- v4-ingest-erse: Domingo 03h00 UTC
-- SELECT cron.schedule('v4-ingest-erse-weekly', '0 3 * * 0',
--   $$ SELECT net.http_post(url := current_setting('app.supabase_url') || '/functions/v1/v4-ingest-erse',
--                           headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))) $$);

-- v4-ingest-omie: Diário 13h00 UTC
-- SELECT cron.schedule('v4-ingest-omie-daily', '0 13 * * *',
--   $$ SELECT net.http_post(url := current_setting('app.supabase_url') || '/functions/v1/v4-ingest-omie',
--                           headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))) $$);
-- Nota: supabase-designer configura schedules via MCP ou Supabase Dashboard.
-- As linhas acima são referência — não executar directamente nesta migration.
```

---

## Spec Edge Functions

### `v4-ingest-erse/index.ts` — estrutura mínima

```typescript
// Deno + Supabase Edge Function
// Invocação: POST /functions/v1/v4-ingest-erse (sem body — sem parâmetros)
// Auth: service_role (não exposta ao público)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SOURCE_URL    = 'https://www.precoenergia.pt/'

Deno.serve(async (_req) => {
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE)

  try {
    // 1. Fetch página ERSE
    const resp = await fetch(SOURCE_URL, {
      headers: { 'User-Agent': 'PropTech-Platform/1.0 (dados publicos ERSE)' }
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status} de precoenergia.pt`)

    const html = await resp.text()

    // 2. Parse tarifas (supabase-designer implementa parser real)
    const tarifas = parseTarifasERSE(html)  // retorna TarifaERSE[]

    // 3. Upsert com deduplicação por hash
    let rows_ingeridas = 0
    for (const t of tarifas) {
      const hash = await sha256(`${t.comercializador}|${t.plano}|${t.preco}|${t.validade}`)
      const { error } = await supa
        .from('tarifas')
        .upsert({ ...t, hash_conteudo: hash, fonte_ingestao: 'erse_scraper' },
                 { onConflict: 'hash_conteudo', ignoreDuplicates: true })
        .schema('v4_energia')
      if (!error) rows_ingeridas++
    }

    // 4. Audit log
    await supa.from('audit_log').insert({
      tabela: 'v4_energia.tarifas', accao: 'ingest_erse',
      detalhes: { rows_ingeridas, fonte: SOURCE_URL }
    }).schema('core')

    // 5. Alerta se poucos dados
    if (rows_ingeridas < 5) {
      await supa.from('inbox_items').insert({
        tipo: 'alerta', titulo: `ERSE scraper: apenas ${rows_ingeridas} tarifas ingeridas`,
        corpo: `Verificar ${SOURCE_URL} — HTML pode ter mudado.`,
        destinatario_tipo: 'staff'
      }).schema('system')
    }

    return new Response(JSON.stringify({ ok: true, rows_ingeridas }), { status: 200 })
  } catch (err) {
    // Alerta em inbox_items mesmo em caso de erro fatal
    const supa2 = createClient(SUPABASE_URL, SERVICE_ROLE)
    await supa2.from('inbox_items').insert({
      tipo: 'alerta', titulo: 'ERSE scraper falhou com erro',
      corpo: String(err), destinatario_tipo: 'staff'
    }).schema('system')

    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 })
  }
})
```

### `v4-ingest-omie/index.ts` — estrutura mínima

```typescript
// OMIE DAM endpoint público — CSV diário
const OMIE_URL = 'https://www.omie.es/en/file-download-list?parents[]=marginalpdbc'

Deno.serve(async (_req) => {
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE)
  const today = new Date().toISOString().slice(0, 10)  // YYYY-MM-DD UTC

  try {
    const resp = await fetch(OMIE_URL)
    if (!resp.ok) throw new Error(`OMIE HTTP ${resp.status}`)

    const csv = await resp.text()
    const rows = parseOmieCSV(csv, today)  // retorna {data, hora, preco_eur_mwh, zona}[]

    const { error } = await supa
      .from('omie_dam_horario')
      .upsert(rows, { onConflict: 'data,hora,zona', ignoreDuplicates: true })
      .schema('v4_energia')

    if (error) throw error

    await supa.from('audit_log').insert({
      tabela: 'v4_energia.omie_dam_horario', accao: 'ingest_omie',
      detalhes: { rows_ingeridas: rows.length, data: today }
    }).schema('core')

    return new Response(JSON.stringify({ ok: true, rows_ingeridas: rows.length }), { status: 200 })
  } catch (err) {
    await supa.from('inbox_items').insert({
      tipo: 'alerta', titulo: 'OMIE ingest falhou',
      corpo: String(err), destinatario_tipo: 'staff'
    }).schema('system')
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 })
  }
})
```

---

## Verificação de sucesso (critérios de aceitação)

Após aplicação da migration e seed:
```sql
-- Deve retornar 8
SELECT count(*) FROM v4_energia.tarifas WHERE ativo = true;

-- Deve retornar 8
SELECT count(*) FROM v4_energia.comercializadores WHERE activo = true;

-- Tabela deve existir com 0 rows (aguarda primeira ingestão OMIE)
SELECT count(*) FROM v4_energia.omie_dam_horario;
```

Após refactor do motor (vertical-builder):
- `npm run dev` em `apps/v4-energia/` → simulador mostra 8 propostas
- Alterar `UPDATE v4_energia.tarifas SET preco_kwh = 0.13 WHERE nome_plano = 'Eni Plenitude Simples BTN'` → simulador reflecte sem rebuild

Após primeira ingestão OMIE:
```sql
SELECT count(*) FROM v4_energia.omie_dam_horario
WHERE created_at > now() - interval '2 days';
-- Deve retornar > 0
```
