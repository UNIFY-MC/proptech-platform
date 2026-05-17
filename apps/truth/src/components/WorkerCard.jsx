import { formatDistanceToNow } from '../lib/time.js';

// Cores por tipo de worker
const KIND_STYLE = {
  NI:  { bg: 'rgba(88,166,255,0.15)',  color: 'var(--blue)',   label: 'NI' },
  AD:  { bg: 'rgba(245,158,11,0.15)',  color: 'var(--orange)', label: 'AD' },
  REF: { bg: 'rgba(63,185,80,0.15)',   color: 'var(--green)',  label: 'REF' },
  DED: { bg: 'rgba(210,168,255,0.15)', color: 'var(--purple)', label: 'DED' },
  EMT: { bg: 'rgba(244,114,182,0.15)', color: 'var(--pink)',   label: 'EMT' },
  HOK: { bg: 'rgba(227,179,65,0.15)',  color: 'var(--gold)',   label: 'HOK' },
};

const STATUS_DOT = {
  running: 'var(--green)',
  idle:    'var(--dim)',
  dead:    'var(--red)',
  paused:  'var(--muted)',
};

export default function WorkerCard({ worker }) {
  const kind = worker.kind || 'NI';
  const ks = KIND_STYLE[kind] || KIND_STYLE.NI;
  const isRunning = worker.status === 'running';
  const isDead = worker.status === 'dead';

  const nicheLabel = worker.current_niche_id
    ? (worker.current_niche_slug || worker.current_niche_id?.slice(0, 12) + '…')
    : 'sem niche';

  const heartbeatAgo = worker.last_heartbeat
    ? formatDistanceToNow(new Date(worker.last_heartbeat))
    : 'nunca';

  return (
    <div
      title={`${worker.worker_id} · ${worker.status}`}
      style={{
        background: 'var(--surface2)',
        border: `1px solid ${isRunning ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
        borderRadius: 6,
        padding: '8px 9px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        opacity: isDead ? 0.5 : 1,
        transition: 'border-color 0.15s, transform 0.1s',
      }}
    >
      {/* Progress bar no fundo quando running */}
      {isRunning && (
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0,
          height: 2,
          width: '60%',
          background: 'linear-gradient(90deg, var(--truth), #34d399)',
          borderRadius: '0 1px 1px 0',
          animation: 'pulse 2s infinite',
        }} />
      )}

      {/* Cabeçalho: ID + kind badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
      }}>
        <span style={{ color: 'var(--dim)', fontSize: 9, fontWeight: 600 }}>
          {worker.worker_id || '—'}
        </span>
        <span style={{
          fontSize: 8,
          padding: '1px 4px',
          borderRadius: 3,
          fontWeight: 600,
          background: ks.bg,
          color: ks.color,
        }}>
          {ks.label}
        </span>
      </div>

      {/* Niche actual */}
      <div style={{
        color: 'var(--text)',
        fontSize: 10,
        fontWeight: 600,
        marginBottom: 3,
        fontFamily: 'Inter, sans-serif',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {nicheLabel}
      </div>

      {/* Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        color: 'var(--muted)',
        fontSize: 9,
        marginTop: 2,
      }}>
        <span style={{
          width: 5, height: 5,
          borderRadius: '50%',
          background: STATUS_DOT[worker.status] || 'var(--dim)',
          flexShrink: 0,
          animation: isRunning ? 'pulse 2s infinite' : 'none',
        }} />
        {worker.status}
      </div>

      {/* Último heartbeat */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        color: 'var(--dim)',
        fontSize: 8,
        marginTop: 3,
      }}>
        <span>{heartbeatAgo}</span>
        {worker.run_count != null && (
          <span>runs: {worker.run_count}</span>
        )}
      </div>
    </div>
  );
}
