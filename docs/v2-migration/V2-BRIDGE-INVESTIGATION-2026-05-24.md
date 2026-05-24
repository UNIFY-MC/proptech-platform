# V2 Bridge Investigation — OQ1 Resolution

**Data:** 2026-05-24
**Autor:** Jarvis (Claude Code)
**Estado:** Investigação concluída — achados críticos
**Escopo:** Resolver OQ1 do [V2-MIGRATION-PLAN.md](V2-MIGRATION-PLAN.md): _"Como `v2_condominios.*` no V1 Core Hub é populado hoje?"_

---

## TL;DR

> **O cron `v2-legacy-bridge-cron` (versionado em git) NUNCA funcionou.** Foi criado a 2026-05-18 01:35 mas falha sistematicamente desde a primeira execução porque depende de `vault.decrypted_secrets` que está vazio (0 rows). Os dados em `v2_condominios.*` no V1 Core Hub são **snapshot estático** populado por algum mecanismo manual antes de 2026-05-18, agora **stale**.
>
> **Impacto:** App React em `apps/v2-condominios/` mostra dados antigos (recebimentos até 2026-05-16, documentos só até 2026-04-12). Não há sync com V2 produção desde 8+ dias.
>
> **Achado bónus crítico:** O mesmo padrão vault-based partiu **5 crons** (v2-legacy-bridge + 4 swarm crons). Total **3.674 falhas nos últimos 7 dias** apenas destes 5 jobs. **DB-011 Truth Engine reactivate (PR #64) pode estar parcialmente comprometido** — o fix v9 da EF está OK mas o cron `swarm-orchestrator-cron` que a invoca falha de 5/5 min.

---

## Achados

### 1. Cron `v2-legacy-bridge-cron` (jobid 26) — NUNCA FUNCIONOU

| Métrica | Valor |
|---|---|
| Criado | 2026-05-18 (first_fail timestamp) |
| Schedule | `0 3 * * *` (1×/dia às 03:00 UTC) |
| Last success | **NULL** (nunca) |
| Successes últimos 7 dias | 0 |
| Failures últimos 7 dias | 7 |
| Erro recorrente | `ERROR: null value in column "url" of relation "http_request_queue" violates not-null constraint` |

**Root cause:** O comando do cron lê URL da vault:
```sql
url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1) || '/functions/v1/v2-legacy-bridge-cron'
```

`vault.decrypted_secrets` está **vazio** (0 rows, confirmado). Logo `decrypted_secret` é NULL → concatenação devolve NULL → `net.http_post(url := NULL)` rejeita.

### 2. Outros 4 crons partilham o mesmo bug

| jobid | jobname | failures 7d | severity |
|---|---|---:|---|
| 27 | swarm-dedupe-15min | 611 | high |
| 28 | swarm-discovery-emitter-10min | 917 | high |
| 29 | swarm-refiner-30min | 305 | medium |
| 30 | **swarm-orchestrator-cron** | **1.834** | **critical (5min!)** |

Todos com `last_ok=null` e mesma mensagem de erro.

**Implicação Truth Engine (DB-011):**
- O fix v9 da EF `swarm-worker-jina` aplicado hoje (PR #64) está OK em isolamento
- MAS o cron `swarm-orchestrator-cron` que dispara as runs **nunca chama a EF** (falha antes do POST)
- Smoke test que correu na sessão DB-011 foi via invocação manual da EF (não cron) → 4 discoveries OK mas em modo manual
- **Truth Engine continua a não funcionar autonomamente**

### 3. Estado real de `v2_condominios.*` em V1 Core Hub

Latest row timestamps por tabela:

| Tabela | Last row created_at | Idade |
|---|---|---|
| `v2_condominios.recebimentos` | 2026-05-16 22:53 | **8 dias** |
| `v2_condominios.extrato_bancario` | 2026-05-16 22:16 | 8 dias |
| `v2_condominios.faturas_pendentes` | 2026-04-12 16:16 | **42 dias** |
| `v2_condominios.documentos` | 2026-04-12 11:44 | 42 dias |

Note: recebimentos+extrato_bancario têm 2 dias antes do primeiro fail dos crons (16-05 vs 18-05), confirmando que algum mecanismo **diferente** populou estas tabelas até 16-05 (não o cron versionado).

### 4. Mecanismo histórico de povoamento (hipóteses)

Sem registo único definitivo. Hipóteses ordenadas por probabilidade:

1. **Script SQL/Python ad-hoc** corrido pelo Mário a partir de export V2 → import V1 (~2 ocasiões: bloco grande em 12-04 + actualização parcial em 16-05)
2. **EF não versionada** corrida manualmente via dashboard Supabase em algum momento
3. **Migration aplicada via supabase-designer** num branch antigo que importou dados como seed
4. **Cron entretanto desactivado** ou substituído pelo versionado que partiu — sem evidência em `cron.job` actual

Confirmar com Mário (ele saberá se fez import manual).

### 5. Vault state

`vault.secrets` tem **0 rows**. Logo qualquer query a `vault.decrypted_secrets WHERE name = '<X>'` devolve nada → todos os crons que dependem deste padrão falham.

Workarounds disponíveis:
- **A. Re-povoar vault** com `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` via Supabase Dashboard → Vault
- **B. Re-escrever os 5 crons** para usar URLs hardcoded (`https://hkmvszkpxjbxmnixzqbl.supabase.co/functions/...`) e `SUPABASE_SERVICE_ROLE_KEY` injectada via `current_setting()` ou env de cron
- **C. Migrar para `system.invoke_edge_fn()` helper** (já usado por outros crons como jobid 6, 13, 21, 22, 27 que parecem funcionar — verificar implementação)

---

## Recomendações imediatas

### Prioridade P0 (bloqueia Fase 0 do plano de migração V2)

1. **Resolver vault** (~10 min)
   - Mário: Supabase Dashboard `hkmvszkpxjbxmnixzqbl` → Vault → adicionar 2 secrets:
     - `SUPABASE_URL` = `https://hkmvszkpxjbxmnixzqbl.supabase.co`
     - `SUPABASE_SERVICE_ROLE_KEY` = `<service role key>`
   - Smoke test: executar manualmente cron 26 (`SELECT cron.schedule_in_database(...)` ou directamente o `net.http_post`)
   - Validação: confirmar `cron.job_run_details` mostra `succeeded` na próxima execução

2. **Confirmar 5 crons voltam a correr** (~15 min após P0.1)
   - Esperar próximas execuções (5min para swarm-orchestrator → primeiro sinal)
   - Se falham, opção C (migrar para `system.invoke_edge_fn`)

3. **Estender `v2-legacy-bridge-cron`** para cobrir TODAS as 17 tabelas legacy
   - Actual: só `condominos → core.pessoas` (parcial)
   - Necessário Fase 1 do plano: recebimentos, extrato_bancario, faturas_pendentes, documentos, faturas_ocr, fracoes, seguro_fracoes, carregadores_contagens, orcamentos, orcamento_por_fracao, portal_tokens, configuracoes, etc.
   - Estimativa: 2-3 dias-dev (separado deste documento)

### Prioridade P1

4. **Backfill 1× imediato** da diferença V2 produção → V1 (8 dias de atraso em recebimentos/extrato + 42 dias em docs/faturas)
   - Pode ser feito via EF temporária ou script `scripts/v2-backfill.mjs`
   - Quantificar quantos rows novos esperar via query V2 `WHERE created_at > '2026-05-16'`

5. **Adicionar alerting** para crons que falham >24h
   - Reuso da nova EF `hermes-notify` para POST Discord quando cron falha → Mário recebe alert

---

## Resolução OQ1

> **OQ1:** _Como `v2_condominios.*` no V1 é populado hoje?_
>
> **Resposta:** Hoje **não é populado**. Foi populado por mecanismo manual ad-hoc em duas ocasiões (12-Abr e 16-Mai). O cron versionado nunca funcionou. Os dados estão stale (8-42 dias atraso).
>
> **Decisão necessária Mário:** aprovar P0.1 (re-povoar vault) + autorizar Fase 0.2 (estender cron) antes de qualquer trabalho da Fase 1 do plano de migração.

---

## Referencias

- [V2-MIGRATION-PLAN.md](V2-MIGRATION-PLAN.md) — plano principal
- [V2-INVENTORY-COMPLETE-2026-05-24.md](V2-INVENTORY-COMPLETE-2026-05-24.md) — matriz features
- Cron commands: `cron.job WHERE jobid IN (26,27,28,29,30)` — todos com mesmo padrão vault
- EF [supabase/functions/v2-legacy-bridge-cron/index.ts](../../supabase/functions/v2-legacy-bridge-cron/index.ts) — código actual (só condominos→pessoas)
- DB-011 (PR #64) fix v9 swarm-worker-jina — válido em isolamento mas não invocado por cron actualmente

---

**Confiança da análise:** ALTA. Dados extraídos directamente de `cron.job` + `cron.job_run_details` + `vault.secrets` + timestamps de rows em `v2_condominios.*`. Verificado via Supabase MCP em sessão de 2026-05-24.
