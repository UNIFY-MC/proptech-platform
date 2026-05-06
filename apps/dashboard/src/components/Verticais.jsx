import { useState } from 'react'
import { Card } from './shared/Card.jsx'
import { Badge } from './shared/Badge.jsx'

// Cook.ai-inspired workspace per vertical
// Truth Engine + Employees + Recipes + Context per vertical

const V_DATA = {
  V2: {
    id: 'V2', label: 'Condomínios', icon: '🏢', status: 'live', statusLabel: 'Produção viva',
    accent: '#2d6a4f',
    desc: 'Gestão de condomínios com IA · prataowners.pt · ~5k linhas dados reais',
    kpis: [
      { label: 'Edifícios', value: '3', sub: 'activos' },
      { label: 'Condóminos', value: '47', sub: 'registados' },
      { label: 'Faturas pend.', value: '€12.4k', sub: 'a cobrar' },
      { label: 'Cobrança', value: '94%', sub: 'vs mês ant.' },
    ],
    truth: {
      tam: '€180M/ano — Portugal',
      icpPain: 'Gestores gastam 6h/semana em admin repetitivo — avisos de mora, extractos, reconciliações',
      icpProfile: 'Síndico profissional ou owner-gestor, 35-60 anos, PT, gere 2-15 edifícios',
      competitors: [
        { name: 'Smartimo', note: 'Mais completo mas complexo, sem IA nativa' },
        { name: 'Condo Control', note: 'Canadá, sem foco PT, sem contabilidade TOC' },
        { name: 'Excel + email', note: '70% do mercado ainda usa este "stack"' },
      ],
      moat: 'Único com IA + contabilidade TOC + dados reais para treino · integração Drive nativa',
      offer: 'SaaS €49-149/mês por edifício · eventual MRR target: €15k',
    },
    schema: { status: 'live', tables: 16, db: 'eozklslwfaqujaijvdnl', note: '30 tabelas, ~5k linhas prod.' },
    recipes: [
      { id: 'digest', name: 'Digest Semanal', freq: 'Seg 09h00', agent: 'financeiro-condo', icon: '📊', desc: 'KPIs + cobranças em atraso + alertas por edifício', status: 'ready' },
      { id: 'mora', name: 'Avisos de Mora', freq: 'Sáb 10h00', agent: 'financeiro-condo', icon: '📬', desc: 'Geração automática de cartas para condóminos em atraso', status: 'ready' },
      { id: 'ocr', name: 'Importar Extracto', freq: 'Trigger: upload PDF', agent: 'importador-v2', icon: '🏦', desc: 'OCR → reconciliação automática → match com faturas', status: 'ready' },
      { id: 'mkt', name: 'Digest Marketing', freq: 'Seg 08h00', agent: 'diretor-marketing', icon: '📣', desc: 'KPIs campanha + sugestão semanal baseada em benchmarks', status: 'draft' },
    ],
    employees: ['financeiro-condo', 'importador-v2', 'diretor-marketing', 'criativo-conteudo', 'gestor-ads', 'publisher-social', 'gestor-leads'],
    mission: 'Activar financeiro-condo em piloto com Property 007 LDA · gate: 1 digest enviado sem erros',
  },
  V3: {
    id: 'V3', label: 'Seguros', icon: '🛡️', status: 'building', statusLabel: 'A construir',
    accent: '#1a5296',
    desc: 'Corretagem de seguros para proprietários e condomínios · cross-sell V2',
    kpis: [
      { label: 'Apólices', value: '—', sub: 'ainda 0' },
      { label: 'Prémio total', value: '—', sub: 'ainda 0' },
      { label: 'Leads V2', value: '47', sub: 'potenciais' },
      { label: 'MRR target', value: '€8k', sub: 'ano 1' },
    ],
    truth: {
      tam: '€2.1B/ano — mercado seguros PT (multi-riscos predial)',
      icpPain: 'Owners PT renovam apólices manualmente, sem comparação, pagam 20-40% acima do melhor preço disponível',
      icpProfile: 'Proprietário de 1-3 imóveis, 40-65 anos, já usa V2 ou indicado por gestor de condomínio',
      competitors: [
        { name: 'Tranquilidade / Fidelidade', note: 'Dominam mercado mas zero IA, processo 100% manual' },
        { name: 'ComparaJá / Mutuaseguros', note: 'Agregadores sem dados prediais integrados' },
        { name: 'Mediadores independentes', note: '65% do mercado, relação pessoal mas sem tech' },
      ],
      moat: 'Acesso directo a dados do condomínio (fracções, áreas, histórico sinistros) — nenhum broker tem isso',
      offer: 'Comissão 8-12% do prémio · simulação gratuita · proposta em <2min',
    },
    schema: { status: 'applied', tables: 4, db: 'hkmvszkpxjbxmnixzqbl', note: 'v3_seguros aplicado em V1 Core Hub · 2026-05-05' },
    recipes: [
      { id: 'sim', name: 'Simulação Apólice', freq: 'On demand', agent: 'seguros-agent', icon: '🔍', desc: 'Compara ofertas disponíveis por tipologia e área de fracção', status: 'draft' },
      { id: 'renov', name: 'Alerta Renovação', freq: 'D-30 expiração', agent: 'seguros-agent', icon: '⏰', desc: 'Notificação automática + proposta de renovação/switch', status: 'draft' },
      { id: 'cross', name: 'Cross-sell V2→V3', freq: 'Trigger: novo condómino', agent: 'gestor-leads', icon: '🎯', desc: 'Qualifica lead V2 para seguro · score automático', status: 'draft' },
    ],
    employees: ['gestor-leads'],
    mission: 'Schema v3_seguros aplicado · próximo: UI simulador + employee seguros-agent',
  },
  V4: {
    id: 'V4', label: 'Energia', icon: '⚡', status: 'next', statusLabel: 'Próxima vertical',
    accent: '#8c6508',
    desc: 'Mudança de comercializador + contratos + monitoring · focus proprietários multi-fracção',
    kpis: [
      { label: 'Contratos', value: '—', sub: 'ainda 0' },
      { label: 'Poupança média', value: '—', sub: 'alvo: 18%' },
      { label: 'Leads potenciais', value: '47', sub: 'clientes V2' },
      { label: 'MRR target', value: '€12k', sub: 'ano 1' },
    ],
    truth: {
      tam: '€8.4B/ano — mercado energia PT · ERSE liberalizado',
      icpPain: 'PME e particulares pagam 15-30% acima do melhor preço por inércia — mudar de comercializador demora semanas e é burocrático',
      icpProfile: 'Proprietário de imóveis ou gestor de condomínio, 35-60 anos, gere 2+ contratos de energia',
      competitors: [
        { name: 'Spock.es', note: 'Líder ES, a expandir PT · comparador + automatização' },
        { name: 'EDP / Galp / Iberdrola', note: 'Grandes players, zero personalização, comerciais agressivos' },
        { name: 'Poupança no Lar', note: 'Portugal, manual, sem IA, sem integração condomínio' },
      ],
      moat: 'Integração V2 (dados consumo por edifício) + TOC para facturação + mudança automática ERSE',
      offer: 'Comissão do comercializador + fee gestão €5-15/contrato/mês',
    },
    schema: { status: 'applied', tables: 6, db: 'hkmvszkpxjbxmnixzqbl', note: 'v4_energia aplicado em V1 Core Hub · 2026-05-05' },
    recipes: [
      { id: 'sim', name: 'Simulador Tarifário', freq: 'On demand', agent: 'energia-agent', icon: '🔋', desc: 'Compara ofertas por consumo histórico e tipologia de contrato', status: 'draft' },
      { id: 'mud', name: 'Formulário Mudança', freq: 'On demand', agent: 'energia-agent', icon: '📋', desc: 'Submissão ERSE automática de pedido de mudança de comercializador', status: 'draft' },
      { id: 'mon', name: 'Monitoring Mensal', freq: 'D1 do mês', agent: 'energia-agent', icon: '📈', desc: 'Revisão contratos · alerta se melhor oferta disponível', status: 'draft' },
    ],
    employees: [],
    mission: 'Schema aplicado · próximo: scaffold apps/v4-energia/ + simulador tarifário (consultar Notion 34284147-fa60-81f3)',
  },
  V5: {
    id: 'V5', label: 'Manutenção', icon: '🔧', status: 'sprint', statusLabel: 'Sprint 1D activo',
    accent: '#6b4fa0',
    desc: 'Recibos digitais + network owner↔prestador · Trojan Horse para penetrar mercado',
    kpis: [
      { label: 'Prestadores', value: '—', sub: 'alvo: 10 piloto' },
      { label: 'Recibos emitidos', value: '—', sub: 'ainda 0' },
      { label: 'OTs activas', value: '—', sub: 'ainda 0' },
      { label: 'Gate D7', value: '2026-05-07', sub: '2 dias' },
    ],
    truth: {
      tam: '€1.2B/ano — manutenção predial PT (canalizadores, electricistas, pintores)',
      icpPain: 'Prestadores emitem recibos verdes manualmente (AT.gov), owners não têm histórico digital dos serviços feitos',
      icpProfile: 'Owner 40-65 anos PT que já gere 1+ imóvel, quer guardar comprovativo digital sem esforço',
      competitors: [
        { name: 'GetNinjas / Habitissimo', note: 'Marketplace de serviços, zero gestão de documentos' },
        { name: 'FixBoss', note: 'Ordens de trabalho básicas, sem recibos, sem IA' },
        { name: 'WhatsApp + PDF manual', note: '90% dos prestadores portugueses usam isto hoje' },
      ],
      moat: 'Trojan Horse: owner convida prestador via link → recibo digital grátis → ficam ambos na plataforma',
      offer: 'Freemium recibos · premium €9/mês prestador profissional · comissão em marketplace',
    },
    schema: { status: 'sprint', tables: 3, db: 'hkmvszkpxjbxmnixzqbl', note: 'magic_links + prestadores_parceiros + recibos_servico · Sprint 1D' },
    recipes: [
      { id: 'link', name: 'Convite Prestador', freq: 'Trigger: OT criada', agent: 'ops-v5', icon: '🔗', desc: 'Gera link mágico e envia SMS/email ao prestador', status: 'building' },
      { id: 'recibo', name: 'Recibo Digital', freq: 'Trigger: serviço concluído', agent: 'ops-v5', icon: '🧾', desc: 'Gera recibo AT-válido, assina, envia ao owner', status: 'building' },
      { id: 'rating', name: 'Avaliação Automática', freq: 'Trigger: 24h após recibo', agent: 'ops-v5', icon: '⭐', desc: 'Pede rating ao owner · actualiza score prestador', status: 'draft' },
    ],
    employees: [],
    mission: 'Gate D7 (2026-05-07): ≥1 owner externo aceitou convite · flow funciona no telefone',
  },
}

const FUTURE = {
  V6: { label: 'Reabilitação', icon: '🏗️', accent: '#8b1a1a', note: 'Futura — obras e reabilitação predial' },
  V7: { label: 'Real Estate', icon: '🏠', accent: '#1a5296', note: 'Futura — compra, venda, mediação imobiliária' },
  V8: { label: 'Rentals', icon: '🔑', accent: '#2d6a4f', note: 'Futura — gestão de arrendamentos e contratos' },
}

const STATUS_BADGE = {
  live:     { label: 'Produção', cls: 'production' },
  building: { label: 'A construir', cls: 'active' },
  next:     { label: 'Próxima', cls: 'info' },
  sprint:   { label: 'Sprint activo', cls: 'warning' },
  future:   { label: 'Futura', cls: 'idle' },
}

const RECIPE_STATUS = {
  ready:    { label: 'Activo', color: 'var(--success)' },
  building: { label: 'Em construção', color: 'var(--warning)' },
  draft:    { label: 'Draft', color: 'var(--text-dim)' },
}

function KpiRow({ kpis, accent }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
      {kpis.map(k => (
        <div key={k.label} style={{
          background: 'var(--bg-elevated)',
          borderRadius: 6,
          padding: '10px 12px',
          borderLeft: `3px solid ${accent}`,
        }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
            {k.label}
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text)' }}>
            {k.value}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{k.sub}</div>
        </div>
      ))}
    </div>
  )
}

function TruthEngine({ truth, accent }) {
  return (
    <Card title="Truth Engine — Inteligência de Mercado">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <TruthRow label="TAM" value={truth.tam} accent={accent} />
        <TruthRow label="Dor do ICP" value={truth.icpPain} accent={accent} />
        <TruthRow label="Perfil ICP" value={truth.icpProfile} accent={accent} />

        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Competidores
          </div>
          {truth.competitors.map(c => (
            <div key={c.name} style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              padding: '6px 0',
              borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontWeight: 600, fontSize: '0.8rem', minWidth: 130, color: 'var(--text)' }}>{c.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{c.note}</span>
            </div>
          ))}
        </div>

        <TruthRow label="Moat / Diferenciação" value={truth.moat} accent={accent} bold />
        <TruthRow label="Modelo de Receita" value={truth.offer} accent={accent} />
      </div>
    </Card>
  )
}

function TruthRow({ label, value, accent, bold }) {
  return (
    <div>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: '0.8rem', color: bold ? accent : 'var(--text)', fontWeight: bold ? 600 : 400, lineHeight: 1.5 }}>
        {value}
      </div>
    </div>
  )
}

function RecipeCard({ recipe }) {
  const [triggered, setTriggered] = useState(false)
  const rs = RECIPE_STATUS[recipe.status] || RECIPE_STATUS.draft

  function handleTrigger() {
    setTriggered(true)
    setTimeout(() => setTriggered(false), 3000)
  }

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      borderRadius: 8,
      padding: '12px 14px',
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: '1.4rem', lineHeight: 1, marginTop: 2 }}>{recipe.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>{recipe.name}</span>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: rs.color, flexShrink: 0 }} />
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 4, lineHeight: 1.4 }}>{recipe.desc}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: 'var(--text-dim)', background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>
            {recipe.freq}
          </span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>→ {recipe.agent}</span>
        </div>
      </div>
      <button
        onClick={handleTrigger}
        disabled={recipe.status === 'draft' || triggered}
        style={{
          flexShrink: 0,
          padding: '4px 10px',
          fontSize: '0.7rem',
          fontWeight: 600,
          border: 'none',
          borderRadius: 4,
          cursor: recipe.status === 'draft' ? 'not-allowed' : 'pointer',
          background: triggered ? 'var(--success)' : recipe.status === 'draft' ? 'var(--bg)' : 'var(--info)',
          color: triggered ? '#fff' : recipe.status === 'draft' ? 'var(--text-dim)' : '#fff',
          opacity: recipe.status === 'draft' ? 0.6 : 1,
          transition: 'all 0.2s',
          whiteSpace: 'nowrap',
        }}
      >
        {triggered ? '✓ Enviado' : recipe.status === 'draft' ? 'Draft' : '▶ Run'}
      </button>
    </div>
  )
}

function EmployeeList({ employees, agents }) {
  const matched = employees.map(empId => {
    const found = agents.find(a => a.id === empId || a.name?.toLowerCase().includes(empId.split('-')[0]))
    return found ? { ...found, empId } : { empId, name: empId, state: 'never', task: null }
  })

  if (matched.length === 0) {
    return (
      <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic', padding: '8px 0' }}>
        Nenhum employee atribuído a esta vertical ainda.
      </div>
    )
  }

  const stateColor = { idle: 'var(--success)', stale: 'var(--warning)', never: 'var(--text-dim)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {matched.map(emp => (
        <div key={emp.empId} style={{
          display: 'flex', gap: 10, alignItems: 'center',
          padding: '8px 10px',
          background: 'var(--bg-elevated)',
          borderRadius: 6,
          border: '1px solid var(--border)',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: stateColor[emp.state] || 'var(--text-dim)',
            flexShrink: 0,
          }} />
          <span style={{ fontWeight: 600, fontSize: '0.8rem', minWidth: 160, color: 'var(--text)' }}>
            {emp.name || emp.empId}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', flex: 1 }}>
            {emp.task ? emp.task.substring(0, 70) + (emp.task.length > 70 ? '…' : '') : 'Aguarda primeira tarefa'}
          </span>
        </div>
      ))}
    </div>
  )
}

function SchemaStatus({ schema }) {
  const colors = { live: 'var(--success)', applied: 'var(--info)', sprint: 'var(--warning)', planned: 'var(--text-dim)' }
  const labels = { live: 'Live Produção', applied: 'Aplicado', sprint: 'Em sprint', planned: 'Planeado' }
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[schema.status] || 'var(--text-dim)' }} />
      <div>
        <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text)', marginRight: 8 }}>
          {labels[schema.status] || schema.status}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{schema.tables} tabelas · {schema.db.substring(0, 8)}…</span>
      </div>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginLeft: 'auto', fontStyle: 'italic' }}>{schema.note}</span>
    </div>
  )
}

function FutureVertical({ id, info }) {
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      borderRadius: 10,
      padding: '20px 24px',
      textAlign: 'center',
      border: '2px dashed var(--border)',
      opacity: 0.7,
    }}>
      <div style={{ fontSize: '2rem', marginBottom: 8 }}>{info.icon}</div>
      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: 4 }}>{id} — {info.label}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{info.note}</div>
      <div style={{
        marginTop: 12, display: 'inline-block', padding: '3px 10px',
        background: 'var(--bg)', borderRadius: 20, fontSize: '0.65rem',
        color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        Roadmap Futuro
      </div>
    </div>
  )
}

export default function Verticais({ data }) {
  const { agents = [] } = data
  const [activeV, setActiveV] = useState('V2')

  const isFuture = Object.keys(FUTURE).includes(activeV)
  const vd = V_DATA[activeV]

  return (
    <div>
      {/* Vertical selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {Object.values(V_DATA).map(v => {
          const sb = STATUS_BADGE[v.status]
          return (
            <button
              key={v.id}
              onClick={() => setActiveV(v.id)}
              style={{
                display: 'flex', gap: 8, alignItems: 'center',
                padding: '8px 16px',
                border: activeV === v.id ? `2px solid ${v.accent}` : '2px solid var(--border)',
                borderRadius: 8,
                background: activeV === v.id ? v.accent + '18' : 'var(--bg-elevated)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '1rem' }}>{v.icon}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: activeV === v.id ? v.accent : 'var(--text)' }}>
                  {v.id} {v.label}
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>{v.statusLabel}</div>
              </div>
            </button>
          )
        })}
        {/* Future verticals */}
        {Object.entries(FUTURE).map(([id, info]) => (
          <button
            key={id}
            onClick={() => setActiveV(id)}
            style={{
              display: 'flex', gap: 8, alignItems: 'center',
              padding: '8px 16px',
              border: activeV === id ? `2px solid ${info.accent}` : '2px dashed var(--border)',
              borderRadius: 8,
              background: 'var(--bg-elevated)',
              cursor: 'pointer',
              opacity: 0.6,
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: '1rem' }}>{info.icon}</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)' }}>
                {id} {info.label}
              </div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>Futura</div>
            </div>
          </button>
        ))}
      </div>

      {/* Future vertical placeholder */}
      {isFuture && (
        <div style={{ maxWidth: 400, margin: '40px auto' }}>
          <FutureVertical id={activeV} info={FUTURE[activeV]} />
        </div>
      )}

      {/* Active vertical workspace */}
      {!isFuture && vd && (
        <>
          {/* Header */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: '1.8rem' }}>{vd.icon}</span>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>
                {vd.id} — {vd.label}
                <span style={{
                  marginLeft: 10, padding: '2px 8px', borderRadius: 20,
                  fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                  background: vd.accent + '22', color: vd.accent,
                }}>
                  {vd.statusLabel}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 2 }}>{vd.desc}</div>
            </div>
          </div>

          {/* KPIs */}
          <KpiRow kpis={vd.kpis} accent={vd.accent} />

          {/* Main 2-col layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
            {/* Left: Truth Engine */}
            <TruthEngine truth={vd.truth} accent={vd.accent} />

            {/* Right: Employees + Recipes + Schema */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* AI Employees */}
              <Card title={`Equipa IA · ${vd.employees.length} atribuído${vd.employees.length !== 1 ? 's' : ''}`}>
                <EmployeeList employees={vd.employees} agents={agents} />
              </Card>

              {/* Recipes */}
              <Card title="Receitas">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {vd.recipes.map(r => (
                    <RecipeCard key={r.id} recipe={r} />
                  ))}
                </div>
              </Card>

              {/* Schema status */}
              <Card title="Schema Supabase">
                <SchemaStatus schema={vd.schema} />
              </Card>

              {/* Current mission */}
              <Card title="Missão Actual">
                <div style={{
                  padding: '10px 12px',
                  background: vd.accent + '14',
                  borderRadius: 6,
                  borderLeft: `3px solid ${vd.accent}`,
                  fontSize: '0.82rem',
                  color: 'var(--text)',
                  lineHeight: 1.5,
                }}>
                  {vd.mission}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
