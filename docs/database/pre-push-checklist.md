# Pre-Push Checklist — Database Drift

**Aplicável a:** Qualquer `git push` que toque em `supabase/migrations/` ou `supabase/functions/`.
**Responsável:** Agente que faz commit + @devops antes de push.
**Origem:** Story 019.4 AC-5 (debt DB-003).

---

## Por que checklist e não hook?

Considerei hook git automatizado mas escolhi checklist manual porque:

1. O drift acontece tipicamente em sessões de exploração no SQL Editor / MCP — **fora** do scope de um pre-commit hook.
2. Um hook git só apanha o subconjunto de drift que passa por commit.
3. Hook automatizado tem falsos-positivos chatos que erodem confiança.
4. Checklist manual é leve (5 min) e Mário pode executá-lo antes de cada push relevante.

O script `scripts/db/check-migration-drift.ps1` automatiza a parte do check. Não é bloqueante — é chamada explícita.

---

## Checklist (5 minutos)

Antes de fazer `git push` numa branch que tocou em DB:

### ☐ 1. Verificar naming dos novos ficheiros

```powershell
# Listar ficheiros de migration adicionados nesta branch
git diff --name-only --diff-filter=A main...HEAD -- 'supabase/migrations/*.sql'
```

Para cada ficheiro novo, validar:
- [ ] Nome com 14 dígitos `YYYYMMDDHHMMSS_descricao.sql` (não 8)
- [ ] Snake_case
- [ ] `.sql` minúscula
- [ ] Cabeçalho com bloco de metadados (ver `migration-process.md` Regra 10)

### ☐ 2. Verificar idempotência

Para cada migration nova:
- [ ] `CREATE TABLE IF NOT EXISTS` (não `CREATE TABLE` puro)
- [ ] `CREATE INDEX IF NOT EXISTS`
- [ ] Policies em bloco `DO $$ BEGIN IF NOT EXISTS … END $$;`
- [ ] `ALTER TABLE … ADD COLUMN IF NOT EXISTS`
- [ ] Sem `DROP` sem `IF EXISTS`

### ☐ 3. Verificar ordem dentro do ficheiro

Conforme `migration-process.md` Regra 9:
- [ ] CREATE SCHEMA antes de tudo
- [ ] CREATE EXTENSION antes de objects que dependem
- [ ] CREATE TABLE em ordem de dependência (parent antes de child)
- [ ] CREATE INDEX após tabelas
- [ ] ENABLE RLS antes de CREATE POLICY
- [ ] GRANTs no fim

### ☐ 4. Verificar isolamento V1 vs V2

- [ ] Se a migration toca tabelas V2 (condominos/fracoes/extrato_bancario/etc) → está em `supabase/migrations/v2-production/`, **não** no raiz?
- [ ] Se a migration toca schemas V1 (system/iam/core/growth/v3-v10) → está em `supabase/migrations/`, **não** em `v2-production/`?

### ☐ 5. Drift check com script

```powershell
.\scripts\db\check-migration-drift.ps1
```

O script:
- Lista ficheiros locais.
- Lê `.aiox/handoffs/` e logs recentes para detectar chamadas a `apply_migration` sem ficheiro correspondente.
- Sinaliza inconsistências.

Resultado esperado: `OK — no drift detected`.

Se sinalizar drift:
- [ ] Cada `apply_migration({version: X})` mencionado tem ficheiro `supabase/migrations/X_*.sql`?
- [ ] Se não tem, criar agora (retrofit) com o SQL exacto que correu remotamente.
- [ ] Marcar a versão como already-applied seguindo `baseline-mark-as-applied.md` Passo 4 adaptado.

### ☐ 6. Validar `supabase db push --dry-run`

Em local (após `.env` populado):

```bash
supabase db push --dry-run
```

- [ ] Output mostra apenas as migrations novas desta branch?
- [ ] Não tenta re-aplicar baseline ou ficheiros antigos?
- [ ] SQL gerado é o esperado?

Se algo estranho: parar e revisitar reconciliação (`migration-reconciliation-2026-05-23.md`).

### ☐ 7. V2 produção — aprovação explícita Mário

Se a branch toca em `supabase/migrations/v2-production/`:
- [ ] Mensagem ao Mário com diff completo da migration.
- [ ] Aprovação explícita por escrito (chat ou commit message do Mário) antes de aplicar.
- [ ] Backup do `pg_dump` data-only da(s) tabela(s) afectadas (não no repo — fora de git).

### ☐ 8. CodeRabbit (opcional mas recomendado)

```bash
wsl bash -c 'cd /mnt/c/Users/mario/dev/proptech-platform && ~/.local/bin/coderabbit --prompt-only --base main'
```

Verificar que não há flags vermelhos em ficheiros SQL.

### ☐ 9. Commit messages convencionais

```bash
git log --oneline main..HEAD
```

- [ ] Todos os commits começam com `feat(db):`, `fix(db):`, `chore(db):`, `docs(db):`
- [ ] Cada commit referencia a story: `[Story XXX.Y]`

### ☐ 10. Push

Só após todos os 9 anteriores estarem ✓:

```bash
git push origin feat/branch-name
```

Para `main`, **nunca** push directo — sempre PR via @devops.

---

## Quando saltar a checklist

Casos legítimos onde pode pular:

| Caso | Saltar quê |
|------|-----------|
| Push só de docs (`docs(db):`) | Tudo excepto 9 |
| Push só de scripts (`chore(db): scripts/...`) | Tudo excepto 9 |
| Hotfix urgente V2 (com aprovação Mário no momento) | 8 (CodeRabbit) — fazer post-push |
| Branch sem migrations novas | Tudo excepto 9 |

Para qualquer outro caso: completar a checklist toda.

---

## Histórico de uso

| Data | Branch | Drift detectado? | Resolução |
|------|--------|------------------|-----------|
| 2026-05-23 | `feat/db-003-baseline-snapshot` | n/a (introdução da checklist) | — |

(Manter este histórico actualizado em cada uso — ajuda a calibrar a checklist no futuro.)
