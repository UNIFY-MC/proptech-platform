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

export default function Bancos() {
  const [movs, setMovs] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('todos')
  const [reload, setReload] = useState(0)
  const [submitting, setSubmitting] = useState(null)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    let active = true
    v2Client.from('extrato_bancario')
      .select('id, data_movimento, descricao, valor, saldo_apos, referencia_banco, recebimento_id, fracao_id, reconciliado')
      .order('data_movimento', { ascending: false }).limit(500)
      .then(({ data, error }) => {
        if (!active) return
        if (error) setError(error.message); else setMovs(data ?? [])
      })
    return () => { active = false }
  }, [reload])

  const visible = useMemo(() => {
    if (!movs) return null
    if (filter === 'nao_rec') return movs.filter(m => !m.reconciliado)
    if (filter === 'rec') return movs.filter(m => m.reconciliado)
    return movs
  }, [movs, filter])

  const stats = useMemo(() => {
    if (!visible) return null
    return {
      total: visible.reduce((a, m) => a + Number(m.valor ?? 0), 0),
      naoRec: visible.filter(m => !m.reconciliado).length,
      rec: visible.filter(m => m.reconciliado).length,
    }
  }, [visible])

  async function reconciliar(id) {
    setFeedback(null); setSubmitting(id)
    const { data, error: rpcErr } = await v2Client.rpc('reconciliar_extrato', { p_movimento_id: id })
    setSubmitting(null)
    if (rpcErr) { setFeedback({ ok: false, msg: rpcErr.message }); return }
    if (data?.ok === false) { setFeedback({ ok: false, msg: data.error || 'erro' }); return }
    setFeedback({ ok: true, msg: `Movimento reconciliado: ${eur(data?.valor)}` })
    setReload(r => r + 1)
  }

  return (
    <div>
      <h1>Bancos</h1>
      <p className="dim" style={{ fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        Movimentos bancários. Click <code className="mono">Reconciliar</code> marca o movimento como conferido via RPC <code className="mono">reconciliar_extrato</code>.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        {[['todos','Todos'],['nao_rec','Não Reconciliados'],['rec','Reconciliados']].map(([k, l]) => (
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
            {visible.length} movs · saldo {eur(stats.total)} · {stats.naoRec} ✗ · {stats.rec} ✓
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

      {movs === null && !error && <div className="dim">A carregar…</div>}
      {visible && visible.length === 0 && !error && <div className="empty-state">Sem movimentos.</div>}

      {visible && visible.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Ref.</th>
              <th style={{ textAlign: 'right' }}>Valor</th>
              <th style={{ textAlign: 'right' }}>Saldo</th>
              <th>Recon.</th>
              <th>Acção</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(m => {
              const v = Number(m.valor ?? 0)
              const isSubmitting = submitting === m.id
              return (
                <tr key={m.id}>
                  <td className="mono" style={{ fontSize: 11 }}>{fdate(m.data_movimento)}</td>
                  <td style={{ fontSize: 12 }}>{m.descricao ?? '—'}</td>
                  <td className="mono" style={{ fontSize: 10, color: 'var(--mu)' }}>{m.referencia_banco ?? '—'}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>{eur(v)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 11 }}>{eur(m.saldo_apos)}</td>
                  <td>
                    {m.reconciliado
                      ? <span className="b b-green">✓</span>
                      : <span className="b">○</span>}
                  </td>
                  <td>
                    {!m.reconciliado && (
                      <button
                        onClick={() => reconciliar(m.id)}
                        disabled={isSubmitting}
                        style={{
                          padding: '4px 10px',
                          background: 'transparent',
                          color: 'var(--bl)',
                          border: '1px solid var(--bl)',
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
                        {isSubmitting ? '…' : 'Reconciliar'}
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
