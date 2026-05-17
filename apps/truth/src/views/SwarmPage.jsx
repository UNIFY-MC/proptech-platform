import { RefreshCw } from 'lucide-react';
import KPIBar from '../components/KPIBar.jsx';
import WorkerCard from '../components/WorkerCard.jsx';
import DiscoveryCard from '../components/DiscoveryCard.jsx';
import { useSwarmWorkers } from '../hooks/useSwarmWorkers.js';
import { useSwarmDiscoveries } from '../hooks/useSwarmDiscoveries.js';

export default function SwarmPage() {
  const { workers, loading: wLoading } = useSwarmWorkers();
  const { discoveries, loading: dLoading, refresh } = useSwarmDiscoveries(20);

  return (
    <div style={{ minHeight: '100%' }}>
      {/* Cabeçalho da página */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Swarm</h1>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(63,185,80,0.1)', color: 'var(--green)',
            padding: '3px 9px', borderRadius: 11, fontSize: 10, fontWeight: 600,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--green)', animation: 'pulse 2s infinite',
            }} />
            LIVE
          </div>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 5 }}>
          {workers.length} workers · cron */5min · Jina Reader + Claude Haiku
        </p>
      </div>

      {/* KPIs */}
      <KPIBar />

      {/* Grid workers + feed discoveries */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        gap: 18,
      }}>
        {/* Grid 5×5 workers */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 14,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)',
          }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12, fontWeight: 600, color: 'var(--muted)',
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>
              Agent Pool — <strong style={{ color: 'var(--text)' }}>{workers.length} workers</strong>
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <LegendDot color="var(--truth)" label="running" />
              <LegendDot color="var(--dim)" label="idle" />
              <LegendDot color="var(--red)" label="dead" />
            </div>
          </div>

          {wLoading ? (
            <div style={{ color: 'var(--dim)', fontSize: 12, padding: 20, textAlign: 'center' }}>
              A carregar workers...
            </div>
          ) : workers.length === 0 ? (
            <div style={{ color: 'var(--dim)', fontSize: 12, padding: 20, textAlign: 'center' }}>
              Nenhum worker ainda. O seed ainda não correu.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 8,
            }}>
              {workers.map(w => (
                <WorkerCard key={w.id} worker={w} />
              ))}
            </div>
          )}
        </div>

        {/* Feed Live Discoveries */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 280px)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12, fontWeight: 600, color: 'var(--muted)',
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>
              Live Discoveries
            </span>
            <button
              onClick={refresh}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--dim)', padding: 4, display: 'flex', alignItems: 'center',
              }}
              title="Actualizar"
            >
              <RefreshCw size={12} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {dLoading ? (
              <div style={{ color: 'var(--dim)', fontSize: 12, padding: 20, textAlign: 'center' }}>
                A carregar...
              </div>
            ) : discoveries.length === 0 ? (
              <div style={{
                color: 'var(--dim)', fontSize: 11, padding: '20px 10px', textAlign: 'center',
                lineHeight: 1.6,
              }}>
                Nenhuma discovery ainda.<br />
                O cron corre a cada 5 min.<br />
                Sites com anti-bot retornam 403.
              </div>
            ) : (
              discoveries.map(d => (
                <DiscoveryCard key={d.id} discovery={d} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'var(--dim)' }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: color, display: 'inline-block',
      }} />
      {label}
    </div>
  );
}
