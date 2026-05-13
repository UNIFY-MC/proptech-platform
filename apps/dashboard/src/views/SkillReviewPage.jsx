// SkillReviewPage — /skills/review
// Lista skills em status='review' (propostas auto-geradas por agents) +
// permite Activar (push para 'active') ou Arquivar.
// Botão "Propor skill" abre modal para Mário pedir manualmente uma skill nova.

import { useState } from 'react'
import { Sparkles, Check, Archive, X, Wand2 } from 'lucide-react'
import { useSkillReview, proposeSkill } from '../hooks/useSkillReview.js'

function SchemaPreview({ label, schema }) {
  if (!schema || typeof schema !== 'object') return null
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4 }}>
        {label}
      </div>
      <pre style={{
        fontSize: '0.62rem', fontFamily: 'JetBrains Mono, monospace',
        color: 'var(--text-dim)', background: 'var(--bg-elevated)',
        padding: 8, borderRadius: 4, margin: 0,
        maxHeight: 140, overflow: 'auto',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>{JSON.stringify(schema, null, 2)}</pre>
    </div>
  )
}

function ProposeModal({ onClose, onProposed }) {
  const [intent, setIntent] = useState('')
  const [agentId, setAgentId] = useState('manual')
  const [context, setContext] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!intent.trim()) return
    setBusy(true)
    setResult(null)
    const res = await proposeSkill({ intent: intent.trim(), agentId: agentId.trim() || 'manual', context: context.trim() })
    setResult(res)
    setBusy(false)
    if (res.ok) {
      onProposed?.()
      setTimeout(onClose, 1500)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 20, width: 540, maxWidth: '90vw',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Wand2 size={16} color="var(--primary)" />
            Propor skill nova
          </h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={16} /></button>
        </div>

        <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: '0 0 12px', lineHeight: 1.5 }}>
          Descreve a intenção — o agent vai desenhar a skill (slug, schemas, prompt) e submetê-la para a tua aprovação.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            value={intent} onChange={e => setIntent(e.target.value)}
            placeholder="Ex: extrair total + IVA de PDF de fatura de electricidade portuguesa"
            rows={3} autoFocus required
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={agentId} onChange={e => setAgentId(e.target.value)}
              placeholder="Agent solicitante (ex: bia, financeiro-condo)"
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
          <textarea
            value={context} onChange={e => setContext(e.target.value)}
            placeholder="Contexto extra (opcional) — ex: formato esperado, restrições"
            rows={2} style={{ ...inputStyle, resize: 'vertical' }}
          />

          {result && (
            <div style={{
              padding: 10,
              background: result.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${result.ok ? 'var(--success)' : 'var(--danger)'}`,
              borderRadius: 5, fontSize: '0.72rem',
              color: result.ok ? 'var(--success)' : 'var(--danger)',
            }}>
              {result.ok ? `✓ ${result.message}` : `✗ ${result.error || 'erro'}`}
            </div>
          )}

          <button type="submit" disabled={busy || !intent.trim()} style={{
            background: busy ? 'var(--bg-elevated)' : 'var(--primary)',
            color: '#fff', border: 'none',
            padding: '8px 14px', borderRadius: 5, cursor: busy ? 'wait' : 'pointer',
            fontSize: '0.78rem', fontWeight: 600,
          }}>{busy ? 'A gerar especificação…' : 'Propor (agent desenha + aprovação)'}</button>
        </div>
      </form>
    </div>
  )
}

const inputStyle = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  padding: '7px 10px',
  borderRadius: 5,
  fontSize: '0.78rem',
  outline: 'none',
  fontFamily: 'inherit',
}

export default function SkillReviewPage() {
  const { skills, loading, activate, archive, refresh } = useSkillReview()
  const [proposeOpen, setProposeOpen] = useState(false)
  const [notes, setNotes] = useState({})  // skillId → note draft

  return (
    <div style={{ padding: '4px 4px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '4px 8px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>
            Skills em revisão
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            {skills.length} skill{skills.length === 1 ? '' : 's'} proposta{skills.length === 1 ? '' : 's'} por agents — activa ou arquiva
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setProposeOpen(true)} style={{
          background: 'var(--primary)', color: '#fff', border: 'none',
          padding: '7px 14px', borderRadius: 5, cursor: 'pointer',
          fontSize: '0.74rem', fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}><Wand2 size={13} /> Propor skill</button>
      </div>

      {loading && <div style={{ padding: 20, color: 'var(--text-dim)' }}>A carregar…</div>}

      {!loading && skills.length === 0 && (
        <div style={{
          padding: 32, textAlign: 'center',
          color: 'var(--text-dim)', fontSize: '0.82rem',
          background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 8,
        }}>
          <Sparkles size={24} color="var(--text-dim)" style={{ marginBottom: 8 }} />
          <div>Sem skills propostas pendentes.</div>
          <div style={{ fontSize: '0.7rem', marginTop: 6 }}>
            Os agents propõem skills automaticamente quando precisam de capacidade nova.
            Também podes propor manualmente com "Propor skill".
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {skills.map(s => (
          <div key={s.id} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderLeft: '3px solid #f59e0b',
            borderRadius: 8,
            padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{
                    fontSize: '0.55rem', padding: '2px 6px',
                    borderRadius: 3, background: 'rgba(245,158,11,0.18)',
                    color: '#f59e0b', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                  }}>REVIEW</span>
                  {s.category && (
                    <span style={{
                      fontSize: '0.55rem', padding: '2px 6px', borderRadius: 3,
                      background: 'var(--bg-elevated)', color: 'var(--text-dim)',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}>{s.category}</span>
                  )}
                  {s.auto_generated && (
                    <span style={{
                      fontSize: '0.55rem', color: 'var(--primary)',
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                    }}><Sparkles size={9} /> auto-gerada</span>
                  )}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>{s.name}</div>
                <code style={{ fontSize: '0.65rem', color: 'var(--info)', fontFamily: 'JetBrains Mono, monospace' }}>{s.slug}</code>
                {s.description && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text)', marginTop: 6, lineHeight: 1.5 }}>
                    {s.description}
                  </div>
                )}
                {s.proposed_by_agent && (
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', marginTop: 4 }}>
                    Proposta por <strong>{s.proposed_by_agent}</strong>
                    {s.proposed_at && ` · ${new Date(s.proposed_at).toLocaleString('pt-PT')}`}
                  </div>
                )}
              </div>
            </div>

            {s.prompt_template && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4 }}>
                  Prompt template
                </div>
                <pre style={{
                  fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--text)', background: 'var(--bg-elevated)',
                  padding: 8, borderRadius: 4, margin: 0,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  maxHeight: 200, overflow: 'auto',
                }}>{s.prompt_template}</pre>
              </div>
            )}

            <SchemaPreview label="Input schema" schema={s.input_schema} />
            <SchemaPreview label="Output schema" schema={s.output_schema} />

            <div style={{ marginTop: 12 }}>
              <input
                value={notes[s.id] || ''}
                onChange={e => setNotes({ ...notes, [s.id]: e.target.value })}
                placeholder="Nota de revisão (opcional)"
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => activate(s.id, notes[s.id] || null)} style={{
                  background: 'var(--success)', color: '#fff', border: 'none',
                  padding: '6px 12px', borderRadius: 5, cursor: 'pointer',
                  fontSize: '0.72rem', fontWeight: 600,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}><Check size={11} /> Activar</button>
                <button onClick={() => archive(s.id, notes[s.id] || null)} style={{
                  background: 'transparent', color: 'var(--text-dim)',
                  border: '1px solid var(--border)',
                  padding: '6px 12px', borderRadius: 5, cursor: 'pointer',
                  fontSize: '0.72rem',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}><Archive size={11} /> Arquivar</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {proposeOpen && <ProposeModal onClose={() => setProposeOpen(false)} onProposed={refresh} />}
    </div>
  )
}
