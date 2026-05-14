import { useEffect, useMemo, useState } from 'react'
import { v2Client } from '../lib/clients.js'

function eur(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
}
function fdate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-PT')
}

export default function Faturas() {
  const [faturas, setFaturas] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('pendente')
  const [reload, setReload] = useState(0)
  const [submitting, setSubmitting] = useState(null)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      let q = v2Client
        .from('faturas_pendentes')
        .select('id, fornecedor_nome, fornecedor_nif, fornecedor_id, numero_fatura, valor, iva, vencimento, estado, pago_em, documento_id, fornecedores:fornecedor_id(nome)')
        .order('vencimento', { ascending: true, nullsFirst: false })
        .limit(500)
      if (filter && filter !== 'todas') q = q.eq('estado', filter)
      const { data, error } = await q
      if (!active) return
      if (error) setError(error.message)
      else setFaturas(data ?? [])
    }
    load()
    return () => { active = false }
  }, [filter, reload])

  const stats = useMemo(() => {
    if (!faturas) return null
    return {
      total: faturas.reduce((a, f) => a + Number(f.valor ?? 0) + Number(f.iva ?? 0), 0),
      count: faturas.length,
      fornecedores: new Set(faturas.map(f => f.fornecedor_id || f.fornecedor_nome).filter(Boolean)).size,
    }
  }, [faturas])

  async function marcarPaga(id) {
    setFeedback(null)
    setSubmitting(id)
    const { data, error: rpcErr } = await v2Client.rpc('marcar_fatura_paga', {
      p_fatura_id: id, p_data_pagamento: new Date().toISOString().slice(0, 10),
    })
    setSubmitting(null)
    if (rpcErr) { setFeedback({ ok: false, msg: rpcErr.message }); return }
    if (data?.ok === false) { setFeedback({ ok: false, msg: data.error || 'erro' }); return }
    setFeedback({ ok: true, msg: `Marcada como paga: ${data?.fornecedor ?? id.slice(0, 8)}` })
    setReload(r => r + 1)
  }

  return (
    <div>
      <h1>Faturas</h1>
      <p className="dim" style={{ fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        Faturas de fornecedores. Click <code className="mono">Marcar Paga</code> chama RPC <code className="mono">marcar_fatura_paga</code> + log automático.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        {[['pendente','Pendentes'],['paga','Pagas'],['todas','Todas']].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            style={{
              padding: '5px 12px',
              background: filter === k ? 'var(--sf2)' : 'transparent',
              border: '1px solid ' + (filter === k ? 'var(--go)' : 'var(--bd)'),
              color: filter === k ? 'var(--tx)' : 'var(--mu)',
              borderRadius: 5, fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: 0.5,
              cursor: 'pointer',
            }}
          >{l}</button>
        ))}
        {stats && (
          <span className="mono dim" style={{ marginLeft: 'auto', fontSize: 10 }}>
            {stats.count} faturas · {eur(stats.total)} · {stats.fornecedores} fornec.
          </span>
        )}
      </div>

      {error && <div className="error-banner">Erro: {error}</div>}
      {feedback && (
        <div style={{
          padding: '8px 12px', marginBottom: 14, borderRadius: 6, fontSize: 12,
          background: feedback.ok ? 'rgba(63,185,80,0.10)' : 'rgba(255,123,114,0.10)',
          color: feedback.ok ? 'var(--gr)' : 'var(--rd)',
          border: `1px solid ${feedback.ok ? 'rgba(63,185,80,0.30)' : 'rgba(255,123,114,0.30)'}`,
        }}>{feedback.msg}</div>
      )}

      {faturas === null && !error && <div className="dim">A carregar…</div>}
      {faturas && faturas.length === 0 && !error && (
        <div className="empty-state">
          Sem faturas para "{filter}".
        </div>
      )}

      {faturas && faturas.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Fornecedor</th>
              <th>Nº</th>
              <th>Vencimento</th>
              <th style={{ textAlign: 'right' }}>Valor + IVA</th>
              <th>Estado</th>
              <th>Acção</th>
            </tr>
          </thead>
          <tbody>
            {faturas.map(f => {
              const total = Number(f.valor ?? 0) + Number(f.iva ?? 0)
              const isPaga = f.estado === 'paga'
              const isSubmitting = submitting === f.id
              return (
                <tr key={f.id}>
                  <td>{f.fornecedores?.nome ?? f.fornecedor_nome ?? <span className="dim">—</span>}</td>
                  <td className="mono" style={{ fontSize: 10 }}>{f.numero_fatura ?? '—'}</td>
                  <td className="mono" style={{ fontSize: 11 }}>{fdate(f.vencimento)}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>{eur(total)}</td>
                  <td>
                    {isPaga
                      ? <span className="b b-green">paga {f.pago_em ? '· ' + fdate(f.pago_em) : ''}</span>
                      : <span className="b b-gold">pendente</span>}
                  </td>
                  <td>
                    {!isPaga && (
                      <button
                        onClick={() => marcarPaga(f.id)}
                        disabled={isSubmitting}
                        style={{
                          padding: '4px 10px',
                          background: 'transparent',
                          color: 'var(--gr)',
                          border: '1px solid var(--gr)',
                          borderRadius: 4,
                          fontSize: 10,
                          fontFamily: 'DM Mono, monospace',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          cursor: isSubmitting ? 'wait' : 'pointer',
                          opacity: isSubmitting ? 0.4 : 1,
                        }}
                      >
                        {isSubmitting ? '…' : 'Marcar Paga'}
                      </button>
                    )}
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
