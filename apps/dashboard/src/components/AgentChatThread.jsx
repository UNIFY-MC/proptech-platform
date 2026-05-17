// AgentChatThread — Thread visual da conversa entre Mário e agente sobre um email
// Lê system.agent_chat_messages (thread_kind='email', thread_id=email_id)
// Cada mensagem é uma bubble: user (Mário), assistant (agente), tool_use, tool_result.

import { useEffect, useState } from 'react'
import { Sparkles, User, Wrench, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

function fmtTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function AgentChatThread({ emailId, agentName, refreshKey }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!emailId || !supabase) { setMessages([]); setLoading(false); return }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data } = await supabase.schema('system').from('agent_chat_messages')
        .select('id, seq, role, content, tool_name, tool_input, tool_summary, tool_ok, agent_id, created_at, created_by, metadata')
        .eq('thread_kind', 'email').eq('thread_id', emailId)
        .order('seq', { ascending: true })
      if (!cancelled) { setMessages(data || []); setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [emailId, refreshKey])

  if (loading) {
    return <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: 8 }}>A carregar conversa…</div>
  }

  // Agrupa tool_use+tool_result consecutivos
  const grouped = []
  for (const m of messages) {
    if (m.role === 'tool_result') {
      const prev = grouped[grouped.length - 1]
      if (prev && prev.kind === 'tool' && prev.tool_name === m.tool_name && !prev.result) {
        prev.result = m
        continue
      }
    }
    if (m.role === 'tool_use') {
      grouped.push({ kind: 'tool', tool_name: m.tool_name, tool_input: m.tool_input, created_at: m.created_at, use: m })
    } else {
      grouped.push({ kind: m.role, ...m })
    }
  }

  if (grouped.length === 0) {
    return (
      <div style={{
        fontSize: 11, color: 'var(--text-dim)', padding: 14, textAlign: 'center',
        background: 'var(--bg)', borderRadius: 5,
      }}>
        Sem mensagens ainda. Escreve a primeira instrução abaixo para a {agentName || 'agente'}.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 360, overflowY: 'auto' }}>
      {grouped.map((g, i) => <Bubble key={g.id || `g-${i}`} item={g} agentName={agentName} />)}
    </div>
  )
}

function Bubble({ item, agentName }) {
  if (item.kind === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          maxWidth: '85%',
          background: 'rgba(107,79,160,0.12)', border: '1px solid rgba(107,79,160,0.25)',
          borderRadius: 8, padding: '7px 10px',
          fontSize: 12, color: 'var(--text)', lineHeight: 1.45,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <User size={10} color="var(--primary)" />
            <span style={{
              fontSize: 9, fontWeight: 700, color: 'var(--primary)',
              fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>{item.created_by || 'mario'}</span>
            <span style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', marginLeft: 'auto' }}>
              {fmtTime(item.created_at)}
            </span>
          </div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{item.content}</div>
        </div>
      </div>
    )
  }

  if (item.kind === 'assistant') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <div style={{
          maxWidth: '90%',
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)',
          borderRadius: 8, padding: '7px 10px',
          fontSize: 12, color: 'var(--text)', lineHeight: 1.5,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <Sparkles size={10} color="#10b981" />
            <span style={{
              fontSize: 9, fontWeight: 700, color: '#10b981',
              fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>{item.agent_id || agentName || 'agente'}</span>
            <span style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', marginLeft: 'auto' }}>
              {fmtTime(item.created_at)}
            </span>
          </div>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 11.5 }}>{item.content}</div>
        </div>
      </div>
    )
  }

  if (item.kind === 'tool') {
    const ok = item.result?.tool_ok !== false
    return (
      <div style={{
        background: ok ? 'rgba(59,130,246,0.06)' : 'rgba(239,68,68,0.06)',
        border: `1px solid ${ok ? 'rgba(59,130,246,0.20)' : 'rgba(239,68,68,0.25)'}`,
        borderRadius: 6, padding: '5px 9px',
        fontSize: 11, color: 'var(--text)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10 }}>
          {ok ? <Wrench size={10} color="#3b82f6" /> : <AlertCircle size={10} color="#ef4444" />}
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
            color: ok ? '#3b82f6' : '#ef4444',
          }}>{item.tool_name}</span>
          <span style={{ color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
            {item.tool_input ? JSON.stringify(item.tool_input).slice(0, 80) : ''}
          </span>
          <span style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', marginLeft: 'auto' }}>
            {fmtTime(item.created_at)}
          </span>
        </div>
        {item.result?.tool_summary && (
          <div style={{
            marginTop: 3, marginLeft: 15,
            fontSize: 11, color: 'var(--text)', lineHeight: 1.4,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <CheckCircle2 size={9} color={ok ? '#10b981' : '#ef4444'} />
            {item.result.tool_summary}
          </div>
        )}
      </div>
    )
  }

  return null
}
