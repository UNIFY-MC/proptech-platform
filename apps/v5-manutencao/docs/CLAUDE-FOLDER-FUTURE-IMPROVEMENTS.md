# `.claude/` folder — Melhorias futuras (referência)

> **Decisão 28 Abr 2026:** adoptamos hoje apenas patterns de baixo custo / alto retorno (`.claude/rules/`, `.claude/agents/v5-prompts/`). Outras melhorias são adiadas para quando o sinal de necessidade aparecer.
>
> **Critério de gatilho:** cada item abaixo lista o sinal concreto que justifica activação. Se o sinal não está presente, **NÃO adoptar** — é overengineering para um dev solo.

---

## Patterns adiados (com gatilho)

### Hooks (`.claude/hooks/`)

**O que são:** scripts shell determinísticos que disparam em eventos do Claude Code.

#### `PostToolUse.sh` — auto-formatação após edits
- **Função:** corre `prettier`/`eslint --fix` em ficheiros editados pelo Claude Code
- **Gatilho de activação:** Claude Code começar a fazer 10+ edits/dia em ficheiros JSX/TS, ou bug recorrente de "código entra com formatação inconsistente"
- **Risco se adoptado cedo:** auto-format pode mudar arquivos que ainda não foram revistos pelo Mario, causando merge conflicts manuais
- **Estimativa setup:** 20 min
- **Prioridade:** baixa enquanto solo dev

#### `SessionStart.sh` — carregar contexto ao abrir sessão
- **Função:** imprime status actual do projecto (branch, último commit, sprint em curso) ao iniciar Claude Code
- **Gatilho de activação:** Mario abrir 5+ sessões Claude Code/dia e perder tempo a explicar contexto cada vez
- **Hoje desnecessário:** Mario cola status no início, e há `agent-memory/` que mantém memória entre sessões
- **Estimativa setup:** 15 min
- **Prioridade:** baixa

#### `PreCompact.sh` — guardar estado antes de compaction
- **Função:** salva snapshot do contexto antes do auto-compaction da sessão
- **Gatilho de activação:** sessões a perder informação importante na compaction (já aconteceu uma vez nesta sessão actual)
- **Estimativa setup:** 25 min
- **Prioridade:** **MÉDIA** — talvez adoptar quando Onda 2 começar (sessões mais longas)

### Slash commands (`.claude/commands/`)

**O que são:** comandos `/comando` que executam fluxos pré-definidos.

#### `/ship` — build + lint + deploy num só passo
- **Gatilho de activação:** Mario fazer 5+ deploys/dia manualmente
- **Hoje desnecessário:** deploys são pontuais (1-2 por dia em sprints activas)
- **Estimativa setup:** 45 min
- **Prioridade:** baixa

#### `/audit-rls` — auditoria automática de RLS + GRANTs
- **Função:** correr checklist da Regra Z em todas as tabelas modificadas no último commit
- **Gatilho de activação:** repetirmos o checklist 3+ vezes manualmente
- **Estimativa setup:** 1h
- **Prioridade:** **MÉDIA-ALTA** — útil mesmo agora, considerar próxima sprint

#### `/cost-check` — análise custo médio agentes último período
- **Função:** queries em `core.agent_audit_log` e `core.api_usage` para summary
- **Gatilho de activação:** custo da Onda 2 começar a preocupar (>€100/mês)
- **Estimativa setup:** 30 min
- **Prioridade:** baixa agora, alta na Onda 2

### Subagentes (`.claude/agents/<name>.md`)

**O que são:** agentes Claude Code com janela de contexto isolada que respondem a sub-tarefas específicas.

> Atenção: NÃO confundir com agentes do produto V5 (image_inspector, casa_advisor). Estes são agentes do Claude Code (developer tooling).

#### `code-reviewer-rls.md` — revê queries RLS
- **Função:** quando Claude Code escreve `.sql` com policies, este subagente verifica regras W, X, Z antes de aplicar
- **Gatilho de activação:** repetirmos audit RLS manual 5+ vezes nos próximos 2 meses
- **Estimativa setup:** 1h (writing system prompt + tools)
- **Prioridade:** **MÉDIA** — pode evitar bugs antes de produção

#### `cost-analyzer.md` — analisa pricing antes de deploy
- **Função:** quando Claude Code propõe Edge Function nova com Vision, este subagente estima custo com base em PRICING map + uso esperado
- **Gatilho de activação:** Onda 2 a aproximar (mais agentes a entrar)
- **Estimativa setup:** 1h
- **Prioridade:** **ALTA** quando arranca Sprint 2.6 (prompt_cache)

#### `migration-namer.md` — gera nome de migration timestamp
- **Função:** dada descrição, gera `YYYYMMDDHHMM_descricao.sql` correctamente formatado
- **Gatilho de activação:** após Sprint 1B.5 (quando passamos a usar timestamps)
- **Estimativa setup:** 15 min
- **Prioridade:** baixa (pattern fácil de seguir manualmente)

### Output styles (`.claude/output-styles/`)

#### `terse.md` — respostas mais curtas, menos prosa
- **Gatilho de activação:** Mario precisar de respostas mais densas em sessões hardcore de debugging
- **Hoje desnecessário:** prosa actual é apropriada para o contexto
- **Estimativa setup:** 10 min
- **Prioridade:** muito baixa

### Plugins (`.claude/plugins/`)

> "First-class em 2026" — feature em maturação. Esperar 6 meses antes de avaliar.

- **Gatilho de activação:** plugin community substancial (≥20 plugins úteis disponíveis)
- **Prioridade:** muito baixa, revisitar Q3 2026

### Skills (`.claude/skills/`) — model-invokable factories

**O que são:** padrões repetidos transformados em "skills" que o Claude Code invoca.

#### Possíveis skills para o V5:

##### `new-agent.md` — criar novo agente V5
- **Função:** dado nome + descrição, gera 8 passos: seed SQL + system prompt + tools schema + Edge Function template + tests + helper DEV + audit log + deploy
- **Gatilho de activação:** termos criado 3+ agentes manualmente e identificarmos o pattern repetido
- **Hoje:** já temos 1 (image_inspector). Próximo (casa_advisor) ainda manual. Skill faz sentido após 3º.
- **Estimativa setup:** 2-3h (skill bem feita)
- **Prioridade:** **ALTA** quando arranca casa_advisor (Sprint 1B.3) — ponderar criar então

##### `new-screen.md` — criar novo screen V5
- **Função:** template para `apps/v5-manutencao/src/screens/<Name>.jsx` + integração com router + style guide
- **Gatilho de activação:** após Sprint 1B.5 quando começamos a decompor App.jsx sistematicamente
- **Estimativa setup:** 1-2h
- **Prioridade:** **MÉDIA**

##### `new-rpc.md` — criar SECURITY DEFINER RPC com GRANTs
- **Função:** template para criar RPC seguindo regras W + X automaticamente
- **Gatilho de activação:** Onda 2-3 (muitos RPCs novos)
- **Estimativa setup:** 1h
- **Prioridade:** baixa agora

### Status line (`.claude/statusline`)

- **Função:** customizar bottom-bar Claude Code com info contextual (branch, sprint, custo mês)
- **Gatilho de activação:** estética/preferência pessoal
- **Prioridade:** muito baixa

### Settings & permissions (`.claude/settings.json`)

- **Já existe** parcialmente (visível no print) — mantém
- **Adicionar quando relevante:** model permissions per scope, tool restrictions per directory
- **Prioridade:** revisitar quando packages/* existirem (Sprint 1B.5)

---

## Padrões adoptados HOJE (Sprint 1B.2.4)

Para referência cruzada:

- ✅ `.claude/rules/anti-patterns.md` — extracção de regras se CLAUDE.md >200 linhas
- ✅ `.claude/agents/v5-prompts/<agent>.md` — versionamento de system prompts dos agentes V5
- ✅ Headings `### Regra W/X/Y/Z` em CLAUDE.md (era prosa, agora indexável)
- ✅ Renomear `MASTER md.md` → `MASTER.md` (sem espaço)
- ✅ Substituir `V5-Roadmap-Pos-3.5.md` pela versão actualizada

---

## Revisão deste documento

**Próxima revisão:** após fecho Onda 1B (estimado meados Maio 2026)

**Critérios de revisão:**
- Algum sinal de gatilho aconteceu? Adoptar
- Sprint 2.6 (prompt_cache) chegou? Considerar `cost-analyzer.md` subagent
- 3 agentes V5 criados? Considerar skill `new-agent.md`
- App.jsx decomposto? Considerar skill `new-screen.md`

---

**Documento criado:** 28 Abril 2026
**Inspiração:** post LinkedIn "Lead Gen Man" sobre `.claude/ folder fully mapped`
**Filosofia:** adoptar baseado em sinal real, não em hype
