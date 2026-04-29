import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '@proptech/auth'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const CASA = {
  green:   '#0F5132',  // header bg
  border:  '#0A3622',  // header bottom border
  greenLt: '#198754',  // user bubble bg + botão Enviar
  bg:      '#F8F9FA',  // chat bg
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export default function CasaAdvisorScreen({ localizacao, localizacaoId, onBack }) {
  const { session } = useAuth()
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '👋 Sou o teu AI Expert da casa. Pergunta-me sobre os equipamentos, manutenção, consumos ou prioridades.' }
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [error, setError]     = useState(null)
  const inputRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    if (!session?.access_token) {
      setError('Sessão expirada. Faz login novamente.')
      return
    }
    if (!localizacaoId) {
      setError('Localização não definida.')
      return
    }

    setError(null)
    setMessages(prev => [...prev, { role: 'user', content: trimmed }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-casa-advisor`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(sessionId ? { session_id: sessionId } : {}),
          localizacao_id: localizacaoId,
          message: trimmed,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Erro HTTP ${res.status}`)
      }

      if (!sessionId && data.session_id) {
        setSessionId(data.session_id)
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])

      if (import.meta.env.DEV) {
        console.log(`[advisor] tokens=${data.tokens?.input}/${data.tokens?.output} cost=$${data.cost_usd?.toFixed(4)} iter=${data.iterations}`)
      }
    } catch (err) {
      console.error('[CasaAdvisor]', err)
      setError(err.message || 'Erro ao comunicar com o AI Expert.')
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function renderAssistant(content) {
    const html = DOMPurify.sanitize(marked.parse(content, { breaks: true, gfm: true }))
    return <div dangerouslySetInnerHTML={{ __html: html }} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 88px - env(safe-area-inset-bottom, 0px))', background: CASA.bg }}>

      {/* Header */}
      <div style={{
        background: CASA.green, color: 'white',
        padding: '12px 16px', borderBottom: `3px solid ${CASA.border}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={onBack}
          style={{ background: 'transparent', border: 'none', color: 'white', fontSize: 24, cursor: 'pointer', padding: 0 }}
          aria-label="Voltar"
        >←</button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>AI Expert</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{localizacao?.nome || 'A tua casa'}</div>
        </div>
      </div>

      {/* Área de mensagens */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: 12,
          }}>
            <div style={{
              maxWidth: '85%', padding: '10px 14px', borderRadius: 16,
              background: m.role === 'user' ? CASA.greenLt : 'white',
              color: m.role === 'user' ? 'white' : '#1a1a1a',
              boxShadow: m.role === 'user' ? 'none' : '0 1px 2px rgba(0,0,0,0.08)',
              fontSize: 15, lineHeight: 1.5, wordBreak: 'break-word',
            }}>
              {m.role === 'assistant' ? renderAssistant(m.content) : m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
            <div style={{
              padding: '10px 14px', borderRadius: 16, background: 'white',
              fontSize: 15, color: '#666', boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
            }}>
              <span className="advisor-dots">
                A pensar<span>.</span><span>.</span><span>.</span>
              </span>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 8,
            background: '#FEE2E2', color: '#991B1B',
            fontSize: 13, margin: '8px 0',
          }}>
            ⚠️ {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: 12, background: 'white', borderTop: '1px solid #e5e5e5',
        display: 'flex', gap: 8,
      }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escreve a tua pergunta…"
          disabled={loading}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 24,
            border: '1px solid #d1d5db', fontSize: 15, outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            padding: '0 20px', borderRadius: 24, border: 'none',
            background: loading || !input.trim() ? '#d1d5db' : CASA.greenLt,
            color: 'white', fontSize: 15, fontWeight: 600,
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
          }}
        >Enviar</button>
      </div>

      {/* Animação dots — inline para sem dependência extra */}
      <style>{`
        .advisor-dots span { opacity: 0; animation: advisorBlink 1.4s infinite; }
        .advisor-dots span:nth-child(2) { animation-delay: 0.2s; }
        .advisor-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes advisorBlink {
          0%, 60%, 100% { opacity: 0; }
          30% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
