# Sprint B Lite — Watchers Architecture

> Author: CTO Agent
> Date: 2026-04-30
> Status: PROPOSED — pending CEO approval
> Scope: 3 watcher agents (competitor-monitor weekly · daily-brief daily · weekly-recap weekly)
> Decision context: solo founder, Windows 11 dev, GitHub Actions free tier, €5/mês cost cap

---

## TL;DR

| # | Decisão | Recomendação |
|---|---|---|
| 1 | Workflow file structure | **3 ficheiros separados** em `.github/workflows/` |
| 2 | Secret management | `ANTHROPIC_API_KEY` (sem prefix `VITE_`) + `.gitignore` audit + `pre-commit` guard |
| 3 | Output handling | **Hybrid (opção C)**: MD local persistido via artifact + GitHub Issue summary |
| 4 | Failure modes | GitHub Actions email + dead-man-switch via Issue label `watcher-stale` |
| 5 | Cost discipline | **No active enforcement**. Token budget no system prompt + monthly review manual |
| 6 | Daily-brief + weekly-recap specs | Skeletons completos abaixo (secção 6) |
| 7 | Riscos | 5 riscos flagged, 2 ALTOS (cost runaway, secret leak) com mitigação concreta |

---

## 1. Workflow file structure

### Decisão: 3 ficheiros separados

```
.github/workflows/
├── watcher-competitor-monitor.yml   (cron: 0 9 * * 1)
├── watcher-daily-brief.yml          (cron: 0 9 * * *)
└── watcher-weekly-recap.yml         (cron: 0 17 * * 5)
```

### Trade-offs reais

| Critério | Matrix (1 file) | Separados (3 files) |
|---|---|---|
| Debugging | Difícil — logs intercalados, "qual job falhou" | Trivial — 1 watcher = 1 file = 1 run history |
| Cron schedules diferentes | Não suportado nativamente — workaround com `if:` checks | Nativo — cada workflow tem o seu `cron` |
| Secret scoping | Tudo partilha mesmo env | Igual (repo-level secrets) — sem ganho |
| Adicionar 4º watcher | Editar matrix existente (risco regression) | Adicionar ficheiro novo (zero risco aos outros) |
| Linhas de código | ~80 linhas total | ~120 linhas total (40/file) |
| GitHub Actions billing | Igual (cobra por minuto, não por workflow) | Igual |

### Porquê separados é a decisão certa

Matrix strategy é optimização para casos onde **os 3 jobs são essencialmente o mesmo código com parâmetros diferentes**. Aqui não é o caso:
- competitor-monitor usa Sonnet, fetches 10-15 URLs externas, escreve para `competitor-watches/`
- daily-brief usa Haiku, lê apenas git log + ficheiros locais, output 10 linhas
- weekly-recap usa Sonnet, agrega 3 fontes incluindo outputs anteriores, output 1 página

Tentar forçar matrix introduz `if:` conditionals que tornam o código menos legível e mais frágil. Para 3 watchers, a duplicação de boilerplate (~40 linhas × 3) é menos custosa que o custo cognitivo de debugar um matrix workflow falhado às 9h da segunda quando estou a tentar começar o dia.

**Escalabilidade futura:** se chegarmos a 6+ watchers com schedules iguais, refactor para matrix é trivial. Premature optimization para 3 é wrong call.

---

## 2. Secret management

### Secrets a configurar em `Settings → Secrets and variables → Actions`

| Secret name | Valor | Notas |
|---|---|---|
| `ANTHROPIC_API_KEY` | sk-ant-api03-... | **NÃO usar prefix `VITE_`** — esse é convenção Vite que expõe vars ao browser bundle. Aqui corre server-side em CI. |
| `GITHUB_TOKEN` | (auto-provisioned) | Já existe — usado para criar Issues e fazer commits via API |

### `VITE_ANTHROPIC_API_KEY` no projecto — clarificação crítica

O `VITE_ANTHROPIC_API_KEY` que existe no `.env` local é **anti-pattern em produção**. Vite expõe qualquer var prefixada `VITE_` ao bundle browser, ou seja: se essa var fosse usada em browser code, a key estaria visível em DevTools de qualquer visitante do site.

ADR-004 já cobre isto: agents server-side only, Anthropic calls em Edge Functions, nunca no browser. Confirmar em code review que `VITE_ANTHROPIC_API_KEY` **não está a ser referenciado em código `apps/*/src/`** — se está, é bug de segurança P0.

Nos workflows, usamos `ANTHROPIC_API_KEY` (sem prefix) consumido apenas pelo runner CI:

```yaml
env:
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Prevenir commit acidental de outputs com dados sensíveis

3 camadas:

1. **`.gitignore` audit** (já existe): confirmar `.claude/outputs/` está listado. Adicionar `.claude/pending-approval/` se for usado para alerts contendo URLs scraped.

2. **Pre-commit hook local** (`.husky/pre-commit` ou `scripts/check-secrets.sh`):
   ```bash
   #!/bin/bash
   if git diff --cached --name-only | xargs grep -l "sk-ant-api" 2>/dev/null; then
     echo "ERRO: API key detected in staged changes"
     exit 1
   fi
   ```

3. **GitHub repo setting**: activar "Push protection for secrets" em `Settings → Code security → Secret scanning`. Bloqueia push se detectar Anthropic/AWS/etc keys no diff.

### Rotação de secrets de CI

- **Rotação proactiva:** sem necessidade enquanto o repo for privado e o key tiver scope mínimo. Anthropic permite criar workspace-scoped keys — criar uma key dedicada `ci-watchers` (não a key que uso em dev local) é **boa prática**, permite revogar isolado se houver suspeita.
- **Rotação reactiva:** se o repo passar a público, ou se houver leak suspeito → revogar key imediatamente em `console.anthropic.com` e gerar nova.

### Recomendação concreta

1. Criar workspace key `ci-watchers` em Anthropic console (separada da key de dev local)
2. Configurar `ANTHROPIC_API_KEY` repo secret com essa key
3. Activar push protection em GitHub
4. Confirmar `.claude/outputs/` em `.gitignore`
5. Audit `apps/*/src/` para qualquer ref a `VITE_ANTHROPIC_API_KEY` — se existir, é bug separado a corrigir antes de Sprint B

---

## 3. Output handling

### Decisão: Hybrid (opção C) — MD persistido via Artifact + GitHub Issue summary

#### Como funciona

1. Watcher escreve MD em `.claude/outputs/competitor-watches/2026-05-04.md` durante o run
2. No fim do job, 2 acções:
   - **Upload artifact** com retention 90 dias (acessível via Actions UI, non-mobile-friendly)
   - **Criar GitHub Issue** com summary (top 3 strategic implications + alerts) e link para artifact

#### Porquê não as outras opções

**(a) Watcher commits MD directo ao repo**
- Pro: visível em GitHub mobile na árvore de ficheiros
- Contra: poluí git history (3 commits/semana só de outputs), mistura "infrastructure data" com "código", complica `git log` para humans, e o conteúdo `.claude/outputs/` actualmente está no `.gitignore` — reverter essa decisão é maior que o ganho. Também cria rebase/merge conflicts se houver work-in-progress.

**(b) Watcher cria Issue apenas (sem MD persistido)**
- Pro: mobile push notification nativa, mobile-friendly read, search via GitHub
- Contra: Issue body tem limite ~64KB, suficiente para daily-brief mas marginal para weekly-recap. Mais grave: perdemos o MD raw, que é input para o weekly-recap (que lê outputs do competitor-monitor da semana). Sem ficheiro persistido, weekly-recap teria de scrape Issues via API — adiciona complexidade.

**(c) Hybrid — escolhida**
- Pro: solo founder lê Issue (mobile push, takes <30s), MD raw fica em artifact (acessível para weekly-recap baixar via `actions/download-artifact`), search funciona em ambos.
- Contra: 2 escritas em vez de 1 (negligible — <2s overhead).

#### Formato do Issue summary

```yaml
title: "[Watcher] Competitor Watch · 2026-05-04"
labels: ["watcher", "competitor-monitor"]
body: |
  ## Top 3 Strategic Implications
  1. ...
  2. ...
  3. ...

  ## Alerts (Priority A)
  - ...

  ## Raw output
  Full MD: [Download artifact](link to action run)
  Sources degraded: 2 (FIXO press, Crunchbase Jobber)
```

#### Issue lifecycle

- Issue cria-se a cada run
- Mário lê no mobile, fecha quando processou
- Label `watcher` + sub-label (`competitor-monitor` / `daily-brief` / `weekly-recap`) permite filtrar
- Após 30 dias, manter Issues fechadas como histórico searchable

#### Cost da hybrid

- GitHub Issues: free (incluído em GitHub plan)
- Artifact storage: free tier 500MB. 3 watchers × ~10KB/run × 90 days retention = ~5MB/mês. Muito dentro do free tier.

---

## 4. Failure modes

### O que GitHub Actions email built-in resolve

GitHub envia email quando workflow **falha com exit code != 0**. Cobre:
- Network errors no fetch
- Anthropic API errors (auth, rate limit, 5xx)
- Cron não trigger (raro mas acontece — outage GitHub)
- Workflow YAML syntax error após edit

### O que NÃO resolve (silent failures reais)

1. **Watcher corre mas produz output "no change" porque todos os fetches deram 200 com HTML vazio** (SPA-only sites, cookie walls). Exit code 0, email zero.
2. **Watcher corre mas o markdown sai vazio porque o prompt deu reply curto demais.** Exit code 0.
3. **Cron disabled silently** — GitHub Actions desactiva crons em repos sem activity por 60 dias (regra publicada). Email zero. Para um repo com Mário a fazer commits 5×/semana, baixa probabilidade — mas não zero.
4. **Anthropic API key revogada externamente** mas o workflow tem `continue-on-error: true` num step crítico. Falha silently.
5. **Output gerado correctamente mas Issue creation falha** (rate limit GitHub API). Output existe em artifact mas Mário nunca vê notificação.

### Detecção de stale output (dead-man-switch)

Mecanismo proposto: **um 4º "meta-watcher" minimalista que corre 1×/dia e verifica que cada um dos 3 watchers correu na cadência esperada**.

```yaml
# .github/workflows/watcher-healthcheck.yml
name: Watcher Healthcheck
on:
  schedule:
    - cron: '0 10 * * *'   # daily 10:00 UTC, 1h após daily-brief
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check last run of each watcher
        run: |
          # query GitHub API: workflows competitor-monitor, daily-brief, weekly-recap
          # se último run > 2× cadência esperada → criar Issue label `watcher-stale`
```

Lógica:
- competitor-monitor: stale se último run > 14 dias (cadência 7 dias × 2)
- daily-brief: stale se último run > 48h
- weekly-recap: stale se último run > 14 dias

Se stale, healthcheck cria Issue `[STALE] Watcher X não corre desde YYYY-MM-DD` com label `watcher-stale`. GitHub envia push notification mobile via app GitHub.

Custo: ~30 lines bash + zero Anthropic tokens. Praticamente free.

### Recomendação monitoring layer mínimo

| Layer | Custo | Cobre |
|---|---|---|
| GitHub Actions email | 0 | Workflow exit != 0 |
| Output content validation in-script (`if [ ! -s output.md ]; then exit 1; fi`) | 0 | Empty output silent fail |
| Healthcheck workflow daily | 0 | Cron disabled, stale outputs |
| Manual review do `Actions` tab 1×/semana | 5 min/sem | Tudo o resto |

Não vale a pena montar Sentry, Better Stack, ou outras tools externas para 3 watchers numa fase pre-revenue.

---

## 5. Cost discipline implementation

### Decisão: **NO active enforcement**. Apenas budget no system prompt + review manual mensal

### Rationale

CMO spec estima **€0.76/mês para competitor-monitor sozinho**. Com daily-brief Haiku (~€0.10/mês — Haiku é 1/12 do custo Sonnet) e weekly-recap Sonnet (~€0.30/mês — output 1 página), total **€1.16/mês** dos 3 watchers.

Cap declarado: €5/mês. Margem real: **4× o estimate**.

Para um runaway hipotético atingir o cap, teria de haver:
- Watcher num loop infinito (já protegido pelo timeout default GitHub Actions de 6h)
- OU prompt patológico que pede 100k output tokens (mitigável com `max_tokens: 4096` no SDK call)
- OU competitor-monitor a recursar em tier rotation que nunca termina (mitigável por design — tier 1/2/3 são loops finitos)

### Avaliação das opções consideradas

**Token budget no system prompt como hard limit**
- Status: faz parcialmente sentido. Adicionar `max_tokens: 4096` no call SDK é cheap insurance — limita output a ~$0.06/run worst case. Recomendado.
- Contra: limitar input tokens via system prompt é unreliable — o modelo pode escrever 10000 tokens mesmo com instrução "max 2000". O API param `max_tokens` é hard limit verdadeiro.

**Pre-run check de usage mensal via Anthropic API**
- Status: **rejeitado para Sprint B**. Anthropic Admin API tem endpoint `/v1/organizations/usage_report` mas requer admin key + parsing complexo + adiciona 1 API call por run. Para um budget de €5/mês com estimate €1, é overkill.
- Quando reavaliar: se estimate subir para >€20/mês ou se acrescentarmos 5+ watchers.

**Aceitar que estimate é baixo o suficiente**
- Status: **escolhido**. Mas com 2 safeguards:
  1. `max_tokens: 4096` no SDK call (hard limit per run)
  2. Review manual de `Anthropic console → Usage` no 1º de cada mês (5 min)

### Implementação concreta

```typescript
// scripts/run-watcher.ts (template para os 3 watchers)
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-7',
  max_tokens: 4096,        // hard cap per run
  system: SYSTEM_PROMPT,
  messages: [...]
});
```

E adicionar um TODO em CLAUDE.md ou no Master Plan: "1º de cada mês — verificar Anthropic console usage. Se >€10 acumulado, investigar."

### Quando reavaliar este approach

Triggers para mudar para active enforcement:
- Usage real > €5/mês em qualquer mês
- Acrescentamos 5+ watchers (total estimate > €15/mês)
- Algum watcher passa a fazer scraping mais agressivo (ex: Bucket B feature mining com 20+ sources)

---

## 6. Daily-brief + weekly-recap specs (skeleton)

### 6.1 daily-brief

| Field | Value |
|---|---|
| Model | claude-haiku-4-5 (≈1/12 do custo Sonnet) |
| Cron | `0 9 * * *` (daily 09:00 UTC = Lisboa 10:00 WEST) |
| Output dir | `.claude/outputs/daily-briefs/` |
| Output naming | `YYYY-MM-DD.md` |
| Issue label | `watcher`, `daily-brief` |
| Tokens estimados | ~5k input, ~500 output → ~$0.003/run → ~$0.10/mês |
| Execution time | ~10s |

#### Sources concretas

```bash
# Source 1: commits últimas 24h
git log --since="24 hours ago" --pretty=format:"%h %s (%an)" --no-merges

# Source 2: decisions-log entries novas
ls -lt .claude/strategy/decisions-log.md  # ou wherever live
# diff vs snapshot anterior

# Source 3: ficheiros .claude/current/* alterados
ls -lt .claude/current/

# Source 4: Issues abertas com label `watcher` não resolvidas
gh issue list --label watcher --state open --json title,createdAt

# Source 5: pending alerts em .claude/pending-approval/
ls .claude/pending-approval/ 2>/dev/null
```

#### Output format (máx 10 linhas, mobile-readable em <1 min)

```markdown
# Daily Brief — 2026-05-05

**Yesterday (5 commits):**
- feat(weather): edge function deploy
- fix(advisor): RLS policy bug
- 3× docs/refactor

**Decisions logged (1):**
- D-25: Pricing test: defer until 10 owners interviewed

**Pending alerts (2):**
- competitor-monitor 2026-05-04: FIXO new category "manutenção" — needs CEO triage
- weekly-recap 2026-05-02: KR-3 (50 owners) at 8/50 — accelerate

**Today's focus:** Sprint 1C kickoff. Casa screen merge.
```

#### System prompt skeleton

```
You are daily-brief watcher. You produce a 10-line max digest for solo founder Mário, read on mobile in <1 min.

Sources provided:
- git log last 24h
- decisions-log diff
- pending alerts
- current sprint state

Rules:
- Max 10 bullet lines total. NO preamble. NO explanations.
- "Pending alerts" section only if alerts exist.
- "Today's focus" must reference current sprint goal verbatim.
- If git log is empty: say "No commits yesterday" — do not hallucinate.
- Output PT-PT.
```

---

### 6.2 weekly-recap

| Field | Value |
|---|---|
| Model | claude-sonnet-4-7 |
| Cron | `0 17 * * 5` (Friday 17:00 UTC = Lisboa 18:00 WEST) |
| Output dir | `.claude/outputs/weekly-recaps/` |
| Output naming | `YYYY-WNN.md` (ISO week) |
| Issue label | `watcher`, `weekly-recap` |
| Tokens estimados | ~20k input, ~2k output → ~$0.09/run → ~€0.32/mês |
| Execution time | ~30s |

#### Sources concretas

```bash
# Source 1: git log da semana
git log --since="7 days ago" --pretty=format:"%h %s (%an)" --no-merges

# Source 2: current sprint state
cat .claude/current/current-sprint.md

# Source 3: competitor-watches outputs da semana
ls .claude/outputs/competitor-watches/*.md | head -3
# OU download artifact via gh run download

# Source 4: decisions-log da semana
git log --since="7 days ago" -- .claude/strategy/master-plan-snapshot.md

# Source 5: Issues fechadas/abertas semana via gh CLI
gh issue list --search "closed:>=$(date -d '7 days ago' --iso-8601)" --json title,closedAt
```

#### Output format (1 página, leitura fim-de-semana)

```markdown
# Weekly Recap — Semana 18 (2026-04-27 → 2026-05-03)

## Sprint progress
**Sprint actual:** 1C Architecture v2
**Status:** ON TRACK | AT RISK | OFF TRACK
**% complete:** 35% (3/9 PASSOS done)

## Highlights
- Weather edge function shipped (PR #234)
- casa_advisor agent functional E2E
- Foundations Phase 2 schema deployed (Supabase)

## OKR delta
| KR | Start week | End week | Target | Status |
|---|---|---|---|---|
| KR-1 50 owners pagantes | 0 | 0 | 50 | NOT STARTED — pre-launch |
| KR-2 V5 Sprint 1C ship | 0% | 35% | 100% by 2026-05-15 | ON TRACK |
| KR-3 CAC <€30 | n/a | n/a | <€30 | BLOCKED on launch |

## Competitive intel da semana
- FIXO: new category "manutenção" detected → flagged for CEO review (Priority A)
- Jobber: nothing new
- (...)

## Decisions tomadas
- D-24: Competitor monitoring 4-tier structure (resolved)
- D-25: ...

## Próximos 5 dias (sugestão)
- [ ] Sprint 1C PASSO 4-5 (Casa fusion screen)
- [ ] CEO triage do alerta FIXO
- [ ] Pricing interviews × 2 (P-01)

## Riscos / blockers
- Nenhum crítico esta semana
```

#### System prompt skeleton

```
You are weekly-recap watcher. You produce a 1-page Friday recap for solo founder Mário, read on weekend.

Sources provided:
- git log last 7d
- current sprint markdown
- competitor-watches outputs from this week
- decisions log diff

Rules:
- Output PT-PT.
- "Sprint progress" section: status MUST be exactly ON TRACK / AT RISK / OFF TRACK.
- "OKR delta" table: only KRs from current-sprint.md goals — do not invent.
- "Próximos 5 dias" max 5 items, each actionable (verb-led).
- "Riscos / blockers": if none, say "Nenhum crítico esta semana" verbatim — do not pad.
- If competitor-watches outputs absent, say "No competitor data this week — watcher may be stale" and stop. Do NOT hallucinate.
```

---

## 7. Riscos flagged

| # | Risco | Prob | Mitigação |
|---|---|---|---|
| R-1 | **Anthropic key leak via output commit acidental** — watcher produz MD com debug info contendo key, alguém faz `git add .` sem ver | M | (1) push protection GitHub activado; (2) `.gitignore` cobre `.claude/outputs/`; (3) pre-commit hook grep `sk-ant-api`; (4) workspace-scoped key `ci-watchers` (revogável isolada) |
| R-2 | **Cost runaway por loop infinito ou prompt patológico** — watcher entra em retry loop, esgota €5 cap em 1 run | B | (1) `max_tokens: 4096` SDK param (hard cap per call); (2) `timeout-minutes: 5` no GitHub Actions job; (3) review manual usage 1º de cada mês |
| R-3 | **Silent fail mascarado como "no change"** — fetches 200 OK mas HTML vazio, watcher reporta NO CHANGE quando dados estão corruptos | A | (1) regra "se >50% fetches DEGRADED → status global DEGRADED" já no spec CMO; (2) output content validation: `if [ $(wc -l < output.md) -lt 10 ]; then exit 1; fi`; (3) healthcheck workflow daily |
| R-4 | **Cron disabled por inactivity GitHub** — repo passa 60 dias sem commits, GitHub desactiva schedules silently | B | (1) repo tem activity diária realista (Mário commita 5×/sem); (2) healthcheck workflow detecta stale (last run >2× cadência) e cria Issue; (3) workaround: workflow tem `workflow_dispatch:` trigger manual |
| R-5 | **Output content depende de Notion API mas API não acessível em CI** — daily-brief inclui "Notion changes" mas requer auth complexa que não está em GitHub Actions | M | (1) Skeleton acima NÃO depende de Notion — fontes são todas git/local files; (2) Notion sync continua manual (existing workflow); (3) se quisermos Notion auto-sync futuro, criar 4º watcher dedicado com OAuth flow correcto |

### Riscos NÃO listados (porque não são reais aqui)

- "Vendor lock-in Anthropic" — não é risco para Sprint B porque watchers são throwaway code, podem trocar para OpenAI/qualquer outro em 1 dia
- "GitHub Actions outage" — outage <0.1% historic, e cobertura por healthcheck stale detection
- "Custo Anthropic price increase" — possível mas linear, não é risco arquitectural

---

## ADR escrito?

**Não como ADR formal** — esta é decisão táctica de Sprint B, não architectural decision com 5+ year impact. Decisões aqui podem ser revertidas em 1 sprint. Documentação fica neste ficheiro `sprint-b-architecture.md` directamente.

Se promovermos qualquer destas decisões para arquitectura permanente (ex: "todos watchers futuros usam hybrid output handling"), aí sim escreve-se ADR-006 em `.claude/ADRs/`.

---

## Próximos passos sugeridos (se CEO aprova)

1. **CEO review** desta arquitectura (sign-off em cada uma das 7 secções)
2. **Audit `VITE_ANTHROPIC_API_KEY` em `apps/*/src/`** — se referenciado, é bug P0 separado
3. **Criar workspace key `ci-watchers`** em Anthropic console
4. **Configurar repo secrets** (`ANTHROPIC_API_KEY`)
5. **Build sequencial**: competitor-monitor → daily-brief → weekly-recap → healthcheck
6. **Smoke test manual** via `workflow_dispatch` antes de activar crons
7. **Monitor 1 semana** — review todas as Issues criadas, ajustar prompts se output não-útil

Estimate de build: ~6h focused work para 3 watchers + healthcheck.
