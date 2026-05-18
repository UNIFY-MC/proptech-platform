import { useState, useCallback } from 'react';
import {
  RefreshCw, ChevronLeft, ChevronRight,
  ExternalLink, ChevronDown, ChevronUp,
  CheckSquare, Square, Inbox, RotateCcw,
  Search, X,
} from 'lucide-react';
import { useDiscoveries, useDiscoveriesKPIs } from '../hooks/useDiscoveries.js';
import { useNiches } from '../hooks/useNiches.js';
import { supaSystem } from '../lib/supabase.js';
import { formatDistanceToNow } from '../lib/time.js';

// ──────────────────────────────────────────
// Constantes
// ──────────────────────────────────────────

const KIND_OPTS = [
  { value: 'opportunity', label: 'Oportunidade', color: 'var(--red)' },
  { value: 'competitor',  label: 'Concorrente',  color: 'var(--blue)' },
  { value: 'hook',        label: 'Hook',         color: 'var(--purple)' },
  { value: 'legal',       label: 'Legal',        color: 'var(--gold)' },
  { value: 'pricing',     label: 'Preço',        color: 'var(--green)' },
];

const SIG_OPTS = [
  { value: 'critical', label: 'Crítico', color: 'var(--red)' },
  { value: 'high',     label: 'Alto',    color: '#f59e0b' },
  { value: 'medium',   label: 'Médio',   color: 'var(--gold)' },
  { value: 'low',      label: 'Baixo',   color: 'var(--dim)' },
];

const DATE_OPTS = [
  { value: '24h',  label: 'Últimas 24h' },
  { value: '7d',   label: 'Últimos 7d' },
  { value: '30d',  label: 'Últimos 30d' },
  { value: 'all',  label: 'Todos' },
];

const KIND_META = {
  opportunity: { label: 'OPORTUNIDADE', bg: 'rgba(255,123,114,0.15)', color: 'var(--red)',    border: 'rgba(255,123,114,0.35)' },
  competitor:  { label: 'CONCORRENTE',  bg: 'rgba(88,166,255,0.15)',  color: 'var(--blue)',   border: 'rgba(88,166,255,0.35)' },
  hook:        { label: 'HOOK',         bg: 'rgba(210,168,255,0.15)', color: 'var(--purple)', border: 'rgba(210,168,255,0.35)' },
  legal:       { label: 'LEGAL',        bg: 'rgba(227,179,65,0.15)',  color: 'var(--gold)',   border: 'rgba(227,179,65,0.35)' },
  pricing:     { label: 'PREÇO',        bg: 'rgba(63,185,80,0.15)',   color: 'var(--green)',  border: 'rgba(63,185,80,0.35)' },
};

const SIG_META = {
  critical: { label: 'CRÍTICO', color: 'var(--red)',    bg: 'rgba(255,123,114,0.15)' },
  high:     { label: 'ALTO',    color: '#f59e0b',       bg: 'rgba(245,158,11,0.12)' },
  medium:   { label: 'MÉDIO',   color: 'var(--gold)',   bg: 'rgba(227,179,65,0.12)' },
  low:      { label: 'BAIXO',   color: 'var(--dim)',    bg: 'rgba(90,99,118,0.12)' },
};

// ──────────────────────────────────────────
// Sub-componentes
// ──────────────────────────────────────────

function KPICard({ label, value, sub, accent, loading }) {
  return (
    <div style={{
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
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 26, fontWeight: 700,
        color: loading ? 'var(--dim)' : 'var(--text)',
      }}>
        {loading ? '—' : (value ?? '—')}
      </div>
      {sub && (
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
          color: 'var(--dim)', marginTop: 2,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

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

function MultiSelect({ label, opts, value, onChange }) {
  const [open, setOpen] = useState(false);
  const allSelected = value.length === 0;

  function toggle(v) {
    if (value.includes(v)) {
      onChange(value.filter(x => x !== v));
    } else {
      onChange([...value, v]);
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 5,
          border: '1px solid', borderColor: value.length > 0 ? 'var(--truth)' : 'var(--border)',
          background: value.length > 0 ? 'rgba(16,185,129,0.08)' : 'var(--surface2)',
          color: value.length > 0 ? 'var(--truth)' : 'var(--muted)',
          fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        {label}
        {value.length > 0 && (
          <span style={{
            background: 'var(--truth)', color: '#000',
            borderRadius: 8, padding: '0 5px', fontSize: 9, fontWeight: 700,
          }}>
            {value.length}
          </span>
        )}
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {open && (
        <>
          {/* overlay para fechar ao clicar fora */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 98 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'absolute', top: '110%', left: 0, zIndex: 99,
            background: 'var(--surface)', border: '1px solid var(--border-s)',
            borderRadius: 6, minWidth: 160, padding: '4px 0',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            <button
              onClick={() => { onChange([]); setOpen(false); }}
              style={{
                width: '100%', textAlign: 'left', padding: '6px 12px',
                background: allSelected ? 'rgba(16,185,129,0.1)' : 'transparent',
                color: allSelected ? 'var(--truth)' : 'var(--muted)',
                fontSize: 11, cursor: 'pointer', border: 'none',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              Todos
            </button>
            {opts.map(opt => (
              <button
                key={opt.value}
                onClick={() => toggle(opt.value)}
                style={{
                  width: '100%', textAlign: 'left', padding: '6px 12px',
                  background: value.includes(opt.value) ? 'rgba(16,185,129,0.1)' : 'transparent',
                  color: value.includes(opt.value) ? 'var(--truth)' : 'var(--muted)',
                  fontSize: 11, cursor: 'pointer', border: 'none',
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
                {opt.label}
                {value.includes(opt.value) && (
                  <span style={{ marginLeft: 'auto', color: 'var(--truth)' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ExpandedRow({ d }) {
  return (
    <tr>
      <td
        colSpan={9}
        style={{
          padding: '12px 16px',
          background: 'rgba(16,185,129,0.04)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, fontSize: 11 }}>
          {/* Summary */}
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9, textTransform: 'uppercase',
              color: 'var(--truth)', marginBottom: 6, letterSpacing: '0.06em',
            }}>
              Resumo
            </div>
            <div style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
              {d.summary || '—'}
            </div>
          </div>

          {/* Extracted data */}
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9, textTransform: 'uppercase',
              color: 'var(--truth)', marginBottom: 6, letterSpacing: '0.06em',
            }}>
              Dados extraídos
            </div>
            {d.extracted_data ? (
              <pre style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                color: 'var(--muted)', overflow: 'auto', maxHeight: 120,
                background: 'var(--surface3)', borderRadius: 4, padding: 8,
              }}>
                {JSON.stringify(d.extracted_data, null, 2)}
              </pre>
            ) : (
              <span style={{ color: 'var(--dim)' }}>—</span>
            )}
          </div>

          {/* Meta */}
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9, textTransform: 'uppercase',
              color: 'var(--truth)', marginBottom: 6, letterSpacing: '0.06em',
            }}>
              Meta
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>
              <span style={{ color: 'var(--dim)' }}>worker: <span style={{ color: 'var(--muted)' }}>{d.worker_id || '—'}</span></span>
              <span style={{ color: 'var(--dim)' }}>niche: <span style={{ color: 'var(--muted)' }}>{d.niche_slug || '—'}</span></span>
              <span style={{ color: 'var(--dim)' }}>novelty: <span style={{ color: 'var(--muted)' }}>{d.novelty_score ?? '—'}</span></span>
              <span style={{ color: 'var(--dim)' }}>região: <span style={{ color: 'var(--muted)' }}>{d.region || '—'}</span></span>
              {d.payload && (
                <>
                  <span style={{ color: 'var(--dim)', marginTop: 4 }}>payload:</span>
                  <pre style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                    color: 'var(--muted)', overflow: 'auto', maxHeight: 80,
                    background: 'var(--surface3)', borderRadius: 4, padding: 6,
                  }}>
                    {JSON.stringify(d.payload, null, 2)}
                  </pre>
                </>
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

function DiscoveryRow({ d, isNew, selected, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const tag = KIND_META[d.kind] || KIND_META.hook;
  const sig = SIG_META[d.significance] || null;
  const age = d.created_at ? formatDistanceToNow(new Date(d.created_at)) : '—';

  const rowStyle = {
    background: isNew
      ? 'rgba(16,185,129,0.06)'
      : selected
        ? 'rgba(88,166,255,0.05)'
        : 'transparent',
    borderBottom: '1px solid var(--border)',
    transition: 'background 0.3s',
    animation: isNew ? 'slideInTop 0.35s ease-out' : 'none',
  };

  const cellStyle = {
    padding: '9px 10px',
    fontSize: 11,
    verticalAlign: 'middle',
  };

  return (
    <>
      <tr style={rowStyle}>
        {/* Checkbox */}
        <td style={{ ...cellStyle, width: 32, textAlign: 'center' }}>
          <button
            onClick={() => onToggle(d.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: selected ? 'var(--truth)' : 'var(--dim)',
            }}
          >
            {selected ? <CheckSquare size={13} /> : <Square size={13} />}
          </button>
        </td>

        {/* Hora */}
        <td style={{ ...cellStyle, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--dim)', whiteSpace: 'nowrap' }}>
          {age}
        </td>

        {/* Kind badge */}
        <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
          <span style={{
            fontSize: 8, padding: '2px 6px', borderRadius: 3,
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
            background: tag.bg, color: tag.color,
          }}>
            {tag.label}
          </span>
        </td>

        {/* Título */}
        <td style={{ ...cellStyle, maxWidth: 280 }}>
          <div style={{
            fontWeight: 600, color: 'var(--text)', fontSize: 12,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {d.title || '—'}
          </div>
        </td>

        {/* Niche */}
        <td style={{
          ...cellStyle,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
          color: 'var(--muted)', whiteSpace: 'nowrap',
        }}>
          {d.niche_slug || '—'}
        </td>

        {/* Significance pill */}
        <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
          {sig ? (
            <span style={{
              fontSize: 8, padding: '2px 6px', borderRadius: 3,
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
              background: sig.bg, color: sig.color,
            }}>
              {sig.label}
            </span>
          ) : '—'}
        </td>

        {/* Source URL */}
        <td style={{ ...cellStyle, width: 60 }}>
          {d.source_url ? (
            <a
              href={d.source_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                color: 'var(--muted)', fontSize: 10, textDecoration: 'none',
                padding: '2px 6px', border: '1px solid var(--border)',
                borderRadius: 3, background: 'var(--surface3)',
              }}
            >
              <Favicon url={d.source_url} />
              <ExternalLink size={9} />
            </a>
          ) : (
            <span style={{ color: 'var(--dim)', fontSize: 10 }}>—</span>
          )}
        </td>

        {/* Promoted */}
        <td style={{ ...cellStyle, textAlign: 'center' }}>
          {d.promoted_to_inbox ? (
            <span style={{
              fontSize: 8, padding: '2px 5px', borderRadius: 3,
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
              background: 'rgba(63,185,80,0.15)', color: 'var(--green)',
            }}>
              INBOX
            </span>
          ) : (
            <span style={{ color: 'var(--dim)', fontSize: 9 }}>—</span>
          )}
        </td>

        {/* Expand */}
        <td style={{ ...cellStyle, width: 32, textAlign: 'center' }}>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 2,
              color: expanded ? 'var(--truth)' : 'var(--dim)',
            }}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </td>
      </tr>

      {expanded && <ExpandedRow d={d} />}
    </>
  );
}

// ──────────────────────────────────────────
// Página principal
// ──────────────────────────────────────────

const DEFAULT_FILTERS = {
  niche: '',
  kind: [],
  significance: [],
  dateRange: 'all',
  promoted: null,
};

export default function DiscoveriesPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const { discoveries, total, loading, newIds, refresh, totalPages } = useDiscoveries(filters, page);
  const kpis = useDiscoveriesKPIs();
  const { niches } = useNiches();

  function setFilter(key, val) {
    setFilters(prev => ({ ...prev, [key]: val }));
    setPage(0);
    setSelected(new Set());
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setPage(0);
    setSelected(new Set());
  }

  const hasActiveFilters =
    filters.niche !== '' ||
    filters.kind.length > 0 ||
    filters.significance.length > 0 ||
    filters.dateRange !== 'all' ||
    filters.promoted !== null;

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === discoveries.length && discoveries.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(discoveries.map(d => d.id)));
    }
  }

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function bulkMarkReviewed() {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      const ids = [...selected];
      const { error } = await supaSystem
        .from('swarm_discoveries')
        .update({ reviewed: true })
        .in('id', ids);
      if (error) throw error;
      showToast(`${ids.length} discoveries marcadas como revistas.`);
      setSelected(new Set());
      refresh();
    } catch (err) {
      console.error('[bulkMarkReviewed]', err);
      showToast('Erro ao marcar como revisto.', false);
    } finally {
      setBulkLoading(false);
    }
  }

  async function bulkPromoteToInbox() {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      const ids = [...selected];
      // Actualizar directamente na tabela (edge fn swarm-discovery-emitter será usada quando disponível)
      const { error } = await supaSystem
        .from('swarm_discoveries')
        .update({ promoted_to_inbox: true })
        .in('id', ids);
      if (error) throw error;
      showToast(`${ids.length} discoveries promovidas para Inbox.`);
      setSelected(new Set());
      refresh();
    } catch (err) {
      console.error('[bulkPromoteToInbox]', err);
      showToast('Erro ao promover para inbox.', false);
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100%' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 999,
          background: toast.ok ? 'rgba(63,185,80,0.9)' : 'rgba(255,123,114,0.9)',
          color: '#000', padding: '10px 18px', borderRadius: 8,
          fontSize: 12, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Cabeçalho */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Discoveries</h1>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
            color: 'var(--muted)', paddingTop: 2,
          }}>
            {loading ? '…' : `${total.toLocaleString('pt-PT')} total`}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button
              onClick={refresh}
              title="Actualizar"
              style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 5, padding: '5px 9px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
                color: 'var(--muted)', fontSize: 11,
              }}
            >
              <RefreshCw size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        <KPICard
          label="DISCOVERIES HOJE"
          value={kpis.hoje}
          sub="captadas nas últimas 24h"
          accent="var(--truth)"
          loading={kpis.loading}
        />
        <KPICard
          label="NOVELTY MÉDIO"
          value={kpis.noveltyMedio != null ? String(kpis.noveltyMedio) : '—'}
          sub="score médio (0-1), últimas 100"
          accent="var(--blue)"
          loading={kpis.loading}
        />
        <KPICard
          label="% PARA INBOX"
          value={kpis.promotedPct != null ? `${kpis.promotedPct}%` : '—'}
          sub="promovidas nos últimos 7d"
          accent="var(--purple)"
          loading={kpis.loading}
        />
        <KPICard
          label="CUSTO 7D"
          value={kpis.custo7d != null ? `$${kpis.custo7d}` : '—'}
          sub="via swarm_runs.cost_usd"
          accent="var(--gold)"
          loading={kpis.loading}
        />
      </div>

      {/* Filters bar */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        marginBottom: 14, padding: '10px 12px',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 8,
      }}>
        <Search size={13} color="var(--dim)" style={{ flexShrink: 0 }} />

        {/* Niche */}
        <select
          value={filters.niche}
          onChange={e => setFilter('niche', e.target.value)}
          style={{
            background: filters.niche ? 'rgba(16,185,129,0.08)' : 'var(--surface2)',
            border: '1px solid',
            borderColor: filters.niche ? 'var(--truth)' : 'var(--border)',
            borderRadius: 5, padding: '5px 10px',
            color: filters.niche ? 'var(--truth)' : 'var(--text)',
            fontSize: 11, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
            outline: 'none',
          }}
        >
          <option value="">Todos os niches</option>
          {niches.map(n => (
            <option key={n.id || n.slug} value={n.slug}>{n.name || n.slug}</option>
          ))}
        </select>

        {/* Kind multiselect */}
        <MultiSelect
          label="Tipo"
          opts={KIND_OPTS}
          value={filters.kind}
          onChange={v => setFilter('kind', v)}
        />

        {/* Significance multiselect */}
        <MultiSelect
          label="Relevância"
          opts={SIG_OPTS}
          value={filters.significance}
          onChange={v => setFilter('significance', v)}
        />

        {/* Date range */}
        <select
          value={filters.dateRange}
          onChange={e => setFilter('dateRange', e.target.value)}
          style={{
            background: filters.dateRange !== 'all' ? 'rgba(16,185,129,0.08)' : 'var(--surface2)',
            border: '1px solid',
            borderColor: filters.dateRange !== 'all' ? 'var(--truth)' : 'var(--border)',
            borderRadius: 5, padding: '5px 10px',
            color: filters.dateRange !== 'all' ? 'var(--truth)' : 'var(--text)',
            fontSize: 11, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
            outline: 'none',
          }}
        >
          {DATE_OPTS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Promoted toggle */}
        <button
          onClick={() => {
            const next = filters.promoted === null
              ? true
              : filters.promoted === true
                ? false
                : null;
            setFilter('promoted', next);
          }}
          style={{
            padding: '5px 10px', borderRadius: 5,
            border: '1px solid',
            borderColor: filters.promoted !== null ? 'var(--truth)' : 'var(--border)',
            background: filters.promoted !== null ? 'rgba(16,185,129,0.08)' : 'var(--surface2)',
            color: filters.promoted !== null ? 'var(--truth)' : 'var(--muted)',
            fontSize: 11, cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap',
          }}
        >
          Inbox:{' '}
          {filters.promoted === null ? 'todos' : filters.promoted ? 'sim' : 'não'}
        </button>

        {/* Reset */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            style={{
              padding: '5px 10px', borderRadius: 5, marginLeft: 'auto',
              border: '1px solid var(--border)', background: 'var(--surface2)',
              color: 'var(--muted)', fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            <X size={10} />
            Limpar
          </button>
        )}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          marginBottom: 10, padding: '8px 12px',
          background: 'rgba(88,166,255,0.06)', border: '1px solid rgba(88,166,255,0.2)',
          borderRadius: 6,
        }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--blue)' }}>
            {selected.size} seleccionadas
          </span>
          <button
            onClick={bulkMarkReviewed}
            disabled={bulkLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 5,
              border: '1px solid var(--border)', background: 'var(--surface2)',
              color: 'var(--muted)', fontSize: 11, cursor: bulkLoading ? 'wait' : 'pointer',
              opacity: bulkLoading ? 0.5 : 1,
            }}
          >
            <RotateCcw size={11} />
            Marcar como revisto
          </button>
          <button
            onClick={bulkPromoteToInbox}
            disabled={bulkLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 5,
              border: '1px solid rgba(63,185,80,0.3)',
              background: 'rgba(63,185,80,0.08)',
              color: 'var(--green)', fontSize: 11, cursor: bulkLoading ? 'wait' : 'pointer',
              fontWeight: 600, opacity: bulkLoading ? 0.5 : 1,
            }}
          >
            <Inbox size={11} />
            Promover para Inbox
          </button>
          <button
            onClick={() => setSelected(new Set())}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              color: 'var(--dim)', fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <X size={10} />
            Cancelar
          </button>
        </div>
      )}

      {/* Tabela */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 8, overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{
            padding: 40, textAlign: 'center',
            color: 'var(--dim)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
          }}>
            A carregar…
          </div>
        ) : discoveries.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>
              Sem descobertas com estes filtros
            </div>
            <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 16 }}>
              Ajusta os filtros ou aguarda o próximo ciclo do swarm (*/5min).
            </div>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                style={{
                  padding: '7px 16px', borderRadius: 6,
                  border: '1px solid var(--truth)', background: 'rgba(16,185,129,0.1)',
                  color: 'var(--truth)', fontSize: 12, cursor: 'pointer',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={thStyle}>
                    <button
                      onClick={selectAll}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        color: selected.size > 0 && selected.size === discoveries.length
                          ? 'var(--truth)'
                          : 'var(--dim)',
                      }}
                    >
                      {selected.size === discoveries.length && discoveries.length > 0
                        ? <CheckSquare size={13} />
                        : <Square size={13} />}
                    </button>
                  </th>
                  <th style={thStyle}>HORA</th>
                  <th style={thStyle}>TIPO</th>
                  <th style={{ ...thStyle, textAlign: 'left', paddingLeft: 10 }}>TÍTULO</th>
                  <th style={thStyle}>NICHE</th>
                  <th style={thStyle}>RELEV.</th>
                  <th style={thStyle}>FONTE</th>
                  <th style={thStyle}>INBOX</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {discoveries.map(d => (
                  <DiscoveryRow
                    key={d.id}
                    d={d}
                    isNew={newIds.has(d.id)}
                    selected={selected.has(d.id)}
                    onToggle={toggleSelect}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginTop: 14,
          justifyContent: 'center',
        }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={paginationBtnStyle(page === 0)}
          >
            <ChevronLeft size={13} />
          </button>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--muted)',
          }}>
            {page + 1} / {totalPages}
            <span style={{ color: 'var(--dim)', marginLeft: 6 }}>({total.toLocaleString('pt-PT')} total)</span>
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={paginationBtnStyle(page >= totalPages - 1)}
          >
            <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────
// Estilos estáticos
// ──────────────────────────────────────────

const thStyle = {
  padding: '8px 10px',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 8,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--dim)',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  background: 'var(--surface2)',
};

function paginationBtnStyle(disabled) {
  return {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 5, padding: '5px 8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center',
    color: disabled ? 'var(--dim)' : 'var(--muted)',
    opacity: disabled ? 0.4 : 1,
  };
}
