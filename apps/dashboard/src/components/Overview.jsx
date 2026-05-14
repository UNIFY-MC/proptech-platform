import { useState } from 'react'
import {
  Users, CreditCard, FileText, UserPlus, Target, CheckSquare,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { Card } from './shared/Card.jsx'
import { Badge } from './shared/Badge.jsx'
import KPI from './shared/KPI.jsx'
import { SprintProgress } from './shared/SprintProgress.jsx'
import { SourceTag } from './shared/SourceTag.jsx'
import { DrawerSection } from './Drawer.jsx'
import { useDrawer } from '../context/DrawerContext.jsx'
import { useHomeKPIs } from '../hooks/useHomeKPIs.js'

function statusToBadge(status) {
  const map = {
    'Production': 'production',
    'Active': 'active',
    'active': 'active',
    'Foundation': 'foundation',
    'Planned': 'planned',
    'planned': 'planned',
    'done': 'success',
  }
  return map[status] || 'idle'
}

function priorityClass(p) {
  const map = { P0: 'priority-p0', P1: 'priority-p1', P2: 'priority-p2' }
  return map[p] || 'priority-p2'
}

function healthColor(usage) {
  if (usage >= 80) return 'var(--danger)'
  if (usage >= 60) return 'var(--warning)'
  return 'var(--success)'
}

function fmtNumber(n) {
  if (n === null || n === undefined) return '—'
  if (typeof n !== 'number') return String(n)
  return n.toLocaleString('pt-PT')
}

function fmtEUR(n) {
  if (n === null || n === undefined) return '—'
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

// Cor da vertical conforme status (heatmap)
function verticalAccent(status) {
  const s = (status || '').toLowerCase()
  if (s === 'production') return '#10b981'
  if (s === 'active') return '#3b82f6'
  if (s === 'foundation') return '#f59e0b'
  return '#6b7280'
}

export default function Overview({ data }) {
  const { sprint, verticals = [], alerts = [], nextActions = [], techStack = [], stackHealth = [], decisions = [] } = data
  const { openDrawer } = useDrawer()
  const { kpis, loading: kpisLoading } = useHomeKPIs()
  const [opsOpen, setOpsOpen] = useState(false)

  const sprintMissing = sprint?._status === 'missing' || sprint?._status === 'error'
  const topVerticals = verticals.slice(0, 10)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '16px 20px 80px' }}>

      {/* KPI Hero Grid — 6 cards live */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
      }}>
        <KPI
          label="Clientes"
          icon={Users}
          accent="#10b981"
          value={fmtNumber(kpis.pessoas)}
          sub={kpis.pessoas ? `${kpis.pessoas} pessoas em core.pessoas` : 'A sincronizar…'}
          loading={kpisLoading && kpis.pessoas === null}
        />
        <KPI
          label="Subscrições activas"
          icon={CreditCard}
          accent="#3b82f6"
          value={fmtNumber(kpis.subscricoesActivas)}
          sub="MRR a calcular em sprint B.2"
          loading={kpisLoading && kpis.subscricoesActivas === null}
        />
        <KPI
          label="Faturas pendentes"
          icon={FileText}
          accent="#f59e0b"
          value={fmtNumber(kpis.faturasPendentes)}
          sub={kpis.faturasPendentesEUR ? fmtEUR(kpis.faturasPendentesEUR) + ' em aberto' : '—'}
          loading={kpisLoading && kpis.faturasPendentes === null}
        />
        <KPI
          label="Leads (30d)"
          icon={UserPlus}
          accent="#8b5cf6"
          value={fmtNumber(kpis.leadsMes)}
          sub="growth.leads · todas verticais"
          loading={kpisLoading && kpis.leadsMes === null}
          to="/growth/leads"
        />
        <KPI
          label="Pipeline EUR"
          icon={Target}
          accent="#ec4899"
          value={fmtEUR(kpis.oportunidadesPipelineEUR)}
          sub="oportunidades abertas"
          loading={kpisLoading && kpis.oportunidadesPipelineEUR === null}
          to="/growth/oportunidades"
        />
        <KPI
          label="Aprovações"
          icon={CheckSquare}
          accent="#ef4444"
          value={fmtNumber(kpis.approvalsPendentes)}
          sub="pendentes humano"
          loading={kpisLoading && kpis.approvalsPendentes === null}
          to="/approvals"
        />
      </div>

      {/* Sprint Hero */}
      <Card>
        {sprintMissing ? (
          <div style={{ padding: 20, border: '1px solid var(--danger)', borderRadius: 8, color: 'var(--danger)' }}>
            ⚠ Sprint state indisponível<br/>
            <small style={{ fontFamily: 'monospace', opacity: 0.7 }}>{sprint?._error}</small>
            <SourceTag source={sprint?._source} status="missing" />
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{sprint?.wave}</span>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>— {sprint?.name}</span>
              <Badge level={sprint?.status === 'active' ? 'active' : 'success'}>
                {sprint?.status || 'activo'}
              </Badge>
            </div>
            <SprintProgress
              day={sprint?.day}
              totalDays={sprint?.totalDays}
              startDate={sprint?.startDate}
              endDate={sprint?.endDate}
            />
            {sprint?.daysToGate > 0 && (
              <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                ⏱ {sprint.daysToGate} dias para {sprint.gateName}
              </div>
            )}
            {sprint?.hypothesis && (
              <div style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                {sprint.hypothesis}
              </div>
            )}
            <SourceTag source={sprint?._source} status={sprint?._status} error={sprint?._error} />
          </>
        )}
      </Card>

      {/* Verticais heatmap visual */}
      <Card title="Verticais V1–V10">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 8,
        }}>
          {topVerticals.map(v => (
            <div
              key={v.id}
              onClick={() => openDrawer(
                v.name,
                v.status,
                <div>
                  <DrawerSection label="Estado">
                    <Badge level={statusToBadge(v.status)}>{v.status}</Badge>
                  </DrawerSection>
                  <DrawerSection label="Descrição">{v.description || '—'}</DrawerSection>
                  <DrawerSection label="ID">{v.id.toUpperCase()}</DrawerSection>
                </div>
              )}
              style={{
                padding: '10px 12px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderTop: `3px solid ${verticalAccent(v.status)}`,
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.6rem',
                  color: 'var(--text-dim)',
                  fontWeight: 700,
                }}>
                  {v.id?.toUpperCase()}
                </span>
                <Badge level={statusToBadge(v.status)}>{v.status}</Badge>
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>
                {v.name}
              </div>
              {v.description && (
                <div style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-dim)',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {v.description}
                </div>
              )}
            </div>
          ))}
        </div>
        <SourceTag source={data._verticalsMeta?._source} status={data._verticalsMeta?._status} error={data._verticalsMeta?._error} />
      </Card>

      {/* Grid 2 col — Próximas Acções P0/P1 + Decisões */}
      <div className="grid-overview">
        <Card title="Próximas Acções (P0/P1)">
          {nextActions.length === 0 && <div className="empty">Sem acções P0/P1 abertas</div>}
          {nextActions.map(a => (
            <div
              key={a.id}
              className="action-item"
              style={{ cursor: 'pointer' }}
              onClick={() => openDrawer(
                a.description,
                `${a.priority} · ${a.source || ''}`,
                <div>
                  <DrawerSection label="Prioridade">
                    <span className={`action-priority ${priorityClass(a.priority)}`}>{a.priority}</span>
                  </DrawerSection>
                  <DrawerSection label="Responsável">{a.owner || '—'}</DrawerSection>
                  <DrawerSection label="Fonte">{a.source || '—'}</DrawerSection>
                </div>
              )}
            >
              <span className={`action-priority ${priorityClass(a.priority)}`}>{a.priority}</span>
              <div>
                <div style={{ color: 'var(--text)', fontSize: '0.78rem', lineHeight: 1.4 }}>{a.description}</div>
                {a.owner && (
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: 2 }}>
                    {a.owner}
                  </div>
                )}
              </div>
            </div>
          ))}
          <SourceTag source={data._nextActionsMeta?._source} status={data._nextActionsMeta?._status} error={data._nextActionsMeta?._error} />
        </Card>

        <Card title="Decisões recentes">
          {decisions.length === 0 && <div className="empty">Sem decisões registadas</div>}
          {decisions.slice(0, 6).map(d => (
            <div
              key={d.id}
              style={{
                borderLeft: `3px solid var(--info)`,
                padding: '8px 12px',
                marginBottom: 6,
                background: 'var(--bg-elevated)',
                borderRadius: '0 4px 4px 0',
                cursor: 'pointer',
              }}
              onClick={() => openDrawer(
                d.text,
                d.meta,
                <div>
                  <DrawerSection label="Detalhe">{d.detail || 'Sem detalhe adicional.'}</DrawerSection>
                </div>
              )}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: 500, marginBottom: 2, color: 'var(--text)' }}>
                {d.text}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{d.meta}</div>
            </div>
          ))}
          <SourceTag source={data._decisionsMeta?._source} status={data._decisionsMeta?._status} error={data._decisionsMeta?._error} />
        </Card>
      </div>

      {/* Stack Health — gauges */}
      {stackHealth.length > 0 && (
        <Card title="Stack Health">
          <div className="grid-4">
            {stackHealth.map((s, i) => (
              <div key={i} style={{ padding: '4px 0' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 4,
                }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 500 }}>{s.service}</span>
                  <span style={{ fontSize: '0.72rem', color: healthColor(s.usage), fontFamily: 'JetBrains Mono, monospace' }}>
                    {s.usage}%
                  </span>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: 4 }}>{s.label}</div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${s.usage}%`, background: healthColor(s.usage) }}
                  />
                </div>
              </div>
            ))}
          </div>
          <SourceTag source={data._stackHealthMeta?._source} status={data._stackHealthMeta?._status} error={data._stackHealthMeta?._error} />
        </Card>
      )}

      {/* Tech Stack — compactado */}
      {techStack.length > 0 && (
        <Card title="Tech Stack">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr>
                  {['Serviço', 'Role', 'Status', 'Custo'].map(h => (
                    <th key={h} style={{
                      padding: '5px 8px',
                      textAlign: 'left',
                      borderBottom: '1px solid var(--border)',
                      color: 'var(--text-dim)',
                      fontSize: '0.65rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {techStack.map(s => (
                  <tr key={s.name} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 500 }}>{s.name}</td>
                    <td style={{ padding: '6px 8px', color: 'var(--text-dim)' }}>{s.role}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <Badge level={
                        s.status === 'ok' ? 'success' :
                        s.status === 'warn' ? 'warning' :
                        s.status === 'planned' ? 'info' :
                        s.status === 'deferred' ? 'dim' : 'idle'
                      }>
                        {s.status}
                      </Badge>
                    </td>
                    <td style={{ padding: '6px 8px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{s.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Operações inter-agente — colapsado por defeito */}
      {alerts.length > 0 && (
        <Card>
          <button
            onClick={() => setOpsOpen(o => !o)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, width: '100%', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 8,
              color: 'var(--text-dim)',
              fontSize: '0.78rem',
            }}
          >
            {opsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span style={{ fontWeight: 600 }}>Operações inter-agente</span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.65rem',
              padding: '1px 6px',
              background: 'var(--bg-elevated)',
              borderRadius: 10,
            }}>{alerts.length}</span>
          </button>
          {opsOpen && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {alerts.map(a => (
                <div key={a.id} style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-dim)',
                  padding: '6px 8px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 4,
                  borderLeft: '2px solid var(--warning)',
                }}>
                  <span style={{ color: 'var(--text)' }}>{a.message}</span>
                  {a.since && (
                    <span style={{ marginLeft: 8, opacity: 0.6, fontSize: '0.65rem' }}>
                      desde {a.since.slice(0, 10)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
