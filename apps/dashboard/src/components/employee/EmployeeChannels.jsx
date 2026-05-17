// EmployeeChannels — versão generalizada de BiaChannels
// Aceita agentId como prop; usa useEmployeeChannels(agentId)

import { useState, useMemo } from 'react'
import { useEmployeeChannels } from '../../hooks/useEmployeeChannels.js'
import { useDiscordChannels }  from '../../hooks/useDiscordChannels.js'

const pendingBadge = {
  marginLeft: 8, padding: '1px 6px', borderRadius: 3,
  fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em',
  background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
  border: '1px solid rgba(245,158,11,0.25)',
  cursor: 'help', verticalAlign: 'middle', display: 'inline-block',
}

export default function EmployeeChannels({ agentId }) {
  const { channels, loading, updateChannelField, attachChannel, detachChannel } = useEmployeeChannels(agentId)
  const active  = channels.filter(c => c.active)
  const primary = active[0]
  const [editing, setEditing] = useState(false)

  return (
    <div className="bia-intg">
      <div className="bia-intg-head">
        <span className="bia-intg-label">
          <span style={{ fontSize: 14 }}>#</span>
          <span>Channels</span>
          {active.length > 0 && (
            <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: 12, marginLeft: 4 }}>
              {active.length} active
            </span>
          )}
        </span>
        <button className="bia-intg-manage" onClick={() => setEditing(true)}>
          + Add
        </button>
      </div>

      <div className="bia-intg-grid" style={{ gridTemplateColumns: '1fr' }}>
        {loading && <div className="bia-intg-card" style={{ color: 'var(--text-dim)', fontSize: 12 }}>A carregar canais…</div>}

        {!loading && active.length === 0 && (
          <div className="bia-intg-card" style={{ color: 'var(--text-dim)', fontSize: 12 }}>
            Sem canais activos. Clica em <strong>+ Add</strong> para escolher.
          </div>
        )}

        {!loading && active.map(c => (
          <div key={c.id} className="bia-intg-card">
            <div className="bia-intg-info">
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                {c.channel_name || '(canal por resolver)'}
              </div>
              <div className="bia-intg-desc">
                posts como <strong style={{ color: 'var(--text)' }}>{c.display_name}</strong>
              </div>
            </div>
            <button
              onClick={() => setEditing(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 14 }}
              title="editar canais"
            >✎</button>
          </div>
        ))}

        {!loading && primary && (
          <>
            <div className="bia-intg-subrow">
              <div style={{ flex: 1 }}>
                <div className="label">
                  Listen All Channels
                  <span style={pendingBadge} title="Estado persiste em BD. Filtro no CF Worker pendente.">pending wire-up</span>
                </div>
                <div className="sub" style={{ marginLeft: 0, marginTop: 2 }}>Respond in all server channels</div>
              </div>
              <button
                onClick={() => updateChannelField(primary.id, 'listen_all_channels', !primary.listen_all_channels).catch(() => {})}
                className={`bia-intg-toggle ${primary.listen_all_channels ? 'on' : 'off'}`}
                style={{ border: 'none', padding: 0 }}
              />
            </div>

            <div className="bia-intg-subrow">
              <div style={{ flex: 1 }}>
                <div className="label">
                  Voice Notes
                  <span style={pendingBadge} title="Estado persiste em BD. TTS pendente.">pending wire-up</span>
                </div>
                <div className="sub" style={{ marginLeft: 0, marginTop: 2 }}>Reply with voice messages</div>
              </div>
              <button
                onClick={() => updateChannelField(primary.id, 'voice_notes', !primary.voice_notes).catch(() => {})}
                className={`bia-intg-toggle ${primary.voice_notes ? 'on' : 'off'}`}
                style={{ border: 'none', padding: 0 }}
              />
            </div>
          </>
        )}
      </div>

      {editing && (
        <ChannelsModal
          agentId={agentId}
          activeChannels={active}
          onClose={() => setEditing(false)}
          attach={attachChannel}
          detach={detachChannel}
        />
      )}
    </div>
  )
}

function ChannelsModal({ agentId, activeChannels, onClose, attach, detach }) {
  const { channels: discordChannels, loading, error } = useDiscordChannels()
  const [busy, setBusy] = useState({})

  const activeMap = useMemo(() => {
    const m = {}
    activeChannels.forEach(c => { if (c.channel_id) m[c.channel_id] = c })
    return m
  }, [activeChannels])

  async function handleToggle(ch) {
    if (busy[ch.id]) return
    setBusy(b => ({ ...b, [ch.id]: true }))
    try {
      if (activeMap[ch.id]) {
        await detach(ch.id)
      } else {
        // Usa o nome do agente como display_name — capitalizado
        const displayName = agentId.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
        await attach(ch.id, `#${ch.name}`, displayName)
      }
    } catch (err) {
      alert('Falhou: ' + err.message)
    } finally {
      setBusy(b => ({ ...b, [ch.id]: false }))
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', zIndex: 1300,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg)', borderLeft: '1px solid var(--border)',
        width: 'min(520px, 92%)', height: '100%', overflowY: 'auto', padding: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{agentId} · Discord channels</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
              {discordChannels.length} canais no server.
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 22 }}>×</button>
        </div>

        {loading && <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>A carregar canais do Discord…</div>}
        {error && <div style={{ color: 'var(--danger)', fontSize: 12 }}>Erro: {String(error.message || error)}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {!loading && discordChannels.map(ch => {
            const isActive = !!activeMap[ch.id]
            return (
              <div key={ch.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px',
                background: isActive ? 'rgba(16,185,129,0.08)' : 'var(--bg-card-elevated)',
                border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                borderRadius: 6,
              }}>
                <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>#</span>
                <div style={{ flex: 1, fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>{ch.name}</div>
                <button
                  onClick={() => handleToggle(ch)}
                  className={`bia-intg-toggle ${isActive ? 'on' : 'off'}`}
                  disabled={busy[ch.id]}
                  style={{ border: 'none', padding: 0, opacity: busy[ch.id] ? 0.5 : 1 }}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
