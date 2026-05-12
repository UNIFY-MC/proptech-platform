---
id: ADR-V2-003
title: Cutover total V2 legacy (eozklslwfaqujaijvdnl) → V1 Core Hub (hkmvszkpxjbxmnixzqbl)
date: 2026-05-12
status: Proposed
deciders: [mario-carvalho]
sprint: sprint/v2-vertical-fase1
supersedes: decisão-de-integracao-v2-v1 (Notion page 34184147-fa60-810e-8c85-d750d2623ece, Abril 2026)
related: [ADR-V2-001, ADR-V2-002, ADR-condo-001]
---

# ADR-V2-003 — Cutover total V2 legacy → V1 Core Hub

## Status

**Proposto** · 2026-05-12

Mário aprovou o plano a alto nível. Os detalhes deste ADR aguardam validação explícita antes de qualquer fase ser iniciada.

---

## Contexto

### A decisão que este ADR supersede

A página Notion "V2 — Condomínios · Arquitectura & Integração" (ID `34184147-fa60-810e-8c85-d750d2623ece`, actualizada em Abril 2026) estabelecia a regra:

> "Não substituir o V2 pelo V1. São camadas diferentes. O V2 é o sistema operacional do condomínio. O V1 é a plataforma multi-vertical que enriquece o V2."

Esta estratégia pressupunha dois projectos Supabase em coexistência permanente, com integração via webhook/API.

### Porquê mudar de estratégia

Em Maio de 2026, durante o sprint `sprint/v2-vertical-fase1`, emergiu a evidência de que a coexistência de dois projectos Supabase tem custos que não compensam:

1. **Custo operacional duplo.** Dois projectos Supabase = duas facturas, dois conjuntos de secrets, dois conjuntos de edge functions, dois conjuntos de buckets de storage, dois ambientes a monitorizar. Para um solo founder, isto é fricção contínua.

2. **Duplicação de lógica.** As 69 Postgres functions do V2 (41 security_definer, 33 portal RPCs) existem em isolamento. Para expor dados ao V1 Core Hub, seria necessário um webhook frágil ou uma API intermediária. Qualquer alteração de negócio exige coordenação entre dois projectos.

3. **RLS inconsistente.** O V2 produção tem 8 tabelas sem RLS activado. No V1, a decisão arquitectural (ADR-condo-001) é RLS por `edificio_id` em todas as tabelas. Manter dois modelos de segurança em paralelo aumenta o risco de falha.

4. **Scaffold V2 em V1 já existe e funciona.** Durante o sprint, foram migradas 20 tabelas para `v2_condominios` no V1, com 97 fracções, 97 condominos, 525 recebimentos, 172 faturas, 1055 movimentos bancários, 96 seguros e mais dados reais do Prata Lote 2A. A app React `apps/v2-condominios/` faz build (110 módulos, 0 erros) com 23 rotas UI. O pior do trabalho de migração já está feito.

5. **Multi-vertical impossível com dois Supabase.** V3, V4, V5 todas vão para `hkmvszkpxjbxmnixzqbl`. Ter V2 isolado em `eozklslwfaqujaijvdnl` cria para sempre uma excepção arquitectural que bloqueia a visão hub-and-spoke.

### Estado actual do sprint (o que já está feito)

- 8 commits em `sprint/v2-vertical-fase1`
- 20 tabelas em `v2_condominios` migradas com dados reais
- App React `apps/v2-condominios/` com build funcional e 23 rotas UI
- ADR-V2-002 sobre PostgREST schema exposure aceite e aplicado
- `prataowners.pt` continua a servir tráfego real via Netlify + `eozklslwfaqujaijvdnl`

### O que falta para cutover

**Edge Functions (5):** `send-email` v16, `ocr-fatura` v20, `ocr-batch` v3, `pdf-proxy` v1, `ai-assistant` v5

**Postgres functions/views (69 + 7):** 41 security_definer functions, 33 portal RPCs, 7 views críticas (`conta_corrente_2026`, `dividas_abertas_2025`, `mapa_dividas_fornecedores`, `extrato_com_docs`, `v_faturas_sem_ocr`, `v_ocr_historico`, `conta_corrente`)

**Storage (4 buckets):** `assets`, `faturas`, `documentos`, `faturas-ocr` — tamanho total a inventariar

**Secrets:** `RESEND_API_KEY`, `ANTHROPIC_API_KEY` e eventuais outros a descobrir via management API

**Funcionalidades UI em falta:** selector de ano funcional, botão "Atualizar Extrato" + upload CSV, "Abrir como Condómino" (impersonation), export PDF (jsPDF + html2canvas), toggle EN (i18n), upload fatura com trigger OCR, Composer de Comunicação (email via edge function), PDF viewer embedded, Prestação de Contas com dados reais

**Autenticação:** V2 produção usa tabela própria `utilizadores_portal` com password hash — não usa Supabase Auth para staff. Requer decisão sobre auth no V1 (ver ADR-002 Padrão de Autenticação Staff Canónico).

---

## Decisões

### D1 — Schema `v2_condominios` é o único master para dados de condomínio

A partir do cutover, todos os dados de condomínio vivem exclusivamente em `v2_condominios` dentro de `hkmvszkpxjbxmnixzqbl`. O projecto `eozklslwfaqujaijvdnl` passa a read-only durante 90 dias e é descomissionado a seguir.

**Tabelas limpas dentro do schema** (convenção Opção C): `fracoes`, `condominos`, `recebimentos`, `faturas_pendentes`, `extrato_bancario` — nunca `v2_fracoes` nem `condominios_v2`.

### D2 — Edge functions portadas para V1 sem prefixo `v2-`

As 5 edge functions existem em V2 com nomes genéricos (`send-email`, `ocr-fatura`, etc.). No V1, vivem com nomes igualmente genéricos mas versionados internamente. Não se adiciona prefixo `v2-` — as funções são da plataforma, não da vertical. Excepção: se V3/V4 precisarem de funções homónimas, usam namespace diferente (ex: `send-email-v3` ou parâmetro `vertical` no body).

**Nota sobre `ocr-fatura`:** esta função usa Claude Vision (Anthropic API). A estimativa de custo de re-processamento das 172 faturas existentes é baixa (< €5) mas deve ser confirmada antes da Fase D.

### D3 — Secrets centralizados em V1 Vault

Todos os secrets (`RESEND_API_KEY`, `ANTHROPIC_API_KEY`, e outros identificados via management API do V2) são migrados para o Vault do projecto `hkmvszkpxjbxmnixzqbl`. O V2 mantém os seus secrets intactos até à conclusão da Fase F (descomissão).

**Ponto de atenção:** para aceder aos secrets actuais do V2 via management API, é necessário um PAT (Personal Access Token) do Supabase. Mário confirmou que tem o PAT disponível para esta sessão — deve ser guardado com segurança, não em ficheiros de código.

### D4 — Storage migrado para V1, V2 mantém-se read-only 90 dias

Os 4 buckets do V2 são replicados para o projecto V1. O V2 fica em modo read-only (sem novas escritas) durante 90 dias pós-cutover como segurança de rollback. Ao fim de 90 dias sem incidentes, os buckets V2 são eliminados.

**Sequência obrigatória:** storage migra na Fase D, DEPOIS das edge functions (Fase C), porque as edge functions precisam de saber o bucket URL final antes de serem deployadas.

### D5 — Cutover é big-bang DNS swap, sem dual-write

Não se implementa dual-write (escrever simultaneamente em V2 e V1). A razão: dual-write duplica a complexidade, cria risco de divergência silenciosa, e o downtime esperado para um DNS swap em prataowners.pt é de minutos (Netlify propaga rapidamente).

**Rollback strategy (D6):** durante 90 dias pós-cutover, o projecto V2 mantém-se activo e com dados congelados na data do cutover. Se for detectado problema crítico, o DNS é revertido para apontar para o Netlify V2 legacy. A janela de rollback é de 90 dias. Após descomissão do V2, rollback deixa de ser possível.

### D6 — Rollback explícito

| Janela | Rollback possível? | Mecanismo |
|---|---|---|
| 0–90 dias pós-cutover | Sim | Reverter CNAME `prataowners.pt` para Netlify V2 legacy; V2 Supabase ainda activo |
| Após descomissão V2 | Não | Não existe |

Condição para iniciar descomissão: 90 dias sem incidente P0 ou P1 em produção V1.

---

## Fases de Implementação

> Sequência obrigatória. Cada fase requer critério de aprovação explícito do Mário antes de avançar para a seguinte.

### Fase A — Auditoria e inventário completo

**Duração estimada:** 2–4 horas

**Tasks:**
1. Exportar lista completa de secrets do V2 via management API (PAT necessário)
2. Inventariar tamanho dos 4 buckets de storage (`assets`, `faturas`, `documentos`, `faturas-ocr`) em MB/GB
3. Exportar as 69 functions + 7 views do V2 via `pg_dump` ou query a `information_schema`
4. Listar versões actuais das 5 edge functions no V2 (`send-email` v16, `ocr-fatura` v20, etc.)
5. Identificar método de sincronização bancária — a RPC `portal_extrato_upsert` recebe CSV; verificar se há credenciais bancárias externas ou se o CSV é carregado manualmente
6. Confirmar se há integrações externas a apontar directamente para `eozklslwfaqujaijvdnl` (ex: webhooks de terceiros, cron jobs externos)

**Dependências:** PAT Supabase disponível (Mário confirma)

**Success criteria:** documento de inventário completo em `.claude/strategy/sops/v2-inventory.md` com todos os items acima. Sem surpresas escondidas.

**Critério de aprovação Mário:** "Inventário revisto e sem bloqueadores desconhecidos — avançar Fase B"

**Bloqueador potencial:** se o `portal_extrato_upsert` depende de credenciais bancárias externas (Open Banking, API banco), a migração desta funcionalidade pode ser mais complexa do que um port simples. Identificar na Fase A.

---

### Fase B — Port das Postgres functions e views

**Duração estimada:** 4–8 horas

**Tasks:**
1. Portar as 7 views para `v2_condominios` no V1 (adaptar schema references de `public.*` para `v2_condominios.*`)
2. Portar as 33 portal RPCs críticas (condómino + admin + comum) — ajustar search_path e security_definer
3. Portar as 41 security_definer functions (verificar dependências entre si)
4. Criar migration SQL: `20260512_v2_condominios_functions.sql`
5. Testar em ambiente de desenvolvimento com dados migrados do Prata Lote 2A
6. Verificar que `portal_staff_login` funciona com o sistema auth do V1 (ou decidir se mantém o modelo de tabela própria `utilizadores_portal` — ver ADR-002)

**Dependências:** Fase A completa; decisão de auth staff (ADR-002 ou nova decisão)

**Success criteria:** todas as RPCs retornam resultados correctos em queries de teste contra dados migrados. Zero erros de schema reference.

**Critério de aprovação Mário:** "Smoke test das RPCs críticas OK — avançar Fase C"

**Bloqueador potencial:** a autenticação staff do V2 usa `utilizadores_portal` com password hash (não Supabase Auth). O V1 usa `is_staff()` + magic-link Resend (ADR-002). É necessária decisão: (a) manter `utilizadores_portal` em paralelo para V2 admin, ou (b) migrar todos os staff para o modelo V1. Opção (a) é mais segura e rápida; opção (b) é mais limpa mas requer comunicação com utilizadores.

---

### Fase C — Port das Edge Functions

**Duração estimada:** 4–6 horas

**Tasks:**
1. Copiar código das 5 edge functions do V2 para `apps/v2-condominios/supabase/functions/`
2. Adaptar imports e variáveis de ambiente (URL do projecto V1, bucket names)
3. Deploy de cada função no V1: `send-email`, `ocr-fatura`, `ocr-batch`, `pdf-proxy`, `ai-assistant`
4. Migrar secrets para Vault do V1 (RESEND_API_KEY, ANTHROPIC_API_KEY, outros)
5. Testar `send-email` com email de teste real
6. Testar `ocr-fatura` com PDF de teste (sem re-processar as 172 faturas reais ainda)
7. Verificar `pdf-proxy` — confirmar se o CORS é necessário e qual o domínio de origem (prataowners.pt vs novo domínio V1)

**Dependências:** Fase B completa (functions precisam de schema V1 funcional)

**Success criteria:** 5/5 edge functions deployadas e activas no V1. Tests manuais OK.

**Critério de aprovação Mário:** "Edge functions testadas individualmente — avançar Fase D"

**Nota sobre `pdf-proxy`:** esta função faz proxy de PDFs possivelmente para contornar CORS. Se o novo domínio da app V2 em V1 for diferente de `prataowners.pt`, o CORS precisa de ser actualizado.

---

### Fase D — Migração de Storage

**Duração estimada:** 2–4 horas (mais tempo se storage > 5 GB)

**Tasks:**
1. Criar os 4 buckets equivalentes no V1 (`assets`, `faturas`, `documentos`, `faturas-ocr`)
2. Configurar políticas de acesso RLS em cada bucket (equivalentes às do V2)
3. Fazer download de todos os ficheiros dos buckets V2 e upload para V1
4. Actualizar URLs de ficheiros nas tabelas `v2_condominios.documentos`, `v2_condominios.faturas_pendentes`, `v2_condominios.documentos_drive` para apontar para os novos URLs do V1
5. Testar acesso a PDFs e imagens via app React

**Dependências:** Fase C completa (edge functions já deployadas com bucket names correctos)

**Success criteria:** 100% dos ficheiros acessíveis via V1. Zero links quebrados na app.

**Critério de aprovação Mário:** "Verificar amostra de PDFs e imagens carregados na app — avançar Fase E"

**Estimativa de custo de transferência:** a confirmar na Fase A. Se total < 1 GB, tempo < 30 min. Se > 5 GB, pode demorar e ter custo de egress Supabase.

---

### Fase E — Completar UI e QA completo

**Duração estimada:** 8–12 horas (maior fase)

**Tasks UI em falta:**
- Selector de ano funcional (trocar `2026` hardcoded por estado dinâmico)
- Botão "Atualizar Extrato" com upload de CSV e chamada a `portal_extrato_upsert`
- "Abrir como Condómino" (impersonation para admin ver o portal do condómino)
- Export PDF de relatórios com jsPDF + html2canvas
- Toggle EN para i18n (objeto de traduções PT/EN)
- Upload de fatura com trigger `ocr-fatura` e estado de processamento
- Composer de Comunicação (envio de email via `send-email` para condóminos)
- PDF viewer embedded para documentos
- Prestação de Contas com KPIs reais (usar RPCs `get_cc_2026`, `get_receitas_resumo`, `get_receitas_detalhe`, `get_docs_2026`)

**Tasks QA:**
- Teste end-to-end de todos os fluxos críticos: login staff, consulta condómino, emitir aviso, registar recebimento, actualizar extrato, upload fatura + OCR
- Teste em mobile (PWA)
- Verificar audit log a funcionar para todas as acções relevantes
- Comparar outputs críticos (totais de conta corrente, dividas) com V2 produção para confirmar paridade

**Dependências:** Fases A–D completas

**Success criteria:** paridade funcional com V2 produção em todas as funcionalidades usadas actualmente. QA sign-off pelo Mário.

**Critério de aprovação Mário:** "Testar todos os fluxos diários durante 2–3 dias em Preview Vercel com dados reais — aprovação explícita de cutover"

---

### Fase F — Cutover DNS e descomissão

**Duração estimada:** 1–2 horas (execução) + 90 dias (período de retenção)

**Tasks:**
1. Notificar utilizadores com antecedência mínima de 48 horas (email via `send-email`)
2. Agendar janela de manutenção num período de baixo tráfego (ex: domingo de madrugada)
3. Colocar `prataowners.pt` em modo manutenção no Netlify (página estática de "sistema em actualização")
4. Fazer dump final dos dados do V2 produção para arquivo local
5. Trocar DNS: `prataowners.pt` CNAME de Netlify (V2 legacy) para Vercel (V1 nova app)
6. Verificar propagação DNS (pode demorar 5–30 min)
7. Smoke test em produção: login, consulta dados, upload ficheiro
8. Remover modo manutenção
9. Monitorizar erros durante 24–48 horas

**90 dias depois (Fase F2):**
- Confirmar zero incidentes P0/P1
- Desactivar projecto V2 Supabase (`eozklslwfaqujaijvdnl`)
- Eliminar buckets V2
- Arquivar código legacy
- Actualizar página Notion V2 Arquitectura com estado "MIGRADO"

**Dependências:** Fase E aprovada pelo Mário; janela de manutenção agendada

**Success criteria:** `prataowners.pt` a servir a partir do V1 sem erros. Condóminos conseguem fazer login e aceder aos seus dados.

**Critério de aprovação Mário:** aprovação explícita de "executar cutover agora" após QA da Fase E

**Downtime esperado:** 5–15 minutos (modo manutenção + propagação DNS). Minimizável se propagação for rápida.

---

## Consequências

### Positivas

- **Um único Supabase project** para toda a plataforma → menos custos, menos gestão
- **Consistência arquitectural** com V3, V4, V5 — todos partilham `hkmvszkpxjbxmnixzqbl`
- **RLS unificado** — modelo de segurança por `edificio_id` consistente em todo o `v2_condominios`
- **CRM centralizado** pode finalmente funcionar — `core.pessoas` como registo único de proprietários, partilhado entre condomínio, seguros e energia
- **Edge functions partilháveis** — `send-email` serve todas as verticais, não só o V2
- **Audit trail universal** (ADR-condo-001) aplicável a tudo
- **Multi-edifício real** — o scaffold V1 suporta múltiplos edifícios desde o início; o V2 legacy é mono-edifício por natureza

### Negativas / Riscos

- **Risco de regressão funcional.** Com 69 functions e 5 edge functions a portar, é provável encontrar subtilezas não documentadas. O período de QA (Fase E) é crítico.
- **Downtime no cutover.** Mesmo que seja 5–15 minutos, afecta utilizadores reais. A notificação antecipada é obrigatória.
- **Storage transfer.** Se os buckets tiverem muitos GB, a transferência pode ser lenta e ter custo de egress no plano gratuito do Supabase. A confirmar na Fase A.
- **Auth staff a decidir.** O modelo de `utilizadores_portal` com password hash é diferente do modelo V1 (magic-link + `is_staff()`). Esta decisão pode aumentar o scope da Fase B.
- **Método de sincronização bancária.** O `portal_extrato_upsert` pode depender de processos externos não documentados. Risco de bloqueio na Fase A.
- **Página Notion desactualizada.** A página de Arquitectura V2 no Notion ainda diz "Não substituir o V2 pelo V1". Precisa de ser actualizada para reflectir esta decisão (trigger para `notion-librarian`).

### Neutras

- O URL `prataowners.pt` mantém-se o mesmo — sem impacto para utilizadores finais após cutover
- O código do V2 legacy (`admin/index.html`, `index.html`) fica arquivado no repositório mas sem servir tráfego

---

## Alternativas consideradas

### Alternativa 1 — Coexistência permanente com webhook (estratégia anterior)

V2 continua em `eozklslwfaqujaijvdnl`, V1 liga via webhook quando condómino paga quota. Era a estratégia de Abril 2026.

**Rejeitada porque:** dois Supabase projects para sempre, RLS inconsistente, CRM nunca funciona correctamente, qualquer feature cross-vertical exige API intermediária. Para um solo founder, a fricção operacional é insustentável a médio prazo.

### Alternativa 2 — Dual-write (escrever em V2 e V1 em simultâneo)

Durante um período de transição, a app escreve em ambos os projectos. Permite rollback mais fácil.

**Rejeitada porque:** complexidade de implementação muito superior ao ganho de segurança. O risco de divergência silenciosa (V2 e V1 com dados diferentes) é maior que o risco de downtime de 15 minutos. O rollback via DNS é suficientemente rápido.

### Alternativa 3 — Migrar apenas os dados, manter V2 para auth de condóminos

Dados migram para V1, mas o portal do condómino continua a autenticar via V2 (token + magic link).

**Rejeitada porque:** cria dependência permanente do V2 para autenticação, que é precisamente o que queremos eliminar. Não resolve o problema de fundo.

---

## Pontos de bloqueio identificados

| Bloqueador | Fase | Severidade | Acção |
|---|---|---|---|
| Método sync bancário (CSV manual vs API externa?) | A | Alta | Investigar na Fase A antes de avançar |
| Decisão auth staff (tabela própria vs magic-link V1) | B | Média | Decidir antes de iniciar Fase B |
| Tamanho dos buckets storage (custo egress) | A | Média | Inventariar na Fase A |
| Secrets V2 não documentados | A | Média | Listar via management API (PAT) na Fase A |
| CORS do `pdf-proxy` (domínio de origem) | C | Baixa | Verificar na Fase C |

---

## Referências

- **ADR-V2-001** — decisão original de arquitectura V2 (se existir; verificar em Notion)
- **ADR-V2-002** — PostgREST schema exposure (`pg_roles.rolconfig` como fonte de verdade) · `.claude/strategy/adrs/ADR-V2-002-postgrest-schema-exposure.md`
- **ADR-condo-001** — Arquitectura AI-native V2: Supabase Cron, RLS por `edificio_id`, audit universal · `.claude/strategy/adrs/ADR-condo-001-ai-native-architecture.md`
- **ADR-002** — Padrão de Autenticação Staff Canónico (Notion: `34884147-fa60-811c-9855-d1f7ebdfb1d7`)
- **Notion V2 Arquitectura** — `34184147-fa60-810e-8c85-d750d2623ece` (desactualizada — reflecte estratégia de coexistência de Abril 2026; a actualizar)
- **Notion Visão & Arquitectura** — `34084147-fa60-813d-94fe-d7f72d47d8bd`
- **Supabase V2 produção** — `eozklslwfaqujaijvdnl` (eu-west-3, prataowners.pt)
- **Supabase V1 Core Hub** — `hkmvszkpxjbxmnixzqbl` (eu-west-3)

---

## Followups pós-cutover

- [ ] **Actualizar página Notion** V2 Arquitectura (`34184147-fa60-810e-8c85-d750d2623ece`) com estado "MIGRADO" e link para este ADR
- [ ] **Monitorização 30 dias:** verificar que não há erros silenciosos em OCR, extrato, emails
- [ ] **Descomissão V2** aos 90 dias: desactivar projecto Supabase, eliminar buckets, arquivar código
- [ ] **Informar condóminos** após cutover estável: "migrámos para plataforma melhorada" (marketing positivo)
- [ ] **Activar webhook Core ↔ V2** (agora desnecessário — dados já partilham o mesmo Supabase; substituir por query directa ou RPC entre schemas)
- [ ] **Extender modelo multi-edifício** para outros condomínios além do Prata Lote 2A
