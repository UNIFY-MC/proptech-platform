// EmployeeActivityFeed — feed cronológico das últimas 10 acções de um agente
// Junta dados de várias tabelas:
//   - system.email_messages (drafts gerados + enviados pelo agente)
//   - system.tasks (criadas/atribuídas ao agente)
//   - system.draft_refinements (Mário refinou draft do agente)
//
// Usado em /employees/:slug e BiaScorecard.

import { useEffect, useState } from 'react'
import { Mail, Send, FileText, MessageSquare, Briefcase, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm} ${hh}:${mi}`
}

export default function EmployeeActivityFeed({ agentId, limit = 10 }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!agentId || !supabase) { setLoading(false); return }
    load()
  }, [agentId])

  async function load() {
    setLoading(true)
    const [draftsResp, tasksResp, refinesResp, sentResp] = await Promise.all([
      // Drafts gerados (status=awaiting_approval)
      supabase.from('system_email_messages')
        .select('id, subject, draft_generated_at, status, from_email, draft_body')
        .eq('routed_to_agent', agentId)
        .not('draft_body', 'is', null)
        .order('draft_generated_at', { ascending: false, nullsFirst: false })
        .limit(5),
      // Tasks criadas para este agente
      supabase.from('system_tasks')
        .select('id, title, status, created_at, kind, source_kind')
        .eq('owner_agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(5),
      // Refinements (Mário corrigiu draft do agente)
      supabase.schema('system').from('draft_refinements')
        .select('id, instruction, intent, created_at')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(5),
      // Emails enviados (status=sent + email_messages outbound)
      supabase.from('system_email_messages')
        .select('id, subject, sent_at, to_emails, direction')
        .eq('routed_to_agent', agentId)
        .eq('direction', 'outbound')
        .order('sent_at', { ascending: false, nullsFirst: false })
        .limit(5),
    ])

    const merged = []
    ;(draftsResp.data || []).forEach(d => merged.push({
      kind: d.status === 'sent' ? 'email_sent' : 'draft_generated',
      ts:   d.draft_generated_at,
      title: d.status === 'sent' ? `Enviado: ${d.subject}` : `Draft pronto: ${d.subject}`,
      detail: d.status === 'awaiting_approval' ? `Para ${d.from_email} · A aguardar aprovação` : `Para ${d.from_email}`,
      link: `/email?email_id=${d.id}`,
    }))
    ;(tasksResp.data || []).forEach(t => merged.push({
      kind: t.status === 'done' ? 'task_completed' : 'task_created',
      ts:   t.created_at,
      title: t.title,
      detail: `Task ${t.status}${t.source_kind ? ` · origem: ${t.source_kind}` : ''}`,
      link: `/tasks/${t.id}`,
    }))
    ;(refinesResp.data || []).forEach(r => merged.push({
      kind: 'refinement',
      ts:   r.created_at,
      title: `Mário refinou draft (${r.intent || 'sem intent'})`,
      detail: `"${r.instruction}"`,
      link: null,
    }))
    ;(sentResp.data || []).forEach(s => {
      // Só adiciona se não duplicar com drafts já no array
      if (!merged.find(m => m.title?.includes(s.subject))) {
        merged.push({
          kind: 'email_sent',
          ts:   s.sent_at,
          title: `Enviado: ${s.subject}`,
          detail: `Para ${Array.isArray(s.to_emails) ? s.to_emails[0] : s.to_emails}`,
          link: null,
        })
      }
    })

    merged.sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0))
    setItems(merged.slice(0, limit))
    setLoading(false)
  }

  if (loading) {
    return <div style={{ padding: 16, color: 'var(--text-dim)', fontSize: 12 }}>A carregar actividade…</div>
  }

  if (items.length === 0) {
    return (
      <div style={{
        padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12,
        background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 6,
      }}>
        Ainda sem actividade registada para este agente.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {items.map((it, i) => (
        <ActivityRow key={i} item={it} />
      ))}
    </div>
  )
}

const ICONS = {
  draft_generated: { Icon: FileText,      color: '#3b82f6', label: 'DRAFT'  },
  email_sent:      { Icon: Send,          color: '#10b981', label: 'SENT'   },
  task_created:    { Icon: Briefcase,     color: '#8b5cf6', label: 'TASK'   },
  task_completed:  { Icon: CheckCircle2,  color: '#10b981', label: 'DONE'   },
  refinement:      { Icon: MessageSquare, color: '#f59e0b', label: 'REFINE' },
}

function ActivityRow({ item }) {
  const meta = ICONS[item.kind] || { Icon: Mail, color: 'var(--text-dim)', label: 'EVENT' }
  const Icon = meta.Icon
  const Row = item.link ? 'a' : 'div'
  return (
    <Row
      href={item.link || undefined}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '8px 12px', borderBottom: '1px solid var(--border-soft, rgba(255,255,255,0.04))',
        textDecoration: 'none', color: 'inherit',
        cursor: item.link ? 'pointer' : 'default',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        width: 24, height: 24, borderRadius: 4, flexShrink: 0,
        background: `${meta.color}22`, color: meta.color,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
      }}>
        <Icon size={12} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{
            fontSize: 8, padding: '1px 5px', borderRadius: 3,
            background: `${meta.color}22`, color: meta.color,
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.06em',
          }}>{meta.label}</span>
          <span
            style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}
            title={item.ts ? new Date(item.ts).toLocaleString('pt-PT') : ''}
          >
            {fmtDateTime(item.ts)}
          </span>
        </div>
        <div style={{
          fontSize: 12, color: 'var(--text)', fontWeight: 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{item.title}</div>
        {item.detail && (
          <div style={{
            fontSize: 10, color: 'var(--text-dim)', marginTop: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{item.detail}</div>
        )}
      </div>
    </Row>
  )
}
