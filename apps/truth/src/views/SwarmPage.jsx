import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import KPIBar from '../components/KPIBar.jsx';
import WorkerCard from '../components/WorkerCard.jsx';
import DiscoveryCard from '../components/DiscoveryCard.jsx';
import WorkerDrawer from '../components/WorkerDrawer.jsx';
import { useSwarmWorkers } from '../hooks/useSwarmWorkers.js';
import { useSwarmDiscoveries } from '../hooks/useSwarmDiscoveries.js';

const KIND_FILTERS = ['ALL', 'NI', 'AD', 'REF', 'DED', 'EMT', 'HOK'];

const ARCH_LEGEND = [
  { kind: 'NI',  color: 'var(--blue)',   label: 'Network Intel (Jina)' },
  { kind: 'AD',  color: 'var(--orange)', label: 'Ad Decode (Firecrawl)' },
  { kind: 'REF', color: 'var(--green)',  label: 'Refine Niches (SQL)' },
  { kind: 'DED', color: 'var(--purple)', label: 'Deduplicate (pgvector)' },
  { kind: 'EMT', color: 'var(--truth)',  label: 'Emit Discovery' },
  { kind: 'HOK', color: 'var(--gold)',   label: 'Hook Extract (Claude)' },
];

export default function SwarmPage() {
  const { workers, loading: wLoading, refresh: refreshWorkers } = useSwarmWorkers();
  const { discoveries, loading: dLoading, refresh: refreshDiscoveries, newIds } = useSwarmDiscoveries(20);

  const [selectedWorker, setSelectedWorker] = useState(null);
  const [kindFilter, setKindFilter]         = useState('ALL');

  const filteredWorkers = kindFilter === 'ALL'
    ? workers
    : workers.filter(w => w.kind === kindFilter);

  const runningCount  = workers.filter(w => w.status === 'running').length;
  const idleCount     = workers.filter(w => w.status === 'idle').length;
  const deadCount     = workers.filter(w => w.status === 'dead').length;
  const pausedCount   = workers.filter(w => w.status === 'paused').length;

  return (
    <div style={{ minHeight: '100%' }}>
      {/* Cabecalho */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Swarm</h1>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(63,185,80,0.1)', color: 'var(--green)',
            padding: '3px 9px', borderRadius: 11, fontSize: 10, fontWeight: 600,
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--green)', animation: 'pulse 2s infinite',
            }} />
            LIVE
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              onClick={refreshWorkers}
              title="Actualizar workers"
              style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 5, padding: '4px 8px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                color: 'var(--muted)', fontSize: 11,
              }}
            >
              <RefreshCw size={11} />
            </button>
          </div>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 5, fontFamily: 'JetBrains Mono, monospace' }}>
          {workers.length} workers
          <span style={{ color: 'var(--green)', marginLeft: 8 }}>{runningCount} running</span>
          <span style={{ color: 'var(--dim)', marginLeft: 8 }}>{idleCount} idle</span>
          {deadCount > 0 && <span style={{ color: 'var(--red)', marginLeft: 8 }}>{deadCount} dead</span>}
          {pausedCount > 0 && <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{pausedCount} paused</span>}
          <span style={{ color: 'var(--dim)', marginLeft: 8 }}>· cron */5min · Jina + Claude Haiku</span>
        </p>
      </div>

      {/* KPIs */}
      <KPIBar />

      {/* Filtros por kind */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {KIND_FILTERS.map(k => (
          <button
            key={k}
            onClick={() => setKindFilter(k)}
            style={{
              padding: '3px 10px',
              borderRadius: 4,
              border: '1px solid',
              borderColor: kindFilter === k ? 'var(--truth)' : 'var(--border)',
              background: kindFilter === k ? 'rgba(16,185,129,0.12)' : 'var(--surface2)',
              color: kindFilter === k ? 'var(--truth)' : 'var(--muted)',
              fontSize: 10,
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.1s',
            }}
          >
            {k}
          </button>
        ))}
        <span style={{ fontSize: 10, color: 'var(--dim)', alignSelf: 'center', marginLeft: 4, fontFamily: 'JetBrains Mono, monospace' }}>
          {filteredWorkers.length} / {workers.length}
        </span>
      </div>

      {/* Grid workers + feed discoveries */}
      <div className="swarm-main-layout" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: 18,
      }}>
        {/* Grid 5x5 workers */}
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
              fontSize: 11, fontWeight: 600, color: 'var(--muted)',
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>
              Agent Pool — <strong style={{ color: 'var(--text)' }}>{filteredWorkers.length} workers</strong>
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <LegendDot color="var(--green)" label="running" />
              <LegendDot color="var(--dim)" label="idle" />
              <LegendDot color="var(--red)" label="dead" />
            </div>
          </div>

          {wLoading ? (
            <div style={{ color: 'var(--dim)', fontSize: 12, padding: 20, textAlign: 'center' }}>
              A carregar workers...
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div style={{ color: 'var(--dim)', fontSize: 12, padding: 20, textAlign: 'center' }}>
              {workers.length === 0 ? 'Nenhum worker ainda. O seed ainda não correu.' : `Nenhum worker do tipo ${kindFilter}.`}
            </div>
          ) : (
            <div className="worker-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 8,
            }}>
              {filteredWorkers.map(w => (
                <WorkerCard
                  key={w.id}
                  worker={w}
                  onClick={setSelectedWorker}
                />
              ))}
            </div>
          )}

          {/* Legenda arquitectura */}
          <div style={{
            marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border)',
            display: 'flex', gap: 14, flexWrap: 'wrap',
          }}>
            {ARCH_LEGEND.map(({ kind, color, label }) => (
              <div key={kind} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  fontSize: 8, padding: '1px 4px', borderRadius: 2,
                  fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                  background: color + '22', color,
                }}>
                  {kind}
                </span>
                <span style={{ fontSize: 9, color: 'var(--dim)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feed Live Discoveries */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          maxHeight: 'calc(100vh - 240px)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11, fontWeight: 600, color: 'var(--muted)',
              letterSpacing: '0.04em', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: 'var(--truth)', display: 'inline-block',
                animation: 'pulse 2s infinite',
              }} />
              LIVE · últimas 20
            </span>
            <button
              onClick={refreshDiscoveries}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--dim)', padding: 4, display: 'flex', alignItems: 'center',
              }}
              title="Actualizar discoveries"
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
                <DiscoveryCard
                  key={d.id}
                  discovery={d}
                  isNew={newIds.has(d.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Worker Drawer */}
      {selectedWorker && (
        <WorkerDrawer
          worker={selectedWorker}
          onClose={() => setSelectedWorker(null)}
        />
      )}
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
