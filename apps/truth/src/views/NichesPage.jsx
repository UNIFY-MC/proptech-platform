import { Target } from 'lucide-react';
import { useNiches } from '../hooks/useNiches.js';

export default function NichesPage() {
  const { niches, loading } = useNiches();

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Niches</h1>
        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 5 }}>
          Segmentos de mercado monitorados pelo swarm.
          <span style={{ fontFamily: 'JetBrains Mono, monospace', marginLeft: 8, fontSize: 10, color: 'var(--dim)' }}>
            [edição completa — Sprint B3]
          </span>
        </p>
      </div>

      {loading ? (
        <div style={{ color: 'var(--dim)', fontSize: 12 }}>A carregar...</div>
      ) : niches.length === 0 ? (
        <div style={{ color: 'var(--dim)', fontSize: 12 }}>Nenhum niche encontrado.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {niches.map(n => (
            <div key={n.id} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '12px 14px',
            }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                {n.name || n.slug}
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9, color: 'var(--dim)', marginBottom: 6,
              }}>
                {n.slug}
              </div>
              {n.description && (
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                  {n.description}
                </div>
              )}
              <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                <span style={{
                  fontSize: 9, padding: '1px 6px', borderRadius: 3,
                  background: n.status === 'active' ? 'rgba(16,185,129,0.15)' : 'var(--surface2)',
                  color: n.status === 'active' ? 'var(--truth)' : 'var(--dim)',
                  fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
                }}>
                  {n.status}
                </span>
                {n.vertical && (
                  <span style={{
                    fontSize: 9, padding: '1px 6px', borderRadius: 3,
                    background: 'var(--surface2)', color: 'var(--muted)',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>
                    {n.vertical}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
