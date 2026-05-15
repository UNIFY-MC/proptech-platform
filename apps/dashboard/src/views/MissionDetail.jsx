// MissionDetail — /tasks/:id · Full-screen mission view CookAI-style
//
// Layout 2-col: main (comment stream) + sidebar (DETAILS card).
// Header: title + icons + close. Footer: "Mission Completed in Xm Ys" + Add comment.
// Quando step.status='needs_human' → mostra Review Output block com Approve / Request revision.

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  X, ChevronDown, ChevronRight, ExternalLink, Briefcase, Archive, FileText,
  CheckCircle2, Loader2, Hand, MessageSquare, Send, Paperclip,
  Flag, FolderInput, GitBranch, User, BarChart3, FileIcon, ChevronUp,
  AlertCircle, Check,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { supabase } from '../lib/supabase.js'
import { useData } from '../hooks/useData.js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY

const STATUS_LABEL = {
  open:        { label: 'OPEN',         color: '#9ca3af', bg: '#374151' },
  in_progress: { label: 'IN PROGRESS',  color: '#bfdbfe', bg: '#1e3a8a' },
  blocked:     { label: 'BLOCKED',      color: '#fde68a', bg: '#78350f' },
  needs_human: { label: 'NEEDS YOU',    color: '#fcd34d', bg: '#78350f' },
  failed:      { label: 'FAILED',       color: '#fecaca', bg: '#7f1d1d' },
  cancelled:   { label: 'CANCELLED',    color: '#d1d5db', bg: '#4b5563' },
  done:        { label: 'COMPLETED',    color: '#86efac', bg: '#14532d' },
}

const PRIORITY_META = {
  low:    { color: '#6b7280', label: 'Low',    icon: '·' },
  normal: { color: '#3b82f6', label: 'Normal', icon: '⏵' },
  high:   { color: '#f59e0b', label: 'High',   icon: '▲' },
  urgent: { color: '#ef4444', label: 'Urgent', icon: '⚠' },
  medium: { color: '#f59e0b', label: 'Medium', icon: '▲' },
}

function formatDuration(seconds) {
  if (seconds == null) return null
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

function timeAgo(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('pt-PT')
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  }
  return timeAgo(iso)
}

async function callFn(fn, body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
    body: JSON.stringify(body),
  })
  return await res.json()
}

export default function MissionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data } = useData()
  const employees = data?.employees || []

  const [task, setTask] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [revisionPrompt, setRevisionPrompt] = useState('')
  const [reviewing, setReviewing] = useState(false)
  // Email draft state (Sprint M) — when kind='email_reply'
  const [editingDraft, setEditingDraft] = useState(false)
  const [draftSubject, setDraftSubject] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [showProgress, setShowProgress] = useState(true)
  const [showFiles, setShowFiles] = useState(true)
  const [showDescription, setShowDescription] = useState(true)
  const [showPrompt, setShowPrompt] = useState(true)
  const [showObjectives, setShowObjectives] = useState(true)

  const refresh = useCallback(async () => {
    if (!supabase || !id) return
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from('system_tasks').select('*').eq('id', id).single(),
      supabase.from('system_task_comments').select('*').eq('task_id', id).order('created_at', { ascending: true }),
    ])
    setTask(t)
    setComments(c || [])
    setLoading(false)
  }, [id])

  useEffect(() => { refresh() }, [refresh])

  // Realtime updates
  useEffect(() => {
    if (!supabase || !id) return
    const ch = supabase
      .channel(`mission-${id}`)
      .on('postgres_changes', { event: '*', schema: 'system', table: 'tasks', filter: `id=eq.${id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'system', table: 'task_comments', filter: `task_id=eq.${id}` }, refresh)
      .subscribe()
    return () => { try { supabase.removeChannel(ch) } catch {} }
  }, [id, refresh])

  const owner = useMemo(() => employees.find(e => e.id === task?.owner_agent_id), [task, employees])
  const steps = task?.steps || []
  const stepsDone = steps.filter(s => s.status === 'done').length
  const stepsTotal = steps.length
  const needsHumanStep = steps.find(s => s.status === 'needs_human')
  const statusMeta = task ? STATUS_LABEL[task.status] || STATUS_LABEL.open : null
  const priorityMeta = PRIORITY_META[task?.priority || 'normal']
  const duration = task?.duration_seconds
  const execution = task?.payload?.execution

  async function postComment() {
    if (!newComment.trim() || !supabase) return
    setPosting(true)
    await supabase.schema('system').from('task_comments').insert({
      task_id: id,
      author_kind: 'human',
      author_name: 'Mário',
      body_md: newComment.trim(),
      kind: 'comment',
    })
    setNewComment('')
    setPosting(false)
    refresh()
  }

  async function handleApprove() {
    if (reviewing || !task) return
    setReviewing(true)
    // Approve: marca step needs_human como done + adiciona comment + marca task done se for última
    const updatedSteps = steps.map(s =>
      s.status === 'needs_human'
        ? { ...s, status: 'done', approved_at: new Date().toISOString() }
        : s
    )
    const allDone = updatedSteps.every(s => s.status === 'done')
    await supabase.schema('system').from('tasks').update({
      steps: updatedSteps,
      status: allDone ? 'done' : 'in_progress',
      done_at: allDone ? new Date().toISOString() : null,
    }).eq('id', id)
    await supabase.schema('system').from('task_comments').insert({
      task_id: id, author_kind: 'human', author_name: 'Mário',
      body_md: '✓ Aprovado.', kind: 'approval',
    })
    setReviewing(false)
    refresh()
  }

  async function handleRequestRevision() {
    if (reviewing || !task || !revisionPrompt.trim()) return
    setReviewing(true)
    await supabase.schema('system').from('task_comments').insert({
      task_id: id, author_kind: 'human', author_name: 'Mário',
      body_md: revisionPrompt.trim(), kind: 'revision_request',
    })
    // Re-dispara o agent com o revision prompt no payload
    await supabase.schema('system').from('tasks').update({
      status: 'in_progress',
      payload: { ...(task.payload || {}), revision_request: revisionPrompt.trim(), revised_at: new Date().toISOString() },
    }).eq('id', id)
    callFn('task-execute', { task_id: id }).catch(() => {})
    setRevisionPrompt('')
    setReviewing(false)
    refresh()
  }

  async function handleSendEmail() {
    if (sendingEmail) return
    setSendingEmail(true)
    const res = await callFn('gmail-send', {
      task_id: id,
      edited_subject: editingDraft ? draftSubject : null,
      edited_body:    editingDraft ? draftBody    : null,
    })
    if (res?.mailto) {
      // Modo "draft" — abre client de email
      window.open(res.mailto, '_blank')
    }
    setSendingEmail(false)
    setEditingDraft(false)
    refresh()
  }

  // Sync draft state when task changes
  useEffect(() => {
    if (task?.kind === 'email_reply' && task.payload?.email_draft) {
      setDraftSubject(task.payload.email_draft.subject || '')
      setDraftBody(task.payload.email_draft.body_text || '')
    }
  }, [task])

  if (loading) {
    return (
      <div style={{ padding: 40, color: 'var(--text-dim)' }}>
        <Loader2 className="spin" size={20} /> A carregar…
      </div>
    )
  }
  if (!task) {
    return (
      <div style={{ padding: 40, color: 'var(--text-dim)' }}>
        Task não encontrada. <button onClick={() => navigate('/tasks')} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>Voltar</button>
      </div>
    )
  }

  return (
    <div style={S.page}>
      {/* ===== Header ===== */}
      <header style={S.header}>
        <div style={S.titleWrap}>
          <h1 style={S.title}>{task.title}</h1>
        </div>
        <div style={S.headerIcons}>
          <button style={S.iconBtn} title="Logs"><FileText size={16} /></button>
          <button style={S.iconBtn} title="Archive"><Archive size={16} /></button>
          <button style={S.iconBtn} title="Project"><Briefcase size={16} /></button>
          <button style={S.iconBtn} onClick={() => navigate('/tasks')} title="Fechar"><X size={16} /></button>
        </div>
      </header>

      {/* ===== Body 2-col ===== */}
      <div style={S.body}>
        {/* MAIN COL — Comment stream */}
        <div style={S.main}>
          {/* Email Draft (Sprint M) — apenas se kind='email_reply' */}
          {task.kind === 'email_reply' && task.payload?.email_draft && (
            <div style={{
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.35)',
              borderRadius: 8, padding: 16, marginBottom: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Send size={16} color="#60a5fa" />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#60a5fa' }}>
                  Email Draft — Reply to {task.payload.from_email}
                </h3>
                <span style={{
                  fontSize: 9, padding: '2px 7px', borderRadius: 3,
                  background: 'rgba(245,158,11,0.18)', color: '#f59e0b',
                  fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                  marginLeft: 'auto',
                }}>{(task.payload.intent || '').toUpperCase()}</span>
              </div>

              {/* Subject */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>Subject</div>
                {editingDraft ? (
                  <input
                    value={draftSubject}
                    onChange={(e) => setDraftSubject(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 5,
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{draftSubject || task.payload.email_draft.subject}</div>
                )}
              </div>

              {/* Body */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>Body</div>
                {editingDraft ? (
                  <textarea
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    rows={10}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 5,
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      color: 'var(--text)', fontSize: 12, outline: 'none',
                      fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical', boxSizing: 'border-box',
                    }}
                  />
                ) : (
                  <pre style={{
                    margin: 0, padding: 12, background: 'var(--bg-elevated)', borderRadius: 5,
                    fontSize: 12, color: 'var(--text)', whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit', lineHeight: 1.55, maxHeight: 320, overflow: 'auto',
                  }}>{draftBody || task.payload.email_draft.body_text}</pre>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                {!editingDraft ? (
                  <button
                    onClick={() => setEditingDraft(true)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '7px 12px', borderRadius: 5,
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      color: 'var(--text)', fontSize: 12, cursor: 'pointer',
                    }}
                  >✎ Edit</button>
                ) : (
                  <button
                    onClick={() => {
                      setEditingDraft(false)
                      setDraftSubject(task.payload.email_draft.subject || '')
                      setDraftBody(task.payload.email_draft.body_text || '')
                    }}
                    style={{
                      padding: '7px 12px', borderRadius: 5,
                      background: 'transparent', border: '1px solid var(--border)',
                      color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer',
                    }}
                  >Cancel</button>
                )}
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '7px 16px', borderRadius: 5,
                    background: '#10b981', color: '#fff', border: 'none',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {sendingEmail ? <Loader2 size={11} className="spin" /> : <Send size={11} />}
                  {editingDraft ? 'Save & Send' : 'Approve & Send'}
                </button>
              </div>
            </div>
          )}

          {/* Review output — agora aparece em qualquer task com output (needs_human OU done) */}
          {(needsHumanStep || (task.status === 'done' && execution?.output_md)) && (
            <div style={S.reviewBlock}>
              <div style={S.reviewHeader}>
                <MessageSquare size={16} color="#fcd34d" />
                <h3 style={S.reviewTitle}>
                  {needsHumanStep ? 'Review output (agent precisa aprovação)' : 'Re-rever output'}
                </h3>
              </div>
              <p style={S.reviewDesc}>
                {needsHumanStep
                  ? 'Aprova o resultado, ou envia um prompt de revisão para o agent re-executar a task.'
                  : 'Já aprovaste, mas podes pedir nova revisão se quiseres ajustar o output (ex: consultar legislação adicional, mudar tom, etc.)'}
              </p>
              <textarea
                value={revisionPrompt}
                onChange={(e) => setRevisionPrompt(e.target.value)}
                placeholder="Ex: Consulta o Código Civil arts. 1431-1432 e cita literalmente as alíneas."
                style={S.reviewTextarea}
                rows={3}
              />
              <div style={S.reviewActions}>
                {needsHumanStep && (
                  <button onClick={handleApprove} disabled={reviewing} style={S.approveBtn}>
                    <Check size={14} /> Aprovar
                  </button>
                )}
                <button onClick={handleRequestRevision} disabled={reviewing || !revisionPrompt.trim()} style={S.reviseBtn}>
                  <Send size={14} /> Pedir revisão
                </button>
              </div>
            </div>
          )}

          {/* Description collapsible */}
          {task.description_md && (
            <Collapsible
              label="DESCRIPTION"
              open={showDescription}
              onToggle={() => setShowDescription(!showDescription)}
            >
              <p style={S.bodyText}>{task.description_md}</p>
            </Collapsible>
          )}

          {/* Prompt collapsible */}
          {task.prompt_md && (
            <Collapsible
              label="PROMPT"
              open={showPrompt}
              onToggle={() => setShowPrompt(!showPrompt)}
            >
              <p style={S.bodyText}>{task.prompt_md}</p>
            </Collapsible>
          )}

          {/* Comment stream */}
          {comments.map((c) => (
            <CommentBubble key={c.id} comment={c} owner={owner} />
          ))}

          {/* Execution output (do agent) — fallback inline */}
          {execution?.output_md && (
            <div style={S.outputBlock}>
              <div style={S.outputLabel}>OUTPUT DO AGENT</div>
              <div style={S.outputMarkdown}>
                <ReactMarkdown
                  components={{
                    h1: ({ node, ...p }) => <h1 style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: 14, marginBottom: 8 }} {...p} />,
                    h2: ({ node, ...p }) => <h2 style={{ fontSize: '1rem', fontWeight: 700, marginTop: 12, marginBottom: 6, color: 'var(--text)' }} {...p} />,
                    h3: ({ node, ...p }) => <h3 style={{ fontSize: '0.88rem', fontWeight: 600, marginTop: 10, marginBottom: 4, color: 'var(--text)' }} {...p} />,
                    p: ({ node, ...p }) => <p style={{ margin: '6px 0', lineHeight: 1.55, color: 'var(--text)' }} {...p} />,
                    ul: ({ node, ...p }) => <ul style={{ margin: '6px 0 6px 20px', lineHeight: 1.55 }} {...p} />,
                    ol: ({ node, ...p }) => <ol style={{ margin: '6px 0 6px 20px', lineHeight: 1.55 }} {...p} />,
                    li: ({ node, ...p }) => <li style={{ margin: '3px 0' }} {...p} />,
                    code: ({ node, inline, ...p }) => inline
                      ? <code style={{ background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 3, fontSize: '0.82em', fontFamily: 'JetBrains Mono, monospace' }} {...p} />
                      : <code style={{ display: 'block', background: 'var(--bg)', padding: 10, borderRadius: 5, fontSize: '0.78em', fontFamily: 'JetBrains Mono, monospace', overflow: 'auto' }} {...p} />,
                    table: ({ node, ...p }) => <table style={{ borderCollapse: 'collapse', margin: '8px 0', fontSize: '0.85em' }} {...p} />,
                    th: ({ node, ...p }) => <th style={{ border: '1px solid var(--border)', padding: '5px 9px', background: 'var(--bg-elevated)', textAlign: 'left' }} {...p} />,
                    td: ({ node, ...p }) => <td style={{ border: '1px solid var(--border)', padding: '5px 9px' }} {...p} />,
                    blockquote: ({ node, ...p }) => <blockquote style={{ borderLeft: '3px solid var(--primary)', paddingLeft: 10, margin: '6px 0', color: 'var(--text-dim)' }} {...p} />,
                    a: ({ node, ...p }) => <a style={{ color: 'var(--primary)' }} target="_blank" rel="noreferrer" {...p} />,
                    hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '10px 0' }} />,
                    strong: ({ node, ...p }) => <strong style={{ color: 'var(--text)', fontWeight: 700 }} {...p} />,
                  }}
                >
                  {execution.output_md}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Objectives */}
          {steps.length > 0 && (
            <Collapsible
              label={`OBJECTIVES (${stepsDone}/${stepsTotal})`}
              open={showObjectives}
              onToggle={() => setShowObjectives(!showObjectives)}
            >
              <div style={S.objectivesList}>
                {steps.map((s, i) => (
                  <div key={i} style={S.objectiveRow}>
                    <StepIcon status={s.status} />
                    <span style={{
                      flex: 1,
                      color: s.status === 'done' ? 'var(--text-dim)' : 'var(--text)',
                      textDecoration: s.status === 'done' ? 'line-through' : 'none',
                      fontSize: 13,
                    }}>{s.name}</span>
                    <span style={S.objectiveBadge}>{(s.priority || 'medium').toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </Collapsible>
          )}

          {/* Mission Completed badge */}
          {task.status === 'done' && duration != null && (
            <div style={S.completedBadge}>
              <CheckCircle2 size={16} color="#10b981" />
              <span>Mission Completed in {formatDuration(duration)}</span>
            </div>
          )}

          {/* Add comment input — sticky bottom */}
          <div style={S.commentBar}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postComment()
              }}
              placeholder="Add your comment... (type / for playbooks)"
              style={S.commentInput}
              rows={2}
            />
            <div style={S.commentActions}>
              <button style={S.commentIconBtn} title="Anexar"><Paperclip size={14} /></button>
              <button
                onClick={postComment}
                disabled={posting || !newComment.trim()}
                style={S.commentSendBtn}
                title="Enviar (Ctrl+Enter)"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* SIDEBAR — DETAILS */}
        <aside style={S.sidebar}>
          <div style={S.sidebarHeader}>
            <span style={S.sidebarLabel}>DETAILS</span>
            <button style={S.iconBtn} onClick={() => navigate('/tasks')}><X size={14} /></button>
          </div>

          <DetailRow label="Status">
            {statusMeta && (
              <span style={{
                ...S.statusBadge,
                color: statusMeta.color,
                background: statusMeta.bg,
              }}>{statusMeta.label}</span>
            )}
          </DetailRow>

          <DetailRow label="Priority">
            <span style={S.priorityChip}>
              <span style={{ color: priorityMeta.color }}>{priorityMeta.icon}</span>
              {priorityMeta.label}
            </span>
          </DetailRow>

          <DetailRow label="Assignee">
            {owner ? (
              <span style={S.assigneeRow}>
                <span style={{ ...S.avatar, background: owner.color || '#6b4fa0' }}>
                  {(owner.name || '?')[0].toUpperCase()}
                </span>
                <span>{owner.name}</span>
              </span>
            ) : <span style={{ color: 'var(--text-dim)' }}>Unassigned</span>}
          </DetailRow>

          <DetailRow label="Project">
            <span style={S.linkRow}>
              <FolderInput size={12} />
              {task.project || 'No project'}
            </span>
          </DetailRow>

          <DetailRow label="Goal">
            <span style={S.linkRow}>
              <Flag size={12} />
              {task.goal || '—'}
            </span>
          </DetailRow>

          <DetailRow label="Branch">
            <span style={S.branchRow}>
              <GitBranch size={12} />
              <code style={S.branchCode}>{task.branch || 'main'}</code>
            </span>
          </DetailRow>

          {/* Progress collapsible */}
          <div style={S.section}>
            <button style={S.sectionHeader} onClick={() => setShowProgress(!showProgress)}>
              <span>Progress</span>
              <ChevronDown size={14} style={{ transform: showProgress ? 'none' : 'rotate(-90deg)' }} />
            </button>
            {showProgress && (
              <div style={S.progressList}>
                {steps.length === 0 ? (
                  <div style={S.progressEmpty}>Sem progresso registado.</div>
                ) : steps.map((s, i) => (
                  <div key={i} style={S.progressRow}>
                    <StepIcon status={s.status} />
                    <span style={{
                      flex: 1,
                      color: s.status === 'done' ? 'var(--text-dim)' : 'var(--text)',
                      textDecoration: s.status === 'done' ? 'line-through' : 'none',
                      fontSize: 12,
                    }}>{s.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Files collapsible */}
          <div style={S.section}>
            <button style={S.sectionHeader} onClick={() => setShowFiles(!showFiles)}>
              <span>Files</span>
              <ChevronDown size={14} style={{ transform: showFiles ? 'none' : 'rotate(-90deg)' }} />
            </button>
            {showFiles && (
              <div style={S.filesList}>
                {!task.files || task.files.length === 0 ? (
                  <div style={S.progressEmpty}>Sem ficheiros.</div>
                ) : task.files.map((f, i) => (
                  <a key={i} href={f.url} target="_blank" rel="noreferrer" style={S.fileRow}>
                    <FileIcon size={12} />
                    <span style={S.fileName}>{f.name}</span>
                    {f.size && <span style={S.fileSize}>{Math.round(f.size / 1024)} KB</span>}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Skills */}
          {task.skills && task.skills.length > 0 && (
            <div style={S.section}>
              <div style={S.sectionHeader}>
                <span>Skills</span>
              </div>
              <div style={S.skillsList}>
                {task.skills.map((sk) => (
                  <span key={sk} style={S.skillBadge}>
                    <span style={{ color: '#6b4fa0' }}>◉</span> {sk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Context loaded — Sprint Q1 */}
          {execution && (execution.agent_context_chars > 0 || execution.context_files_read > 0) && (
            <div style={S.section}>
              <div style={S.sectionHeader}>
                <span>Context loaded</span>
              </div>
              <div style={S.skillsList}>
                {execution.agent_context_chars > 0 && (
                  <span style={S.skillBadge} title="SOPs + ICPs + Legal + Never-rules auto-injectados">
                    <span style={{ color: '#2d6a4f' }}>◉</span> {Math.round(execution.agent_context_chars / 1000)}k chars · SOPs/Legal
                  </span>
                )}
                {execution.context_files_read > 0 && (
                  <span style={S.skillBadge} title="Ficheiros do Supabase Storage lidos por skill/task">
                    <span style={{ color: '#1a5296' }}>◉</span> {execution.context_files_read} file{execution.context_files_read > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

// ===== Sub-components =====

function Collapsible({ label, open, onToggle, children }) {
  return (
    <div style={S.collapsible}>
      <button style={S.collapsibleHeader} onClick={onToggle}>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span>{label}</span>
      </button>
      {open && <div style={S.collapsibleBody}>{children}</div>}
    </div>
  )
}

function StepIcon({ status }) {
  if (status === 'done')        return <CheckCircle2 size={12} color="#10b981" />
  if (status === 'running')     return <Loader2 size={12} color="#3b82f6" className="spin" />
  if (status === 'failed')      return <AlertCircle size={12} color="#ef4444" />
  if (status === 'needs_human') return <Hand size={12} color="#f59e0b" />
  return <span style={{ width: 12, height: 12, borderRadius: '50%', border: '1.5px solid var(--text-dim)', display: 'inline-block' }} />
}

function CommentBubble({ comment, owner }) {
  const isHuman = comment.author_kind === 'human'
  const isSystem = comment.author_kind === 'system'
  const isApproval = comment.kind === 'approval'
  const isRevision = comment.kind === 'revision_request'

  return (
    <div style={S.comment}>
      <span style={{
        ...S.avatar,
        background: isHuman ? '#3b82f6' : isSystem ? '#6b7280' : (owner?.color || '#6b4fa0'),
        marginTop: 2,
      }}>
        {(comment.author_name || (isHuman ? 'M' : 'A'))[0].toUpperCase()}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={S.commentHeader}>
          <span style={S.commentAuthor}>{comment.author_name || 'Sistema'}</span>
          {isApproval && <span style={{ ...S.commentKind, color: '#10b981' }}>aprovou</span>}
          {isRevision && <span style={{ ...S.commentKind, color: '#f59e0b' }}>pediu revisão</span>}
          {!isApproval && !isRevision && <span style={S.commentKind}>commented</span>}
          <span style={S.commentTime}>{formatTime(comment.created_at)}</span>
        </div>
        <div style={S.commentBody}>{comment.body_md}</div>
      </div>
    </div>
  )
}

function DetailRow({ label, children }) {
  return (
    <div style={S.detailRow}>
      <span style={S.detailLabel}>{label}</span>
      <span style={S.detailValue}>{children}</span>
    </div>
  )
}

// ===== Styles =====

const S = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 50px)',
    background: 'var(--bg)',
    color: 'var(--text)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid var(--border)',
  },
  titleWrap: { flex: 1 },
  title: { margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)' },
  headerIcons: { display: 'flex', gap: 4 },
  iconBtn: {
    background: 'none', border: 'none', cursor: 'pointer', padding: 6,
    borderRadius: 6, color: 'var(--text-dim)', display: 'flex', alignItems: 'center',
  },
  body: {
    display: 'grid',
    gridTemplateColumns: '1fr 340px',
    flex: 1,
    minHeight: 0,
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    padding: 24,
    gap: 14,
    overflowY: 'auto',
    minWidth: 0,
  },
  // Review block (needs_human approval UI)
  reviewBlock: {
    border: '1px solid #78350f',
    background: 'rgba(120, 53, 15, 0.08)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  reviewHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  reviewTitle: { margin: 0, fontSize: 15, fontWeight: 600, color: '#fcd34d' },
  reviewDesc: { margin: '0 0 12px 0', fontSize: 12, color: 'var(--text-dim)' },
  reviewTextarea: {
    width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 6, padding: 10, fontSize: 13, color: 'var(--text)',
    fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10,
  },
  reviewActions: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  approveBtn: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    color: 'var(--text)', borderRadius: 6, fontSize: 13, cursor: 'pointer',
  },
  reviseBtn: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
    background: '#1f2937', border: '1px solid var(--border)',
    color: 'var(--text)', borderRadius: 6, fontSize: 13, cursor: 'pointer',
  },
  // Collapsible (DESCRIPTION/PROMPT/OBJECTIVES)
  collapsible: { borderBottom: '1px solid var(--border)', paddingBottom: 10 },
  collapsibleHeader: {
    display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
    cursor: 'pointer', padding: '6px 0', color: 'var(--text-dim)',
    fontSize: 10, fontWeight: 600, letterSpacing: 1, fontFamily: 'JetBrains Mono, monospace',
  },
  collapsibleBody: { padding: '6px 0 4px 18px' },
  bodyText: { margin: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.55, whiteSpace: 'pre-wrap' },
  // Output block
  outputBlock: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 6, padding: 12,
  },
  outputLabel: {
    fontSize: 9, fontWeight: 600, letterSpacing: 1, color: 'var(--text-dim)',
    fontFamily: 'JetBrains Mono, monospace', marginBottom: 8,
  },
  outputPre: {
    margin: 0, fontSize: 12, color: 'var(--text)', whiteSpace: 'pre-wrap',
    fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.55,
  },
  outputMarkdown: {
    fontSize: 13, color: 'var(--text)', lineHeight: 1.55,
  },
  // Objectives
  objectivesList: { display: 'flex', flexDirection: 'column', gap: 8 },
  objectiveRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 10px', background: 'var(--bg-elevated)',
    border: '1px solid var(--border)', borderRadius: 6,
  },
  objectiveBadge: {
    fontSize: 9, fontWeight: 600, letterSpacing: 1, color: '#fcd34d',
    fontFamily: 'JetBrains Mono, monospace',
  },
  // Comment stream
  comment: { display: 'flex', gap: 10, padding: '6px 0' },
  commentHeader: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 },
  commentAuthor: { fontSize: 13, fontWeight: 600, color: 'var(--text)' },
  commentKind: { fontSize: 11, color: 'var(--text-dim)' },
  commentTime: { fontSize: 11, color: 'var(--text-dim)', marginLeft: 'auto' },
  commentBody: { fontSize: 13, color: 'var(--text)', lineHeight: 1.55, whiteSpace: 'pre-wrap' },
  // Completed badge
  completedBadge: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(16, 185, 129, 0.12)', border: '1px solid #14532d',
    color: '#10b981', padding: '10px 14px', borderRadius: 6, fontSize: 13,
    fontWeight: 500, alignSelf: 'flex-start',
  },
  // Comment input bar
  commentBar: {
    marginTop: 'auto',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    position: 'sticky',
    bottom: 0,
  },
  commentInput: {
    width: '100%', background: 'transparent', border: 'none', outline: 'none',
    color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, resize: 'none',
    boxSizing: 'border-box',
  },
  commentActions: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  commentIconBtn: {
    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
    color: 'var(--text-dim)',
  },
  commentSendBtn: {
    background: 'var(--primary)', border: 'none', color: '#fff',
    cursor: 'pointer', padding: '6px 10px', borderRadius: 6,
    display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
  },
  // Sidebar
  sidebar: {
    borderLeft: '1px solid var(--border)',
    padding: '16px 20px',
    overflowY: 'auto',
    background: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  sidebarHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 4,
  },
  sidebarLabel: {
    fontSize: 10, fontWeight: 600, letterSpacing: 1.5, color: 'var(--text-dim)',
    fontFamily: 'JetBrains Mono, monospace',
  },
  detailRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '4px 0',
  },
  detailLabel: { fontSize: 12, color: 'var(--text-dim)', minWidth: 72 },
  detailValue: { fontSize: 13, color: 'var(--text)', flex: 1 },
  statusBadge: {
    fontSize: 10, fontWeight: 600, letterSpacing: 1, padding: '3px 8px',
    borderRadius: 4, fontFamily: 'JetBrains Mono, monospace',
  },
  priorityChip: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 13, color: 'var(--text)',
  },
  assigneeRow: { display: 'inline-flex', alignItems: 'center', gap: 8 },
  avatar: {
    width: 22, height: 22, borderRadius: '50%', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', color: '#fff',
    fontSize: 10, fontWeight: 600, flexShrink: 0,
  },
  linkRow: { display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-dim)', fontSize: 13 },
  branchRow: { display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-dim)', fontSize: 12 },
  branchCode: {
    fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
    background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4,
    color: 'var(--text)',
  },
  section: {
    border: '1px solid var(--border)', borderRadius: 8, padding: '4px 0',
    background: 'var(--bg-elevated)', marginTop: 6,
  },
  sectionHeader: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text)', fontSize: 13, fontWeight: 500,
  },
  progressList: { display: 'flex', flexDirection: 'column', gap: 6, padding: '0 14px 12px' },
  progressRow: { display: 'flex', alignItems: 'center', gap: 8 },
  progressEmpty: { padding: '4px 14px 12px', fontSize: 11, color: 'var(--text-dim)' },
  filesList: { display: 'flex', flexDirection: 'column', gap: 4, padding: '0 14px 12px' },
  fileRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 8px', borderRadius: 4, fontSize: 12,
    color: 'var(--text)', textDecoration: 'none',
  },
  fileName: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileSize: { fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' },
  skillsList: { display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 14px 12px' },
  skillBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 8px', background: 'var(--bg)',
    border: '1px solid var(--border)', borderRadius: 4,
    fontSize: 11, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace',
  },
}
