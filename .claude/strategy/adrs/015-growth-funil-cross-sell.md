# ADR-015 — Schema `growth.*` (Funil + Anúncios Meta/Google + Cross-Sell)

> **Data:** 2026-05-13
> **Estado:** Aceite (Mário aprovou Fase C do plano-mãe; ênfase em Meta ads + lead funnel)
> **Owner:** Mário Carvalho
> **Branch:** `feat/iam-centralization`
> **Depende de:** ADR-013 (iam), ADR-014 (core.servicos_ativos + core.pessoas)

---

## Contexto

PropTech tem 5+ verticais e quer fazer **anúncios Meta + Google** para gerar leads para cada vertical, com **cross-selling** automático entre elas:

- Lead V4 (simulador energia) → se elegível, ofertar V3 seguro
- Cliente V2 (condómino) há 6 meses → ofertar V5 plano de manutenção
- Cliente V2+V3+V4 → upgrade automático Owners Club V10 (tier gold)

Hoje cada vertical tem seu próprio "leads" (V4 tem `v4_energia.leads`); não há **funil unificado**, **tracking UTM**, **custo por lead (CPL)**, ou **regras de cross-sell**.

## Decisão

Criar **schema `marketing`** com 7 tabelas + RPCs para gerir o funil end-to-end:

### Tabelas core do funil

```
growth.ad_sources        — Meta, Google Ads, LinkedIn, organic, referral
growth.ad_campaigns      — Campanhas activas (Meta campaign_id, budget, target vertical)
growth.ad_spend          — Custo diário por campanha (sync via Meta API / manual)
growth.leads             — Leads cross-vertical (com utm_source/medium/campaign/content)
growth.interacoes        — Eventos no funil (email_aberto, link_clicado, simulador_completo, demo_agendada)
growth.oportunidades     — Lead qualificado → venda em curso
growth.cross_sell_rules  — Regras automáticas (ex: V2 6m → ofertar V4)
growth.segmentos         — Segmentos de pessoas (V2 sem V4, mora alta, condomínios premium)
```

### Naming + relações

- `growth.leads.pessoa_id` (FK para `core.pessoas`, null até conversão)
- `growth.leads.utm_*` (5 colunas standard) + `ad_campaign_id` opcional
- Trigger: lead.email = pessoa.email → liga automaticamente + cria `core.servicos_ativos` interesse

### Funil completo

```
[Meta Ad clica] → growth.leads (utm_source='meta', ad_campaign_id=X)
   ↓
[Simulador completo] → growth.interacoes (tipo='simulador_completo')
   ↓
[Lead qualificado] → growth.oportunidades
   ↓
[Conversão] → core.servicos_ativos (vertical='v4') + lead.pessoa_id set
   ↓
[Regra cross-sell V4→V3] → growth.oportunidades nova (vertical='v3')
   ↓
[Email enviado] → growth.interacoes (tipo='email_enviado') + iam.activity_logs
```

### Métricas funnel (view `growth.funnel_summary`)

```sql
SELECT
  vertical, ad_source, ad_campaign,
  count(*) as leads,
  count(*) FILTER (WHERE qualificado_em IS NOT NULL) as qualificados,
  count(*) FILTER (WHERE pessoa_id IS NOT NULL) as convertidos,
  SUM(spend) FILTER (WHERE date_trunc('day',created_at)=...) as total_spend,
  total_spend / count(*) as cpl,
  count(*) FILTER (WHERE converted) * 1.0 / count(*) as conversion_rate
FROM growth.leads l
LEFT JOIN growth.ad_spend s ON ...
GROUP BY 1, 2, 3
```

## Integração Meta API (futuro)

Edge function `meta-leads-sync` (ADR futuro):
- Webhook do Meta envia leads → escreve em `growth.leads`
- Daily cron: lê `growth.ad_spend` da Meta Ads API → actualiza CPL real
- Pixel events (Facebook Pixel) registados em `growth.interacoes`

## Cross-sell rules — DSL simples

```jsonb
{
  "name": "V2_to_V4_after_6_months",
  "if": {
    "vertical_active": "v2",
    "months_since_signup": { ">=": 6 },
    "vertical_not_active": "v4"
  },
  "then": {
    "create_oportunidade": { "vertical": "v4", "estado": "qualificado" },
    "send_email": { "template": "v2_to_v4_simulador", "delay_days": 0 },
    "log_activity": "cross_sell_v2_v4_triggered"
  }
}
```

Engine: `growth.executar_cross_sell_rules()` corre via cron diário, percorre regras activas, aplica para pessoas elegíveis.

## Execução

### Sprint C.1 (esta sprint)
1. Migration `2026XXXX_marketing_schema.sql`
2. Seeds: 4 ad_sources (Meta, Google, Organic, Referral), 3 cross_sell_rules iniciais
3. Backfill: `v4_energia.leads` → `growth.leads` (com utm_source='legacy')
4. RPC `growth.criar_lead()` + `growth.executar_cross_sell_rules()`

### Sprint C.2 (próxima)
1. Edge function `meta-leads-webhook` para receber leads do Meta Ads
2. Vista dashboard `/marketing/funnel` com KPIs
3. Vista `/marketing/regras` para criar/editar cross_sell_rules

### Sprint C.3
1. Cron diário `0 9 * * *` chama `executar_cross_sell_rules()`
2. Trigger pessoa_atualizada → recalcula `core.servicos_ativos` + dispara regras
