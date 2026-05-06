# V5 — Instruções para Claude Code

## Contexto e estado atual

Estás a trabalhar no `apps/v5-manutencao/` da plataforma PropTech. O estado atual (commit `028fc26`) é:

- **Vista Cliente** com `CHome` completo: hero verde "A sua equipa, sempre a mesma", grid de 8 categorias, carrossel de equipa, bottom nav `Início · Explorar · Personalizado (FAB) · Pedidos · Perfil`
- **Vista Prestador** (`PDash`) e **Vista Gestor** (`GDash`) funcionais
- **RoleBar** no topo como bypass de login em DEV
- **Fluxo Canalização 2b-A concluído**: list/variant/detail screens, catálogo de 177 serviços migrado, bundles com `fetchCategoryFull`, `addCatalogOrder` ligado a `CHome`
- **Supabase V1 Core Hub** (`hkmvszkpxjbxmnixzqbl`), schema `v5_manutencao`, RLS disabled em DEV

**Decisões já tomadas** (confirmadas pelo Mário antes da fase 2b-B):
1. `deepPriceForBundle` → **hardcoded** em constantes nomeadas para a fase 2c. Não adicionar 6º fetch ao `fetchCategoryFull`.
2. `products_extra_price` → **usar os 4 rows existentes em `servico_extras` (ext-prod-cln-*)**. Ajustar `OptionsSection` para ler de `servico_extras` com join secundário. Não adicionar coluna em `servicos`.

**Instruções pendentes em curso** (Fase 2b-B): `PersonalizadoLanding + PersonalizadoForm + FinalizarPedido + ConfirmadoScreen`, tudo com prefixo `V2`. **Termina essa fase primeiro**. Esta nova fase é **Fase 3 — Módulo Casa**, a implementar **depois** da 2b-B.

---

## Fase 3 — Módulo Casa (novo trabalho)

### Visão geral

Adicionar à V5 um novo módulo "Casa" que transforma a app de agregador de serviços pontuais em **plataforma de gestão de equipamentos** com:

- Registo persistente de equipamentos por localização (caldeira, AC, esquentador, telhado, painel solar, etc.)
- **Home Score 0-100** com 5 categorias (AVAC, Canalização, Elétrica, Estrutura, Água)
- Ficha de equipamento com 4 tabs: **Detalhes · Intervenções · Documentos · Fornecedor**
- Cofre de documentos por equipamento (garantias, faturas, contratos, manuais)
- Consumos energéticos com calculadora de poupança por substituição
- Alertas meteorológicos via **API IPMA** (api.ipma.pt) ligados a sugestões de manutenção
- **Câmara IA** — foto do equipamento → Claude API identifica marca/modelo/ano/classe
- **AI Expert** — chat com contexto completo da casa e dos manuais
- Suporte multi-localização (habitação, condomínio, empresa)

### Protótipo visual de referência

Existe um ficheiro HTML standalone com **12 ecrãs navegáveis** que representa o design final acordado:
- `apps/v5-manutencao/reference/v5-preview.html` (copiar do output do Mário)

**Não inventes UI nova. Replica exatamente os ecrãs do protótipo.** Paleta, tipografia, espaçamento, componentes já estão resolvidos lá.

### Integração no BNav atual — Opção A confirmada

Substituir tab **"Explorar"** por **"Casa"** no `BNav`:

```
Antes:  Início · Explorar · FAB(Personalizado) · Pedidos · Perfil
Depois: Início · Casa · FAB(Personalizado) · Pedidos · Perfil
```

Em `App.jsx`, adicionar `tab === 'casa' && <CasaScreen .../>` ao bloco `role === 'cliente'`.

---

## Plano faseado

Divide este trabalho em **5 fases sequenciais**. Para cada fase: commit próprio com prefixo `feat(v5-casa)` e mensagem descritiva. **Pára no fim de cada fase para eu validar.**

### Fase 3.1 — Schema + dados base
### Fase 3.2 — BNav + CasaScreen + navegação
### Fase 3.3 — Ficha equipamento com 4 tabs + edição
### Fase 3.4 — Documentos + Energia
### Fase 3.5 — Câmara IA + AI Expert + IPMA

---

## FASE 3.1 — Schema Supabase (começa aqui)

Cria ficheiro `apps/v5-manutencao/sql/v5_casa_schema.sql` com o schema abaixo. Aplica via Supabase MCP ou indica ao Mário para correr no SQL Editor.

```sql
-- ═══════════════════════════════════════════════════════════════
-- V5 CASA — Módulo de gestão de equipamentos
-- Schema: v5_manutencao (existente)
-- ═══════════════════════════════════════════════════════════════

-- ── LOCALIZAÇÕES ──
CREATE TABLE IF NOT EXISTS v5_manutencao.localizacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id       UUID REFERENCES core.pessoas(id) ON DELETE CASCADE,
  imovel_id       UUID REFERENCES core.imoveis(id) ON DELETE SET NULL,
  nome            TEXT NOT NULL,                           -- "Casa Principal", "Apartamento Porto"
  tipo            TEXT NOT NULL DEFAULT 'habitacao'
    CHECK (tipo IN ('habitacao','condominio','empresa','segunda_habitacao')),
  morada          TEXT,
  localidade      TEXT,
  concelho        TEXT,                                    -- para IPMA (ex: "Coimbra")
  codigo_postal   TEXT,
  ano_construcao  INT,
  tipologia       TEXT,                                    -- T1, T2, T3...
  area_m2         NUMERIC(8,2),
  notas           TEXT,
  home_score      INT DEFAULT 0 CHECK (home_score BETWEEN 0 AND 100),
  score_avac      INT DEFAULT 0,
  score_canaliz   INT DEFAULT 0,
  score_eletrica  INT DEFAULT 0,
  score_estrutura INT DEFAULT 0,
  score_agua      INT DEFAULT 0,
  ativo           BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_localizacoes_pessoa ON v5_manutencao.localizacoes(pessoa_id);

-- ── EQUIPAMENTOS ──
CREATE TABLE IF NOT EXISTS v5_manutencao.equipamentos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  localizacao_id    UUID NOT NULL REFERENCES v5_manutencao.localizacoes(id) ON DELETE CASCADE,
  categoria         TEXT NOT NULL CHECK (categoria IN (
    'aquecimento','climatizacao','aguas_quentes','canalizacao','eletrica',
    'cobertura','estrutura','piscina','solar','elevador','gerador','outros'
  )),
  nome              TEXT NOT NULL,                          -- "Caldeira Junkers ZWC 24"
  marca             TEXT,
  modelo            TEXT,
  numero_serie      TEXT,
  localizacao_imovel TEXT,                                  -- "Rés-do-chão", "Lavandaria"
  data_instalacao   DATE,
  data_garantia_fim DATE,
  data_ultima_revisao DATE,
  data_proxima_revisao DATE,
  tecnico_habitual_id UUID REFERENCES v5_manutencao.prestadores(id) ON DELETE SET NULL,
  classe_energetica TEXT CHECK (classe_energetica IN ('A+++','A++','A+','A','B','C','D','E','F','G') OR classe_energetica IS NULL),
  potencia_kw       NUMERIC(6,2),
  consumo_estimado_kwh_mes NUMERIC(8,2),                    -- estimado pela IA/manual
  eficiencia_estimada NUMERIC(5,2),                         -- 0-100 %
  health_score      INT DEFAULT 50 CHECK (health_score BETWEEN 0 AND 100),
  estado            TEXT DEFAULT 'ativo' CHECK (estado IN ('ativo','abatido','apagado')),
  notas             TEXT,
  manual_url        TEXT,                                   -- link direto se encontrado
  dados_ia          JSONB DEFAULT '{}'::jsonb,              -- dados extraídos pela câmara
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_equipamentos_loc ON v5_manutencao.equipamentos(localizacao_id);
CREATE INDEX idx_equipamentos_cat ON v5_manutencao.equipamentos(categoria);
CREATE INDEX idx_equipamentos_estado ON v5_manutencao.equipamentos(estado);

-- ── INTERVENÇÕES (ligadas a equipamento) ──
CREATE TABLE IF NOT EXISTS v5_manutencao.intervencoes_equipamento (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id  UUID NOT NULL REFERENCES v5_manutencao.equipamentos(id) ON DELETE CASCADE,
  ordem_id        UUID REFERENCES v5_manutencao.ordens_trabalho(id) ON DELETE SET NULL,
  prestador_id    UUID REFERENCES v5_manutencao.prestadores(id) ON DELETE SET NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('revisao','reparacao','substituicao','inspecao','instalacao')),
  descricao       TEXT NOT NULL,
  data            DATE NOT NULL,
  duracao_min     INT,
  custo_total     NUMERIC(10,2),
  pecas_usadas    JSONB DEFAULT '[]'::jsonb,                -- [{nome, ref, qtd, custo}]
  fotos_urls      TEXT[],
  notas_tecnico   TEXT,                                     -- para próxima visita
  relatorio_pdf_url TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_interv_eq ON v5_manutencao.intervencoes_equipamento(equipamento_id, data DESC);

-- ── DOCUMENTOS ──
CREATE TABLE IF NOT EXISTS v5_manutencao.documentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  localizacao_id  UUID REFERENCES v5_manutencao.localizacoes(id) ON DELETE CASCADE,
  equipamento_id  UUID REFERENCES v5_manutencao.equipamentos(id) ON DELETE SET NULL,
  intervencao_id  UUID REFERENCES v5_manutencao.intervencoes_equipamento(id) ON DELETE SET NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN (
    'fatura','garantia','contrato','relatorio','manual','foto','planta','outro'
  )),
  nome            TEXT NOT NULL,
  descricao       TEXT,
  url             TEXT NOT NULL,                            -- Supabase Storage
  storage_path    TEXT,
  mime_type       TEXT,
  tamanho_bytes   BIGINT,
  valido_ate      DATE,                                     -- garantias, contratos
  valor_euros     NUMERIC(10,2),                            -- faturas
  created_at      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT doc_parent_check CHECK (
    localizacao_id IS NOT NULL OR equipamento_id IS NOT NULL
  )
);
CREATE INDEX idx_docs_eq ON v5_manutencao.documentos(equipamento_id);
CREATE INDEX idx_docs_loc ON v5_manutencao.documentos(localizacao_id);

-- ── CONSUMOS ENERGÉTICOS (histórico mensal) ──
CREATE TABLE IF NOT EXISTS v5_manutencao.consumos_energia (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id  UUID NOT NULL REFERENCES v5_manutencao.equipamentos(id) ON DELETE CASCADE,
  ano             INT NOT NULL,
  mes             INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  kwh             NUMERIC(10,2) NOT NULL,
  custo_estimado  NUMERIC(10,2),
  fonte           TEXT DEFAULT 'estimado' CHECK (fonte IN ('estimado','manual','ocr_fatura','smart_meter')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (equipamento_id, ano, mes)
);
CREATE INDEX idx_consumos_eq ON v5_manutencao.consumos_energia(equipamento_id, ano DESC, mes DESC);

-- ── ALERTAS METEO (cache de avisos IPMA por concelho) ──
CREATE TABLE IF NOT EXISTS v5_manutencao.alertas_meteo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concelho        TEXT NOT NULL,
  tipo            TEXT NOT NULL,                            -- 'chuva_intensa','frio','calor','vento'
  nivel           TEXT CHECK (nivel IN ('amarelo','laranja','vermelho')),
  valor           NUMERIC,                                  -- mm chuva, °C, km/h
  data_inicio     TIMESTAMPTZ NOT NULL,
  data_fim        TIMESTAMPTZ NOT NULL,
  descricao       TEXT,
  fetched_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_meteo_concelho ON v5_manutencao.alertas_meteo(concelho, data_inicio DESC);

-- ── PERMISSÕES (DEV: RLS disabled) ──
GRANT USAGE ON SCHEMA v5_manutencao TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA v5_manutencao TO anon, authenticated;

ALTER TABLE v5_manutencao.localizacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE v5_manutencao.equipamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE v5_manutencao.intervencoes_equipamento DISABLE ROW LEVEL SECURITY;
ALTER TABLE v5_manutencao.documentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE v5_manutencao.consumos_energia DISABLE ROW LEVEL SECURITY;
ALTER TABLE v5_manutencao.alertas_meteo DISABLE ROW LEVEL SECURITY;
```

### Seed de demo (mesmo ficheiro)

Adiciona no final do SQL:

```sql
-- ── SEED DEMO ──
-- Localização demo para o primeiro cliente
INSERT INTO v5_manutencao.localizacoes
  (nome, tipo, morada, localidade, concelho, ano_construcao, tipologia, area_m2, home_score,
   score_avac, score_canaliz, score_eletrica, score_estrutura, score_agua)
VALUES
  ('Casa Principal', 'habitacao', 'R. da Saudade, 12', 'Coimbra', 'Coimbra',
   2005, 'T3', 120, 74, 82, 91, 70, 60, 88);

-- Equipamentos demo (4)
WITH loc AS (SELECT id FROM v5_manutencao.localizacoes WHERE nome='Casa Principal' LIMIT 1)
INSERT INTO v5_manutencao.equipamentos
  (localizacao_id, categoria, nome, marca, modelo, localizacao_imovel,
   data_instalacao, data_garantia_fim, data_ultima_revisao, classe_energetica,
   potencia_kw, consumo_estimado_kwh_mes, eficiencia_estimada, health_score)
SELECT loc.id, 'aquecimento', 'Caldeira Junkers ZWC 24', 'Junkers', 'ZWC 24-2 DH', 'Rés-do-chão',
       '2016-03-15', '2021-06-15', '2023-11-14', 'B', 24, 213, 82, 52 FROM loc
UNION ALL
SELECT loc.id, 'climatizacao', 'AC Daikin FTXC25', 'Daikin', 'FTXC25', 'Sala',
       '2022-06-20', '2027-06-20', '2023-08-10', 'A++', 2.5, 26, 94, 88 FROM loc
UNION ALL
SELECT loc.id, 'aguas_quentes', 'Esquentador Vulcano 14L', 'Vulcano', 'ClickTronic 14', 'Cozinha',
       '2019-04-10', '2024-04-10', NULL, 'A', 23, 40, 88, 80 FROM loc
UNION ALL
SELECT loc.id, 'cobertura', 'Telhado / Impermeabilização', NULL, NULL, 'Cobertura exterior',
       NULL, NULL, NULL, NULL, NULL, 0, NULL, 38 FROM loc;
```

**No fim da Fase 3.1:** confirma ao Mário que o schema foi aplicado e mostra output de `SELECT count(*) FROM v5_manutencao.localizacoes, v5_manutencao.equipamentos`.

---

## FASE 3.2 — BNav + CasaScreen

### 3.2.1 Modificar `BNav`

Localiza o componente `BNav` em `App.jsx`. Atualmente tem 5 tabs. **Substitui `explorar` por `casa`**. O icon novo é `house`. Mantém o FAB Personalizado no meio.

### 3.2.2 Criar `CasaScreen`

Novo ficheiro `src/CasaScreen.jsx`. Props: `{ pessoaId, onNavigate }`. Usa o protótipo `v5-preview.html` como referência visual exata (ecrã "Módulo Casa").

Estrutura:
1. Hero verde com Home Score grande + 5 mini-barras de categorias à direita
2. Row de 4 quick actions: Câmara IA / Locais / Docs / Energia
3. Alerta meteo IPMA (se houver — na Fase 3.5 virá do Supabase; nesta fase usa mock)
4. Lista de equipamentos (fetch `v5_manutencao.equipamentos` WHERE `localizacao_id = <default>` AND `estado = 'ativo'`)
5. 2 cards de "Poupanças identificadas" (mock nesta fase)

Paleta: mantém verde `#1B4332` / `#52B788` / `#D8F3DC` do V5 atual.

### 3.2.3 Fetch no `App.jsx`

Adiciona ao `useEffect` principal:
```js
supa.schema('v5_manutencao').from('localizacoes').select('*').eq('ativo', true),
supa.schema('v5_manutencao').from('equipamentos').select('*').eq('estado', 'ativo'),
```

Passa `localizacoes` e `equipamentos` como props para `CasaScreen`.

### 3.2.4 Routing

Em `App.jsx`, no bloco `role === 'cliente'`:
```jsx
{tab === 'casa' && <CasaScreen
  localizacoes={localizacoes}
  equipamentos={equipamentos}
  onNavigate={(target) => setTab(target)}
/>}
```

Para sub-ecrãs (ficha, docs, energia), usa estado local `subView` em `CasaScreen`. **Não acrescentes rotas novas ao `BNav`** — tudo se navega dentro do tab "Casa".

**No fim da Fase 3.2:** commit `feat(v5-casa): add CasaScreen + BNav integration`. Pára para validação.

---

## FASE 3.3 — Ficha equipamento (4 tabs + edição)

Cria `src/EquipamentoFicha.jsx`. Props: `{ equipamento, intervencoes, documentos, onBack, onUpdate, onDelete }`.

### Tabs (exatamente como no protótipo)

**Tab 1 — Detalhes**
- Grid 2x4 de metadados (instalação, garantia, última revisão, técnico habitual, consumo/mês, health score, classe energética, potência)
- Card âmbar com "Recomendação IA" (texto gerado com base em idade + eficiência)
- 2 botões: "Agendar revisão" (navega para fluxo de orçamento existente) / "Perguntar IA" (abre AI Expert na Fase 3.5)

**Tab 2 — Intervenções**
- Timeline vertical a partir de `intervencoes_equipamento` WHERE `equipamento_id = X` ORDER BY `data DESC`
- Cada item: dot (verde se < 6 meses, cinza se mais antigo) + data + descrição + técnico + custo + tags de documentos associados
- Botão "Registar nova intervenção" (abre modal simples nesta fase)

**Tab 3 — Documentos**
- Lista a partir de `documentos` WHERE `equipamento_id = X`
- Ícone por tipo (fatura → 🧾 azul, garantia → 🛡️ verde, contrato → 📄 âmbar, relatório → 📋 vermelho, manual → 📘 roxo)
- Botão "+ Adicionar documento" (upload via Supabase Storage — implementar na Fase 3.4)

**Tab 4 — Fornecedor**
- 3 cards: Fabricante / Instalador/Técnico habitual / Peças compatíveis
- Dados vêm de `equipamentos.marca`, `equipamentos.modelo`, `prestadores` via `tecnico_habitual_id`
- Peças compatíveis: nesta fase, array estático por marca conhecida (Junkers, Daikin, Vulcano). Futuro: tabela `pecas_catalogo`.

### Modo edição

Botão "✎ Editar" no header alterna para forma editável dos metadados. Quando ativo:
- Campos transformam-se em `<input>`
- Mostra seletor de classe energética (A+++ a D) com cores
- Adiciona secção "Ações de gestão" com 2 botões:
  - **Abater** (âmbar) — UPDATE `estado = 'abatido'`. Mantém histórico, some da lista principal.
  - **Apagar** (vermelho) — DELETE. Pede confirmação em modal bottom-sheet.
- Botão muda para "✓ Guardar" que faz UPDATE via Supabase

**No fim da Fase 3.3:** commit `feat(v5-casa): add equipment detail with 4 tabs, edit + delete`. Pára.

---

## FASE 3.4 — Documentos (cofre) + Energia

### DocsScreen (cofre por localização)

Cria `src/DocsScreen.jsx`. Fetch `v5_manutencao.documentos` WHERE `localizacao_id = X` (sem filtro por equipamento — é o cofre geral).

- Filtros por tipo em chips horizontais
- Search bar (filtra client-side por `nome` ILIKE)
- Upload para Supabase Storage, bucket `v5-casa-docs`. Estrutura de paths: `{pessoa_id}/{localizacao_id}/{tipo}/{filename}`
- Implementa `uploadDocumento(file, tipo, equipamentoId?)` em `src/lib/docs.js`

### EnergiaScreen

Cria `src/EnergiaScreen.jsx`. Fetch `consumos_energia` agregado por mês.

- Lista equipamentos com barra colorida + kWh/€/percentagem do total
- Cálculo de poupança em card verde: compara `consumo_estimado_kwh_mes` atual com hipotético modelo A-rated (-30%)
- Botão "Pedir orçamento substituição" — cria `ordem_trabalho` com `tipo = 'substituicao'` e `equipamento_ref`

### Bucket Storage

Cria no Supabase (via MCP ou manualmente):
```sql
-- Instruir o Mário: Supabase Dashboard → Storage → New bucket
-- Nome: v5-casa-docs, Public: false, File size limit: 50MB
```

Adiciona RLS do bucket para DEV:
```sql
-- Permissões básicas para DEV
CREATE POLICY "dev_all_v5_casa_docs" ON storage.objects
  FOR ALL TO anon, authenticated
  USING (bucket_id = 'v5-casa-docs')
  WITH CHECK (bucket_id = 'v5-casa-docs');
```

**No fim da Fase 3.4:** commit `feat(v5-casa): add docs vault + energy consumption screens`. Pára.

---

## FASE 3.5 — IA + Meteorologia

### 3.5.1 IPMA — Serviço meteorológico

Cria `src/lib/ipma.js`:

```js
const IPMA_BASE = 'https://api.ipma.pt/open-data/forecast/meteorology/cities/daily';

// Mapa concelho → ID IPMA
export const IPMA_LOCALS = {
  'Coimbra': 1060300,
  'Lisboa': 1110600,
  'Porto': 1131200,
  // ... adicionar concelhos mais relevantes
};

export async function fetchPrevisao(concelho) {
  const id = IPMA_LOCALS[concelho];
  if (!id) return null;
  const r = await fetch(`${IPMA_BASE}/${id}.json`);
  const j = await r.json();
  return j.data; // array de 5 dias
}

export function gerarAlertasManutencao(previsao) {
  // Regras: >20mm chuva → caleiras; <5°C → caldeira; >35°C → AC; avisos laranja/vermelho → crítico
  // Retorna [{tipo, nivel, descricao, data}]
}
```

Chama `fetchPrevisao` no `useEffect` de `CasaScreen` quando `localizacao.concelho` existe. Cache no Supabase `alertas_meteo` com TTL de 12h.

### 3.5.2 Câmara IA — Identificação de equipamento

Cria `src/CameraScreen.jsx` e `src/lib/equipmentAI.js`.

**Fluxo:**
1. User aponta câmara → `getUserMedia({ video: { facingMode: 'environment' } })`
2. Captura frame → converte para base64
3. Envia para Claude API (sonnet) com prompt estruturado:

```js
const prompt = `Analisa esta imagem de um equipamento doméstico (caldeira, AC, esquentador, etc.).
Extrai: marca, modelo, número de série (se visível), classe energética (se visível), ano estimado,
tipo de combustível, potência nominal.

Responde APENAS em JSON:
{
  "categoria": "aquecimento"|"climatizacao"|"aguas_quentes"|"...",
  "marca": "...",
  "modelo": "...",
  "numero_serie": "..." ou null,
  "classe_energetica": "A"|"B"|... ou null,
  "ano_estimado": 2016 ou null,
  "potencia_kw": 24 ou null,
  "eficiencia_estimada": 82 ou null,
  "confianca": 0-100,
  "notas_tecnicas": "..."
}`;
```

4. Parse resposta → mostra ecrã de resultado com Health Score por categoria
5. Botão "Guardar equipamento" → INSERT `equipamentos` com `dados_ia` preenchido

**Chave API:** usa `VITE_ANTHROPIC_API_KEY` de `.env.local`. Se não existir, pede ao Mário para adicionar antes de testar.

### 3.5.3 AI Expert — Chat com contexto

Cria `src/AIExpertScreen.jsx`. Sistema prompt base:

```js
const systemPrompt = `És o AI Expert de manutenção doméstica do utilizador.
Tens acesso aos seguintes dados:
- Localização: ${loc.nome} (${loc.concelho}, construção ${loc.ano_construcao})
- Home Score: ${loc.home_score}/100
- Equipamentos: ${JSON.stringify(equipamentos, null, 2)}
- Histórico de intervenções dos últimos 12 meses: ${JSON.stringify(recentIntervencoes)}
- Consumo energético: ${totalKwh} kWh/mês (${totalEur}€)
- Previsão meteo 5 dias: ${JSON.stringify(previsao)}

Respondes em português de Portugal, conciso, com dados concretos.
Quando sugeres ações, usa os dados reais dos manuais dos equipamentos identificados.
Para dúvidas sobre um equipamento específico, referencias o modelo.`;
```

Chips de sugestão iniciais:
- "Caleiras antes da chuva?" (só mostrar se alerta de chuva ativo)
- "Vale trocar a caldeira?" (só se equipamento com eficiência < 85%)
- "Como reduzo o consumo do AC?"
- "Ver manual de [equipamento mais recente]"

**No fim da Fase 3.5:** commit `feat(v5-casa): add IPMA weather + Camera AI + AI Expert chat`. Pára.

---

## Regras transversais

### Convenções de código
- Usa o padrão existente do `App.jsx`: paleta `C = {...}`, componentes funcionais, hooks `useState/useEffect`
- Todos os fetches passam por `supa.schema('v5_manutencao')` (não alterar o client existente)
- Não uses libraries novas sem perguntar. Usa apenas o que já está em `package.json`

### Commits
- 1 commit por fase, mensagem no formato `feat(v5-casa): <descrição curta>`
- Corpo da mensagem com bullet points do que foi feito
- **Não faças push sem confirmação do Mário**

### O que NÃO fazer
- Não alterar `CHome`, `PDash`, `GDash` existentes (exceto para ligar ao novo `tab === 'casa'`)
- Não tocar no schema existente de `v5_manutencao.catalogo_servicos`, `prestadores`, `ordens_trabalho`, `servico_extras`
- Não quebrar o fluxo de canalização que acabaste de construir (2b-A)
- Não inventar UI fora do que está em `v5-preview.html` — se tiveres dúvida, pergunta
- Não completes a Fase 3 sem terminares primeiro a Fase 2b-B já em curso

### Testes manuais
No fim de cada fase, testa:
1. `npm run dev` arranca sem erros
2. Navegar para `/` → RoleBar aparece → Cliente selecionado
3. Tab "Casa" aparece no BNav
4. Clicar "Casa" → `CasaScreen` renderiza com dados do Supabase
5. Abrir DevTools → Network → sem 4xx/5xx
6. Sem warnings novos no console

### Quando ficares bloqueado
Se encontrares ambiguidade (ex: "onde guardar a chave da API Anthropic?"), **não assumas** — pára, documenta a dúvida em comentário no código com `// TODO(mario):` e pergunta no próximo check-in. Exemplo:
```js
// TODO(mario): VITE_ANTHROPIC_API_KEY não está em .env.local. Confirmar se devo
// adicionar ou se já existe noutro sítio (Supabase edge function?)
```

---

## Resumo da ordem de execução

1. **Termina a Fase 2b-B em curso** (PersonalizadoLanding + Form + Finalizar + Confirmado, prefixo V2)
2. Só depois → **Fase 3.1** (Schema SQL) → pára
3. **Fase 3.2** (BNav + CasaScreen) → pára
4. **Fase 3.3** (Ficha com 4 tabs) → pára
5. **Fase 3.4** (Docs + Energia) → pára
6. **Fase 3.5** (IPMA + Câmara + AI) → pára

Entre cada fase, o Mário valida visualmente e dá luz verde para a próxima.

**Começa por confirmar que leste isto todo e lista as 5 fases numeradas antes de tocar em qualquer ficheiro.**
