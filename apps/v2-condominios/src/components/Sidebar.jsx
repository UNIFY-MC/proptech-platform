import { NavLink } from 'react-router-dom'
import { useAuth } from '@proptech/auth'

const GESTAO = [
  { to: '/',                    label: 'Início',              icon: '🏡' },
  { to: '/prestacao-contas',    label: 'Prestação de Contas', icon: '📊' },
  { to: '/dividas-2025',        label: 'Dívidas 2025',        icon: '⚠️' },
  { to: '/divida-actual-2026',  label: 'Dívida Actual 2026',  icon: '📈' },
  { to: '/recebimentos',        label: 'Recebimentos',        icon: '💶' },
  { to: '/bancos',              label: 'Bancos',              icon: '🏦' },
]

const CADASTRO = [
  { to: '/condominos',          label: 'Condóminos',          icon: '👥' },
  { to: '/fracoes',             label: 'Fracções',            icon: '🏢' },
  { to: '/faturas',             label: 'Faturas',             icon: '🧾' },
  { to: '/mapa-receitas',       label: 'Mapa de Receitas',    icon: '📊' },
  { to: '/documentos',          label: 'Documentos',          icon: '📁' },
]

const PORTAL = [
  { to: '/portal-condomino',    label: 'Abrir como Condómino', icon: '👤' },
]

const FERRAMENTAS = [
  { to: '/automacoes',          label: 'Automações',          icon: '⚙️' },
]

const DEVELOPER = [
  { to: '/permissoes',          label: 'Permissões',          icon: '🔐' },
]

const AGENTIC = [
  { to: '/inbox',               label: 'Inbox',               icon: '📥' },
  { to: '/approvals',           label: 'Approvals',           icon: '✓' },
  { to: '/chat',                label: 'Chat',                icon: '💬' },
]

const REFERENCIA = [
  { to: '/v2-legacy',           label: 'V2 Legacy (ref)',     icon: '⌖' },
]

export default function Sidebar({ theme, setTheme }) {
  const { pessoa, signOut } = useAuth()

  return (
    <aside className="sb">
      <div className="sb-brand">
        <div className="sb-logo">
          <div className="sb-mark">PT</div>
          <div>
            <div className="sb-name">Prata Owners</div>
            <div className="sb-sub">PropTech · V2</div>
          </div>
        </div>
      </div>

      <Section title="Gestão"        items={GESTAO} />
      <Section title="Cadastro"      items={CADASTRO} />
      <Section title="Portal"        items={PORTAL} />
      <Section title="Ferramentas"   items={FERRAMENTAS} />
      <Section title="Developer"     items={DEVELOPER} />
      <Section title="Agentic Ops"   items={AGENTIC} />
      <Section title="Referência"    items={REFERENCIA} />

      <div className="sb-footer">
        <div className="dim" style={{ fontSize: 10, fontFamily: 'DM Mono, monospace' }}>
          {pessoa?.primeiro_nome ?? pessoa?.email ?? '—'}
        </div>
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          {theme === 'light' ? 'Dark mode' : 'Light mode'}
        </button>
        <button onClick={signOut}>Sair</button>
      </div>
    </aside>
  )
}

function Section({ title, items }) {
  return (
    <>
      <div className="sb-section">{title}</div>
      {items.map(it => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.to === '/'}
          className={({ isActive }) => 'sb-item' + (isActive ? ' active' : '')}
        >
          <span className="sb-icon">{it.icon}</span>
          {it.label}
        </NavLink>
      ))}
    </>
  )
}
