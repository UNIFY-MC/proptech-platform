import { NavLink } from 'react-router-dom'
import { useAuth } from '@proptech/auth'

const MENU = [
  { to: '/',              label: 'Dashboard',     icon: '◇' },
  { to: '/fracoes',       label: 'Frações',       icon: '⌂' },
  { to: '/faturas',       label: 'Faturas / OCR', icon: '⊞' },
  { to: '/mora',          label: 'Mora',          icon: '⚠' },
  { to: '/documentos',    label: 'Documentos',    icon: '☰' },
  { to: '/energia',       label: 'EV / Energia',  icon: '⚡' },
  { to: '/seguros',       label: 'Seguros',       icon: '◉' },
  { to: '/assembleias',   label: 'Assembleias',   icon: '⊡' },
  { to: '/comunicacao',   label: 'Comunicação',   icon: '✉' },
]

const AGENTIC = [
  { to: '/inbox',     label: 'Inbox',     icon: '📥', accent: true },
  { to: '/approvals', label: 'Approvals', icon: '✓',  accent: true },
  { to: '/chat',      label: 'Chat',      icon: '💬', accent: true },
]

const DATA_REF = [
  { to: '/v2-legacy', label: 'V2 Legacy', icon: '⌖', accent: true },
]

const itemStyle = ({ isActive }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 12px',
  borderRadius: 6,
  fontSize: 13,
  fontWeight: isActive ? 600 : 400,
  color: isActive ? 'var(--text)' : 'var(--text-dim)',
  background: isActive ? 'var(--bg-elevated)' : 'transparent',
  textDecoration: 'none',
  transition: 'background 0.12s, color 0.12s',
})

export default function Sidebar({ theme, setTheme }) {
  const { pessoa, signOut } = useAuth()

  return (
    <aside style={{
      width: 200,
      flexShrink: 0,
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '18px 12px',
    }}>
      <div style={{ padding: '0 8px 16px', borderBottom: '1px solid var(--border-soft)', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
          V2 Condomínios
        </div>
        <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
          PropTech · {pessoa?.primeiro_nome ?? '—'}
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <SectionLabel>Gestão</SectionLabel>
        {MENU.map(it => (
          <NavLink key={it.to} to={it.to} end={it.to === '/'} style={itemStyle}>
            <span style={{ width: 14, textAlign: 'center', opacity: 0.6 }}>{it.icon}</span>
            {it.label}
          </NavLink>
        ))}

        <SectionLabel>Agentic Ops</SectionLabel>
        {AGENTIC.map(it => (
          <NavLink key={it.to} to={it.to} style={itemStyle}>
            <span style={{ width: 14, textAlign: 'center' }}>{it.icon}</span>
            {it.label}
          </NavLink>
        ))}

        <SectionLabel>Referência</SectionLabel>
        {DATA_REF.map(it => (
          <NavLink key={it.to} to={it.to} style={itemStyle}>
            <span style={{ width: 14, textAlign: 'center' }}>{it.icon}</span>
            {it.label}
          </NavLink>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-dim)',
            borderRadius: 5,
            padding: '5px 10px',
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
            cursor: 'pointer',
          }}
        >
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <button
          onClick={signOut}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-dim)',
            borderRadius: 5,
            padding: '5px 10px',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          Sair
        </button>
      </div>
    </aside>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 8,
      fontFamily: 'JetBrains Mono, monospace',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: 'var(--text-dim)',
      padding: '12px 8px 6px',
      opacity: 0.7,
    }}>
      {children}
    </div>
  )
}
