import { useEffect, useMemo, useState } from 'react'
import { v2Client } from '../lib/clients.js'

const YEARS = [2024, 2025, 2026]
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const CURRENT_YEAR = new Date().getFullYear()

function eur(n) {
  if (n == null || n === 0) return '—'
  return Number(n).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

// Estado da quota num dado mês:
//   ok        valor_pago >= valor_emitido
//   parcial   valor_pago > 0 mas < emitido
//   divida    valor_pago = 0 e emitido > 0
//   none      sem emissão (sem quota nesse mês)
function statusCell(emitido, pago) {
  const e = Number(emitido ?? 0)
  const p = Number(pago ?? 0)
  if (e === 0) return { kind: 'none', label: '—' }
  if (p >= e)  return { kind: 'ok',      label: eur(p),  pct: 1 }
  if (p > 0)   return { kind: 'parcial', label: eur(p),  pct: p / e }
  return { kind: 'divida', label: eur(e), pct: 0 }
}

const colorByKind = {
  ok:      { bg: 'rgba(63,185,80,0.15)',  fg: 'var(--gr)' },
  parcial: { bg: 'rgba(227,179,65,0.18)', fg: 'var(--go)' },
  divida:  { bg: 'rgba(255,123,114,0.15)', fg: 'var(--rd)' },
  none:    { bg: 'transparent',           fg: 'var(--mu)' },
}

export default function MapaReceitas() {
  const [ano, setAno] = useState(CURRENT_YEAR)
  const [rec, setRec] = useState(null)
  const [fracoes, setFracoes] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setRec(null); setError(null)
    async function load() {
      const inicio = `${ano}-01-01`
      const fim    = `${ano}-12-31`
      const [r, f] = await Promise.all([
        v2Client
          .from('recebimentos')
          .select('fracao_id, periodo, valor_emitido, valor_pago, estado')
          .gte('periodo', inicio)
          .lte('periodo', fim)
          .limit(5000),
        v2Client
          .from('fracoes')
          .select('id, codigo, permilagem')
          .order('codigo'),
      ])
      if (!active) return
      if (r.error || f.error) {
        setError(r.error?.message || f.error?.message)
        return
      }
      setRec(r.data || [])
      setFracoes(f.data || [])
    }
    load()
    return () => { active = false }
  }, [ano])

  // grid[fracao_id][mes 0..11] = { emitido, pago }
  const grid = useMemo(() => {
    if (!rec) return null
    const g = {}
    for (const r of rec) {
      if (!r.fracao_id || !r.periodo) continue
      const mes = new Date(r.periodo).getMonth() // 0..11
      if (!g[r.fracao_id]) g[r.fracao_id] = Array.from({ length: 12 }, () => ({ emitido: 0, pago: 0 }))
      g[r.fracao_id][mes].emitido += Number(r.valor_emitido ?? 0)
      g[r.fracao_id][mes].pago    += Number(r.valor_pago ?? 0)
    }
    return g
  }, [rec])

  // Totais por linha (fracção) e por coluna (mês)
  const totals = useMemo(() => {
    if (!grid || !fracoes) return null
    const porFracao = {}
    const porMes = Array.from({ length: 12 }, () => ({ emitido: 0, pago: 0 }))
    let totalE = 0, totalP = 0
    for (const f of fracoes) {
      const row = grid[f.id]
      if (!row) { porFracao[f.id] = { emitido: 0, pago: 0 }; continue }
      let e = 0, p = 0
      for (let m = 0; m < 12; m++) {
        e += row[m].emitido
        p += row[m].pago
        porMes[m].emitido += row[m].emitido
        porMes[m].pago    += row[m].pago
      }
      porFracao[f.id] = { emitido: e, pago: p }
      totalE += e
      totalP += p
    }
    return { porFracao, porMes, totalE, totalP }
  }, [grid, fracoes])

  const ready = rec !== null && fracoes !== null && grid !== null && totals !== null

  return (
    <div>
      <h1>Mapa de Receitas</h1>
      <p className="dim" style={{ fontSize: 13, marginTop: -8, marginBottom: 14 }}>
        Distribuição de quotas por fracção × mês. Verde = pago, dourado = parcial, vermelho = em dívida.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span className="mono dim" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginRight: 6 }}>Ano</span>
        {YEARS.map(y => (
          <button
            key={y}
            onClick={() => setAno(y)}
            style={{
              padding: '5px 12px',
              background: y === ano ? 'var(--go)' : 'transparent',
              color: y === ano ? '#0d1117' : 'var(--mu)',
              border: '1px solid ' + (y === ano ? 'var(--go)' : 'var(--bd)'),
              borderRadius: 5,
              fontFamily: 'DM Mono, monospace',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {y}
          </button>
        ))}
        <span className="mono dim" style={{ marginLeft: 'auto', fontSize: 10 }}>
          {ready && totals
            ? `${fracoes?.length ?? 0} fracções · emitido ${eur(totals.totalE)} · pago ${eur(totals.totalP)}`
            : ''}
        </span>
      </div>

      {error && <div className="error-banner">Erro: {error}</div>}
      {!ready && !error && <div className="dim">A carregar mapa…</div>}
      {ready && rec.length === 0 && (
        <div className="empty-state">Sem recebimentos emitidos em {ano}.</div>
      )}
      {ready && rec.length > 0 && (
        <div style={{ overflowX: 'auto', background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 8 }}>
          <table style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, background: 'var(--sf2)', zIndex: 1 }}>Fracção</th>
                {MESES.map(m => <th key={m} style={{ textAlign: 'center', fontSize: 9 }}>{m}</th>)}
                <th style={{ textAlign: 'right', borderLeft: '1px solid var(--bd)' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {fracoes.map(f => {
                const row = grid[f.id] || Array.from({ length: 12 }, () => ({ emitido: 0, pago: 0 }))
                const tot = totals.porFracao[f.id]
                return (
                  <tr key={f.id}>
                    <td
                      className="mono"
                      style={{ position: 'sticky', left: 0, background: 'var(--sf)', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}
                    >
                      {f.codigo}
                      <span className="dim" style={{ fontSize: 9, marginLeft: 6 }}>
                        {f.permilagem != null ? `${Number(f.permilagem).toFixed(2)}‰` : ''}
                      </span>
                    </td>
                    {row.map((cell, m) => {
                      const s = statusCell(cell.emitido, cell.pago)
                      const c = colorByKind[s.kind]
                      return (
                        <td
                          key={m}
                          style={{
                            textAlign: 'center', padding: '4px 2px',
                            background: c.bg, color: c.fg,
                            fontFamily: 'DM Mono, monospace',
                            fontSize: 10,
                            borderLeft: '1px solid var(--bd)',
                          }}
                          title={`${MESES[m]} ${ano} · emitido ${eur(cell.emitido)} · pago ${eur(cell.pago)}`}
                        >
                          {s.label}
                        </td>
                      )
                    })}
                    <td
                      className="mono"
                      style={{ textAlign: 'right', borderLeft: '1px solid var(--bd)', fontWeight: 600 }}
                    >
                      {eur(tot?.pago)}
                      <div className="dim" style={{ fontSize: 9 }}>de {eur(tot?.emitido)}</div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--sf2)' }}>
                <td
                  className="mono"
                  style={{ position: 'sticky', left: 0, background: 'var(--sf2)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                  Total
                </td>
                {totals.porMes.map((c, m) => (
                  <td
                    key={m}
                    className="mono"
                    style={{ textAlign: 'center', fontSize: 10, borderLeft: '1px solid var(--bd)' }}
                  >
                    {eur(c.pago)}
                  </td>
                ))}
                <td
                  className="mono"
                  style={{ textAlign: 'right', borderLeft: '1px solid var(--bd)', fontWeight: 700 }}
                >
                  {eur(totals.totalP)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
