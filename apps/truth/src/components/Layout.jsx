import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

export default function Layout() {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      <Sidebar />

      {/* Main content area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0,
      }}>
        {/* Topbar */}
        <header style={{
          height: 40,
          background: 'linear-gradient(90deg, #0a0f1c 0%, #16213e 100%)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 12,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            <a href="#" style={{ color: 'var(--blue)', textDecoration: 'none' }}>Dashboard</a>
            <span style={{ color: 'var(--dim)', margin: '0 6px' }}>/</span>
            <span>Truth Engine</span>
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              fontSize: 10,
              color: 'var(--truth)',
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.25)',
              padding: '2px 8px',
              borderRadius: 11,
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--truth)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              LIVE
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px 24px',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
