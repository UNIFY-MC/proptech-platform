import { useState } from 'react'

const TABS = [
  { id: 'visao',         label: 'Visão Geral' },
  { id: 'orc-vs-real',   label: 'Orçamento vs Real' },
  { id: 'orcamento',     label: 'Orçamento' },
  { id: 'orc-fracao',    label: 'Orçamento por Fração' },
  { id: 'extrato',       label: 'Extrato Bancário' },
  { id: 'documentos',    label: 'Documentos' },
]

const RESUMO_ROWS = [
  { label: 'Saldo Bancário Final',         value: '—',   tone: null },
  { label: 'Dividas Condóminos',           value: '—',   tone: 'green' },
  { label: 'Dividas a Fornecedores',       value: '—',   tone: 'red' },
  { label: 'Valores em análise',           value: '—',   tone: 'green' },
  { label: 'Valores a devolver',           value: '—',   tone: 'red' },
]

export default function PrestacaoContas() {
  const [tab, setTab] = useState('visao')

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
        ● Jan – Abr 2026 (em curso)
      </div>

      {/* 4 KPIs principais — estilo legacy */}
      <div className="kpi-grid">
        <div className="kpi kpi-gold">
          <div className="kpi-l">Saldo Bancário Inicial</div>
          <div className="kpi-v">—</div>
          <div className="kpi-s">Saldo a 31 Dez ano anterior</div>
        </div>
        <div className="kpi kpi-green">
          <div className="kpi-l">Receitas</div>
          <div className="kpi-v">—</div>
          <div className="kpi-s">2026 (Jan–Abr)</div>
        </div>
        <div className="kpi kpi-red">
          <div className="kpi-l">Despesas</div>
          <div className="kpi-v">—</div>
          <div className="kpi-s">2026 (Jan–Abr)</div>
        </div>
        <div className="kpi">
          <div className="kpi-l">Saldo Bancário Final</div>
          <div className="kpi-v">—</div>
          <div className="kpi-s">Saldo a hoje</div>
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
        <span className="mono" style={{ fontSize: 14, color: 'var(--gr)' }}>+ —</span>
      </div>

      {/* Resumo financeiro */}
      <div className="rcard">
        <div className="rcard-row" style={{ padding: '10px 18px', borderBottom: '2px solid var(--bd)' }}>
          <span className="rl" style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--mu)' }}>
            Resumo Financeiro
          </span>
          <span className="rv dim" style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            2026 (Jan–Abr)
          </span>
        </div>
        {RESUMO_ROWS.map(r => (
          <div key={r.label} className="rcard-row">
            <span className="rl">{r.label}</span>
            <span
              className="rv"
              style={{
                color: r.tone === 'green' ? 'var(--gr)' : r.tone === 'red' ? 'var(--rd)' : 'var(--tx)',
              }}
            >
              {r.value}
            </span>
          </div>
        ))}
        <div className="rcard-row total">
          <span className="rl">Saldo Financeiro</span>
          <span className="rv">—</span>
        </div>
        <div className="rcard-row" style={{ borderTop: '1px dashed var(--bd)' }}>
          <span className="rl" style={{ color: 'var(--go)' }}>L Fundo Comum de Reserva recebido</span>
          <span className="rv" style={{ color: 'var(--go)' }}>—</span>
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
        Vai consumir <code className="mono">v2_condominios.recebimentos</code> e <code className="mono">faturas_pendentes</code> assim que o import correr.
      </div>
    </div>
  )
}
