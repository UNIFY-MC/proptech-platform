// DiscordConnectionsPage — /connections/discord
// CRUD por agent: webhook_url + test send + active toggle. Sprint Q2.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useNotificationsStore } from '../store'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY

const DEPT_HEADS = [
  { id: 'bia',                label: 'Bia · V5 operations',     color: '#f59e0b' },
  { id: 'orquestrador-condo', label: 'Orquestrador · V2 ops',   color: '#3b82f6' },
  { id: 'diretor-marketing',  label: 'Diretor Marketing',       color: '#ec4899' },
  { id: 'gestor-leads',       label: 'Gestor Leads · sales',    color: '#10b981' },
  { id: 'financeiro-condo',   label: 'Financeiro · V2',         color: '#06b6d4' },
  { id: 'atendimento-condo',  label: 'Atendimento · V2',        color: '#84cc16' },
  { id: 'compliance-condo',   label: 'Compliance · V2 legal',   color: '#ef4444' },
]

export default function DiscordConnectionsPage() {
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(null)
  const addToast = useNotificationsStore(s => s.addToast)

  const fetch = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const { data } = await supabase.from('system_agent_channels')
      .select('*')
      .eq('channel_type', 'discord')
    setChannels(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function saveChannel(agentId, fields) {
    const existing = channels.find(c => c.agent_id === agentId)
    if (existing) {
      const { error } = await supabase.from('system_agent_channels')
        .update(fields)
        .eq('id', existing.id)
      if (error) {
        addToast({ type: 'error', message: `Erro: ${error.message}` })
        return
      }
    } else {
      const { error } = await supabase.from('system_agent_channels')
        .insert({ agent_id: agentId, channel_type: 'discord', ...fields })
      if (error) {
        addToast({ type: 'error', message: `Erro: ${error.message}` })
        return
      }
    }
    addToast({ type: 'success', message: `✓ ${agentId} actualizado` })
    fetch()
  }

  async function testSend(agentId) {
    setTesting(agentId)
    try {
      const res = await window.fetch(`${SUPABASE_URL}/functions/v1/discord-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
          'apikey': ANON_KEY,
        },
        body: JSON.stringify({
          agent_id: agentId,
          content: `🤖 **Test message** de Property007 · ${new Date().toLocaleString('pt-PT')}\n\nSe vês esta mensagem, o webhook está ligado. ✅`,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        addToast({ type: 'success', message: `✓ Test enviado para ${agentId}` })
      } else {
        addToast({ type: 'error', message: `Erro: ${data.error || 'unknown'}` })
      }
    } catch (e) {
      addToast({ type: 'error', message: `Erro: ${String(e)}` })
    } finally {
      setTesting(null)
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 920 }}>
      <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Discord</h1>
      <p style={{ marginTop: 6, fontSize: '0.85rem', color: 'var(--text-dim)' }}>
        Liga webhooks Discord aos teus dept heads. Daily morning brief 7am Lisboa · mentions criam tasks.
      </p>

      <div style={{
        marginTop: 20, padding: '12px 16px',
        background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: 8, fontSize: '0.78rem', color: 'var(--text)',
      }}>
        <strong>Setup rápido por agent:</strong>
        <ol style={{ margin: '6px 0 0 18px', lineHeight: 1.7 }}>
          <li>Vai ao teu servidor Discord → Channel settings → Integrations → Webhooks → New Webhook</li>
          <li>Copia o Webhook URL e cola na linha do agent abaixo</li>
          <li>Click "Save" → "Test send" para confirmar</li>
        </ol>
      </div>

      <table style={{ width: '100%', marginTop: 20, borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <thead>
          <tr style={{ background: 'var(--bg-elevated)' }}>
            <th style={th}>Agent</th>
            <th style={th}>Webhook URL</th>
            <th style={th}>Active</th>
            <th style={th}>Acções</th>
          </tr>
        </thead>
        <tbody>
          {DEPT_HEADS.map(h => {
            const existing = channels.find(c => c.agent_id === h.id)
            return (
              <ChannelRow
                key={h.id}
                head={h}
                existing={existing}
                onSave={(fields) => saveChannel(h.id, fields)}
                onTest={() => testSend(h.id)}
                testing={testing === h.id}
              />
            )
          })}
        </tbody>
      </table>

      {loading && <div style={{ marginTop: 12, color: 'var(--text-dim)', fontSize: '0.78rem' }}>A carregar…</div>}
    </div>
  )
}

function ChannelRow({ head, existing, onSave, onTest, testing }) {
  const [url, setUrl] = useState(existing?.webhook_url || '')
  const [active, setActive] = useState(existing?.active ?? true)
  const dirty = url !== (existing?.webhook_url || '') || active !== (existing?.active ?? true)

  useEffect(() => {
    setUrl(existing?.webhook_url || '')
    setActive(existing?.active ?? true)
  }, [existing?.webhook_url, existing?.active])

  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={td}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: head.color }} />
          {head.label}
        </span>
      </td>
      <td style={td}>
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://discord.com/api/webhooks/..."
          style={{
            width: '100%', minWidth: 280,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 5, padding: '6px 10px',
            fontSize: '0.72rem', color: 'var(--text)',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        />
      </td>
      <td style={{ ...td, textAlign: 'center' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
        </label>
      </td>
      <td style={td}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => onSave({ webhook_url: url.trim() || null, active })}
            disabled={!dirty}
            style={{
              background: dirty ? 'var(--text)' : 'transparent', color: dirty ? 'var(--bg)' : 'var(--text-dim)',
              border: dirty ? 'none' : '1px solid var(--border)',
              borderRadius: 5, padding: '5px 10px',
              fontSize: '0.7rem', fontWeight: 600,
              cursor: dirty ? 'pointer' : 'not-allowed',
            }}
          >Save</button>
          <button
            onClick={onTest}
            disabled={!existing?.webhook_url || testing}
            style={{
              background: 'var(--bg-elevated)', color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 5, padding: '5px 10px',
              fontSize: '0.7rem',
              cursor: (!existing?.webhook_url || testing) ? 'not-allowed' : 'pointer',
              opacity: (!existing?.webhook_url || testing) ? 0.5 : 1,
            }}
          >{testing ? '…' : 'Test send'}</button>
        </div>
      </td>
    </tr>
  )
}

const th = {
  textAlign: 'left',
  padding: '8px 12px',
  fontSize: '0.62rem', fontWeight: 700,
  color: 'var(--text-dim)',
  textTransform: 'uppercase', letterSpacing: '0.1em',
  borderBottom: '1px solid var(--border)',
}
const td = { padding: '10px 12px', verticalAlign: 'middle' }
