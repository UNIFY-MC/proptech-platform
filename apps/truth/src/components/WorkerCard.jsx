import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from '../lib/time.js';

const KIND_STYLE = {
  NI:  { bg: 'rgba(88,166,255,0.15)',  color: 'var(--blue)',   border: 'rgba(88,166,255,0.4)',   label: 'NI',  tool: 'Jina' },
  AD:  { bg: 'rgba(245,158,11,0.15)',  color: 'var(--orange)', border: 'rgba(245,158,11,0.4)',   label: 'AD',  tool: 'firecrawl' },
  REF: { bg: 'rgba(63,185,80,0.15)',   color: 'var(--green)',  border: 'rgba(63,185,80,0.4)',    label: 'REF', tool: 'postgres' },
  DED: { bg: 'rgba(210,168,255,0.15)', color: 'var(--purple)', border: 'rgba(210,168,255,0.4)',  label: 'DED', tool: 'pgvector' },
  EMT: { bg: 'rgba(16,185,129,0.15)',  color: 'var(--truth)',  border: 'rgba(16,185,129,0.4)',   label: 'EMT', tool: 'emit' },
  HOK: { bg: 'rgba(227,179,65,0.15)',  color: 'var(--gold)',   border: 'rgba(227,179,65,0.4)',   label: 'HOK', tool: 'Claude' },
};

const ACTION_LABEL = {
  NI: 'scraping...', AD: 'extracting ads...', REF: 'refining niches...',
  DED: 'embedding...', EMT: 'scoring novelty...', HOK: 'extracting hooks...',
};

function calcProgress(startedAt) {
  if (!startedAt) return 0;
  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
  return Math.min(elapsed / 300, 1) * 100;
}

export default function WorkerCard({ worker, onClick }) {
  const kind = worker.kind || 'NI';
  const ks = KIND_STYLE[kind] || KIND_STYLE.NI;
  const isRunning = worker.status === 'running';
  const isDead    = worker.status === 'dead';
  const isPaused  = worker.status === 'paused';

  const [flashing, setFlashing] = useState(false);
  const prevStatusRef = useRef(worker.status);
  const prevNicheRef  = useRef(worker.current_niche_id);

  useEffect(() => {
    const changed = prevStatusRef.current !== worker.status || prevNicheRef.current !== worker.current_niche_id;
    if (changed) {
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 800);
      prevStatusRef.current = worker.status;
      prevNicheRef.current  = worker.current_niche_id;
      return () => clearTimeout(t);
    }
  }, [worker.status, worker.current_niche_id]);

  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!isRunning) { setProgress(0); return; }
    const tick = () => setProgress(calcProgress(worker.last_heartbeat));
    tick();
    const iv = setInterval(tick, 2000);
    return () => clearInterval(iv);
  }, [isRunning, worker.last_heartbeat]);

  const nicheRaw = worker.current_niche_slug || worker.current_niche_id || 'sem niche';
  const nicheLabel = nicheRaw.length > 18 ? nicheRaw.slice(0, 16) + '…' : nicheRaw;
  const heartbeatAgo = worker.last_heartbeat ? formatDistanceToNow(new Date(worker.last_heartbeat)) : 'nunca';
  const tooltipText = `${worker.id}\nniche: ${nicheRaw}\nstatus: ${worker.status}\nruns: ${worker.run_count ?? 0}`;
  const borderColor = flashing ? ks.color : isRunning ? ks.border : 'var(--border)';

  return (
    <div
      title={tooltipText}
      onClick={() => onClick && onClick(worker)}
      style={{
        background: flashing ? ks.bg : 'var(--surface2)',
        border: `1px solid ${borderColor}`,
        borderRadius: 6, padding: '8px 9px',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        opacity: isDead ? 0.45 : isPaused ? 0.6 : 1,
        transition: 'background 0.15s, border-color 0.15s, transform 0.1s',
        boxShadow: flashing ? `0 0 8px ${ks.color}44` : 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.borderColor = ks.color; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = borderColor; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: 'var(--dim)', fontSize: 9, fontWeight: 600 }}>{worker.id || '—'}</span>
        <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, fontWeight: 600, background: ks.bg, color: ks.color }}>
          {ks.label}
        </span>
      </div>

      <div style={{
        color: 'var(--text)', fontSize: 10, fontWeight: 600, marginBottom: 3,
        fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {nicheLabel}
      </div>

      <div style={{ color: ks.color, fontSize: 9, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
        <span>{isPaused ? '⏸' : isRunning ? '●' : '○'}</span>
        {isPaused ? 'paused' : ks.tool}
      </div>

      {isRunning && (
        <div style={{ color: 'var(--muted)', fontSize: 9, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ACTION_LABEL[kind] || 'running...'}
        </div>
      )}

      <div style={{ height: 2, background: 'var(--surface3)', borderRadius: 1, marginTop: 4, overflow: 'hidden' }}>
        {isRunning && (
          <div style={{
            height: '100%', width: `${progress}%`,
            background: `linear-gradient(90deg, ${ks.color}, ${ks.color}88)`,
            borderRadius: 1, transition: 'width 2s linear',
          }} />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--dim)', fontSize: 8, marginTop: 3 }}>
        <span>{worker.run_count != null ? `#${worker.run_count}` : '—'}</span>
        <span>{heartbeatAgo}</span>
      </div>
    </div>
  );
}
