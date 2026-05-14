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
  Sparkles, Wrench, Calendar, FileSearch,
  Plus, ArrowUp,
} from 'lucide-react'
import { useEmployee } from '../hooks/useEmployee.js'
import { useApps } from '../hooks/useApps.js'
import { useNotificationsStore, useVerticalStore } from '../store'
import { useAgentChat } from '../hooks/useAgentChat.js'
import { useChatThreads } from '../hooks/useChatThreads.js'
import { useTasks } from '../hooks/useTasks.js'
import { useCalendarEvents } from '../hooks/useCalendarEvents.js'

// Quick-action cards — 3 em 1 linha, com cor distinta tipo CookAI
const QUICK_ACTIONS = [
  {
    id: 'triagem',
    icon: Wrench,
    color: '#f59e0b',   // amber — operations
    label: 'Triar pedido',
    sub: 'Classifica urgência + escolhe prestador',
    action: { type: 'navigate', to: '/employees/bia' },
  },
  {
    id: 'roundup',
    icon: Calendar,
    color: '#3b82f6',   // blue — daily
    label: 'Daily roundup',
    sub: 'Resumo operacional → /inbox',
    action: { type: 'invoke', task: 'daily_roundup' },
  },
  {
    id: 'context',
    icon: FileSearch,
    color: '#8b5cf6',   // purple — knowledge
    label: 'Procurar nos docs',
    sub: 'Legislação, SOPs, procedures',
    action: { type: 'navigate', to: '/files' },
  },
]

// Dept heads (responsáveis) — espelha a lista em TasksPage
const DEPT_HEADS = [
  { id: 'auto',                label: 'Auto · sistema escolhe',  verticals: '*',          color: '#a855f7' },
  { id: 'bia',                 label: 'Bia · operations V5',     verticals: ['V5'],       color: '#f59e0b' },
  { id: 'orquestrador-condo',  label: 'Orquestrador · V2 ops',   verticals: ['V2'],       color: '#3b82f6' },
  { id: 'diretor-marketing',   label: 'Diretor Marketing',       verticals: ['V2','V4','V5'], color: '#ec4899' },
  { id: 'gestor-leads',        label: 'Gestor Leads · sales',    verticals: ['V2','V4','V5'], color: '#10b981' },
  { id: 'financeiro-condo',    label: 'Financeiro · V2',         verticals: ['V2'],       color: '#06b6d4' },
  { id: 'atendimento-condo',   label: 'Atendimento · V2',        verticals: ['V2'],       color: '#84cc16' },
  { id: 'compliance-condo',    label: 'Compliance · V2 legal',   verticals: ['V2'],       color: '#ef4444' },
]

export default function ChatPage() {
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [employeeId, setEmployeeId] = useState('auto')
  const inputRef = useRef(null)
  const addToast = useNotificationsStore(s => s.addToast)
  const { apps } = useApps()
  const { running, lastResult, runTask } = useEmployee(employeeId === 'auto' ? 'bia' : employeeId)
  // useAgentChat usa employeeId real para threading; em 'auto' usa pseudo-id 'auto'
  const { messages, send, pending, clear, threadId, newThread, loadThread } = useAgentChat(employeeId)
  const [historyOpen, setHistoryOpen] = useState(false)
  const { activeVertical } = useVerticalStore()
  const { createTask } = useTasks({})
  const { createEvent } = useCalendarEvents({})

  // Pega primeiros 60 chars como título; resto vai para description
  function shortTitleFrom(text) {
    const s = (text || '').replace(/\n+/g, ' ').trim()
    return s.length > 60 ? s.slice(0, 57) + '…' : s
  }

  const [actionPending, setActionPending] = useState(null)  // 'task' | 'calendar' | null
  const [taskModal, setTaskModal] = useState(null)          // { message, title }
  const [calendarModal, setCalendarModal] = useState(null)  // { message, title, datetime }

  function openTaskModal(message) {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user' && m.ts <= message.ts)
    const title = shortTitleFrom(lastUserMsg?.content || message.content)
    setTaskModal({ message, title })
  }

  function openCalendarModal(message) {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user' && m.ts <= message.ts)
    const title = shortTitleFrom(lastUserMsg?.content || message.content)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    const datetime = tomorrow.toISOString().slice(0, 16)  // YYYY-MM-DDTHH:MM
    setCalendarModal({ message, title, datetime })
  }

  async function submitTask({ message, title, priority, dueAt }) {
    setActionPending('task')
    try {
      const taskId = await createTask({
        title: title.trim() || shortTitleFrom(message.content),
        description_md: `**Do chat ${message.agent_id || 'agent'} (${new Date(message.ts).toLocaleString('pt-PT')}):**\n\n${message.content}`,
        kind: 'task',
        priority: priority || 'normal',
        vertical: activeVertical && activeVertical !== 'all' ? activeVertical.toLowerCase() : null,
        owner_agent_id: message.agent_id || null,
        due_at: dueAt || null,
        source_kind: 'chat',
      })
      if (taskId) {
        addToast({ type: 'success', message: `✓ Task criada · #${String(taskId).slice(0, 8)}` })
        setTaskModal(null)
        // user fica no chat (não navega para /tasks)
      } else {
        addToast({ type: 'error', message: 'Erro ao criar task — vê consola' })
      }
    } finally {
      setActionPending(null)
    }
  }

  async function submitCalendar({ message, title, datetime, allDay }) {
    setActionPending('calendar')
    try {
      const when = new Date(datetime)
      const eventId = await createEvent({
        title: title.trim() || shortTitleFrom(message.content),
        description: message.content.slice(0, 1000),
        starts_at: when.toISOString(),
        all_day: !!allDay,
        kind: 'manual',
        owner_agent_id: message.agent_id || null,
        vertical: activeVertical && activeVertical !== 'all' ? activeVertical.toLowerCase() : null,
        color: '#8b5cf6',
      })
      if (eventId) {
        addToast({ type: 'success', message: `✓ Evento · ${when.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` })
        setCalendarModal(null)
        // user fica no chat
      } else {
        addToast({ type: 'error', message: 'Erro ao criar evento — vê consola' })
      }
    } finally {
      setActionPending(null)
    }
  }

  // Filtra heads pela vertical activa (V2/V5/etc). 'all' mostra todos.
  const availableHeads = DEPT_HEADS.filter(h => {
    if (h.id === 'auto') return true
    if (h.verticals === '*') return true
    if (!activeVertical || activeVertical === 'all') return true
    return h.verticals.includes(activeVertical)
  })

  // Se employeeId actual não está disponível na vertical, reset para 'auto'
  useEffect(() => {
    if (!availableHeads.find(h => h.id === employeeId)) {
      setEmployeeId('auto')
    }
  }, [activeVertical]) // eslint-disable-line react-hooks/exhaustive-deps

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
    // Passa active_employee_id para agent-chat carregar SOPs/legal/never-rules
    // O hook já tem o employeeId em scope, mas mantemos explicit para clareza
    await send(text)
  }

  const hasConversation = messages.length > 0
  const isBusy = pending || running

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      minHeight: 'calc(100vh - 40px)',
      maxWidth: 760, margin: '0 auto',
      padding: '0 20px',
    }}>
      {/* Top bar — New Chat + History */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 0', marginBottom: hasConversation ? 14 : 40,
      }}>
        <button
          onClick={() => newThread()}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text)', fontSize: '0.92rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          title="Começar nova conversa"
        >
          {hasConversation ? '↺ Nova conversa' : 'New Chat'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            {isBusy ? '⏳ A pensar…' : ''}
          </div>
          <button
            onClick={() => setHistoryOpen(true)}
            style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 5, padding: '4px 10px', cursor: 'pointer',
              color: 'var(--text-dim)', fontSize: '0.7rem',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
            title="Ver conversas anteriores"
          >
            ⏱ Histórico
          </button>
        </div>
      </div>

      {historyOpen && (
        <ChatHistoryDrawer
          employeeId={employeeId}
          activeThreadId={threadId}
          onPick={async (tid) => { await loadThread(tid); setHistoryOpen(false) }}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {taskModal && (
        <TaskModal
          state={taskModal}
          onChange={setTaskModal}
          onCancel={() => setTaskModal(null)}
          onSubmit={(data) => submitTask({ ...data, message: taskModal.message })}
          pending={actionPending === 'task'}
        />
      )}

      {calendarModal && (
        <CalendarModal
          state={calendarModal}
          onChange={setCalendarModal}
          onCancel={() => setCalendarModal(null)}
          onSubmit={(data) => submitCalendar({ ...data, message: calendarModal.message })}
          pending={actionPending === 'calendar'}
        />
      )}

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
            <ChatBubble key={i} message={m} onCreateTask={openTaskModal} onAddToCalendar={openCalendarModal} />
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

        {/* Quick-action cards (só quando não há conversa) — 3 em 1 linha, com cores */}
        {!hasConversation && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
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
                transition: 'transform 0.12s, background 0.12s, border-color 0.12s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--bg-elevated)'
                e.currentTarget.style.borderColor = qa.color
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--bg-card)'
                e.currentTarget.style.borderColor = 'var(--border)'
              }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: qa.color + '22',  // tint 13% opacity
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <qa.icon size={16} color={qa.color} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>{qa.label}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.4 }}>{qa.sub}</div>
              </div>
            </button>
          ))}
        </div>
        )}

        {/* Input bar — CookAI-style: textarea alto, fundo morno (tinted) */}
        <form onSubmit={handleSubmit} style={{
          width: '100%', maxWidth: 720,
          background: 'linear-gradient(180deg, #2a2218 0%, #211a13 100%)',  // warm dark
          border: '1px solid rgba(245,158,11,0.18)',
          borderRadius: 16,
          padding: 14,
          display: 'flex', flexDirection: 'column', gap: 12,
          boxShadow: '0 4px 18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}>
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) } }}
            placeholder={`Pergunta ao ${employeeId === 'auto' ? 'sistema (auto-routing)' : employeeId === 'bia' ? 'Bia' : employeeId}… (Shift+Enter = nova linha)`}
            disabled={isBusy}
            maxLength={2000}
            rows={3}
            style={{
              border: 'none', outline: 'none',
              background: 'transparent',
              fontSize: '0.92rem', color: 'var(--text)',
              padding: '4px 6px',
              width: '100%', boxSizing: 'border-box',
              resize: 'none',
              minHeight: 64,
              fontFamily: 'inherit',
              lineHeight: 1.5,
            }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Employee picker — heads filtrados por vertical activa */}
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                borderRadius: 99, padding: '5px 12px',
                fontSize: '0.72rem', color: 'var(--text)',
                cursor: 'pointer', outline: 'none',
              }}>
              {availableHeads.map(h => (
                <option key={h.id} value={h.id}>{h.label}</option>
              ))}
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
function ChatBubble({ message, onCreateTask, onAddToCalendar }) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant' && !message.error
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
        {/* Auto-routed badge — mostra quem respondeu quando o sistema decidiu */}
        {message.agent_id && (
          <div style={{
            fontSize: '0.58rem', fontWeight: 700,
            color: 'var(--text-dim)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {message.auto_routed ? '⤳ Auto-routed →' : '↳'} {message.agent_id}
          </div>
        )}
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

        {/* Action buttons — só em assistant replies não-erro */}
        {isAssistant && (onCreateTask || onAddToCalendar) && (
          <div style={{
            marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap',
            paddingTop: 8, borderTop: '1px solid var(--border)',
          }}>
            {onCreateTask && (
              <button
                onClick={() => onCreateTask(message)}
                style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 5, padding: '4px 10px',
                  fontSize: '0.65rem', color: 'var(--text-dim)', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}
                title="Criar task a partir desta resposta"
              >📝 Criar task</button>
            )}
            {onAddToCalendar && (
              <button
                onClick={() => onAddToCalendar(message)}
                style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 5, padding: '4px 10px',
                  fontSize: '0.65rem', color: 'var(--text-dim)', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}
                title="Adicionar ao calendário"
              >📅 Calendário</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ChatHistoryDrawer — sidebar com threads do agent ────────
const BUCKET_LABELS = {
  today: 'Hoje',
  yesterday: 'Ontem',
  this_week: 'Esta semana',
  this_month: 'Este mês',
  older: 'Mais antigas',
}

function ChatHistoryDrawer({ employeeId, activeThreadId, onPick, onClose }) {
  const [showArchived, setShowArchived] = useState(false)
  const { grouped, loading, archive } = useChatThreads(employeeId, { includeArchived: showArchived })

  const buckets = ['today', 'yesterday', 'this_week', 'this_month', 'older']

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 1100, display: 'flex', justifyContent: 'flex-end',
      }}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 340, maxWidth: '94vw', height: '100vh',
          background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <strong style={{ fontSize: '0.88rem' }}>Histórico · {employeeId}</strong>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-dim)', fontSize: '1.1rem', lineHeight: 1,
          }}>×</button>
        </div>

        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Mostrar arquivadas
          </label>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading && <div style={{ padding: 16, color: 'var(--text-dim)', fontSize: '0.78rem' }}>A carregar…</div>}
          {!loading && Object.keys(grouped).length === 0 && (
            <div style={{ padding: 16, color: 'var(--text-dim)', fontSize: '0.78rem' }}>
              Sem conversas anteriores com {employeeId}.
            </div>
          )}
          {buckets.map(b => grouped[b] && grouped[b].length > 0 && (
            <div key={b}>
              <div style={{
                padding: '10px 16px 4px',
                fontSize: '0.58rem', fontWeight: 700,
                color: 'var(--text-dim)',
                textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>{BUCKET_LABELS[b]}</div>
              {grouped[b].map(t => (
                <div key={t.id}
                  className={'sidebar-link' + (t.id === activeThreadId ? ' active' : '')}
                  style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2 }}
                  onClick={() => onPick(t.id)}
                  title={t.archived_at ? 'Arquivada' : 'Activa'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {t.title || `(sem título · ${t.message_count} msg)`}
                    </span>
                    {!t.archived_at && (
                      <button
                        onClick={(e) => { e.stopPropagation(); archive(t.id) }}
                        title="Arquivar"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-dim)', fontSize: '0.65rem', padding: '2px 6px',
                        }}
                      >📦</button>
                    )}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {new Date(t.last_message_at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    {' · '}{t.message_count} msg
                  </div>
                  {t.last_preview && (
                    <div style={{
                      fontSize: '0.66rem', color: 'var(--text-dim)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {t.last_preview}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}

// ─── TaskModal — pede título + prioridade + due (opcional) ────────
const modalOverlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
  padding: 20,
}
const modalCard = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 12, padding: 22, width: 460, maxWidth: '92vw',
  display: 'flex', flexDirection: 'column', gap: 10,
}
const modalInput = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text)', padding: '8px 11px', borderRadius: 5,
  fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit',
}

function TaskModal({ state, onChange, onCancel, onSubmit, pending }) {
  const [title, setTitle] = useState(state.title || '')
  const [priority, setPriority] = useState('normal')
  const [dueAt, setDueAt] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!title.trim() || pending) return
    onSubmit({ title, priority, dueAt: dueAt ? new Date(dueAt).toISOString() : null })
  }

  return (
    <div onClick={onCancel} style={modalOverlay}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} style={modalCard}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>📝 Criar task a partir do chat</h3>
        <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Título</label>
        <input value={title} onChange={e => setTitle(e.target.value)} autoFocus required style={modalInput} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
          <div>
            <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Prioridade</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} style={{ ...modalInput, width: '100%', marginTop: 4 }}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Due (opcional)</label>
            <input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} style={{ ...modalInput, width: '100%', marginTop: 4 }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button type="button" onClick={onCancel} style={{
            background: 'transparent', border: '1px solid var(--border)',
            padding: '7px 14px', borderRadius: 5, cursor: 'pointer',
            color: 'var(--text-dim)', fontSize: '0.78rem',
          }}>Cancelar</button>
          <button type="submit" disabled={pending || !title.trim()} style={{
            background: 'var(--text)', color: 'var(--bg)', border: 'none',
            padding: '7px 16px', borderRadius: 5, cursor: pending ? 'wait' : 'pointer',
            fontSize: '0.8rem', fontWeight: 700,
            opacity: (pending || !title.trim()) ? 0.5 : 1,
          }}>{pending ? 'A criar…' : 'Criar task'}</button>
        </div>
      </form>
    </div>
  )
}

// ─── CalendarModal — date+time picker real ────────
function CalendarModal({ state, onCancel, onSubmit, pending }) {
  const [title, setTitle] = useState(state.title || '')
  const [datetime, setDatetime] = useState(state.datetime)
  const [allDay, setAllDay] = useState(false)

  function submit(e) {
    e.preventDefault()
    if (!title.trim() || !datetime || pending) return
    onSubmit({ title, datetime, allDay })
  }

  return (
    <div onClick={onCancel} style={modalOverlay}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} style={modalCard}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>📅 Adicionar ao calendário</h3>
        <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Título</label>
        <input value={title} onChange={e => setTitle(e.target.value)} autoFocus required style={modalInput} />

        <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Data e hora</label>
        <input
          type="datetime-local"
          value={datetime}
          onChange={e => setDatetime(e.target.value)}
          required
          style={modalInput}
        />

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>
          <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} />
          Dia inteiro
        </label>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button type="button" onClick={onCancel} style={{
            background: 'transparent', border: '1px solid var(--border)',
            padding: '7px 14px', borderRadius: 5, cursor: 'pointer',
            color: 'var(--text-dim)', fontSize: '0.78rem',
          }}>Cancelar</button>
          <button type="submit" disabled={pending || !title.trim() || !datetime} style={{
            background: 'var(--text)', color: 'var(--bg)', border: 'none',
            padding: '7px 16px', borderRadius: 5, cursor: pending ? 'wait' : 'pointer',
            fontSize: '0.8rem', fontWeight: 700,
            opacity: (pending || !title.trim() || !datetime) ? 0.5 : 1,
          }}>{pending ? 'A criar…' : 'Adicionar'}</button>
        </div>
      </form>
    </div>
  )
}
