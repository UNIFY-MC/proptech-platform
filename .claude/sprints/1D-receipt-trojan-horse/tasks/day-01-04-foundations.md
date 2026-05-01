# Sprint 1D — Days 1-4 — Foundations

**Datas:** 2026-05-01 (Qui) → 2026-05-04 (Dom)
**Duração:** 4 dias
**Owner principal:** CTO agent (com CPO em Day 4 para PrestadorOnboardingScreen)
**Bloco success criterion:** Foundations completas e testáveis Day 4 fim — schema + 2 edge functions + rota pública `/join/:token` operacional em staging.

---

## Day 1 — 2026-05-01 (Qui) — Schema migration

**Objectivo do dia:** todas as tabelas necessárias para os success criteria do charter existem em Supabase V1 Core Hub (`hkmvszkpxjbxmnixzqbl`) com RLS + GRANT correctos.

**Pré-condição:** Day 0 reconciliações fechadas (R1, R2, R3, R4 ticked pelo CEO).

### Tasks

- [ ] **Confirmar destino Supabase**: V1 Core Hub `hkmvszkpxjbxmnixzqbl` (NÃO V2 — regra inviolável CLAUDE.md #4) — Owner: CTO
- [ ] **CREATE SCHEMA IF NOT EXISTS core** (resolve gap C2/X2 do auditor) — Owner: CTO
- [ ] **CREATE TABLE core.servicos_ativos** com campos: id, owner_id (FK auth.users), imovel_id, prestador_id (FK v5_manutencao.prestadores_parceiros), tipo_servico, valor_eur, data_servico, magic_link_id, created_at — Owner: CTO
- [ ] **CREATE TABLE v5_manutencao.magic_links** conforme CTO architecture (token UNIQUE 64 hex, expires_at default `now() + 48h` — não 7 dias, ver Decisão 5) — Owner: CTO
- [ ] **CREATE TABLE v5_manutencao.prestadores_parceiros** conforme CTO architecture — Owner: CTO
- [ ] **RLS policies em todas as 3 tabelas** (owner vê só os seus; service_role full access) — Owner: CTO
- [ ] **GRANT depois de POLICY (Regra FF cumprida)** — Owner: CTO
- [ ] **NOTIFY pgrst, 'reload schema'** após cada bloco — Owner: CTO
- [ ] **Smoke test via Supabase MCP**: `SELECT * FROM core.servicos_ativos LIMIT 1` retorna 0 rows sem erro; `SELECT * FROM v5_manutencao.magic_links LIMIT 1` retorna 0 rows sem erro — Owner: CTO
- [ ] **Documentar migration SQL** em `apps/v5-manutencao/sql/202605010001_v5_1d_foundations.sql` para versionamento — Owner: CTO

### Success criterion Day 1

3 tabelas existem em `hkmvszkpxjbxmnixzqbl`, RLS activo, SELECT vazio sem erro, ficheiro SQL versionado em git.

---

## Day 2 — 2026-05-02 (Sex) — Edge function `gerar-magic-link`

**Objectivo do dia:** owner autenticado consegue gerar URL de magic link via curl POST.

### Tasks

- [ ] **Scaffold Deno function** em `supabase/functions/gerar-magic-link/index.ts` — Owner: CTO
- [ ] **Validar JWT do header Authorization**, extrair `owner_id` de `auth.uid()` — Owner: CTO
- [ ] **Rate limit 10 links/owner/dia**: SELECT COUNT do `magic_links` onde `owner_id = $1 AND created_at > now() - 1 day`; se ≥10 → 429 — Owner: CTO
- [ ] **Token generation**: `crypto.getRandomValues(new Uint8Array(32))` → hex 64 chars — Owner: CTO
- [ ] **INSERT em `magic_links`** com `expires_at = now() + INTERVAL '48 hours'` (Decisão 5) — Owner: CTO
- [ ] **Retornar JSON** `{ token, url, expires_at }` com URL `https://prataowners.pt/join/{token}` — Owner: CTO
- [ ] **Service role key** lido de `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` (NUNCA hardcoded — gap T6 do auditor) — Owner: CTO
- [ ] **Teste local com `supabase functions serve`**: gerar JWT de teste → curl POST → recebe URL válida — Owner: CTO
- [ ] **Deploy staging**: `supabase functions deploy gerar-magic-link --project-ref hkmvszkpxjbxmnixzqbl` — Owner: CTO

### Success criterion Day 2

curl com JWT válido a `https://hkmvszkpxjbxmnixzqbl.supabase.co/functions/v1/gerar-magic-link` retorna URL `prataowners.pt/join/{token}` em <500ms; nova linha em `magic_links` confirmada via Supabase MCP.

---

## Day 3 — 2026-05-03 (Sab) — Edge function `prestador-onboarding`

**Objectivo do dia:** público (sem JWT) consegue chamar endpoint com token + dados → cria prestador + servicos_ativos + actualiza link, em transacção atómica.

### Tasks

- [ ] **Scaffold Deno function** em `supabase/functions/prestador-onboarding/index.ts` — Owner: CTO
- [ ] **Endpoint público (sem Bearer required)** — confirmar `verify_jwt = false` em `supabase/config.toml` para esta função — Owner: CTO
- [ ] **Rate limit por IP** (gap T2 auditor): max 20 requests/IP/hora via Supabase Edge Cloudflare ou check manual contra `magic_links` table — Owner: CTO
- [ ] **Validar token**: SELECT `magic_links` WHERE token = $1 AND expires_at > now() AND used_at IS NULL — Owner: CTO
- [ ] **Mensagens erro distintas** (gap T4 auditor): 404 (token não existe), 410 (expirado), 409 (já usado), 422 (NIF inválido) — Owner: CTO
- [ ] **Validar NIF mod11 PT** — implementar para singular E colectiva (ver risk #9 auditor); testar com 5 NIFs reais antes de Day 9 — Owner: CTO
- [ ] **Transacção atómica** (Decisão 4): `BEGIN; INSERT prestadores_parceiros; INSERT core.servicos_ativos; UPDATE magic_links SET used_at = now(), prestador_id = ...; COMMIT;` via service_role — Owner: CTO
- [ ] **Resposta JSON** `{ success: true, prestador_id, owner_nome, tipo_servico }` — owner_nome é primeiro nome apenas (gap P2 auditor: PII mínima) — Owner: CTO
- [ ] **Audit log entry** em cada operação para satisfazer charter critério 3 e gap C3 — Owner: CTO
- [ ] **Deploy staging** — Owner: CTO

### Success criterion Day 3

curl POST sem JWT com token válido + dados de prestador cria atomicamente: 1 linha em `prestadores_parceiros`, 1 linha em `core.servicos_ativos`, 1 UPDATE em `magic_links.used_at`. Se um INSERT falha, NENHUM se persiste (ROLLBACK).

---

## Day 4 — 2026-05-04 (Dom) — Rota `/join/:token` + Netlify redirect

**Objectivo do dia:** prestador clica no link partilhado e abre PrestadorOnboardingScreen no browser sem auth.

### Tasks

- [ ] **Adicionar regra Netlify** (TESTAR EM BRANCH STAGING — gap T1 auditor + regra inviolável CLAUDE.md #3): `[[redirects]] from = "/join/*" to = "/index.html" status = 200` — Owner: CTO
- [ ] **Criar branch `feat/sprint-1d-netlify-redirect`** — Owner: CTO
- [ ] **Smoke test branch staging**: abrir `/admin/index.html` (legacy V1 admin) e `/index.html` (V9 portal) — confirmar 0 regressões. Smoke test `/join/test-token` — confirmar SPA carrega — Owner: CTO+CEO valida pessoalmente
- [ ] **Merge para main após validação CEO** — Owner: CTO
- [ ] **PrestadorOnboardingScreen.jsx**: Step 1 (nome, NIF, telefone), Step 2 (morada, email opcionais), Step 3 (resumo + checkbox consentimento + botão "Confirmar") — Owner: CPO+dev
- [ ] **Não usar AuthContext** nesta screen (é pública) — gap P-cross auditor — Owner: CPO
- [ ] **Reusar `PhoneInput` + função NIF mod11 extraída de `PerfilFiscalForm`** — Owner: CPO
- [ ] **Copy do checkbox consentimento RGPD** (texto COO playbook): "Aceito que os meus dados (nome, NIF, telefone) sejam guardados para emissão do recibo." — checkbox NÃO pre-checked — Owner: CPO+COO
- [ ] **Política de privacidade no footer** (gap O5 auditor): substituir placeholders `[email de Mário]` e `[NIF Mário]` pelos valores reais — Owner: COO+CEO
- [ ] **Submit chama edge function `prestador-onboarding`** + redirect para ReceiptConfirmadoScreen com data — Owner: CPO+dev
- [ ] **ReceiptConfirmadoScreen.jsx**: mensagem confirmação + CTA soft "Criar conta de prestador" (estado deferido) — Owner: CPO

### Success criterion Day 4

Abrir `https://prataowners.pt/join/{token-de-teste}` num browser anónimo: PrestadorOnboardingScreen carrega; preencher 3 steps com NIF válido + submit cria registos atómicos via Day 3 edge function; ReceiptConfirmadoScreen aparece. Admin/raiz NÃO regrediram.

---

## Bloco Days 1-4 — Success criterion final

Foundations operacionais Day 4 fim:
- [ ] 3 tabelas em produção (`core.servicos_ativos`, `v5_manutencao.magic_links`, `v5_manutencao.prestadores_parceiros`)
- [ ] 2 edge functions deployed e testadas (`gerar-magic-link`, `prestador-onboarding`)
- [ ] Rota pública `/join/:token` funcional com PrestadorOnboardingScreen 3-step
- [ ] Netlify redirect activo sem regressão em admin/V9 portal
- [ ] 0 hardcoded secrets, 0 placeholders RGPD em produção

**Próximo bloco:** Days 5-9 — Onboarding flow (UX merge + Receipt flow + E2E testing + Owner E + Owner A).
