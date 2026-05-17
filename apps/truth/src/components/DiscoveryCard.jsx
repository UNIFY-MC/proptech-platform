import { ExternalLink, Plus } from 'lucide-react';
import { formatDistanceToNow } from '../lib/time.js';

const KIND_TAG = {
  opportunity: { label: 'OPORTUNIDADE', bg: 'rgba(255,123,114,0.15)', color: 'var(--red)' },
  competitor:  { label: 'CONCORRENTE',  bg: 'rgba(88,166,255,0.15)',  color: 'var(--blue)' },
  hook:        { label: 'HOOK',         bg: 'rgba(210,168,255,0.15)', color: 'var(--purple)' },
  legal:       { label: 'LEGAL',        bg: 'rgba(227,179,65,0.15)',  color: 'var(--gold)' },
  pricing:     { label: 'PREÇO',        bg: 'rgba(63,185,80,0.15)',   color: 'var(--green)' },
};

const SIG_COLOR = {
  high:   'var(--red)',
  medium: 'var(--orange)',
  low:    'var(--dim)',
};

export default function DiscoveryCard({ discovery }) {
  const tag = KIND_TAG[discovery.kind] || KIND_TAG.hook;
  const age = discovery.created_at
    ? formatDistanceToNow(new Date(discovery.created_at))
    : '—';

  return (
    <div style={{
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '10px',
      marginBottom: 8,
      cursor: 'pointer',
      transition: 'border-color 0.1s',
    }}>
      {/* Header: tag + worker + idade */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{
          fontSize: 8,
          padding: '1px 5px',
          borderRadius: 3,
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 700,
          background: tag.bg,
          color: tag.color,
        }}>
          {tag.label}
        </span>
        {discovery.worker_id && (
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9,
            color: 'var(--dim)',
          }}>
            {discovery.worker_id}
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: 'var(--dim)', fontSize: 10 }}>
          {age}
        </span>
      </div>

      {/* Título */}
      <div style={{
        fontSize: 12,
        fontWeight: 600,
        marginBottom: 3,
        lineHeight: 1.3,
      }}>
        {discovery.title || 'Sem título'}
      </div>

      {/* Resumo */}
      {discovery.summary && (
        <div style={{
          fontSize: 11,
          color: 'var(--muted)',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {discovery.summary}
        </div>
      )}

      {/* Niche + significance + actions */}
      <div style={{ display: 'flex', gap: 4, marginTop: 8, alignItems: 'center' }}>
        {discovery.niche_slug && (
          <span style={{
            fontSize: 9,
            padding: '1px 5px',
            borderRadius: 3,
            background: 'var(--surface3)',
            color: 'var(--muted)',
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            {discovery.niche_slug}
          </span>
        )}
        {discovery.significance && (
          <span style={{
            fontSize: 9,
            fontFamily: 'JetBrains Mono, monospace',
            color: SIG_COLOR[discovery.significance] || 'var(--dim)',
            marginLeft: 2,
          }}>
            {discovery.significance}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {discovery.source_url && (
            <a
              href={discovery.source_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                padding: '3px 8px',
                border: '1px solid var(--border)',
                borderRadius: 4,
                background: 'var(--surface3)',
                color: 'var(--muted)',
                fontSize: 10,
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={10} />
              fonte
            </a>
          )}
          <button
            onClick={e => { e.stopPropagation(); /* Sprint B2 — Add to CRM */ }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '3px 8px',
              border: '1px solid var(--border)',
              borderRadius: 4,
              background: 'var(--surface3)',
              color: 'var(--muted)',
              fontSize: 10,
              cursor: 'pointer',
            }}
          >
            <Plus size={10} />
            CRM
          </button>
        </div>
      </div>
    </div>
  );
}
