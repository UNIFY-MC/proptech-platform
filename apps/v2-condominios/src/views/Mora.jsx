import { useEffect, useState } from 'react'
import { v2Client } from '../lib/clients.js'

// Mora: quotas emitidas em recebimentos cuja data_pagamento é NULL
// e data_emissao está no passado. Agrupar por fracção, com aging.

function agingBucket(diasAtraso) {
  if (diasAtraso < 7)  return { label: '< 7d',  color: 'var(--text-dim)' }
  if (diasAtraso < 30) return { label: '> 7d',  color: 'var(--warning)' }
  if (diasAtraso < 60) return { label: '> 30d', color: 'var(--warning)' }
  if (diasAtraso < 90) return { label: '> 60d', color: 'var(--danger)' }
  return { label: '> 90d (legal)', color: 'var(--danger)' }
}

export default function Mora() {
  const [recebimentos, setRecebimentos] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await v2Client
        .from('recebimentos')
        .select('*')
        .is('data_pagamento', null)
        .order('data_emissao', { ascending: true })
        .limit(500)
      if (!active) return
      if (error) setError(error.message)
      else setRecebimentos(data ?? [])
    }
    load()
    return () => { active = false }
  }, [])

  const hoje = new Date()
  const total = (recebimentos ?? []).reduce((acc, r) => acc + Number(r.valor ?? 0), 0)

  return (
    <div>
      <h1>Mora</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        Quotas emitidas e ainda não pagas. Aging legal: &gt;7d aviso 1º, &gt;30d aviso 2º, &gt;60d compliance, &gt;90d via legal.
      </p>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="kpi">
          <div className="kpi-l">Total em dívida</div>
          <div className="kpi-v" style={{ color: total > 0 ? 'var(--danger)' : 'var(--text)' }}>
            {total > 0 ? `${total.toFixed(2)} €` : '—'}
          </div>
          <div className="kpi-s">{recebimentos?.length ?? 0} linhas</div>
        </div>
        <div className="kpi">
          <div className="kpi-l">Fracções afectadas</div>
          <div className="kpi-v">
            {recebimentos ? new Set(recebimentos.map(r => r.fracao_id)).size : '—'}
          </div>
          <div className="kpi-s">distintas</div>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px', background: 'rgba(239,68,68,0.12)',
          color: 'var(--danger)', borderRadius: 6, fontSize: 13, marginBottom: 16,
        }}>Erro: {error}</div>
      )}

      {recebimentos === null && !error && (
        <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>A carregar…</div>
      )}

      {recebimentos && recebimentos.length === 0 && !error && (
        <div style={{
          padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)',
          background: 'var(--bg-card-soft)', border: '1px dashed var(--border)', borderRadius: 8,
        }}>
          <div style={{ fontSize: 14, marginBottom: 6 }}>Sem mora</div>
          <div style={{ fontSize: 12 }}>
            Não há quotas por pagar. Quando o <code className="mono">financeiro-condo</code> (Fina) emitir quotas e algumas ficarem por pagar, aparecem aqui.
          </div>
        </div>
      )}

      {recebimentos && recebimentos.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-dim)', fontSize: 8, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Fracção</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Emissão</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Valor</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Aging</th>
            </tr>
          </thead>
          <tbody>
            {recebimentos.map(r => {
              const dias = Math.floor((hoje - new Date(r.data_emissao)) / 86400000)
              const bucket = agingBucket(dias)
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                  <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace' }}>{r.fracao_id?.slice(0, 8) ?? '—'}</td>
                  <td style={{ padding: '8px 10px' }}>{r.data_emissao ?? '—'}</td>
                  <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }}>
                    {Number(r.valor ?? 0).toFixed(2)} €
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{
                      fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
                      padding: '1px 6px', borderRadius: 3, background: 'var(--bg-elevated)', color: bucket.color,
                    }}>
                      {bucket.label} ({dias}d)
                    </span>
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
