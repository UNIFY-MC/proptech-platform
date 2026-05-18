import { X, Play, Clock, AlertTriangle } from 'lucide-react';
import { useWorkerRuns } from '../hooks/useWorkerRuns.js';
import { formatDistanceToNow } from '../lib/time.js';

const KIND_COLOR = {
  NI:  'var(--blue)',
  AD:  'var(--orange)',
  REF: 'var(--green)',
  DED: 'var(--purple)',
  EMT: 'var(--truth)',
  HOK: 'var(--gold)',
};

const STATUS_COLOR = {
  running: 'var(--green)',
  idle:    'var(--dim)',
  dead:    'var(--red)',
  paused:  'var(--muted)',
};

function eur(v) {
  if (v == null) return '—';
  const val = typeof v === 'number' ? v : parseFloat(v);
  return isNaN(val) ? '—' : val.toFixed(4) + ' €';
}

function eurFromCents(cents) {
  if (cents == null) return '—';
  return eur(cents / 100);
}

function fdt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function WorkerDrawer({ worker, onClose }) {
  const { runs, loading } = useWorkerRuns(worker?.id, 10);

  if (!worker) return null;

  const kind = worker.kind || 'NI';
  const kindColor = KIND_COLOR[kind] || 'var(--blue)';
  const statusColor = STATUS_COLOR[worker.status] || 'var(--dim)';

  const totalCost7d = runs
    .filter(r => {
      const d = new Date(r.started_at);
      return d > new Date(Date.now() - 7 * 86_400_000);
    })
    .reduce((s, r) => s + (r.cost_eur || 0), 0);

  const avgCostPerRun = runs.length > 0
    ? runs.reduce((s, r) => s + (r.cost_eur || 0), 0) / runs.length
    : 0;

  return (
    <>
      {/* Overlay fundo */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 40,
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed',
        top: 0, right: 0,
        width: 480,
        height: '100vh',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border-s)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 18, fontWeight: 700,
            color: kindColor,
          }}>
            {worker.id || '—'}
          </span>
          <span style={{
            fontSize: 9, padding: '2px 6px', borderRadius: 3,
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
            background: kindColor + '22',
            color: kindColor,
          }}>
            {kind}
          </span>
          <span style={{
            fontSize: 11, color: statusColor,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: statusColor,
              animation: worker.status === 'running' ? 'pulse 2s infinite' : 'none',
            }} />
            {worker.status}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button
              title="Forçar run (Sprint B3)"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 10px',
                background: 'rgba(63,185,80,0.1)',
                border: '1px solid rgba(63,185,80,0.3)',
                borderRadius: 5, color: 'var(--green)',
                fontSize: 11, cursor: 'not-allowed', opacity: 0.5,
              }}
            >
              <Play size={11} /> Force run
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--muted)', padding: 4,
                display: 'flex', alignItems: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Corpo scrollável */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

          {/* Niche actual */}
          <Section title="NICHE ACTUAL">
            <Row label="Slug" value={worker.current_niche_slug || worker.current_niche_id || '—'} mono />
            <Row label="Último heartbeat" value={worker.last_heartbeat ? formatDistanceToNow(new Date(worker.last_heartbeat)) : '—'} />
            <Row label="Runs totais" value={worker.run_count ?? '—'} mono />
          </Section>

          {/* Custo resumo */}
          <Section title="CUSTO (últimos 7d)">
            <Row label="Total" value={eur(totalCost7d)} mono />
            <Row label="Médio por run" value={eur(avgCostPerRun)} mono />
          </Section>

          {/* Histórico de runs */}
          <Section title={`ÚLTIMAS RUNS (${loading ? '...' : runs.length})`}>
            {loading ? (
              <div style={{ color: 'var(--dim)', fontSize: 11, padding: '12px 0' }}>A carregar...</div>
            ) : runs.length === 0 ? (
              <div style={{ color: 'var(--dim)', fontSize: 11, padding: '12px 0' }}>
                Nenhuma run registada ainda.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%', borderCollapse: 'collapse',
                  fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
                }}>
                  <thead>
                    <tr style={{ color: 'var(--dim)', textAlign: 'left' }}>
                      <Th>Hora</Th>
                      <Th>Niche</Th>
                      <Th>Status</Th>
                      <Th>List.</Th>
                      <Th>Disc.</Th>
                      <Th>Custo</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map(r => (
                      <tr key={r.id} style={{
                        borderTop: '1px solid var(--border)',
                        color: r.error_message ? 'var(--red)' : 'var(--text)',
                      }}>
                        <Td mono>{fdt(r.started_at)}</Td>
                        <Td mono>{(r.niche_slug || '—').slice(0, 16)}</Td>
                        <Td>
                          <span style={{
                            color: r.status === 'done' ? 'var(--green)'
                              : r.status === 'error' ? 'var(--red)'
                              : 'var(--orange)',
                          }}>
                            {r.status || '—'}
                          </span>
                          {(r.error || r.error_message) && (
                            <AlertTriangle size={10} style={{ marginLeft: 4, color: 'var(--red)' }} />
                          )}
                        </Td>
                        <Td mono>{r.listings_count ?? 0}</Td>
                        <Td mono>{r.discoveries_count ?? 0}</Td>
                        <Td mono>{r.cost_eur_cents != null ? eurFromCents(r.cost_eur_cents) : eur(r.cost_eur)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Definições (placeholder B3) */}
          <Section title="DEFINIÇÕES (Sprint B3)">
            <div style={{
              background: 'var(--surface2)',
              border: '1px dashed var(--border-s)',
              borderRadius: 6, padding: '10px 12px',
              color: 'var(--dim)', fontSize: 11, lineHeight: 1.6,
            }}>
              Configuração de interval, max_concurrent e prioridade disponível em Sprint B3.
            </div>
          </Section>

        </div>
      </div>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 9, fontWeight: 600,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        color: 'var(--dim)', marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '5px 0', borderBottom: '1px solid var(--border)',
      fontSize: 11,
    }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{
        fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit',
        color: 'var(--text)',
      }}>
        {value}
      </span>
    </div>
  );
}

function Th({ children }) {
  return (
    <th style={{
      padding: '4px 6px',
      fontSize: 8, fontWeight: 600,
      letterSpacing: '0.04em', textTransform: 'uppercase',
      color: 'var(--dim)', whiteSpace: 'nowrap',
    }}>
      {children}
    </th>
  );
}

function Td({ children, mono }) {
  return (
    <td style={{
      padding: '5px 6px',
      fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit',
      fontSize: 11, whiteSpace: 'nowrap',
    }}>
      {children}
    </td>
  );
}
