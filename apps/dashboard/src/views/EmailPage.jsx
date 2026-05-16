// EmailPage — /email · split-pane: lista esquerda + preview sempre visível direita
// Mostra inbound + outbound de system.email_messages, acções via gmail-action edge fn.

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mail, Inbox, Send, RefreshCw, Search, ExternalLink,
  Archive, Trash2, AlertOctagon, Eye, EyeOff, UserPlus, Reply, Forward, Loader2,
} from 'lucide-react'
import { supabase } from '../lib/supabase.js'

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

  const allAgents = useMemo(() => {
    const set = new Set(emails.filter(e => e.routed_to_agent).map(e => e.routed_to_agent))
    return Array.from(set).sort()
  }, [emails])

  const allVerticals = useMemo(() => {
    const set = new Set(emails.filter(e => e.vertical).map(e => e.vertical))
    return Array.from(set).sort()
  }, [emails])

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
    setBusy(true)
    await callGmailAction(selected.external_id, action)
    await fetchEmails()
    if (['trash','junk','archive'].includes(action)) {
      const idx = filtered.findIndex(e => e.id === selectedId)
      const next = filtered[idx + 1] || filtered[idx - 1]
      setSelectedId(next?.id || null)
    }
    setBusy(false)
  }

  return (
    <div style={{ padding: '8px 0 20px', maxWidth: 1500, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>Email</h1>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '2px 0 0' }}>
            {emails.length} emails · sync automático 10 min via Gmail OAuth (p7.digitall@gmail.com)
          </p>
        </div>
        <button
          onClick={handleSync} disabled={syncing}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 6,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text)', cursor: syncing ? 'wait' : 'pointer', fontSize: 12,
          }}
        >
          <RefreshCw size={12} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          {syncing ? 'A sincronizar…' : 'Sync agora'}
        </button>
      </div>

      {/* Filters principais */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {[
          { id: 'awaiting_routing',  label: 'A rever',       count: counts.awaiting_routing,  color: '#f59e0b' },
          { id: 'awaiting_approval', label: 'Drafts pendentes', count: counts.awaiting_approval, color: '#3b82f6' },
          { id: 'received',          label: 'Recebido',      count: counts.received },
          { id: 'all',               label: 'Todos',         count: counts.all },
          { id: 'inbound',           label: 'Inbound',       count: counts.inbound,  icon: Inbox },
          { id: 'outbound',          label: 'Enviados',      count: counts.outbound, icon: Send },
          { id: 'archive',           label: 'Arquivo',       count: counts.archive },
          { id: 'trash',             label: 'Lixo',          count: counts.trash },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => { setFilter(f.id); setSelectedId(null) }}
            style={{
              padding: '5px 10px', borderRadius: 5,
              background: filter === f.id ? 'var(--primary)' : 'var(--bg-card)',
              border: `1px solid ${filter === f.id ? 'var(--primary)' : 'var(--border)'}`,
              color: filter === f.id ? '#fff' : (f.color || 'var(--text)'),
              cursor: 'pointer', fontSize: 11, fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          >
            {f.icon && <f.icon size={11} />}
            {f.label}
            <span style={{
              fontSize: 9, padding: '0 5px', borderRadius: 8,
              background: filter === f.id ? 'rgba(255,255,255,0.25)' : 'var(--bg-elevated)',
              fontFamily: 'JetBrains Mono, monospace',
            }}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Sub-filtros: agent + vertical + search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={agentFilter}
          onChange={e => { setAgentFilter(e.target.value); setSelectedId(null) }}
          style={{
            padding: '5px 8px', borderRadius: 5,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: 11, cursor: 'pointer', minWidth: 160,
          }}
        >
          <option value="all">Todos os agents</option>
          {allAgents.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={verticalFilter}
          onChange={e => { setVerticalFilter(e.target.value); setSelectedId(null) }}
          style={{
            padding: '5px 8px', borderRadius: 5,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: 11, cursor: 'pointer', minWidth: 120,
          }}
        >
          <option value="all">Todas verticais</option>
          {allVerticals.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        {(agentFilter !== 'all' || verticalFilter !== 'all') && (
          <button
            onClick={() => { setAgentFilter('all'); setVerticalFilter('all') }}
            style={{
              padding: '4px 8px', borderRadius: 4, fontSize: 10,
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-dim)', cursor: 'pointer',
            }}
          >× Limpar</button>
        )}
        <div style={{
          marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
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
      </div>

      {/* Split-pane: lista | preview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '380px 1fr',
        gap: 10,
        height: 'calc(100vh - 220px)',
      }}>
        {/* LEFT — list */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)' }}>A carregar…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
              <Mail size={28} style={{ opacity: 0.4 }} /><br/>
              Sem emails em "{filter}".
            </div>
          ) : (
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filtered.map(e => {
                const isSelected = e.id === selectedId
                const dirMeta = DIRECTION_META[e.direction] || DIRECTION_META.inbound
                const counterparty = e.direction === 'inbound'
                  ? (e.from_name || e.from_email || '—')
                  : (Array.isArray(e.to_emails) ? e.to_emails[0] : (e.to_emails || '—'))
                const dateRef = e.received_at || e.sent_at || e.created_at
                return (
                  <button
                    key={e.id}
                    onClick={() => setSelectedId(e.id)}
                    style={{
                      width: '100%', textAlign: 'left', cursor: 'pointer',
                      padding: '10px 12px',
                      background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                      border: 'none', borderLeft: `3px solid ${isSelected ? dirMeta.color : 'transparent'}`,
                      borderBottom: '1px solid var(--border-soft, rgba(255,255,255,0.04))',
                      display: 'flex', flexDirection: 'column', gap: 3,
                    }}
                    onMouseEnter={ev => { if (!isSelected) ev.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                    onMouseLeave={ev => { if (!isSelected) ev.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{
                        padding: '1px 5px', borderRadius: 3,
                        background: dirMeta.bg, color: dirMeta.color,
                        fontSize: 8, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                      }}>{dirMeta.label}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: 'var(--text)',
                        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{counterparty}</span>
                      <span style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>{timeAgo(dateRef)}</span>
                    </div>
                    <div style={{
                      fontSize: 11, color: 'var(--text)', fontWeight: 500,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{e.subject || '(sem assunto)'}</div>
                    <div style={{
                      fontSize: 10, color: 'var(--text-dim)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{e.body_snippet || (e.body_text || '').slice(0, 80)}</div>
                    {e.routed_to_agent && (
                      <div style={{ marginTop: 2 }}><AgentBadge agentId={e.routed_to_agent} /></div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* RIGHT — preview */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column',
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

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {email.body_html ? (
          <iframe
            srcDoc={email.body_html}
            sandbox=""
            style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
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
