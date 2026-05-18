import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

const TOKENS_DARK = {
  '--bg':       '#0a0f1c',
  '--surface':  '#111827',
  '--surface2': '#1a2233',
  '--surface3': '#232d42',
  '--border':   'rgba(255,255,255,0.06)',
  '--border-s': 'rgba(255,255,255,0.12)',
  '--text':     '#e6edf3',
  '--muted':    '#8b95a8',
  '--dim':      '#5a6376',
};

const TOKENS_LIGHT = {
  '--bg':       '#f0f4f8',
  '--surface':  '#ffffff',
  '--surface2': '#eef1f6',
  '--surface3': '#e2e7ef',
  '--border':   'rgba(0,0,0,0.08)',
  '--border-s': 'rgba(0,0,0,0.14)',
  '--text':     '#111827',
  '--muted':    '#6b7280',
  '--dim':      '#9ca3af',
};

function applyTokens(tokens) {
  const root = document.documentElement;
  Object.entries(tokens).forEach(([k, v]) => root.style.setProperty(k, v));
}

export default function Layout() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('truth-theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    applyTokens(dark ? TOKENS_DARK : TOKENS_LIGHT);
    localStorage.setItem('truth-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      <Sidebar />

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0,
      }}>
        <header style={{
          height: 44,
          background: dark
            ? 'linear-gradient(90deg, #0a0f1c 0%, #16213e 100%)'
            : 'linear-gradient(90deg, #e8edf4 0%, #f0f4f8 100%)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 13,
              fontWeight: 700,
              background: 'linear-gradient(135deg, var(--truth), var(--blue))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Truth Engine
            </span>
            <span style={{
              fontSize: 8, padding: '1px 5px', borderRadius: 3,
              background: 'rgba(16,185,129,0.12)', color: 'var(--truth)',
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
              border: '1px solid rgba(16,185,129,0.25)',
            }}>
              v2
            </span>
          </div>

          <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>
            <a href="#" style={{ color: 'var(--blue)', textDecoration: 'none' }}>Dashboard</a>
            <span style={{ color: 'var(--dim)', margin: '0 5px' }}>/</span>
            <span>Truth Engine</span>
          </span>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              disabled
              title="Workspace switcher — em breve"
              style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 5, padding: '3px 8px', fontSize: 10,
                color: 'var(--dim)', fontFamily: 'JetBrains Mono, monospace',
                cursor: 'not-allowed', opacity: 0.6,
              }}
            >
              proptech-platform ▾
            </button>

            <button
              onClick={() => setDark(d => !d)}
              title={dark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 5, padding: '4px 6px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', color: 'var(--muted)',
              }}
            >
              {dark ? <Sun size={12} /> : <Moon size={12} />}
            </button>

            <div style={{
              fontSize: 10, color: 'var(--truth)',
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.25)',
              padding: '2px 8px', borderRadius: 11,
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: 'var(--truth)', display: 'inline-block',
                animation: 'pulse 2s infinite',
              }} />
              LIVE
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
