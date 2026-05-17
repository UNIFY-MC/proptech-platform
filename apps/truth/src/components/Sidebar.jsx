import { NavLink, useLocation } from 'react-router-dom';
import { Search, Lightbulb, Target, Megaphone, Activity } from 'lucide-react';

const NAV = [
  { to: '/swarm',       label: 'Swarm',       icon: Activity,   accent: '#10b981' },
  { to: '/discoveries', label: 'Discoveries', icon: Lightbulb,  accent: '#58a6ff' },
  { to: '/niches',      label: 'Niches',      icon: Target,     accent: '#d2a8ff' },
  { to: '/studio',      label: 'Ad Studio',   icon: Megaphone,  accent: '#f59e0b' },
];

export default function Sidebar() {
  const loc = useLocation();

  return (
    <aside style={{
      width: 200,
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      padding: '16px 0',
    }}>
      {/* Logo */}
      <div style={{
        padding: '0 16px 16px',
        borderBottom: '1px solid var(--border)',
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search size={16} color="var(--truth)" />
          <span style={{ fontWeight: 700, fontSize: 13 }}>Truth Engine</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>Property007</div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '0 8px' }}>
        {NAV.map(({ to, label, icon: Icon, accent }) => {
          const active = loc.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 6,
                marginBottom: 2,
                textDecoration: 'none',
                color: active ? 'var(--text)' : 'var(--muted)',
                background: active ? 'var(--surface2)' : 'transparent',
                fontWeight: active ? 600 : 400,
                fontSize: 12,
                transition: 'all 0.1s',
              }}
            >
              <Icon
                size={14}
                color={active ? accent : 'var(--dim)'}
                style={{ flexShrink: 0 }}
              />
              {label}
              {to === '/swarm' && (
                <span style={{
                  marginLeft: 'auto',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--green)',
                  animation: 'pulse 2s infinite',
                  flexShrink: 0,
                }} />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '12px 16px 0',
        borderTop: '1px solid var(--border)',
        fontSize: 10,
        color: 'var(--dim)',
        fontFamily: 'JetBrains Mono, monospace',
      }}>
        TRUTH ENGINE v0.1
      </div>
    </aside>
  );
}
