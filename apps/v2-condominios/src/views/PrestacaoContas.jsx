import { useState, useEffect } from 'react'
import { v2Client } from '../lib/clients.js'

const TABS = [
  { id: 'visao',         label: 'Visão Geral' },
  { id: 'orc-vs-real',   label: 'Orçamento vs Real' },
  { id: 'orcamento',     label: 'Orçamento' },
  { id: 'orc-fracao',    label: 'Orçamento por Fração' },
  { id: 'extrato',       label: 'Extrato Bancário' },
  { id: 'documentos',    label: 'Documentos' },
]

const YEARS = [2024, 2025, 2026]
const CURRENT_YEAR = new Date().getFullYear()

function eur(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
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
      {/* Year picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--mu)', marginRight: 6 }}>
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

      {error && (
        <div className="error-banner">
          Erro: {error}
          {error.includes('unauthorized') && (
            <div style={{ fontSize: 11, marginTop: 4 }}>
              Esta RPC requer sessão autenticada com papel <code className="mono">staff</code>. Login com utilizador em <code className="mono">core.staff_roles</code>.
            </div>
          )}
        </div>
      )}

      {/* 4 KPIs principais */}
      <div className="kpi-grid">
        <div className="kpi kpi-gold">
          <div className="kpi-l">Saldo Bancário Inicial</div>
          <div className="kpi-v">{kpis ? eur(kpis.saldo_bancario_inicial) : '—'}</div>
          <div className="kpi-s">Saldo a 31 Dez de {ano - 1}</div>
        </div>
        <div className="kpi kpi-green">
          <div className="kpi-l">Receitas</div>
          <div className="kpi-v">{kpis ? eur(kpis.receitas) : '—'}</div>
          <div className="kpi-s">{ano}</div>
        </div>
        <div className="kpi kpi-red">
          <div className="kpi-l">Despesas</div>
          <div className="kpi-v">{kpis ? eur(kpis.despesas) : '—'}</div>
          <div className="kpi-s">{ano}</div>
        </div>
        <div className="kpi">
          <div className="kpi-l">Saldo Bancário Final</div>
          <div className="kpi-v">{kpis ? eur(kpis.saldo_bancario_final) : '—'}</div>
          <div className="kpi-s">Saldo a {ano === CURRENT_YEAR ? 'hoje' : `31 Dez ${ano}`}</div>
        </div>
      </div>

      {/* Resultado do período */}
      <div style={{
        background: 'var(--sf)',
        border: '1px solid var(--bd)',
        borderRadius: 8,
        padding: '12px 18px',
        marginBottom: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Resultado do período</span>
        <span
          className="mono"
          style={{
            fontSize: 14,
            color: kpis && kpis.resultado_periodo >= 0 ? 'var(--gr)' : 'var(--rd)',
          }}
        >
          {kpis
            ? (kpis.resultado_periodo >= 0 ? '+ ' : '') + eur(kpis.resultado_periodo)
            : '—'}
        </span>
      </div>

      {/* Resumo financeiro */}
      <div className="rcard">
        <div className="rcard-row" style={{ padding: '10px 18px', borderBottom: '2px solid var(--bd)' }}>
          <span className="rl" style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--mu)' }}>
            Resumo Financeiro
          </span>
          <span className="rv dim" style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            {ano}
          </span>
        </div>
        <ResumoRow label="Saldo Bancário Final" value={kpis ? eur(kpis.saldo_bancario_final) : '—'} />
        <ResumoRow label="Dívida pendente (mora)" value={kpis ? eur(kpis.mora_total) : '—'} tone={kpis && kpis.mora_total > 0 ? 'red' : null} />
        <ResumoRow label="Fracções em mora" value={kpis ? `${kpis.fracoes_em_mora}` : '—'} />
        <div className="rcard-row total">
          <span className="rl">Saldo Financeiro Líquido</span>
          <span className="rv">{kpis ? eur(kpis.saldo_bancario_final - kpis.mora_total) : '—'}</span>
        </div>
      </div>

      {/* Tabs */}
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

      <TabContent tab={tab} />
    </div>
  )
}

function ResumoRow({ label, value, tone }) {
  return (
    <div className="rcard-row">
      <span className="rl">{label}</span>
      <span
        className="rv"
        style={{
          color: tone === 'green' ? 'var(--gr)' : tone === 'red' ? 'var(--rd)' : 'var(--tx)',
        }}
      >
        {value}
      </span>
    </div>
  )
}

function TabContent({ tab }) {
  const LABEL = {
    'visao':        'Visão Geral',
    'orc-vs-real':  'Orçamento vs Real',
    'orcamento':    'Orçamento',
    'orc-fracao':   'Orçamento por Fração',
    'extrato':      'Extrato Bancário',
    'documentos':   'Documentos',
  }
  return (
    <div className="empty-state">
      <div style={{ fontSize: 13, marginBottom: 4 }}>{LABEL[tab]}</div>
      <div className="dim" style={{ fontSize: 11 }}>
        Por construir — gráficos receitas vs despesas mensais, distribuição por categoria, breakdown anual.
        Vai consumir as views <code className="mono">extrato_com_docs</code> e <code className="mono">mapa_dividas_fornecedores</code>.
      </div>
    </div>
  )
}
