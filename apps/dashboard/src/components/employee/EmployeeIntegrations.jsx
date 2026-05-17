// EmployeeIntegrations — versão generalizada de BiaIntegrations
// Aceita agentId como prop; usa useEmployeeIntegrations(agentId)

import { useState } from 'react'
import { useEmployeeIntegrations } from '../../hooks/useEmployeeIntegrations.js'
import EmployeeManageIntegrations  from './EmployeeManageIntegrations.jsx'

export default function EmployeeIntegrations({ agentId }) {
  const { integrations, loading, toggle, reload } = useEmployeeIntegrations(agentId)
  const enabledCount = integrations.filter(i => i.enabled).length
  const [manageOpen, setManageOpen] = useState(false)

  return (
    <div className="bia-intg">
      <div className="bia-intg-head">
        <span className="bia-intg-label">
          <span style={{ fontSize: 14 }}>🔌</span>
          <span>Integrations</span>
          <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: 12, marginLeft: 4 }}>
            {enabledCount} of {integrations.length} enabled
          </span>
        </span>
        <button className="bia-intg-manage" onClick={() => setManageOpen(true)}>
          Manage
        </button>
      </div>

      <div className="bia-intg-grid">
        {loading && (
          <div className="bia-intg-card" style={{ color: 'var(--text-dim)', fontSize: 12 }}>
            A carregar integrations…
          </div>
        )}

        {!loading && integrations.length === 0 && (
          <div className="bia-intg-card" style={{ color: 'var(--text-dim)', fontSize: 12 }}>
            Sem integrations configuradas. Clica em <strong>Manage</strong> para adicionar.
          </div>
        )}

        {!loading && integrations.map(i => (
          <div key={i.id} className="bia-intg-card">
            <div
              className="bia-intg-icon"
              style={i.brand_color
                ? { background: `${i.brand_color}26`, color: i.brand_color, border: `1px solid ${i.brand_color}40` }
                : undefined}
            >
              {(i.icon || i.slug?.slice(0, 2) || '?').toString().slice(0, 3).toUpperCase()}
            </div>
            <div className="bia-intg-info">
              <div className="bia-intg-name">{i.name}</div>
              <div className="bia-intg-desc">{i.description || '—'}</div>
            </div>
            <button
              onClick={() => toggle(i.id)}
              className={`bia-intg-toggle ${i.enabled ? 'on' : 'off'}`}
              title={i.enabled ? 'click para desligar' : 'click para ligar'}
              aria-label={i.enabled ? 'disable' : 'enable'}
              style={{ border: 'none', padding: 0 }}
            />
          </div>
        ))}
      </div>

      {manageOpen && (
        <EmployeeManageIntegrations
          agentId={agentId}
          onClose={() => setManageOpen(false)}
          onChange={() => reload()}
        />
      )}
    </div>
  )
}
