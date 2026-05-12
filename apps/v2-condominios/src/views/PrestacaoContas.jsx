import { useState, useEffect, useMemo } from 'react'
import { v2Client } from '../lib/clients.js'

const TABS = [
  { id: 'visao',         label: 'Visão Geral' },
  { id: 'orc-vs-real',   label: 'Orçamento vs Real' },
  { id: 'orcamento',     label: 'Orçamento' },
  { id: 'orc-fracao',    label: 'Orçamento por Fração' },
  { id: 'extrato',       label: 'Extrato Bancário' },
  { id: 'documentos',    label: 'Documentos' },
]

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const YEARS = [2024, 2025, 2026]
const CURRENT_YEAR = new Date().getFullYear()

function eur(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
}
function eur0(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}
function fdate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-PT')
}

export default function PrestacaoContas() {
  const [tab, setTab] = useState('visao')
  const [ano, setAno] = useState(CURRENT_YEAR)
  const [kpis, setKpis] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setKpis(null); setError(null)
    v2Client.rpc('condo_dashboard_kpis', { p_ano: ano })
      .then(({ data, error }) => {
        if (!active) return
        if (error) setError(error.message)
        else setKpis(data)
      })
    return () => { active = false }
  }, [ano])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span className="mono" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--mu)', marginRight: 6 }}>
          Ano
        </span>
        {YEARS.map(y => (
          <button
            key={y}
            className={'year-pill' + (y === ano ? ' active' : '')}
            onClick={() => setAno(y)}
          >
            {y}
          </button>
        ))}
      </div>

      <div style={{
        padding: '10px 14px',
        background: 'rgba(88,166,255,0.08)',
        border: '1px solid rgba(88,166,255,0.20)',
        borderRadius: 6,
        fontSize: 12,
        color: 'var(--bl)',
        marginBottom: 18,
        fontFamily: 'DM Mono, monospace',
      }}>
        ● {ano} {ano === CURRENT_YEAR ? '(em curso)' : '(fechado)'}
      </div>

      {error && <div className="error-banner">Erro: {error}</div>}

      <div className="kpi-grid">
        <div className="kpi kpi-gold"><div className="kpi-l">Saldo Bancário Inicial</div><div className="kpi-v">{kpis ? eur(kpis.saldo_bancario_inicial) : '—'}</div><div className="kpi-s">31 Dez {ano - 1}</div></div>
        <div className="kpi kpi-green"><div className="kpi-l">Receitas</div><div className="kpi-v">{kpis ? eur(kpis.receitas) : '—'}</div><div className="kpi-s">{ano}</div></div>
        <div className="kpi kpi-red"><div className="kpi-l">Despesas</div><div className="kpi-v">{kpis ? eur(kpis.despesas) : '—'}</div><div className="kpi-s">{ano}</div></div>
        <div className="kpi"><div className="kpi-l">Saldo Bancário Final</div><div className="kpi-v">{kpis ? eur(kpis.saldo_bancario_final) : '—'}</div><div className="kpi-s">{ano === CURRENT_YEAR ? 'hoje' : `31 Dez ${ano}`}</div></div>
      </div>

      <div style={{
        background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 8,
        padding: '12px 18px', marginBottom: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Resultado do período</span>
        <span className="mono" style={{
          fontSize: 14,
          color: kpis && kpis.resultado_periodo >= 0 ? 'var(--gr)' : 'var(--rd)',
        }}>
          {kpis ? (kpis.resultado_periodo >= 0 ? '+ ' : '') + eur(kpis.resultado_periodo) : '—'}
        </span>
      </div>

      {/* Resumo Financeiro (paridade legacy) */}
      {kpis && (
        <div style={{
          background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 8,
          marginBottom: 18, overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 18px', borderBottom: '2px solid var(--bd)', background: 'var(--sf2)',
          }}>
            <span className="mono" style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--mu)' }}>
              Resumo Financeiro
            </span>
            <span className="mono dim" style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
              {ano === CURRENT_YEAR ? 'Actual' : `31 Dez ${ano}`}
            </span>
          </div>
          <RR label="Saldo Bancário Final" value={eur(kpis.saldo_bancario_final)} tone="blue" />
          <RR label="Dívidas Condóminos" value={(kpis.mora_total > 0 ? '+ ' : '') + eur(kpis.mora_total)} tone={kpis.mora_total > 0 ? 'green' : null} sub={`${kpis.fracoes_em_mora ?? 0} fracções`} />
          <RR label="Dívidas a Fornecedores" value={(kpis.dividas_fornecedores > 0 ? '- ' : '') + eur(kpis.dividas_fornecedores)} tone={kpis.dividas_fornecedores > 0 ? 'red' : null} />
          <RR label="Fundo Comum de Reserva (10%)" value={eur(kpis.fundo_comum_reserva)} tone="gold" />
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 18px', borderTop: '2px solid var(--bd)', background: 'var(--sf2)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Saldo Financeiro Líquido</span>
            <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>
              {eur(kpis.saldo_financeiro)}
            </span>
          </div>
        </div>
      )}

      {kpis && kpis.receitas > 0 && (
        <p className="dim" style={{ fontSize: 10, marginBottom: 12, fontStyle: 'italic' }}>
          Valores derivados do extrato bancário ({ano}). Inclui transferências internas (e.g. EUPAGO → conta).
          Para excluir, classificar movimentos em <code className="mono">extrato_bancario</code>.
        </p>
      )}

      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={'tab' + (tab === t.id ? ' active' : '')}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        {tab === 'visao'       && <TabVisao ano={ano} />}
        {tab === 'orc-vs-real' && <TabOrcVsReal ano={ano} />}
        {tab === 'orcamento'   && <TabOrcamento ano={ano} />}
        {tab === 'orc-fracao'  && <TabOrcFracao ano={ano} />}
        {tab === 'extrato'     && <TabExtrato ano={ano} />}
        {tab === 'documentos'  && <TabDocumentos ano={ano} />}
      </div>
    </div>
  )
}

/* Linha do Resumo Financeiro */
function RR({ label, value, tone, sub }) {
  const color = tone === 'red'   ? 'var(--rd)'
              : tone === 'green' ? 'var(--gr)'
              : tone === 'gold'  ? 'var(--go)'
              : tone === 'blue'  ? 'var(--bl)'
              : 'var(--tx)'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 18px', borderBottom: '1px solid var(--bd)',
    }}>
      <div>
        <span style={{ fontSize: 12 }}>{label}</span>
        {sub && <span className="dim mono" style={{ fontSize: 9, marginLeft: 8 }}>{sub}</span>}
      </div>
      <span className="mono" style={{ fontSize: 13, color }}>{value}</span>
    </div>
  )
}

/* Tab: Visão Geral — receitas/despesas mensais com barras */
function TabVisao({ ano }) {
  const [rec, setRec] = useState(null)
  const [ext, setExt] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setRec(null); setExt(null); setError(null)
    const i = `${ano}-01-01`, f = `${ano}-12-31`
    Promise.all([
      v2Client.from('recebimentos').select('data_pagamento, valor_pago').gte('data_pagamento', i).lte('data_pagamento', f).limit(5000),
      v2Client.from('extrato_bancario').select('data_movimento, valor').gte('data_movimento', i).lte('data_movimento', f).limit(5000),
    ]).then(([r, e]) => {
      if (!active) return
      if (r.error || e.error) { setError(r.error?.message || e.error?.message); return }
      setRec(r.data || []); setExt(e.data || [])
    })
    return () => { active = false }
  }, [ano])

  const monthly = useMemo(() => {
    if (!rec || !ext) return null
    const m = Array.from({ length: 12 }, () => ({ receitas: 0, despesas: 0 }))
    for (const r of rec) {
      if (!r.data_pagamento) continue
      m[new Date(r.data_pagamento).getMonth()].receitas += Number(r.valor_pago ?? 0)
    }
    for (const e of ext) {
      if (!e.data_movimento) continue
      const v = Number(e.valor ?? 0)
      if (v < 0) m[new Date(e.data_movimento).getMonth()].despesas += -v
    }
    return m
  }, [rec, ext])

  if (error) return <div className="error-banner">Erro: {error}</div>
  if (!monthly) return <div className="dim">A carregar…</div>

  const totR = monthly.reduce((a, m) => a + m.receitas, 0)
  const totD = monthly.reduce((a, m) => a + m.despesas, 0)
  const max = Math.max(...monthly.map(m => Math.max(m.receitas, m.despesas)), 1)

  return (
    <div>
      <h3 style={{ fontSize: 13, marginBottom: 12 }}>Movimento mensal {ano}</h3>
      <div style={{ background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 8, padding: 14, marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4, height: 140, alignItems: 'flex-end' }}>
          {monthly.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 2, width: '100%', justifyContent: 'center' }}>
                <div title={`Receitas ${eur(m.receitas)}`} style={{ width: 8, background: 'var(--gr)', height: `${(m.receitas / max) * 100}%`, minHeight: 2, borderRadius: '2px 2px 0 0' }} />
                <div title={`Despesas ${eur(m.despesas)}`} style={{ width: 8, background: 'var(--rd)', height: `${(m.despesas / max) * 100}%`, minHeight: 2, borderRadius: '2px 2px 0 0' }} />
              </div>
              <div className="mono dim" style={{ fontSize: 9, marginTop: 2 }}>{MESES[i]}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10, justifyContent: 'center', fontSize: 11, color: 'var(--mu)' }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--gr)', verticalAlign: 'middle', marginRight: 4 }} /> Receitas</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--rd)', verticalAlign: 'middle', marginRight: 4 }} /> Despesas</span>
        </div>
      </div>

      <table>
        <thead><tr><th>Mês</th><th style={{ textAlign: 'right' }}>Receitas</th><th style={{ textAlign: 'right' }}>Despesas</th><th style={{ textAlign: 'right' }}>Resultado</th></tr></thead>
        <tbody>
          {monthly.map((m, i) => {
            const res = m.receitas - m.despesas
            return (
              <tr key={i}>
                <td className="mono">{MESES[i]}</td>
                <td className="mono" style={{ textAlign: 'right', color: m.receitas > 0 ? 'var(--gr)' : 'var(--mu)' }}>{eur(m.receitas)}</td>
                <td className="mono" style={{ textAlign: 'right', color: m.despesas > 0 ? 'var(--rd)' : 'var(--mu)' }}>{eur(m.despesas)}</td>
                <td className="mono" style={{ textAlign: 'right', color: res >= 0 ? 'var(--gr)' : 'var(--rd)' }}>{eur(res)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: 'var(--sf2)', fontWeight: 700 }}>
            <td className="mono">Total</td>
            <td className="mono" style={{ textAlign: 'right', color: 'var(--gr)' }}>{eur(totR)}</td>
            <td className="mono" style={{ textAlign: 'right', color: 'var(--rd)' }}>{eur(totD)}</td>
            <td className="mono" style={{ textAlign: 'right', color: (totR - totD) >= 0 ? 'var(--gr)' : 'var(--rd)' }}>{eur(totR - totD)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

/* Tab: Orçamento */
function TabOrcamento({ ano }) {
  const [orcs, setOrcs] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    let active = true
    setOrcs(null); setError(null)
    v2Client.from('orcamentos').select('*').eq('ano', ano).order('descricao')
      .then(({ data, error }) => {
        if (!active) return
        if (error) setError(error.message); else setOrcs(data || [])
      })
    return () => { active = false }
  }, [ano])
  if (error) return <div className="error-banner">Erro: {error}</div>
  if (orcs === null) return <div className="dim">A carregar…</div>
  if (orcs.length === 0) return (
    <div className="empty-state">
      <div style={{ fontSize: 14, marginBottom: 4 }}>Sem orçamento aprovado para {ano}</div>
      <div style={{ fontSize: 12 }}>
        Quando a assembleia aprovar um orçamento, fica em <code className="mono">orcamentos</code> e aparece aqui com distribuição.
      </div>
    </div>
  )
  const total = orcs.reduce((a, o) => a + Number(o.valor_total ?? 0), 0)
  return (
    <div>
      <h3 style={{ fontSize: 13, marginBottom: 10 }}>Orçamento aprovado {ano}</h3>
      <table>
        <thead><tr><th>Descrição</th><th>Aprovado em</th><th style={{ textAlign: 'right' }}>Valor</th></tr></thead>
        <tbody>{orcs.map(o => (
          <tr key={o.id}>
            <td>{o.descricao ?? '—'}</td>
            <td className="mono">{fdate(o.aprovado_em)}</td>
            <td className="mono" style={{ textAlign: 'right' }}>{eur(o.valor_total)}</td>
          </tr>
        ))}</tbody>
        <tfoot><tr style={{ background: 'var(--sf2)', fontWeight: 700 }}><td colSpan={2}>Total</td><td className="mono" style={{ textAlign: 'right' }}>{eur(total)}</td></tr></tfoot>
      </table>
    </div>
  )
}

/* Tab: Orçamento vs Real */
function TabOrcVsReal({ ano }) {
  const [orcs, setOrcs] = useState(null)
  const [ext, setExt] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    let active = true
    setOrcs(null); setExt(null); setError(null)
    const i = `${ano}-01-01`, f = `${ano}-12-31`
    Promise.all([
      v2Client.from('orcamentos').select('valor_total').eq('ano', ano),
      v2Client.from('extrato_bancario').select('valor').gte('data_movimento', i).lte('data_movimento', f).limit(5000),
    ]).then(([o, e]) => {
      if (!active) return
      if (o.error || e.error) { setError(o.error?.message || e.error?.message); return }
      setOrcs(o.data || []); setExt(e.data || [])
    })
    return () => { active = false }
  }, [ano])
  if (error) return <div className="error-banner">Erro: {error}</div>
  if (orcs === null || ext === null) return <div className="dim">A carregar…</div>
  const orcTotal = orcs.reduce((a, o) => a + Number(o.valor_total ?? 0), 0)
  const real = ext.filter(e => Number(e.valor) < 0).reduce((a, e) => a + Math.abs(Number(e.valor)), 0)
  if (orcTotal === 0) return (
    <div className="empty-state">
      <div style={{ fontSize: 14, marginBottom: 4 }}>Sem orçamento para comparar</div>
      <div style={{ fontSize: 12 }}>Despesas reais em {ano}: <span className="mono">{eur(real)}</span>.</div>
    </div>
  )
  const desvio = real - orcTotal
  const desvioPct = (desvio / orcTotal) * 100
  return (
    <div>
      <h3 style={{ fontSize: 13, marginBottom: 10 }}>Orçamento vs Realizado {ano}</h3>
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="kpi"><div className="kpi-l">Orçamentado</div><div className="kpi-v">{eur(orcTotal)}</div></div>
        <div className="kpi kpi-red"><div className="kpi-l">Realizado</div><div className="kpi-v">{eur(real)}</div></div>
        <div className={'kpi ' + (desvio > 0 ? 'kpi-red' : 'kpi-green')}>
          <div className="kpi-l">Desvio</div>
          <div className="kpi-v">{desvio >= 0 ? '+' : ''}{eur(desvio)}</div>
          <div className="kpi-s">{desvioPct >= 0 ? '+' : ''}{desvioPct.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  )
}

/* Tab: Orçamento por Fração */
function TabOrcFracao({ ano }) {
  const [orcs, setOrcs] = useState(null)
  const [fracoes, setFracoes] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    let active = true
    setOrcs(null); setFracoes(null); setError(null)
    Promise.all([
      v2Client.from('orcamentos').select('valor_total').eq('ano', ano),
      v2Client.from('fracoes').select('id, codigo, permilagem').order('codigo'),
    ]).then(([o, f]) => {
      if (!active) return
      if (o.error || f.error) { setError(o.error?.message || f.error?.message); return }
      setOrcs(o.data || []); setFracoes(f.data || [])
    })
    return () => { active = false }
  }, [ano])
  if (error) return <div className="error-banner">Erro: {error}</div>
  if (orcs === null || fracoes === null) return <div className="dim">A carregar…</div>
  const orcTotal = orcs.reduce((a, o) => a + Number(o.valor_total ?? 0), 0)
  const totPerm = fracoes.reduce((a, f) => a + Number(f.permilagem ?? 0), 0)
  return (
    <div>
      <h3 style={{ fontSize: 13, marginBottom: 6 }}>Distribuição por fracção {ano}</h3>
      <p className="dim" style={{ fontSize: 11, marginBottom: 12 }}>
        Quota anual = orçamento × permilagem / 1000. Quota mensal = anual / 12.
      </p>
      {orcTotal === 0 && (
        <div className="error-banner" style={{ background: 'rgba(227,179,65,0.10)', color: 'var(--go)', borderColor: 'rgba(227,179,65,0.30)' }}>
          Aviso: orçamento {ano} = 0 €. Valores abaixo são estrutura permilagem.
        </div>
      )}
      <table>
        <thead><tr><th>Fracção</th><th style={{ textAlign: 'right' }}>Permilagem</th><th style={{ textAlign: 'right' }}>% Total</th><th style={{ textAlign: 'right' }}>Anual</th><th style={{ textAlign: 'right' }}>Mensal</th></tr></thead>
        <tbody>{fracoes.map(f => {
          const perm = Number(f.permilagem ?? 0)
          const pct = totPerm > 0 ? (perm / totPerm) * 100 : 0
          const anual = orcTotal * (perm / 1000)
          return (
            <tr key={f.id}>
              <td className="mono" style={{ fontWeight: 600 }}>{f.codigo}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{perm.toFixed(3)}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{pct.toFixed(2)}%</td>
              <td className="mono" style={{ textAlign: 'right' }}>{eur(anual)}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{eur(anual / 12)}</td>
            </tr>
          )
        })}</tbody>
        <tfoot><tr style={{ background: 'var(--sf2)', fontWeight: 700 }}>
          <td className="mono">Total</td>
          <td className="mono" style={{ textAlign: 'right' }}>{totPerm.toFixed(3)}</td>
          <td className="mono" style={{ textAlign: 'right' }}>100.00%</td>
          <td className="mono" style={{ textAlign: 'right' }}>{eur(orcTotal)}</td>
          <td className="mono" style={{ textAlign: 'right' }}>{eur(orcTotal / 12)}</td>
        </tr></tfoot>
      </table>
    </div>
  )
}

/* Tab: Extrato Bancário */
function TabExtrato({ ano }) {
  const [movs, setMovs] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('todos')
  useEffect(() => {
    let active = true
    setMovs(null); setError(null)
    const i = `${ano}-01-01`, f = `${ano}-12-31`
    v2Client
      .from('extrato_bancario')
      .select('id, data_movimento, descricao, valor, saldo_apos, reconciliado, referencia_banco')
      .gte('data_movimento', i).lte('data_movimento', f)
      .order('data_movimento', { ascending: false }).limit(1000)
      .then(({ data, error }) => {
        if (!active) return
        if (error) setError(error.message); else setMovs(data || [])
      })
    return () => { active = false }
  }, [ano])
  const visible = useMemo(() => {
    if (!movs) return null
    if (filter === 'credito') return movs.filter(m => Number(m.valor) > 0)
    if (filter === 'debito')  return movs.filter(m => Number(m.valor) < 0)
    if (filter === 'nao_rec') return movs.filter(m => !m.reconciliado)
    return movs
  }, [movs, filter])
  const stats = useMemo(() => {
    if (!visible) return null
    const cred = visible.filter(m => Number(m.valor) > 0).reduce((a, m) => a + Number(m.valor), 0)
    const deb  = visible.filter(m => Number(m.valor) < 0).reduce((a, m) => a + Number(m.valor), 0)
    const naoRec = visible.filter(m => !m.reconciliado).length
    return { cred, deb, naoRec }
  }, [visible])
  if (error) return <div className="error-banner">Erro: {error}</div>
  if (movs === null) return <div className="dim">A carregar…</div>
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {[['todos','TODOS'],['credito','CRÉDITO'],['debito','DÉBITO'],['nao_rec','NÃO RECONCILIADO']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            padding: '5px 12px',
            background: filter === k ? 'var(--sf2)' : 'transparent',
            border: '1px solid ' + (filter === k ? 'var(--go)' : 'var(--bd)'),
            color: filter === k ? 'var(--tx)' : 'var(--mu)',
            borderRadius: 5,
            fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: 0.5,
            cursor: 'pointer',
          }}>{l}</button>
        ))}
        {stats && (
          <span className="mono dim" style={{ marginLeft: 'auto', fontSize: 10 }}>
            {visible.length} mov · crédito {eur0(stats.cred)} · débito {eur0(stats.deb)} · {stats.naoRec} não reconciliados
          </span>
        )}
      </div>
      {visible.length === 0 && <div className="empty-state">Sem movimentos.</div>}
      {visible.length > 0 && (
        <table>
          <thead><tr><th>Data</th><th>Descrição</th><th>Ref.</th><th style={{ textAlign: 'right' }}>Valor</th><th style={{ textAlign: 'right' }}>Saldo</th><th>Recon.</th></tr></thead>
          <tbody>{visible.map(m => {
            const v = Number(m.valor)
            return (
              <tr key={m.id}>
                <td className="mono" style={{ fontSize: 11 }}>{fdate(m.data_movimento)}</td>
                <td style={{ fontSize: 12 }}>{m.descricao ?? '—'}</td>
                <td className="mono" style={{ fontSize: 10, color: 'var(--mu)' }}>{m.referencia_banco ?? '—'}</td>
                <td className="mono" style={{ textAlign: 'right', color: v >= 0 ? 'var(--gr)' : 'var(--rd)' }}>{v >= 0 ? '+' : ''}{eur(v)}</td>
                <td className="mono" style={{ textAlign: 'right', fontSize: 11 }}>{eur(m.saldo_apos)}</td>
                <td className="mono" style={{ fontSize: 11 }}>{m.reconciliado ? <span style={{ color: 'var(--gr)' }}>✓</span> : <span className="dim">○</span>}</td>
              </tr>
            )
          })}</tbody>
        </table>
      )}
    </div>
  )
}

/* Tab: Documentos */
function TabDocumentos({ ano }) {
  const [docs, setDocs] = useState(null)
  const [error, setError] = useState(null)
  const [filterTipo, setFilterTipo] = useState('')
  useEffect(() => {
    let active = true
    setDocs(null); setError(null)
    const i = `${ano}-01-01T00:00:00Z`, f = `${ano}-12-31T23:59:59Z`
    let q = v2Client.from('documentos')
      .select('id, tipo, titulo, filename_original, estado_ocr, confianca_ocr, processado_em, created_at')
      .gte('created_at', i).lte('created_at', f)
      .order('created_at', { ascending: false }).limit(300)
    if (filterTipo) q = q.eq('tipo', filterTipo)
    q.then(({ data, error }) => {
      if (!active) return
      if (error) setError(error.message); else setDocs(data || [])
    })
    return () => { active = false }
  }, [ano, filterTipo])
  const tipos = useMemo(() => {
    if (!docs) return []
    return [...new Set(docs.map(d => d.tipo).filter(Boolean))].sort()
  }, [docs])
  if (error) return <div className="error-banner">Erro: {error}</div>
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} style={{
          background: 'var(--sf)', border: '1px solid var(--bd)', color: 'var(--tx)',
          padding: '5px 10px', borderRadius: 6, fontSize: 11,
          fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          <option value="">Todos tipos</option>
          {tipos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="dim mono" style={{ fontSize: 10, marginLeft: 'auto' }}>
          {docs?.length ?? 0} documento{docs?.length === 1 ? '' : 's'} em {ano}
        </span>
      </div>
      {docs === null && <div className="dim">A carregar…</div>}
      {docs && docs.length === 0 && <div className="empty-state">Sem documentos arquivados em {ano}.</div>}
      {docs && docs.length > 0 && (
        <table>
          <thead><tr><th>Tipo</th><th>Título</th><th>Ficheiro</th><th>OCR</th><th style={{ textAlign: 'right' }}>Conf.</th><th>Data</th></tr></thead>
          <tbody>{docs.map(d => (
            <tr key={d.id}>
              <td><span className="b b-blue">{d.tipo ?? '—'}</span></td>
              <td style={{ fontSize: 12 }}>{d.titulo ?? '—'}</td>
              <td className="mono" style={{ fontSize: 10, color: 'var(--mu)' }}>{d.filename_original ?? '—'}</td>
              <td className="mono" style={{ fontSize: 11 }}>
                {d.estado_ocr === 'ok'   ? <span style={{ color: 'var(--gr)' }}>✓ ok</span> :
                 d.estado_ocr === 'erro' ? <span style={{ color: 'var(--rd)' }}>✗ erro</span> :
                 d.estado_ocr ?? '—'}
              </td>
              <td className="mono" style={{ textAlign: 'right' }}>{d.confianca_ocr != null ? `${(Number(d.confianca_ocr) * 100).toFixed(0)}%` : '—'}</td>
              <td className="mono" style={{ fontSize: 11 }}>{fdate(d.processado_em ?? d.created_at)}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  )
}
