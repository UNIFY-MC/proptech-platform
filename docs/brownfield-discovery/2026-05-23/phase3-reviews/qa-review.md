# QA Gate Review — Phase 7

> **Workflow:** Brownfield Discovery — Phase 7 (QA Gate)
> **Reviewer:** Quinn (Guardian — aiox-qa)
> **Data:** 2026-05-23
> **Inputs:** system-architecture.md · SCHEMA.md · DB-AUDIT.md · frontend-spec.md · technical-debt-DRAFT.md · db-specialist-review.md · ux-specialist-review.md

---

## Verdict

**NEEDS_WORK**

Razão sumária: o draft do architect tem **fundação sólida e factualmente correcta** (Phase 1 está bem coberta, severities maioritariamente sãs, IDs consistentes). Mas os dois specialist reviews (DB + UX) identificaram, em conjunto, **12 dívidas novas materiais (DB-013→DB-018, FE-015→FE-020)**, **6 re-calibrações de severity obrigatórias** e **4 correcções estruturais** que NÃO estão refletidas no draft. Avançar para Phase 8 sem incorporar estas alterações produz um documento final que sub-representa risco (especialmente DB) e gera plano de remediação não-executável (Frontend XL sem decomposição). Os blockers são poucos mas concretos — uma vez incorporados, o documento fica APPROVED.

Não é WAIVED porque os gaps são **specialist-validated** (não opinião): o supabase-designer documentou que `supabase db dump` (recomendado no draft) **não resolve rastreabilidade**; a aiox-ux documentou que FE-001 sem decomposição em 3 sub-fases **não é epic executável**. Estes não são detalhes — são correcções de execução.

---

## 7 Checks

### Check 1 — Completude factual: **CONCERNS**

**Áreas cobertas pelo draft:**
- Arquitectura: 8 ARCH-* (apps, schemas paralelos, ADRs sem ficheiro, mobile órfão, Discord dual, CLI)
- Database: 12 DB-* (RLS, SECURITY DEFINER, migrations, RPCs, naming, staging, brain_*, índices)
- Frontend: 14 FE-* (design system, auth, A11Y, routing, cache, órfãos, fontes)
- Ops: 5 OPS-* (ADRs missing, EFs não versionadas, branches sprint, funções one-shot)

**Gaps materiais não cobertos pelo draft (todos confirmados nos specialist reviews):**

| Gap | Origem | Severity correcta | Status no draft |
|-----|--------|-------------------|-----------------|
| DB performance — `auth_rls_initplan` em 38 policies V1 | DB review (DB-013) | HIGH | OMITIDO |
| DB performance — 110 FKs sem índice em V1 (não os 9 de V2) | DB review (DB-014) | HIGH | OMITIDO (referido em audit, sem ID de debt) |
| DB performance/security — 149 `multiple_permissive_policies` | DB review (DB-015) | HIGH | OMITIDO (referido em audit, sem ID de debt) |
| DB config — PostgREST exposure não verificada para `iam`/`v2_new` | DB review (DB-016) | MEDIUM | OMITIDO |
| DB security — `pg_net` e `http` em schema `public` | DB review (DB-017) | MEDIUM | OMITIDO (mencionado lateralmente em DB-AUDIT, sem ID) |
| DB silent-failure — `core.codigos_postais` deny total | DB review (DB-018) | MEDIUM | OMITIDO |
| FE performance/bundle — zero auditoria Lighthouse/bundle size | UX review (FE-015) | HIGH | OMITIDO |
| FE robustness — zero Error Boundaries, loading states ad-hoc | UX review (FE-016) | HIGH | OMITIDO |
| FE mobile — zero auditoria responsive, sem breakpoints partilhados | UX review (FE-017) | HIGH | OMITIDO |
| FE testing — zero Vitest/RTL/Playwright em qualquer app | UX review (FE-018) | HIGH | OMITIDO (crítico — pré-requisito de quase tudo) |
| FE i18n — strings PT-PT hardcoded, zero i18next | UX review (FE-019) | MEDIUM | OMITIDO (mencionado em frontend-spec sem ID) |
| FE embed — `AppEmbed.jsx` sem contrato formal | UX review (FE-020) | MEDIUM | OMITIDO |

**Outras áreas:**
- **Observability/monitoring:** Não há OPS-* sobre alertas, dashboards, error tracking. O `swarm-orchestrator-cron` pausado (DB-011) é tratado isoladamente — mas a ausência de monitoring estrutural não é capturada como dívida própria. **Gap material**.
- **Secrets management:** Nada sobre rotação de chaves, expiração de tokens, gestão Vault. Em DB temos `supabase_vault` instalado mas zero análise. **Gap material menor**.
- **Dependencies/npm packages outdated:** Zero análise de pacotes desactualizados (React 18 vs 19, Vite 6 vs 8, etc.). O frontend-spec menciona "Vite 8 (pre-release/recente)" sem ID de debt. **Gap material menor**.
- **CI/CD health:** Não há análise do estado dos workflows GitHub Actions, do hook synapse, do auto-deploy Netlify. Para 7+ branches sprint não mergeadas (OPS-004) o impacto em CI/CD não é discutido. **Gap material menor**.

**Conclusão Check 1:** 12 gaps documentados nos reviews + 4 áreas materialmente sub-cobertas (observability, secrets, dependencies, CI/CD). Não é FAIL porque os 12 estão **identificados** nos reviews — basta incorporar. Os outros 4 são opcionais (podem ficar para próxima auditoria) mas devem ser sinalizados.

---

### Check 2 — Consistência de severities: **CONCERNS**

**Severities que estão correctamente classificadas:**
- T01/DB-001 (RLS) Critical ✓
- T02/DB-002 (SECURITY DEFINER views) Critical ✓
- T03/DB-003 (migrations sem ficheiro) Critical ✓
- T04/ARCH-001 (dois schemas V2) Critical ✓
- T05/OPS-001 (ADRs V11-* sem ficheiro) Critical ✓
- T08/DB-004 (RPCs SECURITY DEFINER) Critical ✓
- T10/FE-003 (acessibilidade DL 83/2018) Critical ✓

**Severities incorrectas (specialist-confirmed):**

| ID | Severity draft | Severity correcta | Razão |
|----|---------------|-------------------|-------|
| DB-005 (rename `v1_owners_club`) | HIGH | **CRITICAL** | `ALTER SCHEMA RENAME` invalida funções e vistas que referenciam o schema pelo nome — risco de quebra silenciosa em produção. DB review documentou auditoria de dependências obrigatória. |
| DB-012 (`v2-legacy-bridge-cron`) | LOW | **HIGH** | Dependência cross-projecto em tempo real sem monitoring; cutover V2 (ADR-V2-003) está em curso — dados stale podem chegar a `v2_new` sem alertas. DB review reclassificou. |
| FE-004 (routing inconsistente) | HIGH | **CRITICAL** | V5 é a app principal **em produção** sem URL shareable — bloqueia suporte ao cliente, deep links, browser back. UX review reclassificou: "Capacitor Fase 7 resolve" é justificação teórica enquanto débito é operacional hoje. |
| FE-009 (demo accounts hardcoded) | MEDIUM | **HIGH** | Dados demo importados em runtime de produção é risco directo (mistura possível com dados reais). Marcado `@deprecated 3.4A` há 3+ versões — esquecido. UX review reclassificou. |
| FE-011 (TODOs 2026-05-05) | MEDIUM | **HIGH** | Lista inclui bugs visíveis em produção V5: NIF sem checkdigit, ETA hardcoded fake, placeholders `suporte@exemplo.pt` e `app.exemplo.pt` em ecrãs de utilizador final, writes para tabela errada. Não é débito estético — é bug em produção. |
| FE-007 (apps/core/ e v1-core/ no filesystem) | HIGH | **MEDIUM** | É lixo sem risco (sem `src/`, só `node_modules/`). Resolução é 1h. UX review baixou — confirmado. |
| FE-013 (fontes inconsistentes) | LOW | **MEDIUM** | Se houver embedding (`AppEmbed.jsx` sugere padrão), todas as fontes carregam em simultâneo — bundle inflado, FOUT. UX subiu. |

**Severity inflation check:**
- ARCH-002 (`bia-chat`/`mia-chat`) Critical — questionável. Custo duplicado AI é real mas é cleanup de rename. Operacionalmente é MAIS High que Critical. **Não bloqueante mas merece nota.** Mantemos Critical no draft porque DB-007 corrobora ("custo duplicado e dados de histórico de chat divididos") e branch está activa — convergência incompleta é Critical justificável.
- OPS-001 + ARCH-003 são duplicação intencional do draft. Ok como está.

**Conclusão Check 2:** 7 re-calibrações obrigatórias, todas specialist-confirmed. Nenhuma severity Critical foi inflacionada falsamente — todas as Critical têm justificação real. O problema é o oposto: alguns High/Medium estão **sub-dimensionados**.

---

### Check 3 — Cross-referências válidas: **PASS**

Verificação dos IDs usados no draft vs IDs nos reviews:

| ID range | Draft | DB review | UX review | Coerência |
|----------|-------|-----------|-----------|-----------|
| DB-001 → DB-012 | ✓ | ✓ (validados + revistos) | n/a | PASS |
| FE-001 → FE-014 | ✓ | n/a | ✓ (validados + revistos) | PASS |
| ARCH-001 → ARCH-008 | ✓ | n/a (referenciado em DB-012) | n/a (referenciado em FE-006) | PASS |
| OPS-001 → OPS-005 | ✓ | n/a | n/a | PASS |
| T01 → T10 (Top 10) | ✓ Mapeamento explícito para DB-*/FE-*/ARCH-*/OPS-* | ✓ | ✓ | PASS |

**Cross-referências detectadas:**
- T05/OPS-001 = ARCH-003 (intencional, draft documenta)
- T09/ARCH-002 = DB-007 (intencional, draft documenta)
- FE-006 = ARCH-005 (UX review pede remover duplicação — manter referência cruzada)
- FE-008 é sub-item de FE-002 (UX review valida)

**Sem broken refs.** Nenhum ID referenciado que não exista. Numeração sequencial coerente.

---

### Check 4 — Specialist reviews incorporáveis: **PASS**

**DB review (supabase-designer):**
- 5 revisões de severity/esforço com justificação técnica concreta (snippets SQL inclusos)
- 6 dívidas novas DB-013→DB-018 com migration examples + dependências
- 3 Top Remediations com Fases concretas e rollback plans
- Sequência de execução documentada (DB-016 primeiro, depois RLS, depois search_path, etc.)
- **Accionável:** SIM, sem ambiguidade

**UX review (aiox-ux):**
- 7 revisões de severity para FE-* existentes com razões observáveis
- 6 dívidas novas FE-015→FE-020 com Esforço categorizado (M/L/G)
- 3 Top Remediations com passos concretos (ficheiros a alterar, packages a criar)
- Decomposição de FE-001 em 3 sub-fases (tokens / primitives / migration) com semanas estimadas por fase
- **Accionável:** SIM, sem ambiguidade

**Ambos os reviews:**
- Apresentam tabela "Por Debt" com original vs revised
- Documentam dependências entre debts
- Propõem sequenciamento (não só lista)
- Identificam o que é quick win vs structural vs long-term

**Conclusão Check 4:** PASS sem reservas. Os reviews estão escritos para serem incorporados — o architect tem tudo o que precisa.

---

### Check 5 — Gaps materiais não cobertos: **CONCERNS**

Para além dos 12 gaps DB/FE já listados em Check 1 (que serão incorporados pelos reviews):

**Gaps adicionais NÃO cobertos pelo draft NEM pelos reviews:**

1. **Observability / Error Tracking** — Sem Sentry, sem Logflare, sem agregador de logs cross-app. `swarm-orchestrator-cron` está pausado e foi descoberto por chance (DB-011) — não por alerta. V2 produção (prataowners.pt) não tem error tracking documentado. **Severity provável: HIGH.** Recomendo adicionar como OPS-006 antes de Phase 8.

2. **Dependencies / package updates** — Mix de React 18 (dashboard) com React 19 (v2/v4/v5/truth). Vite 6 vs 8 entre apps. `lucide-react` em múltiplas versões `[unverified]`. Zero análise de CVE conhecidos via `npm audit`. Em monorepo com `packages/*` partilhados, drift de versões é dívida material. **Severity provável: MEDIUM.** Recomendo adicionar como FE-021.

3. **Secrets rotation / Vault hygiene** — `supabase_vault` está instalado mas DB-AUDIT não analisa: quantas keys em Vault? Quando foram rodadas? Estão em uso ou abandonadas? Service role key (V2 produção, 5k linhas reais) sem evidência de rotação. **Severity provável: MEDIUM.** Recomendo adicionar como OPS-007.

4. **CI/CD health** — 7+ branches sprint não mergeadas (OPS-004) implica que os workflows GitHub Actions estão a correr para muitas branches sem validação final em main. Não há análise do hook `synapse-engine.cjs` ou `enforce-git-push-authority.cjs` (presentes no repo mas não inventariados). **Severity provável: LOW/MEDIUM.** Não bloqueante.

5. **Risco V2 produção (prataowners.pt) em janela 4 semanas:**
   - 8 tabelas sem RLS em V2 (DB-001 parcial) — exploitable se anon_key vazar
   - 8 tabelas `brain_*` em V2 (DB-008) — propósito incerto, criadas em 2026-05-16
   - 2 funções de migração one-shot activas (OPS-005) — endpoints destrutivos expostos
   - `v2-legacy-bridge-cron` sem monitoring (DB-012 reclassificado HIGH)

   O draft tem secção "Riscos a Curto Prazo (próximos 30 dias)" que captura DB-001 e DB-012. **Mas não inclui DB-008 (brain_*) nem OPS-005 (migrar-faturas).** Estes têm risco real de produção V2 nas próximas 4 semanas. **Gap material para Check 7.**

**Conclusão Check 5:** 4 gaps adicionais (observability, dependencies, secrets, CI/CD) + 1 gap na secção "Riscos curto prazo" (V2 produção). Estes não foram capturados nem pelo architect nem pelos specialists. Devo sinalizar mas não bloqueio Phase 8 por eles — podem ir para nota "follow-up auditoria" se Mário preferir.

---

### Check 6 — Esforços realistas: **CONCERNS**

**Esforços incorrectos no draft (DB-review confirmou):**

| ID | Esforço draft | Esforço correcto | Razão |
|----|--------------|-------------------|-------|
| DB-001 (RLS) | M | **XL** | Auditoria de Edge Functions necessária antes (não pode ser feito em bloco) |
| DB-002 (SECURITY DEFINER views) | M | **L** | 40 vistas × teste de regressão por view |
| DB-003 (migrations sem ficheiro) | L | **XL** | `supabase db dump` **não resolve** o problema (é snapshot, não history) — solução real é baseline snapshot + processo forward-only |
| DB-004 (RPCs SECURITY DEFINER) | L | **XL** | 218 funções com categorização (62 search_path + 106 anon + 112 authenticated) — não é trabalho em bloco |

**Esforços incorrectos no draft (UX-review confirmou):**

| ID | Esforço draft | Esforço correcto | Razão |
|----|--------------|-------------------|-------|
| FE-001 (design system) | XL monolítico | **3 sub-fases: P=1-2sem + M=3-4sem + G=6-8sem** | XL sem decomposição não é epic executável |
| FE-003 (acessibilidade) | G | **Decomposto: P (quick wins 1-2 dias) + G (ongoing)** | Permite Phase 1 ter A11Y baseline rápido |

**Decomposições em falta no draft:**
- Várias debts marcadas como L/G sem sub-tarefas. Por exemplo DB-009 (341 índices unused) está como M mas requer análise de cada `pg_stat_user_indexes` row.
- OPS-003 (50 EFs não versionadas) está L mas DB review sugere "exportar functions" — sem tooling claro, é XL real.

**Esforços correctos (não tocar):**
- Quick wins da Phase 1 (OPS-001, OPS-005, FE-007, FE-009, DB-011) — S/P estão certos.
- DB-005 esforço M é correcto MAS deve ser feito por ÚLTIMO dos critical (rename schema com muitas dependências).

**Conclusão Check 6:** 4 esforços DB sub-dimensionados (M/L → XL) + 1 esforço FE não-decomposto (FE-001). Sem ajuste, Mário vai planear sprints com horizonte irreal. Bloqueante para Phase 8.

---

### Check 7 — Riscos de produção V2 (prataowners.pt): **CONCERNS**

V2 prataowners.pt tem ~5.000 linhas de dados reais de clientes (Property 007 LDA). Análise das debts que afectam V2 nas próximas 4 semanas:

**Críticas para V2 produção (próximos 30 dias):**

| ID | Risco V2 específico | Probabilidade incidente | Sinalizado como blocker no draft? |
|----|---------------------|------------------------|----------------------------------|
| DB-001 (parcial V2: 8 tabelas sem RLS) | `configuracoes`, `envios_log`, `codigos_postais_pt` legíveis via anon_key | Alta se anon_key vazar | SIM — secção Riscos Curto Prazo |
| DB-008 (8 tabelas `brain_*` em V2) | Schema produção poluído; propósito incerto; possível data drift se Mia escrever neles inadvertidamente | Média | **NÃO** — não está na secção Riscos Curto Prazo |
| DB-012 (`v2-legacy-bridge-cron`) | Bridge V2→V1 sem monitoring; dados stale em `v2_new` durante cutover | Média-Alta | SIM (apenas após reclassificação para HIGH) |
| OPS-005 (`migrar-faturas`, `migrar-fatura`) | Edge Functions destrutivas one-shot ainda activas em produção; invocação acidental pode corromper dados de faturas | Baixa-Média | **NÃO** — não está na secção Riscos Curto Prazo |
| DB-014 (110 FKs sem índice V1) | V2 produção tem FKs próprias (9 — já confirmadas); degradação de performance em volumes baixos é incremental | Baixa imediata | n/a (foco do gap é V1) |
| DB-002 (40 SECURITY DEFINER views) | Se alguma view exposta cruza dados V2 produção via REST com privilégios elevados → exfiltração potencial | Média se chaves vazarem | SIM |

**O que está bem sinalizado:**
- O draft tem secção "Riscos a Curto Prazo (próximos 30 dias)" com 7 entradas
- DB-001 (RLS), DB-003 (migrations), ARCH-001 (schemas V2 paralelos), OPS-001 (ADRs missing), ARCH-002+DB-007 (bia/mia), OPS-004 (branches), DB-011 (swarm) — todos cobertos

**O que NÃO está sinalizado (gap):**
- **DB-008 (brain_*) em V2 produção** — schema produção tem 8 tabelas criadas há 7 dias sem propósito documentado. Risco de qualquer agente Mia escrever lá sem ADR. Recomendo adicionar à secção "Riscos Curto Prazo".
- **OPS-005 (funções one-shot em V2)** — endpoint destrutivo activo é risco operacional contínuo. Recomendo adicionar.

**Conclusão Check 7:** Maioria dos riscos V2 estão sinalizados. **2 gaps específicos da secção "Riscos Curto Prazo"**: DB-008 e OPS-005 devem ser adicionados (ambos têm impacto V2 produção real nas próximas 4 semanas).

---

## Resumo Quantitativo dos 7 Checks

| Check | Verdict | Bloqueante para Phase 8? |
|-------|---------|---------------------------|
| 1. Completude factual | CONCERNS | Sim (12 dívidas novas) |
| 2. Consistência severities | CONCERNS | Sim (7 re-calibrações) |
| 3. Cross-referências | PASS | Não |
| 4. Specialist reviews incorporáveis | PASS | Não |
| 5. Gaps materiais | CONCERNS | Não bloqueante (4 áreas opcionais) — mas Riscos V2 sim |
| 6. Esforços realistas | CONCERNS | Sim (5 ajustes obrigatórios) |
| 7. Riscos produção V2 | CONCERNS | Sim (2 entradas em Riscos Curto Prazo) |

**3 PASS · 5 CONCERNS · 0 FAIL** — não há falha crítica, mas há trabalho obrigatório antes de fechar Phase 8.

---

## Gaps Materiais Identificados (NEEDS_WORK)

Numerados para o architect endereçar antes de Phase 8:

1. **Incorporar 6 dívidas DB novas** (DB-013 a DB-018) do DB specialist review com migration examples e dependências documentadas.

2. **Incorporar 6 dívidas FE novas** (FE-015 a FE-020) do UX specialist review com decomposição de esforço.

3. **Re-calibrar 7 severities** conforme tabela "Severities Recalibradas" abaixo.

4. **Re-calibrar 5 esforços** (DB-001, DB-002, DB-003, DB-004, FE-001) conforme specialist reviews. Decompor FE-001 em 3 sub-fases (tokens / primitives / migration).

5. **Adicionar DB-008 e OPS-005 à secção "Riscos a Curto Prazo"** — impacto V2 produção real.

6. **Corrigir descrição de DB-003** — `supabase db dump` não resolve rastreabilidade; a solução é baseline snapshot + processo forward-only. Acrescentar risco dos 5 ficheiros locais divergentes que podem causar re-aplicação dupla.

7. **Corrigir abordagem de DB-001** — remover sugestão `USING (is_staff())` para tabelas `system.*` agentic (cria risco do swarm não conseguir escrever). Substituir por "service_role bypass automático via RLS sem policies".

8. **Re-calcular tabela "Sumário Quantitativo"** com nova contagem:
   - DB: 4→5 Critical, 3→6 High, 5→7 Medium, 1→0 Low (Total: 13→18, +5)
   - FE: 3→3 Critical, 6→8 High, 3→5 Medium, 2→2 Low (Total: 14→18, +4)
   - Total geral: 41→**53** debts (não 41 nem 44 como nos reviews — somando ARCH (8) + OPS (5) + DB (18) + FE (18) + 4 áreas adicionais opcionais se forem aceites)

9. **Documentar dependências entre debts** conforme secção "Revisão das Dependências entre DB debts" do DB review (sequência: DB-016 → DB-001 → DB-013 → DB-015; DB-009 → DB-014; DB-004+DB-002 conjunto; DB-005 último).

10. **Adicionar FE-018 (Testing baseline) como pré-requisito explícito da Fase 2/3** — sem testes, refactor de auth/routing/design system é roleta russa (UX review).

11. **Remover duplicação FE-006 ↔ ARCH-005** — manter ARCH-005 como canónica + FE-006 como nota "ver ARCH-005".

12. **Sinalizar (opcional) áreas não cobertas:** observability, dependencies/CVE, secrets rotation, CI/CD health. Pode ser sub-secção "Áreas para próxima auditoria" — não bloqueante.

---

## Severities Recalibradas

| ID | Severity no draft | Severity QA (final) | Razão |
|----|-------------------|---------------------|-------|
| DB-005 | High | **Critical** | `ALTER SCHEMA RENAME` invalida funções/vistas — operação de produção com risco silencioso (DB review) |
| DB-012 | Low | **High** | Dependência cross-projecto sem monitoring durante cutover em curso (DB review) |
| FE-004 | High | **Critical** | V5 produção activa sem URL shareable bloqueia suporte ao cliente hoje (UX review) |
| FE-007 | High | **Medium** | Lixo sem `src/`, sem risco de edição (UX review baixou) |
| FE-009 | Medium | **High** | Dados demo importados em runtime de produção (UX review subiu) |
| FE-011 | Medium | **High** | Bugs visíveis em produção V5 (NIF, ETA, placeholders) (UX review subiu) |
| FE-013 | Low | **Medium** | Impacto em embedding (`AppEmbed.jsx`) — bundle inflado, FOUT (UX review subiu) |

Severities mantidas (correctamente classificadas no draft):
- DB-001 a DB-004, DB-006 a DB-011 (DB review confirmou)
- FE-001, FE-002, FE-003, FE-005, FE-006, FE-008, FE-010, FE-012, FE-014 (UX review confirmou)
- ARCH-001 a ARCH-008 (sem objecções dos specialists)
- OPS-001 a OPS-005 (sem objecções dos specialists)

---

## Bloqueadores para Phase 8

### MUST endereçar (sem isto, Phase 8 emite documento desactualizado):

**B1 — Incorporar specialist reviews** (DB-013→DB-018 + FE-015→FE-020 = 12 dívidas novas com IDs, severities, esforços, dependências).

**B2 — Re-calibrar 7 severities** conforme tabela acima.

**B3 — Re-calibrar 5 esforços** (DB-001, DB-002, DB-003, DB-004 → XL; FE-001 → 3 sub-fases).

**B4 — Corrigir abordagem técnica em DB-003** — `supabase db dump` não resolve. Substituir por baseline snapshot.

**B5 — Corrigir abordagem técnica em DB-001** — remover sugestão `USING (is_staff())` para tabelas `system.*`. Substituir por "RLS sem policies = service_role bypass".

**B6 — Adicionar DB-008 e OPS-005 à secção "Riscos a Curto Prazo"** (risco real V2 produção nas próximas 4 semanas).

**B7 — Re-calcular tabela Sumário Quantitativo** com nova contagem (~53 debts).

### NICE-TO-HAVE (não bloqueia Phase 8 mas melhora o documento):

**N1 — Sinalizar áreas não auditadas:** observability/monitoring, dependencies/CVE, secrets rotation, CI/CD health. Pode ser sub-secção "Áreas para próxima auditoria" com 3-4 linhas cada.

**N2 — Remover duplicação FE-006 ↔ ARCH-005.**

**N3 — Documentar sequenciamento de execução** (grafo de dependências entre debts — DB review tem-no para DB-*, falta para FE-* e ARCH-*).

**N4 — Re-classificar ARCH-002 de Critical para High** — é cleanup de rename, não bloqueio estrutural. Nice-to-have porque DB review corrobora Critical (custo AI duplicado real).

**N5 — Adicionar OPS-006 (Observability), FE-021 (Dependencies), OPS-007 (Secrets rotation)** como dívidas explícitas — opcional mas recomendado.

---

## Recomendação para Mário

**Proceder para Phase 8 com as correcções B1–B7 listadas é SEGURO.**

Razão: o draft tem fundação correcta (Phase 1 está bem coberta, ~70% das debts certas, cross-references válidas). Os specialist reviews entregaram pacote completo de correcções **accionáveis** (não vagas). Não é refactor — é incorporação documentada.

**Esforço estimado para o architect-proptech executar B1–B7:** meio dia a 1 dia de trabalho de documentação (não código). Os reviews já têm os IDs, severities, esforços, migration examples e dependências escritos.

**O QUE NÃO recomendo:** voltar atrás para Phase 4 ou re-fazer reviews. Não há falha estrutural. O draft é base sólida.

**Riscos se prosseguires SEM incorporar:**
- Plano de remediação fica sub-estimado em ~40% de esforço (3 critical DB de M/L para XL)
- 12 dívidas novas válidas ficam fora do roadmap
- V5 produção sem URL fica classificado HIGH (não CRITICAL) — Mário pode adiar erradamente
- DB-005 (rename schema) sem warning de invalidação pode causar incidente em execução
- `supabase db dump` mal-recomendado pode levar a tentativa frustrada de fix

**Próximo passo sugerido:** spawn @architect com mission "incorporate Phase 5 + Phase 6 reviews into technical-debt-DRAFT.md" e checklist B1–B7. Phase 8 fica ready em 1 dia de trabalho.

---

## Notas finais (Quinn)

- **Constitutional gate (Article IV — No Invention):** Todas as 12 dívidas novas dos specialist reviews têm justificação técnica observável (advisor outputs, ficheiros confirmados, migrations aplicadas). Nenhuma invenção. PASS.
- **Constitutional gate (Article V — Quality First):** O draft não tem testes (porque é auditoria, não código), mas a secção de Frontend tem FE-018 sub-coberta — testing em produção V5 sem rede de segurança é gap de quality muito real. PASS condicional (precisa de B1).
- **Auto-decisão registada:** [AUTO-DECISION] "ARCH-002 deve ser Critical ou High?" → Mantenho Critical (motivo: DB review corrobora com DB-007, custo duplicado AI real e branch activa). Não bloquear nice-to-have N4.
- **Auto-decisão registada:** [AUTO-DECISION] "Áreas não cobertas (observability, dependencies, secrets, CI/CD) devem ser blockers?" → NÃO (motivo: não são specialist-validated, são minha sinalização; podem ir para "próxima auditoria" sem comprometer este documento).

*Produzido por Quinn (aiox-qa) · 2026-05-23 · Phase 7 Brownfield Discovery QA Gate*
*Verdict: NEEDS_WORK · 7 blockers B1–B7 · 5 nice-to-haves · Phase 8 viável em 1 dia após incorporação*
