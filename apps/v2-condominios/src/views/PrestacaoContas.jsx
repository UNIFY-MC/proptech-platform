import { useState, useEffect, useMemo } from 'react'
import { v2Client } from '../lib/clients.js'
import { useYear } from '../context/YearContext.jsx'

const TABS = [
  { id: 'visao',         label: 'Visão Geral' },
  { id: 'orc-vs-real',   label: 'Orçamento vs Real' },
  { id: 'orcamento',     label: 'Orçamento' },
  { id: 'orc-fracao',    label: 'Orçamento por Fração' },
  { id: 'extrato',       label: 'Extrato Bancário' },
  { id: 'documentos',    label: 'Documentos' },
]

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
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
  const { year, isGlobal, anoNumero } = useYear()
  // Para Global, fallback ano corrente (KPIs precisam de ano específico)
  const ano = isGlobal ? CURRENT_YEAR : (anoNumero || CURRENT_YEAR)
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
        ● Jan – Dez {ano}
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
        padding: '14px 18px', marginBottom: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 18,
      }}>
        <span className="mono" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--mu)' }}>
          Resultado do período
        </span>
        <span className="mono" style={{
          flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 700,
          color: kpis && kpis.resultado_periodo >= 0 ? 'var(--gr)' : 'var(--rd)',
        }}>
          {kpis ? (kpis.resultado_periodo >= 0 ? '+ ' : '') + eur(kpis.resultado_periodo) : '—'}
        </span>
        <span style={{ width: 130 }}></span>
      </div>

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
          <RRDrill ano={ano} rubrica="Dividas Condominos" label="Dívidas Condóminos" value={(kpis.mora_total > 0 ? '+ ' : '') + eur(kpis.mora_total)} tone={kpis.mora_total > 0 ? 'green' : null} sub={kpis.fracoes_em_mora != null ? `${kpis.fracoes_em_mora} fracções` : null} />
          <RRDrill ano={ano} rubrica="Dividas a Fornecedores" label="Dívidas a Fornecedores" value={(kpis.dividas_fornecedores > 0 ? '- ' : '') + eur(kpis.dividas_fornecedores)} tone={kpis.dividas_fornecedores > 0 ? 'red' : null} />
          {kpis.valores_em_analise != null && kpis.valores_em_analise !== 0 && (
            <RRDrill ano={ano} rubrica="Valores em análise" label="Valores em análise" value={(kpis.valores_em_analise > 0 ? '+ ' : '') + eur(kpis.valores_em_analise)} tone="green" />
          )}
          {kpis.valores_a_devolver != null && kpis.valores_a_devolver !== 0 && (
            <RRDrill ano={ano} rubrica="Valores a devolver" label="Valores a devolver" value={(kpis.valores_a_devolver > 0 ? '- ' : '') + eur(kpis.valores_a_devolver)} tone="red" />
          )}
          <RR label="Fundo Comum de Reserva (10%)" value={eur(kpis.fundo_comum_reserva)} tone="gold" />
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 18px', borderTop: '2px solid var(--bd)', background: 'var(--sf2)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Saldo Financeiro Líquido</span>
            <span className="mono" style={{ fontSize: 14, fontWeight: 700 }}>
              {eur(kpis.saldo_financeiro)}
            </span>
          </div>
        </div>
      )}

      {kpis && kpis.receitas > 0 && (
        <p className="dim" style={{ fontSize: 10, marginBottom: 12, fontStyle: 'italic' }}>
          Valores derivados do extrato bancário ({ano}) via delta de saldo_apos.
          Inclui transferências internas (e.g. EUPAGO → conta). Para excluir, classificar movimentos em <code className="mono">extrato_bancario</code>.
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

function RRDrill({ ano, rubrica, label, value, tone, sub }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || rows !== null) return
    const dataRef = `${ano}-12-31`
    v2Client.from('kpis_detalhe')
      .select('fracao_codigo, nome_descricao, valor')
      .eq('data_referencia', dataRef)
      .eq('rubrica', rubrica)
      .order('valor', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setRows(data || [])
      })
  }, [open, ano, rubrica, rows])

  const color = tone === 'red'   ? 'var(--rd)'
              : tone === 'green' ? 'var(--gr)'
              : 'var(--tx)'
  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 18px', borderBottom: '1px solid var(--bd)',
        cursor: 'pointer',
        background: open ? 'var(--sf2)' : undefined,
      }} onClick={() => setOpen(o => !o)}>
        <div>
          <span style={{ fontSize: 12 }}>
            <span className="dim mono" style={{ fontSize: 9, marginRight: 6 }}>{open ? '▾' : '▸'}</span>
            {label}
          </span>
          {sub && <span className="dim mono" style={{ fontSize: 9, marginLeft: 8 }}>{sub}</span>}
        </div>
        <span className="mono" style={{ fontSize: 13, color }}>{value}</span>
      </div>
      {open && (
        <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--bd)', padding: '6px 18px 10px' }}>
          {error && <div className="error-banner">{error}</div>}
          {rows === null && !error && <div className="dim" style={{ fontSize: 11, padding: 8 }}>A carregar detalhe…</div>}
          {rows && rows.length === 0 && (
            <div className="dim" style={{ fontSize: 11, padding: 8, fontStyle: 'italic' }}>
              Sem detalhe disponível para {ano} (snapshot V2 legacy só tem detalhe 2025).
            </div>
          )}
          {rows && rows.length > 0 && (
            <table style={{ fontSize: 11 }}>
              <thead>
                <tr><th>Fracção / Ref</th><th>Descrição</th><th style={{ textAlign: 'right' }}>Valor</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="mono" style={{ fontSize: 10 }}>{r.fracao_codigo ?? '—'}</td>
                    <td style={{ fontSize: 11 }}>{r.nome_descricao || <span className="dim">—</span>}</td>
                    <td className="mono" style={{ textAlign: 'right', color: Number(r.valor) < 0 ? 'var(--rd)' : 'var(--gr)' }}>
                      {eur(r.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  )
}

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
  const [ext, setExt] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setExt(null); setError(null)
    const i = `${ano}-01-01`, f = `${ano}-12-31`
    v2Client.from('extrato_bancario')
      .select('data_movimento, saldo_apos')
      .gte('data_movimento', i).lte('data_movimento', f)
      .order('data_movimento')
      .limit(5000)
      .then(({ data, error }) => {
        if (!active) return
        if (error) setError(error.message); else setExt(data || [])
      })
    return () => { active = false }
  }, [ano])

  const monthly = useMemo(() => {
    if (!ext) return null
    const m = Array.from({ length: 12 }, () => ({ receitas: 0, despesas: 0 }))
    let prev = 0
    // Para a 1ª iteração precisamos do saldo anterior ao período. Aproximação: primeiro saldo_apos - delta.
    // Simplificação: usar prev=0 para o 1º mov (pode introduzir 1 outlier no Jan, mas é só visualização).
    if (ext.length > 0) prev = Number(ext[0].saldo_apos ?? 0) - 0
    for (let i = 0; i < ext.length; i++) {
      const e = ext[i]
      if (!e.data_movimento) continue
      const sa = Number(e.saldo_apos ?? 0)
      const delta = sa - prev
      const mes = new Date(e.data_movimento).getMonth()
      if (delta > 0) m[mes].receitas += delta
      else if (delta < 0) m[mes].despesas += -delta
      prev = sa
    }
    return m
  }, [ext])

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
      <div style={{ fontSize: 12 }}>Quando a assembleia aprovar um orçamento, aparece aqui.</div>
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

function TabOrcVsReal({ ano }) {
  const [rubricas, setRubricas] = useState(null)
  const [efetivos, setEfetivos] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setRubricas(null); setEfetivos(null); setError(null)
    Promise.all([
      v2Client.from('orcamento_rubricas')
        .select('codigo, rubrica, tipo, valor_total, ordem')
        .eq('ano', ano).order('ordem'),
      v2Client.from('orcamento_efetivo')
        .select('codigo, valor_efetivo, n_movs').eq('ano', ano),
    ]).then(([r, e]) => {
      if (!active) return
      if (r.error || e.error) { setError(r.error?.message || e.error?.message); return }
      setRubricas(r.data || [])
      setEfetivos(e.data || [])
    })
    return () => { active = false }
  }, [ano])

  const efetivoMap = useMemo(() => {
    const m = {}
    for (const e of efetivos || []) m[e.codigo] = e
    // alias R001+R002 → R001 (Excel só usa R001)
    if (m['R001'] && !m['R001+R002']) m['R001+R002'] = m['R001']
    return m
  }, [efetivos])

  if (error) return <div className="error-banner">Erro: {error}</div>
  if (rubricas === null || efetivos === null) return <div className="dim">A carregar…</div>

  const despesas = rubricas.filter(r => r.tipo === 'despesa' || r.tipo === 'fcr')
  const receitas = rubricas.filter(r => r.tipo === 'receita')

  return (
    <div>
      <SecaoOrcReal ano={ano} titulo={`DESPESAS — ORÇAMENTO VS EFETIVO`} rows={despesas} efetivoMap={efetivoMap} sinal={-1} />
      <div style={{ height: 22 }} />
      <SecaoOrcReal ano={ano} titulo={`RECEITAS — ORÇAMENTO VS EFETIVO`} rows={receitas} efetivoMap={efetivoMap} sinal={+1} />
    </div>
  )
}

function SecaoOrcReal({ ano, titulo, rows, efetivoMap, sinal }) {
  const totals = rows.reduce((acc, r) => {
    const orc = Number(r.valor_total ?? 0)
    const ef = Number(efetivoMap[r.codigo]?.valor_efetivo ?? 0)
    acc.orc += orc; acc.ef += ef
    return acc
  }, { orc: 0, ef: 0 })

  return (
    <div style={{ background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{
        padding: '10px 18px', borderBottom: '2px solid var(--bd)', background: 'var(--sf2)',
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      }}>
        <span className="mono" style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, color: 'var(--mu)' }}>
          {titulo}
        </span>
        <span className="mono dim" style={{ fontSize: 9, letterSpacing: 1 }}>{ano}</span>
      </div>
      <table style={{ width: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: '38%' }}>Rúbrica</th>
            <th style={{ textAlign: 'right' }}>Orçamentado</th>
            <th style={{ textAlign: 'right' }}>Efetivo</th>
            <th style={{ textAlign: 'right' }}>Desvio</th>
            <th style={{ textAlign: 'right', width: 110 }}>Execução</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <LinhaOrcReal key={r.codigo} ano={ano} rubrica={r} efetivo={efetivoMap[r.codigo]} />
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: 'var(--sf2)', fontWeight: 700 }}>
            <td style={{ paddingLeft: 18 }}>Total {sinal < 0 ? 'Despesas' : 'Receitas'}</td>
            <td className="mono" style={{ textAlign: 'right' }}>{eur(totals.orc)}</td>
            <td className="mono" style={{ textAlign: 'right' }}>{eur(totals.ef)}</td>
            <td className="mono" style={{ textAlign: 'right', color: (totals.ef - totals.orc) >= 0 ? (sinal > 0 ? 'var(--gr)' : 'var(--rd)') : (sinal > 0 ? 'var(--rd)' : 'var(--gr)') }}>
              {(totals.ef - totals.orc) >= 0 ? '+' : ''}{eur(totals.ef - totals.orc)}
            </td>
            <td className="mono" style={{ textAlign: 'right', paddingRight: 18 }}>
              {totals.orc > 0 ? `${Math.round((totals.ef/totals.orc)*100)}%` : '—'}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function LinhaOrcReal({ ano, rubrica, efetivo }) {
  const [open, setOpen] = useState(false)
  const [movs, setMovs] = useState(null)
  const [errMov, setErrMov] = useState(null)
  const orc = Number(rubrica.valor_total ?? 0)
  const ef = Number(efetivo?.valor_efetivo ?? 0)
  const desvio = ef - orc
  const pct = orc > 0 ? Math.round((ef / orc) * 100) : null

  useEffect(() => {
    if (!open || movs !== null) return
    const i = `${ano}-01-01`, f = `${ano}-12-31`
    v2Client.from('extrato_bancario')
      .select('data_movimento, descricao, valor, saldo_apos, referencia_banco')
      .gte('data_movimento', i).lte('data_movimento', f)
      .order('data_movimento')
      .limit(500)
      .then(({ data, error }) => {
        if (error) setErrMov(error.message)
        else {
          const key = rubrica.codigo.toLowerCase()
          const filtered = (data || []).filter(m => {
            const desc = (m.descricao || '').toLowerCase()
            return desc.includes(key) ||
              (key === '2a006' && desc.includes('easyfresh')) ||
              (key === '2a001' && desc.includes('lithoesp')) ||
              (key === '2a007' && (desc.includes('manuten') || desc.includes('ferrovial'))) ||
              (key === '2a015' && desc.includes('zurich'))
          })
          setMovs(filtered)
        }
      })
  }, [open, ano, rubrica.codigo, movs])

  const desvioColor = desvio === 0 ? 'var(--mu)' : (desvio > 0 ? 'var(--rd)' : 'var(--gr)')
  const execPct = pct != null ? pct : 0
  const execColor = pct == null ? 'var(--mu)' : (pct <= 100 ? 'var(--gr)' : 'var(--rd)')

  return (
    <>
      <tr style={{ cursor: 'pointer', background: open ? 'var(--sf2)' : undefined }} onClick={() => setOpen(o => !o)}>
        <td style={{ paddingLeft: 18 }}>
          <span className="mono dim" style={{ fontSize: 9, marginRight: 6 }}>{open ? '▾' : '▸'}</span>
          <span className="mono" style={{ fontSize: 10, color: 'var(--mu)', marginRight: 8 }}>{rubrica.codigo}</span>
          <span style={{ fontSize: 12 }}>{rubrica.rubrica}</span>
        </td>
        <td className="mono" style={{ textAlign: 'right' }}>{orc > 0 ? eur(orc) : '—'}</td>
        <td className="mono" style={{ textAlign: 'right' }}>{ef > 0 ? eur(ef) : '—'}</td>
        <td className="mono" style={{ textAlign: 'right', color: desvioColor }}>
          {desvio === 0 ? '0,00 €' : (desvio > 0 ? '+' : '') + eur(desvio)}
        </td>
        <td className="mono" style={{ textAlign: 'right', paddingRight: 18, color: execColor }}>
          {pct == null ? '—' : `${pct}%`}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} style={{ background: 'var(--bg)', padding: '8px 24px' }}>
            {errMov && <div className="error-banner">{errMov}</div>}
            {movs === null && !errMov && <div className="dim" style={{ fontSize: 11 }}>A carregar movimentos…</div>}
            {movs && movs.length === 0 && (
              <div className="dim" style={{ fontSize: 11, fontStyle: 'italic' }}>
                Sem movimentos no extrato bancário associados a {rubrica.codigo}.
                {efetivo?.n_movs > 0 && ` Efetivo ${efetivo.n_movs} movs vem dos extratos categorizados (Excel).`}
              </div>
            )}
            {movs && movs.length > 0 && (
              <table style={{ fontSize: 11 }}>
                <thead><tr><th>Data</th><th>Descrição</th><th>Ref</th><th style={{ textAlign: 'right' }}>Valor</th></tr></thead>
                <tbody>
                  {movs.slice(0, 30).map((m, i) => (
                    <tr key={i}>
                      <td className="mono" style={{ fontSize: 10 }}>{fdate(m.data_movimento)}</td>
                      <td style={{ fontSize: 11 }}>{m.descricao}</td>
                      <td className="mono" style={{ fontSize: 9, color: 'var(--mu)' }}>{m.referencia_banco ?? '—'}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{eur(m.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

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
        Quota anual = orçamento × permilagem / 1000. Mensal = anual / 12.
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

function TabExtrato({ ano }) {
  const [movs, setMovs] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('todos')
  useEffect(() => {
    let active = true
    setMovs(null); setError(null)
    const i = `${ano}-01-01`, f = `${ano}-12-31`
    v2Client.from('extrato_bancario')
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
    if (filter === 'nao_rec') return movs.filter(m => !m.reconciliado)
    return movs
  }, [movs, filter])
  const stats = useMemo(() => {
    if (!visible) return null
    const naoRec = visible.filter(m => !m.reconciliado).length
    return { naoRec, total: visible.reduce((a, m) => a + Number(m.valor ?? 0), 0) }
  }, [visible])
  if (error) return <div className="error-banner">Erro: {error}</div>
  if (movs === null) return <div className="dim">A carregar…</div>
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {[['todos','TODOS'],['nao_rec','NÃO RECONCILIADO']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            padding: '5px 12px',
            background: filter === k ? 'var(--sf2)' : 'transparent',
            border: '1px solid ' + (filter === k ? 'var(--go)' : 'var(--bd)'),
            color: filter === k ? 'var(--tx)' : 'var(--mu)',
            borderRadius: 5, fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: 0.5,
            cursor: 'pointer',
          }}>{l}</button>
        ))}
        {stats && (
          <span className="mono dim" style={{ marginLeft: 'auto', fontSize: 10 }}>
            {visible.length} mov · soma {eur0(stats.total)} · {stats.naoRec} não reconciliados
          </span>
        )}
      </div>
      {visible.length === 0 && <div className="empty-state">Sem movimentos.</div>}
      {visible.length > 0 && (
        <table>
          <thead><tr><th>Data</th><th>Descrição</th><th>Ref.</th><th style={{ textAlign: 'right' }}>Valor</th><th style={{ textAlign: 'right' }}>Saldo</th><th>Recon.</th></tr></thead>
          <tbody>{visible.map(m => (
            <tr key={m.id}>
              <td className="mono" style={{ fontSize: 11 }}>{fdate(m.data_movimento)}</td>
              <td style={{ fontSize: 12 }}>{m.descricao ?? '—'}</td>
              <td className="mono" style={{ fontSize: 10, color: 'var(--mu)' }}>{m.referencia_banco ?? '—'}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{eur(m.valor)}</td>
              <td className="mono" style={{ textAlign: 'right', fontSize: 11 }}>{eur(m.saldo_apos)}</td>
              <td className="mono" style={{ fontSize: 11 }}>{m.reconciliado ? <span style={{ color: 'var(--gr)' }}>✓</span> : <span className="dim">○</span>}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  )
}

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
      {docs && docs.length === 0 && <div className="empty-state">Sem documentos em {ano}.</div>}
      {docs && docs.length > 0 && (
        <table>
          <thead><tr><th>Tipo</th><th>Título</th><th>Ficheiro</th><th>OCR</th><th style={{ textAlign: 'right' }}>Conf.</th><th>Data</th></tr></thead>
          <tbody>{docs.map(d => (
            <tr key={d.id}>
              <td><span className="b b-blue">{d.tipo ?? '—'}</span></td>
              <td style={{ fontSize: 12 }}>{d.titulo ?? '—'}</td>
              <td className="mono" style={{ fontSize: 10, color: 'var(--mu)' }}>{d.filename_original ?? '—'}</td>
              <td className="mono" style={{ fontSize: 11 }}>
                {d.estado_ocr === 'ok' ? <span style={{ color: 'var(--gr)' }}>✓ ok</span> :
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
