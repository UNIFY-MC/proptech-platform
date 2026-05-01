# Review PR — Pre-commit Checklist

> Inspirado em gstack `/review` skill. Adaptado para Sprint 1D
> velocity (atomic commits, no PR formal).

## Quando usar

Antes de cada `git commit -m "..."` durante Sprint 1D.

## Checklist (5 min)

### 1. Diff sanity

- [ ] `git diff --staged` reviewed line-by-line
- [ ] No `console.log()` deixado em código de produção
- [ ] No `TODO` ou `FIXME` sem issue tracking criado
- [ ] No commented-out code (delete or keep, no zombies)
- [ ] No hardcoded URLs/keys (env vars only)

### 2. Anti-patterns Sprint 1D-specific

- [ ] `VITE_*` prefix em API keys → ❌ NUNCA (browser bundle exposure)
- [ ] Edge function calls Anthropic API → ✅ correcto
- [ ] React component calls Anthropic API directamente → ❌ refactor
- [ ] SQL sem RLS policy → ❌ adicionar antes de commit
- [ ] CREATE POLICY sem GRANT correspondente → ❌ Regra FF
- [ ] Magic link sem TTL → ❌ TTL 48h obrigatório
- [ ] Magic link reusable → ❌ 1-time use obrigatório

### 3. Mobile-first sanity

- [ ] DevTools 380px viewport → componente renderiza ok?
- [ ] Tap targets ≥ 44×44 px (Apple HIG)
- [ ] Text legível sem zoom (min 14px body)
- [ ] No horizontal scroll involuntário

### 4. Performance check

- [ ] Bundle size delta razoável (< 50KB para feature pequena)
- [ ] No N+1 queries Supabase
- [ ] No useEffect sem dependency array (loop infinito risk)

### 5. Security gates Sprint 1D

- [ ] Token magic link gerado server-side (Edge Function)
- [ ] Token armazenado hashed em DB (não plaintext)
- [ ] Rate limit edge function configurado
- [ ] No SQL injection vector (parametrized queries only)
- [ ] No XSS vector (React escape default OK, mas dangerouslySetInnerHTML?)

## Self-review questions

Antes de commit, responde mentalmente:

1. Se eu desaparecer 6 meses, outro dev percebe este código?
2. Este commit faz UMA coisa? (atomic principle)
3. O commit message explica WHY, não só WHAT?
4. Se este commit corre prod e algo falha, sei como reverter?

## Commit message format

```
type(scope): short description (≤ 72 chars)

Optional body (≤ 5 lines max).
WHY this change, not WHAT (diff already shows WHAT).

Refs: #issue if applicable.
```

types: feat, fix, chore, docs, refactor, test, security

## Auto-fix common issues antes de commit

```bash
# Lint
npm run lint --silent || true

# Format
npx prettier --write "src/**/*.{js,jsx,ts,tsx}" --silent

# Type check
npm run typecheck --silent || echo "TS errors above"
```

## Red flags STOP commit

Se vês isto, NÃO commitas — fix primeiro:

🚨 `process.env.ANTHROPIC_API_KEY` em código frontend
🚨 `SELECT * FROM ... WHERE password = ?`
🚨 RLS desabilitado em nova tabela
🚨 Magic link token em URL log (servidor)
🚨 Stripe keys em git (mesmo test keys — usa env)
🚨 Hardcoded user IDs / credentials
