// src/ChatSuporteScreen.jsx — Chat cliente↔plataforma (FIX 6, 3.3.10)
import React, { useState, useEffect, useRef } from 'react'
import { supa } from './supa.js'
import { useAuth } from './lib/AuthContext.jsx'

const G  = '#1B4332'
const GM = '#2D6A4F'
const C  = {
  ink: '#0f172a', slate: '#64748b', border: '#e2e8f0',
  bg: '#f8fafc', white: '#fff', line: '#E5E7EB',
  blue: '#1e40af', blueSoft: '#E6F1FB', blueBorder: '#85B7EB',
}

const CHIPS = [
  { ic: '📋', label: 'Ver pedidos' },
  { ic: '💎', label: 'Subscrição' },
  { ic: '❓', label: 'FAQ' },
  { ic: '🐞', label: 'Reportar bug' },
]

const BOAS_VINDAS = [
  { id: 'bv1', autor_tipo: 'suporte', texto: 'Olá! 👋 Sou o assistente de suporte. Como posso ajudar hoje?', criado_em: new Date(Date.now() - 60000).toISOString() },
  { id: 'bv2', autor_tipo: 'suporte', texto: 'Estou aqui para questões sobre subscrição, pedidos, conta ou qualquer outra dúvida.', criado_em: new Date(Date.now() - 30000).toISOString() },
]

function fmtHora(iso) {
  try { return new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

export default function ChatSuporteScreen({ onBack }) {
  const { pessoa_id } = useAuth()
  const [ticket,     setTicket]     = useState(null)
  const [mensagens,  setMensagens]  = useState(null)
  const [texto,      setTexto]      = useState('')
  const [enviando,   setEnviando]   = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    let active = true
    async function init() {
      const { data: existente } = await supa
        .from('tickets_suporte')
        .select('*')
        .eq('pessoa_id', pessoa_id)
        .eq('estado', 'aberto')
        .maybeSingle()
      if (!active) return

      let t = existente
      if (!t) {
        const { data: novo } = await supa
          .from('tickets_suporte')
          .insert({ pessoa_id: pessoa_id, assunto: 'Apoio geral' })
          .select()
          .single()
        if (!active) return
        t = novo
      }
      setTicket(t)

      const { data: msgs } = await supa
        .from('mensagens_suporte')
        .select('*')
        .eq('ticket_id', t.id)
        .order('criado_em', { ascending: true })
      if (!active) return
      setMensagens(msgs || [])
    }
    init()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function enviar(textoMsg) {
    const msg = (textoMsg || texto).trim()
    if (!msg || !ticket || enviando) return
    setTexto('')
    setEnviando(true)
    const { data } = await supa
      .from('mensagens_suporte')
      .insert({ ticket_id: ticket.id, autor_tipo: 'cliente', texto: msg })
      .select()
      .single()
    if (data) setMensagens(prev => [...(prev || []), data])
    setEnviando(false)
  }

  const todasMensagens = mensagens === null ? null : [...BOAS_VINDAS, ...mensagens]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: C.bg }}>

      {/* Header verde */}
      <div style={{ background: `linear-gradient(145deg,${G},${GM})`, padding: '14px 16px', color: '#fff', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', padding: 0, flexShrink: 0 }}>←</button>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🛟</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Suporte · Equipa de Apoio</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}/>
              Online · responde em ~5 min
            </div>
          </div>
          <button style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer', color: '#fff' }}>
            📞
          </button>
        </div>
      </div>

      {/* Badge oficial */}
      <div style={{ margin: '10px 12px 0', background: C.blueSoft, border: `1px solid ${C.blueBorder}`, borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 14 }}>✅</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.blue }}>Equipa oficial · Apoio premium 24/7</span>
      </div>

      {/* Chips ações rápidas */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 12px 0', flexShrink: 0, overflowX: 'auto' }}>
        {CHIPS.map(ch => (
          <button key={ch.label} onClick={() => enviar(`${ch.ic} ${ch.label}`)} style={{
            background: C.white, border: `1px solid ${C.border}`, borderRadius: 20,
            padding: '6px 12px', fontSize: 12, fontWeight: 600, color: C.ink, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {ch.ic} {ch.label}
          </button>
        ))}
      </div>

      {/* Mensagens */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 0' }}>
        {todasMensagens === null ? (
          <div style={{ textAlign: 'center', color: C.slate, fontSize: 13, padding: 24 }}>A carregar...</div>
        ) : todasMensagens.map(m => {
          const isCliente = m.autor_tipo === 'cliente'
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: isCliente ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
              <div style={{
                maxWidth: '78%', padding: '10px 13px', borderRadius: isCliente ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: isCliente ? G : C.white,
                border: isCliente ? 'none' : `1px solid ${C.border}`,
                color: isCliente ? '#fff' : C.ink,
                fontSize: 13.5, lineHeight: 1.5,
              }}>
                {m.texto}
                <div style={{ fontSize: 10, color: isCliente ? 'rgba(255,255,255,0.6)' : C.slate, marginTop: 4, textAlign: 'right' }}>
                  {fmtHora(m.criado_em)}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 12px 24px', background: C.white, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
            placeholder="Escreve a tua mensagem..."
            rows={1}
            style={{
              flex: 1, padding: '10px 13px', borderRadius: 20, border: `1px solid ${C.border}`,
              fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.4,
              background: C.bg, color: C.ink,
            }}
          />
          <button
            onClick={() => enviar()}
            disabled={!texto.trim() || enviando}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: !texto.trim() || enviando ? C.border : G,
              border: 'none', color: '#fff', fontSize: 16, cursor: !texto.trim() || enviando ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >➤</button>
        </div>
      </div>
    </div>
  )
}
