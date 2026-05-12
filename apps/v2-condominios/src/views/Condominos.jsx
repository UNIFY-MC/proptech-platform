import { useEffect, useState } from 'react'
import { v2Client } from '../lib/clients.js'

export default function Condominos() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    v2Client
      .from('condominos')
      .select('*, fracoes:fracao_id(letra, andar)')
      .order('criado_em', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (!active) return
        if (error) setError(error.message)
        else setRows(data ?? [])
      })
    return () => { active = false }
  }, [])

  return (
    <div>
      <h1>Condóminos</h1>
      <p className="dim" style={{ fontSize: 13, marginBottom: 16 }}>
        Relação <code className="mono">core.pessoas</code> ↔ <code className="mono">fracoes</code>. Um condómino pode ter várias fracções.
      </p>

      {error && <div className="error-banner">Erro: {error}</div>}
      {rows === null && !error && <div className="dim">A carregar…</div>}
      {rows && rows.length === 0 && !error && (
        <div className="empty-state">
          <div style={{ fontSize: 14, marginBottom: 4 }}>Sem condóminos</div>
          <div style={{ fontSize: 12 }}>O import V2 traz 65 condóminos reais. Por enquanto, schema vazio.</div>
        </div>
      )}
      {rows && rows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Fracção</th><th>Pessoa</th><th>Desde</th><th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(c => (
              <tr key={c.id}>
                <td className="mono">{c.fracoes?.letra ?? '—'} {c.fracoes?.andar ? `· ${c.fracoes.andar}` : ''}</td>
                <td className="mono">{c.pessoa_id?.slice(0, 8) ?? '—'}</td>
                <td className="mono">{c.criado_em?.slice(0, 10) ?? '—'}</td>
                <td>{c.tipo ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
