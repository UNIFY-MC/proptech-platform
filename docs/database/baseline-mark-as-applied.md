# Marcar baseline como already-applied

**Estado:** Procedimento documentado. **NÃO EXECUTADO** contra a BD.
**Quando executar:** Após Mário gerar o dump real via `scripts/db/baseline-dump-v1.ps1` e validar o conteúdo. Não antes.
**Aplica-se a:** V1 Core Hub (`hkmvszkpxjbxmnixzqbl`). V2 produção tem procedimento separado — ver AC-6 / `migration-reconciliation-2026-05-23.md`.

---

## Contexto

O ficheiro `supabase/migrations/00000000000000_baseline_2026_05_v1.sql` representa o estado actual da BD. **Não deve ser executado** — apenas registado.

O registo é feito no schema `supabase_migrations`, tabela `schema_migrations`. Cada linha corresponde a uma migration aplicada com formato:

```text
version  | statements | name                       | created_by | idempotency_key
---------+------------+----------------------------+------------+----------------
14 digits|  text[]    | descricao_curta            | text       | uuid
```

(Esquema actual da Supabase CLI v2.95.4. Pode variar em versões futuras.)

---

## Procedimento

### Passo 0 — Pré-requisitos

- `scripts/db/baseline-dump-v1.ps1` já correu com sucesso.
- `supabase/migrations/00000000000000_baseline_2026_05_v1.sql` contém o dump real (>1 KB, com `CREATE TABLE`, etc).
- Mário inspeccionou o ficheiro e aprovou.

### Passo 1 — Conectar ao SQL Editor de V1

Browser → `https://supabase.com/dashboard/project/hkmvszkpxjbxmnixzqbl/sql/new`

### Passo 2 — Verificar tabela `schema_migrations` existe

```sql
SELECT count(*) AS total_migrations
FROM supabase_migrations.schema_migrations;
```

**Expectativa:** 215+ linhas (segundo DB-AUDIT 2026-05-05). Se 0, o registo está vazio e a estratégia precisa de ajuste — parar e escalar.

### Passo 3 — Verificar que `00000000000000` ainda não existe

```sql
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version = '00000000000000';
```

**Expectativa:** 0 linhas. Se já existir, parar — alguém já correu este procedimento e re-execução é destrutiva.

### Passo 4 — Inserir o registo do baseline

```sql
INSERT INTO supabase_migrations.schema_migrations (
  version,
  name,
  statements
) VALUES (
  '00000000000000',
  'baseline_2026_05_v1',
  ARRAY['-- baseline schema-only dump, intentionally not executed']::text[]
);
```

**Notas:**
- `version` tem que ser exactamente `00000000000000` (14 zeros) — corresponde ao prefixo do ficheiro.
- `name` corresponde ao sufixo do ficheiro (sem extensão e sem `_`).
- `statements` é o conteúdo executado — aqui usa-se um array com um comentário que documenta que o baseline não foi corrido.
- Se a tabela tiver coluna `idempotency_key` ou `created_by`, deixar em NULL (têm default ou são nullable).

### Passo 5 — Verificar inserção

```sql
SELECT version, name, statements
FROM supabase_migrations.schema_migrations
WHERE version = '00000000000000';
```

**Expectativa:** 1 linha com `name = 'baseline_2026_05_v1'`.

### Passo 6 — Smoke-test do `supabase db push`

Em local (após `supabase link` ao V1):

```bash
supabase migration list
```

**Expectativa:** O baseline aparece como `applied`. Os outros 45 ficheiros locais devem aparecer ou como `applied` (se a reconciliação AC-3 já correu) ou como `pending` (se a reconciliação ainda não correu).

```bash
supabase db push --dry-run
```

**Expectativa:** Se a reconciliação AC-3 não correu ainda, vai listar várias migrations pendentes (os 45 locais com naming velho). Não correr `supabase db push` até reconciliação completa.

---

## Rollback (se algo correr mal)

Caso o INSERT do Passo 4 tenha de ser revertido:

```sql
DELETE FROM supabase_migrations.schema_migrations
WHERE version = '00000000000000';
```

Não há side-effects — o baseline não foi executado, só registado.

---

## Por que `00000000000000`?

Supabase ordena migrations lexicograficamente pelo `version`. `00000000000000` (14 zeros) é menor que qualquer timestamp real (que começa com `20…`). Garante que o baseline:

1. É reconhecido como "antes de tudo".
2. Nunca conflita com timestamps reais futuros.
3. Comunica claramente que é um sentinel, não uma migration normal.

Pattern alinhado com Rails (`0_initial_schema`), Django (`0001_initial`), etc.

---

## Acompanhamento

Depois deste procedimento:
- Marcar Story 019.4 AC-2 como concluído.
- Trigger para `@architect-proptech`: registar decisão em Notion (Arquitectura V1 page).
- Próxima story: AC-3 reconciliação dos 45 ficheiros.
