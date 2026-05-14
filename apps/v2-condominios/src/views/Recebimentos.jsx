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

export default function Recebimentos() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    v2Client
      .from('recebimentos')
      .select('id, data_pagamento, valor_pago, periodo, referencia_mb, fracao_id, fracoes:fracao_id(codigo)')
      .not('data_pagamento', 'is', null)
      .order('data_pagamento', { ascending: false })
      .limit(300)
      .then(({ data, error }) => {
        if (!active) return
        if (error) setError(error.message)
        else setRows(data ?? [])
      })
    return () => { active = false }
  }, [reload])

  const total = useMemo(() => (rows ?? []).reduce((a, r) => a + Number(r.valor_pago ?? 0), 0), [rows])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 style={{ margin: 0 }}>Recebimentos</h1>
        <button onClick={() => setShowModal(true)} style={btnPrimary}>+ Lançar Recebimento</button>
      </div>
      <p className="dim" style={{ fontSize: 13, marginBottom: 16 }}>
        Quotas pagas pelos condóminos. Reconciliação com <code className="mono">extrato_bancario</code> é feita pela Fina.
      </p>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="kpi kpi-green">
          <div className="kpi-l">Total recebido</div>
          <div className="kpi-v">{total > 0 ? eur(total) : '—'}</div>
          <div className="kpi-s">{rows?.length ?? 0} pagamentos</div>
        </div>
      </div>

      {error && <div className="error-banner">Erro: {error}</div>}
      {rows === null && !error && <div className="dim">A carregar…</div>}
      {rows && rows.length === 0 && !error && (
        <div className="empty-state">
          <div style={{ fontSize: 14, marginBottom: 4 }}>Sem recebimentos</div>
          <div style={{ fontSize: 12 }}>Clica em "Lançar Recebimento" para registar o primeiro pagamento.</div>
        </div>
      )}
      {rows && rows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Fracção</th>
              <th>Período</th>
              <th>Referência</th>
              <th style={{ textAlign: 'right' }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td className="mono">{fdate(r.data_pagamento)}</td>
                <td className="mono">{r.fracoes?.codigo ?? r.fracao_id?.slice(0, 8) ?? '—'}</td>
                <td className="mono" style={{ fontSize: 11 }}>{fdate(r.periodo)}</td>
                <td className="mono" style={{ fontSize: 10, color: 'var(--mu)' }}>{r.referencia_mb ?? '—'}</td>
                <td className="mono" style={{ textAlign: 'right', color: 'var(--gr)' }}>{eur(r.valor_pago)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <LancarRecebimentoModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); setReload(r => r + 1) }}
        />
      )}
    </div>
  )
}

function LancarRecebimentoModal({ onClose, onSuccess }) {
  const [fracoes, setFracoes] = useState(null)
  const [codigo, setCodigo] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10))
  const [referencia, setReferencia] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    v2Client.from('fracoes').select('codigo').order('codigo').then(({ data }) => setFracoes(data || []))
  }, [])

  async function submit(e) {
    e.preventDefault()
    setError(null); setSuccess(null)
    if (!codigo) return setError('Selecciona a fracção.')
    const v = Number(valor)
    if (!isFinite(v) || v <= 0) return setError('Valor inválido.')

    setLoading(true)
    const { data: result, error: rpcErr } = await v2Client.rpc('lancar_recebimento', {
      p_fracao_codigo: codigo,
      p_valor: v,
      p_data: data,
      p_referencia: referencia || null,
      p_observacoes: observacoes || null,
    })
    setLoading(false)
    if (rpcErr) { setError(rpcErr.message); return }
    if (result && result.ok === false) { setError(result.error || 'Erro a lançar.'); return }
    setSuccess('Recebimento lançado.')
    setTimeout(onSuccess, 600)
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontFamily: 'DM Serif Display, serif' }}>Lançar Recebimento</h2>
          <button onClick={onClose} style={btnClose}>×</button>
        </div>

        <form onSubmit={submit}>
          <Field label="Fracção">
            <select value={codigo} onChange={e => setCodigo(e.target.value)} required style={input}>
              <option value="">— selecciona —</option>
              {(fracoes || []).map(f => <option key={f.codigo} value={f.codigo}>{f.codigo}</option>)}
            </select>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Valor (€)">
              <input type="number" step="0.01" min="0" value={valor} onChange={e => setValor(e.target.value)} required style={input} placeholder="ex: 45.00" />
            </Field>
            <Field label="Data">
              <input type="date" value={data} onChange={e => setData(e.target.value)} required style={input} />
            </Field>
          </div>

          <Field label="Referência MB (opcional)">
            <input type="text" value={referencia} onChange={e => setReferencia(e.target.value)} style={input} placeholder="ex: 1234 5678 90123" />
          </Field>

          <Field label="Observações (opcional)">
            <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} style={{ ...input, minHeight: 56, fontFamily: 'DM Sans, sans-serif' }} />
          </Field>

          {error && <div className="error-banner">{error}</div>}
          {success && <div style={successStyle}>{success}</div>}

          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={btnSecondary}>Cancelar</button>
            <button type="submit" disabled={loading} style={btnPrimary}>{loading ? 'A lançar…' : 'Lançar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span className="mono" style={{
        display: 'block', fontSize: 9, color: 'var(--mu)',
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5,
      }}>{label}</span>
      {children}
    </label>
  )
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: 24,
}
const modal = {
  background: 'var(--sf)', border: '1px solid var(--bd)',
  borderRadius: 10, padding: 24, width: '100%', maxWidth: 460,
  boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
}
const input = {
  width: '100%', padding: '8px 10px', boxSizing: 'border-box',
  background: 'var(--sf2)', border: '1px solid var(--bd)',
  borderRadius: 6, color: 'var(--tx)',
  fontFamily: 'DM Mono, monospace', fontSize: 13,
}
const btnPrimary = {
  padding: '7px 14px', background: 'var(--go)', color: '#0d1117',
  border: 'none', borderRadius: 6,
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif',
}
const btnSecondary = {
  padding: '7px 14px', background: 'transparent', color: 'var(--mu)',
  border: '1px solid var(--bd)', borderRadius: 6,
  fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
}
const btnClose = {
  background: 'transparent', border: 'none', color: 'var(--mu)',
  fontSize: 22, lineHeight: 1, cursor: 'pointer', padding: 0,
}
const successStyle = {
  padding: '8px 12px', background: 'rgba(63,185,80,0.10)',
  color: 'var(--gr)', border: '1px solid rgba(63,185,80,0.30)',
  borderRadius: 6, fontSize: 12, marginTop: 8,
}
