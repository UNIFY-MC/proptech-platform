# Próxima sessão — O que fazer (ordem)

> Auto-mantido por architect-proptech ou Mário. Última actualização: 2026-05-02 17h30.
> Quando uma tarefa fecha, mover para .claude/current/done-recently.md.

## Hoje · ainda pendente (5 min)

[ ] Smoke test V5 mobile real
- Telemóvel: abrir https://proptech-v5-alpha.vercel.app
- Tentar magic-link com email Mário
- Anotar (NÃO fixar): chega email? Link funciona? Logged in?
- Resultado fica para amanhã

## Próxima sessão (3h) · Dashboard com dados vivos

**Objectivo:** dashboard mobile com dados sempre frescos, atualização automática.

**Comando inicial:**
```
@vertical-builder implementa dashboard com dados vivos:
1. Cria scripts/dashboard-data-build.js que parsa:
   - C:\Users\mario\dev\proptech-state\recent-activity.md
   - C:\Users\mario\dev\proptech-state\triggers.md
   - C:\Users\mario\dev\proptech-state\stack-health.md
   - C:\Users\mario\dev\proptech-state\opportunities.md
   - C:\Users\mario\dev\proptech-state\agents\*.md
   - .claude/current/current-sprint-state.md
   - .claude/strategy/verticals-state.md
   - .claude/current/decisions-log.md
   Output: docs/dashboard/data.json com mesma estrutura que DATA actual em index.html

2. Modifica docs/dashboard/index.html:
   - Remove DATA hard-coded
   - Adiciona fetch('data.json') no início
   - Mantém todas as funções de render existentes

3. Adiciona npm script "dashboard:build" no package.json raiz

4. Estende .claude/hooks/subagent-stop.ps1:
   - Após (linha actual de append a recent-activity), adicionar:
     - npm run dashboard:build
     - git add docs/dashboard/data.json
     - git commit -m "chore(dashboard): auto-update from <agent>"
     - git push origin main

5. Test: invocar @auditor-agent revê algo, validar:
   - data.json regenerado
   - Vercel rebuild dispara
   - Dashboard mobile mostra dados frescos

Lê estado antes (Regra 1) e actualiza state file no fim (Regra 2).
```

## Sessão N+2 (2h) · Charter prestador-app

**Quando:** depois de dashboard vivo confirmar funcionar.

**Comando inicial:**
```
@cpo-agent + @architect-proptech (encadeados): preciso de charter detalhado para Sprint 1E P1 prestador-app.

INPUT:
- Screens HTML existentes em [Mário, indica path: docs/prestador-mockups/ ou similar]
- V5 owner-side actual (já live em https://proptech-v5-alpha.vercel.app)
- Referência Jobber (CRM + scheduling + recibos para prestadores B2C)

DELIVERABLES (ADR-006 prestador-app + sprint charter):
1. 5-7 ecrãs com prioridade (auth, dashboard, jobs, comunicação, perfil, ?)
2. Stack: React + Vite + Supabase (mesmo V1 que owner-side)
3. Design system: V5 actual + adaptações específicas prestador
4. Cross-features identificadas:
   - Magic-link reuse (owner partilha link com prestador)
   - V4 fatura electricidade (futuro, parqueado)
5. Sequência implementação (Wave 1 + Wave 2)
6. Acceptance criteria por ecrã
7. Triggers para vertical-builder

NÃO inicies implementação técnica. Só charter.
Lê estado antes (Regra 1) e actualiza state file no fim (Regra 2).
```

## Sessões N+3 a N+5 · Implementação prestador-app

Charter define detalhe. Não pré-escrever aqui.

## Hard blockers a evitar

- NÃO iniciar R2 outreach até prestador-app estar live + smoke-tested mobile
- NÃO fazer mais setup tooling sem antes mobile test V5 actual
- NÃO tocar em V2 produção (regra inviolável)

## Em caso de dúvida

Lê (por esta ordem):
1. .claude/current/current-sprint-state.md (estado dos sprints)
2. .claude/strategy/verticals-state.md (estado das verticais)
3. .claude/current/decisions-log.md (decisões recentes)
4. .claude/current/next-session.md (este ficheiro)

Se ainda dúvidas: invoca `@cpo-agent qual é a prioridade real agora?`
