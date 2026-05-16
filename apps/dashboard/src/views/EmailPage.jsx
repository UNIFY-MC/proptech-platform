// EmailPage — /email · vê emails recebidos + enviados de system.email_messages
// Filtros: All / Inbound / Outbound · classifica por agent responsável
//
// Dados:
//   - inbound  → sincronizado pelo cron gmail-sync-oauth (10min)
//   - outbound → escrito pelo gmail-send-google (envio agents) ou gmail-send (Resend)
//
// Agent responsável: campo `routed_to_agent` (preenchido pelo gmail-inbound classifier)
// Quando ausente, fallback "—" e Mário decide manualmente.

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Inbox, Send, RefreshCw, Search, Filter, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

const DIRECTION_META = {
  inbound:  { label: 'Recebido',  icon: Inbox, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  outbound: { label: 'Enviado',   icon: Send,  color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
}

const STATUS_META = {
  received:          { label: 'Recebido',   color: '#3b82f6' },
  awaiting_approval: { label: 'A aprovar',  color: '#f59e0b' },
  approved:          { label: 'Aprovado',   color: '#10b981' },
  sent:              { label: 'Enviado',    color: '#10b981' },
  draft:             { label: 'Rascunho',   color: '#6b7280' },
  failed:            { label: 'Falhado',    color: '#ef4444' },
  archived:          { label: 'Arquivado',  color: '#6b7280' },
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

function AgentBadge({ agentId }) {
  if (!agentId) {
    return <span style={{ fontSize: 10, color: 'var(--text-dim)', fontStyle: 'italic' }}>—</span>
  }
  // Cor por hash do agent_id (consistente)
  const colors = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#84cc16','#fbbf24']
  const hash = agentId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const color = colors[hash % colors.length]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 10,
      background: `${color}22`, color, fontSize: 10, fontWeight: 600,
      fontFamily: 'JetBrains Mono, monospace',
    }}>{agentId}</span>
  )
}

export default function EmailPage() {
  const navigate = useNavigate()
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [filter, setFilter] = useState('all')  // all | inbound | outbound | needs_review
  const [search, setSearch] = useState('')
  const [selectedEmail, setSelectedEmail] = useState(null)

  const fetch = useCallback(async () => {
    if (!supabase) return setLoading(false)
    setLoading(true)
    const { data } = await supabase
      .from('system_email_messages')
      .select('*')
      .order('received_at', { ascending: false, nullsFirst: false })
      .order('sent_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(200)
    // fallback se view não existir, tenta directo
    if (data) setEmails(data)
    else {
      const { data: direct } = await supabase.schema('system').from('email_messages')
        .select('*').order('created_at', { ascending: false }).limit(200)
      setEmails(direct || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const handleSync = async () => {
    setSyncing(true)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    try {
      await window.fetch(`${supabaseUrl}/functions/v1/gmail-sync-oauth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey },
        body: JSON.stringify({}),
      })
      await fetch()
    } finally {
      setSyncing(false)
    }
  }

  const filtered = useMemo(() => {
    let arr = emails
    if (filter === 'inbound')  arr = arr.filter(e => e.direction === 'inbound')
    if (filter === 'outbound') arr = arr.filter(e => e.direction === 'outbound')
    if (filter === 'needs_review') arr = arr.filter(e => e.status === 'awaiting_approval' || e.status === 'received')
    if (search) {
      const q = search.toLowerCase()
      arr = arr.filter(e =>
        e.subject?.toLowerCase().includes(q) ||
        e.from_email?.toLowerCase().includes(q) ||
        e.body_snippet?.toLowerCase().includes(q) ||
        e.routed_to_agent?.toLowerCase().includes(q),
      )
    }
    return arr
  }, [emails, filter, search])

  const counts = useMemo(() => ({
    all: emails.length,
    inbound: emails.filter(e => e.direction === 'inbound').length,
    outbound: emails.filter(e => e.direction === 'outbound').length,
    needs_review: emails.filter(e => e.status === 'awaiting_approval' || e.status === 'received').length,
  }), [emails])

  return (
    <div style={{ padding: '8px 0 40px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>Email</h1>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '2px 0 0' }}>
            {emails.length} emails · sincronização automática a cada 10 min via Gmail OAuth
          </p>
        </div>
        <button
          onClick={handleSync} disabled={syncing}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 6,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text)', cursor: syncing ? 'wait' : 'pointer', fontSize: 13,
          }}
        >
          <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          {syncing ? 'A sincronizar…' : 'Sync agora'}
        </button>
      </div>

      {/* Filters + search */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        {[
          { id: 'all',          label: 'Todos',       count: counts.all },
          { id: 'inbound',      label: 'Recebidos',   count: counts.inbound,  icon: Inbox },
          { id: 'outbound',     label: 'Enviados',    count: counts.outbound, icon: Send },
          { id: 'needs_review', label: 'A rever',     count: counts.needs_review },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: '6px 12px', borderRadius: 6,
              background: filter === f.id ? 'var(--primary)' : 'var(--bg-card)',
              border: `1px solid ${filter === f.id ? 'var(--primary)' : 'var(--border)'}`,
              color: filter === f.id ? '#fff' : 'var(--text)',
              cursor: 'pointer', fontSize: 12, fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          >
            {f.icon && <f.icon size={12} />}
            {f.label}
            <span style={{
              fontSize: 10, padding: '0 5px', borderRadius: 8,
              background: filter === f.id ? 'rgba(255,255,255,0.25)' : 'var(--bg-elevated)',
              fontFamily: 'JetBrains Mono, monospace',
            }}>{f.count}</span>
          </button>
        ))}
        <div style={{
          marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '6px 10px', minWidth: 240,
        }}>
          <Search size={12} color="var(--text-dim)" />
          <input
            placeholder="Procurar email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'none', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 12, flex: 1,
            }}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>A carregar…</div>
      ) : filtered.length === 0 ? (
        <div style={{
          padding: 40, textAlign: 'center', color: 'var(--text-dim)',
          background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 8,
        }}>
          <Mail size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div style={{ fontSize: 13 }}>Sem emails {filter !== 'all' && `(${filter})`}.</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Clica "Sync agora" para forçar sincronização.</div>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '80px 1.4fr 2.5fr 130px 100px 60px',
            gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)',
            fontSize: 9, fontWeight: 700, color: 'var(--text-dim)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            <span>Tipo</span>
            <span>De / Para</span>
            <span>Assunto</span>
            <span>Agent</span>
            <span>Status</span>
            <span style={{ textAlign: 'right' }}>Idade</span>
          </div>
          {filtered.map(e => {
            const dirMeta    = DIRECTION_META[e.direction] || DIRECTION_META.inbound
            const statusMeta = STATUS_META[e.status]       || { label: e.status, color: 'var(--text-dim)' }
            const DirIcon    = dirMeta.icon
            const counterparty = e.direction === 'inbound'
              ? (e.from_name || e.from_email || '—')
              : (Array.isArray(e.to_emails) ? e.to_emails.join(', ') : (e.to_emails || '—'))
            const dateRef = e.received_at || e.sent_at || e.created_at
            return (
              <button
                key={e.id}
                onClick={() => setSelectedEmail(e)}
                style={{
                  width: '100%', textAlign: 'left',
                  display: 'grid', gridTemplateColumns: '80px 1.4fr 2.5fr 130px 100px 60px',
                  gap: 10, padding: '10px 16px',
                  borderTop: '1px solid var(--border-soft, transparent)',
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', alignItems: 'center',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={ev => ev.currentTarget.style.background = 'var(--bg-elevated)'}
                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
              >
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 7px', borderRadius: 3,
                  background: dirMeta.bg, color: dirMeta.color,
                  fontSize: 9, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                  width: 'fit-content',
                }}>
                  <DirIcon size={9} /> {dirMeta.label.slice(0,4)}
                </span>
                <span style={{
                  fontSize: 12, color: 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{counterparty}</span>
                <span style={{
                  fontSize: 12, color: 'var(--text)', fontWeight: 600,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{e.subject || '(sem assunto)'}</span>
                <AgentBadge agentId={e.routed_to_agent} />
                <span style={{
                  fontSize: 9, padding: '2px 7px', borderRadius: 3,
                  background: `${statusMeta.color}22`, color: statusMeta.color,
                  fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                  width: 'fit-content',
                }}>{statusMeta.label}</span>
                <span style={{
                  fontSize: 10, color: 'var(--text-dim)',
                  fontFamily: 'JetBrains Mono, monospace', textAlign: 'right',
                }}>{timeAgo(dateRef)}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Email detail drawer */}
      {selectedEmail && (
        <EmailDetailDrawer email={selectedEmail} onClose={() => setSelectedEmail(null)} navigate={navigate} />
      )}
    </div>
  )
}

function EmailDetailDrawer({ email, onClose, navigate }) {
  const dirMeta = DIRECTION_META[email.direction] || DIRECTION_META.inbound
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', justifyContent: 'flex-end', zIndex: 1100,
    }}>
      <aside onClick={e => e.stopPropagation()} style={{
        width: 720, maxWidth: '94vw', height: '100vh',
        background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 3,
              background: dirMeta.bg, color: dirMeta.color,
              fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
              textTransform: 'uppercase',
            }}>{dirMeta.label}</span>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '8px 0 4px', color: 'var(--text)' }}>
              {email.subject || '(sem assunto)'}
            </h2>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
              {email.direction === 'inbound' ? 'De: ' : 'Para: '}
              {email.direction === 'inbound'
                ? `${email.from_name || ''} <${email.from_email}>`
                : (Array.isArray(email.to_emails) ? email.to_emails.join(', ') : email.to_emails)}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 18,
          }}>×</button>
        </div>

        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <tbody>
              <tr><td style={{ padding: '3px 0', color: 'var(--text-dim)', width: 110 }}>Status</td><td>{email.status}</td></tr>
              <tr><td style={{ padding: '3px 0', color: 'var(--text-dim)' }}>Agent atribuído</td><td><AgentBadge agentId={email.routed_to_agent} /></td></tr>
              <tr><td style={{ padding: '3px 0', color: 'var(--text-dim)' }}>Classify intent</td><td>{email.classify_intent || '—'}</td></tr>
              <tr><td style={{ padding: '3px 0', color: 'var(--text-dim)' }}>Vertical</td><td>{email.vertical || '—'}</td></tr>
              {email.task_id && (
                <tr><td style={{ padding: '3px 0', color: 'var(--text-dim)' }}>Task</td><td>
                  <a onClick={(e) => { e.preventDefault(); navigate(`/tasks/${email.task_id}`) }}
                     href={`/tasks/${email.task_id}`}
                     style={{ color: 'var(--primary)', cursor: 'pointer' }}>
                    Abrir task <ExternalLink size={9} style={{ verticalAlign: 'middle' }} />
                  </a>
                </td></tr>
              )}
              <tr><td style={{ padding: '3px 0', color: 'var(--text-dim)' }}>Recebido</td><td>{email.received_at ? new Date(email.received_at).toLocaleString('pt-PT') : '—'}</td></tr>
              {email.sent_at && (
                <tr><td style={{ padding: '3px 0', color: 'var(--text-dim)' }}>Enviado</td><td>{new Date(email.sent_at).toLocaleString('pt-PT')}</td></tr>
              )}
              <tr><td style={{ padding: '3px 0', color: 'var(--text-dim)' }}>Thread</td><td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>{email.thread_id || '—'}</td></tr>
            </tbody>
          </table>
        </div>

        {email.body_html ? (
          <div style={{ padding: '14px 20px', flex: 1 }}>
            <iframe
              srcDoc={email.body_html}
              sandbox=""
              style={{ width: '100%', height: '60vh', border: '1px solid var(--border)', borderRadius: 6, background: '#fff' }}
              title="email-body"
            />
          </div>
        ) : (
          <pre style={{
            padding: '14px 20px', flex: 1, whiteSpace: 'pre-wrap',
            fontSize: 12, color: 'var(--text)', lineHeight: 1.5,
            fontFamily: 'system-ui, sans-serif',
          }}>{email.body_text || email.body_snippet || '(sem corpo)'}</pre>
        )}
      </aside>
    </div>
  )
}
