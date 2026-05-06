import { useState, useMemo } from 'react'

export default function IntegrationsPage({ data }) {
  const [toggles, setToggles] = useState({})

  const allIntegrations = useMemo(() => {
    const seen = new Map()
    for (const emp of (data?.employees || [])) {
      for (const integ of (emp.integrations || [])) {
        if (!seen.has(integ.id)) {
          seen.set(integ.id, { ...integ, owners: [emp.name] })
        } else {
          seen.get(integ.id).owners.push(emp.name)
        }
      }
    }
    return Array.from(seen.values()).sort((a, b) => {
      if (a.enabled && !b.enabled) return -1
      if (!a.enabled && b.enabled) return 1
      return a.name.localeCompare(b.name)
    })
  }, [data])

  const isOn = (integ) => {
    if (integ.id in toggles) return toggles[integ.id]
    return integ.enabled && !integ.planned
  }

  const toggle = (id) => {
    setToggles(prev => ({ ...prev, [id]: !isOn(allIntegrations.find(i => i.id === id)) }))
  }

  const connected = allIntegrations.filter(i => isOn(i)).length
  const total = allIntegrations.length

  return (
    <div>
      <div style={{
        display: 'flex', gap: 16, marginBottom: 20,
        padding: '10px 14px',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 8, alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Conectadas</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--success)' }}>{connected}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text)' }}>{total}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Planeadas</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--warning)' }}>
            {allIntegrations.filter(i => i.planned).length}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
          toggles visuais apenas · sem persistência
        </div>
      </div>

      <div className="grid-agents">
        {allIntegrations.map(integ => {
          const on = isOn(integ)
          return (
            <div key={integ.id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 16,
              borderLeft: `2px solid ${on ? 'var(--success)' : 'var(--border)'}`,
              opacity: integ.planned ? 0.7 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem', fontWeight: 700, fontFamily: 'monospace',
                  color: 'var(--text-dim)',
                }}>
                  {integ.icon || integ.id.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text)' }}>{integ.name}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', lineHeight: 1.4, marginTop: 2 }}>{integ.desc}</div>
                </div>
                <button
                  onClick={() => toggle(integ.id)}
                  title={on ? 'Desligar' : 'Ligar'}
                  style={{
                    width: 32, height: 18, borderRadius: 9, border: 'none', cursor: 'pointer',
                    background: on ? 'var(--success)' : 'var(--border)',
                    position: 'relative', flexShrink: 0, transition: 'background 0.15s',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2, width: 14, height: 14, borderRadius: '50%',
                    background: '#fff', transition: 'left 0.15s',
                    left: on ? 16 : 2,
                  }} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                {integ.planned && (
                  <span style={{
                    padding: '1px 6px', borderRadius: 20, fontSize: '0.58rem',
                    background: 'rgba(245,158,11,0.12)', color: 'var(--warning)',
                  }}>planned</span>
                )}
                <span style={{
                  padding: '1px 6px', borderRadius: 20, fontSize: '0.58rem',
                  background: on ? 'rgba(16,185,129,0.12)' : 'var(--bg-elevated)',
                  color: on ? 'var(--success)' : 'var(--text-dim)',
                }}>{on ? 'connected' : 'disconnected'}</span>
                {integ.owners?.length > 0 && (
                  <span style={{ fontSize: '0.58rem', color: 'var(--text-dim)', marginLeft: 'auto', fontStyle: 'italic' }}>
                    {integ.owners.slice(0, 2).join(', ')}{integ.owners.length > 2 ? ` +${integ.owners.length - 2}` : ''}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
