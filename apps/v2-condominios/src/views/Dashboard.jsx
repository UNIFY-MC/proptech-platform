import { useNavigate } from 'react-router-dom'

const KPIS = [
  { label: 'Mora total',         value: '—',   sub: 'aguarda dados',    accent: 'red' },
  { label: 'Quotas Maio',        value: '—',   sub: 'orcamentos vazio', accent: null },
  { label: 'Faturas OCR pend.',  value: '—',   sub: 'aguarda upload',   accent: null },
  { label: 'OTs em curso',       value: '—',   sub: 'manutencao vazio', accent: null },
  { label: 'kWh EV (Maio)',      value: '—',   sub: 'aguarda leituras', accent: null },
  { label: 'Próximas assemb.',   value: '—',   sub: 'sem agendamento',  accent: null },
]

const AGENTS = [
  { slug: 'orquestrador-condo', name: 'Orquestrador',  role: 'Director ops',        status: 'idle' },
  { slug: 'financeiro-condo',   name: 'Financeiro',    role: 'Quotas + mora',       status: 'idle' },
  { slug: 'manutencao-condo',   name: 'Manutenção',    role: 'OTs + prestadores',   status: 'idle' },
  { slug: 'assembleia-condo',   name: 'Assembleias',   role: 'Convocatórias + atas', status: 'idle' },
  { slug: 'compliance-condo',   name: 'Compliance',    role: 'Prazos legais',       status: 'idle' },
  { slug: 'comunicacao-condo',  name: 'Comunicação',   role: 'Emails + cartas',     status: 'idle' },
  { slug: 'docs-condo',         name: 'Documentos',    role: 'OCR + arquivo',       status: 'idle' },
  { slug: 'energia-condo',      name: 'Energia',       role: 'Contratos + EV',      status: 'idle' },
  { slug: 'seguros-condo',      name: 'Seguros',       role: 'Apólices + sinistros', status: 'idle' },
  { slug: 'atendimento-condo',  name: 'Atendimento',   role: 'Triagem pedidos',     status: 'idle' },
]

export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <div>
      <h1>Dashboard</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: -8, marginBottom: 20 }}>
        Vista geral do condomínio activo. Empty states honestos — só mostra números quando há dados reais.
      </p>

      <div className="kpi-grid">
        {KPIS.map(k => (
          <div key={k.label} className="kpi">
            <div className="kpi-l">{k.label}</div>
            <div className="kpi-v" style={k.accent === 'red' ? { color: 'var(--danger)' } : undefined}>
              {k.value}
            </div>
            <div className="kpi-s">{k.sub}</div>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 28 }}>Agentes condomínio</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: -8, marginBottom: 14 }}>
        Click num agente para abrir o painel de skills e instructions.
      </p>

      <div className="agent-grid">
        {AGENTS.map(a => (
          <div
            key={a.slug}
            className="agent-card"
            onClick={() => navigate(`/agentes/${a.slug}`)}
          >
            <div className="agent-card-head">
              <div className="agent-avatar">{a.name[0]}</div>
              <div style={{ minWidth: 0 }}>
                <div className="agent-card-name">{a.name}</div>
                <div className="agent-card-role">{a.role}</div>
              </div>
            </div>
            <div className={`agent-card-status status-${a.status}`}>{a.status}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
