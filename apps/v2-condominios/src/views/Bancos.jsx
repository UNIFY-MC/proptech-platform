import { useEffect, useState } from 'react'
import { v2Client } from '../lib/clients.js'

export default function Bancos() {
  const [movs, setMovs] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    v2Client
      .from('extrato_bancario')
      .select('*')
      .order('data_movimento', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (!active) return
        if (error) setError(error.message)
        else setMovs(data ?? [])
      })
    return () => { active = false }
  }, [])

  const credito = (movs ?? []).filter(m => Number(m.valor ?? 0) > 0).reduce((a, m) => a + Number(m.valor ?? 0), 0)
  const debito  = (movs ?? []).filter(m => Number(m.valor ?? 0) < 0).reduce((a, m) => a + Number(m.valor ?? 0), 0)

  return (
    <div>
      <h1>Bancos</h1>
      <p className="dim" style={{ fontSize: 13, marginBottom: 16 }}>
        Movimentos bancários do condomínio. Base para conciliação com recebimentos e faturas pendentes.
      </p>

      <div className="kpi-grid">
        <div className="kpi kpi-green">
          <div className="kpi-l">Créditos</div>
          <div className="kpi-v">{credito > 0 ? `${credito.toFixed(2)} €` : '—'}</div>
        </div>
        <div className="kpi kpi-red">
          <div className="kpi-l">Débitos</div>
          <div className="kpi-v">{debito < 0 ? `${debito.toFixed(2)} €` : '—'}</div>
        </div>
        <div className="kpi">
          <div className="kpi-l">Saldo no período</div>
          <div className="kpi-v">{(credito + debito).toFixed(2)} €</div>
        </div>
      </div>

      {error && <div className="error-banner">Erro: {error}</div>}
      {movs === null && !error && <div className="dim">A carregar…</div>}
      {movs && movs.length === 0 && !error && (
        <div className="empty-state">
          <div style={{ fontSize: 14, marginBottom: 4 }}>Sem movimentos</div>
          <div style={{ fontSize: 12 }}>Após sync bancário ou import V2, aparece aqui.</div>
        </div>
      )}
      {movs && movs.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Data</th><th>Descrição</th><th style={{ textAlign: 'right' }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {movs.map(m => {
              const v = Number(m.valor ?? 0)
              return (
                <tr key={m.id}>
                  <td className="mono">{m.data_movimento ?? '—'}</td>
                  <td>{m.descricao ?? '—'}</td>
                  <td className="mono" style={{ textAlign: 'right', color: v < 0 ? 'var(--rd)' : 'var(--gr)' }}>
                    {v.toFixed(2)} €
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
