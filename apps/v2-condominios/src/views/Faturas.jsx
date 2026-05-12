import { useEffect, useState } from 'react'
import { v2Client } from '../lib/clients.js'

export default function Faturas() {
  const [faturas, setFaturas] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await v2Client
        .from('faturas_pendentes')
        .select('*, fornecedores:fornecedor_id(id, nome, nif, categoria)')
        .order('data_vencimento', { ascending: true, nullsFirst: false })
        .limit(200)
      if (!active) return
      if (error) setError(error.message)
      else setFaturas(data ?? [])
    }
    load()
    return () => { active = false }
  }, [])

  const totalPendente = (faturas ?? []).reduce((acc, f) => acc + Number(f.valor ?? 0), 0)

  return (
    <div>
      <h1>Faturas pendentes</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        Faturas de fornecedores a pagar. Quando há ficheiro PDF, <code className="mono">docs-condo</code> (Dora) corre OCR e popula <code className="mono">faturas_ocr</code>.
      </p>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="kpi">
          <div className="kpi-l">Total pendente</div>
          <div className="kpi-v">{totalPendente > 0 ? `${totalPendente.toFixed(2)} €` : '—'}</div>
          <div className="kpi-s">{faturas?.length ?? 0} faturas</div>
        </div>
        <div className="kpi">
          <div className="kpi-l">Fornecedores</div>
          <div className="kpi-v">
            {faturas ? new Set(faturas.map(f => f.fornecedor_id).filter(Boolean)).size : '—'}
          </div>
          <div className="kpi-s">distintos</div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
          Erro: {error}
        </div>
      )}

      {faturas === null && !error && (
        <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>A carregar…</div>
      )}

      {faturas && faturas.length === 0 && !error && (
        <EmptyHint title="Sem faturas pendentes" hint="Quando chegarem PDFs por email ou upload, Dora processa OCR e cria entradas aqui." />
      )}

      {faturas && faturas.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-dim)', fontSize: 8, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Fornecedor</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Categoria</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Vencimento</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {faturas.map(f => (
              <tr key={f.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                <td style={{ padding: '8px 10px' }}>
                  {f.fornecedores?.nome ?? f.fornecedor_nome ?? <span style={{ color: 'var(--text-dim)' }}>—</span>}
                </td>
                <td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-dim)' }}>{f.fornecedores?.categoria ?? '—'}</td>
                <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace' }}>{f.data_vencimento ?? '—'}</td>
                <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }}>
                  {Number(f.valor ?? 0).toFixed(2)} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function EmptyHint({ title, hint }) {
  return (
    <div style={{
      padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)',
      background: 'var(--bg-card-soft)', border: '1px dashed var(--border)', borderRadius: 8,
    }}>
      <div style={{ fontSize: 14, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12 }}>{hint}</div>
    </div>
  )
}
