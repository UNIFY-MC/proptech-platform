import { useSwarmKPIs } from '../hooks/useSwarmKPIs.js';

function DeltaBadge({ delta }) {
  if (delta === null || delta === undefined) return null;
  const up = delta >= 0;
  return (
    <span style={{
      fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
      color: up ? 'var(--green)' : 'var(--red)', marginLeft: 6,
    }}>
      {up ? '↑' : '↓'} {Math.abs(delta)} vs ontem
    </span>
  );
}

const KPIS = [
  {
    key: 'running',
    label: 'AGENTS RUNNING',
    accent: 'var(--truth)',
    format: (v) => (
      <>
        <span style={{ color: v > 0 ? 'var(--green)' : 'var(--dim)' }}>{v}</span>
        <span style={{ fontSize: 14, color: 'var(--muted)' }}>/25</span>
      </>
    ),
    sub: () => 'cron */5min',
    delta: null,
  },
  {
    key: 'listingsHoje',
    label: 'LISTINGS HOJE',
    accent: 'var(--blue)',
    format: (v) => v.toLocaleString('pt-PT'),
    sub: () => 'anúncios processados',
    delta: 'deltaListings',
  },
  {
    key: 'discoveriesHoje',
    label: 'DISCOVERIES HOJE',
    accent: 'var(--orange)',
    format: (v) => v,
    sub: () => 'insights captados',
    delta: 'deltaDiscoveries',
  },
  {
    key: 'niches',
    label: 'NICHES',
    accent: 'var(--purple)',
    format: (v) => v,
    sub: () => 'activos na queue',
    delta: null,
  },
];

export default function KPIBar() {
  const kpis = useSwarmKPIs();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
      {KPIS.map(({ key, label, accent, format, sub, delta: deltaKey }) => {
        const val = kpis[key] ?? 0;
        const delta = deltaKey ? kpis[deltaKey] : null;
        return (
          <div key={key} style={{
            background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%)',
            border: '1px solid var(--border)', borderRadius: 10,
            padding: '14px 16px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0,
              width: 3, height: '100%', background: accent,
            }} />
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 600,
              letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)',
              marginBottom: 4, display: 'flex', alignItems: 'center',
            }}>
              {label}
            </div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 700,
              letterSpacing: '-0.02em', color: kpis.loading ? 'var(--dim)' : 'var(--text)',
            }}>
              {kpis.loading ? '—' : format(val)}
            </div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
              color: 'var(--dim)', marginTop: 2,
              display: 'flex', alignItems: 'center',
            }}>
              {sub(kpis)}
              {!kpis.loading && <DeltaBadge delta={delta} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
