# V2 Production Migrations — Isolated Folder

**Aplica-se a:** Supabase V2 Condo Hub (`eozklslwfaqujaijvdnl`)
**Origem:** Story 019.4 (debt DB-003), 2026-05-23.

---

## Por que pasta separada?

V2 é **produção viva** com ~5000 linhas de dados reais (Property 007 LDA). Misturar migrations V2 com V1 cria risco de:
- Aplicar uma migration V2 em V1 (ou vice-versa) por engano.
- `supabase db push` correr ficheiros V2 quando linked a V1.
- Drift cross-project não detectado.

Pasta separada → `supabase db push --include-all` pode ser configurado para ignorar `v2-production/` quando linked a V1.

---

## Conteúdo

- `00000000000000_baseline_2026_05_v2.sql` — READ-ONLY snapshot do schema V2 em 2026-05-23. **Não aplicar.**
- (vazio para já) — Futuras migrations V2 com naming `YYYYMMDDHHMMSS_descricao.sql` (14 dígitos).

---

## Regras especiais

1. **Aprovação humana obrigatória** — Mário aprova cada migration V2 antes de aplicar.
2. **Backup data-only antes** — `pg_dump --data-only` da(s) tabela(s) afectadas (fora de git, no Drive do Mário).
3. **Aplicação coordenada** — não usar `supabase db push` directo. Procedimento manual:
   1. Cópia do SQL da migration.
   2. Aplicar via SQL Editor do dashboard V2.
   3. Verificar com SELECT que mudança foi efectiva.
   4. INSERT em `supabase_migrations.schema_migrations` se quiser registar (opcional para V2 enquanto não fizer baseline forward-only).
4. **Smoke test em `prataowners.pt`** — sempre, após cada migration V2.

---

## Regras gerais (vêm de `docs/database/migration-process.md`)

Aplicam-se na íntegra também a V2:
- Naming 14 dígitos.
- One change, one file.
- Idempotência.
- Forward-only.
- Comentário obrigatório no topo do ficheiro.
- Ordem dentro do ficheiro: schema → extension → type → table → constraint → index → function → trigger → RLS → policy → grant → comment.

---

## V1 vs V2 — Quick reference

| Aspecto | V1 (`hkmvszkpxjbxmnixzqbl`) | V2 (`eozklslwfaqujaijvdnl`) |
|---------|----------------------------|------------------------------|
| Estado | A construir | Produção viva |
| Dados | Vazio | ~5000 linhas reais |
| Pasta | `supabase/migrations/` | `supabase/migrations/v2-production/` |
| Aplicação | `supabase db push` (com link V1) | Manual via SQL Editor + aprovação Mário |
| Schemas custom | core, iam, system, growth, marketing, v3-v10 | public (legacy) |
| Auto-deploy | Vercel | Netlify (auto-deploy DESATIVADO) |

---

**Referências:**
- `docs/database/migration-process.md` — Regra 7 (V2 é especial)
- `CLAUDE.md` — Regras invioláveis 4 e 5, Regra D4
- ADR-V2-002 — PostgREST schema exposure
