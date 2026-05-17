// EmployeeAutomations — versão generalizada de BiaAutomations
// Aceita agentId como prop

import { useEmployeeAutomations } from '../../hooks/useEmployeeAutomations.js'

function humanize(slug) {
  if (!slug) return ''
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function humanCron(expr) {
  if (!expr) return ''
  const m = expr.match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+\*\s*(.*)$/)
  if (m) {
    const [, min, hour, tz] = m
    const h  = String(hour).padStart(2, '0')
    const mm = String(min).padStart(2, '0')
    return `diariamente às ${h}h${mm}${tz ? ' ' + tz : ''}`
  }
  return expr
}

function triggerBadge(t) {
  if (t.trigger_type === 'schedule') return `⏰ ${humanCron(t.trigger_label)}`
  if (t.trigger_type === 'event')    return `⚡ trigger por ${humanize(t.trigger_label)}`
  return t.trigger_label
}

const pendingBadge = {
  marginLeft: 8, padding: '1px 6px', borderRadius: 3,
  fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em',
  background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
  border: '1px solid rgba(245,158,11,0.25)',
  cursor: 'help', verticalAlign: 'middle', display: 'inline-block',
}

export default function EmployeeAutomations({ agentId }) {
  const { automations, loading, toggle } = useEmployeeAutomations(agentId)

  return (
    <div className="bia-intg">
      <div className="bia-intg-head">
        <span className="bia-intg-label">
          <span style={{ fontSize: 14 }}>⏱</span>
          <span>Automation</span>
          <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: 12, marginLeft: 4 }}>
            {automations.length} rules
          </span>
        </span>
        <button className="bia-intg-manage" onClick={() => alert('+ Add automation — em breve')}>
          + Add
        </button>
      </div>

      <div className="bia-intg-grid" style={{ gridTemplateColumns: '1fr' }}>
        {loading && (
          <div className="bia-intg-card" style={{ color: 'var(--text-dim)', fontSize: 12 }}>
            A carregar automations…
          </div>
        )}

        {!loading && automations.length === 0 && (
          <div className="bia-intg-card" style={{ color: 'var(--text-dim)', fontSize: 12 }}>
            Sem automations definidas. <strong>+ Add</strong> para criar uma recipe.
          </div>
        )}

        {!loading && automations.map(a => (
          <div key={a.recipe_id} className="bia-intg-card">
            <div className="bia-intg-info">
              <div className="bia-intg-name">
                {humanize(a.name)}
                <span style={pendingBadge} title="Recipe definido em BD mas wire-up pendente.">pending wire-up</span>
              </div>
              <div className="bia-intg-desc">
                {triggerBadge(a)} · <strong style={{ color: 'var(--text)' }}>{a.fires_30d} fires</strong>{' '}
                <span style={{ opacity: 0.55 }}>(30d)</span>
              </div>
            </div>
            <button
              onClick={() => toggle(a.recipe_id)}
              className={`bia-intg-toggle ${a.enabled ? 'on' : 'off'}`}
              title={a.enabled ? 'click para desligar' : 'click para ligar'}
              aria-label={a.enabled ? 'disable' : 'enable'}
              style={{ border: 'none', cursor: 'pointer', padding: 0 }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
