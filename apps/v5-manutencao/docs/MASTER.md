# 📄 MASTER.md (exportável para Claude Code)

> **Esta página é o ficheiro `MASTER.md` para copiar ao repo.**
> 

> **Como exportar:** clica nos `···` no topo direito desta página → **Export** → **Markdown & CSV** → download. Renomeia para `MASTER.md` e copia para `apps/v5-manutencao/docs/MASTER.md` e também `docs/MASTER.md` na raiz do repo.
> 

> **Alternativa rápida:** selecciona todo o conteúdo abaixo desta linha e copia directamente.
> 

---

# PropTech Platform — Master Plan & Claude Code Instructions

> **Ficheiro canónico para o Claude Code.** Lê este documento ao arrancar qualquer sessão. Substitui qualquer outro documento estratégico em conflito.
> 

> **Última actualização:** 24 Abril 2026
> 

> **Dono do plano:** Mário Carvalho
> 

> **Guardado em:** `apps/v5-manutencao/docs/MASTER.md` (copiar também para `docs/MASTER.md` na raiz do repo)
> 

---

## 0. Como usar este documento

**Claude Code: no arranque de cada sessão**

1. Executa `view docs/MASTER.md` e lê a secção §1 Current state
2. Confirma ao utilizador o commit actual, fase actual e próxima tarefa
3. Se o utilizador der um prompt específico, procura nesta tabela qual secção consultar:

| Palavra-chave no prompt | Consultar secção |
| --- | --- |
| "schema", "multi-tenant", "organizations" | §3 (Architecture) + §9.1 (Core schema) |
| "V5", "Fase 3", "Casa", "equipamento" | §5 (V5 Roadmap) + §9.2 (V5 schema) |
| "V10", "Copilot", "condomínio", "inbox" | §6 (V10 Copilot) + §9.3 (V10 schema) |
| "agent", "tool use", "IA", "Claude API" | §7 (Agents Library) + §8 (Tool Use guide) |
| "começar", "arrancar", "primeiro prompt" | §13 (First Tasks) |
| "Supabase", "MCP", "tools do Claude Code" | §11 (MCP Tools) |
| "competidor", "AppFolio", "MRI" | §10 (Competitor Reference) |

**Claude Code: workflow de decisões**

- Se o utilizador pede algo ambíguo → refere esta doc e pede confirmação
- Se encontrares contradição com código existente → reporta, não escolhas
- Se uma decisão não está aqui → pergunta ao utilizador E actualiza esta doc no fim

Depois de cada tarefa concluída: actualizar §1 Current state com o novo commit e fase.

---

## 1. Current state (24 Abril 2026)

### V5 Manutenção

- **Path:** `apps/v5-manutencao/`
- **Port dev:** `5175`
- **Stack:** Vite + React 18 + Supabase (schema `v5_manutencao` em projecto `hkmvszkpxjbxmnixzqbl`)
- **Commit:** `210f867`
- **Fase actual:** transição entre 3a.3 e 3a.4
- **Ecrãs funcionais:** CHome, Explore, Pedidos
- **177 serviços** em `catalogo_servicos` (seed aplicado)
- **Auth:** pausada em 2d.3 — usar DEV bypass por agora

### Débitos pendentes (fechar ANTES de arrancar Fase 3)

1. **3a.4** — Wishlist submit agrupado (por categoria, estado `pendente_orcamento`, slot único, +100 pts)
2. **Admin BD** — painel lê de `catalogo_servicos` em BD (não de seed)
3. **Multi-tenant Core** — criar `core.organizations` + `core.memberships` + audit tables

### V2 Condomínios (intocável)

- **URL produção:** [prataowners.pt](http://prataowners.pt)
- **Supabase:** projecto `eozklslwfaqujaijvdnl` (só leitura para agents)
- **Path:** `admin/` e `index.html` na raiz (LEGACY — NÃO TOCAR)
- **Integração com V5:** via Edge Functions (ler) + webhooks (notificar) — NUNCA escrita directa

### Credenciais disponíveis

- `VITE_ANTHROPIC_API_KEY` em `.env.local` (para Claude API tool use)
- Supabase anon key em `.env.local`
- Moloni/InvoiceXpress: **não configurado** — configurar na Fase 6

---

## 2. Produtos da plataforma

| # | Vertical | Tipo | Supabase | Estado | Prioridade 2026 |
| --- | --- | --- | --- | --- | --- |
| Core | 🏗️ Core Hub | Foundation | schema `core` | ✅ Vivo | Alta (multi-tenant) |
| V1 | 🏆 Owners Club | Horizontal | schema `v1_owners_club` | ⏳ Schema pronto | Baixa |
| V2 | 🏢 Condomínios | Vertical | `eozklslwfaqujaijvdnl` | ✅ Produção | Apenas leitura |
| V3 | 🛡️ Seguros | Vertical | `v3_seguros` | ⏳ Planeado | Média (cross-sell) |
| V4 | ⚡ Energia | Vertical | `v4_energia` | 🟡 Scaffolded | Baixa |
| **V5** | 🔧 **Manutenção** | Vertical | `v5_manutencao` | 🟡 **Em desenvolvimento** | **MÁXIMA** |
| V6 | 🧹 Limpeza | Integra V5 | — | 🟡 Parte do V5 | Via V5 |
| **V10** | 🤖 **Copilot** | AI layer | `v10_copilot` | ⏳ **Planeado** | **Alta (mês 5+)** |

**Foco 2026:** V5 Manutenção → Admin ERP → V10 Copilot.

---

## 3. Architecture

### Multi-tenant (crítico)

Todas as tabelas de verticais têm `organization_id UUID NOT NULL`. A identidade do user vem de `core.pessoas.id`. A ponte é `core.memberships`.

**Tipos de organização:**

- `individual` — pessoa singular (Maria Santos com a sua casa)
- `condominio` — 1 edifício (Ed. Palmeira)
- `empresa_admin_condo` — empresa gestora (AdminCondo Lda com 42 edifícios filhos)
- `empresa_comercial` — empresa com N localizações
- `prestador` — prestador de serviços

**Hierarquia:** `organizations.parent_org_id` permite que AdminCondo Lda seja pai de 42 organizações filhas (edifícios).

**Roles em memberships:** `owner`, `admin`, `member`, `reader`.

### Stack técnica

| Layer | Tech | Notas |
| --- | --- | --- |
| DB | Supabase Postgres | Schemas por vertical, RLS em produção |
| Auth | Supabase Auth | Partilhada, magic link preferido |
| Storage | Supabase Storage | Buckets por org com RLS |
| AI API | Anthropic Claude API | Opus 4.7 ou Sonnet 4.6, tool use nativo |
| Audio | OpenAI Whisper | Único com pt-PT qualidade |
| Vector | pgvector no Supabase | Busca semântica em atas, emails |
| WhatsApp | Twilio WA Business | Canal crítico PT |
| Email | Resend | Transaccional |
| Payments | Stripe | Subscrições + one-off |
| Billing PT | Moloni / InvoiceXpress | Via API |
| Mobile | Vite + React + Tailwind | Já em uso V5 |
| Desktop | Next.js 14 + Tailwind | Admin ERP, Prestador Pro, V10 |

### Produtos 2026

1. **V5 Mobile** — cliente final + prestador básico (diário)
2. **V5 Pro Desktop** — prestador Pro (Next.js separado)
3. **V5 Admin ERP** — cockpit do Mário (Next.js)
4. **V10 Copilot** — AI layer para admins de condomínio (produto paralelo)

---

## 4. Convenções

### Paletas por produto

```
V5 (manutenção)           → #1B4332 / #52B788 / #D8F3DC
Orçamentos à medida       → #534AB7 / #26215C (roxo)
Owners Club (V1)          → #534AB7 / #26215C
Gamificação               → #D4A72C (dourado)
Admin ERP                 → #1a1a2e / #D4A72C
Prestador Pro             → #1a1a18 / #C17E3A
V10 Copilot               → #26215C / #FFD166
```

### Naming

- Tabelas: `snake_case` plural (`ordens_trabalho`, `equipamentos`)
- Colunas: `snake_case` (`data_instalacao`)
- Schemas: `core`, `v5_manutencao`, `v10_copilot`
- Componentes React: `PascalCase` (`CasaScreen.jsx`)
- Helpers: `camelCase` (`calcularCreditoMes`)
- SQL files: `apps/v5-manutencao/sql/NN_descricao.sql`
- Agents: namespace dot-notation (`v5.matchmaker`, `v10.cobrador`)

### Imports

- Supabase via `supa.schema('v5_manutencao').from('ordens_trabalho')` — schema explícito
- Nunca queries cross-schema em JOIN — via API/RPC
- Nunca tocar em tabelas V2 directamente — só via Edge Function

### Commits

- Formato: `tipo(scope): descrição curta`
- Tipos: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`
- Scopes: `v5`, `v5-casa`, `v5-admin`, `core`, `v10`, `v2-bridge`, `docs`
- 1 commit por sub-fase

Exemplos:

- `feat(core): multi-tenant foundations (organizations + memberships)`
- `feat(v5-casa): equipment detail 4 tabs + edit`
- `chore(v5-admin): read services from BD instead of seed`

### TODOs

- `// TODO(mario):` ambiguidade que requer decisão humana
- `// FIXME:` funciona mas tem problema conhecido
- `// NOTE:` contexto não óbvio

### Testes de fase

No fim de cada sub-fase: `npm run dev` sem erros → DevTools sem 4xx/5xx → `npm run build` passa → navegar até à feature → commit → aguardar validação do Mário.

---

## 5. V5 Manutenção — Roadmap 8 Fases

### Fase 0 (AGORA) — Fundações

#### Tarefa 0.1 — Fechar débito 3a.4 Wishlist submit

Em `apps/v5-manutencao/src/CWishlist.jsx`:

```jsx
async function submitWishlist() {
  // 1. Agrupar lista_items por categoria
  const byCategory = lista_items.reduce((acc, item) => {
    if (!acc[item.categoria]) acc[item.categoria] = [];
    acc[item.categoria].push(item);
    return acc;
  }, {});

  // 2. Pedir slot único ao utilizador (modal)
  const slot = await showSlotModal();
  if (!slot) return;

  // 3. Criar 1 ordens_trabalho por categoria
  for (const [categoria, items] of Object.entries(byCategory)) {
    await supa.schema('v5_manutencao').from('ordens_trabalho').insert({
      pessoa_id: user.id,
      categoria,
      itens: items,
      slot_sugerido: slot,
      estado: 'pendente_orcamento',
      organization_id: currentOrg.id
    });
  }

  // 4. +100 pts
  await supa.schema('v5_manutencao').from('pontos_historico').insert({
    pessoa_id: user.id,
    pontos: 100,
    motivo: 'submit_wishlist',
    ref_tipo: 'wishlist'
  });

  // 5. Limpar wishlist
  await supa.schema('v5_manutencao').from('lista_items').delete().eq('pessoa_id', user.id);

  // 6. Navegar para Pedidos
  navigate('/pedidos');
}
```

Commit: `feat(v5): wishlist submit as grouped orders (3a.4)`

#### Tarefa 0.2 — Admin BD read

Painel admin lê `catalogo_servicos` por fetch Supabase, não SVCS seed. Manter UI.

Commit: `chore(v5-admin): read services from BD`

#### Tarefa 0.3 — Schema multi-tenant Core

Criar `apps/v5-manutencao/sql/01_core_multitenant.sql` com SQL de §9.1. Aplicar.

Adicionar `organization_id UUID` (nullable) a: `ordens_trabalho`, `prestadores`, `listas_cliente`, `cliente_moradas`, `perfis_fiscais`.

Commit: `feat(core): multi-tenant foundations`

### Fase 3 — Módulo Casa (Digital Twin)

**Duração:** 4-6 semanas. Pausar no fim de cada sub-fase.

#### 3.1 Schema completo Casa

Criar `apps/v5-manutencao/sql/02_v5_casa_schema.sql` com SQL §9.2. Seed demo.

Commit: `feat(v5-casa): schema + seed for Phase 3`

#### 3.2 BNav novo + ecrãs base

**Antes:** Início · Explorar · FAB · Pedidos · Perfil

**Depois:** Início · Serviços · FAB(Pedir) · Casa · Pedidos (Perfil via avatar top-right)

**Componentes novos:**

- `IniciaScreen.jsx` — saudação + temperatura + subscrição + score compact + missões + alerta meteo + cross-sell
- `ServicosScreen.jsx` — 8 categorias (P.Obra → **Orçamentos à medida** roxo) + banners + combos
- `CasaScreen.jsx` — hero score grande + 5 mini-barras + 4 quick actions + AI Expert card + lista equipamentos + Home Assessment (+300pts se completo)
- `PedidosScreen.jsx` — 3 tabs (Em curso/Agendados/Histórico) + card "faltam X€ para subscrição grátis"
- `PerfilSheet.jsx` — bottom sheet via avatar
- `SubscricaoScreen.jsx` — estado + breakdown + 3 planos

**Helpers:**

- `src/lib/subscription.js` — `calcularCreditoMes`, `subscricaoPagar`
- `src/lib/gamification.js` — `ganharPontos`, `verificarStreak`, `calcularNivel`

Commit: `feat(v5-casa): new BNav + Início + Casa + Perfil sheet`

#### 3.3 Ficha equipamento (4 tabs + edição)

`src/EquipamentoFicha.jsx`:

- **Detalhes:** grid 2×4 metadados + card IA âmbar + 2 botões (Agendar/AI Expert)
- **Intervenções:** timeline + registar (+50 pts)
- **Documentos:** lista filtrada + upload (+30 pts, máx 300/mês)
- **Fornecedor:** 3 cards (Fabricante / Técnico habitual / Peças)
- **Modo edição:** toggle ✎ + seletor classe energética + Abater/Apagar

Commit: `feat(v5-casa): equipment detail 4 tabs + edit + abater/apagar`

#### 3.4 Docs vault + Energia

**DocsScreen:** bucket `v5-casa-docs` (private, 50MB max). Path `{pessoa_id}/{localizacao_id}/{tipo}/{filename}`. Filtros chips. Search client-side.

**EnergiaScreen:** lista equipamentos com barra kWh/€/% · calculadora poupança A-rated · **OCR faturas via Claude Vision**.

Commit: `feat(v5-casa): docs vault + energy with OCR`

#### 3.5 IPMA + Câmara IA + AI Expert + AlertActions

**IPMA** (`src/lib/ipma.js`): `api.ipma.pt` livre, cache 12h.

**Câmara IA**: `getUserMedia` → Claude Vision → extrai marca/modelo/potência/classe/health score. +100 pts.

**AI Expert**: chat com contexto completo da casa. Chips sugestão baseados em alertas. +20 pts 1ª conversa/mês, +75 pts agendar via chat.

**AlertActions**: feed na CasaScreen. Templates: `urgent_chuva_cobertura_antiga`, `warning_caldeira_eficiencia`, `info_filtro_ac`, `success_revisao_ok`.

Commit: `feat(v5-casa): IPMA + camera AI + AI Expert + AlertActions`

#### 3.6 Orçamentos à medida (RFQ)

Fluxo 4 passos: Áreas (max 3) → Descrição+fotos → Formato (Instant/Online/Scheduled) → Confirm.

+50 pts enviar, +100 pts aceitar.

Commit: `feat(v5-casa): custom RFQ flow + distribution`

### Fase 4 — Signup Dual Real

Remover DEV bypass. Escolha Cliente (Individual/Condomínio/Empresa) vs Prestador (Básico gratis / Pro 14.90€/mês, trial 3 meses Founding 200).

### Fase 5 — Subscrição activada

Stripe: Home+ 6.90€, Home Pro 12.90€, Prestador Pro 14.90€. Webhooks → activar plano. Crédito 10% mensal.

### Fase 6 — Prestador Pro Desktop + Admin ERP + V2 Bridge

- **6.1** Prestador Pro mobile: agenda + faturas Moloni
- **6.2** Prestador Pro Desktop: `apps/v5-pro-desktop/` em Next.js 14
- **6.3** Admin ERP: `apps/v5-admin-erp/` em Next.js 14 + Audit Center UI
- **6.4** V5 ↔ V2 Bridge: Edge Functions + webhooks

### Fase 7 — V10 Copilot (paralelo, ver §6)

### Fase 8 — B2B Condo + Empresa no V5

Categoria "Manutenção condomínios" + 8 landings por categoria + cross-sell V10 + referral.

### Fase 9 — Marketing platform

Sponsorship packages 3k€/6k€/ano. 3 categorias anunciantes. Self-service dashboard.

### Tabela de pontos

| Acção | Pontos |
| --- | --- |
| Enviar pedido | +50 |
| Aceitar orçamento | +100 |
| Submeter wishlist | +100 |
| Registar equipamento manual | +25 |
| Registar via câmara IA | +100 |
| Completar Home Assessment | +300 |
| Upload documento | +30 (máx 300/mês) |
| Registar intervenção | +50 |
| 1ª conversa AI Expert mensal | +20 |
| Agendar via AI Expert | +75 |
| Streak 7 dias | +50 bónus |
| Streak 30 dias | +300 bónus |

**Níveis:** Bronze (<500) → Silver (500-1500) → Gold (1500-3500) → Platinum (3500-7500) → Diamond (7500+)

---

## 6. V10 Copilot — Spec

### Posicionamento

- Nome interno: **V10 Copilot** (comercial: "Meuscondo AI")
- Produto paralelo ao V2, **BD própria** (`v10_copilot`)
- Consulta V2 via ETL nightly + API on-demand (V2 é read-only)
- Add-on 15-30€/mês/edifício
- Path: `apps/v10-copilot/` em Next.js 14

### Smart Inbox multi-canal (sem login)

| Canal | Como funciona | Implementação |
| --- | --- | --- |
| 📧 Email directo | `palmeira@meuscondo.pt` | Postmark/Mailgun inbound |
| 📱 WhatsApp Business | Número por condomínio | Twilio WA Business API |
| 🌐 Portal público | `palmeira.meuscondo.pt` sem password | Next.js dynamic route |
| 🔗 Magic link | SMS/email com link 24h | JWT com expiry |
| 📱 QR code | QR no hall → form pré-identificado | Next.js `/qr/[building]` |

**Pipeline:** mensagem → classifier IA → `inbox_messages` → agent rascunha → admin aprova 1 clique → resposta pelo mesmo canal.

### V2 Ask (natural language, ⌘K)

Exemplos: "condóminos em atraso > 30 dias", "qual edifício gastou mais em elevador", "edifícios sem assembleia há 12 meses". Inspiração MRI Ask Agora.

### Page Assistant contextual

Painel lateral persistente. Lê contexto da página actual. 3-4 acções em 1 clique. Inspiração MRI Page Assistant.

### Command Center (home admin)

Feed de decisões (não dashboard passivo): 1) Briefing IA topo, 2) 3 urgentes com action cards, 3) 4 sugestões IA. Cada card = 1 decisão + 1 clique.

### Pricing

| Plano | Preço | Inclui |
| --- | --- | --- |
| Starter | 15€/mês/edif | V2 Ask + Smart Inbox + Cobrador + Compliance |
| Pro | 25€/mês/edif |   • Dispatcher + Procurement + Page Assistant |
| Enterprise | custom |   • Agents custom + white label |

**Founding 100:** primeiros 100 clientes têm Pro ao preço de Starter vitalício.

### Roadmap V10 (6 fases)

| Fase | Semanas | Entrega |
| --- | --- | --- |
| A | 1-2 | Schema + ETL V2 + Smart Inbox (email) |
| B | 3-4 | Cobrador IA + V2 Ask 10 tools |
| C | 5-6 | Compliance Guardian + Command Center |
| D | 7-8 | Inbox + WhatsApp + Portal + QR |
| E | 9-10 | Dispatcher + Procurement |
| F | 11-12 | Onboarding self-service + 10 clientes beta |

---

## 7. Agents Library

### 7.1 Princípios

1. Agent especializado, 10-15 tools máx
2. Human in the loop nos pontos críticos
3. Rascunho antes de execução
4. Max 20 iterações
5. Idempotência
6. Audit tudo em `core.agent_audit_log`

### 7.2 Agents V10 Copilot

#### `v10.cobrador` — Cobrador IA

**Objectivo:** resolver quotas em atraso com empatia

**System prompt:**

```
És o Cobrador IA da AdminCondo Lda. Falas português de Portugal formal mas empático.
Teu objectivo é maximizar cobrança mantendo boas relações.
Regras:
- 1º atraso sem histórico → email amigável com plano de pagamento
- Reincidente (2+ atrasos em 12m) → carta registada + notificação legal
- NUNCA enviar sem aprovação do admin
Contexto: orgID {{org_id}}, ano {{ano}}, mês {{mes}}
```

**Tools:**

- `v2.list_quotas_atraso` — auto
- `v2.historico_condomino` — auto
- `v2.score_risco_condomino` — auto
- `comms.draft_email` / `comms.draft_whatsapp` — auto
- `comms.send_email` / `comms.send_whatsapp` — **requires_admin**
- `docs.generate_carta_registada` — **requires_admin**
- `docs.send_ctt` — **requires_admin**
- `calendar.schedule_followup` — auto
- `v2.registar_interacao` — auto

Ganho: 3-4h/semana por admin.

#### `v10.dispatcher` — Dispatcher de Manutenção

**Objectivo:** transformar pedido em intervenção resolvida

**Regras:** urgência CRÍTICA (água, fogo, ascensor) = auto-agendar + notificar admin paralelo. Outras = aguardar aprovação.

**Tools:**

- `vision.classificar_foto_problema` (Claude Vision) — auto
- `vision.estimar_urgencia` — auto
- `v5.list_prestadores_disponiveis` — auto
- `v5.match_prestador_habitual` — auto
- `v5.create_ordem_trabalho` — **requires_admin** (excepto crítica)
- `calendar.check_availability` — auto
- `calendar.schedule_event` — **requires_admin** (excepto crítica)
- `comms.draft_confirmation_condomino` — auto
- `comms.send_whatsapp` — requires_admin

Inspiração: AppFolio Realm-X Maintenance Performer.

#### `v10.compliance` — Compliance Guardian

**Objectivo:** nunca ultrapassar prazo legal. Corre todas as noites 04h.

**Níveis de alerta:** 30d preparar docs + notificar (info) → 15d escalar (warning) → 7d urgente (red) → expirado crítico.

**Tools:**

- `v2.list_obrigatorias` — auto
- `compliance.regras_legais` — auto (knowledge base PT)
- `docs.generate_convocatoria` — auto (rascunho)
- `docs.generate_rfq_inspeccao` — auto
- `v5.list_empresas_certificadas` — auto
- `calendar.reserve_assembly_slot` — auto
- `comms.alerta_admin` — auto
- `comms.send_email` — requires_admin

#### `v10.procurement` — Procurement IA

**Objectivo:** gerir orçamentos de obras. Limite: acima de 5.000€ obriga assembleia.

**Tools:**

- `docs.extract_pdf_orcamento` (Claude Vision → JSON) — auto
- `procurement.normalizar_rubricas` — auto
- `procurement.detectar_omissoes` — auto
- `procurement.comparar_com_mercado` — auto
- `docs.generate_comparativo_pdf` — auto
- `comms.draft_rfq` — auto
- `comms.send_rfq` — requires_admin
- `v2.registar_adjudicacao` — requires_admin (bloqueado > 5k)

### 7.3 Agents V5 (Fase 6+)

- **`v5.matchmaker`** — atribui melhor prestador a pedido (score + distância + disponibilidade). Corre em ordens `aberta`.
- **`v5.optimizer`** — optimiza agenda diária do prestador Pro. Sugere trocas.
- **`v5.facturador`** — gera faturas Moloni de intervenções concluídas. Rascunho → prestador emite.
- **`v5.retencao`** — detecta risco churn semanalmente. Rascunha ofertas de retenção.

### 7.4 Admin ERP

- **`admin.supervisor`** — corre diariamente 07h. Detecta padrões (prestadores com ratings a cair, anomalias revenue, etc.) e gera briefing.

---

## 8. Claude API Tool Use — guia prático

### Setup

```tsx
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
```

### Definir tool

```tsx
const tools = [{
  name: "listar_condominos_em_atraso",
  description: "Lista condóminos com quotas em atraso há N dias",
  input_schema: {
    type: "object",
    properties: {
      organization_id: { type: "string" },
      dias_minimos: { type: "number", default: 30 }
    },
    required: ["organization_id"]
  }
}];
```

### Agent loop (template reutilizável)

```tsx
// src/lib/agents/runAgent.ts
export async function runAgent({ agentName, systemPrompt, tools, objective, adminId, organizationId, maxIterations = 20 }) {
  const sessionId = crypto.randomUUID();
  const messages = [{ role: 'user', content: objective }];
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;
    const resp = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages
    });

    await supa.schema('core').from('agent_audit_log').insert({
      organization_id: organizationId,
      agent_name: agentName,
      session_id: sessionId,
      iteration: iterations,
      objective,
      content: resp.content,
      stop_reason: resp.stop_reason
    });

    if (resp.stop_reason === 'end_turn') {
      return { success: true, result: resp.content, iterations, sessionId };
    }

    if (resp.stop_reason === 'tool_use') {
      const toolBlocks = resp.content.filter(b => b.type === 'tool_use');
      const toolResults = [];

      for (const block of toolBlocks) {
        const approvalReason = await checkApprovalPolicy(block.name, block.input, organizationId);

        if (approvalReason) {
          const approval = await requestAdminApproval({ adminId, agent: agentName, tool: block.name, input: block.input, reason: approvalReason, sessionId });
          if (!approval.approved) {
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Admin rejeitou: ${approval.reason}`, is_error: true });
            continue;
          }
        }

        try {
          const result = await executeToolLocally(block.name, block.input);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
          await supa.schema('core').from('agent_audit_log').insert({ organization_id: organizationId, agent_name: agentName, session_id: sessionId, tool_name: block.name, tool_input: block.input, tool_output: result, approved_by: approvalReason ? adminId : null });
        } catch (err) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Erro: ${err.message}`, is_error: true });
        }
      }

      messages.push({ role: 'assistant', content: resp.content });
      messages.push({ role: 'user', content: toolResults });
    }
  }

  return { success: false, reason: 'max_iterations', iterations, sessionId };
}
```

### Approval policy

```tsx
const DEFAULT_POLICY = [
  { tool: 'comms.send_email', reason: 'Comunicação externa' },
  { tool: 'comms.send_whatsapp', reason: 'Comunicação externa' },
  { tool: 'docs.sign_document', reason: 'Documento legal' },
  { tool: 'billing.register_payment', reason: 'Movimento financeiro' },
  { tool: 'billing.create_invoice_moloni', condition: (i) => i.valor > 500, reason: 'Fatura > 500€' },
  { tool: 'v5.adjudicar_obra', condition: (i) => i.valor > 1000, reason: 'Adjudicação > 1000€' }
];
```

Policy vive em `core.agent_policies`, editável por admin da org.

---

## 9. Schemas SQL

### 9.1 Core — Multi-tenant + Audit

```sql
-- Organizações (tenants)
CREATE TABLE IF NOT EXISTS core.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('individual','condominio','empresa_admin_condo','empresa_comercial','prestador')),
  nif TEXT,
  morada TEXT,
  localidade TEXT,
  concelho TEXT,
  codigo_postal TEXT,
  parent_org_id UUID REFERENCES core.organizations(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_organizations_parent ON core.organizations(parent_org_id) WHERE parent_org_id IS NOT NULL;
CREATE INDEX idx_organizations_tipo ON core.organizations(tipo);

-- Memberships
CREATE TABLE IF NOT EXISTS core.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES core.pessoas(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','member','reader')),
  permissions JSONB DEFAULT '{}'::jsonb,
  convidado_por UUID REFERENCES core.pessoas(id),
  aceite_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (pessoa_id, organization_id)
);
CREATE INDEX idx_memberships_pessoa ON core.memberships(pessoa_id);
CREATE INDEX idx_memberships_org ON core.memberships(organization_id);

-- Audit log
CREATE TABLE IF NOT EXISTS core.agent_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES core.organizations(id) ON DELETE SET NULL,
  agent_name TEXT NOT NULL,
  session_id UUID,
  iteration INT,
  objective TEXT,
  stop_reason TEXT,
  content JSONB,
  tool_name TEXT,
  tool_input JSONB,
  tool_output JSONB,
  required_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES core.pessoas(id),
  approved_at TIMESTAMPTZ,
  rejected BOOLEAN DEFAULT false,
  rejection_reason TEXT,
  error TEXT,
  duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_org_time ON core.agent_audit_log(organization_id, created_at DESC);
CREATE INDEX idx_audit_agent_time ON core.agent_audit_log(agent_name, created_at DESC);
CREATE INDEX idx_audit_session ON core.agent_audit_log(session_id);

-- Policies
CREATE TABLE IF NOT EXISTS core.agent_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE UNIQUE,
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by UUID REFERENCES core.pessoas(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Drafts
CREATE TABLE IF NOT EXISTS core.drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  agent_session_id UUID,
  tipo TEXT NOT NULL CHECK (tipo IN ('email','whatsapp','sms','carta_registada','convocatoria','rfq','fatura','orcamento')),
  conteudo JSONB NOT NULL,
  estado TEXT DEFAULT 'pending' CHECK (estado IN ('pending','approved','rejected','sent')),
  aprovado_por UUID REFERENCES core.pessoas(id),
  aprovado_em TIMESTAMPTZ,
  enviado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_drafts_org_estado ON core.drafts(organization_id, estado);

-- Permissões dev (disable RLS)
GRANT USAGE ON SCHEMA core TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA core TO anon, authenticated;
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='core' LOOP
    EXECUTE format('ALTER TABLE core.%I DISABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;
```

### 9.2 V5 Casa (aplicar em Fase 3.1)

```sql
-- Adicionar organization_id às tabelas existentes
ALTER TABLE v5_manutencao.ordens_trabalho ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core.organizations(id);
ALTER TABLE v5_manutencao.prestadores ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core.organizations(id);
ALTER TABLE v5_manutencao.listas_cliente ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core.organizations(id);
ALTER TABLE v5_manutencao.cliente_moradas ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core.organizations(id);
ALTER TABLE v5_manutencao.perfis_fiscais ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core.organizations(id);

-- Origem para integração V2
ALTER TABLE v5_manutencao.ordens_trabalho ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'v5' CHECK (origem IN ('v5','v2_condo','api_externa'));
ALTER TABLE v5_manutencao.ordens_trabalho ADD COLUMN IF NOT EXISTS origem_ref UUID;

-- Localizações
CREATE TABLE IF NOT EXISTS v5_manutencao.localizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  imovel_id UUID REFERENCES core.imoveis(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'habitacao' CHECK (tipo IN ('habitacao','segunda_habitacao','condominio','empresa')),
  morada TEXT, localidade TEXT, concelho TEXT, codigo_postal TEXT,
  ano_construcao INT, tipologia TEXT, area_m2 NUMERIC(8,2),
  home_score INT DEFAULT 0 CHECK (home_score BETWEEN 0 AND 100),
  score_avac INT DEFAULT 0, score_canaliz INT DEFAULT 0, score_eletrica INT DEFAULT 0,
  score_estrutura INT DEFAULT 0, score_agua INT DEFAULT 0,
  score_cobertura INT DEFAULT 0, score_limpeza INT DEFAULT 0,
  assessment_completo BOOLEAN DEFAULT false, assessment_data DATE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Equipamentos
CREATE TABLE IF NOT EXISTS v5_manutencao.equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  localizacao_id UUID NOT NULL REFERENCES v5_manutencao.localizacoes(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL CHECK (categoria IN ('aquecimento','climatizacao','aguas_quentes','canalizacao','eletrica','cobertura','estrutura','piscina','solar','eletrodomestico','seguranca','outros')),
  nome TEXT NOT NULL, marca TEXT, modelo TEXT, numero_serie TEXT,
  localizacao_imovel TEXT,
  data_instalacao DATE, data_garantia_fim DATE,
  data_ultima_revisao DATE, data_proxima_revisao DATE,
  tecnico_habitual_id UUID REFERENCES v5_manutencao.prestadores(id) ON DELETE SET NULL,
  classe_energetica TEXT CHECK (classe_energetica IN ('A+++','A++','A+','A','B','C','D','E','F','G') OR classe_energetica IS NULL),
  potencia_kw NUMERIC(6,2), consumo_estimado_kwh_mes NUMERIC(8,2),
  eficiencia_estimada NUMERIC(5,2),
  health_score INT DEFAULT 50 CHECK (health_score BETWEEN 0 AND 100),
  estado TEXT DEFAULT 'ativo' CHECK (estado IN ('ativo','abatido','apagado')),
  notas TEXT, manual_url TEXT,
  dados_ia JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_equipamentos_loc ON v5_manutencao.equipamentos(localizacao_id);
CREATE INDEX idx_equipamentos_org ON v5_manutencao.equipamentos(organization_id);

-- Intervenções
CREATE TABLE IF NOT EXISTS v5_manutencao.intervencoes_equipamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id UUID NOT NULL REFERENCES v5_manutencao.equipamentos(id) ON DELETE CASCADE,
  ordem_id UUID REFERENCES v5_manutencao.ordens_trabalho(id) ON DELETE SET NULL,
  prestador_id UUID REFERENCES v5_manutencao.prestadores(id) ON DELETE SET NULL,
  tipo TEXT CHECK (tipo IN ('revisao','reparacao','substituicao','inspecao','instalacao')),
  descricao TEXT NOT NULL, data DATE NOT NULL,
  duracao_min INT, custo_total NUMERIC(10,2),
  pecas_usadas JSONB DEFAULT '[]'::jsonb,
  fotos_urls TEXT[], notas_tecnico TEXT, relatorio_pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Documentos
CREATE TABLE IF NOT EXISTS v5_manutencao.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  localizacao_id UUID REFERENCES v5_manutencao.localizacoes(id) ON DELETE CASCADE,
  equipamento_id UUID REFERENCES v5_manutencao.equipamentos(id) ON DELETE SET NULL,
  intervencao_id UUID REFERENCES v5_manutencao.intervencoes_equipamento(id) ON DELETE SET NULL,
  tipo TEXT CHECK (tipo IN ('fatura','garantia','contrato','relatorio','manual','foto','planta','outro')),
  nome TEXT NOT NULL, url TEXT NOT NULL, storage_path TEXT,
  mime_type TEXT, tamanho_bytes BIGINT,
  valido_ate DATE, valor_euros NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT doc_parent_check CHECK (localizacao_id IS NOT NULL OR equipamento_id IS NOT NULL)
);

-- Consumos energia
CREATE TABLE IF NOT EXISTS v5_manutencao.consumos_energia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id UUID NOT NULL REFERENCES v5_manutencao.equipamentos(id) ON DELETE CASCADE,
  ano INT NOT NULL, mes INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  kwh NUMERIC(10,2) NOT NULL, custo_estimado NUMERIC(10,2),
  fonte TEXT DEFAULT 'estimado' CHECK (fonte IN ('estimado','manual','ocr_fatura','smart_meter')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (equipamento_id, ano, mes)
);

-- RFQ
CREATE TABLE IF NOT EXISTS v5_manutencao.pedidos_orcamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES core.pessoas(id),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  localizacao_id UUID REFERENCES v5_manutencao.localizacoes(id),
  areas TEXT[] NOT NULL,
  descricao TEXT NOT NULL,
  fotos_urls TEXT[] DEFAULT '{}', video_url TEXT, orcamento_anterior_url TEXT,
  formatos TEXT[] NOT NULL,
  estado TEXT DEFAULT 'aberto' CHECK (estado IN ('aberto','em_cotacao','cotado','aceite','cancelado','expirado')),
  n_orcamentos_esperados INT,
  contacto_preferido TEXT DEFAULT 'app',
  data_limite TIMESTAMPTZ DEFAULT (now() + interval '72 hours'),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT areas_max_3 CHECK (array_length(areas, 1) <= 3)
);

CREATE TABLE IF NOT EXISTS v5_manutencao.orcamentos_recebidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES v5_manutencao.pedidos_orcamento(id) ON DELETE CASCADE,
  prestador_id UUID NOT NULL REFERENCES v5_manutencao.prestadores(id),
  formato TEXT NOT NULL,
  valor NUMERIC(10,2), descricao TEXT, anexo_pdf_url TEXT,
  data_disponivel DATE, validade_dias INT DEFAULT 30,
  estado TEXT DEFAULT 'enviado' CHECK (estado IN ('enviado','visto','aceite','rejeitado')),
  enviado_em TIMESTAMPTZ DEFAULT now()
);

-- AlertActions
CREATE TABLE IF NOT EXISTS v5_manutencao.alertas_inteligentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  pessoa_id UUID NOT NULL REFERENCES core.pessoas(id),
  localizacao_id UUID REFERENCES v5_manutencao.localizacoes(id),
  equipamento_id UUID REFERENCES v5_manutencao.equipamentos(id),
  tipo TEXT CHECK (tipo IN ('meteo','equipamento','eficiencia','manutencao','deteccao_ia')),
  nivel TEXT CHECK (nivel IN ('urgente','atencao','info','boas_noticias')),
  titulo TEXT NOT NULL, descricao TEXT NOT NULL,
  dados_tecnicos JSONB DEFAULT '{}',
  acoes JSONB DEFAULT '[]',
  estado TEXT DEFAULT 'ativo' CHECK (estado IN ('ativo','arquivado','resolvido')),
  gerado_por TEXT DEFAULT 'regra',
  expira_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alertas meteo (cache IPMA)
CREATE TABLE IF NOT EXISTS v5_manutencao.alertas_meteo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concelho TEXT NOT NULL, tipo TEXT NOT NULL,
  nivel TEXT CHECK (nivel IN ('amarelo','laranja','vermelho')),
  valor NUMERIC,
  data_inicio TIMESTAMPTZ NOT NULL, data_fim TIMESTAMPTZ NOT NULL,
  descricao TEXT, fetched_at TIMESTAMPTZ DEFAULT now()
);

-- Subscrições + gamificação
CREATE TABLE IF NOT EXISTS v5_manutencao.subscricoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES core.pessoas(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  plano TEXT NOT NULL CHECK (plano IN ('gratis','home_plus','home_pro','prestador_basico','prestador_pro')),
  preco_mensal NUMERIC(6,2) NOT NULL,
  estado TEXT DEFAULT 'ativo' CHECK (estado IN ('ativo','pausado','cancelado','trial')),
  trial_ate DATE,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_renovacao DATE, stripe_subscription_id TEXT,
  pontos_total INT DEFAULT 0,
  streak_dias INT DEFAULT 0, streak_recorde INT DEFAULT 0,
  nivel TEXT DEFAULT 'bronze' CHECK (nivel IN ('bronze','silver','gold','platinum','diamond')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v5_manutencao.creditos_mensais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscricao_id UUID NOT NULL REFERENCES v5_manutencao.subscricoes(id) ON DELETE CASCADE,
  ano INT NOT NULL, mes INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  gasto_servicos NUMERIC(10,2) DEFAULT 0,
  credito_ganho NUMERIC(10,2) DEFAULT 0,
  percent_credito NUMERIC(4,2) DEFAULT 10.00,
  subscricao_paga NUMERIC(10,2),
  UNIQUE (subscricao_id, ano, mes)
);

CREATE TABLE IF NOT EXISTS v5_manutencao.pontos_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES core.pessoas(id) ON DELETE CASCADE,
  pontos INT NOT NULL, motivo TEXT NOT NULL,
  ref_tipo TEXT, ref_id UUID,
  data TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v5_manutencao.missoes_utilizador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES core.pessoas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL, descricao TEXT,
  pontos INT NOT NULL, urgente BOOLEAN DEFAULT false,
  estado TEXT DEFAULT 'aberta' CHECK (estado IN ('aberta','concluida','expirada')),
  data_limite DATE, gerada_por TEXT DEFAULT 'seed',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v5_manutencao.categorias_landing (
  categoria TEXT PRIMARY KEY,
  titulo TEXT, subtitulo TEXT, descricao_longa TEXT,
  cor_hex TEXT, icon_emoji TEXT,
  faqs JSONB DEFAULT '[]',
  servicos_populares_ids UUID[]
);

-- Prestador modo
ALTER TABLE v5_manutencao.prestadores ADD COLUMN IF NOT EXISTS prestador_modo TEXT DEFAULT 'basico' CHECK (prestador_modo IN ('basico','pro'));
ALTER TABLE v5_manutencao.prestadores ADD COLUMN IF NOT EXISTS founding_professional BOOLEAN DEFAULT false;

-- Permissões dev
GRANT USAGE ON SCHEMA v5_manutencao TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA v5_manutencao TO anon, authenticated;
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='v5_manutencao' LOOP
    EXECUTE format('ALTER TABLE v5_manutencao.%I DISABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;
```

### 9.3 V10 Copilot (aplicar quando arrancar V10)

```sql
CREATE SCHEMA IF NOT EXISTS v10_copilot;

-- Snapshots V2 (ETL nightly)
CREATE TABLE IF NOT EXISTS v10_copilot.v2_snapshot_condominios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  v2_condominio_id TEXT NOT NULL,
  nome TEXT NOT NULL, morada TEXT, n_fraccoes INT, home_score INT,
  data JSONB, synced_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (v2_condominio_id)
);

CREATE TABLE IF NOT EXISTS v10_copilot.v2_snapshot_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_snapshot_id UUID REFERENCES v10_copilot.v2_snapshot_condominios(id) ON DELETE CASCADE,
  v2_quota_id TEXT NOT NULL,
  condomino_nome TEXT, fraccao TEXT,
  valor NUMERIC(10,2), vencimento DATE,
  paga BOOLEAN DEFAULT false, dias_atraso INT,
  data JSONB, synced_at TIMESTAMPTZ DEFAULT now()
);

-- Smart Inbox
CREATE TABLE IF NOT EXISTS v10_copilot.inbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email','whatsapp','portal','magic_link','qr_code')),
  from_identifier TEXT NOT NULL,
  from_pessoa_id UUID REFERENCES core.pessoas(id),
  subject TEXT, body TEXT,
  attachments JSONB DEFAULT '[]',
  categoria TEXT, urgencia TEXT DEFAULT 'normal' CHECK (urgencia IN ('urgente','normal','info')),
  estado TEXT DEFAULT 'pending' CHECK (estado IN ('pending','processed','replied','archived')),
  ai_summary TEXT, ai_draft_response TEXT, ai_session_id UUID,
  admin_approved BOOLEAN DEFAULT false,
  replied_at TIMESTAMPTZ, received_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_inbox_org_estado ON v10_copilot.inbox_messages(organization_id, estado, received_at DESC);

-- Compliance
CREATE TABLE IF NOT EXISTS v10_copilot.compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, descricao TEXT,
  periodicidade_meses INT, ultima_data DATE,
  proxima_data DATE NOT NULL,
  estado TEXT DEFAULT 'ok' CHECK (estado IN ('ok','warning','urgent','overdue','done')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_compliance_org_estado ON v10_copilot.compliance_items(organization_id, estado, proxima_data);

-- Action cards
CREATE TABLE IF NOT EXISTS v10_copilot.action_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('urgente','sugestao','insight')),
  icon TEXT, titulo TEXT NOT NULL, descricao TEXT NOT NULL,
  acoes JSONB DEFAULT '[]',
  ref_tipo TEXT, ref_id UUID,
  estado TEXT DEFAULT 'pending' CHECK (estado IN ('pending','dismissed','actioned')),
  agent_name TEXT, expira_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_action_cards_org ON v10_copilot.action_cards(organization_id, estado, created_at DESC);

GRANT USAGE ON SCHEMA v10_copilot TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA v10_copilot TO anon, authenticated;
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='v10_copilot' LOOP
    EXECUTE format('ALTER TABLE v10_copilot.%I DISABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;
```

---

## 10. Competitor Reference Library

### AppFolio Property Manager

**Destaque:** Realm-X Maintenance Performer (agentic AI mais maduro em propTech 2026)

**Extrair:**

- Agentic dispatcher (analisa foto → urgência → despacha) → V5 Matchmaker + V10 Dispatcher
- Auditing Center → `core.agent_audit_log` (obrigatório)
- Drag-and-drop calendar scheduler → Prestador Pro Desktop
- Custom invoices com pre-set rules → V5 Facturador agent

### MRI Property Management X

**Destaque:** Ask Agora (NL) + Agora Actions (agentic) + Page Assistant

**Extrair:**

- Ask Agora pattern → V2 Ask no V10 Copilot
- Favorite + Recent Questions UI → V10
- Agora Actions → V10 Copilot 4 agents
- Page Assistant → V10 + V5 Admin ERP
- Studio Suite (no-code dashboards) → Fase 7+

### [Shipshape.ai](http://Shipshape.ai)

**Extrair:** Home Health Score, Magic Image Analyzer, AlertActions humano, Pro Dashboard (técnico vê histórico antes de chegar)

### InstaService

**Extrair:** RFQ 4 passos + 3 formatos + landings por categoria + signup bonus + referral + sponsorship packages

### pinto-app

**Extrair:** streak + pontos + níveis + weekly missions + cross-sell seguros

### HomeTend + Hippo + OSCAR

- HomeTend: IPMA integration + AlertActions meteo
- Hippo: score-based insurance discount (V3 cross-sell)
- OSCAR: cross-sell denso (limitar a 1 banner/secção)

---

## 11. MCP Tools disponíveis no Claude Code

### File & code

`view`, `create_file`, `str_replace`, `bash_tool`

### Git (via bash)

`git status`, `git diff`, `git log`, `git commit`, `git push`. **Nunca** `git push --force`, nunca tocar em `main` sem confirmação.

### Supabase MCP

- `execute_sql` — correr SQL directo (one-off)
- `list_tables` — inspeccionar schemas
- `apply_migration` — migration formal
- `get_advisors` — problemas segurança/performance
- **Projecto V1 Core Hub:** `hkmvszkpxjbxmnixzqbl`
- **NUNCA tocar no V2:** `eozklslwfaqujaijvdnl`

### Notion MCP

`notion-fetch`, `notion-search`, `notion-create-pages`, `notion-update-page`

### Web

`web_search`, `web_fetch`

### Modelos recomendados

- `claude-sonnet-4-6` — default para 90% do trabalho (rápido, barato, excelente em código)
- `claude-opus-4-7` — para arquitectura complexa, refactors grandes, debugging difícil
- Mudar na sessão: `/model claude-sonnet-4-6`
- Default projecto: `~/.claude/settings.json` com `{"model": "claude-sonnet-4-6"}`

### Quando usar Supabase MCP vs ficheiro SQL

- Migration formal versionada → ficheiro em `apps/v5-manutencao/sql/NN_*.sql` + pedir ao Mário
- Query one-off → `execute_sql` directo
- Adicionar coluna existente → ficheiro SQL (versionado)

### Quando usar Notion MCP

- Actualizar ADR → `notion-update-page`
- Criar ADR novo → `notion-create-pages` parent = PropTech Platform
- Consultar decisão anterior → `notion-search` ou `notion-fetch`

---

## 12. Workflow — Chat vs Claude Code

### Chat ([claude.ai](http://claude.ai))

- Decisões arquitectónicas
- Criação/actualização de ADRs
- Actualização deste [MASTER.md](http://MASTER.md)
- Debug visual com screenshots
- Definição de agents novos + tools
- Propor layouts, paletas, UX
- Gerar protótipos HTML standalone
- **Output:** prompts concretos com referência a secções deste doc

### Claude Code (terminal VS Code)

- Toda a edição de código (qualquer tamanho)
- Scaffolding de componentes
- Migrations SQL
- Refactors
- Implementação das fases

**Regra de ouro:** se a resposta envolve "copia este código para o teu ficheiro", o trabalho devia estar no Claude Code.

### Quando actualizar este [MASTER.md](http://MASTER.md)

- Nova decisão arquitectónica → actualizar
- Fase completa → marcar em §1 Current state
- Novo agent planeado → adicionar em §7
- Novo competidor → adicionar em §10
- Contradição descoberta → resolver + documentar

---

## 13. First Tasks — começa já

### Prompt #1 (cola no terminal `claude` dentro de `apps/v5-manutencao/`)

```
Lê primeiro docs/MASTER.md completo.

Confirma que leste e lista as 3 tarefas que vou pedir nesta ordem.

Depois aguarda o meu OK explícito antes de arrancar.

Vamos fazer estas 3 tarefas sequencialmente com pausa para validação entre cada:

TAREFA A — Débito 3a.4 Wishlist submit agrupado
Consultar: § 5 Fase 0, tarefa 0.1
Implementar submitWishlist() em src/CWishlist.jsx seguindo o código-guia
Schema change: nenhum (usa ordens_trabalho existente + pontos_historico)
Test: submeter wishlist com 2 items de categorias diferentes → 2 ordens criadas
Commit: feat(v5): wishlist submit as grouped orders (3a.4)

TAREFA B — Admin BD read
Consultar: § 5 Fase 0, tarefa 0.2
Localizar painel admin e substituir SVCS seed por fetch a catalogo_servicos
Commit: chore(v5-admin): read services from BD

TAREFA C — Schema multi-tenant Core
Consultar: § 5 Fase 0 tarefa 0.3 + § 9.1 schema completo
Criar apps/v5-manutencao/sql/01_core_multitenant.sql
Aplicar via Supabase MCP se disponível, senão pedir-me para correr no Studio
Adicionar organization_id (nullable) às tabelas v5_manutencao existentes
Commit: feat(core): multi-tenant foundations

Regras:
- 1 commit por tarefa
- Testar npm run dev no fim de cada
- // TODO(mario): para ambiguidades
- Parar e perguntar antes de passar à seguinte
- Nunca tocar em V2 (prataowners.pt)
- Nunca git push --force

Começa por listar as 3 tarefas + confirmar que leste o MASTER.md.
```

### Prompt #2 (depois das 3 tarefas acima)

```
Perfeito. Agora Fase 3.1 do V5.

Consulta: § 5 Fase 3.1 + § 9.2 schema V5 Casa completo.

Cria apps/v5-manutencao/sql/02_v5_casa_schema.sql com todo o schema § 9.2.
Aplica-o.
Cria seed demo (1 localização + 4 equipamentos + 3 missões + 2 alertas).

Valida que as tabelas foram criadas com SELECT count(*) em cada.

Commit: feat(v5-casa): schema + seed for Phase 3

Aguarda meu OK antes de arrancar Fase 3.2 (BNav + ecrãs base).
```

### Prompt #3 (Fase 3.2)

```
Fase 3.2 V5 — BNav novo + ecrãs base.

Consulta: § 5 Fase 3.2.

Antes de qualquer código, lista que ficheiros vais criar/alterar e confirma comigo.

Componentes novos (em apps/v5-manutencao/src/):
- IniciaScreen.jsx
- ServicosScreen.jsx (com categoria "Orçamentos à medida" roxo)
- CasaScreen.jsx (hero score + 5 categorias + quick actions + lista equipamentos)
- PedidosScreen.jsx (3 tabs)
- PerfilSheet.jsx (via avatar)
- SubscricaoScreen.jsx

Helpers:
- src/lib/subscription.js
- src/lib/gamification.js

Refactor de BNav: Início · Serviços · FAB · Casa · Pedidos.
Perfil migra para avatar top-right (abre PerfilSheet).

Paleta V5: #1B4332 / #52B788 / #D8F3DC. Orçamentos à medida: #534AB7. Gamificação: #D4A72C.

Referências visuais em apps/v5-manutencao/reference/ (v5-nova-estrutura.html, v5-orcamentos-medida.html, v5-home-enriquecida.html).

Commit: feat(v5-casa): new BNav + Início + Casa + Perfil sheet

Aguarda meu OK entre componentes para eu validar visualmente.
```

---

## 14. Checklist antes de arrancar

- [ ]  Descarregar este [MASTER.md](http://MASTER.md) (export Notion) para `apps/v5-manutencao/docs/MASTER.md`
- [ ]  Copiar também para `docs/MASTER.md` na raiz do repo
- [ ]  Descarregar HTMLs de referência desta sessão para `apps/v5-manutencao/reference/`:
    - `v5-nova-estrutura.html`
    - `v5-orcamentos-medida.html`
    - `v5-home-enriquecida.html`
    - `v5-signup-prestador-marketing.html`
    - `v5-suite-completa.html`
    - `v2-ai-first.html`
- [ ]  Verificar `.env.local` tem `VITE_ANTHROPIC_API_KEY`
- [ ]  Git status limpo (commit qualquer WIP)
- [ ]  Abrir terminal no VS Code dentro de `apps/v5-manutencao/`
- [ ]  Correr `claude --model claude-sonnet-4-6` (ou configurar default)
- [ ]  Colar Prompt #1 da secção §13
- [ ]  Validar confirmação antes de dar go

---

## 15. Apêndice — links Notion (para o chat, não Claude Code)

- [🧠 MASTER PLAN hub](https://www.notion.so/MASTER-PLAN-Agentic-AI-First-Platform-Abr-2026-34c84147fa6081308a95d642b04b7798?pvs=21)
- [🧱 Fundações Agentic](https://www.notion.so/Funda-es-Agentic-Multi-tenant-Tool-Use-Audit-34c84147fa6081fd947bc6ddc540a429?pvs=21)
- [🤖 V10 Copilot](https://www.notion.so/V10-Copilot-Agentic-AI-para-Condom-nios-34c84147fa6081bda460f2a2c4fea0c4?pvs=21)
- [🔧 V5 Roadmap](https://www.notion.so/V5-Manuten-o-Roadmap-8-Fases-34c84147fa608165acd9e728912ae242?pvs=21)
- [🎯 Competidores](https://www.notion.so/An-lise-Competidores-PropTech-AI-34c84147fa60817ba602c03201873e31?pvs=21)
- [📅 Execução 12 meses](https://www.notion.so/Execu-o-Roadmap-12-meses-Arranque-34c84147fa6081f3b05dcb19eb18f320?pvs=21)
- [🗜️ Referência Canónica](https://www.notion.so/Refer-ncia-Can-nica-da-Plataforma-34884147fa6081ab9419f4119c657e0c?pvs=21)
- [🏗️ PropTech Platform](https://www.notion.so/PropTech-Platform-Vis-o-Arquitectura-34084147fa60813d94fed7f72d47d8bd?pvs=21)

---

**Fim do documento. Última linha: 24 Abril 2026.**