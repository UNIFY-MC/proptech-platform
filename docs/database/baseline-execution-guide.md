# Baseline Execution Guide

**Story:** 019.4 (debt DB-003)
**Audiência:** Mário Carvalho + @devops
**Tempo total estimado:** 30-45 minutos para V1; +15 min para V2 (se decidir fazer agora).

---

## Resumo executivo

Os scripts e procedimentos desta story estão **prontos**, mas a execução depende de credenciais e aprovação humana. Este guia consolida tudo num único caminho.

| Passo | Ferramenta | Tempo | Bloqueio |
|-------|-----------|-------|----------|
| 1. Validar pré-requisitos | shell | 2 min | — |
| 2. Link a V1 | `supabase link` | 3 min | Password V1 |
| 3. Correr dump V1 | `baseline-dump-v1.ps1` | 5 min | — |
| 4. Inspeccionar dump | editor | 5 min | — |
| 5. Marcar baseline applied | SQL Editor V1 | 5 min | — |
| 6. Reconciliar 45 ficheiros | git mv + commit | 10 min | — |
| 7. (Opcional) Repetir V2 | `baseline-dump-v2.ps1` | 15 min | Password V2 + aprovação |
| 8. Verificar `supabase migration list` | shell | 2 min | — |
| 9. Push branch | git push | 1 min | @devops |

---

## Passo 1 — Pré-requisitos

```powershell
# Versão Supabase CLI (precisa de 2.95+)
supabase --version

# Login Supabase (browser-based)
supabase login

# Estar na branch correcta
git status
# Devia mostrar: On branch feat/db-003-baseline-snapshot
```

Se algum step falha:
- CLI old: `scoop update supabase-beta` ou re-instalar
- Login expirado: `supabase login` abre browser

---

## Passo 2 — Link a V1

```powershell
supabase link --project-ref hkmvszkpxjbxmnixzqbl
```

Vai pedir password do DB. Encontrar em:
`https://supabase.com/dashboard/project/hkmvszkpxjbxmnixzqbl/settings/database`
→ secção "Database Password" → "Reset database password" se não souber.

Se já estás linked a outro projecto (ex: V2 anterior), o link sobrescreve. Não cria problema.

---

## Passo 3 — Correr dump V1

```powershell
.\scripts\db\baseline-dump-v1.ps1
```

O script:
1. Verifica que o CLI funciona.
2. Pede confirmação interactiva.
3. Corre `supabase db dump --schema-only` para schemas custom V1.
4. Prepend cabeçalho canónico ao output.
5. Salva em `supabase/migrations/00000000000000_baseline_2026_05_v1.sql`.

Output esperado: ficheiro de 50-500 KB com `CREATE SCHEMA`, `CREATE TABLE`, etc.

Se schemas inexistentes aparecem no aviso: ignorar, `pg_dump` salta-os.

---

## Passo 4 — Inspeccionar dump

```powershell
# Linhas, tamanho
(Get-Content supabase/migrations/00000000000000_baseline_2026_05_v1.sql | Measure-Object -Line).Lines
(Get-Item supabase/migrations/00000000000000_baseline_2026_05_v1.sql).Length

# Schemas presentes
Select-String -Path supabase/migrations/00000000000000_baseline_2026_05_v1.sql -Pattern '^CREATE SCHEMA' | Select-Object -ExpandProperty Line

# Tabelas
Select-String -Path supabase/migrations/00000000000000_baseline_2026_05_v1.sql -Pattern '^CREATE TABLE' | Measure-Object | Select-Object -ExpandProperty Count
```

Esperado:
- Schemas: `core`, `iam`, `system`, `growth`, `marketing` no mínimo.
- Tabelas: 50+ (V1 já tem schemas extensos segundo ficheiros locais).

Se algo estranho (ex: schema esquecido), **não fazer push** — escalar.

---

## Passo 5 — Marcar baseline como already-applied

Seguir o documento `docs/database/baseline-mark-as-applied.md` passos 1-6.

Sumário:
- Browser → SQL Editor V1
- Verificar `schema_migrations` tem 215+ linhas
- Verificar `00000000000000` ainda não existe
- INSERT do registo do baseline
- Confirmar com SELECT
- (Opcional) testar `supabase migration list` localmente

---

## Passo 6 — Reconciliar 45 ficheiros locais

Seguir `docs/database/migration-reconciliation-2026-05-23.md` Secção 5.

Sumário:
```powershell
# Mover 11 ficheiros V2 para subpasta
$v2Files = @(
  '20260512_v2_dashboard_kpis_fix.sql',
  '20260512_v2_dashboard_kpis_fix2.sql',
  '20260512_v2_kpis_detalhe.sql',
  '20260512_v2_kpis_snapshot_and_send_email.sql',
  '20260512_v2_list_cron_jobs.sql',
  '20260512_v2_permissions_and_activity_logs.sql',
  '20260512_v2_rpcs_dashboard_lancar_recebimento.sql',
  '20260512_v2_views_and_extrato_upsert.sql',
  '20260513_v2_carregadores_fornecedores_pessoas.sql',
  '20260513_v2_orcamento_por_fracao.sql',
  '20260513_v2_orcamento_rubricas_kpis_2024_2026.sql'
)
foreach ($f in $v2Files) {
  git mv "supabase/migrations/$f" "supabase/migrations/v2-production/$f"
}
git commit -m "chore(db): move 11 V2-only migrations to v2-production/ [Story 019.4]"
```

Os 34 ficheiros BASELINE V1 ficam onde estão (decisão da story — story futura pode arquivar).

---

## Passo 7 — V2 (OPCIONAL agora)

Recomendação da story: **NÃO fazer V2 imediatamente**. Esperar que V1 esteja validado e estável durante 1-2 semanas, depois fazer V2.

Se decidir fazer V2 agora:

```powershell
supabase link --project-ref eozklslwfaqujaijvdnl
.\scripts\db\baseline-dump-v2.ps1
```

O script V2:
1. Pede confirmação literal `Sim, snapshot read-only V2`.
2. Faz schema-only dump.
3. **Não** modifica `supabase_migrations` de V2.
4. **Não** aplica nada.

O ficheiro resultante é puramente histórico.

---

## Passo 8 — Verificar drift

```powershell
.\scripts\db\check-migration-drift.ps1
```

Esperado: `OK — no drift detected`.

Se sinalizar drift: seguir `pre-push-checklist.md` Step 5.

---

## Passo 9 — Push

Aprovado pelo Mário + smoke test passou + checklist completa:

```powershell
# Verificar status
git log --oneline main..HEAD
git status

# Mário ou @devops decide o push (Regra D2 — não push directo a main)
# Para uma branch feat/:
git push origin feat/db-003-baseline-snapshot
```

@devops abre PR para `main` quando approval Mário.

---

## Troubleshooting

### `supabase db dump` falha com auth error

→ `supabase login` de novo, depois `supabase link --project-ref ...` de novo.

### Output do dump está vazio (0 bytes)

→ Schemas custom não existem ainda na BD. Verificar com `\dn` em psql ou no SQL Editor:
```sql
SELECT nspname FROM pg_namespace WHERE nspname NOT IN ('pg_catalog','information_schema','pg_toast') ORDER BY nspname;
```

### `00000000000000` já existe em `schema_migrations`

→ Alguém correu o procedimento antes. Verificar `name` do registo:
```sql
SELECT * FROM supabase_migrations.schema_migrations WHERE version = '00000000000000';
```
Se `name = 'baseline_2026_05_v1'` → tudo OK, prosseguir. Caso contrário escalar.

### `supabase migration list` mostra ficheiros antigos como `pending`

→ Falso-positivo. Os 34 ficheiros BASELINE V1 com naming 8-dígitos vão sempre aparecer porque CLI não os reconhece. **Não fazer `supabase db push`** — eles representam estado já aplicado.

Solução final (story futura): mover esses 34 ficheiros para `supabase/migrations/_archive-pre-baseline/` para o CLI deixar de os ver.

### CLI versão antiga

→ `scoop update supabase-beta` ou instalar v2.101+ manualmente.

---

## Próximas stories sugeridas

- **019.5 (NEW):** Arquivar 34 ficheiros BASELINE V1 para `_archive-pre-baseline/`.
- **019.6 (NEW):** Documentar e registar primeira migration forward-only (proof-of-concept) — ex: pequena alteração ao `iam` schema.
- **019.7 (NEW):** Repetir baseline-dump-v2 quando estável + plano de forward-only V2.
