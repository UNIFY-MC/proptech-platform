import { useSwarmKPIs } from '../hooks/useSwarmKPIs.js';

const KPIS = [
  {
    key: 'running',
    label: 'AGENTS RUNNING',
    accent: 'var(--truth)',
    format: v => v,
    sub: 'em processamento',
  },
  {
    key: 'listingsHoje',
    label: 'LISTINGS HOJE',
    accent: 'var(--blue)',
    format: v => v.toLocaleString('pt-PT'),
    sub: 'anúncios processados',
  },
  {
    key: 'discoveriesHoje',
    label: 'DISCOVERIES HOJE',
    accent: 'var(--orange)',
    format: v => v,
    sub: 'insights captados',
  },
  {
    key: 'niches',
    label: 'NICHES',
    accent: 'var(--purple)',
    format: v => v,
    sub: 'activos na queue',
  },
];

export default function KPIBar() {
  const kpis = useSwarmKPIs();

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 12,
      marginBottom: 18,
    }}>
      {KPIS.map(({ key, label, accent, format, sub }) => (
        <div key={key} style={{
          background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '14px 16px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* barra de cor lateral */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0,
            width: 3, height: '100%',
            background: accent,
          }} />
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            marginBottom: 4,
          }}>
            {label}
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: kpis.loading ? 'var(--dim)' : 'var(--text)',
          }}>
            {kpis.loading ? '—' : format(kpis[key])}
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            color: 'var(--dim)',
            marginTop: 2,
          }}>
            {sub}
          </div>
        </div>
      ))}
    </div>
  );
}
