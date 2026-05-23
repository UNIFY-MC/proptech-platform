# Relatório Executivo · Dívida Técnica PropTech Platform · 2026-05-23

## TL;DR

A plataforma cresceu 169 migrations, 52 Edge Functions e 97 tabelas em 18 dias sem governança proporcional — está em risco alto, principalmente de segurança RGPD em V2 produção. O risco crítico imediato é exposição de dados em prataowners.pt (cliente real Property 007) via 14 tabelas sem RLS e 218 RPCs SECURITY DEFINER acessíveis por `anon`. Recomendação: parar trabalho em V4 durante 2 sprints, executar Quick Wins (Phase 1) em paralelo e atacar DB-001/DB-002/DB-004 antes de qualquer nova vertical.

---

## Diagnóstico

A plataforma não está partida — está exposta. O que funciona em produção (V2 prataowners.pt com ~5 000 linhas de cliente real, V5-manutencao activa) funciona apesar das fundações, não por causa delas. Foram identificadas **53 dívidas** (11 Critical · 20 High · 17 Medium · 3 Low). Cinco dessas Critical são de segurança directa: 14 tabelas sem RLS, 40 vistas com `SECURITY DEFINER` a fazer bypass total das policies, 218 RPCs `SECURITY DEFINER` acessíveis por `anon`/`authenticated`, schema `v1_owners_club` com nome errado pronto a quebrar dependências silenciosamente, e 215 migrations aplicadas em produção sem ficheiro SQL em git (impossível reproduzir o schema). A isto soma-se zero testes frontend em 5 apps activas — qualquer refactor é roleta russa. Não há crise hoje, há acumulação acelerada de risco que torna o próximo lançamento de vertical (V3/V4) num multiplicador, não num adicionador, destes problemas.

---

## Os 5 Riscos que Importam (próximos 90 dias)

1. **Incidente RGPD em V2 produção** — 8 tabelas em V2 (`envios_log`, `configuracoes`, `codigos_postais_pt`, etc.) sem RLS. Qualquer pessoa com a `anon_key` (que está no bundle público do `index.html`) pode fazer SELECT directo via API REST. Property 007 LDA é cliente real, são condóminos reais, é jurisdição RGPD directa. Probabilidade: Alta.

2. **Próxima feature de V2 desenvolvida no schema errado** — `v2_condominios` e `v2_new` coexistem sem ADR canónico. A bridge cron sincroniza dados produção → `v2_new` mas sem monitoring (DB-012). Probabilidade: Alta. Uma feature feita em `v2_new` enquanto produção continua a escrever em `v2_condominios` cria divergência irreversível em dias.

3. **Suporte ao cliente impossível em V5** — V5-manutencao está em produção activa com routing state-based (`useState`). URL nunca muda. Browser back quebrado. Deep links impossíveis. Pedir a um condómino "envia-me o link da página que está a ver" não funciona. Cada ticket de suporte é "envia screenshot, eu navego manualmente". Probabilidade de perda de credibilidade: Alta.

4. **Custo AI duplicado a crescer todos os dias** — `bia-chat` (v20) e `mia-chat` (v4) coexistem como Edge Functions em produção a consumir tokens em paralelo. Renomeação Bia→Mia incompleta há mais de uma semana. Cada dia que passa duplica a factura AI sem benefício. Probabilidade: Certa, já está a acontecer.

5. **Bloqueio total de novas verticais por colapso de design system** — 5 implementações paralelas de design system, 5 implementações de auth, zero código partilhado em `packages/ui` (só 5 utilities). Lançar V3 Seguros ou completar V4 Energia replica cada um destes problemas. Não é hipotético: V4 já tem string CSS injectada hardcoded, V5 já fez regressão silenciosa de `@proptech/auth` para auth local. Probabilidade: Certa, padrão já visível.

---

## Recomendação de Sequência

| Fase | Foco | Esforço (semanas) | Ganho concreto |
|------|------|-------------------|----------------|
| **Quick Wins** (Phase 1) | DB-016 (verificar PostgREST exposure), OPS-001 (ADRs V11-004/V11-005), OPS-005 (desactivar `migrar-faturas` em V2), FE-009 (remover demo accounts V5), DB-011 (reactivar swarm), FE-007 (eliminar `apps/core`), DB-018 (policy `codigos_postais`), FE-010 (chave tema unificada), DB-010 (ADR marketing/growth), ARCH-004 (documentar truth), OPS-002 (ADRs em falta), FE-003 quick wins A11Y (`<html lang="pt-PT">`, eslint-plugin-jsx-a11y, SkipToContent) | **2 semanas, ~12 itens** | Fecha 12 buracos de governança e segurança sem risco. Truth Engine volta a funcionar. RGPD compliance básico (lang PT-PT). V2 já não tem endpoint destrutivo exposto. |
| **Structural — Segurança e Fundação** (Phase 2A, **paralelizar com 2B**) | FE-018 (Testing baseline — Vitest+RTL — **pré-requisito de tudo o resto frontend**), DB-001 (RLS nas 14 tabelas, **inclui auditoria de Edge Functions**), DB-013 (38 policies `auth.uid()` → `(select auth.uid())`), DB-002+DB-004 (programa conjunto SECURITY DEFINER: 40 vistas + 62 funções com search_path mutável + 106 anon-RPCs), DB-003+OPS-003 (baseline snapshot + 50 Edge Functions para git), ARCH-001 (ADR canónico V2: `v2_condominios` vs `v2_new`), ARCH-002 (terminar rename Bia→Mia) | **8 semanas, equipa focada** | Risco RGPD eliminado em V2. Schema reprodutível a partir de git. V4/V5 ganham rede de segurança (testes) antes de qualquer refactor maior. Schema V2 canónico decidido — desbloqueia ARCH-006 (cutover). |
| **Structural — Frontend e Auth** (Phase 2B) | FE-001 P1 (tokens canónicos em `packages/ui` — co-resolve FE-010, FE-013, FE-017), FE-002+FE-008 (migrar V5 para `@proptech/auth`), FE-004 (React Router em V5), FE-016 (Error Boundaries), DB-012 (monitoring bridge cron), OPS-004 (merge das 7+ branches sprint), DB-009→DB-014 (limpar 341 índices unused → criar 110 FK indexes), DB-005 (rename `v1_owners_club` → `v10_owners_club` — **último dos Critical**) | **6-8 semanas, equipa focada** | V5 produção ganha URLs partilháveis, auth unificada, error boundaries. Performance DB melhora 10–100x em queries RLS. Naming consistente. |
| **Long-term** (Phase 3) | FE-001 P2/P3 (primitives + migração por app), FE-005 (React Query), FE-003 (A11Y incremental + axe-core em CI), FE-015 (bundle audit + Lighthouse baseline), FE-017 (mobile + breakpoints), DB-017 (mover extensões), ARCH-006 (retomar cutover V2 fases B-F), FE-020 (embed contract `@proptech/embed`), FE-019 (i18n — **só se decisão Spock.es for tomada**) | **16+ semanas** | Plataforma escalável a novas verticais sem replicar problemas. Decisão mobile V5 (Capacitor) desbloqueada. Cutover V2 finalizado. |

---

## Decisões que o Mário tem de tomar

1. **Pausar V4 Energia durante Phase 1 + Phase 2A?** Eu recomendo SIM. V4 ainda não está em produção — atrasar 2 sprints custa pouco. Mas tocar em V2 produção (RGPD), implementar testing baseline e arrumar SECURITY DEFINER exige cabeça focada. Continuar V4 em paralelo significa empilhar mais 52 Edge Functions sobre fundações já frágeis. O custo de oportunidade é menor agora do que daqui a 3 meses.

2. **`v2_condominios` ou `v2_new` é o schema canónico para V2?** Tem que decidir antes de qualquer outra coisa em V2. Recomendação técnica: assumir `v2_condominios` como canónico (47 tabelas, dados migrados, RLS completo, app a funcionar) e cancelar `v2_new` formalmente OU fazer cutover acelerado. Manter os dois "para decidir depois" custa um sprint inteiro de divergência. ARCH-001 está como Critical exactamente por isto.

3. **Schema `v1_owners_club` — renomear ou abandonar?** O nome está errado (deveria ser `v10_owners_club`). Tem 3 tabelas e 6 rows reais. `ALTER SCHEMA ... RENAME` em Postgres pode quebrar dependências silenciosamente (DB-005). Alternativa: manter o nome errado documentado em ADR como wart aceite, ou recriar `v10_owners_club` do zero e migrar manualmente. Recomendação: executar rename mas **último** de todos os Critical, após auditoria completa de funções/vistas que referenciam o schema.

4. **Truth Engine — reactivar ou pausar?** Está parado por `haiku_json_parse_failed`. Fix existe no worker v3 (strip markdown fences) mas swarm não foi reactivado. Pergunta real: 25 workers + 10 niches valem o investimento operacional agora, ou pausar formalmente até depois de Phase 2 estar consolidada? Se reactivar, fica como Quick Win (2h); se pausar, documenta-se em ADR e poupa-se atenção.

5. **`apps/v2-condomino-mobile/` — recuperar fonte ou eliminar artefacto?** Pasta tem `dist/` (HTML+JS+CSS) sem `src/`. Origem desconhecida no monorepo. Se for app real em uso, há código importante perdido. Se for artefacto morto, deve ser eliminada. Decisão custa 30 minutos de investigação, mas só o Mário sabe se este `dist/` corresponde a app instalada em telemóveis reais.

---

## O que NÃO está neste relatório

Quatro áreas que o discovery não cobriu profundamente e devem ser auditadas em ciclo separado:

- **Observability / Error Tracking** — Sem Sentry, sem Logflare cross-app. `swarm-orchestrator-cron` foi descoberto pausado por chance, não por alerta. V2 produção sem error tracking documentado. Recomendação: auditoria dedicada — severity provável HIGH.
- **Dependencies / CVE / Secrets Rotation** — Mix React 18/19, Vite 6/8, zero `npm audit`, `supabase_vault` instalado mas não analisado, service role keys V2 sem evidência de rotação. Auditoria de supply chain + secrets é o próximo grande blind spot.
- **CI/CD Health** — Hooks `synapse-engine.cjs` e `enforce-git-push-authority.cjs` não inventariados. Workflows GitHub Actions com 7+ branches sprint activas. Estado real de pipelines não foi avaliado.
- **Internacionalização** — FE-019 está como Medium mas se a decisão Spock.es / Espanha for tomada, a severity sobe imediatamente para High e o custo migracional é enorme (>40 ficheiros por app). Não é dívida que se possa adiar se a expansão for real.

---

*Relatório executivo · 1-2 páginas · audiência: Mário Carvalho (solo founder, TOC, não programador profissional)*
*Inputs: technical-debt-assessment.md (53 dívidas finais aprovadas, Phase 8 Brownfield Discovery)*
