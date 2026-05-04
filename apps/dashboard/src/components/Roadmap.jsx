import { useState } from 'react'
import { Badge } from './shared/Badge.jsx'
import { SourceTag } from './shared/SourceTag.jsx'
import { DrawerSection } from './Drawer.jsx'
import { useDrawer } from '../context/DrawerContext.jsx'

const STATUS_FILTERS = ['Todas', 'active', 'planned', 'done']

const STATUS_COLORS = {
  done: 'var(--success)',
  active: 'var(--info)',
  planned: 'var(--text-dim)',
  blocked: 'var(--danger)',
}

function waveStatusBadge(status) {
  const map = {
    done: 'success',
    active: 'info',
    planned: 'dim',
    blocked: 'danger',
  }
  return map[status] || 'dim'
}

export default function Roadmap({ data }) {
  const [filter, setFilter] = useState('Todas')
  const [openWave, setOpenWave] = useState(null)
  const { openDrawer } = useDrawer()

  const roadmap = data.roadmap || []
  const waves = filter === 'Todas'
    ? roadmap
    : roadmap.filter(w => w.status === filter)

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              border: `1px solid ${filter === f ? 'var(--primary)' : 'var(--border)'}`,
              background: filter === f ? 'rgba(83,74,183,0.2)' : 'transparent',
              color: filter === f ? 'var(--primary)' : 'var(--text-dim)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              transition: 'all 0.15s',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {waves.length === 0 && (
        <div style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: '0.875rem', padding: '12px 0' }}>
          Sem waves com o filtro seleccionado.
        </div>
      )}

      <SourceTag source={data._roadmapMeta?._source} status={data._roadmapMeta?._status} error={data._roadmapMeta?._error} />

      {/* Waves */}
      {waves.map(wave => (
        <div
          key={wave.wave}
          className="card"
          style={{ marginBottom: 12 }}
        >
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setOpenWave(openWave === wave.wave ? null : wave.wave)}
          >
            <div>
              <span style={{ fontWeight: 700, marginRight: 8 }}>{wave.wave}</span>
              <span style={{ color: 'var(--text-dim)' }}>{wave.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge level={waveStatusBadge(wave.status)}>{wave.status}</Badge>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                {openWave === wave.wave ? '▲' : '▼'}
              </span>
            </div>
          </div>

          {openWave === wave.wave && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              {(!wave.sprints || wave.sprints.length === 0) && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                  Sem sprints definidos.
                </div>
              )}
              {wave.sprints && wave.sprints.map(sprint => (
                <div
                  key={sprint.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border)',
                    cursor: sprint.tasks && sprint.tasks.length > 0 ? 'pointer' : 'default',
                  }}
                  onClick={() => sprint.tasks && sprint.tasks.length > 0 && openDrawer(
                    sprint.name,
                    sprint.date,
                    <div>
                      <DrawerSection label="Status">
                        <Badge level={waveStatusBadge(sprint.status)}>{sprint.status}</Badge>
                      </DrawerSection>
                      <DrawerSection label="Tasks">
                        {sprint.tasks.map((t, i) => (
                          <div key={i} style={{ padding: '4px 0', fontSize: '0.875rem' }}>• {t}</div>
                        ))}
                      </DrawerSection>
                    </div>
                  )}
                >
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: STATUS_COLORS[sprint.status] || 'var(--text-dim)',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: '0.875rem', flex: 1 }}>
                    {sprint.id} — {sprint.name}
                    {sprint.tasks && sprint.tasks.length > 0 && (
                      <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        ({sprint.tasks.length} tasks)
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                    {sprint.date}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
