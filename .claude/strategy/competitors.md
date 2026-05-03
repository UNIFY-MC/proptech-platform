# Competitors — Dados Estruturados

> Source canónica para `data.json → competitors[]`
> Parser: `scripts/dashboard-data-build.js`
> Última actualização: 2026-05-03
> Referência Notion: https://www.notion.so/34c84147fa60817ba602c03201873e31

---

## Estrutura de parsing

O script Node parsa cada bloco `## <Nome>` como um competitor.
Campos `key: value` no topo do bloco são extraídos como propriedades.
Listas markdown `- item` nos subseccções nomeadas mapeiam para arrays.
Checkboxes `- [x]` / `- [ ]` na subsecção `### Features` mapeiam para `features{}`.

---

## Hubbent

id: hubbent
tier: 1
signal: medium
country: PT
founded: 2022
funding: desconhecido
lastUpdate: 2026-05-01
threatLevel: alto
desc: Marketplace dual-app on-demand home services PT. App consumer (Hubbent) + app prestador (Hubbent Pro). Entrante recente com expansão rápida no mercado português. Classificação provisional — rever após investigação W18 (founders, capital, tracção).

### Pontos fortes

- Dual-app nativa PT (consumer + prestador)
- On-demand sem contrato anual
- App prestador dedicada (Hubbent Pro)
- Foco exclusivo mercado português

### Pontos fracos

- Sem gestão de contratos recorrentes
- Sem integrações fiscais PT (Moloni/InvoiceXpress)
- Sem componente B2B condomínio
- Modelo marketplace dependente de volume de prestadores
- Sem AI advisor

### Features

- [ ] magicLink
- [ ] fiscalPT
- [x] stripe
- [x] mobile
- [ ] multiVertical
- [ ] aiAdvisor
- [ ] b2b

---

## FIXO

id: fixo
tier: 1
signal: medium
country: PT
founded: desconhecido
funding: Fidelidade-backed
lastUpdate: 2026-05-01
threatLevel: critico
desc: Plataforma home services owned pelo grupo Fidelidade (maior seguradora PT). Acesso imediato à base de clientes Fidelidade (~1M segurados). Scope exacto a clarificar — Mário a investigar. Threat level crítico pela escala potencial, não pela maturidade actual.

### Pontos fortes

- Backing grupo Fidelidade (capital + base de clientes massiva)
- Cross-sell natural com seguros habitação (V3 Seguros relevante)
- Distribuição imediata via rede agentes Fidelidade
- Marca reconhecida em PT

### Pontos fracos

- Provavelmente não nativo-digital (legado de seguradora)
- Sem foco em agentic AI
- Modelo B2C sem componente prestador-empowerment
- Scope real ainda não confirmado publicamente

### Features

- [ ] magicLink
- [ ] fiscalPT
- [ ] stripe
- [x] mobile
- [ ] multiVertical
- [ ] aiAdvisor
- [x] b2b

---

## Fixando

id: fixando
tier: 2
signal: weak
country: PT
founded: 2016
funding: bootstrapped
lastUpdate: 2026-05-01
threatLevel: medio
desc: Plataforma portuguesa de comparação de orçamentos online. Owner publica pedido, prestadores submetem propostas. Modelo marketplace de leads. Estabelecida em PT mas sem evolução significativa nos últimos anos.

### Pontos fortes

- Estabelecida em PT (brand recognition)
- Base de prestadores activa
- SEO forte em queries home services PT

### Pontos fracos

- Modelo lead-gen sem gestão pós-contratação
- Sem app mobile nativa
- Sem integrações fiscais
- Sem AI ou features inteligentes
- Experiência datada (sem investimento significativo recente)

### Features

- [ ] magicLink
- [ ] fiscalPT
- [ ] stripe
- [ ] mobile
- [ ] multiVertical
- [ ] aiAdvisor
- [ ] b2b

---

## Jobber

id: jobber
tier: 3
signal: reference
country: CAN
founded: 2011
funding: Series C+ $100M+ USD
lastUpdate: 2026-05-01
threatLevel: medio
desc: SaaS líder para prestadores de serviços SMB (field service management). Forte em CA/US, expansão EU em curso com funding EU. Referência de UX para o dashboard prestador-side que construiremos no Sprint 1E. Threat real se entrar PT com localização.

### Pontos fortes

- UX prestador best-in-class (scheduling, invoicing, CRM)
- Funding sólido para expansão EU
- Mobile first (app prestador completa)
- Integrações contabilidade (QuickBooks, Xero)
- Marca forte no segmento SMB

### Pontos fracos

- Sem versão PT/ptPT (localização inexistente)
- Sem integração fiscal PT (Moloni/InvoiceXpress/AT)
- Focado em prestador — sem componente owner/condomínio
- Pricing USD/CAD fora de alcance para prestadores PT pequenos
- Sem AI advisor nativo

### Features

- [ ] magicLink
- [ ] fiscalPT
- [x] stripe
- [x] mobile
- [ ] multiVertical
- [ ] aiAdvisor
- [x] b2b

---

## AppFolio

id: appfolio
tier: 3
signal: reference
country: US
founded: 2006
funding: Public (APPF NASDAQ)
lastUpdate: 2026-05-01
threatLevel: baixo
desc: Software B2B property management líder nos EUA. Lançou Realm-X (agentic AI) em 2024 — primeiro do segmento a ter AI dispatcher real com natural language. Referência para o V5 Matchmaker e V10 Dispatcher. Sem presença PT/EU, sem B2C.

### Pontos fortes

- Agentic AI real (Realm-X) — dispatcher + auditing
- Escala enterprise (10M+ unidades geridas)
- Integração completa property management → maintenance
- API aberta para integrações

### Pontos fracos

- B2B only — sem componente owner/resident B2C
- US-centric (sem localização PT/EU)
- Pricing enterprise fora do segmento PT PME
- Sem foco em prestadores individuais

### Features

- [ ] magicLink
- [ ] fiscalPT
- [x] stripe
- [x] mobile
- [x] multiVertical
- [x] aiAdvisor
- [x] b2b

---

## Shipshape

id: shipshape
tier: 3
signal: reference
country: US
founded: 2019
funding: Series A ~$8M USD
lastUpdate: 2026-05-01
threatLevel: baixo
desc: App B2C para homeowners com Home Health Score — score da saúde da casa baseado em manutenções preventivas. Já adoptámos o conceito de score no V5. Sem componente prestador ou B2B. Referência de UX owner-side e gamificação.

### Pontos fortes

- Home Health Score (já adoptado V5)
- UX owner-side clean e mobile-first
- Gamificação de manutenção preventiva
- Integrações meteorologia (similar ao nosso IPMA)

### Pontos fracos

- B2C only — sem prestador ou B2B
- US-centric (sem localização PT/EU)
- Sem integrações fiscais
- Sem componente recibo/fatura

### Features

- [ ] magicLink
- [ ] fiscalPT
- [ ] stripe
- [x] mobile
- [ ] multiVertical
- [ ] aiAdvisor
- [ ] b2b

---

## OSCAR

id: oscar
tier: 4
signal: silent
country: ES
founded: 2018
funding: desconhecido
lastUpdate: 2026-05-01
threatLevel: baixo
desc: Plataforma on-demand home services com presença em LATAM e Espanha. Modelo B2C sem gestão de contratos. Silent — sem actividade significativa detectada nos últimos 6 meses. Monitorização quarterly suficiente.

### Pontos fortes

- Presença ES (mercado vizinho)
- On-demand estabelecido

### Pontos fracos

- Sem presença PT
- Sem AI
- Sem integrações fiscais locais
- Sem componente B2B

### Features

- [ ] magicLink
- [ ] fiscalPT
- [ ] stripe
- [x] mobile
- [ ] multiVertical
- [ ] aiAdvisor
- [ ] b2b
