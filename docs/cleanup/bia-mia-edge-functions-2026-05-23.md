# Edge Functions Bia/Mia — Audit

**Data:** 2026-05-23
**Story:** 019.5
**Debt:** ARCH-002 (Critical), DB-007 (High)
**Fontes:** brownfield assessment 2026-05-23 (`phase1-data/SCHEMA.md`, `phase1-data/DB-AUDIT.md`) + filesystem audit (`supabase/functions/`)

## Inventário canónico

Conforme `docs/brownfield-discovery/2026-05-23/phase1-data/SCHEMA.md` linha 109 e `DB-AUDIT.md` linha 177, em V1 (`hkmvszkpxjbxmnixzqbl`) coexistem:

| Edge Function | Versão | Schema/Tabela | Estado | Observação |
|---------------|--------|---------------|--------|------------|
| `bia-chat` | v20 | V1 | **ACTIVA** | Endpoint legacy de chat. Consome tokens AI. |
| `mia-chat` | v4 | V1 | **ACTIVA** | Endpoint novo (rename Bia→Mia, iniciado 2026-05-18). |
| `bia-discord-setup` | n/a | V2? | **ACTIVA** (em filesystem) | Discord bot setup para Mário, sem equivalente em V1. |
| `bia-discord-find-mario` | n/a | V2? | **ACTIVA** (em filesystem) | One-shot para encontrar Discord user ID do Mário (debug). |
| `agent-chat` | n/a | V1 | **ACTIVA** | Endpoint genérico de chat (outro, não conflituante). |

Local repo (`supabase/functions/`) contém apenas `bia-discord-setup/` e `bia-discord-find-mario/`. As outras (`bia-chat`, `mia-chat`, `agent-chat`) **não estão versionadas em git** — só existem no Supabase remoto. Story 019.12 cobre versionamento de EFs críticas.

## Duplicates identificados

### `bia-chat` v20 vs `mia-chat` v4 — DUPLICADO REAL

Mesma intenção funcional (chat com o agent persona Mia/Bia). Coexistem:

- **Custo AI duplicado**: cada chamada ao `bia-chat` é tokens desperdiçados se `mia-chat` é o canónico.
- **Histórico dividido**: persistência de chat history em tabelas diferentes ou colunas diferentes.
- **Confusão operacional**: frontend pode estar a chamar um, agents podem chamar outro.

### `bia-discord-*` (V2-context) vs Mia

Aparentemente NÃO são duplicates de `mia-chat`. Estes são funções de setup/utility para o bot Discord do Mário (assistente pessoal "Bia" → agora "Jarvis" / "Mia", ver `CLAUDE.md` global). Não impactam custo AI.

**Decisão pendente** (ver AC-6 da story): manter `bia-discord-*` como nome (legacy, sem impacto), renomear para `mia-discord-*`, ou deprecar.

## Recomendações

Esta story NÃO executa drops (per restrição: "NÃO faças DROP em Edge Functions V1"). Apenas documenta.

### Acções recomendadas para Mário aprovar

1. **Verificar `mia-chat` v4 paridade funcional** com `bia-chat` v20
   - Comparar bodies de request/response
   - Validar que todos os tools/skills disponíveis em `bia-chat` estão em `mia-chat`
   - Logs Supabase: contar invocações de cada nos últimos 7 dias
   - **Não dropar `bia-chat` enquanto paridade não for confirmada**

2. **Inventariar callers de `bia-chat`** (story task line 37)
   ```bash
   grep -rn "bia-chat" apps/dashboard/src/ apps/v2-condominios/src/
   ```
   - Frontend ainda invoca `bia-chat` directamente? → migrar para `mia-chat`
   - Outros agents/edge functions referenciam `bia-chat`? → idem

3. **Tornar `bia-chat` em "410 Gone" wrapper** (story task line 38)
   - Reescrever `bia-chat/index.ts` para devolver `410 Gone` + log do caller
   - Monitorizar 7 dias
   - Se zero hits → DROP via dashboard Supabase (com aprovação Mário)

4. **Versionar `bia-chat`, `mia-chat`, `agent-chat` em git** (story 019.12)
   - `supabase functions download bia-chat --project-ref hkmvszkpxjbxmnixzqbl`
   - Idem para `mia-chat` e `agent-chat`
   - Commit para `supabase/functions/`
   - Permite diff/review antes do drop

5. **Decisão sobre `bia-discord-*`** (AC-6)
   - **Opção A:** Manter como `bia-discord-*` (legacy, sem custo) + ADR explica
   - **Opção B:** Renomear para `mario-discord-*` ou `jarvis-discord-*` (alinhar com Jarvis assistente pessoal global)
   - **Opção C:** Renomear para `mia-discord-*` (alinhar com agente V1)
   - **Recomendação:** Opção A (mínimo esforço, função utility, baixo risco)

## Estado da branch `chore/rename-bia-jarvis-mia`

Ver story 019.5 task line 35-36. Branch existe localmente, NÃO pode ser auto-mergeada (Regra D2 do CLAUDE.md). Requer:
- Review do diff (5 commits)
- Aprovação Mário
- Merge a `main` por humano

## Carry-forward

- [ ] Mário valida paridade `mia-chat` v4 vs `bia-chat` v20
- [ ] Inventariar callers de `bia-chat` (frontend + outras EFs)
- [ ] Versionar `bia-chat`, `mia-chat`, `agent-chat` em git (story 019.12)
- [ ] Decidir e documentar `bia-discord-*` (AC-6 — ADR)
- [ ] Review + merge branch `chore/rename-bia-jarvis-mia` (AC-1)
- [ ] Após paridade confirmada → 410 Gone wrapper em `bia-chat` (7 dias)
- [ ] Depois → DROP `bia-chat` via dashboard Supabase
