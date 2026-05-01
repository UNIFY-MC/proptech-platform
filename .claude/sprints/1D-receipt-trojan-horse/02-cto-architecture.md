# Sprint 1D — CTO Architecture

> Author: CTO Agent
> Date: 2026-05-01
> Depends on: 00-charter.md + 01-cpo-spec.md

---

## Database schema additions (v5_manutencao schema)

### Tabela: `magic_links`

```sql
CREATE TABLE IF NOT EXISTS v5_manutencao.magic_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token         TEXT NOT NULL UNIQUE,            -- crypto-random, 64 hex chars
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_servico  TEXT NOT NULL,
  valor_eur     NUMERIC(10,2) NOT NULL CHECK (valor_eur > 0),
  data_recibo   DATE NOT NULL,
  notas         TEXT,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  used_at       TIMESTAMPTZ,                     -- NULL = not yet used
  prestador_id  UUID REFERENCES auth.users(id),  -- populated after onboarding
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX ON v5_manutencao.magic_links (token);
CREATE INDEX ON v5_manutencao.magic_links (owner_id);

-- RLS
ALTER TABLE v5_manutencao.magic_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner vê os seus links"
  ON v5_manutencao.magic_links FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owner cria links"
  ON v5_manutencao.magic_links FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- service_role: acesso total para Edge Functions
GRANT ALL ON v5_manutencao.magic_links TO service_role;
NOTIFY pgrst, 'reload schema';
```

### Tabela: `prestadores_parceiros`

```sql
CREATE TABLE IF NOT EXISTS v5_manutencao.prestadores_parceiros (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id),  -- NULL até criar conta Supabase Auth
  magic_link_id     UUID NOT NULL REFERENCES v5_manutencao.magic_links(id),
  nome              TEXT NOT NULL,
  nif               TEXT NOT NULL CHECK (char_length(nif) = 9),
  telefone          TEXT NOT NULL,
  especialidade     TEXT NOT NULL,
  zona_geografica   TEXT,
  onboarded_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  status            TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','activo','inactivo'))
);

-- RLS
ALTER TABLE v5_manutencao.prestadores_parceiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner vê prestadores via os seus links"
  ON v5_manutencao.prestadores_parceiros FOR SELECT
  TO authenticated
  USING (
    magic_link_id IN (
      SELECT id FROM v5_manutencao.magic_links WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Insert via service_role only"
  ON v5_manutencao.prestadores_parceiros FOR INSERT
  TO service_role
  WITH CHECK (true);

GRANT SELECT ON v5_manutencao.prestadores_parceiros TO authenticated;
GRANT ALL ON v5_manutencao.prestadores_parceiros TO service_role;
NOTIFY pgrst, 'reload schema';
```

---

## Edge Functions needed

### 1. `gerar-magic-link`

| Campo | Valor |
|---|---|
| Endpoint | POST `/functions/v1/gerar-magic-link` |
| Auth | Bearer token (Supabase JWT — owner autenticado) |
| Usa LLM | Não |

**Input:**
```json
{
  "tipo_servico": "Canalização",
  "valor_eur": 120.00,
  "data_recibo": "2026-04-28",
  "notas": "Substituição torneira cozinha"
}
```

**Output (sucesso):**
```json
{
  "token": "a3f7c...(64 chars)",
  "url": "https://prataowners.pt/join/a3f7c...",
  "expires_at": "2026-05-08T08:00:00Z"
}
```

**Lógica:**
1. Validar JWT, extrair `owner_id`
2. Rate limit: máximo 10 links/owner/dia (verificar count na tabela)
3. Gerar token: `crypto.getRandomValues(new Uint8Array(32))` → hex string 64 chars
4. INSERT em `magic_links`
5. Retornar URL

---

### 2. `prestador-onboarding`

| Campo | Valor |
|---|---|
| Endpoint | POST `/functions/v1/prestador-onboarding` |
| Auth | Público (sem Bearer — link partilhado por WhatsApp/SMS) |
| Usa LLM | Não |

**Input:**
```json
{
  "token": "a3f7c...",
  "nome": "João Silva",
  "nif": "123456789",
  "telefone": "+351912345678",
  "especialidade": "Canalização",
  "zona_geografica": "Lisboa"
}
```

**Output (sucesso):**
```json
{
  "success": true,
  "prestador_id": "uuid...",
  "owner_nome": "Amélia Costa",
  "tipo_servico": "Canalização"
}
```

**Lógica:**
1. Buscar token em `magic_links` — validar existe, não expirado, não usado
2. Validar NIF PT (mod 11)
3. INSERT em `prestadores_parceiros` via service_role
4. UPDATE `magic_links.used_at = now()`, `prestador_id = novo_id`
5. Retornar dados para o prestador ver no ecrã de confirmação

**Error cases:**
- Token não existe → 404
- Token expirado → 410 Gone
- Token já usado → 409 Conflict (com mensagem: "Este link já foi usado. Pede ao proprietário um novo link.")
- NIF inválido → 422

---

## Magic-link onboarding mechanism

| Decisão | Escolha | Porquê |
|---|---|---|
| Token generation | `crypto.getRandomValues(32 bytes)` → hex | 256 bits de entropy — impossível brute-force em 7 dias |
| Token TTL | 7 dias | Tempo realista para prestador clicar; depois de 7 dias owner pode gerar novo |
| 1-time use | Sim — `used_at` preenchido após onboarding | Evita prestador fazer onboarding múltiplas vezes com mesmo link |
| Storage | Coluna `token` em `magic_links` com UNIQUE index | Simples, auditável, sem tabela extra |
| URL format | `https://prataowners.pt/join/{token}` | Domínio já existente; rota nova `/join/:token` |
| Rate limit | 10 links/owner/dia | Evita spam; 10 é mais do que suficiente para alpha |

---

## Security considerations (P0)

### Rate limiting
Edge function `gerar-magic-link` faz COUNT antes de INSERT:
```sql
SELECT COUNT(*) FROM v5_manutencao.magic_links
WHERE owner_id = $1 AND created_at > now() - INTERVAL '1 day'
```
Se ≥ 10 → retorna HTTP 429 com mensagem amigável.

### RLS
- `magic_links`: owner só lê/cria os seus próprios — `owner_id = auth.uid()`
- `prestadores_parceiros`: owner vê via FK para os seus links — sem acesso cross-owner
- INSERT em `prestadores_parceiros`: só via service_role (edge function) — nunca via cliente directo

### GRANT statements (Regra FF — GRANT depois de POLICY)
Todos os GRANTs estão nos blocos SQL acima, após as políticas RLS. Regra FF cumprida.

### Magic link token leak protection
- 64 hex chars = 256 bits entropy (mesmo comprimento que uma chave AES-256)
- Token nunca exposto em logs do servidor — só guardado em BD encriptada (Supabase RLS + Vault)
- `expires_at` 7 dias: se token vazar, janela limitada
- 1-time use: token usado não pode ser reutilizado

### VITE_ANTHROPIC_API_KEY
Nenhuma feature nova usa `VITE_ANTHROPIC_API_KEY` no browser.
- `gerar-magic-link`: zero LLM, server-side only
- `prestador-onboarding`: zero LLM, server-side only
- P0 blocker (App.jsx) permanece documentado para pré-launch — NÃO adicionamos novos casos neste sprint

---

## Daily implementation breakdown (14 dias)

| Dia | Componente | Tasks concretas | Owner | Done criterion |
|-----|-----------|-----------------|-------|----------------|
| 1 | Schema migration | Escrever SQL magic_links + prestadores_parceiros; aplicar via Supabase MCP; validar RLS | CTO | Tabelas visíveis no Supabase, SELECT retorna vazio |
| 2 | Edge Function: gerar-magic-link | Scaffold Deno function; token generation; INSERT; rate limit; testes locais com `supabase functions serve` | CTO | curl POST com JWT retorna token 64 chars |
| 3 | Edge Function: prestador-onboarding | Public endpoint; token validation; NIF mod11; INSERT prestador; UPDATE link.used_at | CTO | curl POST sem JWT com token válido cria prestador |
| 4 | Rota /join/:token (React) | Nova rota em App.jsx ou router; página PrestadorOnboardingScreen (sem auth); 3-step form | CTO+CPO | Abrir URL no browser mostra form; submit cria prestador via edge function |
| 5 | Casa+Início merge (UX 1C-lite) | Fundir IniciaScreen + CasaScreen numa CasaScreen unificada; manter todos os componentes existentes | CPO/dev | Tab "Início" e "Casa" tornam-se uma só tab "Casa" sem regressões |
| 6 | Receipt card em CasaScreen | Novo card/botão "Adicionar recibo" em CasaScreen; expandir inline para form 3 campos | CPO/dev | Card visível em Casa; form abre em-lugar |
| 7 | Gerar link UI | Botão "Gerar link para prestador" pós-form; chama gerar-magic-link edge function; mostra URL + botão partilhar (WhatsApp nativo) | CPO/dev | Owner preenche form → recebe link → botão WhatsApp pré-preenchido |
| 8 | Estado "link pendente" em Casa | Lista de links gerados com status (pendente/usado); data de expiração | CPO/dev | Owner vê "João Silva — pendente" ou "João Silva — onboard" |
| 9 | Prestador confirmado — view owner | Quando prestador onboard, Casa mostra card "Prestador confirmado" com nome + especialidade | CPO/dev | Flow completo end-to-end funciona em dev/staging |
| 10 | E2E testing + edge cases | Token expirado → mensagem correcta; token já usado → mensagem correcta; NIF inválido → feedback tempo-real | CTO | Todos os error cases mostram mensagem amigável, sem stack trace |
| 11 | Deploy staging + smoke test | `supabase functions deploy` + verificar produção funciona com owner real (Mário testa pessoalmente) | CTO | Mário usa o flow completo no telefone |
| 12 | Buffer / bugs pós smoke test | Fix de bugs encontrados no Day 11 | CTO+CPO | 0 bugs P0/P1 abertos |
| 13 | Alpha owner recruitment | Mário contacta 5 owners (script COO); onboarding guiado pessoalmente | CEO/COO | 3+ owners aceitam convite |
| 14 | Feedback qualitativo D1 | 30-min entrevista com 1-2 owners que tentaram o flow; captura em .claude/sprints/1D.../feedback/ | CEO/COO | 1+ entrevista gravada/transcrita |

---

## Technical risks

| # | Risco | Probabilidade | Impacto | Mitigação concreta |
|---|-------|---------------|---------|-------------------|
| 1 | Prestador abre link em browser antigo (iOS Safari < 16) e `crypto.getRandomValues` falha no cliente | BAIXA (geração é server-side) | MÉDIO | Token gerado na edge function (Deno), não no browser — cliente só recebe o resultado |
| 2 | Supabase free tier throttle em edge functions durante alpha (requests simultâneos) | BAIXA (alpha = 5 owners) | BAIXO | 5 owners = <100 req/dia; free tier aguenta; upgrade para Pro só se >1000 req/dia |
| 3 | Rota `/join/:token` não funciona com Netlify routing (SPA redirect) | MÉDIA | ALTO (flow quebra para prestador) | Adicionar regra em `netlify.toml`: `[[redirects]] from = "/join/*" to = "/index.html" status = 200` antes de deploy |
| 4 | NIF mod11 validação falha para NIFs de empresas (pessoa colectiva vs singular) | MÉDIA | MÉDIO | Implementar ambas as variações da validação mod11 PT (singular: dígitos 1-8 × pesos, colectiva: diferente); testar com NIF real |
| 5 | Mário não consegue 5 alpha owners em Day 13-14 (kill criteria risk) | MÉDIA | ALTO (valida hipótese central) | Pré-preparar lista COO com 7-8 candidatos (buffer); contacto começar Day 10, não Day 13; Mário é o primeiro alpha user (Day 11) |
