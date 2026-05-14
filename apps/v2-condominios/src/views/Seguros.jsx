import { useEffect, useState } from 'react'
import { v2Client } from '../lib/clients.js'

export default function Seguros() {
  const [seguros, setSeguros] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await v2Client
        .from('seguro_fracoes')
        .select('*, fracoes:fracao_id(codigo, permilagem)')
        .order('data_renovacao', { ascending: true, nullsFirst: false })
        .limit(200)
      if (!active) return
      if (error) setError(error.message)
      else setSeguros(data ?? [])
    }
    load()
    return () => { active = false }
  }, [])

  return (
    <div>
      <h1>Seguros (fracções)</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        Seguros individuais por fracção (conteúdo, RC). <code className="mono">seguros-condo</code> (Selma) gere renovações. Apólices do edifício vivem em <code className="mono">v3_seguros.apolices</code>.
      </p>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
          Erro: {error}
        </div>
      )}

      {seguros === null && !error && <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>A carregar…</div>}

      {seguros && seguros.length === 0 && !error && (
        <div style={{
          padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)',
          background: 'var(--bg-card-soft)', border: '1px dashed var(--border)', borderRadius: 8,
        }}>
          <div style={{ fontSize: 14, marginBottom: 6 }}>Sem seguros registados</div>
          <div style={{ fontSize: 12 }}>
            Selma adiciona seguros à medida que recolhe informação das fracções.
          </div>
        </div>
      )}

      {seguros && seguros.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-dim)', fontSize: 8, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Fracção</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Seguradora</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Apólice</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Renovação</th>
            </tr>
          </thead>
          <tbody>
            {seguros.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace' }}>
                  {s.fracoes?.letra ?? '—'} {s.fracoes?.andar ? `· ${s.fracoes.andar}` : ''}
                </td>
                <td style={{ padding: '8px 10px' }}>{s.seguradora ?? '—'}</td>
                <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{s.numero_apolice ?? '—'}</td>
                <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace' }}>{s.data_renovacao ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
