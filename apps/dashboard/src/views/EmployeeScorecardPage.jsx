// EmployeeScorecardPage — ficha de agente estilo CookAI, totalmente genérica
// Rota: /employees/:employee_id/scorecard  (e /employees/bia redirige aqui via App.jsx)
// Aceita qualquer agent_id via URL param :employee_id
// Fonte de dados: system.agent_profile + hooks employee/*
//
// Retrocompat: BiaScorecard agora é apenas um wrapper que chama este componente
// com employee_id="bia" — sem lógica duplicada.

import { useState }            from 'react'
import { useParams }           from 'react-router-dom'
import { useEmployeeProfile }  from '../hooks/useEmployeeProfile.js'
import { useEmployeeInstructions } from '../hooks/useEmployeeInstructions.js'
import { useEmployeeStats }    from '../hooks/useEmployeeStats.js'
import EmployeeHeader          from '../components/employee/EmployeeHeader.jsx'
import EmployeeStats           from '../components/employee/EmployeeStats.jsx'
import EmployeeInstructions    from '../components/employee/EmployeeInstructions.jsx'
import EmployeeIntegrations    from '../components/employee/EmployeeIntegrations.jsx'
import EmployeeChannels        from '../components/employee/EmployeeChannels.jsx'
import EmployeeAutomations     from '../components/employee/EmployeeAutomations.jsx'
import EmployeeConfiguration   from '../components/employee/EmployeeConfiguration.jsx'
import EmployeeMetaSidebar     from '../components/employee/EmployeeMetaSidebar.jsx'
import EmployeeActivityFeed    from '../components/EmployeeActivityFeed.jsx'
import BiaTaskLauncher         from './BiaTaskLauncher.jsx'

// Aceita agentId como prop directa (para wrappers como BiaScorecard)
// OU via URL param :employee_id quando usado directamente como rota.
export default function EmployeeScorecardPage({ agentId: agentIdProp }) {
  const params          = useParams()
  const agentId         = agentIdProp || params.employee_id

  const { profile, loading: profileLoading, reload: reloadProfile } = useEmployeeProfile(agentId)
  const instructions    = useEmployeeInstructions(agentId)
  const { stats, loading: statsLoading } = useEmployeeStats(agentId)
  const [testOpen, setTestOpen]   = useState(false)

  const isEditing = instructions.mode === 'edit'

  if (!agentId) {
    return (
      <div style={{ padding: 40, fontSize: '0.78rem', color: 'var(--danger)' }}>
        Nenhum agent_id fornecido. Verifica a rota.
      </div>
    )
  }

  if (profileLoading) {
    return (
      <div style={{ padding: 40, fontSize: '0.78rem', color: 'var(--text-dim)' }}>
        A carregar ficha de <code style={{ fontFamily: 'JetBrains Mono, monospace' }}>{agentId}</code>…
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ padding: 40, fontSize: '0.78rem', color: 'var(--danger)' }}>
        Profile não encontrado em <code style={{ fontFamily: 'JetBrains Mono, monospace' }}>system.agent_profile</code> para
        agent_id=<strong>{agentId}</strong>.
        <br />
        <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>
          Verifica se o seed foi aplicado (26 agentes).
        </span>
      </div>
    )
  }

  // Só Bia tem o BiaTaskLauncher por agora — futuramente, outros agentes terão os seus launchers.
  const showTestButton = agentId === 'bia'

  return (
    <div className="bia-scorecard">
      <EmployeeHeader profile={profile} isEditing={isEditing} />

      {!isEditing && showTestButton && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <button onClick={() => setTestOpen(true)} style={{
            padding: '5px 14px', background: 'var(--primary)', color: '#fff',
            border: 'none', borderRadius: 6, cursor: 'pointer',
            fontSize: '0.74rem', fontWeight: 600,
          }}>Test</button>
        </div>
      )}

      <div className={`bsc-grid${isEditing ? ' editing' : ''}`}>
        {/* Coluna esquerda */}
        <div>
          {/* 4 KPIs CookAI */}
          <EmployeeStats stats={stats} loading={statsLoading} dimmed={isEditing} />

          {/* Instructions */}
          <EmployeeInstructions {...instructions} agentId={agentId} />

          {!isEditing && (
            <>
              <EmployeeIntegrations agentId={agentId} />
              <EmployeeChannels     agentId={agentId} />
              <EmployeeAutomations  agentId={agentId} />
              <EmployeeConfiguration agentId={agentId} profile={profile} reload={reloadProfile} />

              {/* Recent Activity */}
              <div style={{ marginTop: 18 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--text-dim)',
                  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
                  fontFamily: 'JetBrains Mono, monospace',
                }}>Recent Activity</div>
                <div style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6,
                }}>
                  <EmployeeActivityFeed agentId={agentId} limit={10} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Coluna direita — sidebar */}
        <EmployeeMetaSidebar hidden={isEditing} profile={profile} />
      </div>

      {/* Test Modal — apenas para Bia por agora */}
      {testOpen && (
        <div onClick={() => setTestOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 1200, padding: '40px 20px', overflow: 'auto',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12,
            width: 'min(820px, 100%)', padding: 24, position: 'relative',
          }}>
            <button onClick={() => setTestOpen(false)} style={{
              position: 'absolute', top: 12, right: 14,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-dim)', fontSize: '1.6rem',
            }}>×</button>
            <BiaTaskLauncher />
          </div>
        </div>
      )}
    </div>
  )
}
