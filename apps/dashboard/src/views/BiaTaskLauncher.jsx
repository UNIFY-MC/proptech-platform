// BiaTaskLauncher — substitui o stub BiaPlaceholder
// Página /employees/bia · 3 cards de task + modal de input + TaskResultDrawer
//
// Sprint A: outreach_compose | pedido_triagem | daily_roundup
// Sprint B: vão entrar como recipes mutáveis em /context

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useEmployee } from '../hooks/useEmployee.js'
import TaskCard from '../components/bia/TaskCard.jsx'
import TaskResultDrawer from '../components/bia/TaskResultDrawer.jsx'

const TASKS = [
  {
    id: 'outreach_compose',
    icon: '✉️',
    title: 'Compor outreach owner',
    desc: 'Bia escreve mensagem WhatsApp R2 personalizada para um owner alpha. Aprovas antes de enviar.',
    badge: 'WHATSAPP_SEND',
    inputs: [
      { name: 'pessoa_id', label: 'pessoa_id (UUID do owner)', placeholder: '00000000-0000-0000-0000-000000000000', required: true },
      { name: 'contexto', label: 'Contexto opcional (texto livre)', placeholder: 'Ex: equipamentos novos registados', required: false, textarea: true },
    ],
  },
  {
    id: 'pedido_triagem',
    icon: '🔧',
    title: 'Triagem de pedido',
    desc: 'Bia classifica urgência, cita preço do catálogo, sugere prestador da rede PRATA. Aprovas o match.',
    badge: 'DB_INSERT',
    inputs: [
      { name: 'pedido_id', label: 'pedido_id (UUID do pedido_orcamento)', placeholder: '00000000-0000-0000-0000-000000000000', required: true },
    ],
  },
  {
    id: 'daily_roundup',
    icon: '🌅',
    title: 'Daily roundup',
    desc: 'Resumo diário para o teu inbox. Sem aprovação humana. Também corre por cron 07h30 PT.',
    badge: 'INBOX_ONLY',
    inputs: [],
  },
]

export default function BiaTaskLauncher() {
  const { running, lastResult, runTask } = useEmployee('bia')
  const [activeTask, setActiveTask] = useState(null) // {id, ...inputs}
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [formValues, setFormValues] = useState({})

  function openTask(task) {
    setActiveTask(task)
    setFormValues({})
  }

  async function handleSubmit() {
    if (!activeTask) return
    // Validação de inputs required
    for (const inp of activeTask.inputs) {
      if (inp.required && !formValues[inp.name]) {
        alert(`${inp.label} obrigatório`)
        return
      }
    }
    setActiveTask(null) // fecha modal
    setDrawerOpen(true)
    await runTask(activeTask.id, formValues)
  }

  return (
    <div>
      <Link to="/employees" style={{
        fontSize: '0.72rem', color: 'var(--text-dim)',
        textDecoration: 'none', display: 'inline-block', marginBottom: 14,
      }}>← Equipa</Link>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Bia · V5 Manutenção</h1>
        <div style={{
          fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 6, lineHeight: 1.5,
          maxWidth: 680,
        }}>
          Assistente de manutenção da plataforma PRATA. Compõe outreach, faz triagem de
          pedidos, e produz digest diário. Cada acção com efeito externo passa pela
          approvals_queue — tu decides.
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <span style={{
            padding: '2px 8px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 600,
            fontFamily: 'JetBrains Mono, monospace',
            background: 'rgba(16,185,129,0.12)', color: 'var(--success)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>active</span>
          <span style={{
            padding: '2px 8px', borderRadius: 4, fontSize: '0.6rem',
            fontFamily: 'JetBrains Mono, monospace',
            background: 'var(--bg-card)', color: 'var(--text-dim)',
          }}>claude-sonnet-4-6</span>
          <span style={{
            padding: '2px 8px', borderRadius: 4, fontSize: '0.6rem',
            fontFamily: 'JetBrains Mono, monospace',
            background: 'var(--bg-card)', color: 'var(--text-dim)',
          }}>edge: bia-chat</span>
        </div>
      </div>

      {/* Cards grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 14, marginBottom: 28,
      }}>
        {TASKS.map(t => (
          <TaskCard
            key={t.id}
            taskType={t.id}
            title={t.title}
            desc={t.desc}
            icon={t.icon}
            badge={t.badge}
            disabled={running}
            onClick={() => openTask(t)}
          />
        ))}
      </div>

      {/* Hint info */}
      <div style={{
        fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.6,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 8, padding: 14, maxWidth: 680,
      }}>
        <strong style={{ color: 'var(--text)' }}>Como funciona:</strong> Cada task chama a edge function{' '}
        <code style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'var(--info)',
        }}>bia-chat</code>{' '}— Bia decide via Claude API quais tools usar
        (<code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem' }}>
          bia_query_owner, bia_query_pedido, bia_query_prestadores, bia_query_catalogo
        </code>),
        compõe a resposta, e submete <strong>approval</strong> em{' '}
        <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'var(--info)' }}>
          system.approvals_queue
        </code>{' '}para tu decidires. Cada chamada é auditada em{' '}
        <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem' }}>
          core.agent_audit_log
        </code>.
      </div>

      {/* Modal de input */}
      {activeTask && (
        <Modal onClose={() => setActiveTask(null)}>
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem',
                color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>{activeTask.badge}</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: 2 }}>{activeTask.title}</div>
            </div>
            <button
              onClick={() => setActiveTask(null)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-dim)', fontSize: '1.4rem',
              }}>×</button>
          </div>

          <div style={{ padding: 20 }}>
            <p style={{
              fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.5, margin: '0 0 16px',
            }}>{activeTask.desc}</p>

            {activeTask.inputs.length === 0 ? (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                Sem parâmetros. Bia faz o roundup a partir do estado actual.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activeTask.inputs.map(inp => (
                  <div key={inp.name}>
                    <label style={{
                      display: 'block', fontSize: '0.66rem', fontWeight: 600,
                      color: 'var(--text-dim)', marginBottom: 4,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      {inp.label} {inp.required && <span style={{ color: 'var(--danger)' }}>*</span>}
                    </label>
                    {inp.textarea ? (
                      <textarea
                        value={formValues[inp.name] ?? ''}
                        onChange={e => setFormValues(v => ({ ...v, [inp.name]: e.target.value }))}
                        placeholder={inp.placeholder}
                        rows={3}
                        style={inputStyle} />
                    ) : (
                      <input
                        value={formValues[inp.name] ?? ''}
                        onChange={e => setFormValues(v => ({ ...v, [inp.name]: e.target.value }))}
                        placeholder={inp.placeholder}
                        style={inputStyle} />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{
              display: 'flex', gap: 8, marginTop: 20,
              borderTop: '1px solid var(--border)', paddingTop: 16,
            }}>
              <button onClick={handleSubmit} disabled={running} style={{
                padding: '8px 16px', background: 'var(--primary)', color: '#fff',
                border: 'none', borderRadius: 5, cursor: running ? 'wait' : 'pointer',
                fontSize: '0.78rem', fontWeight: 600,
              }}>
                {running ? 'A correr…' : 'Pedir à Bia'}
              </button>
              <button onClick={() => setActiveTask(null)} disabled={running} style={{
                padding: '8px 16px', background: 'transparent', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer',
                fontSize: '0.78rem',
              }}>Cancelar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Drawer de resultado */}
      {drawerOpen && lastResult && (
        <TaskResultDrawer
          result={lastResult}
          taskType={lastResult.task_type}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {/* Running overlay */}
      {running && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.32)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1500,
        }}>
          <div style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '20px 28px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <Spinner />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Bia a pensar…</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>
                Pode demorar 5-15s a consultar tools e compor o draft.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Modal({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.42)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 900, padding: 20,
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 10, width: 'min(540px, 100%)',
          maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>{children}</div>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{
      width: 18, height: 18, borderRadius: '50%',
      border: '2px solid var(--border)', borderTopColor: 'var(--primary)',
      animation: 'spin 0.8s linear infinite',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '7px 10px',
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 5, fontSize: '0.78rem', color: 'var(--text)',
  fontFamily: 'inherit', outline: 'none',
}
