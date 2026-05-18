// DedupQueuePage — fila de revisão de duplicados (Clay-inspired)
// Rota: /crm/dedup
// Sprint C2

import { useState } from 'react'
import { useDedupQueue } from '../../hooks/useDedupQueue.js'

// Badge de método de match
function MatchBadge({ method }) {
  const colors = {
    nif:   { bg: 'rgba(26,82,150,0.15)', color: 'var(--blue)',   label: 'NIF' },
    email: { bg: 'rgba(139,101,8,0.15)', color: 'var(--gold)',   label: 'Email' },
    phone: { bg: 'rgba(45,106,79,0.15)', color: 'var(--green)',  label: 'Telefone' },
    fuzzy: { bg: 'rgba(107,79,160,0.15)',color: 'var(--purple)', label: 'Fuzzy' },
  }
  const c = colors[method] ?? colors.fuzzy
  return (
    <span style={{
      background: c.bg,
      color: c.color,
      borderRadius: 4,
      padding: '2px 8px',
      fontSize: 9,
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    }}>
      {c.label}
    </span>
  )
}

// Score badge
function ScoreBadge({ score }) {
  const pct = Math.round((score ?? 0) * 100)
  const color = pct >= 90 ? 'var(--red)' : pct >= 70 ? 'var(--gold)' : 'var(--text-dim)'
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 11,
      fontWeight: 700,
      color,
    }}>
      {pct}%
    </span>
  )
}

// Comparação side-by-side de dois records
function SideBySideComparison({ primary, duplicate }) {
  const COMPARE_FIELDS = [
    { key: 'nome',      label: 'Nome' },
    { key: 'email',     label: 'Email' },
    { key: 'telemovel', label: 'Telefone' },
    { key: 'nif',       label: 'NIF' },
    { key: 'morada',    label: 'Morada' },
    { key: 'created_at',label: 'Criado em' },
  ]

  const fmt = (val, key) => {
    if (val === null || val === undefined || val === '') return '—'
    if (key === 'created_at') return new Date(val).toLocaleDateString('pt-PT')
    return String(val)
  }

  const isDiff = (key) => {
    const a = primary?.[key] ?? ''
    const b = duplicate?.[key] ?? ''
    return a !== b && a !== '' && b !== ''
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 0,
      border: '1px solid var(--border)',
      borderRadius: 6,
      overflow: 'hidden',
    }}>
      {/* Headers */}
      <div style={{
        background: 'rgba(45,106,79,0.08)',
        padding: '8px 12px',
        fontSize: 10,
        fontWeight: 600,
        color: 'var(--green)',
        fontFamily: "'JetBrains Mono', monospace",
        borderBottom: '1px solid var(--border)',
        borderRight: '1px solid var(--border)',
      }}>
        REGISTO PRINCIPAL
      </div>
      <div style={{
        background: 'rgba(139,26,26,0.08)',
        padding: '8px 12px',
        fontSize: 10,
        fontWeight: 600,
        color: 'var(--red)',
        fontFamily: "'JetBrains Mono', monospace",
        borderBottom: '1px solid var(--border)',
      }}>
        DUPLICADO (a eliminar)
      </div>

      {/* Linhas de comparação */}
      {COMPARE_FIELDS.map(f => {
        const diff = isDiff(f.key)
        const rowBg = diff ? 'rgba(255,215,0,0.08)' : 'transparent'
        return [
          <div key={`p-${f.key}`} style={{
            padding: '6px 12px',
            fontSize: 11,
            borderBottom: '1px solid var(--border)',
            borderRight: '1px solid var(--border)',
            background: rowBg,
          }}>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', marginBottom: 2, fontFamily: "'JetBrains Mono', monospace" }}>
              {f.label}
            </div>
            <div style={{
              color: 'var(--text)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: diff ? 600 : 400,
            }}>
              {fmt(primary?.[f.key], f.key)}
            </div>
          </div>,
          <div key={`d-${f.key}`} style={{
            padding: '6px 12px',
            fontSize: 11,
            borderBottom: '1px solid var(--border)',
            background: diff ? 'rgba(255,215,0,0.12)' : 'transparent',
          }}>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', marginBottom: 2, fontFamily: "'JetBrains Mono', monospace" }}>
              {f.label}
            </div>
            <div style={{
              color: diff ? 'var(--gold)' : 'var(--text)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: diff ? 600 : 400,
            }}>
              {fmt(duplicate?.[f.key], f.key)}
            </div>
          </div>,
        ]
      })}
    </div>
  )
}

// Linha expandível da tabela
function DedupRow({ candidate, onMerge, onDistinct, onSkip }) {
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionMsg, setActionMsg] = useState(null)

  const name1 = candidate.primary_record?.nome ?? candidate.primary_id?.slice(0, 8) ?? '—'
  const name2 = candidate.duplicate_record?.nome ?? candidate.duplicate_id?.slice(0, 8) ?? '—'

  const doAction = async (fn, label) => {
    setBusy(true)
    setActionMsg(null)
    const r = await fn()
    if (r?.error) setActionMsg(r.error)
    setBusy(false)
  }

  return (
    <>
      <tr
        style={{
          borderBottom: '1px solid var(--border)',
          cursor: 'pointer',
          background: expanded ? 'var(--surface2)' : 'transparent',
        }}
        onClick={() => setExpanded(v => !v)}
      >
        <td style={{ padding: '10px 12px' }}>
          <MatchBadge method={candidate.match_method ?? 'fuzzy'} />
        </td>
        <td style={{ padding: '10px 12px' }}>
          <ScoreBadge score={candidate.score} />
        </td>
        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text)' }}>
          <span style={{ fontWeight: 500 }}>{name1}</span>
          {candidate.primary_record?.email && (
            <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
              {candidate.primary_record.email}
            </div>
          )}
        </td>
        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text)' }}>
          <span style={{ fontWeight: 500 }}>{name2}</span>
          {candidate.duplicate_record?.email && (
            <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
              {candidate.duplicate_record.email}
            </div>
          )}
        </td>
        <td style={{ padding: '10px 12px', fontSize: 10, color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
          {candidate.created_at ? new Date(candidate.created_at).toLocaleDateString('pt-PT') : '—'}
        </td>
        <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              disabled={busy}
              onClick={() => doAction(() => onMerge(candidate.id, candidate.primary_id, candidate.duplicate_id), 'merge')}
              style={{
                background: 'var(--green)', color: '#fff',
                border: 'none', borderRadius: 4,
                padding: '4px 10px', fontSize: 10, cursor: busy ? 'wait' : 'pointer',
                fontWeight: 600,
              }}
            >
              Fundir
            </button>
            <button
              disabled={busy}
              onClick={() => doAction(() => onDistinct(candidate.id), 'distinct')}
              style={{
                background: 'var(--surface2)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: 4,
                padding: '4px 10px', fontSize: 10, cursor: busy ? 'wait' : 'pointer',
              }}
            >
              Distintos
            </button>
            <button
              disabled={busy}
              onClick={() => doAction(() => onSkip(candidate.id), 'skip')}
              style={{
                background: 'none', color: 'var(--text-dim)',
                border: '1px solid var(--border)', borderRadius: 4,
                padding: '4px 10px', fontSize: 10, cursor: busy ? 'wait' : 'pointer',
              }}
            >
              Ignorar
            </button>
          </div>
          {actionMsg && (
            <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>{actionMsg}</div>
          )}
        </td>
      </tr>

      {/* Linha expandida — comparação side-by-side */}
      {expanded && (
        <tr style={{ background: 'var(--surface2)' }}>
          <td colSpan={6} style={{ padding: '16px 20px' }}>
            <SideBySideComparison
              primary={candidate.primary_record}
              duplicate={candidate.duplicate_record}
            />
            {/* Fontes */}
            <div style={{ marginTop: 10, display: 'flex', gap: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                <strong>Fonte (principal):</strong>{' '}
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {candidate.primary_source ?? 'core.pessoas'}
                </span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                <strong>Fonte (duplicado):</strong>{' '}
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {candidate.duplicate_source ?? 'core.pessoas'}
                </span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function DedupQueuePage() {
  const { candidates, loading, error, merge, markDistinct, skip, reload } = useDedupQueue()

  const pendingCount = candidates.length

  return (
    <div style={{
      padding: '24px 32px',
      maxWidth: 1100,
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <div>
          <h1 style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--text)',
            margin: 0,
          }}>
            Dedup candidates
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
            {loading ? 'A carregar…' : (
              pendingCount === 0
                ? 'Sem candidatos pendentes'
                : `${pendingCount} candidato${pendingCount !== 1 ? 's' : ''} a rever`
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={reload}
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 12,
              color: 'var(--text)',
              cursor: 'pointer',
            }}
          >
            Actualizar
          </button>
          <button
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 12,
              color: 'var(--text)',
              cursor: 'pointer',
            }}
            title="Configuração waterfall — em breve"
          >
            Settings
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(139,26,26,0.1)',
          border: '1px solid var(--red)',
          borderRadius: 6,
          padding: '12px 16px',
          fontSize: 12,
          color: 'var(--red)',
          marginBottom: 16,
        }}>
          Erro: {error}
        </div>
      )}

      {/* Info box — sobre o algoritmo */}
      <div style={{
        background: 'rgba(26,82,150,0.06)',
        border: '1px solid rgba(26,82,150,0.2)',
        borderRadius: 6,
        padding: '10px 14px',
        fontSize: 11,
        color: 'var(--text-dim)',
        marginBottom: 20,
      }}>
        <span style={{ color: 'var(--blue)', fontWeight: 600 }}>Algoritmo waterfall:</span>
        {' '}NIF (canónico) → Email normalizado → Telefone +351 → Fuzzy nome+morada (pg_trgm). Candidatos ambíguos ficam aqui para revisão manual.
        {' '}<span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>core.dedup_candidates</span>
      </div>

      {/* Estado vazio */}
      {!loading && pendingCount === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--text-dim)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
            Sem candidatos pendentes
          </div>
          <div style={{ fontSize: 12 }}>
            O algoritmo waterfall não detectou ambiguidades.
            Os registos são actualizados automaticamente pelo cron <code>crm-dedup-resolve</code>.
          </div>
        </div>
      )}

      {/* Tabela */}
      {!loading && pendingCount > 0 && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
          }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {['Método', 'Score', 'Registo principal', 'Duplicado', 'Detectado', 'Acções'].map(h => (
                  <th key={h} style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    fontSize: 9,
                    fontFamily: "'JetBrains Mono', monospace",
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-dim)',
                    fontWeight: 600,
                    background: 'var(--surface2)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candidates.map(c => (
                <DedupRow
                  key={c.id}
                  candidate={c}
                  onMerge={merge}
                  onDistinct={markDistinct}
                  onSkip={skip}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 32,
          textAlign: 'center',
          color: 'var(--text-dim)',
          fontSize: 13,
        }}>
          A carregar fila dedup…
        </div>
      )}
    </div>
  )
}
