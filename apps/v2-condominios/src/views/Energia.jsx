import { useEffect, useState } from 'react'
import { v2Client } from '../lib/clients.js'

export default function Energia() {
  const [leituras, setLeituras] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await v2Client
        .from('carregadores_contagens')
        .select('*, fracoes:fracao_id(codigo)')
        .order('periodo', { ascending: false })
        .limit(100)
      if (!active) return
      if (error) setError(error.message)
      else setLeituras(data ?? [])
    }
    load()
    return () => { active = false }
  }, [])

  const totalKwh = (leituras ?? []).reduce((acc, l) => acc + Number(l.kwh ?? 0), 0)
  const totalValor = (leituras ?? []).reduce((acc, l) => acc + Number(l.valor_calculado ?? 0), 0)

  return (
    <div>
      <h1>EV / Energia</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        Contagens de kWh por posto. <code className="mono">energia-condo</code> (Enzo) processa Dia 1 do mês. <code className="mono">valor_calculado</code> é coluna gerada (kwh × tarifa).
      </p>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-l">kWh acumulado</div>
          <div className="kpi-v">{totalKwh > 0 ? totalKwh.toFixed(0) : '—'}</div>
          <div className="kpi-s">últimas 100 leituras</div>
        </div>
        <div className="kpi">
          <div className="kpi-l">Valor cobrado</div>
          <div className="kpi-v">{totalValor > 0 ? `${totalValor.toFixed(2)} €` : '—'}</div>
          <div className="kpi-s">soma de valor_calculado</div>
        </div>
        <div className="kpi">
          <div className="kpi-l">Postos activos</div>
          <div className="kpi-v">
            {leituras ? new Set(leituras.map(l => l.carregador_id).filter(Boolean)).size : '—'}
          </div>
          <div className="kpi-s">distintos com leituras</div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
          Erro: {error}
        </div>
      )}

      {leituras === null && !error && <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>A carregar…</div>}

      {leituras && leituras.length === 0 && !error && (
        <div style={{
          padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)',
          background: 'var(--bg-card-soft)', border: '1px dashed var(--border)', borderRadius: 8,
        }}>
          <div style={{ fontSize: 14, marginBottom: 6 }}>Sem leituras EV</div>
          <div style={{ fontSize: 12 }}>
            Quando houver postos configurados, Enzo regista contagens mensais aqui.
          </div>
        </div>
      )}

      {leituras && leituras.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-dim)', fontSize: 8, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Data</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Posto</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>kWh</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {leituras.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace' }}>{l.data_leitura ?? '—'}</td>
                <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{l.carregador_id?.slice(0, 8) ?? '—'}</td>
                <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }}>
                  {Number(l.kwh ?? 0).toFixed(1)}
                </td>
                <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }}>
                  {Number(l.valor_calculado ?? 0).toFixed(2)} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
