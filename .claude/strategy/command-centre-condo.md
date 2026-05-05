---
title: Command Centre — Administração de Condomínios (AI-Native)
date: 2026-05-05
status: arquitectura aprovada
version: 1.0
---

# Command Centre — Administração de Condomínios

> Sistema 100% AI-native. Os agentes IA são os employees. Mário é o supervisor que aprova excepções e decisões de alto impacto. Não existe interface para humanos executarem trabalho operacional.

---

## Princípio de funcionamento

```
EVENTO ENTRA (email, cron, portal, trigger)
         ↓
   atendimento-condo        ← classifica em <2 min
         ↓
   agente especializado     ← resolve autonomamente
         ↓
   system.inbox_items       ← Mário vê o resultado
         ↓ (se acção externa ou alto impacto)
   system.approvals_queue   ← Mário aprova
         ↓
   comunicacao-condo        ← executa envio externo
```

**Regra de ouro:** nenhum agente envia comunicação externa sem aprovação. Nenhum agente toma decisão financeira >€200 sem aprovação.

---

## Roster de Agentes (11 agentes activos)

### Orquestrador
| Agente | Modelo | Papel |
|---|---|---|
| `orquestrador-condo` | Opus | Director operacional — coordena todos os agentes, escalona para Mário |

### Agentes Operacionais (domínio específico)
| Agente | Modelo | Domínio | Vertical |
|---|---|---|---|
| `financeiro-condo` | Sonnet | Quotas, mora, reconciliação bancária, relatórios | V2 |
| `atendimento-condo` | Haiku | Classificação e routing de todos os pedidos incoming | V2 |
| `manutencao-condo` | Sonnet | Ordens de trabalho, empreiteiros, gestão de avarias | V2 + V5 |
| `assembleia-condo` | Sonnet | Convocatórias, atas, prazos legais assembleias | V2 |
| `docs-condo` | Sonnet | OCR faturas, classificação, arquivo Google Drive | V2 |
| `compliance-condo` | Sonnet | Prazos legais, mora grave, RGPD, certificações | V2 |
| `energia-condo` | Sonnet | Contratos energia, carregadores EV, tarifas, poupanças | V2 + V4 |
| `seguros-condo` | Sonnet | Apólices, renovações, sinistros, coberturas obrigatórias | V2 + V3 |

### Agentes de Execução e Migração
| Agente | Modelo | Papel |
|---|---|---|
| `comunicacao-condo` | Haiku | Executa envios aprovados (email, SMS, carta) — nunca inicia |
| `importador-v2` | Opus | Migração one-shot V2 legacy → V1 Core Hub (uso único) |

---

## Equipa de Marketing — Captação de Leads por Vertical

> Equipa transversal — gera leads para V2, V3, V4 e V5. Opera com aprovação do Mário para qualquer conteúdo externo ou gasto de budget. Toda a comunicação passa por `system.approvals_queue`.

### Roster de Marketing (5 employees activos)

| Employee | Modelo | Papel | Custo/mês |
|---|---|---|---|
| `diretor-marketing` (Diogo) | Opus | Coordena equipa, aprova conteúdo, gere budget, digest KPIs | ~$12 |
| `criativo-conteudo` (Cris) | Sonnet | Carousels Canva, copy Hormozi, A/B variants, multi-formato | ~$10 |
| `gestor-ads` (Gabi) | Sonnet | Facebook Ads MCP — campanhas Meta, ROAS ≥3, naming convention | ~$9 |
| `publisher-social` (Paula) | Haiku | Publica orgânico aprovado — Instagram/Facebook/LinkedIn, peak times | ~$3 |
| `gestor-leads` (Leo) | Sonnet | Scoring leads 0-100, routing, nurturing 3 emails/7 dias, RGPD | ~$8 |

**Custo total marketing: ~$42/mês**

### CAC Targets por Vertical

| Vertical | CAC Máximo | Budget Inicial | Canal Principal | ROAS Mínimo |
|---|---|---|---|---|
| V5 Manutenção | <€30 | €200-€500/mês | Instagram + Facebook | 3× |
| V2 Condomínios | <€80 | €150-€300/mês | LinkedIn + Google Search | 3× |
| V4 Energia | <€60 | €100-€200/mês | Google Search + Meta | 3× |
| V3 Seguros | <€50 | €100-€200/mês | Google Search + LinkedIn | 3× |

### Fluxo de aprovação (obrigatório)

```
diretor-marketing recebe pedido / cron semanal
    ↓ define brief (vertical + ICP + mensagem + budget + canal)
criativo-conteudo
    ↓ cria assets + copy A/B variants (Canva MCP) em <24h
diretor-marketing
    ↓ revê — alinhado com posicionamento? A/B presente? Formato correcto?
system.approvals_queue
    ↓ Mário aprova (conteúdo + budget)
gestor-ads (pago) / publisher-social (orgânico)
    ↓ executa campanha / publica
gestor-leads
    ↓ captura → score → routing (employee operacional ou nurturing)
```

### Calendário Marketing (cron)

```
DIÁRIO 08h00  — gestor-ads: performance check ROAS/CTR → pausar se threshold
DIÁRIO 08h30  — gestor-leads: processar leads 24h → score → routing
DIÁRIO        — publisher-social: verificar publicações agendadas do dia

SEMANAL 2ª 09h00  — diretor-marketing: digest KPIs (ROAS, CPL, leads por vertical)
SEMANAL 6ª 16h00  — publisher-social: top/bottom 3 posts por engagement
SEMANAL 6ª 17h00  — gestor-leads: relatório CPL por canal e vertical

MENSAL Dia 1  — diretor-marketing: calendário editorial próximo mês + report CAC
```

---

## Skills por agente

### financeiro-condo
| Skill | Trigger | Aprovação necessária |
|---|---|---|
| Gerar quotas mensais | Cron Dia 1 | Não (geração) — Sim (notificação) |
| Verificar mora | Cron Dia 15 | Sim (envio aviso) |
| Reconciliação bancária | Cron Dia 1 + manual | Não |
| Relatório mensal | Manual / fim de mês | Não |
| Acordo pagamento mora | Manual | Sim (sempre) |

### manutencao-condo
| Skill | Trigger | Aprovação necessária |
|---|---|---|
| Triagem avaria | atendimento-condo | Não |
| Seleccionar empreiteiro | Automático | Não (seleção) — Sim (adjudicação >€200) |
| Abrir OT urgente | Avaria urgente | Não (urgência) |
| Fechar OT | Confirmação prestador | Não (se dentro de orçamento) |
| Adjudicar OT €200-€500 | Manual + triagem | Sim (Mário em <4h) |
| Adjudicar OT >€500 | Manual + triagem | Sim (3 orçamentos + Mário) |

### assembleia-condo
| Skill | Trigger | Aprovação necessária |
|---|---|---|
| Draft convocatória | Manual / alerta 60 dias | Não (draft) — Sim (enviar) |
| Verificar prazo legal (10 dias) | Ao propor data | Não (verificação automática) |
| Gerar ordem de trabalhos | Manual | Não |
| Redigir ata | Após assembleia | Não (draft) — Sim (arquivar e enviar) |
| Alertar assembleia anual em falta | Cron mensal | Não |

### docs-condo
| Skill | Trigger | Aprovação necessária |
|---|---|---|
| OCR fatura (confiança >90%) | Upload / email | Não |
| OCR fatura (confiança <90%) | Upload / email | Sim (revisão) |
| Arquivar no Drive | Automático | Não |
| Processar documento legal | docs-condo recebe | Sim se valor >€1.000 |

### energia-condo
| Skill | Trigger | Aprovação necessária |
|---|---|---|
| simular-tarifas | Trimestral + manual | Não |
| iniciar-mudanca-comercializador | Manual | Sim (sempre) |
| monitorizar-consumo | Mensal (após fatura) | Não |
| gerir-carregadores-ev | Cron Dia 1 | Sim (lançar faturas) |
| alertar-renovacao-contrato | Cron Dia 1 | Não (alerta) — Sim (renovar) |
| certificacao-energetica | Cron mensal | Não (alerta) — Sim (contratar) |

### seguros-condo
| Skill | Trigger | Aprovação necessária |
|---|---|---|
| auditar-cobertura | Anual (Janeiro) | Não |
| alertar-renovacao | Cron Dia 1 | Não (alerta) — Sim (renovar/mudar) |
| simular-seguro | Automático 90 dias antes | Não |
| participar-sinistro | Manual | Sim (sempre + prazo legal) |
| acompanhar-sinistro | Semanal automático | Não |
| gerir-seguro-fracoes | Mensal | Não (informativo) |

### compliance-condo
| Skill | Trigger | Aprovação necessária |
|---|---|---|
| Monitorizar prazos | Cron semanal | Não |
| Calcular juros mora grave | Recebido de financeiro | Não |
| Draft carta interpelação judicial | Mora >90 dias | Sim (Mário + advogado) |
| Verificar RGPD | Mensal | Não |
| Alertar inspecções obrigatórias | Cron mensal | Não |

---

## Calendário de operações automáticas (cron)

```
DIA 1 DE CADA MÊS
├── financeiro-condo:    gerar quotas de todos os edifícios
├── financeiro-condo:    reconciliação bancária mês anterior
├── energia-condo:       verificar contratos a vencer nos próximos 90 dias
├── energia-condo:       fecho carregadores EV (se aplicável)
├── seguros-condo:       verificar apólices a vencer nos próximos 90 dias
└── compliance-condo:    relatório prazos legais próximos 30 dias

DIA 5 DE CADA MÊS
└── comunicacao-condo:   enviar lembretes quota (para Dia 8 de vencimento)

DIA 15 DE CADA MÊS
└── financeiro-condo:    identificar mora (recebimentos em atraso)
                         → draft avisos → approvals_queue Mário

SEMANAL (2ª feira)
├── compliance-condo:    relatório prazos próximos 30 dias
└── seguros-condo:       acompanhar sinistros em curso

TRIMESTRAL (Jan/Abr/Jul/Out)
└── energia-condo:       auditoria tarifária (simular-tarifas todos os edifícios)

ANUAL (Janeiro)
└── seguros-condo:       auditoria cobertura todos os edifícios
```

---

## Fluxos end-to-end principais

### FLOW A — Mora automática (sem intervenção humana até aprovação)
```
Dia 15 → financeiro-condo
  ↓ identifica recebimentos em atraso
  ↓ classifica: 1º aviso (8-30d), 2º aviso (31-60d), mora grave (>60d)
  ↓ mora grave >90d → compliance-condo (juros + interpelação)
  ↓ drafts de cartas gerados
  → approvals_queue: "X avisos mora prontos — rever e aprovar envio"
Mário aprova (1 clique se tudo OK)
  → comunicacao-condo envia emails
  → registo em audit_log
```

### FLOW B — Avaria no edifício
```
Condómino envia email "avaria no elevador"
  → atendimento-condo: classifica avaria_urgente + edifício + fracção
  → manutencao-condo:
      selecciona prestador urgência elevadores
      abre OT urgente
      → comunicacao-condo notifica prestador (sem aprovação — urgência)
      → inbox_item Mário: "OT URGENTE aberta — elevador [Edifício]"
Prestador resolve
  → manutencao-condo fecha OT
  → financeiro-condo lança fatura (se custo aprovado anteriormente)
```

### FLOW C — Renovação de seguro
```
Dia 1 → seguros-condo verifica apólices
  → apólice vence em 60 dias: inbox_item informativo
  → seguros-condo simula mercado: encontra alternativa -15% prémio
  → approvals_queue: "Renovar seguro [Edifício]?
     Actual: €X/ano (Seguradora A)
     Alternativa: €Y/ano (Seguradora B) — poupança €Z/ano
     RECOMENDAÇÃO: mudar para B"
Mário aprova mudança
  → comunicacao-condo contacta Seguradora B
  → seguros-condo cria nova apólice em v3_seguros.apolices
```

### FLOW D — Assembleia anual
```
Janeiro → compliance-condo: "assembleia anual [Edifício] não agendada — prazo: 31 Mar"
  → inbox_item para orquestrador
Mário (ou orquestrador com input de Mário): /convocar [Edifício] 2026-03-15
  → assembleia-condo:
      verifica prazo (15 Mar - HOJE = OK se >10 dias)
      lê ata anterior
      gera ordem de trabalhos
      gera convocatória
  → approvals_queue: "Convocatória [Edifício] 15 Mar — confirmar?"
Mário confirma
  → comunicacao-condo envia a todos os condóminos
  → reminder em 3 dias antes para orquestrador
Após assembleia: input das notas
  → assembleia-condo redige ata
  → approvals_queue: "Ata [Edifício] — rever?"
  → aprovada → docs-condo arquiva no Drive
```

### FLOW E — Poupança energética
```
Trimestral → energia-condo: simular-tarifas [todos os edifícios]
  → Edifício X: contrato há 3 anos, tarifa desactualizada
  → simulação: poupança €480/ano mudando para comercializador B
  → inbox_item: "Poupança potencial €480/ano em energia — [Edifício X]"
Mário decide avançar
  → energia-condo: iniciar-mudanca-comercializador
  → approvals_queue com detalhe: penalidade saída €0, ROI imediato
Mário aprova
  → comunicacao-condo contacta comercializador B
  → energia-condo acompanha activação (reminder 30 dias)
```

---

## O que Mário vê no Command Centre

### system.inbox_items (leitura — sem acção)
Tudo o que os agentes fizeram de forma autónoma:
- Quotas geradas
- Reconciliações concluídas
- Consumos monitorizados
- Sinistros acompanhados
- Documentos arquivados
- Relatórios gerados

### system.approvals_queue (requer 1 acção de Mário)
Tudo o que os agentes prepararam mas não podem executar sozinhos:
- Aprovar envio de avisos de mora
- Confirmar convocatória de assembleia
- Adjudicar obras >€200
- Autorizar mudança de comercializador energia
- Autorizar mudança de seguradora
- Aprovar participação de sinistro
- Autorizar acordo de pagamento com devedor

### SLA das aprovações (o que cada item indica)
| Prazo no approvals_queue | Significado |
|---|---|
| "urgente" | Resposta em <4h (avaria, sinistro, prazo legal) |
| "hoje" | Resposta no dia |
| sem prazo | Pode aguardar próxima sessão |

---

## Schemas Supabase — V1 Core Hub (`hkmvszkpxjbxmnixzqbl`)

> Todos os schemas abaixo **já aplicados em produção** (2026-05-05).

```
V1 Core Hub (hkmvszkpxjbxmnixzqbl)
├── system.*          ✅ APLICADO — inbox_items, approvals_queue
├── core.*            ✅ APLICADO — imoveis, pessoas, staff_roles
├── v2_condominios.*  ✅ APLICADO — 16 tabelas, RLS, 35+ índices
│   ├── fracoes                 ← financeiro-condo, assembleia-condo
│   ├── condominos              ← financeiro-condo, atendimento-condo
│   ├── recebimentos            ← financeiro-condo (Fina)
│   ├── extrato_bancario        ← financeiro-condo
│   ├── faturas_pendentes       ← financeiro-condo, docs-condo
│   ├── faturas_ocr             ← docs-condo (Dora)
│   ├── documentos              ← docs-condo (hub de documentos)
│   ├── documentos_drive        ← docs-condo
│   ├── seguro_fracoes          ← seguros-condo (Sofia)
│   ├── assembleias             ← assembleia-condo (Assie)
│   ├── atas                    ← assembleia-condo
│   ├── convocatorias           ← assembleia-condo
│   ├── comunicacoes            ← comunicacao-condo (Cami)
│   ├── historico_pedidos       ← atendimento-condo (Ana)
│   ├── carregadores_contagens  ← energia-condo (Enzo)
│   └── audit_log               ← todos os employees (bigserial)
│
│   Helper RLS: v2_condominios.get_my_edificios()
│   Migration: apps/v5-manutencao/supabase/migrations/20260505_v2_condominios_schema.sql
│
├── v3_seguros.*      ✅ APLICADO — 4 tabelas, RLS
│   ├── seguradoras             ← catálogo de seguradoras
│   ├── apolices                ← apólices do condomínio (edifício todo)
│   ├── sinistros               ← participações + acompanhamento (prazo 8 dias)
│   └── simulacoes              ← simulações de mercado para renovação
│
│   Migration: apps/v5-manutencao/supabase/migrations/20260505_v3_seguros_schema.sql
│
└── v4_energia.*      ✅ APLICADO — 6 tabelas novas, RLS
    ├── comercializadores       ← catálogo de comercializadores
    ├── contratos               ← contratos energia por edifício (CUPS, tarifa)
    ├── tarifas                 ← catálogo de tarifas para simulação
    ├── simulacoes              ← simulações tarifárias (poupança potencial)
    ├── alertas_consumo         ← consumo anormal por edifício
    └── certificados_energeticos ← SCE, classe energética, data validade

    Migration: apps/v5-manutencao/supabase/migrations/20260505_v4_energia_schema.sql
```

---

## Próximos passos (sequência)

```
1. [FEITO ✅]  supabase-designer → schema v2_condominios.* aplicado (16 tabelas)
2. [FEITO ✅]  supabase-designer → schema v3_seguros.* aplicado (4 tabelas)
3. [FEITO ✅]  supabase-designer → schema v4_energia.* aplicado (6 tabelas)
4. [FEITO ✅]  ADR-condo-001 — arquitectura AI-native validada
5. [PENDENTE]  importador-v2 → migrar 1 edifício piloto do V2 legacy
6. [PENDENTE]  activar financeiro-condo em modo piloto (1 edifício, 1 mês)
7. [PENDENTE]  activar seguros-condo (auditoria cobertura inicial)
8. [PENDENTE]  activar energia-condo (simulação tarifária inicial)
9. [PENDENTE]  activar assembleia-condo (edifício com assembleia próxima)
10. [PENDENTE] activar comunicacao-condo (primeiro envio real — quota)
11. [PENDENTE] activar equipa marketing (primeira campanha V5 Meta Ads)
```

---

*Documento gerado automaticamente por orquestrador-condo · 2026-05-05*
*Fonte de verdade dos agentes: `.claude/agents/*-condo.md`*
