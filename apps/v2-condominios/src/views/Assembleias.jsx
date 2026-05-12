import { useEffect, useState } from 'react'
import { v2Client } from '../lib/clients.js'

function statusBadge(data) {
  if (!data) return { label: 'sem data', color: 'var(--text-dim)' }
  const dias = Math.floor((new Date(data) - Date.now()) / 86400000)
  if (dias < -1) return { label: 'realizada', color: 'var(--text-dim)' }
  if (dias < 10) return { label: `falta ${dias}d (legal!)`, color: 'var(--danger)' }
  return { label: `daqui a ${dias}d`, color: 'var(--success)' }
}

export default function Assembleias() {
  const [assembleias, setAssembleias] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await v2Client
        .from('assembleias')
        .select('*, atas(id), convocatorias(data_envio_previsto, data_envio_real)')
        .order('data_assembleia', { ascending: false })
        .limit(50)
      if (!active) return
      if (error) setError(error.message)
      else setAssembleias(data ?? [])
    }
    load()
    return () => { active = false }
  }, [])

  return (
    <div>
      <h1>Assembleias</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        <code className="mono">assembleia-condo</code> (Assie) garante prazo mínimo legal de 10 dias entre envio da convocatória e a assembleia (Art. 1431º CC).
      </p>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
          Erro: {error}
        </div>
      )}

      {assembleias === null && !error && <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>A carregar…</div>}

      {assembleias && assembleias.length === 0 && !error && (
        <div style={{
          padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)',
          background: 'var(--bg-card-soft)', border: '1px dashed var(--border)', borderRadius: 8,
        }}>
          <div style={{ fontSize: 14, marginBottom: 6 }}>Sem assembleias agendadas</div>
          <div style={{ fontSize: 12 }}>
            Quando Assie agendar a próxima, aparece aqui com prazo legal e estado da convocatória.
          </div>
        </div>
      )}

      {assembleias && assembleias.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {assembleias.map(a => {
            const b = statusBadge(a.data_assembleia)
            return (
              <div key={a.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '12px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{a.tipo ?? 'Assembleia'}</div>
                  <span style={{
                    fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
                    padding: '1px 6px', borderRadius: 3, background: 'var(--bg-elevated)', color: b.color,
                  }}>{b.label}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  Data: <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{a.data_assembleia ?? '—'}</span>
                  {' · '}
                  Convocatórias: {a.convocatorias?.length ?? 0}
                  {' · '}
                  Ata: {a.atas?.length > 0 ? '✓' : '—'}
                </div>
                {a.local && (
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Local: {a.local}</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
