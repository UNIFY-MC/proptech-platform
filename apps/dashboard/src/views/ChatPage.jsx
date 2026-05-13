// ChatPage — /chat replicando layout CookAI
// Headline + quick-action cards + input freeform com employee picker + mode pill
//
// Sprint 1 (esta versão):
//   - UI completa cookai-style
//   - Quick-actions chamam edge function bia-chat (Bia já wired)
//   - Input freeform: invoca bia-chat com task_type freeform (Sprint 2 quando estiver suportado)
//
// Sprint 2 backlog:
//   - system.chat_sessions + system.chat_messages para histórico persistente
//   - task_type=freeform em bia-chat com tool query_context_docs já no loop
//   - Streaming responses
//   - Multi-turn

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, Wrench, MailPlus, Calendar, FileSearch,
  ChevronDown, Plus, ArrowUp, Globe, Database, Building2, Zap, Send,
} from 'lucide-react'
import { useEmployee } from '../hooks/useEmployee.js'
import { useApps } from '../hooks/useApps.js'
import { useNotificationsStore } from '../store'
import { useAgentChat } from '../hooks/useAgentChat.js'

// Quick-action cards — alinhadas com o que a Bia já sabe fazer + atalhos futuros
const QUICK_ACTIONS = [
  {
    id: 'triagem',
    icon: Wrench,
    label: 'Triar um pedido',
    sub: 'Bia classifica urgência + match prestador',
    action: { type: 'navigate', to: '/employees/bia' },
  },
  {
    id: 'outreach',
    icon: MailPlus,
    label: 'Compor outreach owner',
    sub: 'WhatsApp R2 personalizado',
    action: { type: 'navigate', to: '/employees/bia' },
  },
  {
    id: 'roundup',
    icon: Calendar,
    label: 'Daily roundup agora',
    sub: 'Resumo operacional → /inbox',
    action: { type: 'invoke', task: 'daily_roundup' },
  },
  {
    id: 'context',
    icon: FileSearch,
    label: 'Procurar nos docs',
    sub: 'Legislação, SOPs, procedures',
    action: { type: 'navigate', to: '/files' },
  },
]

// Modes (cookai usa "Website Mode" — aqui o equivalente é vertical / scope)
const MODES = [
  { id: 'global',    label: 'Global',         icon: Globe },
  { id: 'v2',        label: 'V2 Condomínios', icon: Building2 },
  { id: 'v4',        label: 'V4 Energia',     icon: Zap },
  { id: 'v5',        label: 'V5 Manutenção',  icon: Wrench },
]

export default function ChatPage() {
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [mode, setMode] = useState('global')
  const [employeeId, setEmployeeId] = useState('bia')
  const [showModeMenu, setShowModeMenu] = useState(false)
  const inputRef = useRef(null)
  const addToast = useNotificationsStore(s => s.addToast)
  const { apps } = useApps()
  const { running, lastResult, runTask } = useEmployee(employeeId)
  const { messages, send, pending, clear } = useAgentChat()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleQuickAction(qa) {
    if (qa.action.type === 'navigate') {
      navigate(qa.action.to)
    } else if (qa.action.type === 'invoke') {
      runTask(qa.action.task, {})
    }
  }

  async function handleSubmit(e) {
    e?.preventDefault?.()
    if (!prompt.trim() || pending) return
    const text = prompt
    setPrompt('')
    await send(text)
  }

  const hasConversation = messages.length > 0
  const isBusy = pending || running

  const activeMode = MODES.find(m => m.id === mode) || MODES[0]
  const ModeIcon = activeMode.icon

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      minHeight: 'calc(100vh - 40px)',
      maxWidth: 760, margin: '0 auto',
      padding: '0 20px',
    }}>
      {/* Top bar — New Chat dropdown stub */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 0', marginBottom: hasConversation ? 14 : 40,
      }}>
        <button
          onClick={clear}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text)', fontSize: '0.92rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
          {hasConversation ? '↺ New Chat' : 'New Chat'}
          <ChevronDown size={14} style={{ color: 'var(--text-dim)' }} />
        </button>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
          {isBusy ? '⏳ A pensar…' : ''}
        </div>
      </div>

      {/* Conversation thread (quando há mensagens) */}
      {hasConversation && (
        <div style={{
          flex: 1,
          width: '100%',
          maxWidth: 720,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          paddingBottom: 16,
        }}>
          {messages.map((m, i) => (
            <ChatBubble key={i} message={m} />
          ))}
        </div>
      )}

      {/* Center: brand + headline (só quando não há conversa) */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: hasConversation ? 'flex-end' : 'center',
        gap: 30, paddingBottom: 30,
      }}>
        {!hasConversation && (
          <>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={26} color="#fff" />
            </div>
            <h1 style={{
              margin: 0, fontSize: '1.6rem', fontWeight: 600,
              color: 'var(--text)', textAlign: 'center',
            }}>
              Em que te posso ajudar hoje?
            </h1>
          </>
        )}

        {/* Quick-action cards (só quando não há conversa) */}
        {!hasConversation && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12, width: '100%', maxWidth: 720,
        }}>
          {QUICK_ACTIONS.map(qa => (
            <button
              key={qa.id}
              onClick={() => handleQuickAction(qa)}
              disabled={running}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 14,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex', flexDirection: 'column', gap: 8,
                color: 'inherit', font: 'inherit',
                transition: 'transform 0.12s, background 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--bg-elevated)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <qa.icon size={16} color="var(--primary)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>{qa.label}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.4 }}>{qa.sub}</div>
              </div>
            </button>
          ))}
        </div>
        )}

        {/* Scope/Mode pill bar */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '8px 14px',
          width: '100%', maxWidth: 720,
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: '0.74rem', color: 'var(--text-dim)',
        }}>
          <ModeIcon size={14} />
          <span>Scope: <strong style={{ color: 'var(--text)' }}>{activeMode.label}</strong></span>
          <span style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>
            Os agents vão usar este filtro como context default
          </span>
        </div>

        {/* Input bar — sticky no fundo da viewport via flex */}
        <form onSubmit={handleSubmit} style={{
          width: '100%', maxWidth: 720,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 12,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <input
            ref={inputRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={`Pergunta ao ${employeeId === 'bia' ? 'Bia' : employeeId}…`}
            disabled={isBusy}
            maxLength={1000}
            style={{
              border: 'none', outline: 'none',
              background: 'transparent',
              fontSize: '0.92rem', color: 'var(--text)',
              padding: '4px 4px',
              width: '100%', boxSizing: 'border-box',
            }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Mode picker */}
            <div style={{ position: 'relative' }}>
              <button type="button"
                onClick={() => setShowModeMenu(s => !s)}
                style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 99, padding: '5px 12px',
                  display: 'flex', alignItems: 'center', gap: 6,
                  cursor: 'pointer', font: 'inherit',
                  fontSize: '0.72rem', color: 'var(--text)',
                }}>
                <ModeIcon size={13} />
                <span>{activeMode.label}</span>
                <ChevronDown size={12} style={{ color: 'var(--text-dim)' }} />
              </button>
              {showModeMenu && (
                <div style={{
                  position: 'absolute', bottom: '110%', left: 0,
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: 4, minWidth: 180,
                  boxShadow: '0 -4px 12px rgba(0,0,0,0.2)',
                  zIndex: 10,
                }}>
                  {MODES.map(m => {
                    const MIc = m.icon
                    return (
                      <button key={m.id} type="button"
                        onClick={() => { setMode(m.id); setShowModeMenu(false) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          width: '100%', textAlign: 'left',
                          background: m.id === mode ? 'var(--bg-elevated)' : 'transparent',
                          border: 'none', borderRadius: 5,
                          padding: '7px 10px', cursor: 'pointer',
                          font: 'inherit', color: 'var(--text)',
                          fontSize: '0.74rem',
                        }}>
                        <MIc size={13} />
                        {m.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Employee picker */}
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                borderRadius: 99, padding: '5px 12px',
                fontSize: '0.72rem', color: 'var(--text)',
                cursor: 'pointer', outline: 'none',
              }}>
              <option value="bia">Bia · V5 Manutenção</option>
              <option value="orquestrador" disabled>Orquestrador · V2 Condo (Sprint 2)</option>
              <option value="diretor-marketing" disabled>Diretor · Marketing (Sprint 2)</option>
            </select>

            <button type="button" style={iconBtn} title="Adicionar contexto (Sprint 2)">
              <Plus size={14} />
            </button>

            <button type="submit"
              disabled={isBusy || !prompt.trim()}
              style={{
                marginLeft: 'auto',
                background: prompt.trim() && !isBusy ? 'var(--primary)' : 'var(--bg-elevated)',
                color: prompt.trim() && !isBusy ? '#fff' : 'var(--text-dim)',
                border: 'none', borderRadius: '50%',
                width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: prompt.trim() && !isBusy ? 'pointer' : 'not-allowed',
              }}>
              {isBusy ? '…' : <ArrowUp size={15} />}
            </button>
          </div>
        </form>

        {/* Last result snippet */}
        {lastResult && lastResult.message && (
          <div style={{
            width: '100%', maxWidth: 720,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: 14,
            fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
          }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.58rem', color: 'var(--text-dim)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
            }}>Última resposta · {employeeId}</div>
            {lastResult.message}
          </div>
        )}

        <div style={{
          fontSize: '0.62rem', color: 'var(--text-dim)',
          textAlign: 'center', marginTop: 4,
        }}>
          Os agentes podem cometer erros. Verifica informação crítica antes de aprovar.
        </div>
      </div>
    </div>
  )
}

const iconBtn = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 99,
  width: 28, height: 28,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: 'var(--text-dim)', padding: 0,
}

// ─── ChatBubble — render mensagem do histórico ──────────────
function ChatBubble({ message }) {
  const isUser = message.role === 'user'
  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 10,
      alignItems: 'flex-start',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: isUser
          ? 'var(--bg-elevated)'
          : 'linear-gradient(135deg, var(--primary), #8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.7rem', fontWeight: 700,
        color: isUser ? 'var(--text)' : '#fff',
      }}>
        {isUser ? 'M' : <Sparkles size={13} />}
      </div>
      <div style={{
        flex: 1,
        background: message.error
          ? 'rgba(239,68,68,0.08)'
          : isUser ? 'var(--bg-elevated)' : 'var(--bg-card)',
        border: '1px solid ' + (message.error ? 'var(--danger)' : 'var(--border)'),
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: '0.85rem',
        color: 'var(--text)',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
      }}>
        {message.content}
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div style={{
            marginTop: 8,
            padding: '6px 8px',
            background: 'var(--bg-elevated)',
            borderRadius: 5,
            fontSize: '0.62rem',
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--text-dim)',
          }}>
            <div style={{ marginBottom: 4, fontWeight: 700, color: 'var(--primary)' }}>
              Tools usadas:
            </div>
            {message.tool_calls.map((tc, i) => (
              <div key={i} style={{ marginBottom: 3 }}>
                <span style={{ color: 'var(--info)' }}>{tc.name}</span>
                {tc.result?.error
                  ? <span style={{ color: 'var(--danger)' }}> · {tc.result.error}</span>
                  : tc.result?.ok || tc.result?.task_id
                    ? <span style={{ color: 'var(--success)' }}> · ok</span>
                    : tc.result?.tasks
                      ? <span> · {tc.result.tasks.length} resultados</span>
                      : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
