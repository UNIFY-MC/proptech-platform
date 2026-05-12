import { useEffect, useMemo, useState } from 'react'
import { v2Client } from '../lib/clients.js'

// Mapa cron syntax → descrição humana simples
function humanCron(expr) {
  if (!expr) return '—'
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return expr
  const [m, h, dom, mo, dow] = parts
  const at = (h !== '*' && m !== '*') ? `às ${h.padStart(2, '0')}:${m.padStart(2, '0')}` : ''
  if (dow !== '*' && dow !== '?') {
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const idx = parseInt(dow, 10)
    if (!isNaN(idx)) return `Toda ${dias[idx % 7]} ${at}`.trim()
  }
  if (dom !== '*' && mo === '*') return `Dia ${dom} de cada mês ${at}`.trim()
  if (m !== '*' && h !== '*' && dom === '*' && mo === '*' && dow === '*') return `Diariamente ${at}`.trim()
  if (m === '0' && h === '*' && dom === '*') return 'Hora a hora'
  return expr
}

function extractEndpoint(command) {
  if (!command) return null
  const m = command.match(/functions\/v1\/([a-z0-9-]+)/i)
  if (m) return m[1]
  const m2 = command.match(/SELECT\s+([a-z_.]+)\s*\(/i)
  if (m2) return m2[1]
  return null
}

export default function Automacoes() {
  const [jobs, setJobs] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let active = true
    v2Client.rpc('list_cron_jobs').then(({ data, error }) => {
      if (!active) return
      if (error) setError(error.message)
      else setJobs(data ?? [])
    })
    return () => { active = false }
  }, [])

  const visible = useMemo(() => {
    if (!jobs) return null
    if (filter === 'active')   return jobs.filter(j => j.active)
    if (filter === 'inactive') return jobs.filter(j => !j.active)
    return jobs
  }, [jobs, filter])

  return (
    <div>
      <h1>Automações</h1>
      <p className="dim" style={{ fontSize: 13, marginBottom: 16 }}>
        Cron schedules (<code className="mono">pg_cron</code>) que disparam edge functions ou
        RPCs em horários definidos. Configuração read-only — alterações via SQL ou ADR aprovado.
      </p>

      {error && <div className="error-banner">Erro: {error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {[['all','TODOS'],['active','ACTIVOS'],['inactive','INACTIVOS']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            padding: '5px 12px',
            background: filter === k ? 'var(--sf2)' : 'transparent',
            border: '1px solid ' + (filter === k ? 'var(--go)' : 'var(--bd)'),
            color: filter === k ? 'var(--tx)' : 'var(--mu)',
            borderRadius: 5, fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: 0.5,
            cursor: 'pointer',
          }}>{l}</button>
        ))}
        <span className="dim mono" style={{ fontSize: 10, marginLeft: 'auto' }}>
          {visible?.length ?? 0} job{visible?.length === 1 ? '' : 's'}
        </span>
      </div>

      {jobs === null && !error && <div className="dim">A carregar…</div>}
      {visible && visible.length === 0 && !error && (
        <div className="empty-state">
          <div style={{ fontSize: 14, marginBottom: 4 }}>Sem cron jobs registados</div>
          <div style={{ fontSize: 12 }}>
            Adicionar via SQL: <code className="mono">SELECT cron.schedule(...)</code>
          </div>
        </div>
      )}
      {visible && visible.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Estado</th>
              <th>Schedule</th>
              <th>Quando</th>
              <th>Alvo</th>
              <th>Comando</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(j => {
              const target = extractEndpoint(j.command)
              return (
                <tr key={j.jobid}>
                  <td className="mono">{j.jobid}</td>
                  <td>
                    {j.active
                      ? <span className="b b-green">activo</span>
                      : <span className="b">parado</span>}
                  </td>
                  <td className="mono" style={{ fontSize: 11 }}>{j.schedule}</td>
                  <td style={{ fontSize: 12 }}>{humanCron(j.schedule)}</td>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {target ? <span className="b b-blue">{target}</span> : <span className="dim">—</span>}
                  </td>
                  <td className="mono" style={{ fontSize: 10, color: 'var(--mu)', maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={j.command}>
                    {(j.command || '').replace(/\s+/g, ' ').slice(0, 100)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
