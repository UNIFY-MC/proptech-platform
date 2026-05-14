// TaskResultDrawer — drawer que mostra o resultado de uma task da Bia
// Se a task gerou approval (outreach/triagem), mostra opções aprovar/editar/rejeitar
// Se gerou inbox item (daily_roundup), mostra link para /inbox

import { useEffect, useState } from 'react'
import { useApprovalActions } from '../../hooks/useApprovalActions'
import { fetchApprovalForSession } from '../../hooks/useEmployee'

export default function TaskResultDrawer({ result, taskType, onClose }) {
  const [approval, setApproval] = useState(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const { approveItem, rejectItem, editAndApprove } = useApprovalActions()

  useEffect(() => {
    if (!result?.success) return
    if (taskType === 'daily_roundup') return
    // Buscar approval recente desta sessão
    fetchApprovalForSession(result.session_id).then(a => {
      if (a) {
        setApproval(a)
        setDraft(a.edited_message || a.draft_message || '')
      }
    })
  }, [result, taskType])

  if (!result) return null

  const ok = result.success !== false

  return (
    <div style={{
      position: 'fixed',
      top: 0, right: 0, bottom: 0,
      width: 'min(560px, 100vw)',
      background: 'var(--bg)',
      borderLeft: '1px solid var(--border)',
      boxShadow: '-8px 0 24px rgba(0,0,0,0.18)',
      display: 'flex', flexDirection: 'column',
      zIndex: 1000,
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem',
            color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>Bia · {taskType}</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>
            {ok ? 'Task concluída' : 'Task falhou'}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-dim)', fontSize: '1.4rem', padding: '0 4px',
          }}>×</button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
          marginBottom: 18,
        }}>
          {[
            { label: 'Status', value: ok ? 'OK' : 'ERR', color: ok ? 'var(--success)' : 'var(--danger)' },
            { label: 'Iter', value: result.iterations ?? '—' },
            { label: 'Tokens', value: ((result.tokens?.input || 0) + (result.tokens?.output || 0)) || '—' },
            { label: 'Custo', value: result.cost_eur != null ? `€${result.cost_eur}` : '—', color: 'var(--warning)' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '8px 10px',
            }}>
              <div style={{
                fontSize: '0.52rem', color: 'var(--text-dim)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>{s.label}</div>
              <div style={{
                fontSize: '0.92rem', fontWeight: 700,
                fontFamily: 'JetBrains Mono, monospace',
                color: s.color || 'var(--text)', marginTop: 2,
              }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Erro */}
        {!ok && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid var(--danger)',
            borderRadius: 6, padding: 12, marginBottom: 16,
            color: 'var(--danger)', fontSize: '0.78rem', whiteSpace: 'pre-wrap',
          }}>{result.error}</div>
        )}

        {/* Resposta final da Bia */}
        {result.message && (
          <Section title="Resposta final da Bia">
            <div style={{
              fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.55,
              whiteSpace: 'pre-wrap', padding: 12,
              background: 'var(--bg-card)', borderRadius: 6,
              border: '1px solid var(--border)',
            }}>{result.message}</div>
          </Section>
        )}

        {/* Approval gerada */}
        {approval && (
          <Section title={`Approval ${approval.id.slice(0, 8)}… · ${approval.action_type}`}>
            {!editing ? (
              <div style={{
                fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.6,
                whiteSpace: 'pre-wrap', padding: 12,
                background: 'var(--bg-card)', borderRadius: 6,
                border: '1px solid var(--border)', marginBottom: 10,
              }}>{approval.edited_message || approval.draft_message}</div>
            ) : (
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box', minHeight: 140, padding: 12,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 6, fontSize: '0.78rem', fontFamily: 'inherit',
                  color: 'var(--text)', resize: 'vertical', outline: 'none', marginBottom: 10,
                }} />
            )}

            {approval.classification && Object.keys(approval.classification).length > 0 && (
              <details style={{ marginBottom: 10 }}>
                <summary style={{
                  fontSize: '0.66rem', color: 'var(--text-dim)', cursor: 'pointer',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>Classificação</summary>
                <pre style={{
                  fontSize: '0.7rem', background: 'var(--bg-card)',
                  border: '1px solid var(--border)', borderRadius: 4, padding: 8,
                  margin: '6px 0 0', whiteSpace: 'pre-wrap', color: 'var(--text-dim)',
                }}>{JSON.stringify(approval.classification, null, 2)}</pre>
              </details>
            )}

            {approval.prestador_suggested && (
              <details style={{ marginBottom: 10 }}>
                <summary style={{
                  fontSize: '0.66rem', color: 'var(--text-dim)', cursor: 'pointer',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>Prestador sugerido</summary>
                <pre style={{
                  fontSize: '0.7rem', background: 'var(--bg-card)',
                  border: '1px solid var(--border)', borderRadius: 4, padding: 8,
                  margin: '6px 0 0', whiteSpace: 'pre-wrap', color: 'var(--text-dim)',
                }}>{JSON.stringify(approval.prestador_suggested, null, 2)}</pre>
              </details>
            )}

            {approval.status === 'pending' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {!editing ? (
                  <>
                    <button onClick={() => approveItem(approval.id).then(onClose)} style={btnPrimary}>
                      Aprovar
                    </button>
                    <button onClick={() => setEditing(true)} style={btnGhost}>
                      Editar
                    </button>
                    <button onClick={() => rejectItem(approval.id).then(onClose)} style={btnDanger}>
                      Rejeitar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => editAndApprove(approval.id, draft).then(onClose)}
                      style={btnPrimary}>
                      Guardar e aprovar
                    </button>
                    <button onClick={() => setEditing(false)} style={btnGhost}>
                      Cancelar
                    </button>
                  </>
                )}
              </div>
            )}
            {approval.status !== 'pending' && (
              <div style={{
                fontSize: '0.7rem', color: 'var(--text-dim)', fontStyle: 'italic',
                padding: '8px 0', borderTop: '1px solid var(--border)',
              }}>Estado: <strong>{approval.status}</strong>. Decisão registada.</div>
            )}
          </Section>
        )}

        {/* daily_roundup hint */}
        {ok && taskType === 'daily_roundup' && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 6, padding: 12, marginTop: 16,
            fontSize: '0.75rem', color: 'var(--text-dim)',
          }}>
            Daily roundup escrito em <code style={{
              fontFamily: 'JetBrains Mono, monospace', color: 'var(--info)',
            }}>system.inbox_items</code>. Vê em <strong>/inbox</strong>.
          </div>
        )}

        {/* Session metadata */}
        {result.session_id && (
          <details style={{ marginTop: 18 }}>
            <summary style={{
              fontSize: '0.62rem', color: 'var(--text-dim)', cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>Session metadata</summary>
            <div style={{
              fontSize: '0.66rem', fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--text-dim)', padding: '6px 0',
            }}>
              session_id: {result.session_id}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem',
        color: 'var(--text-dim)', textTransform: 'uppercase',
        letterSpacing: '0.1em', marginBottom: 6,
      }}>{title}</div>
      {children}
    </div>
  )
}

const btnBase = {
  padding: '7px 14px', border: '1px solid var(--border)', borderRadius: 5,
  fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer',
}
const btnPrimary = { ...btnBase, background: 'var(--primary)', color: '#fff', border: 'none' }
const btnGhost = { ...btnBase, background: 'transparent', color: 'var(--text)' }
const btnDanger = { ...btnBase, background: 'transparent', color: 'var(--danger)', borderColor: 'var(--danger)' }
