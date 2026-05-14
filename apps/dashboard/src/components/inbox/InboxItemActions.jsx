// InboxItemActions — botões de acção dentro da expansão inline de um inbox item
// Acções suportadas (item.raw.actions[]):
//   create_task_idea       — cria task tipo "idea" (vertical-scoped, sem owner)
//   create_task_employee   — cria task atribuída a um empregado
//   archive                — soft-archive do item
//   mark_read              — marca como lido sem arquivar
//   share_with_agent       — manda para chat com agente específico
//   open_external          — abre URL externo (news, instagram)
//
// Tasks reais entram em Sprint β (schema system.tasks). Por agora os botões
// abrem toast informando que vão para Sprint β.

import { Lightbulb, UserPlus, Archive, Check, MessageCircle, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'

const ACTION_META = {
  create_task_idea:     { icon: Lightbulb,     label: 'Task ideia',        color: '#f59e0b' },
  create_task_employee: { icon: UserPlus,      label: 'Task → empregado',  color: '#8b5cf6' },
  share_with_agent:     { icon: MessageCircle, label: 'Partilhar c/ agent',color: '#3b82f6' },
  mark_read:            { icon: Check,         label: 'Marcar lido',       color: '#10b981' },
  archive:              { icon: Archive,       label: 'Arquivar',          color: '#6b7280' },
  open_external:        { icon: ExternalLink,  label: 'Abrir',             color: '#06b6d4' },
}

export default function InboxItemActions({ item, onMarkRead, onArchive, onCreateTask }) {
  const actions = item.raw?.actions || ['archive']
  const sourceUrl = item.raw?.source_url

  async function handleArchive() {
    try {
      if (supabase) await supabase.schema('system').rpc('inbox_archive', { p_item_id: item.raw.id })
      onArchive?.(item.raw.id)
    } catch (e) {
      console.warn('[inbox] archive failed', e)
    }
  }

  async function handleMarkRead() {
    try {
      if (supabase) await supabase.schema('system').rpc('inbox_mark_read', { p_item_id: item.raw.id })
      onMarkRead?.(item.raw.id)
    } catch (e) {
      console.warn('[inbox] mark_read failed', e)
    }
  }

  function handleCreateTask(kind) {
    onCreateTask?.({ kind, item })
  }

  return (
    <div style={{
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      padding: '12px 16px',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-card)',
    }}>
      {actions.map(a => {
        const meta = ACTION_META[a]
        if (!meta) return null
        const Icon = meta.icon
        let handler
        if (a === 'archive')              handler = handleArchive
        else if (a === 'mark_read')       handler = handleMarkRead
        else if (a === 'create_task_idea')     handler = () => handleCreateTask('idea')
        else if (a === 'create_task_employee') handler = () => handleCreateTask('employee')
        else if (a === 'open_external')   handler = () => sourceUrl && window.open(sourceUrl, '_blank')
        else handler = () => alert(`Acção "${a}" em construção (Sprint β/γ)`)

        return (
          <button
            key={a}
            onClick={handler}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 5,
              cursor: 'pointer',
              color: 'var(--text)',
              fontSize: '0.7rem',
              fontWeight: 500,
              transition: 'background 0.1s, color 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = meta.color }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text)' }}
          >
            <Icon size={11} />
            {meta.label}
          </button>
        )
      })}
    </div>
  )
}
