# PropTech Platform — Contexto Canónico

Plataforma horizontal multi-vertical PropTech em Portugal.
Solo founder: **Mário Carvalho** (TOC — contabilista certificado · licença Toconline activa).

---

## 🗺️ Naming V1–V10 (canónico — não alterar)

| # | Nome | Tipo | Estado |
|---|---|---|---|
| **V1** | Core Hub | 🟦 Horizontal | A construir (Supabase vazio) |
| **V2** | Condomínios | 🟩 Vertical | **Produção viva** (`prataowners.pt`) |
| **V3** | Seguros | 🟩 Vertical | A construir |
| **V4** | Energia | 🟩 Vertical | Scaffold (515 linhas) · pausada |
| **V5** | Manutenção | 🟩 Vertical | 🟧 **Em desenvolvimento** — Fases 1-3 merged (GPS, checklist, cronómetro, materiais extra, rectificação, rating mínimo) |
| **V6** | Reabilitação | 🟩 Vertical | Futura |
| **V7** | Real Estate | 🟩 Vertical | Futura |
| **V8** | Rentals | 🟩 Vertical | Futura |
| **V9** | BaaS / Swan | 🟦 Horizontal | Infra financeira |
| **V10** | Owners Club | 🟦 Horizontal | Fidelidade |

---

## 📚 Notion — Fonte de Verdade

Antes de decisões arquitecturais, consultar via MCP:

| Página | Notion ID |
|---|---|
| 🏗️ **Visão & Arquitectura** | `34084147-fa60-813d-94fe-d7f72d47d8bd` |
| 🛠️ **Developer Guide — GitHub, Deploy & Verticais** | `34184147-fa60-81b1-b72c-e4e6878656bb` |
| 🔑 **Prompts de Contexto V1-V9** | `34084147-fa60-814d-9836-c3c572949438` |
| 📒 **Contabilidade — Toconline + Multi-Adapter** | `34684147-fa60-810f-8133-ec96e510c10f` |
| 🏢 **V2 — Condomínios · Arquitectura & Integração** | `34184147-fa60-810e-8c85-d750d2623ece` |
| 🏢 **V2 Condomínios · Relatório Estratégico** | `34484147-fa60-8128-9286-c013a28075d3` |
| 🛡️ **V3 Seguros · Relatório Estratégico** | `34284147-fa60-81f2-96d0-f4f5a54b5aa6` |
| 🛡️ **V3 Seguros · Contexto Claude Project** | `34184147-fa60-8150-9b72-ed51c392e7ef` |
| ⚡ **V4 Energia · Relatório Estratégico** | `34284147-fa60-81f3-8028-d475371682fa` |
| ⚡ **V4 Energia · Contexto Claude Project** | `34184147-fa60-814a-9239-d3c54a0a062d` |
| ⚡ **Energia · Tipologias Arquitectónicas** | `34384147-fa60-81a4-84a6-e0b20ccd9ff2` |
| ⚡ **Energia · Análise Competitiva** | `34284147-fa60-8177-a35c-ef819dd16cac` |
| ⚡ **Spock.es · Impacto Vertical Energia** | `34284147-fa60-81c1-97b1-f366c27254f9` |
| 🏦 **V8 BaaS Swan · Relatório** | `34384147-fa60-810e-bd37-f3a99de9500c` |

**Regra:** qualquer agent que faça decisão arquitectural deve começar por consultar a página Notion relevante via MCP.

---

## 🗂️ Estrutura do repositório

```
proptech-platform/
├── admin/                       ← 🔒 HTMLs legacy em produção (NÃO TOCAR)
│   ├── index.html
│   └── index (admin).html
├── index.html                   ← 🔒 V9 Portal cliente (NÃO TOCAR)
├── netlify.toml                 ← 🔒 Deploy config (NÃO TOCAR sem aprovação)
├── .github/workflows/
│   └── deploy.yml               ← (removido em ba521c6 — Netlify faz deploy directo)
├── .mcp.json                    ← Config MCP local (Supabase + Notion) · no .gitignore
├── .claude/settings.json        ← Tokens MCP · no .gitignore (ver commit d6aa63d)
├── .gitignore                   ← Ignora node_modules/, .env, dist/, .mcp.json, .claude/settings.json
├── CLAUDE.md                    ← Este ficheiro
└── apps/
    ├── v1-core/                 ← React (Vite) · port do admin/index.html
    │   └── src/App.jsx          ← 1941 linhas · Supabase + Chart.js
    ├── core/                    ← React (Vite) · porta 5171 · dashboard horizontal
    ├── v4-energia/              ← React (Vite) · scaffold 515 linhas · pausado
    └── v5-manutencao/           ← React (Vite) · porta 5175 · ServiçoPRO
        ├── src/App.jsx          ← 5393 linhas · Fases 1-3 merged
        ├── schema.sql           ← v5_manutencao.* (plano) · ainda não aplicado em produção
        ├── netlify.toml         ← base=apps/v5-manutencao publish=dist
        └── vite.config.js       ← port:5175 strictPort (dev + preview)
```

---

## 🔒 Regras invioláveis (PRODUÇÃO)

1. **NUNCA editar** `admin/` — está a ser usado agora em produção
2. **NUNCA editar** `index.html` da raiz — é o V9 Portal público
3. **NUNCA editar** `netlify.toml` sem confirmação humana dupla
4. **NUNCA alterar dados** em `eozklslwfaqujaijvdnl` (Supabase V2) — tem ~5.000 linhas de dados reais de clientes
5. **NUNCA commitar** service role keys, `.env`, ou credenciais em geral
6. **SEMPRE perguntar antes** de `git push` que afecte produção
7. **SEMPRE usar branches** `feat/<descrição>` para novas features
8. **SEMPRE commits convencionais**: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`

---

## 💾 Supabase

### V1 Core Hub — `hkmvszkpxjbxmnixzqbl`
- Propósito: hub horizontal · CRM, MRR, Owners Club, ofertas, API keys
- Schemas planeados: `core`, `v3_seguros`, `v4_energia`, `v5_manutencao`, `v9_swan`, `v10_owners_club`
- Região: `eu-west-3` (Paris)
- **Estado actual (canónico · pragmático):** V5 está em produção demo a usar tabelas **`public.ordens`** e **`public.prestadores`** (não `v5_manutencao.*`). Razão: agilidade durante Fases 1-3. A migração para o schema `v5_manutencao` está por fazer quando o V5 estabilizar.

#### Colunas V5 adicionadas às tabelas `public.*` (Fases 2-3)

Estas colunas **precisam de existir no Supabase** para o `App.jsx` funcionar sem erros:

```sql
-- Fase 2 · Tarefa 4 — Disponibilidade horária do prestador
ALTER TABLE public.prestadores ADD COLUMN IF NOT EXISTS disponibilidade JSONB DEFAULT '{}'::jsonb;

-- Fase 2 · Tarefa 5 — Serviço por hora + cronómetro
ALTER TABLE public.ordens ADD COLUMN IF NOT EXISTS tipo        TEXT;
ALTER TABLE public.ordens ADD COLUMN IF NOT EXISTS horas_reais NUMERIC(6,2);

-- Fase 2 · Tarefa 6 — Proposta de materiais extra
ALTER TABLE public.ordens ADD COLUMN IF NOT EXISTS proposta_materiais JSONB;
ALTER TABLE public.ordens ADD COLUMN IF NOT EXISTS proposta_estado    TEXT;
ALTER TABLE public.ordens ADD COLUMN IF NOT EXISTS valor_materiais    NUMERIC(10,2);

-- Fase 3 · Tarefa 7 — Rectificação de serviço
ALTER TABLE public.ordens ADD COLUMN IF NOT EXISTS ordem_original_id  TEXT;
ALTER TABLE public.ordens ADD COLUMN IF NOT EXISTS prazo_rectificacao TEXT;
```

Regra: qualquer `ALTER TABLE` aplicado manualmente deve ser registado aqui **e** espelhado em `apps/v5-manutencao/schema.sql` ou numa pasta `apps/v5-manutencao/migrations/`.

### V2 Condo Hub — `eozklslwfaqujaijvdnl`
- Estado: **PRODUÇÃO VIVA** — não tocar em dados
- 30 tabelas, ~5.000 linhas reais
- Tabelas chave: `condominos`, `fracoes`, `documentos` (2733), `recebimentos` (593), `extrato_bancario` (1056), `faturas_pendentes`, `faturas_ocr`, `carregadores_contagens` (359), `documentos_drive`, `seguro_fracoes`, `utilizadores_portal` (64), `audit_log`

### Estratégia de schemas (decisão canónica · Opção C)
- Schemas por vertical: `v3_seguros`, `v4_energia`, `v5_manutencao`, `v10_owners_club`
- Tabelas limpas dentro de cada schema: `apolices`, não `v3_apolices`
- Schema `core` para transversal: `pessoas`, `imoveis`, `empresas`, `servicos_ativos`, `leads`, `oportunidades`, `interacoes`, `ofertas`, `api_keys`, `staff`
- **Excepção corrente:** V5 usa `public.*` até estabilizar (ver secção acima). Plano é migrar quando RLS + auth estiverem prontos.

---

## 🔌 Portas dev (Vite)

Cada app tem `strictPort: true` — se a porta estiver ocupada, o dev server **falha** em vez de saltar:

| App | Porta | Ficheiro |
|---|---|---|
| `apps/core` | 5171 | `vite.config.js` |
| `apps/v1-core` | default (5173) | sem override |
| `apps/v4-energia` | default (5173) | sem override |
| `apps/v5-manutencao` | **5175** | `vite.config.js` (dev + preview) |

Se aparecer `Error: Port XXXX is already in use`, mata o processo: `taskkill /IM node.exe /F` (Windows) ou `pkill -f vite` (Linux/Mac).

---

## 🎨 Design System (extraído de `apps/v1-core/`)

### Cores (light + dark modes)
```css
:root {
  --bg: #f4f3f0;       /* background principal */
  --surface: #fff;     /* cards, modais */
  --surface2: #f0eeeb; /* surface elevada / inputs */
  --border: rgba(0,0,0,0.08);
  --text: #18160f;
  --muted: #6b6458;
  --blue: #1a5296;
  --green: #2d6a4f;
  --gold: #8c6508;
  --red: #8b1a1a;
  --purple: #6b4fa0;
}
body.dark {
  --bg: #0d1117;
  --surface: #161b22;
  --surface2: #1c2333;
  --border: rgba(255,255,255,0.08);
  --text: #e6edf3;
  --muted: #9198a1;
  --blue: #58a6ff;
  --green: #3fb950;
  --gold: #e3b341;
  --red: #ff7b72;
  --purple: #d2a8ff;
}
```

### Tipografia
- Body: `Inter` (300/400/500/600/700)
- Mono: `JetBrains Mono` (400/500/600) — **todos os números, labels, badges**
- Hierarquia: `.pt` 22px 700, `.card-t` 13px 600, `.ps` 12px muted, labels uppercase 8-10px

### Padrões de componentes
- **KPI card** (`.kpi`, `.kpi-l`, `.kpi-v`, `.kpi-s`) — label uppercase 8px, valor 24px mono, sub 10px
- **Badge** (`.b`, `.b-blue`, `.b-green`, …) — mono 9px, padding 2px 8px
- **Table** — headers mono uppercase 8px, cells 12px, hover `var(--surface2)`
- **Sidebar** — 190px expandida, 44px colapsada, items 12px, sections uppercase 8px mono
- **Modal** — 560px default, bordas `--border`, header + body separados

### Regras
- **Luz primeiro, dark via toggle** — persistir em `localStorage.v1theme`
- **Radius**: 4px (inputs), 8px (cards), 10-12px (modais)
- **Sem transições > 200ms**
- **Botões primários**: `.ab` (`var(--blue)` + `#fff`), `.ab-green`, `.ab-outline`

---

## 🧱 Stack técnica

| Camada | Escolha |
|---|---|
| Database | Supabase (Postgres + Auth + Edge Functions + Realtime + Storage + Vault) |
| Backend | Supabase Edge Functions (Deno + TypeScript) |
| Frontend novas verticais | React 18 + Vite + Tailwind (core utilities) + lucide-react |
| Charts | Chart.js 4 |
| Pagamentos | Swan BaaS (V9) |
| Email transacional | Resend |
| Faturação AT | Toconline (Mario é TOC) |
| Documentos | Google Drive |
| Deploy | Netlify (HTMLs legacy) · TBD para apps React |
| Language | Português PT (nunca PT-BR) |

---

## 🧑 Preferências do utilizador (Mário)

- Não é programador profissional — explica em PT-PT simples, não assume vocabulário
- Prefere **opiniões directas** a listas de 5 opções equivalentes
- Valoriza **rigor técnico + honestidade** sobre viabilidade em vez de optimismo vazio
- Quer preservar trabalho feito — aversão a reinvenção quando existe algo a funcionar
- Notion é o registo canónico das decisões
- Terminologia PT-PT: "frações", "rubricas", "avisos de mora", "permilagem", "condomínio"
- Prefere commits granulares com mensagens descritivas

---

## 🤖 Sub-agents disponíveis

- **`architect-proptech`** — decisões arquitecturais · consulta Notion · valida impactos cross-vertical · escreve ADRs
- **`supabase-designer`** — schemas, migrations, RLS policies, edge functions via MCP Supabase
- **`vertical-builder`** — constrói novas verticais React em `apps/vN-<nome>/` · reutiliza design system do v1-core

---

## 🎯 Missão actual

**Estabilizar V5 Manutenção** em `apps/v5-manutencao/` (Vite + React + Supabase).

### Estado V5 (21 Abr 2026)
- `App.jsx` com 5393 linhas · header `v5-manutencao 2026.0420 2221`
- **Fase 1** ✅ (merged) — GPS tracking, checklist obrigatório, cliente Supabase oficial (`@supabase/supabase-js`)
- **Fase 2** ✅ (merged) — Disponibilidade horária (JSONB), serviço por hora `s9` com cronómetro HH:MM:SS, proposta de materiais extra
- **Fase 3** ✅ (merged) — Rectificação de serviço (`tipo:'rectificacao'`, `ordem_original_id`, `prazo_rectificacao`), rating mínimo com avisos amarelo/vermelho
- Deploy: Netlify via `apps/v5-manutencao/netlify.toml` (sem GitHub Actions desde `ba521c6`)
- Dev server: `npm run dev --prefix apps/v5-manutencao` → `http://localhost:5175`

### Próximos passos V5
1. Aplicar no Supabase os `ALTER TABLE` listados na secção 💾 Supabase
2. Criar `apps/v5-manutencao/migrations/` versionado
3. Migrar de `public.*` para schema `v5_manutencao.*` quando auth + RLS estiverem prontos
4. (Depois) retomar V4 Energia — scaffold existe em `apps/v4-energia/` (515 linhas)

### Contexto V4 Energia (pausado)
Notion: relatório estratégico `34284147-fa60-81f3-8028-d475371682fa` · Claude Project `34184147-fa60-814a-9239-d3c54a0a062d` · Tipologias `34384147-fa60-81a4-84a6-e0b20ccd9ff2` · Competitiva `34284147-fa60-8177-a35c-ef819dd16cac` · Spock.es `34284147-fa60-81c1-97b1-f366c27254f9`.

Scope v1 acordado: simulador tarifas + contratos + formulário de mudança de comercializador. **NUNCA retomar V4 sem antes consultar o relatório estratégico no Notion.**