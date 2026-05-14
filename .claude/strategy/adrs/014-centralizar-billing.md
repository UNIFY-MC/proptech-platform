# ADR-014 — Centralização Billing em `core.subscricoes` + `core.faturas` + `core.recebimentos` + `core.servicos_ativos`

> **Data:** 2026-05-13
> **Estado:** Aceite (Plano-mãe `verifica-o-projeto-v2-zippy-flask.md` §4 schema core + Fase B)
> **Owner:** Mário Carvalho
> **Branch:** `feat/iam-centralization` (continua mesma branch para evitar conflitos)
> **Depende de:** ADR-013 (schema `iam` deve estar criado)

---

## Contexto

Hoje cada vertical tem o seu próprio modelo de billing:

- **V2 Condomínios** (`v2_condominios.recebimentos`): quotas mensais por fração, valor_emitido / valor_pago / data_pagamento — modelo de cobrança recorrente especifica para condomínios
- **V5 Manutenção** (`v5_manutencao.subscricoes`): planos mensais/anuais de manutenção — modelo de assinatura SaaS
- **V4 Energia** (futuro): comissão sobre poupança — modelo a definir
- **V3 Seguros** (futuro): prémios mensais/anuais — modelo similar a V5

**Problema:** sem visão única de receita por pessoa. Gonçalo Dias paga quota V2 (45 €/mês) + plano V5 (20 €/mês) + seguro V3 (35 €/mês) → 3 sistemas separados sem cross-view. Cross-sell impossível. Owners Club (V10) não consegue calcular tier sem agregar tudo.

## Decisão

Criar **4 tabelas centrais** em schema `core`:

### `core.servicos_ativos` — chave do cross-sell
1 row por (pessoa_id, vertical) — saber quais serviços cada pessoa tem activos.

```sql
core.servicos_ativos
  id                uuid PK
  pessoa_id         uuid FK core.pessoas
  vertical          text  ('v2'|'v3'|'v4'|'v5'|'v10')
  ref_externa       text  ('FRACAO-12-A3C'|'APOLICE-1234'|'CONTRATO-energia-001'|...)
  ref_tabela        text  ('v2_condominios.condominos'|'v3_seguros.apolices'|...)
  ref_id            uuid  (FK para a row específica na vertical)
  data_inicio       date
  data_fim          date  (null = activo)
  estado            text  ('activo'|'pausado'|'cancelado')
  valor_mensal      numeric (snapshot do que paga regularmente)
  metadata          jsonb
```

Trigger: quando alguém faz upsert na vertical (ex: V2 cria condómino, V3 emite apólice), trigger adiciona row em `servicos_ativos` automaticamente.

### `core.subscricoes` — assinaturas recorrentes
1 row por subscrição activa de qualquer vertical.

```sql
core.subscricoes
  id                uuid PK
  pessoa_id         uuid FK core.pessoas
  org_id            uuid FK core.organizations (null se pessoa singular)
  servico_ativo_id  uuid FK core.servicos_ativos
  vertical          text
  plano_nome        text  ('Quota Mensal Prata 2A'|'Plano Manutenção Premium'|'Apólice Multirriscos')
  valor             numeric NOT NULL
  periodicidade     text  ('mensal'|'trimestral'|'anual')
  dia_cobranca      int   (1-31, dia do mês para gerar fatura)
  iban              text  (opcional, para débito directo)
  data_inicio       date
  data_fim          date
  estado            text  ('activa'|'suspensa'|'cancelada')
  created_at        timestamptz DEFAULT now()
```

### `core.faturas` — documentos emitidos (saídas)
Cada vez que se emite fatura/recibo para um cliente.

```sql
core.faturas
  id                uuid PK
  numero            text UNIQUE  ('PRATA-2A/2026/00001'|'V5/2026/INV-00042'|...)
  pessoa_id         uuid FK core.pessoas
  subscricao_id     uuid FK core.subscricoes (null se one-shot)
  vertical          text
  data_emissao      date
  data_vencimento   date
  valor_liquido     numeric
  valor_iva         numeric
  valor_total       numeric (generated)
  estado            text  ('emitida'|'paga'|'anulada')
  pago_em           timestamptz
  metodo_pagamento  text  ('multibanco'|'transferencia'|'cheque'|...)
  iban_pagamento    text
  ficheiro_pdf      text  (storage path)
  created_at        timestamptz DEFAULT now()
```

### `core.recebimentos` — entradas confirmadas
Liga movimento bancário ↔ fatura paga.

```sql
core.recebimentos
  id                uuid PK
  pessoa_id         uuid FK core.pessoas
  fatura_id         uuid FK core.faturas (null se entrada sem fatura prévia)
  vertical          text
  data_pagamento    date NOT NULL
  valor             numeric NOT NULL
  referencia_banco  text  (string da transferência)
  movimento_id      uuid  (FK para v2_condominios.extrato_bancario quando vier de lá)
  metodo            text
  notas             text
  created_at        timestamptz DEFAULT now()
```

## RPCs

```sql
core.criar_subscricao(p_pessoa_id, p_vertical, p_plano, p_valor, p_periodicidade, p_dia_cobranca) RETURNS uuid
core.emitir_fatura(p_subscricao_id, p_data_emissao, p_data_vencimento) RETURNS uuid
core.registar_recebimento(p_fatura_id, p_valor, p_data, p_referencia) RETURNS uuid
core.cliente_360(p_pessoa_id) RETURNS jsonb
  -- agrega tudo o que pessoa tem: servicos_ativos, subscricoes activas,
  -- faturas pendentes, mora total, owners club tier
```

## Backfill `v2_condominios` → `core`

V2 produção tem 593 recebimentos + frações + condóminos. Backfill:

1. **Para cada condómino activo:** criar row em `core.servicos_ativos` (vertical='v2', ref_externa=fracao_codigo)
2. **Para cada fração com quota_mensal:** criar `core.subscricoes` (periodicidade='mensal', dia_cobranca=1)
3. **Para cada `v2_condominios.recebimentos`:** se `data_pagamento IS NOT NULL` → `core.faturas` (estado='paga') + `core.recebimentos`. Senão fica como `core.faturas` (estado='emitida').

V2 UI continua a ler de `v2_condominios.recebimentos` durante 1 sprint. Sprint B.2 refactor V2 UI para ler de `core.*`.

## Vista `core.cliente_360`

View materializada (refresh cron) que agrega:

```sql
SELECT
  p.id, p.nome, p.email,
  jsonb_agg(DISTINCT sa.vertical) as verticais_activas,
  count(DISTINCT sa.id) FILTER (WHERE sa.estado='activo') as servicos_count,
  SUM(s.valor) FILTER (WHERE s.estado='activa') as receita_recorrente_mes,
  SUM(f.valor_total) FILTER (WHERE f.estado='emitida' AND f.data_vencimento < now()) as mora_total,
  MAX(r.data_pagamento) as ultimo_pagamento
FROM core.pessoas p
LEFT JOIN core.servicos_ativos sa ON sa.pessoa_id = p.id
LEFT JOIN core.subscricoes     s ON s.pessoa_id = p.id
LEFT JOIN core.faturas         f ON f.pessoa_id = p.id
LEFT JOIN core.recebimentos    r ON r.pessoa_id = p.id
GROUP BY p.id;
```

Equipa marketing → segmentar pessoas com 1 vertical ofertar 2ª. Equipa financeiro → mora total cross-vertical num só lado.

## Cross-impact

| Vertical | Mudança |
|---|---|
| **V2 Condomínios PROD** | Dual-mode 1 sprint: V2 escreve em `v2_condominios.recebimentos` E em `core.faturas/recebimentos` simultaneamente. UI continua igual até Sprint B.2 |
| **V5 Manutenção** | `v5_manutencao.subscricoes` migra para `core.subscricoes` (com vertical='v5'). RPC `marcar_fatura_paga` passa por `core` |
| **V4 Energia** | Quando lançar, regista em `core.subscricoes` desde dia 1 |
| **V3 Seguros (futuro)** | Apólices criam `core.subscricoes` com periodicidade='anual' |
| **Dashboard** | Nova vista `/financeiro/cliente-360` agrega tudo |

## Próximos ADRs encadeados

- **ADR-015** — Schema `marketing` + cross-sell rules
- **ADR-016** — `system.agent_runs` + `system.agent_policies` (orquestrador cross-vertical)

## Execução

### Sprint B.1 (esta sprint)
1. Migration `2026XXXX_core_billing.sql` — cria 4 tabelas + 4 RPCs + view cliente_360
2. Backfill via SQL script: `v2_condominios.recebimentos` → `core.faturas` + `core.recebimentos`
3. Smoke test: `SELECT * FROM core.cliente_360 WHERE pessoa_id IN (...) LIMIT 10`

### Sprint B.2 (próxima sprint)
1. V2 frontend lê de `core.faturas` em vez de `v2_condominios.faturas_pendentes`
2. RPC `v2_condominios.lancar_recebimento` torna-se proxy para `core.registar_recebimento`
3. Dashboard cria página `/financeiro` lendo `core.cliente_360`
