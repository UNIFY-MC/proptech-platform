# 🧠 MASTER PLAN — Agentic AI-First Platform (Abr 2026)

**Criado:** 24 Abril 2026 · **Estado:** Aceite, em execução

**Fonte única de verdade para:** estratégia agentic AI transversal, roadmap V5 Manutenção, V10 Copilot Condomínios, multi-tenant em Core.

> **Regra de ouro:** este plano substitui qualquer outro documento estratégico em conflito. Nenhuma app nova nem fase nova da V5 arranca sem consultar aqui primeiro.
> 

---

## 0. Sumário executivo — em 90 segundos

**O que estamos a construir:** não 5 apps, mas **1 plataforma agentic AI-first** com base comum (multi-tenant em Core) e 3 produtos principais:

1. **V5 Manutenção** — app B2C + B2B para clientes e prestadores · mobile-first · desktop para gestão profunda
2. **V10 Copilot** — camada agentic AI para administração de condomínios · produto paralelo que consulta V2 existente · add-on 15-30€/mês/edifício
3. **V5 Admin ERP/CRM** — cockpit do Mário · gere as duas anteriores + integrações V1-V10

**O que é agentic AI:** a IA não só responde — **executa sequências de acções**, usa ferramentas (tools), pede aprovação nos pontos críticos, regista tudo no Auditing Center. Modelo: AppFolio Realm-X Maintenance Performer + MRI Agora Actions.

**Porque multi-tenant desde já:** sem isto, uma empresa como a AdminCondo Lda que gere 42 edifícios tem de criar 42 contas. Com multi-tenant tem 1 conta com 42 organizações filhas. Sem isto o B2B é impossível.

**O que NÃO vamos construir:** replicar o V2 existente. O V2 fica em produção em [prataowners.pt](http://prataowners.pt) (intocável). O V10 Copilot é um produto PARALELO que consulta o V2 via API/ETL.

---

## 1. Decisões estratégicas já tomadas (não reabrir)

1. **Arquitectura multi-tenant em Core** — tabelas `organizations` + `memberships` em `core.*`, partilhadas por V2/V3/V4/V5/V10
2. **Agentic AI em TODAS as apps** — não só V10 Copilot. V5 tem agents. Admin ERP tem IA supervisor. Cada vertical futura nasce com agents.
3. **V5 BNav** — Início · Serviços · FAB(Pedir) · Casa · Pedidos · Perfil via avatar
4. **Pós-Obra → Orçamentos à medida** · máx 3 áreas · roxo #534AB7
5. **Home Assessment opcional** · recompensa 300 pts
6. **Wishlist como hub de pedidos pendentes** — débito 3a.4 a fechar antes da Fase 3
7. **Subscrição V5** — Grátis · Home+ 6.90€/mês · Home Pro 12.90€/mês · 10% do gasto em serviços vira crédito
8. **Signup dual no registo** — Cliente (Individual/Condomínio/Empresa) × Prestador (Básico grátis / Pro 14.90€/mês)
9. **Prestador Pro** — trial 3 meses para primeiros 200 (Founding Professionals)
10. **V10 Copilot** — BD própria (não partilha com V2), Smart Inbox multi-canal, produto paralelo à V5
11. **Smart Inbox sem forçar login** — email + WhatsApp + portal público + magic link + QR code
12. **AppFolio + MRI como referências** — Realm-X agentic dispatcher (AppFolio) + Ask Agora natural language (MRI)

---

## 2. Mapa de páginas filhas (o plano detalhado)

| Página | Conteúdo | Quando consultar | 🧱 **Fundações Agentic** | Multi-tenant · tool use · audit center · approval policies · stack comum | Antes de qualquer app nova · sempre que criar agent novo |
| --- | --- | --- | --- | --- | --- |
| 🤖 **V10 Copilot — Spec completa** | 4 agents (Cobrador, Dispatcher, Compliance, Procurement) · Smart Inbox 5 canais · código exemplo agent loop | Quando arrancar desenvolvimento V10 | 🔧 **V5 Manutenção — Roadmap 8 fases** | Fase 3 (Casa) detalhada · signup dual · Prestador Pro · Fases 4-8 outlined | Diariamente enquanto V5 estiver em desenvolvimento activo |
| 🎯 **Análise Competidores PropTech AI** | AppFolio, MRI, HomeTend, Shipshape, InstaService, Hippo, OSCAR, pinto-app · features a adoptar | Sempre que pensar em feature nova · benchmarking | 📅 **Execução — Roadmap 12 meses** | Mês a mês · dependências · arranque imediato · primeiro prompt Claude Code | Planeamento semanal · decisões de scope |

---

## 3. Roadmap macro (12 meses)

| Fase | Meses | O quê | Produto |
| --- | --- | --- | --- |
| **3** | Mês 1-2 | Módulo Casa · Digital Twin · AlertActions · Orçamentos à medida · AI Expert | V5 |
| **5** | Mês 4 | Prestador Pro mobile · integração Moloni | V5 |
| **7 (paralelo)** | Mês 5-8 | V10 Copilot · Smart Inbox · 4 agents · Pricing add-on 15-30€/mês/edif | V10 |
| **9** | Mês 11-12 | Marketing platform interna · sponsorship packages · brands + real estate + financial | Todas |

---

## 4. Streams de receita projectadas

| Stream | Alvo | Valor | Fase ativa | Comissão serviços V5 | B2C | 8-20% por ordem | Desde Fase 3 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Subscrição cliente Home+/Pro | B2C | 6.90€-12.90€/mês | Fase 4 | Subscrição prestador Pro | B2B | 14.90€/mês (9.90€ Founding) | Fase 5 |
| Contratos B2B V5 | Condomínios · Empresas | 30-80€/mês/localização | Fase 8 | **V10 Copilot add-on** | Admin condomínios | **15-30€/mês/edifício** | **Fase 7** |
| Publicidade parceiros | Brands + RE + Fin | 3k-6k€/ano | Fase 9 | Dados agregados | Fabricantes · Seguradoras | Licenciamento | Ano 2+ |

**Projecção V10 Copilot isolada:** empresa com 50 edifícios × 20€/mês = 1.000€/mês · 10 clientes B2B = 10.000€/mês de MRR só deste add-on.

---

## 5. Como usar este plano

1. **Claude (chat)** consulta o hub + filhas antes de propor qualquer feature nova
2. **Claude Code** executa com prompts que referenciam SPECIFICAMENTE uma página filha (ex: "lê 🔧 V5 Roadmap secção Fase 3.5 e implementa")
3. **Mário** valida fases uma a uma · nenhuma fase arranca antes da anterior estar fechada
4. **ADRs** continuam a ser a forma de registar decisões novas. Quando uma decisão do ADR invalidar algo aqui, actualizar aqui também.

---

## 6. Inspiração (referências canónicas)

- **MRI Property Management X · Ask Agora** · natural language queries devolvem dados estruturados
- **AppFolio Realm-X Maintenance Performer** · agentic AI que despacha manutenção sozinho
- [**Shipshape.ai**](http://Shipshape.ai) · Home Health Score + AlertActions em linguagem humana
- **InstaService** · RFQ flow em 4 passos · até 3 áreas · multi-formato orçamento
- **pinto-app** · gamificação com streak, pontos, níveis
- **OSCAR** · dense promotional cross-sell
- **HomeTend** · IA + meteorologia como trigger de alertas
- **Hippo** · score-based insurance discount

Detalhe de cada em 🎯 **Análise Competidores**.

---

## 7. Estado ao dia 24 Abril 2026

- V5 Manutenção: commit 210f867, 22 commits na sessão em curso, 3 vistas funcionais
- V2 Condomínios: em produção em [prataowners.pt](http://prataowners.pt), intocável
- Schema multi-tenant Core: **por criar** (Fase 0)
- Débitos V5: wishlist submit agrupado (3a.4) + admin BD
- Claude API: chave disponível (VITE_ANTHROPIC_API_KEY) · pronto para agentic

---

## 8. Próxima acção concreta

1. Fechar débitos 3a.4 + admin BD no Claude Code
2. Aplicar schema multi-tenant em Core (ver 🧱 Fundações Agentic)
3. Arrancar V5 Fase 3.1 (schema completo Casa)
4. Primeiro prompt Claude Code → ver 📅 Execução

[🧱 Fundações Agentic — Multi-tenant · Tool Use · Audit](https://www.notion.so/Funda-es-Agentic-Multi-tenant-Tool-Use-Audit-34c84147fa6081fd947bc6ddc540a429?pvs=21)

[🤖 V10 Copilot — Agentic AI para Condomínios](https://www.notion.so/V10-Copilot-Agentic-AI-para-Condom-nios-34c84147fa6081bda460f2a2c4fea0c4?pvs=21)

[🔧 V5 Manutenção — Roadmap 8 Fases](https://www.notion.so/V5-Manuten-o-Roadmap-8-Fases-34c84147fa608165acd9e728912ae242?pvs=21)

[🎯 Análise Competidores PropTech AI](https://www.notion.so/An-lise-Competidores-PropTech-AI-34c84147fa60817ba602c03201873e31?pvs=21)

[📅 Execução — Roadmap 12 meses + Arranque](https://www.notion.so/Execu-o-Roadmap-12-meses-Arranque-34c84147fa6081f3b05dcb19eb18f320?pvs=21)

[📄 [MASTER.md](http://MASTER.md) (exportável para Claude Code)](https://www.notion.so/MASTER-md-export-vel-para-Claude-Code-34c84147fa608122a7d6c6aa5e23c395?pvs=21)

[🧭 [CLAUDE.md](http://CLAUDE.md) (leve) — ponto de entrada](https://www.notion.so/CLAUDE-md-leve-ponto-de-entrada-34c84147fa6081b2a5a0f2123f896e8f?pvs=21)