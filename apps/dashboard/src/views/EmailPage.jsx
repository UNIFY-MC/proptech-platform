// EmailPage — /email · layout Outlook 3-painéis (folders | lista | preview)
// Splitters draggable + agrupamento por data + persistência de larguras em localStorage.
// Mostra inbound + outbound de system.email_messages, acções via gmail-action edge fn.

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mail, Inbox, Send, RefreshCw, Search, ExternalLink, FileText, Folder, ChevronDown, ChevronRight,
  Archive, Trash2, AlertOctagon, Eye, EyeOff, UserPlus, Reply, Forward, Loader2, Paperclip,
} from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import DailyRoundupCard from '../components/DailyRoundupCard.jsx'

// Agrupamento por data (Outlook style: Today, Yesterday, This week, Last week, Older)
function dateBucket(iso) {
  if (!iso) return { key: 'sem-data', label: 'Sem data', order: 999 }
  const d = new Date(iso)
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startYesterday = new Date(startToday); startYesterday.setDate(startYesterday.getDate() - 1)
  const dow = now.getDay() // 0=dom, 1=seg…
  const startWeek = new Date(startToday); startWeek.setDate(startWeek.getDate() - ((dow + 6) % 7)) // segunda da semana actual
  const startLastWeek = new Date(startWeek); startLastWeek.setDate(startLastWeek.getDate() - 7)
  if (d >= startToday)      return { key: 'today',     label: 'Hoje',          order: 1 }
  if (d >= startYesterday)  return { key: 'yesterday', label: 'Ontem',         order: 2 }
  if (d >= startWeek)       return { key: 'thisweek',  label: 'Esta semana',   order: 3 }
  if (d >= startLastWeek)   return { key: 'lastweek',  label: 'Semana passada',order: 4 }
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  if (d >= startMonth)      return { key: 'thismonth', label: 'Este mês',      order: 5 }
  return { key: 'older', label: 'Mais antigos', order: 6 }
}

function formatBytes(b) {
  if (!b) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1024*1024) return `${Math.round(b/1024)} KB`
  return `${(b/1024/1024).toFixed(1)} MB`
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY

const DIRECTION_META = {
  inbound:  { label: 'IN',  icon: Inbox, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  outbound: { label: 'OUT', icon: Send,  color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
}

const STATUS_META = {
  received:          { label: 'Recebido',   color: '#3b82f6' },
  awaiting_approval: { label: 'A aprovar',  color: '#f59e0b' },
  approved:          { label: 'Aprovado',   color: '#10b981' },
  sent:              { label: 'Enviado',    color: '#10b981' },
  draft:             { label: 'Rascunho',   color: '#6b7280' },
  failed:            { label: 'Falhado',    color: '#ef4444' },
  archived:          { label: 'Arquivado',  color: '#6b7280' },
  trashed:           { label: 'Lixo',       color: '#6b7280' },
  spam:              { label: 'Spam',       color: '#dc2626' },
}

function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function AgentBadge({ agentId, size = 'sm' }) {
  if (!agentId) {
    return <span style={{ fontSize: 9, color: 'var(--text-dim)', fontStyle: 'italic' }}>—</span>
  }
  const colors = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#84cc16','#fbbf24']
  const hash = agentId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const color = colors[hash % colors.length]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: size === 'sm' ? '1px 6px' : '2px 8px',
      borderRadius: 10,
      background: `${color}22`, color,
      fontSize: size === 'sm' ? 9 : 10, fontWeight: 600,
      fontFamily: 'JetBrains Mono, monospace',
    }}>{agentId}</span>
  )
}

async function callGmailAction(gmailId, action) {
  const res = await window.fetch(`${SUPABASE_URL}/functions/v1/gmail-action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
    body: JSON.stringify({ staff_id: 'p7.digitall@gmail.com', gmail_id: gmailId, action }),
  })
  return res.json()
}

async function callSyncEmails() {
  await window.fetch(`${SUPABASE_URL}/functions/v1/gmail-sync-oauth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
    body: JSON.stringify({}),
  })
}

export default function EmailPage() {
  const navigate = useNavigate()
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [filter, setFilter] = useState('awaiting_routing')  // landing default = "a rever pelo agent"
  const [search, setSearch] = useState('')
  const [agentFilter, setAgentFilter] = useState('all')
  const [verticalFilter, setVerticalFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [showReply, setShowReply] = useState(false)

  const fetchEmails = useCallback(async () => {
    if (!supabase) return setLoading(false)
    setLoading(true)
    const { data } = await supabase
      .from('system_email_messages')
      .select('*')
      .order('received_at', { ascending: false, nullsFirst: false })
      .order('sent_at',     { ascending: false, nullsFirst: false })
      .order('created_at',  { ascending: false })
      .limit(500)
    setEmails(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchEmails() }, [fetchEmails])

  const handleSync = async () => {
    setSyncing(true)
    await callSyncEmails()
    await fetchEmails()
    setSyncing(false)
  }

  const filtered = useMemo(() => {
    let arr = emails
    if (filter === 'inbound')          arr = arr.filter(e => e.direction === 'inbound' && !['archived','trashed','spam'].includes(e.status))
    if (filter === 'outbound')         arr = arr.filter(e => e.direction === 'outbound')
    if (filter === 'awaiting_routing') arr = arr.filter(e => e.status === 'awaiting_routing')
    if (filter === 'awaiting_approval')arr = arr.filter(e => e.status === 'awaiting_approval')
    if (filter === 'received')         arr = arr.filter(e => e.status === 'received')
    if (filter === 'archive')          arr = arr.filter(e => e.status === 'archived')
    if (filter === 'trash')            arr = arr.filter(e => e.status === 'trashed' || e.status === 'spam')
    if (filter === 'all')              arr = arr.filter(e => !['trashed','spam'].includes(e.status))
    if (agentFilter !== 'all')         arr = arr.filter(e => e.routed_to_agent === agentFilter)
    if (verticalFilter !== 'all')      arr = arr.filter(e => e.vertical === verticalFilter)
    if (search) {
      const q = search.toLowerCase()
      arr = arr.filter(e =>
        e.subject?.toLowerCase().includes(q) ||
        e.from_email?.toLowerCase().includes(q) ||
        e.body_snippet?.toLowerCase().includes(q) ||
        e.routed_to_agent?.toLowerCase().includes(q) ||
        e.classify_intent?.toLowerCase().includes(q),
      )
    }
    return arr
  }, [emails, filter, search, agentFilter, verticalFilter])

  // Dropdowns: mostra TODAS as opções possíveis (não só as presentes)
  const allAgents = [
    'bia','sofia','enzo','orquestrador-condo','financeiro-condo',
    'compliance-condo','atendimento-condo','docs-condo','comunicacao-condo',
    'diretor-marketing','gestor-leads','ceo-agent','cfo-agent',
  ]
  const allVerticals = ['V2','V3','V4','V5','core']

  // Auto-seleccionar primeiro email se nada seleccionado
  useEffect(() => {
    if (!selectedId && filtered.length > 0) {
      setSelectedId(filtered[0].id)
    }
  }, [filtered, selectedId])

  const selected = useMemo(() => emails.find(e => e.id === selectedId), [emails, selectedId])

  const counts = useMemo(() => ({
    all:                emails.filter(e => !['trashed','spam'].includes(e.status)).length,
    awaiting_routing:   emails.filter(e => e.status === 'awaiting_routing').length,
    awaiting_approval:  emails.filter(e => e.status === 'awaiting_approval').length,
    received:           emails.filter(e => e.status === 'received').length,
    inbound:            emails.filter(e => e.direction === 'inbound' && !['archived','trashed','spam'].includes(e.status)).length,
    outbound:           emails.filter(e => e.direction === 'outbound').length,
    archive:            emails.filter(e => e.status === 'archived').length,
    trash:              emails.filter(e => e.status === 'trashed' || e.status === 'spam').length,
  }), [emails])

  const doAction = async (action) => {
    if (!selected || busy) return
    if (action === 'reply') { setShowReply(true); return }
    if (action === 'refresh') { await fetchEmails(); return }
    if (action === 'view_task' && selected.task_id) {
      navigate(`/tasks/${selected.task_id}`)
      return
    }
    setBusy(true)

    if (action === 'approve_send') {
      // Aprovar draft do agente e enviar via Gmail
      try {
        const res = await window.fetch(`${SUPABASE_URL}/functions/v1/gmail-send-google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
          body: JSON.stringify({
            staff_id: 'p7.digitall@gmail.com',
            to: selected.from_email,
            subject: selected.draft_subject,
            body_text: selected.draft_body,
            thread_id: selected.thread_id,
            reply_to_message_id: selected.message_id,
            email_id: selected.id,
          }),
        })
        const data = await res.json()
        if (!data.ok) throw new Error(data.error || 'send_failed')
        if (selected.external_id) await callGmailAction(selected.external_id, 'mark_read')
      } catch (err) {
        alert('Falha ao enviar: ' + (err.message || err))
        setBusy(false)
        return
      }
      await fetchEmails()
      const idx = filtered.findIndex(e => e.id === selectedId)
      const next = filtered[idx + 1] || filtered[idx - 1]
      setSelectedId(next?.id || null)
      setBusy(false)
      return
    }

    if (action === 'reject_draft') {
      // Limpar draft: status volta para awaiting_routing (será re-tentado pelo cron)
      try {
        await supabase.schema('system').from('email_messages').update({
          draft_body: null, draft_subject: null, draft_agent: null,
          draft_generated_at: null, status: 'received', updated_at: new Date().toISOString(),
        }).eq('id', selected.id)
      } catch (err) { console.error('reject_draft', err) }
      await fetchEmails()
      setBusy(false)
      return
    }

    if (action === 'create_task') {
      // Abrir tarefa em vez de responder — atribui ao agente já encaminhado
      try {
        const { data: task, error } = await supabase.schema('system').from('tasks').insert({
          title: `📧 ${selected.subject || '(sem assunto)'}`,
          description_md: `**De:** ${selected.from_email}\n\n**Recebido:** ${new Date(selected.received_at).toLocaleString('pt-PT')}\n\n---\n\n${selected.body_text || selected.body_snippet || ''}`,
          status: 'open', priority: 'normal', kind: 'email_followup',
          vertical: selected.vertical || null,
          owner_agent_id: selected.routed_to_agent || null,
          source_kind: 'email', source_id: selected.id,
          payload: { email_from: selected.from_email, email_subject: selected.subject, classify_intent: selected.classify_intent },
          tags: ['email', selected.classify_intent].filter(Boolean),
        }).select('id').single()
        if (error) throw error
        // Linka task ao email + arquiva (já tratado)
        await supabase.schema('system').from('email_messages').update({
          task_id: task.id, status: 'archived', updated_at: new Date().toISOString(),
        }).eq('id', selected.id)
      } catch (err) {
        alert('Falha ao criar tarefa: ' + (err.message || err))
        setBusy(false); return
      }
      await fetchEmails()
      const idx = filtered.findIndex(e => e.id === selectedId)
      const next = filtered[idx + 1] || filtered[idx - 1]
      setSelectedId(next?.id || null)
      setBusy(false); return
    }

    if (action === 'mark_handled') {
      // Marca como tratado (arquiva sem responder) — útil quando o email é informativo ou já resolveste por outro canal
      try {
        await supabase.schema('system').from('email_messages').update({
          status: 'archived', updated_at: new Date().toISOString(),
        }).eq('id', selected.id)
      } catch (err) { console.error('mark_handled', err) }
      await fetchEmails()
      const idx = filtered.findIndex(e => e.id === selectedId)
      const next = filtered[idx + 1] || filtered[idx - 1]
      setSelectedId(next?.id || null)
      setBusy(false); return
    }

    await callGmailAction(selected.external_id, action)
    await fetchEmails()
    if (['trash','junk','archive'].includes(action)) {
      const idx = filtered.findIndex(e => e.id === selectedId)
      const next = filtered[idx + 1] || filtered[idx - 1]
      setSelectedId(next?.id || null)
    }
    setBusy(false)
  }

  // ─── 3-pane Outlook layout: widths persistidos em localStorage ──────────
  const [foldersW, setFoldersW] = useState(() => Number(localStorage.getItem('email_foldersW')) || 220)
  const [listW,    setListW]    = useState(() => Number(localStorage.getItem('email_listW'))    || 460)
  useEffect(() => { localStorage.setItem('email_foldersW', String(foldersW)) }, [foldersW])
  useEffect(() => { localStorage.setItem('email_listW',    String(listW)) },    [listW])

  // Splitter drag — folders / list
  const draggingRef = useRef(null)
  const onDragStart = (which) => (e) => {
    e.preventDefault()
    draggingRef.current = which
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }
  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current) return
      if (draggingRef.current === 'folders') {
        setFoldersW(Math.max(160, Math.min(400, e.clientX - 12)))
      } else if (draggingRef.current === 'list') {
        setListW(Math.max(280, Math.min(900, e.clientX - foldersW - 24)))
      }
    }
    const onUp = () => {
      if (draggingRef.current) {
        draggingRef.current = null
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [foldersW])

  // Agrupar filtered por bucket de data
  const grouped = useMemo(() => {
    const map = new Map()
    filtered.forEach(e => {
      const b = dateBucket(e.received_at || e.sent_at || e.created_at)
      if (!map.has(b.key)) map.set(b.key, { ...b, items: [] })
      map.get(b.key).items.push(e)
    })
    return Array.from(map.values()).sort((a, b) => a.order - b.order)
  }, [filtered])

  return (
    <div style={{ padding: 0, margin: 0, height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
      {/* Top ribbon: header + sync + search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)', flexShrink: 0,
      }}>
        <h1 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>Email</h1>
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          {emails.length} · sync 10 min · p7.digitall@gmail.com
        </span>
        <div style={{ flex: 1 }} />
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 5, padding: '5px 10px', minWidth: 240,
        }}>
          <Search size={11} color="var(--text-dim)" />
          <input
            placeholder="Procurar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'none', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 12, flex: 1,
            }}
          />
        </div>
        <button
          onClick={handleSync} disabled={syncing}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 5,
            background: 'var(--bg)', border: '1px solid var(--border)',
            color: 'var(--text)', cursor: syncing ? 'wait' : 'pointer', fontSize: 11,
          }}
        >
          <RefreshCw size={11} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          {syncing ? 'A sincronizar…' : 'Send / Receive'}
        </button>
      </div>

      {/* 3-pane Outlook layout */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ─── PANE 1: Folders sidebar ──────────────────────── */}
        <div style={{
          width: foldersW, flexShrink: 0,
          background: 'var(--bg-card)', borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 12px', flex: 1, overflowY: 'auto' }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color: 'var(--text-dim)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
              fontFamily: 'JetBrains Mono, monospace', padding: '4px 6px',
            }}>p7.digitall@gmail.com</div>
            {[
              { id: 'awaiting_routing',  label: 'A rever',           count: counts.awaiting_routing,  icon: AlertOctagon, color: '#f59e0b' },
              { id: 'awaiting_approval', label: 'Drafts pendentes',  count: counts.awaiting_approval, icon: FileText,     color: '#3b82f6' },
              { id: 'received',          label: 'Caixa de entrada',  count: counts.received,          icon: Inbox },
              { id: 'all',               label: 'Todos',             count: counts.all,               icon: Mail },
              { id: 'inbound',           label: 'Recebidos',         count: counts.inbound,           icon: Inbox },
              { id: 'outbound',          label: 'Enviados',          count: counts.outbound,          icon: Send },
              { id: 'archive',           label: 'Arquivo',           count: counts.archive,           icon: Archive },
              { id: 'trash',             label: 'Lixo / Spam',       count: counts.trash,             icon: Trash2 },
            ].map(f => {
              const active = filter === f.id
              const FolderIcon = f.icon || Folder
              return (
                <button
                  key={f.id}
                  onClick={() => { setFilter(f.id); setSelectedId(null) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', textAlign: 'left',
                    padding: '7px 10px', borderRadius: 4, marginBottom: 1,
                    background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    color: active ? 'var(--text)' : 'var(--text)',
                    fontSize: 12,
                    borderLeft: `3px solid ${active ? (f.color || '#3b82f6') : 'transparent'}`,
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <FolderIcon size={13} color={f.color || 'var(--text-dim)'} />
                  <span style={{ flex: 1 }}>{f.label}</span>
                  {f.count > 0 && (
                    <span style={{
                      fontSize: 10, color: active ? 'var(--text)' : 'var(--text-dim)',
                      fontWeight: active ? 700 : 500,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}>{f.count}</span>
                  )}
                </button>
              )
            })}

            {/* Filters secundários: agent + vertical */}
            <div style={{ marginTop: 16, padding: '0 6px' }}>
              <div style={{
                fontSize: 9, fontWeight: 700, color: 'var(--text-dim)',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
                fontFamily: 'JetBrains Mono, monospace',
              }}>Filtrar</div>
              <select
                value={agentFilter}
                onChange={e => { setAgentFilter(e.target.value); setSelectedId(null) }}
                style={{
                  padding: '5px 8px', borderRadius: 4, marginBottom: 5,
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: 11, width: '100%',
                }}
              >
                <option value="all">Todos os agents</option>
                {allAgents.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select
                value={verticalFilter}
                onChange={e => { setVerticalFilter(e.target.value); setSelectedId(null) }}
                style={{
                  padding: '5px 8px', borderRadius: 4,
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: 11, width: '100%',
                }}
              >
                <option value="all">Todas verticais</option>
                {allVerticals.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Splitter 1: folders / list */}
        <div
          onMouseDown={onDragStart('folders')}
          style={{
            width: 4, cursor: 'col-resize', flexShrink: 0,
            background: 'var(--border)', opacity: 0.5,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'var(--primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.background = 'var(--border)' }}
        />

        {/* ─── PANE 2: Lista (com colunas + agrupamento) ────── */}
        <div style={{
          width: listW, flexShrink: 0,
          background: 'var(--bg-card)', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Daily Roundup card no topo da lista — só visível em "all" e "awaiting_*" */}
          {['all','awaiting_routing','awaiting_approval','received','inbound'].includes(filter) && (
            <div style={{ padding: '10px 12px 0' }}>
              <DailyRoundupCard />
            </div>
          )}

          {/* Coluna headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '24px 1fr auto auto',
            gap: 8, padding: '8px 12px',
            borderBottom: '1px solid var(--border)',
            fontSize: 9, fontWeight: 700, color: 'var(--text-dim)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            fontFamily: 'JetBrains Mono, monospace',
            background: 'var(--bg)',
          }}>
            <span></span>
            <span>From / Subject</span>
            <span>Received</span>
            <span style={{ minWidth: 50, textAlign: 'right' }}>Size</span>
          </div>

          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)' }}>A carregar…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
              <Mail size={28} style={{ opacity: 0.4 }} /><br/>
              Sem emails em "{filter}".
            </div>
          ) : (
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {grouped.map(g => (
                <div key={g.key}>
                  {/* Header do grupo (Outlook style "▼ Friday") */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', background: 'var(--bg)',
                    borderBottom: '1px solid var(--border)',
                    position: 'sticky', top: 0, zIndex: 1,
                  }}>
                    <ChevronDown size={11} color="var(--text-dim)" />
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: 'var(--text)',
                    }}>{g.label}</span>
                    <span style={{
                      fontSize: 9, color: 'var(--text-dim)',
                      fontFamily: 'JetBrains Mono, monospace', marginLeft: 4,
                    }}>{g.items.length}</span>
                  </div>

                  {g.items.map(e => {
                    const isSelected = e.id === selectedId
                    const dirMeta = DIRECTION_META[e.direction] || DIRECTION_META.inbound
                    const counterparty = e.direction === 'inbound'
                      ? (e.from_name || e.from_email || '—')
                      : (Array.isArray(e.to_emails) ? e.to_emails[0] : (e.to_emails || '—'))
                    const dateRef = e.received_at || e.sent_at || e.created_at
                    const attachments = Array.isArray(e.attachments) ? e.attachments : []
                    const bodyLen = (e.body_text?.length || 0) + (e.body_html?.length || 0)
                    return (
                      <div
                        key={e.id}
                        onClick={() => setSelectedId(e.id)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '24px 1fr auto auto',
                          gap: 8, padding: '8px 12px', cursor: 'pointer',
                          background: isSelected ? 'rgba(59,130,246,0.15)' : 'transparent',
                          borderLeft: `3px solid ${isSelected ? dirMeta.color : 'transparent'}`,
                          borderBottom: '1px solid var(--border-soft, rgba(255,255,255,0.04))',
                          fontSize: 12,
                        }}
                        onMouseEnter={ev => { if (!isSelected) ev.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                        onMouseLeave={ev => { if (!isSelected) ev.currentTarget.style.background = 'transparent' }}
                      >
                        {/* Icon: paperclip se tem attachments, reply se outbound, senão vazio */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {attachments.length > 0 && <Paperclip size={11} color="var(--text-dim)" />}
                          {e.direction === 'outbound' && attachments.length === 0 && <Reply size={11} color="#10b981" />}
                        </div>
                        {/* From + subject + snippet */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontSize: 12, fontWeight: 600, color: 'var(--text)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{counterparty}</div>
                          <div style={{
                            fontSize: 11, color: 'var(--text)', marginTop: 1,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{e.subject || '(sem assunto)'}</div>
                          {(e.body_snippet || e.body_text) && (
                            <div style={{
                              fontSize: 10, color: 'var(--text-dim)', marginTop: 1,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{e.body_snippet || (e.body_text || '').slice(0, 100)}</div>
                          )}
                          {e.routed_to_agent && (
                            <div style={{ marginTop: 3 }}><AgentBadge agentId={e.routed_to_agent} /></div>
                          )}
                        </div>
                        {/* Received */}
                        <div style={{
                          fontSize: 10, color: 'var(--text-dim)',
                          fontFamily: 'JetBrains Mono, monospace',
                          whiteSpace: 'nowrap', alignSelf: 'flex-start', paddingTop: 1,
                        }}>{formatDate(dateRef)}</div>
                        {/* Size */}
                        <div style={{
                          fontSize: 10, color: 'var(--text-dim)',
                          fontFamily: 'JetBrains Mono, monospace',
                          whiteSpace: 'nowrap', alignSelf: 'flex-start', paddingTop: 1,
                          minWidth: 50, textAlign: 'right',
                        }}>{formatBytes(bodyLen)}</div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Splitter 2: list / preview */}
        <div
          onMouseDown={onDragStart('list')}
          style={{
            width: 4, cursor: 'col-resize', flexShrink: 0,
            background: 'var(--border)', opacity: 0.5,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'var(--primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.background = 'var(--border)' }}
        />

        {/* ─── PANE 3: Preview (scrollable end-to-end para ver draft + email original) ─── */}
        <div style={{
          flex: 1, minWidth: 320,
          background: 'var(--bg-card)',
          overflowY: 'auto', overflowX: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {!selected ? (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 8, color: 'var(--text-dim)',
            }}>
              <Mail size={36} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: 12 }}>Selecciona um email da lista</span>
            </div>
          ) : (
            <EmailPreview
              email={selected}
              busy={busy}
              onAction={doAction}
              navigate={navigate}
            />
          )}
        </div>
      </div>

      {showReply && selected && (
        <ReplyModal
          email={selected}
          onClose={() => setShowReply(false)}
          onSent={async () => {
            setShowReply(false)
            await fetchEmails()
            // Marcar email original como lido depois de responder
            await callGmailAction(selected.external_id, 'mark_read')
          }}
        />
      )}
    </div>
  )
}

const AGENT_OPTIONS = [
  { id: 'bia',                 label: 'Bia · V5 Manutenção' },
  { id: 'sofia',               label: 'Sofia · V3 Seguros' },
  { id: 'enzo',                label: 'Enzo · V4 Energia' },
  { id: 'orquestrador-condo',  label: 'Orquestrador · V2 COO' },
  { id: 'financeiro-condo',    label: 'Fina · V2 Financeiro' },
  { id: 'compliance-condo',    label: 'Clara · Compliance' },
  { id: 'atendimento-condo',   label: 'Ana · Atendimento' },
  { id: 'docs-condo',          label: 'Dora · Documentos' },
  { id: 'comunicacao-condo',   label: 'Cami · Comunicações' },
  { id: 'diretor-marketing',   label: 'Diogo · Marketing' },
  { id: 'gestor-leads',        label: 'Leo · Leads' },
  { id: 'ceo-agent',           label: 'CEO · Estratégico' },
  { id: 'cfo-agent',           label: 'CFO · Financeiro core' },
]

function ReplyModal({ email, onClose, onSent }) {
  const [agentId, setAgentId]       = useState(email.routed_to_agent || 'atendimento-condo')
  const [instructions, setInstructions] = useState('')
  const [draft, setDraft]           = useState({ subject: '', body_text: '' })
  const [generating, setGenerating] = useState(false)
  const [sending, setSending]       = useState(false)
  const [error, setError]           = useState(null)

  const generate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await window.fetch(`${SUPABASE_URL}/functions/v1/gmail-draft-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
        body: JSON.stringify({ email_id: email.id, agent_id: agentId, user_instructions: instructions || undefined }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'generate_failed')
      setDraft({ subject: data.subject, body_text: data.body_text })
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setGenerating(false)
    }
  }

  const send = async () => {
    if (!draft.subject || !draft.body_text) { setError('Falta subject ou corpo'); return }
    setSending(true)
    setError(null)
    try {
      const res = await window.fetch(`${SUPABASE_URL}/functions/v1/gmail-send-google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
        body: JSON.stringify({
          staff_id: 'p7.digitall@gmail.com',
          to: email.from_email,
          subject: draft.subject,
          body_text: draft.body_text,
          thread_id: email.thread_id,
          reply_to_message_id: email.message_id,
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'send_failed')
      await onSent()
    } catch (e) {
      setError(String(e.message || e))
      setSending(false)
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 720, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto',
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <strong style={{ fontSize: 14 }}>Responder com agent</strong>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              Para: {email.from_name || email.from_email}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 18 }}>×</button>
        </div>

        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600 }}>Quem responde?</label>
            <select
              value={agentId}
              onChange={e => setAgentId(e.target.value)}
              style={{
                width: '100%', marginTop: 4, padding: '7px 10px',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                borderRadius: 5, color: 'var(--text)', fontSize: 12, cursor: 'pointer',
              }}
            >
              {AGENT_OPTIONS.map(a => (
                <option key={a.id} value={a.id}>
                  {a.label}{email.routed_to_agent === a.id ? ' · sugerida' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600 }}>
              Instruções opcionais (Claude segue à risca)
            </label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="Ex: agradecer interesse, propor reunião 5ª feira à tarde, mencionar V3..."
              rows={2}
              style={{
                width: '100%', marginTop: 4, padding: '7px 10px',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                borderRadius: 5, color: 'var(--text)', fontSize: 12,
                fontFamily: 'inherit', resize: 'vertical',
              }}
            />
          </div>

          <button
            onClick={generate}
            disabled={generating}
            style={{
              padding: '8px 12px', borderRadius: 5,
              background: 'var(--primary)', color: '#fff', border: 'none',
              cursor: generating ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
            }}
          >
            {generating ? <Loader2 size={12} className="spin" /> : <Mail size={12} />}
            {generating ? 'A gerar...' : (draft.subject ? 'Re-gerar draft' : 'Gerar draft')}
          </button>

          {error && (
            <div style={{
              padding: '8px 10px', borderRadius: 5,
              background: 'rgba(239,68,68,0.15)', color: '#ef4444',
              fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
            }}>⚠ {error}</div>
          )}

          {draft.subject && (
            <>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <label style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600 }}>Subject</label>
                <input
                  value={draft.subject}
                  onChange={e => setDraft({ ...draft, subject: e.target.value })}
                  style={{
                    width: '100%', marginTop: 4, padding: '7px 10px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    borderRadius: 5, color: 'var(--text)', fontSize: 12,
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600 }}>Corpo</label>
                <textarea
                  value={draft.body_text}
                  onChange={e => setDraft({ ...draft, body_text: e.target.value })}
                  rows={14}
                  style={{
                    width: '100%', marginTop: 4, padding: '10px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    borderRadius: 5, color: 'var(--text)', fontSize: 12,
                    fontFamily: 'system-ui, sans-serif', lineHeight: 1.55, resize: 'vertical',
                  }}
                />
              </div>
            </>
          )}
        </div>

        <div style={{
          padding: '12px 18px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 14px', borderRadius: 5,
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text)', cursor: 'pointer', fontSize: 12,
            }}
          >Cancelar</button>
          {draft.subject && (
            <button
              onClick={send}
              disabled={sending}
              style={{
                padding: '8px 16px', borderRadius: 5,
                background: '#10b981', color: '#fff', border: 'none',
                cursor: sending ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              {sending ? <Loader2 size={12} className="spin" /> : <Send size={12} />}
              {sending ? 'A enviar...' : 'Enviar via Gmail'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function EmailPreview({ email, busy, onAction, navigate }) {
  const dirMeta    = DIRECTION_META[email.direction] || DIRECTION_META.inbound
  const statusMeta = STATUS_META[email.status]       || { label: email.status, color: 'var(--text-dim)' }
  const isInbound  = email.direction === 'inbound'

  // Refinar draft: caixa inline com instrução para o agente regenerar
  const [refineMsg, setRefineMsg] = useState('')
  const [refining, setRefining]   = useState(false)
  const [refineErr, setRefineErr] = useState(null)
  const [history, setHistory]     = useState([])

  // Fetch histórico de refinements para este email
  useEffect(() => {
    if (!email.id || !email.draft_body || !supabase) { setHistory([]); return }
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.schema('system').from('draft_refinements')
        .select('id, instruction, created_at, created_by, before_subject, after_subject')
        .eq('email_id', email.id)
        .order('created_at', { ascending: false })
        .limit(10)
      if (!cancelled) setHistory(data || [])
    })()
    return () => { cancelled = true }
  }, [email.id, email.draft_body, email.draft_generated_at])

  const refineDraft = async () => {
    if (!refineMsg.trim() || refining) return
    setRefining(true)
    setRefineErr(null)
    const beforeSubject = email.draft_subject
    const beforeBody    = email.draft_body
    const agentId       = email.draft_agent || email.routed_to_agent
    try {
      const res = await window.fetch(`${SUPABASE_URL}/functions/v1/gmail-draft-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
        body: JSON.stringify({
          email_id: email.id,
          agent_id: agentId,
          user_instructions: refineMsg,
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'refine_failed')
      // Persiste o draft refinado em email_messages
      await supabase.schema('system').from('email_messages').update({
        draft_subject:      data.subject,
        draft_body:         data.body_text,
        draft_generated_at: new Date().toISOString(),
        updated_at:         new Date().toISOString(),
      }).eq('id', email.id)
      // Guarda a instrução para o agente "aprender" nas próximas vezes
      await supabase.schema('system').from('draft_refinements').insert({
        email_id:       email.id,
        agent_id:       agentId,
        intent:         email.classify_intent,
        instruction:    refineMsg,
        before_subject: beforeSubject,
        before_body:    beforeBody,
        after_subject:  data.subject,
        after_body:     data.body_text,
      })
      setRefineMsg('')
      onAction('refresh')
    } catch (err) {
      setRefineErr(String(err.message || err))
    } finally {
      setRefining(false)
    }
  }

  const ActionBtn = ({ icon: Icon, label, action, color = 'var(--text)', danger }) => (
    <button
      disabled={busy}
      onClick={() => onAction(action)}
      title={label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '6px 10px', borderRadius: 5,
        background: 'var(--bg-elevated)',
        border: `1px solid ${danger ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
        color: danger ? '#ef4444' : color,
        cursor: busy ? 'wait' : 'pointer', fontSize: 11, fontWeight: 500,
      }}
      onMouseEnter={e => { if (!busy) e.currentTarget.style.background = 'var(--bg)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)' }}
    >
      <Icon size={12} /> {label}
    </button>
  )

  return (
    <>
      {/* Header com acções */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{
                padding: '2px 7px', borderRadius: 3,
                background: dirMeta.bg, color: dirMeta.color,
                fontSize: 9, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                textTransform: 'uppercase',
              }}>{isInbound ? 'Recebido' : 'Enviado'}</span>
              <span style={{
                padding: '2px 7px', borderRadius: 3,
                background: `${statusMeta.color}22`, color: statusMeta.color,
                fontSize: 9, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                textTransform: 'uppercase',
              }}>{statusMeta.label}</span>
              <AgentBadge agentId={email.routed_to_agent} size="md" />
            </div>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: '4px 0', color: 'var(--text)' }}>
              {email.subject || '(sem assunto)'}
            </h2>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              <strong style={{ color: 'var(--text)' }}>{isInbound ? 'De:' : 'Para:'}</strong>{' '}
              {isInbound
                ? `${email.from_name || ''} <${email.from_email}>`
                : (Array.isArray(email.to_emails) ? email.to_emails.join(', ') : email.to_emails)}
              {' · '}
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {new Date(email.received_at || email.sent_at || email.created_at).toLocaleString('pt-PT')}
              </span>
            </div>
          </div>
        </div>

        {/* Acções */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <ActionBtn icon={Reply}    label="Responder"   action="reply" />
          <ActionBtn icon={UserPlus} label="Atribuir agent" action="assign" />
          <ActionBtn icon={email.status === 'archived' ? Inbox : Archive} label={email.status === 'archived' ? 'Mover Inbox' : 'Arquivar'} action="archive" />
          <ActionBtn icon={EyeOff}   label="Marcar não lido" action="mark_unread" />
          <ActionBtn icon={AlertOctagon} label="Junk" action="junk" />
          <ActionBtn icon={Trash2}   label="Apagar" action="trash" danger />
          {email.task_id && (
            <button
              onClick={() => navigate(`/tasks/${email.task_id}`)}
              style={{
                marginLeft: 'auto',
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 10px', borderRadius: 5,
                background: 'var(--primary)', color: '#fff', border: 'none',
                cursor: 'pointer', fontSize: 11, fontWeight: 600,
              }}
            >
              <ExternalLink size={11} /> Ver task
            </button>
          )}
        </div>
      </div>

      {/* ACÇÃO SUGERIDA pelo agente classificador (mostrar mesmo sem draft) */}
      {email.suggested_action && email.suggested_action !== 'reply' && (
        <SuggestedActionBanner email={email} busy={busy} onAction={onAction} />
      )}

      {/* DRAFT PROPOSTO (quando existe — sempre em destaque acima do email original) */}
      {email.draft_body && (
        <div style={{
          margin: '12px 16px 0', padding: '14px 16px',
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.35)',
          borderLeft: '4px solid #10b981', borderRadius: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{
              padding: '3px 8px', borderRadius: 3,
              background: '#10b981', color: '#fff',
              fontSize: 9, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>📝 Draft proposto</span>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              por <strong style={{ color: 'var(--text)' }}>{email.draft_agent || email.routed_to_agent}</strong>
              {email.draft_generated_at && (
                <> · gerado {new Date(email.draft_generated_at).toLocaleString('pt-PT')}</>
              )}
            </span>
          </div>
          <div style={{
            fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8,
          }}><strong style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Para:</strong> {email.from_email}</div>
          <div style={{
            fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10,
          }}><strong style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Assunto:</strong> {email.draft_subject}</div>
          <div style={{
            padding: '12px 14px', background: 'var(--bg)', borderRadius: 4,
            fontSize: 13, color: 'var(--text)', lineHeight: 1.6,
            whiteSpace: 'pre-wrap', fontFamily: 'inherit',
            maxHeight: 280, overflowY: 'auto',
          }}>{email.draft_body}</div>

          {/* Caixa "pergunta/refina à Fina" — inline */}
          <div style={{ marginTop: 12 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text-dim)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5,
              fontFamily: 'JetBrains Mono, monospace',
            }}>💬 Pergunta ou refina a resposta</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
              <textarea
                value={refineMsg}
                onChange={(e) => setRefineMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); refineDraft() }
                }}
                placeholder={`Ex: "responde mais formal", "menciona o IRS e o prazo", "pede o NIF para emitir o recibo"…`}
                rows={2}
                style={{
                  flex: 1, padding: '8px 10px',
                  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 5,
                  color: 'var(--text)', fontSize: 12, fontFamily: 'inherit', resize: 'vertical',
                  outline: 'none', lineHeight: 1.5,
                }}
                disabled={refining}
              />
              <button
                onClick={refineDraft}
                disabled={refining || !refineMsg.trim()}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '0 14px', borderRadius: 5,
                  background: refineMsg.trim() ? 'var(--primary)' : 'var(--bg-elevated)',
                  color: refineMsg.trim() ? '#fff' : 'var(--text-dim)',
                  border: 'none',
                  cursor: refining || !refineMsg.trim() ? 'not-allowed' : 'pointer',
                  fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                }}
              >
                {refining ? <Loader2 size={12} className="spin" /> : <Reply size={12} />}
                {refining ? 'A refinar…' : 'Refinar'}
              </button>
            </div>
            {refineErr && (
              <div style={{ fontSize: 11, color: '#ef4444', marginTop: 5 }}>Erro: {refineErr}</div>
            )}
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4, fontStyle: 'italic' }}>
              Enter para enviar · Shift+Enter para nova linha · o {email.draft_agent || email.routed_to_agent} regera o draft com a tua instrução
            </div>

            {/* Histórico de refinements para este email */}
            {history.length > 0 && (
              <div style={{
                marginTop: 10, padding: '8px 10px',
                background: 'rgba(107,79,160,0.08)',
                border: '1px solid rgba(107,79,160,0.20)',
                borderRadius: 5,
              }}>
                <div style={{
                  fontSize: 9, fontWeight: 700, color: 'var(--primary)',
                  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
                  fontFamily: 'JetBrains Mono, monospace',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  💭 Histórico de instruções ({history.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {history.map(h => (
                    <div key={h.id} style={{
                      display: 'flex', gap: 8, alignItems: 'flex-start',
                      padding: '5px 7px', background: 'var(--bg)',
                      borderRadius: 3, fontSize: 11, lineHeight: 1.45,
                    }}>
                      <span style={{
                        fontSize: 9, color: 'var(--text-dim)',
                        fontFamily: 'JetBrains Mono, monospace',
                        whiteSpace: 'nowrap', flexShrink: 0, paddingTop: 1,
                      }} title={new Date(h.created_at).toLocaleString('pt-PT')}>
                        {(() => {
                          const d = new Date(h.created_at)
                          return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
                        })()}
                      </span>
                      <span style={{ flex: 1, color: 'var(--text)' }}>
                        <strong style={{ color: 'var(--text-dim)', fontWeight: 500 }}>{h.created_by || 'mario'}:</strong> {h.instruction}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{
            display: 'flex', gap: 5, marginTop: 12,
            flexWrap: 'nowrap', alignItems: 'center',
          }}>
            <button
              disabled={busy}
              onClick={() => onAction('approve_send')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '7px 11px', borderRadius: 5,
                background: '#10b981', color: '#fff', border: 'none',
                cursor: busy ? 'wait' : 'pointer', fontSize: 11, fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              <Send size={11} /> Aprovar e enviar
            </button>
            <button
              disabled={busy}
              onClick={() => onAction('reply')}
              title="Editar antes de enviar"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '7px 11px', borderRadius: 5,
                background: 'var(--bg)', color: 'var(--text)',
                border: '1px solid var(--border)',
                cursor: busy ? 'wait' : 'pointer', fontSize: 11, fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              <Reply size={11} /> Editar
            </button>
            <button
              disabled={busy}
              onClick={() => onAction('reject_draft')}
              title="Apaga este draft (o agente regera no próximo ciclo)"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '7px 11px', borderRadius: 5,
                background: 'transparent', color: 'var(--text-dim)',
                border: '1px solid var(--border)',
                cursor: busy ? 'wait' : 'pointer', fontSize: 11, fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              <Trash2 size={11} /> Rejeitar
            </button>
            <button
              disabled={busy}
              onClick={() => onAction('create_task')}
              title="Cria task em system.tasks para o agente tratar internamente (sem responder ao remetente)"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '7px 11px', borderRadius: 5,
                background: 'transparent', color: 'var(--text-dim)',
                border: '1px solid var(--border)',
                cursor: busy ? 'wait' : 'pointer', fontSize: 11, fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              📋 Abrir tarefa
            </button>
            <button
              disabled={busy}
              onClick={() => onAction('mark_handled')}
              title="Marca como tratado sem responder (ex: já resolveste por outro canal)"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '7px 11px', borderRadius: 5,
                background: 'transparent', color: 'var(--text-dim)',
                border: '1px solid var(--border)',
                cursor: busy ? 'wait' : 'pointer', fontSize: 11, fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              ✓ Já tratado
            </button>
          </div>
        </div>
      )}

      {/* Email original — sempre visível para validar a resposta proposta */}
      {email.draft_body && (
        <div style={{
          margin: '16px 16px 6px', padding: '6px 10px',
          background: 'var(--bg-elevated)', borderRadius: 4,
          fontSize: 10, fontWeight: 700, color: 'var(--text-dim)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          fontFamily: 'JetBrains Mono, monospace',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Mail size={11} />
          Email original do cliente
          <span style={{ marginLeft: 'auto', fontWeight: 500, textTransform: 'none', fontSize: 10 }}>
            (valida antes de aprovar)
          </span>
        </div>
      )}

      {/* Body — a coluna preview faz scroll inteira; aqui só conteúdo */}
      <div style={{ minHeight: 0 }}>
        {email.body_html ? (
          <iframe
            srcDoc={email.body_html}
            sandbox=""
            style={{
              width: '100%',
              height: 500,
              border: 'none', background: '#fff',
            }}
            title="email-body"
          />
        ) : (
          <pre style={{
            padding: '14px 18px', margin: 0,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            fontSize: 12, color: 'var(--text)', lineHeight: 1.55,
            fontFamily: 'system-ui, sans-serif', background: 'var(--bg-card)',
          }}>{email.body_text || email.body_snippet || '(sem corpo)'}</pre>
        )}
      </div>
    </>
  )
}

// ─── SuggestedActionBanner ──────────────────────────────────────────────
// Mostra a acção decidida pelo agente classificador (Haiku) quando não é "reply"
function SuggestedActionBanner({ email, busy, onAction }) {
  const action = email.suggested_action
  const meta = {
    create_task:          { icon: '📋', label: 'Abrir tarefa interna', color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.4)',
                            description: 'O agente decidiu que este email requer acção interna (sem responder ao remetente).' },
    mark_handled:         { icon: '✓',  label: 'Marcar como tratado',   color: '#10b981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.4)',
                            description: 'O agente decidiu que este email é informativo ou já tratado noutro canal.' },
    newsletter_archive:   { icon: '📰', label: 'Arquivar newsletter',   color: '#6b7280', bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.4)',
                            description: 'Newsletter / marketing automático — sem necessidade de resposta.' },
    spam:                 { icon: '🚫', label: 'Spam',                  color: '#dc2626', bg: 'rgba(220,38,38,0.10)', border: 'rgba(220,38,38,0.4)',
                            description: 'Phishing / lixo — já movido para Junk do Gmail.' },
    needs_human_decision: { icon: '🤔', label: 'O agente está em dúvida', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.4)',
                            description: 'O agente não conseguiu decidir com confiança. Decide tu o que fazer.' },
  }[action]

  if (!meta) return null

  return (
    <div style={{
      margin: '12px 16px 0', padding: '14px 16px',
      background: meta.bg, border: `1px solid ${meta.border}`,
      borderLeft: `4px solid ${meta.color}`, borderRadius: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>{meta.icon}</span>
        <span style={{
          padding: '3px 8px', borderRadius: 3,
          background: meta.color, color: '#fff',
          fontSize: 9, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>Acção sugerida pelo agente</span>
        <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{meta.label}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 8 }}>
        {meta.description}
      </div>
      {email.suggested_action_reason && (
        <div style={{
          fontSize: 11, color: 'var(--text)', padding: '8px 10px',
          background: 'var(--bg)', borderRadius: 4, marginBottom: 10,
          fontStyle: 'italic',
        }}>
          <strong style={{ color: 'var(--text-dim)', fontStyle: 'normal' }}>Porquê:</strong> {email.suggested_action_reason}
        </div>
      )}

      {/* CTA principal por acção sugerida */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {action === 'create_task' && email.task_id && (
          <button onClick={() => onAction('view_task')} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 5,
            background: meta.color, color: '#fff', border: 'none',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}>
            <ExternalLink size={12} /> Ver tarefa criada
          </button>
        )}
        {action === 'create_task' && !email.task_id && (
          <button onClick={() => onAction('create_task')} disabled={busy} style={{
            padding: '7px 14px', borderRadius: 5, background: meta.color, color: '#fff',
            border: 'none', cursor: busy ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600,
          }}>📋 Confirmar e abrir tarefa</button>
        )}
        {action === 'needs_human_decision' && (
          <>
            <button onClick={() => onAction('reply')} disabled={busy} style={{
              padding: '7px 14px', borderRadius: 5, background: meta.color, color: '#fff',
              border: 'none', cursor: busy ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600,
            }}>↩ Responder eu</button>
            <button onClick={() => onAction('create_task')} disabled={busy} style={{
              padding: '7px 14px', borderRadius: 5, background: 'var(--bg)', color: 'var(--text)',
              border: '1px solid var(--border)', cursor: busy ? 'wait' : 'pointer', fontSize: 12,
            }}>📋 Abrir tarefa</button>
            <button onClick={() => onAction('mark_handled')} disabled={busy} style={{
              padding: '7px 14px', borderRadius: 5, background: 'var(--bg)', color: 'var(--text)',
              border: '1px solid var(--border)', cursor: busy ? 'wait' : 'pointer', fontSize: 12,
            }}>✓ Já tratado</button>
          </>
        )}
        {(action === 'mark_handled' || action === 'newsletter_archive') && (
          <button onClick={() => onAction('reply')} disabled={busy} style={{
            padding: '7px 14px', borderRadius: 5, background: 'var(--bg)', color: 'var(--text)',
            border: '1px solid var(--border)', cursor: busy ? 'wait' : 'pointer', fontSize: 12,
          }}>↩ Quero responder mesmo assim</button>
        )}
      </div>
    </div>
  )
}
