import { useEffect, useState } from 'react'
import { v2Client } from '../lib/clients.js'

export default function Recebimentos() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    v2Client
      .from('recebimentos')
      .select('*')
      .not('data_pagamento', 'is', null)
      .order('data_pagamento', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (!active) return
        if (error) setError(error.message)
        else setRows(data ?? [])
      })
    return () => { active = false }
  }, [])

  const total = (rows ?? []).reduce((acc, r) => acc + Number(r.valor ?? 0), 0)

  return (
    <div>
      <h1>Recebimentos</h1>
      <p className="dim" style={{ fontSize: 13, marginBottom: 16 }}>
        Quotas pagas pelos condóminos. Reconciliação com <code className="mono">extrato_bancario</code> é feita pela Fina (financeiro-condo).
      </p>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="kpi kpi-green">
          <div className="kpi-l">Total recebido</div>
          <div className="kpi-v">{total > 0 ? `${total.toFixed(2)} €` : '—'}</div>
          <div className="kpi-s">{rows?.length ?? 0} pagamentos</div>
        </div>
      </div>

      {error && <div className="error-banner">Erro: {error}</div>}
      {rows === null && !error && <div className="dim">A carregar…</div>}
      {rows && rows.length === 0 && !error && (
        <div className="empty-state">
          <div style={{ fontSize: 14, marginBottom: 4 }}>Sem recebimentos</div>
          <div style={{ fontSize: 12 }}>Aguardando dados após import V2.</div>
        </div>
      )}
      {rows && rows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Data</th><th>Fracção</th><th>Mês</th><th style={{ textAlign: 'right' }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td className="mono">{r.data_pagamento ?? '—'}</td>
                <td className="mono">{r.fracao_id?.slice(0, 8) ?? '—'}</td>
                <td>{r.mes_referencia ?? '—'}</td>
                <td className="mono" style={{ textAlign: 'right' }}>{Number(r.valor ?? 0).toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
