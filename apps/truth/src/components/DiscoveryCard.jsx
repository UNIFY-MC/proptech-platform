import { ExternalLink, Plus, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from '../lib/time.js';

const KIND_TAG = {
  opportunity: { label: 'OPORTUNIDADE', bg: 'rgba(255,123,114,0.15)', color: 'var(--red)',    border: 'rgba(255,123,114,0.35)' },
  competitor:  { label: 'CONCORRENTE',  bg: 'rgba(88,166,255,0.15)',  color: 'var(--blue)',   border: 'rgba(88,166,255,0.35)' },
  hook:        { label: 'HOOK',         bg: 'rgba(210,168,255,0.15)', color: 'var(--purple)', border: 'rgba(210,168,255,0.35)' },
  legal:       { label: 'LEGAL',        bg: 'rgba(227,179,65,0.15)',  color: 'var(--gold)',   border: 'rgba(227,179,65,0.35)' },
  pricing:     { label: 'PREÇO',        bg: 'rgba(63,185,80,0.15)',   color: 'var(--green)',  border: 'rgba(63,185,80,0.35)' },
};

const SIG_STYLE = {
  high:   { color: 'var(--red)',    bg: 'rgba(255,123,114,0.12)', label: 'HIGH' },
  medium: { color: 'var(--gold)',   bg: 'rgba(227,179,65,0.12)',  label: 'MED' },
  low:    { color: 'var(--dim)',    bg: 'rgba(90,99,118,0.12)',   label: 'LOW' },
};

function Favicon({ url }) {
  if (!url) return null;
  try {
    const domain = new URL(url).hostname;
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
        width={12} height={12}
        style={{ borderRadius: 2, flexShrink: 0 }}
        onError={e => { e.currentTarget.style.display = 'none'; }}
        alt=""
      />
    );
  } catch {
    return null;
  }
}

export default function DiscoveryCard({ discovery, isNew }) {
  const tag = KIND_TAG[discovery.kind] || KIND_TAG.hook;
  const sig = SIG_STYLE[discovery.significance] || null;
  const age = discovery.created_at
    ? formatDistanceToNow(new Date(discovery.created_at))
    : '—';

  function handleAddCRM(e) {
    e.stopPropagation();
    if (discovery.empresa_id) {
      window.open(`/crm/empresas/${discovery.empresa_id}`, '_blank');
    } else {
      alert('Nenhuma empresa associada a esta discovery.');
    }
  }

  function handleGerarAd(e) {
    e.stopPropagation();
    alert('Gerar Ad — disponível no Sprint B3.');
  }

  return (
    <div style={{
      background: 'var(--surface2)',
      border: `1px solid ${tag.border}`,
      borderLeft: `3px solid ${tag.color}`,
      borderRadius: 6,
      padding: '10px 10px 10px 12px',
      marginBottom: 8,
      cursor: 'default',
      transition: 'border-color 0.1s',
      animation: isNew ? 'slideInRight 0.3s ease-out' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{
          fontSize: 8, padding: '1px 5px', borderRadius: 3,
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
          background: tag.bg, color: tag.color,
        }}>
          {tag.label}
        </span>
        {discovery.worker_id && (
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--dim)' }}>
            {discovery.worker_id}
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: 'var(--dim)', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}>
          {age}
        </span>
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, lineHeight: 1.35, color: 'var(--text)' }}>
        {discovery.title || 'Sem título'}
      </div>

      {discovery.summary && (
        <div style={{
          fontSize: 11, color: 'var(--muted)', lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', marginBottom: 8,
        }}>
          {discovery.summary}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
        {discovery.niche_slug && (
          <span style={{
            fontSize: 9, padding: '1px 5px', borderRadius: 3,
            background: 'var(--surface3)', color: 'var(--muted)',
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            {discovery.niche_slug}
          </span>
        )}
        {discovery.region && (
          <span style={{
            fontSize: 9, padding: '1px 5px', borderRadius: 3,
            background: 'var(--surface3)', color: 'var(--dim)',
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            {discovery.region}
          </span>
        )}
        {sig && (
          <span style={{
            fontSize: 8, padding: '1px 5px', borderRadius: 3,
            background: sig.bg, color: sig.color,
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
          }}>
            {sig.label}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {discovery.source_url && (
          <a
            href={discovery.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 7px', border: '1px solid var(--border)',
              borderRadius: 4, background: 'var(--surface3)',
              color: 'var(--muted)', fontSize: 10, textDecoration: 'none',
            }}
          >
            <Favicon url={discovery.source_url} />
            <ExternalLink size={10} />
            fonte
          </a>
        )}
        <button
          onClick={handleAddCRM}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '3px 7px', border: '1px solid var(--border)',
            borderRadius: 4, background: 'var(--surface3)',
            color: 'var(--muted)', fontSize: 10, cursor: 'pointer',
          }}
        >
          <Plus size={10} />
          CRM
        </button>
        <button
          onClick={handleGerarAd}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '3px 7px', border: '1px solid var(--border)',
            borderRadius: 4, background: 'var(--surface3)',
            color: 'var(--muted)', fontSize: 10, cursor: 'pointer',
          }}
        >
          <TrendingUp size={10} />
          Ad
        </button>
      </div>
    </div>
  );
}
