import { Card } from './shared/Card.jsx'
import { Badge } from './shared/Badge.jsx'
import { DrawerSection } from './Drawer.jsx'
import { useDrawer } from '../context/DrawerContext.jsx'
import { timeAgo } from '../utils/time.js'

function watcherStatusLevel(status) {
  const map = {
    ok: 'success', success: 'success',
    fail: 'danger', error: 'danger',
    warn: 'warning',
    unknown: 'idle',
    never: 'dim',
  }
  return map[(status || '').toLowerCase()] || 'dim'
}

function WatcherCard({ watcher, openDrawer }) {
  return (
    <Card
      style={{ cursor: 'pointer' }}
      onClick={() => openDrawer(
        watcher.name,
        watcher.cadence,
        <div>
          <DrawerSection label="Status">
            <Badge level={watcherStatusLevel(watcher.status)}>{watcher.status || 'never'}</Badge>
          </DrawerSection>
          <DrawerSection label="Última execução">{watcher.last || '—'}</DrawerSection>
          <DrawerSection label="Próxima execução">{watcher.next || '—'}</DrawerSection>
          <DrawerSection label="Relatório completo">
            <pre style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: '0.78rem',
              color: 'var(--text)',
              background: 'var(--bg-elevated)',
              padding: 12,
              borderRadius: 6,
              maxHeight: 300,
              overflowY: 'auto',
              lineHeight: 1.5,
            }}>
              {watcher.outputFull || 'Sem dados ainda.'}
            </pre>
          </DrawerSection>
          {watcher.link && (
            <a
              href={watcher.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--info)', fontSize: '0.8rem' }}
            >
              Abrir relatório no GitHub →
            </a>
          )}
        </div>
      )}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontWeight: 600 }}>{watcher.name}</span>
        <Badge level={watcherStatusLevel(watcher.status)}>{watcher.status || 'never'}</Badge>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 6 }}>
        Cadência: {watcher.cadence || '—'}
      </div>
      {watcher.next && (
        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: 6 }}>
          Próxima: {watcher.next}
        </div>
      )}
      <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
        {watcher.output}
      </div>
    </Card>
  )
}

export default function Watchers({ data }) {
  const { watchers = [] } = data
  const { openDrawer } = useDrawer()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="grid-2">
        {watchers.length === 0 && (
          <Card fullWidth>
            <div className="empty">Sem dados de watchers</div>
          </Card>
        )}
        {watchers.map(w => (
          <WatcherCard key={w.id} watcher={w} openDrawer={openDrawer} />
        ))}
      </div>

      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', paddingTop: 4 }}>
        Watchers executam via GitHub Actions. Clica num watcher para ver o relatório completo.
      </div>
    </div>
  )
}
