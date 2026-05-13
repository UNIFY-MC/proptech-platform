// AskAnythingBar — bottom bar do Inbox com:
//  - @ mention de cards (autocomplete com inbox items recentes)
//  - Select employee (todos os agents)
//  - Submit chama useAgentChat (edge fn agent-chat) com context dos cards mencionados
//  - Resposta aparece como toast + redirecciona para /chat para ver thread

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AtSign, ArrowUp, ChevronDown, X } from 'lucide-react'
import { useInboxItems } from '../../hooks/useSupabase'
import { useData } from '../../hooks/useData.js'
import { useAgentChat } from '../../hooks/useAgentChat.js'

export default function AskAnythingBar() {
  const [prompt, setPrompt] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [showMentionList, setShowMentionList] = useState(false)
  const [showEmployeeList, setShowEmployeeList] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [mentionedCards, setMentionedCards] = useState([])  // [{ id, title }]
  const inputRef = useRef(null)
  const mentionAnchor = useRef(null)
  const navigate = useNavigate()
  const { data } = useData()
  const employees = data?.employees || []
  const { items: inboxItems } = useInboxItems(null)
  const { send, pending } = useAgentChat()

  // Detect "@" trigger no fim do prompt
  useEffect(() => {
    const atIndex = prompt.lastIndexOf('@')
    if (atIndex >= 0) {
      const afterAt = prompt.slice(atIndex + 1)
      // Só mostra se @ é último token (sem espaço depois)
      if (!afterAt.includes(' ')) {
        setShowMentionList(true)
        setMentionFilter(afterAt.toLowerCase())
        return
      }
    }
    setShowMentionList(false)
  }, [prompt])

  function insertMention(item) {
    // Substituir o @<filter> pelo título do card como mention pill
    const atIndex = prompt.lastIndexOf('@')
    const before = prompt.slice(0, atIndex)
    const newPrompt = before + `[@${item.title.slice(0, 30)}] `
    setPrompt(newPrompt)
    setMentionedCards(prev => [...prev, { id: item.id, title: item.title }])
    setShowMentionList(false)
    inputRef.current?.focus()
  }

  function removeMention(id) {
    setMentionedCards(prev => prev.filter(m => m.id !== id))
  }

  async function handleSubmit(e) {
    e?.preventDefault?.()
    if (!prompt.trim() || pending) return

    // Construir context dos cards mencionados
    let contextPrefix = ''
    if (mentionedCards.length > 0) {
      const refs = mentionedCards.map(m => {
        const it = inboxItems.find(i => i.id === m.id)
        if (!it) return ''
        const payload = it.payload || {}
        const snippet = payload.summary_md?.slice(0, 200) || payload.title || it.body?.slice(0, 200) || ''
        return `[Card "${it.title}"] ${snippet}`
      }).join('\n\n')
      contextPrefix = `Contexto referenciado:\n${refs}\n\nPergunta/pedido: `
    }
    const text = contextPrefix + prompt
    const emp = employeeId ? `\n\n(Direccionado a agent: ${employeeId})` : ''

    setPrompt('')
    setMentionedCards([])
    await send(text + emp)
    navigate('/chat')
  }

  const filteredItems = mentionFilter
    ? inboxItems.filter(i => i.title?.toLowerCase().includes(mentionFilter)).slice(0, 8)
    : inboxItems.slice(0, 8)

  const selectedEmp = employees.find(e => e.id === employeeId)

  return (
    <div style={{
      position: 'sticky', bottom: 0, left: 0, right: 0,
      background: 'var(--bg)',
      borderTop: '1px solid var(--border)',
      padding: '12px 14px',
      marginTop: 20,
    }}>
      <form onSubmit={handleSubmit} style={{
        maxWidth: 920, margin: '0 auto',
        display: 'flex', flexDirection: 'column', gap: 8,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12, padding: 12,
      }}>
        {/* Mentioned cards (pills acima do input) */}
        {mentionedCards.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {mentionedCards.map(m => (
              <span key={m.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 8px',
                background: 'rgba(83,74,183,0.15)',
                border: '1px solid var(--primary)',
                borderRadius: 4,
                fontSize: '0.7rem',
                color: 'var(--primary)',
              }}>
                <AtSign size={10} />
                {m.title.slice(0, 35)}
                <button type="button" onClick={() => removeMention(m.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--primary)', padding: 0, display: 'flex', alignItems: 'center',
                }}>
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ position: 'relative' }} ref={mentionAnchor}>
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Ask anything…  ( @ to mention a card )"
            disabled={pending}
            maxLength={1000}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '8px 10px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '0.85rem',
              color: 'var(--text)',
            }}
          />

          {/* Mention autocomplete dropdown (acima do input) */}
          {showMentionList && filteredItems.length > 0 && (
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              maxWidth: 480,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              boxShadow: '0 -6px 24px rgba(0,0,0,0.25)',
              padding: 4,
              zIndex: 30,
              maxHeight: 280,
              overflowY: 'auto',
            }}>
              <div style={{
                padding: '6px 10px', fontSize: '0.58rem',
                color: 'var(--text-dim)', textTransform: 'uppercase',
                letterSpacing: '0.08em', fontWeight: 700,
              }}>Mention card</div>
              {filteredItems.map(it => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => insertMention(it)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', textAlign: 'left',
                    padding: '7px 10px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text)', fontSize: '0.75rem',
                    borderRadius: 4,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <AtSign size={11} color="var(--text-dim)" />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {it.title}
                  </span>
                  {it.kind && (
                    <span style={{
                      fontSize: '0.55rem', padding: '1px 5px', borderRadius: 3,
                      background: 'var(--bg-elevated)', color: 'var(--text-dim)',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}>{it.kind}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bottom controls: employee select + submit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowEmployeeList(s => !s)}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                padding: '5px 10px',
                borderRadius: 99,
                cursor: 'pointer',
                color: 'var(--text)',
                fontSize: '0.72rem',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: '50%',
                background: selectedEmp
                  ? 'linear-gradient(135deg, #534AB7, #8b5cf6)'
                  : 'var(--bg-card)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '0.5rem', fontWeight: 700,
                border: selectedEmp ? 'none' : '1px solid var(--border)',
              }}>{selectedEmp ? selectedEmp.avatarInitial : '·'}</div>
              <span>{selectedEmp ? selectedEmp.name : 'Select Employee'}</span>
              <ChevronDown size={11} />
            </button>
            {showEmployeeList && (
              <div style={{
                position: 'absolute', bottom: 'calc(100% + 4px)', left: 0,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 8, padding: 4, minWidth: 220, maxHeight: 320, overflowY: 'auto',
                boxShadow: '0 -6px 24px rgba(0,0,0,0.25)', zIndex: 30,
              }}>
                <button type="button"
                  onClick={() => { setEmployeeId(''); setShowEmployeeList(false) }}
                  style={empItem(employeeId === '')}>
                  — sem agent específico (auto-route) —
                </button>
                {employees.map(e => (
                  <button key={e.id} type="button"
                    onClick={() => { setEmployeeId(e.id); setShowEmployeeList(false) }}
                    style={empItem(employeeId === e.id)}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #534AB7, #8b5cf6)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: '0.55rem', fontWeight: 700,
                      marginRight: 8,
                    }}>{e.avatarInitial}</div>
                    {e.name} <span style={{ color: 'var(--text-dim)', marginLeft: 6 }}>· {e.department}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex: 1 }} />

          <button type="submit"
            disabled={pending || !prompt.trim()}
            style={{
              background: prompt.trim() && !pending ? 'var(--text)' : 'var(--bg-elevated)',
              color: prompt.trim() && !pending ? 'var(--bg)' : 'var(--text-dim)',
              border: 'none', borderRadius: '50%',
              width: 30, height: 30,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              cursor: prompt.trim() && !pending ? 'pointer' : 'not-allowed',
            }}>
            {pending ? '…' : <ArrowUp size={14} />}
          </button>
        </div>
      </form>
    </div>
  )
}

function empItem(active) {
  return {
    display: 'flex', alignItems: 'center',
    width: '100%', textAlign: 'left',
    padding: '6px 10px',
    background: active ? 'var(--bg-elevated)' : 'none',
    border: 'none', cursor: 'pointer',
    color: 'var(--text)', fontSize: '0.72rem',
    borderRadius: 4,
    fontWeight: active ? 600 : 400,
  }
}
