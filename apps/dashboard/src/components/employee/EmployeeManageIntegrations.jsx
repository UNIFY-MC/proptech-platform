// EmployeeManageIntegrations — versão generalizada de BiaManageIntegrations
// Drawer "Manage" para ligar/desligar integrations a qualquer agente

import { useEffect, useState } from 'react'
import { useAvailableIntegrations } from '../../hooks/useAvailableIntegrations.js'
import { supabase } from '../../lib/supabase.js'

export default function EmployeeManageIntegrations({ agentId, onClose, onChange }) {
  const { items: available, loading: loadingAvail } = useAvailableIntegrations()
  const [enabledMap, setEnabledMap] = useState({})
  const [busy, setBusy]             = useState({})

  useEffect(() => {
    if (!supabase || !agentId) return
    async function load() {
      const { data } = await supabase
        .schema('system').from('agent_integrations')
        .select('integration_id, enabled').eq('agent_id', agentId)
      const map = {}
      ;(data || []).forEach(r => { map[r.integration_id] = r.enabled })
      setEnabledMap(map)
    }
    load()
  }, [agentId])

  async function toggleIntegration(integration_id) {
    if (busy[integration_id]) return
    setBusy(b => ({ ...b, [integration_id]: true }))
    const has       = integration_id in enabledMap
    const wasEnabled = enabledMap[integration_id]
    try {
      if (!has) {
        const { error } = await supabase.schema('system').from('agent_integrations')
          .insert({ agent_id: agentId, integration_id, enabled: true })
        if (error) throw error
        setEnabledMap(m => ({ ...m, [integration_id]: true }))
      } else if (wasEnabled) {
        const { error } = await supabase.schema('system').from('agent_integrations')
          .update({ enabled: false })
          .eq('agent_id', agentId).eq('integration_id', integration_id)
        if (error) throw error
        setEnabledMap(m => ({ ...m, [integration_id]: false }))
      } else {
        const { error } = await supabase.schema('system').from('agent_integrations')
          .update({ enabled: true })
          .eq('agent_id', agentId).eq('integration_id', integration_id)
        if (error) throw error
        setEnabledMap(m => ({ ...m, [integration_id]: true }))
      }
      onChange?.()
    } catch (err) {
      console.error('[EmployeeManageIntegrations] toggle', err)
      alert('Falhou: ' + err.message)
    } finally {
      setBusy(b => ({ ...b, [integration_id]: false }))
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
      zIndex: 1300,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg)', borderLeft: '1px solid var(--border)',
        width: 'min(540px, 92%)', height: '100%', overflowY: 'auto', padding: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Manage integrations · {agentId}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
              {available.length} integrations no sistema · só estas podem ser associadas ao agente
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 22 }}>×</button>
        </div>

        {loadingAvail && <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>A carregar catálogo…</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {available.map(it => {
            const enabled = !!enabledMap[it.id]
            const inUse   = it.id in enabledMap
            return (
              <div key={it.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px',
                background: 'var(--bg-card-elevated)', border: '1px solid var(--border)',
                borderRadius: 8,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 6,
                  background: it.brand_color ? `${it.brand_color}26` : 'var(--bg-card)',
                  color: it.brand_color || 'var(--text-dim)',
                  border: it.brand_color ? `1px solid ${it.brand_color}40` : '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', flexShrink: 0,
                }}>
                  {(it.icon || it.slug?.slice(0, 2) || '?').toString().slice(0, 3).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{it.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{it.description || '—'}</div>
                </div>
                <button
                  onClick={() => toggleIntegration(it.id)}
                  className={`bia-intg-toggle ${enabled ? 'on' : 'off'}`}
                  style={{ border: 'none', padding: 0, opacity: busy[it.id] ? 0.5 : 1 }}
                  disabled={busy[it.id]}
                  title={inUse ? (enabled ? 'click para desligar' : 'click para reactivar') : 'click para adicionar'}
                />
              </div>
            )
          })}
        </div>

        {!loadingAvail && available.length === 0 && (
          <div style={{ color: 'var(--text-dim)', fontSize: 12, padding: 16 }}>
            Nenhuma integration com <code>status='connected'</code> em <code>system.integrations</code>.
          </div>
        )}
      </div>
    </div>
  )
}
