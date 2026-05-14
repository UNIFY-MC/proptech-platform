import { useState } from 'react'
import { systemClient } from '../lib/clients.js'
import { CONDO_AGENTS } from '../lib/agents.js'

// Composer minimalista. Escreve em system.inbox_items com source='chat',
// vertical='v2', target_agent escolhido por dropdown ou 'orquestrador-condo'
// quando 'auto'. O agente alvo pega e processa.

export default function Chat() {
  const [target, setTarget] = useState('auto')
  const [title, setTitle]   = useState('')
  const [body, setBody]     = useState('')
  const [sent, setSent]     = useState([])
  const [error, setError]   = useState(null)
  const [busy, setBusy]     = useState(false)

  async function send(e) {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    setError(null)
    const targetAgent = target === 'auto' ? 'orquestrador-condo' : target
    const { data, error } = await systemClient
      .from('inbox_items')
      .insert({
        title:     title.trim(),
        body:      body.trim() || null,
        vertical:  'v2',
        item_type: 'new_pedido',
        source:    'chat',
        status:    'active',
        // target_agent não está no schema actual; orquestrador roteia via body/título
      })
      .select()
      .single()
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setSent(prev => [{ ...data, _target: targetAgent }, ...prev].slice(0, 20))
    setTitle('')
    setBody('')
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1>Chat com agentes</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        Escreve uma instrução. <code className="mono">orquestrador-condo</code> (Otto) roteia para o agente certo, ou escolhes manualmente.
      </p>

      <form onSubmit={send} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
        padding: '14px 16px', marginBottom: 20,
      }}>
        <label style={{ display: 'block', marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>
            Para
          </span>
          <select value={target} onChange={e => setTarget(e.target.value)} style={inputStyle}>
            <option value="auto">Auto (Otto roteia)</option>
            {CONDO_AGENTS.map(a => (
              <option key={a.slug} value={a.slug}>{a.name} · {a.role}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'block', marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>
            Pedido (uma frase)
          </span>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder='ex: emitir avisos de mora deste mês'
            style={inputStyle}
            required
          />
        </label>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>
            Contexto (opcional)
          </span>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={3}
            placeholder='detalhe adicional, prazos, contas a usar…'
            style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
          />
        </label>

        {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 10 }}>{error}</div>}

        <button
          type="submit"
          disabled={busy || !title.trim()}
          style={{
            background: 'var(--primary)', color: '#fff', border: 'none',
            borderRadius: 5, padding: '8px 16px', fontSize: 13, fontWeight: 600,
            cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? 'A enviar…' : 'Enviar'}
        </button>
      </form>

      {sent.length > 0 && (
        <>
          <h2>Enviado nesta sessão</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sent.map(s => (
              <div key={s.id} style={{
                background: 'var(--bg-card-soft)', border: '1px solid var(--border-soft)', borderRadius: 6,
                padding: '8px 12px', fontSize: 12,
              }}>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>{s.title}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>
                  → {s._target} · {s.created_at?.slice(11, 16) ?? ''}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '7px 10px', fontSize: 13,
  background: 'var(--bg-card-soft)', color: 'var(--text)',
  border: '1px solid var(--border)', borderRadius: 5, boxSizing: 'border-box',
}
