# V5 Manutenção — Contexto Completo para Redesign UI

> **Propósito:** Este documento descreve toda a estrutura, design system, componentes e lógica da app V5 Manutenção.
> O objectivo é redesenhar o UI (visuais, cores, fontes, layout) **sem alterar a lógica de negócio**.
> Tudo o que está marcado como **[LÓGICA — NÃO ALTERAR]** deve ser preservado exactamente.
> Tudo o que está marcado como **[UI — REDESENHAR]** pode e deve ser substituído.

---

## 1. Identidade do produto

- **Nome:** V5 Manutenção (codename futuro: "Zelo")
- **Tagline:** "A tua casa cuidada"
- **Tipo:** App mobile-first (SPA) para serviços de manutenção e limpeza doméstica em Portugal
- **Utilizadores:** clientes (donos de imóveis) + prestadores (técnicos) + staff (admin)
- **Idioma:** Português de Portugal

---

## 2. Stack técnica [LÓGICA — NÃO ALTERAR]

```
React 18 + Vite 5
Supabase JS SDK v2.45 (auth + BD + storage + edge functions)
lucide-react (ícones)
dompurify + marked (sanitização de markdown)
Sem router externo — navegação por estado (ecra)
Sem CSS externo — estilos 100% inline via style={{}}
Sem Tailwind
```

### Dependências exactas (package.json)
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "dompurify": "^3.4.1",
    "lucide-react": "^1.8.0",
    "marked": "^18.0.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.0.1"
  }
}
```

---

## 3. Design system actual [UI — REDESENHAR]

### 3.1 Design tokens (ficheiro: `src/constants.js`)

```js
export const C = {
  // Verdes (cor primária)
  g:      '#16a34a',   // verde primário
  gd:     '#14532d',   // verde escuro
  gl:     '#dcfce7',   // verde claro (bg)
  gm:     '#22c55e',   // verde médio

  // Neutros
  navy:   '#0f172a',   // fundo escuro / header
  navyM:  '#1e293b',   // navy médio
  slate:  '#64748b',   // texto secundário
  border: '#e2e8f0',   // bordas / separadores
  mist:   '#f8fafc',   // fundo página
  white:  '#ffffff',   // cards / modais

  // Accent
  amber:  '#f59e0b',   // estrelas / gamificação
  red:    '#ef4444',   // perigo / erros

  // Cobre (gradiente alternativo — avatar não-verde)
  copper: '#C17E3A',
  copperL:'#E8A857',
}
```

### 3.2 Branding (ficheiro: `src/config/branding.js`)

```js
export const BRAND = {
  name:         'V5 Manutenção',
  shortName:    'V5',
  tagline:      'A tua casa cuidada',
  emoji:        '🏠',
  primaryColor: '#0B3D2E',   // verde escuro brand
  accentColor:  '#10B981',   // verde claro brand
  goldColor:    '#F59E0B',   // gamificação
  supportEmail: 'info@prataowners.pt',
  domain:       'prataowners.pt',
  companyName:  'Property7 Lda',
  version:      '0.5.3',
}
```

### 3.3 Tipografia actual [UI — REDESENHAR]

A app **não carrega fontes custom** — usa a stack do sistema:
- Body: `Segoe UI, system-ui, sans-serif` (definido em `index.html`)
- Sem fonte monospace dedicada

Tamanhos usados:
- Headers de ecrã: `15px, fw 700`
- Títulos de secção: `14px, fw 800`
- Corpo: `13–14px, fw 500`
- Labels uppercase: `9–11px, fw 700, letterSpacing 0.04–0.06em`
- Sub-labels: `10–11px, fw 500, color slate`

### 3.4 Layout / container [UI — REDESENHAR]

```html
<!-- index.html -->
<body style="background:#1e293b; margin:0; font-family:'Segoe UI',system-ui,sans-serif;">
  <div id="root" style="max-width:430px; margin:0 auto; min-height:100vh;
                         background:#f8fafc; box-shadow:0 0 60px rgba(0,0,0,0.3);">
  </div>
</body>
```

- **Max-width: 430px** — mobile-first, centrado no desktop
- Fundo da página: `#f8fafc` (mist)
- Fundo do body (desktop): `#1e293b` (navy médio)
- Overflow horizontal: oculto implícito pela largura fixa

### 3.5 Raios / sombras / bordas actuais [UI — REDESENHAR]

| Elemento | Border-radius | Sombra |
|---|---|---|
| Cards | `16px` | `0 1px 3px rgba(0,0,0,0.05)` |
| Botões | `12px` | nenhuma |
| Badges / Pill | `20px` (full round) | nenhuma |
| Drawer | `0` (full height) | `4px 0 32px rgba(0,0,0,0.22)` |
| Bottom sheet | `16px 16px 0 0` | `0 -4px 32px rgba(0,0,0,0.12)` |
| Avatar | `50%` (círculo) | `0 2px 8px rgba(0,0,0,0.2)` |

### 3.6 Categorias de serviços (dados + cores) [LÓGICA — NÃO ALTERAR]

```js
export const CATS = [
  {id:'limpeza',    l:'Limpeza',     ic:'🧹', cor:'#16a34a'},
  {id:'manutencao', l:'Manutenção',  ic:'🔧', cor:'#0ea5e9'},
  {id:'jardim',     l:'Jardim',      ic:'🌿', cor:'#22c55e'},
  {id:'piscina',    l:'Piscina',     ic:'🏊', cor:'#06b6d4'},
  {id:'pintura',    l:'Pintura',     ic:'🎨', cor:'#f97316'},
  {id:'eletrica',   l:'Elétrica',    ic:'⚡', cor:'#eab308'},
  {id:'canalizacao',l:'Canalização', ic:'🚿', cor:'#8b5cf6'},
  {id:'obra',       l:'Pós-Obra',    ic:'🏗️', cor:'#78716c'},
]
```

---

## 4. Componentes UI primitivos [UI — REDESENHAR]

Existem duas versões dos primitivos:
1. **`src/components/ui.jsx`** — versão extraída, importa `C` de `constants.js`
2. **`src/App.jsx` linhas 80–118** — versão inline (duplicada, usada dentro do App.jsx)

Ao redesenhar, substituir ambas.

### 4.1 `Av` — Avatar circular

```jsx
// Props: ini (string initials), size (number, default 44), green (bool, default true)
// Render: círculo com gradiente + iniciais brancas
function Av({ ini, size = 44, green = true }) {
  const bg = green
    ? `linear-gradient(135deg, #16a34a, #22c55e)`      // verde
    : `linear-gradient(135deg, #C17E3A, #E8A857)`       // cobre
  return <div style={{
    width:size, height:size, borderRadius:'50%',
    background:bg, display:'flex', alignItems:'center',
    justifyContent:'center', fontSize:size*.34, fontWeight:800, color:'#fff',
    boxShadow:'0 2px 8px rgba(0,0,0,0.2)',
  }}>{ini}</div>
}
```

### 4.2 `Stars` — Avaliação por estrelas

```jsx
// Props: v (number 0-5), s (fontSize, default 12)
// Render: 5 estrelas ★ coloridas (amber) ou cinza (border)
function Stars({ v, s = 12 }) {
  return <span>
    {[1,2,3,4,5].map(i => (
      <span key={i} style={{ color: i<=Math.round(v) ? '#f59e0b' : '#e2e8f0', fontSize:s }}>★</span>
    ))}
  </span>
}
```

### 4.3 `Card` — Container card

```jsx
// Props: children, style (object, override), onClick (handler opcional)
// Render: div branca com borda e sombra leve; cursor pointer se onClick
function Card({ children, style, onClick }) {
  return <div onClick={onClick} style={{
    background:'#fff', borderRadius:16,
    border:'1px solid #e2e8f0',
    boxShadow:'0 1px 3px rgba(0,0,0,0.05)',
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  }}>{children}</div>
}
```

### 4.4 `Pill` — Badge pequeno

```jsx
// Props: text (string), bg (cor fundo), col (cor texto)
// Render: badge uppercase arredondado
function Pill({ text, bg, col }) {
  return <span style={{
    fontSize:10, fontWeight:800, background:bg, color:col,
    padding:'2px 8px', borderRadius:20,
    textTransform:'uppercase', letterSpacing:'0.04em',
  }}>{text}</span>
}
```

### 4.5 `EstBadge` — Badge de estado de ordem

```jsx
// Props: st ('pendente' | 'atribuida' | 'em_curso' | 'concluida')
// Render: badge colorido com label do estado
function EstBadge({ st }) {
  const m = {
    pendente:  { l:'Pendente',   bg:'#fef3c7', c:'#92400e' },
    atribuida: { l:'Atribuída',  bg:'#eff6ff', c:'#1d4ed8' },
    em_curso:  { l:'Em curso',   bg:'#dcfce7', c:'#14532d' },
    concluida: { l:'Concluída',  bg:'#f8fafc', c:'#64748b' },
  }
  const s = m[st] || m.pendente
  return <span style={{
    fontSize:11, fontWeight:700, background:s.bg, color:s.c,
    padding:'3px 10px', borderRadius:20,
  }}>{s.l}</span>
}
```

### 4.6 `Btn` — Botão primário

```jsx
// Props:
//   children — conteúdo
//   onClick — handler
//   v — variante: 'navy' (default) | 'green' | 'ghost' | 'red' | 'copper'
//   full — bool, width:100%
//   sm — bool, tamanho pequeno
//   dis — bool, desactivado
function Btn({ children, onClick, v='navy', full, sm, dis }) {
  const bg  = { navy:'#0f172a', green:'#16a34a', ghost:'#fff', red:'#ef4444', copper:'#C17E3A' }[v] || '#0f172a'
  const col = v === 'ghost' ? '#0f172a' : '#fff'
  return <button onClick={dis ? null : onClick} style={{
    background: dis ? '#e2e8f0' : bg,
    color: dis ? '#64748b' : col,
    border: v === 'ghost' ? '1.5px solid #e2e8f0' : 'none',
    borderRadius:12, fontWeight:700,
    cursor: dis ? 'not-allowed' : 'pointer',
    padding: sm ? '8px 14px' : '13px 20px',
    fontSize: sm ? 12 : 14,
    width: full ? '100%' : 'auto',
    opacity: dis ? 0.7 : 1,
  }}>{children}</button>
}
```

### 4.7 `Header` — Cabeçalho de ecrã (sticky)

```jsx
// Props: title (string), sub (string opcional), onBack (fn opcional), right (ReactNode opcional)
// Render: header sticky escuro com título, botão back e slot direito
function Header({ title, sub, onBack, right }) {
  return <div style={{
    background:'#0f172a', padding:'14px 16px',
    position:'sticky', top:0, zIndex:20,
    display:'flex', alignItems:'center', gap:10,
  }}>
    {onBack && <button onClick={onBack} style={{ background:'none', border:'none', color:'#fff', fontSize:22, cursor:'pointer', padding:0 }}>←</button>}
    <div style={{ flex:1 }}>
      <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{title}</div>
      {sub && <div style={{ fontSize:11, color:'#8FA8BB' }}>{sub}</div>}
    </div>
    {right}
  </div>
}
```

### 4.8 `FixedBottom` — Barra de acção fixa no fundo

```jsx
// Props: children
// Render: container fixo bottom, centrado, max 430px, fundo branco
function FixedBottom({ children }) {
  return <div style={{
    position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
    width:'100%', maxWidth:430,
    background:'#fff', padding:'12px 16px 20px',
    borderTop:'1px solid #e2e8f0', zIndex:30,
  }}>{children}</div>
}
```

### 4.9 `SectTitle` — Título de secção

```jsx
// Props: t (string título), action (string label CTA), onAction (fn)
// Render: título h2 + botão acção à direita
function SectTitle({ t, action, onAction }) {
  return <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', margin:'16px 0 10px' }}>
    <h2 style={{ fontSize:14, fontWeight:800, color:'#0f172a' }}>{t}</h2>
    {action && <button onClick={onAction} style={{ fontSize:11, color:'#16a34a', fontWeight:600, background:'none', border:'none', cursor:'pointer' }}>{action}</button>}
  </div>
}
```

---

## 5. Componentes de navegação [UI — REDESENHAR]

### 5.1 `DrawerMenu` — Menu lateral (gaveta)

```jsx
// Props:
//   open (bool) — visibilidade
//   onClose (fn) — fechar
//   onNavigate (fn(id)) — navegar para item
//   user ({ n, ini, nivel, id_num }) — dados do utilizador
//   activeItem (string id) — item activo
//   menuItems (array) — lista de items (default MENU_ITEMS para prestador)
//
// Render:
//   - Overlay escuro (rgba 0,0,0,0.55)
//   - Painel 290px deslizante da esquerda
//   - Header: gradiente navy/verde com avatar + nome
//   - Nav: lista de items com highlight activo (borda verde esquerda)
//   - Footer: versão do produto
//
// Animação: transform translateX, transition 0.28s cubic-bezier
```

**Items do menu cliente:**
```js
const CLIENTE_MENU_ITEMS = [
  { id:'wishlist',      ic:'📝', l:'A minha lista' },
  { id:'perfil',        ic:'👤', l:'Perfil' },
  { id:'moradas',       ic:'📍', l:'As minhas moradas' },
  { id:'pagamentos',    ic:'💳', l:'Métodos de pagamento' },
  { id:'avaliacoes',    ic:'⭐', l:'As minhas avaliações' },
  { id:'referencia',    ic:'🎁', l:'Código de referência' },
  { id:'notificacoes',  ic:'🔔', l:'Notificações' },
  { id:'ajuda',         ic:'ℹ️', l:'Ajuda & Suporte' },
  { id:'sair',          ic:'🚪', l:'Terminar sessão' },
]
```

**Items do menu prestador:**
```js
const MENU_ITEMS = [
  { id:'rating',         ic:'⭐', l:'Rating' },
  { id:'servicos_ativos',ic:'🔧', l:'Serviços ativos' },
  { id:'meus_servicos',  ic:'📅', l:'Os meus serviços' },
  { id:'carteira',       ic:'💰', l:'A minha Carteira' },
  { id:'perfil',         ic:'👤', l:'Perfil' },
  { id:'estatisticas',   ic:'📊', l:'Estatísticas' },
  { id:'tarefas',        ic:'🛠️', l:'Tarefas' },
  { id:'disponibilidade',ic:'🕐', l:'A tua disponibilidade' },
  { id:'ajuda',          ic:'ℹ️', l:'Ajuda' },
  { id:'sair',           ic:'🚪', l:'Sair' },
]
```

### 5.2 `BottomNav` — Navegação por tabs (bottom)

Implementado inline em `App.jsx`. 5 tabs para o cliente:
- `inicio` — Início (ícone Home)
- `servicos` — Serviços (ícone Grid)
- `pedidos` — Pedidos (ícone ClipboardList)
- `casa` — Casa (ícone House)
- `subscricao` — Plano (ícone Star)

Estilo: barra branca fixa em baixo, max 430px, ícones 20px, labels 9px, tab activo verde.

### 5.3 `FAB` — Floating Action Button

Botão circular flutuante verde (`#16a34a`), bottom: 72px (acima da BottomNav), right: 16px.
Abre `FabPickerModal` — sheet com 5 secções (Emergência, Serviços, AI Expert, Câmara, Documento).

---

## 6. Estrutura de ficheiros completa

```
apps/v5-manutencao/
├── index.html                      ← entry HTML (max-width 430px, Segoe UI)
├── vite.config.js                  ← Vite config (port 5175, host 127.0.0.1)
├── package.json
├── src/
│   ├── App.jsx                     ← 11.000+ linhas — router principal + componentes inline
│   ├── main.jsx                    ← entry React (3 providers)
│   ├── supa.js                     ← 3 clientes Supabase (supa, supaCore, supaPublic)
│   ├── constants.js                ← tokens C, CATS, SVCS, TECNICOS, NIVEIS
│   ├── IniciaScreen.jsx            ← ecrã Home/Dashboard
│   ├── CasaScreen.jsx              ← ecrã Casa (saúde do imóvel)
│   ├── ServicosScreen.jsx          ← catálogo de serviços
│   ├── PedidosScreen.jsx           ← lista de pedidos/ordens
│   ├── SubscricaoScreen.jsx        ← gestão do plano
│   ├── ScoreDetailScreen.jsx       ← detalhe de pontuação
│   ├── AlertaDetailScreen.jsx      ← detalhe de alertas
│   ├── OwnersClubScreen.jsx        ← Owners Club
│   ├── ChatPedidoScreen.jsx        ← chat de uma ordem
│   ├── ChatSuporteScreen.jsx       ← chat de suporte
│   ├── OrgLocBottomSheet.jsx       ← selector de org/imóvel
│   ├── CWishlist.jsx               ← lista de desejos
│   ├── HeroHeader.jsx              ← hero header
│   ├── PerfilSheet.jsx             ← perfil sheet
│   ├── PerfilDrawer.jsx            ← perfil drawer
│   ├── PerfilSheetContent.jsx
│   ├── PerfilDrawerContent.jsx
│   ├── ImovelSelectorSheet.jsx
│   ├── config/
│   │   └── branding.js             ← BRAND constant
│   ├── components/
│   │   ├── ui.jsx                  ← primitivos (Av, Stars, Card, Pill, EstBadge, Btn, Header, FixedBottom, SectTitle)
│   │   ├── DrawerMenu.jsx
│   │   ├── EscolherImovelSheet.jsx ← bottom sheet selector de imóvel
│   │   ├── ImagemServico.jsx       ← imagem de serviço (Unsplash)
│   │   ├── ImovelWizard.jsx        ← wizard multi-step de adicionar imóvel
│   │   ├── MapaPicker.jsx          ← picker de coordenadas GPS
│   │   ├── MeusServicos.jsx        ← calendário de serviços (5 vistas: dia/semana/mês/ano/lista)
│   │   ├── PasswordInput.jsx       ← campo password com toggle show/hide
│   │   ├── PerfilFiscalForm.jsx    ← formulário de perfil fiscal
│   │   ├── PhoneInput.jsx          ← campo telefone com indicativo
│   │   ├── SmartPromptsSheet.jsx   ← AI prompts sheet
│   │   ├── StaffBanner.jsx         ← banner staff (só em DEV/staff)
│   │   └── States.jsx              ← componentes de estado
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.jsx
│   │   │   ├── SignupScreen.jsx
│   │   │   ├── ConfirmEmailPendingScreen.jsx
│   │   │   ├── ConfirmEmailScreen.jsx
│   │   │   ├── RecoverPasswordScreen.jsx
│   │   │   └── ResetPasswordScreen.jsx
│   │   ├── AdicionarCamaraScreen.jsx
│   │   ├── AdicionarDocScreen.jsx
│   │   ├── AdicionarEnergiaScreen.jsx
│   │   ├── AIExpertFabScreen.jsx
│   │   ├── AjudaScreen.jsx
│   │   ├── AvaliacoesScreen.jsx
│   │   ├── CategoriaScreen.jsx
│   │   ├── CodigoPromocionalScreen.jsx
│   │   ├── ComboDetailScreen.jsx
│   │   ├── CombosScreen.jsx
│   │   ├── DadosPessoaisScreen.jsx
│   │   ├── DefinicoesScreen.jsx
│   │   ├── EmergenciaScreen.jsx
│   │   ├── EquipamentoFichaScreen.jsx
│   │   ├── EquipaScreen.jsx
│   │   ├── HistoricoPontosScreen.jsx
│   │   ├── HomeAssessmentScreen.jsx
│   │   ├── ImovelDetalheScreen.jsx
│   │   ├── LoginSegurancaScreen.jsx
│   │   ├── MaisContratadosScreen.jsx
│   │   ├── MissoesScreen.jsx
│   │   ├── MoradasScreen.jsx       ← exporta também ModalEditarImovel
│   │   ├── NotificacoesScreen.jsx
│   │   ├── OnboardingWizardScreen.jsx
│   │   ├── OrcamentoConfirmadoScreen.jsx
│   │   ├── OrcamentoDetalheScreen.jsx
│   │   ├── OrcamentosLandingScreen.jsx
│   │   ├── OrcamentoWizardScreen.jsx
│   │   ├── PagamentosScreen.jsx
│   │   ├── PerfisFiscaisScreen.jsx
│   │   ├── PlanoHomeDetalheScreen.jsx
│   │   ├── PoupancasDetalheScreen.jsx
│   │   ├── PrestadorDetailScreen.jsx
│   │   ├── PrestadoresEquipaScreen.jsx
│   │   ├── PromocaoDetailScreen.jsx
│   │   ├── ReferralScreen.jsx
│   │   ├── ServicoDetailScreen.jsx
│   │   ├── ServicosListaScreen.jsx
│   │   └── SobreMimScreen.jsx
│   ├── lib/
│   │   ├── AuthContext.jsx          ← Context + Provider + useAuth hook
│   │   ├── ImovelAtivoContext.jsx   ← Context + Provider + useImovelAtivo hook
│   │   ├── PerfisFiscaisContext.jsx ← Context + Provider + usePerfisFiscais hook
│   │   ├── router.js               ← useNavStack() hook (history stack)
│   │   ├── categorias.js
│   │   ├── completude.js           ← calcCompletude(localizacao) → score 0-100
│   │   ├── contextoServico.js
│   │   ├── demo.js                 ← DEMO_PESSOA_ID, DEMO_ORGANIZATION_ID (@deprecated)
│   │   ├── descontos.js            ← getDescontoAplicavel(pessoaId, valor)
│   │   ├── faturacao.js            ← getPerfilFiscalAplicavel(), snapshotPerfil()
│   │   ├── gamification.js         ← calcularNivel(), ganharPontos(), verificarStreak()
│   │   ├── geocoding.js            ← pointToCoords(), coordsToPoint(), geocodeAddress()
│   │   ├── imageCompression.js     ← compressImage(file) → { base64, width, height, sizeBytes, mimeType }
│   │   ├── imagens.js              ← POOL_POR_SUB_GRUPO, hashStr()
│   │   ├── labels.js               ← moradaCurta(), moradaCompleta()
│   │   ├── scoreLabel.js           ← scoreLabel(), scoreLabelShort(), casaScoreLabel()
│   │   ├── subscription.js
│   │   └── useEscolherImovel.jsx   ← hook para selector de imóvel
│   ├── data/
│   │   └── mock.js                 ← MOCK_ORCAMENTOS_AREAS, MOCK_ALERTAS_ENRIQUECIDOS, MOCK_REVIEWS
│   └── views/
│       └── prestador/
│           └── PrestadorDash.jsx
├── supabase/
│   ├── functions/
│   │   ├── agent-image-inspector/
│   │   │   └── index.ts            ← Edge Function: análise de imagem por AI (Claude Vision)
│   │   ├── agent-test/
│   │   │   └── index.ts
│   │   ├── delete-account/
│   │   │   └── index.ts            ← Edge Function: GDPR delete
│   │   └── _shared/
│   │       └── agents/
│   │           ├── anthropic.ts    ← raw fetch à Anthropic API
│   │           ├── runAgent.ts     ← tool use loop (max 20 iter)
│   │           ├── types.ts        ← interfaces partilhadas
│   │           └── tools/
│   │               └── equipamento.ts ← 4 tool executors
└── sql/                            ← 37 migrações SQL aplicadas
```

---

## 7. Contexts e estado global [LÓGICA — NÃO ALTERAR]

### 7.1 `AuthContext` (`src/lib/AuthContext.jsx`)

Providers em `src/main.jsx` — ordem: `AuthProvider > ImovelAtivoProvider > PerfisFiscaisProvider > App`.

```jsx
// Hook: useAuth()
// Retorna:
const {
  session,        // Supabase Session | null
  pessoa,         // core.pessoas row | null
  pessoa_id,      // uuid | null
  memberships,    // core.memberships[] — orgs do utilizador
  authenticated,  // bool
  loading,        // bool — a carregar sessão inicial
  needsOnboarding,// bool — sem memberships → forçar onboarding
  isStaff,        // bool — tem role em core.staff_roles
  staffRoles,     // string[] — roles do staff
  signOut,        // async fn
  refreshPessoa,  // async fn — recarrega dados do utilizador
} = useAuth()
```

`pessoa` object (de `core.pessoas`):
```
id, auth_user_id, nome, primeiro_nome, apelidos, email, nif, telemovel, foto_url,
metadata (JSONB), localizacao_ativa_id, created_at, updated_at
```

### 7.2 `ImovelAtivoContext` (`src/lib/ImovelAtivoContext.jsx`)

```jsx
// Hook: useImovelAtivo()
// Retorna:
const {
  imoveis,           // localizacoes[] da org activa
  imovelAtivo,       // localizacao row | null
  imovelAtivoId,     // uuid | null
  viewMode,          // 'single' | 'global'
  isGlobal,          // bool
  organizations,     // organizations[] do utilizador
  organizationId,    // uuid da org activa
  setActiveOrg,      // fn(orgId)
  setImovelAtivoId,  // fn(locId)
  setViewModeGlobal, // fn()
  onTabChange,       // fn(tabId) — reset para imóvel principal
} = useImovelAtivo()
```

### 7.3 `PerfisFiscaisContext` (`src/lib/PerfisFiscaisContext.jsx`)

```jsx
// Hook: usePerfisFiscais()
const {
  perfis,         // perfis_fiscais[]
  loading,        // bool
  refetch,        // fn
  addPerfil,      // async fn(dados)
  updatePerfil,   // async fn(id, dados)
  deletePerfil,   // async fn(id)
} = usePerfisFiscais()
```

---

## 8. Navegação (sistema de rotas) [LÓGICA — NÃO ALTERAR]

Sem React Router. A navegação é feita por `useState` em `App.jsx`:

```jsx
const [ecra, setEcra] = useState('inicio')      // ecrã activo
const [tab, setTab]   = useState('inicio')       // tab activo na bottom nav
const [selNav, setSelNav] = useState('inicio')   // item nav seleccionado
```

**Ecrãs disponíveis (valor de `ecra`):**
```
inicio, servicos, pedidos, casa, subscricao,
login, signup, confirm_email_pending, confirm_email, recover_password, reset_password,
onboarding,
perfis_fiscais,
sobre_mim, dados_pessoais, login_seguranca, moradas, imovel_detalhe,
codigo_promo, referral, historico_pontos, avaliacoes, pagamentos, notificacoes,
definicoes, ajuda, equipa, prestador_detail, home_assessment,
categoria, servico_detail, combo_detail, promocao_detail, combos, mais_contratados,
orcamentos_landing, orcamento_wizard, orcamento_confirmado, orcamento_detalhe,
plano_home_detalhe, servicos_lista, emergencia, missoes, prestadores_equipa,
poupancas_detalhe, ai_expert_fab, adicionar_camara, equipamento_ficha,
adicionar_doc, adicionar_energia, score_detail, alerta_detail, owners_club,
chat_pedido, chat_suporte, wishlist,
```

**Stack de navegação (back button):**
```jsx
// Hook: useNavStack() em src/lib/router.js
const { push, pop, canPop } = useNavStack()
// push(ecra) — adiciona ao histórico
// pop() — volta ao ecrã anterior
// canPop — bool
```

---

## 9. Clientes Supabase [LÓGICA — NÃO ALTERAR]

```js
// src/supa.js

// Principal — schema v5_manutencao, sessão persistida
export const supa = createClient(URL, ANON_KEY, {
  db: { schema: 'v5_manutencao' },
  auth: { storageKey:'sb-v5-auth', persistSession:true, flowType:'pkce' }
})

// Core schema — RLS com JWT do utilizador (sync manual via syncSupaCore)
export const supaCore = createClient(URL, ANON_KEY, {
  db: { schema: 'core' },
  auth: { storageKey:'sb-core-auth', persistSession:false }
})

// Public schema — apenas para queries verdadeiramente públicas (sem auth.uid())
export const supaPublic = createClient(URL, ANON_KEY, {
  db: { schema: 'public' },
  auth: { storageKey:'sb-public-auth', persistSession:false }
})
```

**Regra crítica:** `supaPublic` NÃO partilha JWT — nunca usar para queries que precisem de `auth.uid()`.

---

## 10. Tabelas Supabase usadas [LÓGICA — NÃO ALTERAR]

### Schema `v5_manutencao` (cliente `supa`)

| Tabela | Propósito |
|---|---|
| `catalogo_servicos` | Catálogo de 199 serviços (nome, categoria, preco_base, emoji, etc.) |
| `ordens_trabalho` | Pedidos/ordens (cliente + prestador + estado + agendamento) |
| `prestadores` | Perfis dos técnicos (rating, especialidades, verificado) |
| `prestadores_equipa_cliente` | Equipa preferida de um cliente |
| `localizacoes` | Imóveis/propriedades (morada, GPS, quartos, área, foto) |
| `perfis_fiscais` | Perfis de faturação (nome, NIF, morada) |
| `equipamentos` | Electrodomésticos e equipamentos do imóvel |
| `equipamento_fotos` | Fotos de equipamentos (storage path) |
| `subscricoes` | Estado de subscrição (plano, pontos_total, nivel, streak) |
| `pontos_historico` | Ledger de pontos (gamificação) |
| `missoes_utilizador` | Missões do utilizador |
| `combos` | Packs de serviços (combos) |
| `combo_servicos` | Serviços dentro de um combo |
| `servicos_inclui_exclui` | O que inclui/exclui por serviço |
| `servicos_faq` | FAQ por serviço |
| `planos_subscricao` | Definição dos planos (Home+, etc.) |
| `descontos_config` | Configuração de descontos |
| `frequency_templates` | Templates de frequência de serviço |
| `platform_stats` | KPIs gerais da plataforma |
| `pedidos_orcamento` | Pedidos de orçamento à medida |
| `orcamentos_recebidos` | Propostas de orçamento recebidas |
| `documentos` | Documentos do imóvel |
| `tickets_suporte` | Tickets de suporte |
| `mensagens_suporte` | Mensagens de suporte |
| `contexto_servico` | Contexto/preferências por serviço |
| `codigos_referencia` | Códigos de referral |
| `avaliacoes` | Reviews e avaliações |
| `creditos_mensais` | Créditos mensais do utilizador |
| `mensagens_chat` | Mensagens do chat de uma ordem |

### Schema `core` (cliente `supaCore`)

| Tabela | Propósito |
|---|---|
| `pessoas` | Identidade (auth_user_id, nome, primeiro_nome, apelidos, email, nif) |
| `organizations` | Organizações (tipo: individual/empresa/condominio) |
| `memberships` | Pessoa → Organização (role: owner/admin/member) |
| `staff_roles` | Roles de staff da plataforma |
| `agent_audit_log` | Log de iterações de agentes AI |
| `agent_policies` | Config por org por agente (limites, modelo) |
| `api_usage` | Rate limit tracker de APIs |

### Schema `public` (cliente `supaPublic`)

| Tabela/Função | Propósito |
|---|---|
| `servicos` | Catálogo público legacy (V1) |
| `current_pessoa_id()` | RPC: UUID da pessoa logada |
| `current_organization_ids()` | RPC: array de org IDs do utilizador |
| `has_org_role(org_id, roles[])` | RPC: bool |
| `is_staff()` | RPC: bool |

### Storage buckets

| Bucket | Conteúdo | Acesso |
|---|---|---|
| `imoveis-fotos` | Fotos de imóveis | Privado (por pessoa_id) |
| `avatars` | Fotos de perfil | Privado |
| `equipamentos-fotos` | Fotos de equipamentos | Privado (por pessoa_id) |

---

## 11. Autenticação e roles [LÓGICA — NÃO ALTERAR]

### Fluxo de auth

1. `AuthProvider` detecta sessão via `supa.auth.getSession()`
2. Se sessão existe → carrega `core.pessoas` (pelo `auth_user_id`)
3. Carrega `core.memberships` → se vazio → `needsOnboarding = true`
4. Carrega `core.staff_roles` → `isStaff`, `staffRoles`
5. Sincroniza JWT para `supaCore` via `syncSupaCore(session)`

### Tipos de utilizador (roles em App.jsx)

```jsx
// Determinado em App.jsx pelo campo pessoa.role ou pelos dados carregados
const role = 'cliente' | 'prestador' | 'admin'
```

- **cliente:** acesso ao catálogo, pedidos, imóveis, gamificação
- **prestador:** acesso ao dashboard de trabalho (ordens atribuídas, calendário, carteira)
- **admin/staff:** banner staff + acesso ao backoffice (Fase 4)

### Contas de teste

| Role | Email | Password |
|---|---|---|
| Cliente principal | `maria.santos@v5demo.pt` | `Maria2026!` |
| Cliente sem histórico | `rls-test@v5demo.pt` | `Password123!` |
| Admin demo | `admin@demov5.pt` | `Demo2026!` |
| Prestador demo | `prestador@demov5.pt` | `Demo2026!` |
| Cliente demo | `cliente@demov5.pt` | `Demo2026!` |

---

## 12. Edge Functions [LÓGICA — NÃO ALTERAR]

### `agent-image-inspector`

Analisa fotos de equipamentos com Claude Vision (Anthropic).

```js
// Invocação (cliente)
const { data, error } = await supa.functions.invoke('agent-image-inspector', {
  body: {
    base64Image: string,      // imagem comprimida em base64
    mimeType:    string,      // 'image/jpeg' | 'image/png' | 'image/webp'
    localizacaoId?: string,   // UUID opcional do imóvel
  }
})
// Resposta:
// { success, iterations, totalCostEur, fotoPath }
```

Fluxo interno:
1. Verifica JWT + carrega localizacao
2. Rate limit (3/dia + 10/mês por utilizador)
3. Upload foto para bucket `equipamentos-fotos`
4. Signed URL → Claude Vision
5. Tool use loop: `equipamento_lookup`, `equipamento_create`, `equipamento_update`, `catalogo_search_servico_relevante`
6. Audit log em `core.agent_audit_log`

### `delete-account`

GDPR — anonimiza conta do utilizador.

```js
await supa.functions.invoke('delete-account', {
  body: { password: string } // re-autenticação obrigatória
})
```

---

## 13. Estados de uma ordem de trabalho [LÓGICA — NÃO ALTERAR]

```
pendente → atribuida → em_curso → concluida
                              ↘ cancelada
```

| Estado | Label PT | Cor |
|---|---|---|
| `pendente` | Pendente | amber (#fef3c7 / #92400e) |
| `atribuida` | Atribuída | blue (#eff6ff / #1d4ed8) |
| `em_curso` | Em curso | green (#dcfce7 / #14532d) |
| `concluida` | Concluída | gray (#f8fafc / #64748b) |
| `cancelada` | Cancelada | red (implícito) |

---

## 14. Sistema de gamificação [LÓGICA — NÃO ALTERAR]

### Níveis de utilizador (cliente)

| Nível | Min pontos | Cor badge |
|---|---|---|
| Bronze | 0 | #b45309 / #fef3c7 |
| Silver | 500 | #475569 / #f1f5f9 |
| Gold | 1500 | #b45309 / #fef9c3 |
| Platinum | 3500 | #7c3aed / #ede9fe |
| Diamond | 7500 | #0891b2 / #e0f2fe |

### Níveis de prestador (taxa de comissão)

```js
const NIVEIS = {
  base:  { l:'Base',   ic:'🟤', taxa:22, min:0   },
  silver:{ l:'Silver', ic:'⚪', taxa:20, min:50  },
  gold:  { l:'Gold',   ic:'🟡', taxa:18, min:200 },
  elite: { l:'Elite',  ic:'🟢', taxa:16, min:500 },
}
```

### Score da casa (null = sem dados)

```js
// src/lib/scoreLabel.js
scoreLabel(score)       // null → 'Casa por avaliar 🏠', <40 → 'Casa com Atenção 🔧', etc.
scoreLabelShort(score)  // versão curta
casaScoreLabel(score)   // para o ecrã Casa
```

---

## 15. Padrões de código importantes [LÓGICA — NÃO ALTERAR]

### Padrão de ecrã típico

```jsx
// Todos os ecrãs recebem: { onBack, onNavigate, ... props específicas }
export default function XScreen({ onBack, onNavigate, ...props }) {
  const { pessoa_id } = useAuth()
  const { imovelAtivoId, organizationId } = useImovelAtivo()

  const [data, setData] = useState(null)      // null = loading
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!pessoa_id) return
    supa.from('tabela')
      .select('*')
      .eq('pessoa_id', pessoa_id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setData(data ?? [])
      })
  }, [pessoa_id])

  if (data === null) return <div>A carregar...</div>

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc' }}>
      <Header title="Título" onBack={onBack} />
      <div style={{ padding:'16px 16px 80px' }}>
        {/* conteúdo */}
      </div>
    </div>
  )
}
```

### Padrão de single vs maybeSingle

```js
// NUNCA usar .single() sem garantia de ≥1 row — usar sempre .maybeSingle()
const { data } = await supa.from('tabela').select('*').eq('id', id).maybeSingle()
```

### Padrão de imagens de serviço

```js
// src/lib/imagens.js
// Imagens determinísticas por sub_grupo via hash da string
// Pool Unsplash — futuramente substituir por brand próprio
```

### Padrão de compressão de imagem

```js
// src/lib/imageCompression.js
const { base64, width, height, sizeBytes, mimeType } = await compressImage(file)
// Max 1568px, JPEG q85, OffscreenCanvas, zero deps
```

---

## 16. Componente `PasswordInput` [UI — REDESENHAR PROPS PRESERVAR]

```jsx
// src/components/PasswordInput.jsx
// Props: value, onChange, placeholder, label, required, autoComplete
// Render: input password com botão toggle show/hide (lucide Eye/EyeOff)
```

---

## 17. Componente `PhoneInput` [UI — REDESENHAR PROPS PRESERVAR]

```jsx
// src/components/PhoneInput.jsx
// Props: value, onChange, label, required
// Render: dropdown indicativo país (🇵🇹 +351 default) + input número
```

---

## 18. Componente `ImovelWizard` [UI — REDESENHAR PROPS PRESERVAR]

```jsx
// src/components/ImovelWizard.jsx
// Props: onSave(dados), onCancel, organizationId
// Multi-step: tipo imóvel → morada → detalhes (quartos/WCs/área/pisos) → foto
// Upload de foto para bucket 'imoveis-fotos'
// Geocoding via Nominatim (gratuito)
```

---

## 19. Componente `MeusServicos` — Calendário [UI — REDESENHAR]

```jsx
// src/components/MeusServicos.jsx (também inline em App.jsx)
// Props: servicos (array), bloqueados (array), onBack (fn)
// 5 vistas: dia | semana | mes | ano | lista
// Navegar entre períodos com < >
// Click num serviço → detalhe do serviço
```

---

## 20. Onboarding Wizard [LÓGICA — NÃO ALTERAR]

5 steps, condicionais pelo tipo de conta:

| Step | individual | empresa/condo | gestor |
|---|---|---|---|
| 1 — Tipo de conta | ✓ | ✓ | ✓ |
| 2 — Dados pessoais (primeiro_nome + apelido) | ✓ | ✓ | ✓ |
| 3 — Dados da entidade (NIF empresa, nome) | — | ✓ | ✓ |
| 4 — Localização (morada do imóvel) | ✓ | ✓ | — |
| 5 — Boas-vindas | ✓ | ✓ | ✓ |

RPC atómica: `core.fn_complete_onboarding(payload)` cria:
- `core.pessoas` (actualiza primeiro_nome + apelidos)
- `core.organizations`
- `core.memberships`
- `v5_manutencao.perfis_fiscais`
- `v5_manutencao.localizacoes`

---

## 21. FAB + FabPickerModal [UI — REDESENHAR]

Floating Action Button verde no ecrã principal. Abre um bottom sheet (`FabPickerModal`) com:

1. **Emergência** → `EmergenciaScreen`
2. **Pedir serviço** → grid de categorias principais
3. **AI Expert** → `AIExpertFabScreen`
4. **Adicionar à casa** → sub-menu (Câmara, Documento, Energia)
5. **Descrição livre** → textarea para pedido custom

---

## 22. StaffBanner [UI — MANTER FUNCIONALIDADE]

```jsx
// src/components/StaffBanner.jsx
// Renderiza apenas se isStaff === true (useAuth())
// Banner amarelo discreto fixed top
// Expansível: mostra roles, links para admin
// Não interferir com layout — usar padding-top no conteúdo principal
```

---

## 23. Instrução para o redesign

### O que REDESENHAR (UI)
- Paleta de cores (tokens em `constants.js` e `branding.js`)
- Tipografia (fontes, tamanhos, pesos)
- Border-radius, sombras, espaçamentos
- Layout interno de cada ecrã (hierarquia visual, densidade)
- Estilo dos componentes (Btn, Card, Pill, Header, etc.)
- Animações e transições
- Ícones (podem substituir emojis por SVG se preferível)
- Bottom navigation (estilo)
- Drawer menu (estilo)

### O que PRESERVAR (lógica)
- Todos os `useState`, `useEffect`, queries Supabase
- Todos os hooks e contexts (`useAuth`, `useImovelAtivo`, `usePerfisFiscais`, `useNavStack`)
- Todos os props dos componentes
- Todos os valores de `ecra` para navegação
- Todos os nomes de tabelas e schemas Supabase
- RPC functions e Edge Functions
- Sistema de roles (cliente/prestador/admin)
- Sistema de estados das ordens
- Gamificação (pontos, níveis, streak)
- Onboarding wizard (steps e RPC)
- Auth flow (PKCE, sessão, sync supaCore)

### Estratégia de implementação
1. Criar novos tokens em `constants.js` (substituir o objecto `C`)
2. Actualizar `branding.js` com novas cores de brand
3. Substituir os primitivos em `src/components/ui.jsx`
4. Actualizar `index.html` (fontes, theme-color, background)
5. Ecrã a ecrã: alterar apenas os `style={{...}}` inline, preservar toda a lógica

### Abordagem aos estilos
A app usa **100% estilos inline** (`style={{}}`). Não há ficheiros CSS externos.
Ao redesenhar, manter esta abordagem ou migrar para CSS Modules (sem quebrar lógica).
Não introduzir Tailwind sem acordo explícito.
