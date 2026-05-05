# AUDIT-ops · PropTech Platform · 2026-05-05

> Auditoria de operações e watchers. Read-only — nenhum ficheiro editado.
> Gerado por general-purpose agent (substitui ops-builder — ver nota em rodapé).

---

## Watchers activos

Existem 4 GitHub Actions com schedule definido em `.github/workflows/`.

---

### 1. `competitor-monitor.yml` — Segundas 8h UTC (9h Lisboa)

**O que faz exactamente:**

Invoca `scripts/watchers/competitor_monitor.py`. O script:
1. Lê dois ficheiros de estratégia: `.claude/strategy/competitive-references-context.md` e `.claude/strategy/competitor-monitor-spec.md`.
2. Chama a API Anthropic com modelo **claude-sonnet-4-6** (max_tokens: 8192) a simular o papel de CMO agent.
3. Pede um JSON com três campos: `issue_title`, `issue_body` (≤800 chars, mobile) e `full_digest` (≤1500 tokens, snapshot competitivo).
4. Grava o `full_digest` em `.claude/outputs/competitor-watches/competitor-watch-<YYYY-WNN>.md`.
5. Escreve `issue_body` em `/tmp/issue_body.md` e expõe os outputs para o workflow.
6. O workflow cria um GitHub Issue com label `competitor-monitor,automated` e faz upload do digest como artefacto GitHub com retenção de 90 dias.

Competidores monitorizados: OSCAR, Jobber, ServiceTitan, Fixando, FIXO (Tier 1); Samba, Housecall Pro, ZasFácil, Timpla, TaskRabbit (Tier 2A); AppFolio, Shipshape (Tier 2B inspirations).

**Nota de implementação:** o script está em modo `BASELINE` — o prompt de sistema não inclui diff de semana anterior (não há histórico acumulado ainda). A lógica de comparação semana-a-semana ainda não foi implementada.

**Outputs produzidos:**
- Artefacto GitHub: `competitor-watch-<week_id>.md` (90 dias)
- GitHub Issue com label `competitor-monitor,automated`
- Ficheiro local em `.claude/outputs/competitor-watches/` (ver estado em baixo)

**Valor vs custo:**
- Custo por run estimado: ~$0.05–0.10 (Sonnet, ~15k tokens in + ~2k out).
- Valor potencial: alto — inteligência competitiva semanal automatizada, especialmente útil para V5 (Manutenção) onde Jobber, OSCAR e Fixando são rivais directos.
- Limitação actual: sem dados reais recolhidos da web (o script não faz scraping — pede ao Claude para gerar com base em contexto estático). O monitor produz análise sintética, não vigilância de URLs. É útil como estrutura, mas não detecta mudanças reais de preços ou features sem dados frescos injectados.

**Recomendação: Manter, mas documentar limitação.** Valor como estrutura e ritual semanal. A longo prazo, considerar injectar RSS/changelog dos competidores no prompt.

---

### 2. `daily-brief.yml` — Diário 8h UTC (9h Lisboa)

**O que faz exactamente:**

Invoca `scripts/watchers/daily_brief.py`. O script:
1. Executa `git log --since=24.hours.ago` para obter commits das últimas 24h.
2. Lê `.claude/current/decisions-log.md` e filtra entradas de hoje e ontem.
3. Lê os primeiros 5000 chars de `.claude/strategy/master-plan-snapshot.md` e o ficheiro `.claude/current/current-sprint.md` completo.
4. Chama a API Anthropic com modelo **claude-haiku-4-5-20251001** (max_tokens: 2048) a simular COO agent.
5. Pede JSON com `issue_title` e `issue_body` (≤500 chars, formato fixo: Yesterday / Today's focus / Risk / Action).
6. O workflow cria um GitHub Issue com label `daily-brief,automated`.

Nota: o daily-brief **não grava ficheiro local** (ao contrário dos outros dois watcher scripts) — o output fica apenas no GitHub Issue.

**Outputs produzidos:**
- GitHub Issue diário com label `daily-brief,automated`
- Nenhum artefacto GitHub, nenhum ficheiro local

**Valor vs custo:**
- Custo por run: ~$0.005 (Haiku — pricing: $1/$5 por M tokens in/out).
- Custo mensal: ~$0.15 (30 dias × $0.005).
- Valor: baixo-médio. O brief agrega dados reais (git log + decisions-log), mas o output vai para um GitHub Issue que é pouco provável de ser consultado diariamente por um solo founder. O canal é errado para o uso-caso.
- Risco de ruído: ao fim de semanas ou dias sem commits, gera issues com "no commits last 24h" — ruído puro.

**Recomendação: Simplificar.** Reduzir cadência para dias úteis (`0 8 * * 1-5`) ou redirigir output para um canal mais visível (ex: Notion via comment, à semelhança do weekly-recap). O custo é negligenciável mas o valor é desperdiçado se ninguém abre o issue.

---

### 3. `weekly-recap.yml` — Sextas 16h UTC (17h Lisboa)

**O que faz exactamente:**

Invoca `scripts/watchers/weekly_recap.py`. O script:
1. Executa `git log --since=7.days.ago` (fetch-depth: 200).
2. Lê `.claude/current/q2-2026-okrs.md`, `.claude/current/current-sprint.md` e os últimos 3000 chars de `.claude/current/decisions-log.md`.
3. Chama a API Anthropic com modelo **claude-sonnet-4-6** (max_tokens: 8192) a simular CEO agent.
4. Pede JSON com três campos: `issue_title`, `issue_body` (≤1000 chars) e `full_recap` (≤1500 tokens).
5. Grava `full_recap` em `.claude/outputs/weekly-recaps/weekly-recap-<week_id>.md`.
6. **Tenta sincronizar `issue_body` com Notion** como comment na página `35384147-fa60-812c-8ffd-c2908ce22ef8` (se `NOTION_API_KEY` estiver definido).
7. O workflow cria GitHub Issue com label `weekly-recap,automated` e faz upload do `full_recap` como artefacto (90 dias).

**Outputs produzidos:**
- Artefacto GitHub: `weekly-recap-<week_id>.md` (90 dias)
- GitHub Issue com label `weekly-recap,automated`
- Ficheiro local em `.claude/outputs/weekly-recaps/`
- (Condicional) Comentário Notion na página de dashboard

**Valor vs custo:**
- Custo por run: ~$0.05–0.12 (Sonnet, contexto mais pesado que competitor-monitor).
- Custo mensal: ~$0.20–0.48 (4 sextas × ~$0.06–0.12).
- Valor: alto. É o watcher com maior impacto — agrega progresso semanal, OKRs, decisões, e sincroniza para Notion. O canal (Notion comment) é mais adequado que GitHub Issues para um founder.

**Recomendação: Manter.** É o watcher mais completo e com melhor canal de output (Notion). Verificar se `NOTION_API_KEY` está configurado como secret no GitHub.

---

### 4. `healthcheck.yml` — Diário 8h UTC (9h Lisboa)

**O que faz exactamente:**

O healthcheck **não invoca Python** — é shell puro no workflow:
1. Verifica se `ANTHROPIC_API_KEY` está presente e tem formato `sk-ant-...`.
2. Faz uma chamada real à API Anthropic com modelo **claude-haiku-4-5-20251001**, max_tokens: 10, mensagem `"reply OK"` — só para confirmar reachability.
3. Se HTTP 200: cria GitHub Issue com label `healthcheck,automated` e título `healthcheck-OK <datetime>`.
4. Se falha: cria GitHub Issue com label `healthcheck,incident` e título `healthcheck-FAIL <datetime>`.

**Nota importante:** o `watchers-state.md` descreve o healthcheck como verificando "V5 alpha Vercel (HTTP 200), V2 prataowners.pt (HTTP 200), Supabase V1 Edge Functions". **Isso não está implementado.** O workflow actual verifica **apenas** a API key Anthropic e a reachability da API Anthropic. Não verifica URLs de produção.

**Outputs produzidos:**
- GitHub Issue diário com label `healthcheck,automated` (em caso de sucesso)
- GitHub Issue com label `healthcheck,incident` (em caso de falha)
- Nenhum artefacto, nenhum ficheiro local

**Valor vs custo:**
- Custo Anthropic: ~$0.0001 por run (Haiku, 10 tokens).
- Custo mensal Anthropic: ~$0.003 (30 × $0.0001) — desprezível.
- Custo GitHub Actions: ~2 min/run × 30 dias = ~60 min/mês (gratuito no plano free).
- Valor: médio. Garante que a ANTHROPIC_API_KEY está funcional e que a API Anthropic não está em outage. Mas **não verifica produção** (prataowners.pt, V5 Vercel, Supabase edge functions) — o que era o propósito declarado no watchers-state.md.

**Problema de ruído grave:** em caso de sucesso, cria um GitHub Issue diário. Ao fim de 30 dias, existem 30 issues `healthcheck-OK` a poluir o issue tracker. Não existe qualquer lógica de fechar ou suprimir issues de sucesso.

**Recomendação: Simplificar.** Suprimir a criação de issues em caso de sucesso (apenas criar em caso de falha). Adicionar verificação real das URLs de produção (curl a prataowners.pt e ao endpoint V5 Vercel). Reduz ruído drasticamente.

---

## Estado dos outputs de watchers

Directório base: `C:\Users\mario\dev\proptech-platform\.claude\outputs\`

Criado em 2026-04-30. Contém 5 subdirectórios.

| Directório | Ficheiros | Estado |
|---|---|---|
| `competitor-watches/` | **0 ficheiros** | Vazio — nenhuma execução completada |
| `daily-briefs/` | **0 ficheiros** | Vazio — nenhuma execução completada |
| `weekly-recaps/` | **0 ficheiros** | Vazio — nenhuma execução completada |
| `incidents/` | **0 ficheiros** | Vazio |
| `audits/` | Contém `2026-05-05/` | Usado pela auditoria actual |

**Conclusão:** nenhum dos 4 watchers completou ainda uma execução com sucesso. O `watchers-state.md` confirma: todos os status são `never`, com primeiras execuções programadas para 2026-05-04. Dado que hoje é 2026-05-05 e os directórios estão vazios, há uma de duas situações: (a) os watchers correram mas falharam sem gravar ficheiro local (possível se a execução falhou antes do `digest_path.write_text`), ou (b) o repo não está ligado a GitHub Actions activo (ex: repo privado sem billing, ou workflows desactivados). Não é possível confirmar qual o caso sem acesso à consola GitHub Actions.

---

## Stack-health

Ficheiro: `.claude/state/stack-health.md`  
Última actualização declarada: 2026-05-04 (valores estimados)

**Gauges actuais (estimados, não verificados em tempo real):**

| Serviço | Uso% | Label | Status |
|---------|------|-------|--------|
| Supabase V1 Core (`hkmvszkpxjbxmnixzqbl`) | 25% | ~2/8 GB | ok |
| Supabase V2 Condo (`eozklslwfaqujaijvdnl`) | 59% | ~4.7/8 GB | warn |
| Netlify build minutes | 87% | 261/300 min | **critical** |
| GitHub Actions | 18% | 720/4k min | ok |

**Alertas:**
- **Netlify em estado crítico** (87% dos build minutes consumidos). Se os 4 watchers GitHub Actions consumirem minutos Netlify (não consomem — são GitHub Actions, não Netlify), isto não é relevante. O consumo Netlify é provavelmente do auto-deploy de `admin/` ou de builds manuais.
- **Supabase V2 a 59%** — a aproximar-se do limite de 8 GB do plano gratuito/pro com dados reais de clientes (~5k linhas). Monitorizar.
- Os valores no ficheiro são declarados como estimados. Nenhum ops-builder validou os números reais.
- A tabela GitHub/worktrees tem múltiplos campos `_TBD_` — nunca foi preenchida.

**Estado do ficheiro:** parcialmente preenchido. Criado como template, nunca auditado de forma real.

---

## Custos estimados (Anthropic API)

### Contexto: charter máximo €30/mês

**GitHub Actions — minutos/mês:**

| Watcher | Cadência | Runs/mês | Timeout | Min estimados/run | Total min/mês |
|---|---|---|---|---|---|
| `healthcheck.yml` | Diário | ~30 | 5 min | ~2 min | ~60 min |
| `daily-brief.yml` | Diário | ~30 | 5 min | ~3 min | ~90 min |
| `competitor-monitor.yml` | Semanal (seg) | ~4 | 10 min | ~4 min | ~16 min |
| `weekly-recap.yml` | Semanal (sex) | ~4 | 10 min | ~5 min | ~20 min |
| **Total** | | **~68** | | | **~186 min/mês** |

GitHub Actions gratuito: 2000 min/mês (plano free), 3000 (pro). 186 min representa ~9% do plano gratuito — sem pressão.

**Anthropic API — tokens e custo/mês:**

| Script | Modelo | Tokens in estimados/run | Tokens out estimados/run | Custo/run | Runs/mês | Custo/mês |
|---|---|---|---|---|---|---|
| `daily_brief.py` | claude-haiku-4-5-20251001 | ~3000 | ~400 | ~$0.005 | 30 | ~$0.15 |
| `competitor_monitor.py` | claude-sonnet-4-6 | ~8000 | ~2000 | ~$0.054 | 4 | ~$0.22 |
| `weekly_recap.py` | claude-sonnet-4-6 | ~10000 | ~3000 | ~$0.075 | 4 | ~$0.30 |
| `healthcheck.yml` | claude-haiku-4-5-20251001 | ~20 | ~10 | ~$0.0001 | 30 | ~$0.003 |
| **Total** | | | | | | **~$0.67/mês** |

Pricing Sonnet: $3/$15 por M tokens in/out. Pricing Haiku: $1/$5 por M tokens in/out.

**Conclusão de custos:** ~$0.67/mês (~€0.62/mês) em API Anthropic para os 4 watchers. Muito abaixo do charter de €30/mês. Margem ampla para crescimento.

**Supabase `hkmvszkpxjbxmnixzqbl` — tier inferido:**

O ficheiro `.temp/linked-project.json` confirma apenas o project ID e a organização. Não contém informação de plano. Com base no stack-health (2 GB de 8 GB), o projecto está no **plano gratuito (Free tier)** ou **Pro ($25/mês)**. O Free tier do Supabase inclui 500 MB de base de dados — se realmente usa 2 GB, está em Pro ou tem add-ons. A auditar via consola Supabase.

---

## notion-librarian status

Ficheiro: `.claude/state/agents/notion-librarian.md`

```
Last run: _never_
Worktree: _n/a_
Last task: _n/a_
Outputs: _n/a_
Next suggested: _aguardar primeiro trigger ou pedido directo do Mário_
```

**Estado: nunca executou.** O agente `notion-librarian` tem state file criado mas está inactivo. Nenhum histórico registado. Conforme documentado no AUDIT-RAW (secção b), `notion-librarian` é um dos 19 agentes com state file mas sem `.md` correspondente em `.claude/agents/` — portanto não é invocável como sub-agent Claude Code. Existe apenas como registo de estado.

O `weekly_recap.py` tenta sincronizar com Notion directamente via API REST (sem invocar o notion-librarian). Essa integração funciona independentemente do agente.

---

## Limpeza recomendada

Com base nos dados recolhidos, os seguintes itens podem ser eliminados ou simplificados sem impacto em produção:

### Eliminar sem risco

| Item | Localização | Motivo |
|---|---|---|
| `apps/core/` | `apps/core/` | Duplicado de `apps/v1-core/`. CLAUDE.md menciona apenas `v1-core`. Confirmar com Mário e eliminar. |
| 19 state files de agentes sem .md | `.claude/state/agents/` | `assembleia-condo`, `atendimento-condo`, `compliance-condo`, `comunicacao-condo`, `criativo-conteudo`, `diretor-marketing`, `docs-condo`, `energia-condo`, `financeiro-condo`, `gestor-ads`, `gestor-leads`, `importador-v2`, `manutencao-condo`, `orquestrador-condo`, `publisher-social`, `seguros-condo`, `code-reviewer`, `frontend-builder`, `ops-builder`. Nenhum é invocável. São ruído no estado. |
| `.claude/ADRs/` (vazio) | `.claude/ADRs/` | Contém apenas `.gitkeep`. ADRs vivem em `.claude/strategy/adrs/`. Directório redundante. |
| `.claude/history/` (vazio) | `.claude/history/` | Vazio. Sem uso actual. |
| `.claude/pending-approval/` (vazio) | `.claude/pending-approval/` | Vazio. Sem uso actual. |
| `.claude/reviews/` (vazio) | `.claude/reviews/` | Vazio. Sem uso actual. |

### Simplificar (não eliminar)

| Item | Acção |
|---|---|
| `healthcheck.yml` — cria issue em sucesso | Remover step `Create success issue`. Manter apenas `Create failure issue`. Evita 30 issues/mês de ruído. |
| `daily-brief.yml` — runs ao fim de semana | Alterar cron para `0 8 * * 1-5` (dias úteis). Elimina 8 runs/mês sem valor. |
| `watchers-state.md` — status `never` desactualizado | Actualizar após primeira execução confirmada ou corrigir se watchers estão a falhar silenciosamente. |
| `stack-health.md` — campos TBD | Preencher com dados reais em próxima sessão com acesso MCP Supabase. |

---

## Próximas Acções (máximo 5)

1. **Verificar se os watchers GitHub Actions estão a correr** — Os 4 workflows têm schedule activo desde 2026-04-30/05-01, mas nenhum output existe em `.claude/outputs/`. Abrir a consola GitHub Actions e verificar o histórico de runs para `competitor-monitor.yml`, `daily-brief.yml`, `weekly-recap.yml` e `healthcheck.yml`. Se estão a falhar, ver logs. Se nunca correram, verificar se o repo está em contexto que permite crons (repos privados sem Billing podem ter crons suspensos).

2. **Suprimir issues de sucesso no healthcheck** — Editar `.github/workflows/healthcheck.yml` para remover o step `Create success issue`. Manter apenas o step de falha. Esta alteração simples elimina o maior vector de ruído no issue tracker.

3. **Confirmar tier Supabase V1** — Aceder à consola Supabase (`hkmvszkpxjbxmnixzqbl`) via MCP ou browser e verificar: plano actual, uso de storage, uso de bandwidth, e se `NOTION_API_KEY` está configurado nos GitHub Secrets (necessário para o weekly-recap sincronizar com Notion).

4. **Confirmar ou arquivar `apps/core/`** — Confirmar com Mário se `apps/core/` é obsoleto face a `apps/v1-core/`. Se confirmado, eliminar para reduzir ambiguidade na estrutura do monorepo.

5. **Criar `.claude/agents/notion-librarian.md`** — Se o notion-librarian for necessário como sub-agent invocável (para sincronizar ADRs e decisões com Notion), criar o ficheiro `.md` correspondente. Actualmente é apenas um state file sem agente real. Dado que o `weekly_recap.py` já integra directamente com Notion via API, avaliar se o agente é realmente necessário ou se a integração directa é suficiente.

---

## Nota — Substituição do ops-builder

Este relatório foi produzido por **general-purpose agent** (claude-sonnet-4-6) em substituição do `ops-builder`, que consta no `.claude/state/agents/ops-builder.md` mas **não existe como sub-agent invocável** (sem `.md` em `.claude/agents/`). O ops-builder é um dos 19 agentes-fantasma identificados no AUDIT-RAW. A tarefa de auditoria operacional foi executada directamente pelo agent de sessão, sem perda de qualidade funcional.

---

*Gerado em 2026-05-05 · Read-only · Zero edits ao codebase*
