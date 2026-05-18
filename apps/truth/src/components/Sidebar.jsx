import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Search, Lightbulb, Target, Megaphone, Activity } from 'lucide-react';
import { supaSystem } from '../lib/supabase.js';

function useDiscovery24hCount() {
  const [count, setCount] = useState(null);

  useEffect(() => {
    const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
    supaSystem
      .from('swarm_discoveries')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since)
      .then(({ count: c }) => {
        if (c != null) setCount(c);
      });
  }, []);

  return count;
}

const NAV = [
  { to: '/swarm',       label: 'Swarm',       icon: Activity,   accent: '#10b981' },
  { to: '/swarm/discoveries', label: 'Discoveries', icon: Lightbulb,  accent: '#58a6ff' },
  { to: '/niches',      label: 'Niches',      icon: Target,     accent: '#d2a8ff' },
  { to: '/studio',      label: 'Ad Studio',   icon: Megaphone,  accent: '#f59e0b' },
];

export default function Sidebar() {
  const loc = useLocation();
  const discoveryCount = useDiscovery24hCount();

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
          const isDiscoveries = to === '/discoveries';
          const isSwarm = to === '/swarm';

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

              {/* Swarm — live dot */}
              {isSwarm && (
                <span style={{
                  marginLeft: 'auto',
                  width: 6, height: 6,
                  borderRadius: '50%',
                  background: 'var(--green)',
                  animation: 'pulse 2s infinite',
                  flexShrink: 0,
                }} />
              )}

              {/* Discoveries — badge count últimas 24h */}
              {isDiscoveries && discoveryCount != null && discoveryCount > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  background: active ? '#58a6ff' : 'rgba(88,166,255,0.2)',
                  color: active ? '#000' : '#58a6ff',
                  borderRadius: 8,
                  padding: '0 5px',
                  fontSize: 9,
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono, monospace',
                  flexShrink: 0,
                }}>
                  {discoveryCount > 99 ? '99+' : discoveryCount}
                </span>
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
