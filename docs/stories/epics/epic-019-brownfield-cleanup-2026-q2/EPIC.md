# Epic 019 · Brownfield Cleanup 2026-Q2

## Origem

Brownfield Discovery 2026-05-23 (53 debts identificados — ver `docs/brownfield-discovery/2026-05-23/phase4-final/technical-debt-assessment.md`).

QA Gate Phase 7: NEEDS_WORK → B1–B7 incorporados → APPROVED para roadmap.

Distribuição de severities:
- 11 Critical, 20 High, 17 Medium, 3 Low.
- Áreas: ARCH (8) · DB (18) · FE (20) · OPS (5) + 4 áreas opcionais sinalizadas.

## Goal

Reduzir dívida técnica crítica para nível operacional sustentável antes de iniciar verticais futuras (V3 Seguros, V6 Reabilitação e seguintes), eliminando os riscos de segurança RGPD, fragmentação de design system / auth, perda de rastreabilidade de migrations / Edge Functions / ADRs, e ausência total de testing baseline.

## Success Criteria

Verificáveis no fim do epic:

1. **RLS coverage 100% em V1** — 0 tabelas sem RLS em V1 (parte de 14 actuais) e 0 tabelas sem RLS em V2 produção (parte de 8 actuais).
2. **Schemas custom expostos** — `pg_roles.rolconfig` da role `authenticator` lista explicitamente `iam, marketing, v2_new` (e restantes); zero falhas silenciosas `PGRST106`.
3. **Auth centralizado** — V5, dashboard e V4 consomem `@proptech/auth`; zero implementações locais de `AuthContext` ou `signInWithPassword` directo (de 5 implementações actuais).
4. **Design system fundacional** — `packages/ui` com tokens canónicos (`colors.css`, `typography.css`, `radius.css`, `breakpoints.css`, `motion.css`) + pelo menos 10 primitives partilhados (Button, Input, Badge, Table, KPICard, Sidebar, Modal, ErrorBoundary, Skeleton, SkipToContent).
5. **Testing baseline** — Vitest + RTL configurados em `apps/dashboard` e `apps/v5-manutencao`, com pelo menos: smoke test, auth flow test, 1 view principal.
6. **Schema V2 canónico decidido** — ADR formal a definir `v2_condominios` ou `v2_new` como canónico, com plano de descontinuação do outro.
7. **Migrations forward-only** — baseline snapshot em git de V1 + processo documentado "ficheiro local PRIMEIRO, `apply_migration` DEPOIS"; 0 ficheiros locais com naming divergente do remoto.
8. **Edge Functions versionadas** — pelo menos as 17 Edge Functions críticas de V1 (auth, iam, mia-chat, swarm workers core, v4 contracts, v5 OCR, etc.) exportadas para `supabase/functions/` em git.
9. **Rename Bia→Mia concluído** — `bia-chat` deprecada; views `BiaScorecard.jsx`, `BiaTaskLauncher.jsx`, `BiaPlaceholder.jsx` removidas; `apps/core/` e `apps/v1-core/` eliminados; branch `chore/rename-bia-jarvis-mia` mergeada.
10. **Routing URL-based em V5** — V5 produção usa React Router; URLs partilháveis; browser back funcional.
11. **ADRs em produção têm ficheiro** — ADR-V11-004, ADR-V11-005, ADR-V3-001, ADR-V4-001, ADR-condo-001, ADR-012 com ficheiro `.md` em `.claude/strategy/adrs/`.
12. **Branches sprint resolvidas** — 0 branches `sprint/*` com >30 dias sem decisão (merge ou descarte documentado).

## Stories (priorizadas)

Cada story aponta para os debt IDs do assessment que cobre.

| # | Title | Debts cobertos | Effort | Fase |
|---|-------|----------------|--------|------|
| 019.1 | RLS coverage em V1 + reduzir multiple permissive policies | DB-001, DB-013, DB-015 | XL | B |
| 019.2 | Verificar e corrigir exposição PostgREST de schemas custom | DB-016, DB-018 | S | A |
| 019.3 | Decidir schema canónico V2 (`v2_condominios` vs `v2_new`) e ADR | ARCH-001 | M (decisão) + L (impl) | A→B |
| 019.4 | Baseline snapshot V1 + processo forward-only migrations | DB-003 | XL | B |
| 019.5 | Limpeza pós-rename Bia→Mia + remoção de apps órfãs | ARCH-002, DB-007, FE-007 | M | A |
| 019.6 | `packages/ui` v1 — tokens canónicos + 10 primitives partilhados | FE-001 (P1+P2), FE-010, FE-013, FE-016, FE-017 | XL | B→C |
| 019.7 | Centralizar auth em `@proptech/auth` (V5 → dashboard → V4) | FE-002, FE-008 | L | B |
| 019.8 | Testing baseline Vitest + RTL (dashboard + v5) | FE-018 | L | A→B |
| 019.9 | Routing URL-based em V5 (React Router) | FE-004 | L | B |
| 019.10 | Resolver branches sprint orfãs (merge ou descarte) | OPS-004 | M | A |
| 019.11 | ADRs em falta para decisões em produção | OPS-001 (ARCH-003), OPS-002 | M | A |
| 019.12 | Inventariar e versionar Edge Functions críticas | OPS-003 | L | B |
| 019.13 | Quick wins de segurança e governance | DB-010, DB-011, ARCH-004, ARCH-005, ARCH-007, ARCH-008, OPS-005, FE-009 | M (total) | A |
| 019.14 | Rename `v1_owners_club` → `v10_owners_club` | DB-005 | M | C (último) |
| 019.15 | Programa SECURITY DEFINER (vistas + RPCs + search_path + extensões) | DB-002, DB-004, DB-017 | XL | C |
| 019.16 | Performance baseline + index cleanup + FK indexing | DB-009, DB-014, FE-015 | L+L+M | C |

Stories 019.1 a 019.12 cobrem o **mínimo obrigatório** definido na mission. Stories 019.13 a 019.16 agregam debts adicionais para o epic ficar completo (Critical + High cobertos), permitindo planeamento integral.

## Sequência (Fases A → B → C)

### Fase A — Quick Wins (4 semanas)

Esforço S/M sem dependências críticas, alto impacto/risco baixo:

1. **019.2** — PostgREST exposure (pré-requisito de tudo o resto funcionar via REST) — 30 min
2. **019.11** — ADRs em falta — 1–2 dias
3. **019.13** — Quick wins (limpeza CLI/Discord/truth docs, demo accounts, codigos_postais, swarm reactivation, etc.) — 3–4 dias
4. **019.5** — Limpeza pós-rename Bia→Mia + apps órfãs — 3 dias
5. **019.10** — Triagem de branches sprint — 1 semana
6. **019.8** (start) — Setup inicial Vitest + RTL em dashboard — 3 dias (continua em B)
7. **019.3** (decisão) — ADR canónico V2 — 2 dias

### Fase B — Structural (8 semanas)

M/L com dependências críticas. **`019.8` (Testing) é pré-requisito explícito de `019.6`, `019.7`, `019.9`.**

1. **019.8** (concluir) — Suite mínima de testes em dashboard + v5
2. **019.6 P1** — Tokens canónicos em `packages/ui` (co-resolve com FE-010, FE-017)
3. **019.1** — RLS coverage em V1 + DB-013 (auth_rls_initplan) + DB-015 (multiple permissive)
4. **019.4** — Baseline snapshot + forward-only migrations
5. **019.12** — Versionar Edge Functions críticas (paralelo a 019.4)
6. **019.7** — Migrar V5 → `@proptech/auth` → dashboard → V4
7. **019.9** — React Router em V5
8. **019.3** (implementação) — Cutover do schema V2 escolhido

### Fase C — Long-term (16+ semanas)

L/XL com risco arquitectural. Apenas iniciar após Fase B substancialmente concluída:

1. **019.6 P2 + P3** — Primitives + migration por app
2. **019.15** — Programa SECURITY DEFINER (DB-002 + DB-004 + DB-017)
3. **019.16** — Index cleanup (DB-009 → DB-014) + bundle audit (FE-015)
4. **019.14** — Rename `v1_owners_club` → `v10_owners_club` (ÚLTIMO de tudo — depende de auditoria de dependências)

## Dependências (entre stories)

```
019.2 (PostgREST exposure)
  └─> pré-requisito de TODAS as remediações que tocam REST

019.8 (Testing baseline)
  ├─> 019.6 P2/P3 (design system migration)
  ├─> 019.7 (auth migration)
  ├─> 019.9 (routing refactor)
  └─> 019.16 (bundle audit precisa de baseline funcional)

019.6 P1 (tokens)
  └─> 019.6 P2 (primitives)
       └─> 019.6 P3 (migration por app)

019.16 — DB-009 (drop unused indexes)
  └─> DB-014 (criar FK indexes em falta)

019.1 (RLS + DB-013 + DB-015)
  └─> 019.15 (programa SECURITY DEFINER — tabelas com RLS são base para revisar vistas/funções)

019.3 (decisão schema V2)
  └─> qualquer feature nova em V2 (bloqueia ARCH-006 Fase B–F do cutover)

019.11 (ADRs em falta)
  └─> dependência soft de 019.3, 019.5, 019.10 (decisões devem ter ADR antes de implementação)

019.14 (rename v1_owners_club)
  └─> ÚLTIMO — depende de zero referências em vistas/funções/queries de agentes
```

## Métricas de progresso

Reportadas no fim de cada fase:

- Stories fechadas vs. abertas
- Debt IDs resolvidos (de 53 totais cobertos pelo epic)
- Counts de smoke: tabelas sem RLS, schemas não expostos, branches sprint orfãs, ADRs sem ficheiro
- Bundle size baseline (Fase C)

## Constraints

- **NUNCA tocar em V2 produção** (`prataowners.pt`, Supabase `eozklslwfaqujaijvdnl`) sem aprovação explícita de Mário.
- **NUNCA alterar `admin/`, `index.html` raiz, `netlify.toml`** (Regra inviolável CLAUDE.md).
- Toda a story que toca V2 produção deve ter checkbox explícito de "Aprovação Mário obtida".
- Deploy protocol D1–D6 do CLAUDE.md aplica-se a todas as branches.

## Out of scope (próxima auditoria)

Não incluído neste epic — agendar próximo ciclo trimestral (ver assessment §"Áreas para Próxima Auditoria"):

- Observability / error tracking (Sentry, Logflare cross-app)
- Dependencies / CVE audit (`npm audit`, Vite 6/8 alignment, React 18/19)
- Secrets rotation / Vault hygiene
- CI/CD health audit
- i18n (FE-019) — apenas se decisão "Spock.es / Espanha" tomada
- Embed contract (FE-020) — após FE-001 P3 + FE-002 consolidados
- Cutover V2 fases B–F (ARCH-006) — depende de 019.3
- Brain tables auditoria (DB-008) — requer decisão de Mário, fora do scope cleanup
- v2-legacy-bridge-cron monitoring (DB-012) — depende de decisão 019.3
- Acessibilidade WCAG completa (FE-003) — quick wins incluídos em 019.13; remediação completa é ongoing

---

**Owner:** @pm (Bob)
**Criado:** 2026-05-23
**Status:** Draft (aguardando aprovação Mário para iniciar Fase A)
**Stories:** 16 (mínimo obrigatório: 12 · adicionais: 4 para completude)
**Inputs:** `docs/brownfield-discovery/2026-05-23/phase4-final/technical-debt-assessment.md`
