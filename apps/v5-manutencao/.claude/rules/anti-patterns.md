# Anti-padrões Proibidos — V5 Manutenção

> Extraído de CLAUDE.md em 1B.2.4. Manter sincronizado com CLAUDE.md quando novas regras forem adicionadas.
> Indexável via `grep "^### Regra" .claude/rules/anti-patterns.md`

---

## Regras de Agent (série 1B)

### Regra AA — Edge Functions: nunca redeploy sem ver tool_error real

Quando uma Edge Function de agent retorna 500, fazer SEMPRE diagnóstico antes de qualquer fix:
1. `SELECT tool_error FROM core.agent_audit_log WHERE agent_name='<x>' ORDER BY created_at DESC LIMIT 5;`
2. Logs do Supabase Dashboard → Functions → `<fn>` → Logs

Causa real pode ser API key corrompida, não código. Três deploys especulativos não substituem 1 query de diagnóstico.

**Lição 1B.1.2:** 3 deploys especulativos eram red herrings. Causa real era contaminação da API key com newline (PowerShell SecureString).

### Regra BB — Validação categórica de inputs de agentes

Tools de agentes que aceitem string para uma coluna categórica (categoria, status, tipo) **devem validar contra `Set<string>` hardcoded antes do SQL**, com throw explícito listando valores válidos.

Razão: agentes podem alucinar valores (`'boiler'` em inglês, `'aquecimento_central'` inventado), Anthropic não impõe constraints em runtime, e CHECK na BD é frágil para conjuntos que evoluem. Validação no executor permite ao agente fazer retry com valor válido (frequentemente `'outros'`).

```ts
const VALID_CATEGORIAS = new Set(["aquecimento", "climatizacao", /* ... */]);
function assertCategoria(cat: string): void {
  if (!VALID_CATEGORIAS.has(cat)) throw new Error(`Categoria inválida: '${cat}'. Válidos: ${[...VALID_CATEGORIAS].join(" | ")}`);
}
```

**Lição 1B.2.1:** `equipamento_create`, `equipamento_update`, `catalogo_search_servico_relevante` usam `VALID_EQUIPAMENTO_CATEGORIAS` e `VALID_SERVICO_CATEGORIAS` (Sets separados — as listas são diferentes).

### Regra CC — Helpers DEV de teste devem ser tolerantes a inputs

Helpers `window.__test*` que aceitem opções devem aceitar string solta E object. Lição 1B.2.2 (deploy v3-v4): helper recebia `{ localizacao_id: 'uuid' }` e enviava o objecto inteiro como valor do campo, PostgREST falhava com `22P02 "invalid input syntax for type uuid: [object Object]"`.

Pattern obrigatório:
```js
const config = typeof opts === 'string'
  ? { localizacao_id: opts }
  : opts;
```

**Aplicado em:** `src/supa.js` `__testImageInspector`.

### Regra DD — supaPublic não partilha JWT (bug silencioso de auth)

`supaPublic` é criado com `persistSession: false` e `storageKey: 'sb-public-auth'` — não partilha a sessão JWT de `supa`. Chamar RPCs `SECURITY INVOKER` (como `current_pessoa_id()`) via `supaPublic` executa como `anon`, logo `auth.uid() = null` → retorna `null` silenciosamente (sem erro HTTP).

**Usar `supaPublic` APENAS para** queries verdadeiramente públicas que não precisem de identidade do utilizador (ex: `SELECT * FROM catalogo_servicos`).

**Para RPCs com `auth.uid()` context ou RLS:** usar `supa` (sessão JWT activa) ou `useAuth()` (valores já resolvidos pelo AuthContext). Nunca usar `supaPublic.rpc('current_pessoa_id')` — vai sempre retornar `null`.

**Lição 1B.2.3c:** `EquipamentoFichaScreen` usava `supaPublic.rpc('current_pessoa_id')` → `pessoaId` sempre `null` → uploads de fatura e foto silenciosamente abortavam no guard `if (!pessoaId) return`. Fix: substituir por `useAuth().pessoa_id`.

---

## Regras de BD / RLS (série 3.4)

### Regra W — RLS sem GRANT (bug silencioso)

```sql
-- PADRÃO OBRIGATÓRIO para toda tabela nova com RLS:
ALTER TABLE schema.tabela ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON schema.tabela TO authenticated;  -- ← OBRIGATÓRIO antes da POLICY
CREATE POLICY "..." ON schema.tabela FOR SELECT TO authenticated USING (...);
```

RLS sem GRANT = PostgREST devolve `data: null` silenciosamente (sem erro visível no console).
Como ter fechadura sem maçaneta — ninguém entra mesmo com a chave certa.
Efeito prático: queries JS devolvem `null`, estados ficam em `[]`/`false`, sem alerta.

**Verificar sempre:** `GRANT` antes de `CREATE POLICY`, em todos os schemas (`core`, `v5_manutencao`, `public`).
Diagnóstico rápido: `SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_schema='X' AND table_name='Y';`

**Lição 3.4D:** `core.staff_roles` — policy SELECT correcta mas faltava `GRANT SELECT TO authenticated` → retornava null silencioso.

### Regra X — SECURITY DEFINER sem GRANT EXECUTE (erro 42501)

Para qualquer função `SECURITY DEFINER`, declarar explicitamente quem pode executar:

```sql
CREATE OR REPLACE FUNCTION schema.fn_x(...) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ ... $$;

-- OBRIGATÓRIO depois do CREATE:
GRANT EXECUTE ON FUNCTION schema.fn_x(...) TO <role_específico>;
REVOKE EXECUTE ON FUNCTION schema.fn_x(...) FROM PUBLIC;
```

Roles típicos: Edge Function via service_role key → `TO service_role`; RPC frontend → `TO authenticated`; Admin → `TO postgres`.
Sintoma: `code: "42501", message: "permission denied for function X"`.

**Lição 3.4D:** `core.fn_anonymize_account` — SECURITY DEFINER sem GRANT EXECUTE a service_role.

### Regra Y — PostgREST embeds são literais às colunas reais

Quando adicionas embed `tabela:nome_real(col1, col2)`, **abre o schema da tabela embedded primeiro**. Nunca infiras nomes de colunas pelo padrão de outras tabelas.

```js
// ERRADO — PostgREST procura tabela chamada "servico_id" (não existe):
.select('ordem, servico:servico_id(id, nome)')

// CORRECTO — embed por nome da tabela destino:
.select('ordem, servico:catalogo_servicos(id, nome)')
```

Diferenças conhecidas:
- `public.servicos` (V1 legacy) usa `categoria_id` (FK numérica)
- `v5_manutencao.catalogo_servicos` (V5) usa `categoria` (string, sem `_id`)

Não fazer copy-paste de embeds entre schemas diferentes. Se a query falha com 400, lê o campo `hint` na resposta PostgREST — indica a coluna correcta.

**Lição 3.4D:** `App.jsx:10523` — embed pedia `categoria_id` mas tabela V5 usa `categoria`.

### Regra Z — Audit RLS checklist obrigatório

ANTES de fechar qualquer fase que aplique/altere RLS:

1. `grep -rn "DEMO_\|MOCK_\|FAKE_\|HARDCODED_" src/` → deve dar 0 matches
2. Auditar TODAS as views (regulares e materialized) sem RLS explícita
3. Auditar TODAS as funções RPC SECURITY DEFINER:
   ```sql
   SELECT n.nspname, p.proname, p.prosecdef
   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname IN ('core','v5_manutencao','public');
   ```
   → cada uma deve ter guard `auth.uid() IS NOT NULL` ou `is_staff()` interno
4. Cross-tenant test: criar 2º utilizador, validar que NÃO vê dados do 1º (Network tab + Response inspection)
5. Testar UI com utilizador novo (sem histórico) — não pode ver mocks
6. `NOTIFY pgrst, 'reload schema';` após cada batch de policies
7. **Inspecionar Network tab durante smoke test** — qualquer 400 indica embed PostgREST mal formado; qualquer 403 indica GRANT em falta
8. **Para tabelas novas com RLS**, confirmar GRANT em `information_schema.role_table_grants` antes de fechar a fase

---

## Anti-padrões gerais (nunca introduzir)

- `DEMO_*`, `MOCK_*`, `FAKE_*`, `HARDCODED_*` fora de testes/storybook
- Fallback arrays em renderização (`[90,65,80,50,68][i]` etc.)
- `useState` com valor não-zero/não-null que pareça dado real
- Mock data partilhado entre utilizadores (todos vêem os mesmos pedidos/poupanças)
- `.single()` sem garantia de ≥1 row — usar `.maybeSingle()`
- Funções RPC `SECURITY DEFINER` com `GRANT anon` sem guard interno (`auth.uid() IS NOT NULL`)
- `core.pessoas` usa `metadata` JSONB para soft-delete GDPR (não coluna `deleted_at`) — ver padrão na Regra W acima
- Naming inconsistente entre schemas — verificar sempre a coluna real antes de embed/query:

| Conceito | `core.pessoas` | `public.servicos` | `v5_manutencao.catalogo_servicos` |
|---|---|---|---|
| Telefone | `telemovel` | n/a | n/a |
| Categoria | n/a | `categoria_id` (FK int) | `categoria` (string) |
| Soft-delete | `metadata->>'deleted'` | n/a | n/a |
| Soft-delete memberships | `deleted_at` (coluna) | n/a | n/a |
