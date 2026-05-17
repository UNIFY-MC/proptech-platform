// BiaScorecard — ficha estilo Cook AI/Hermes, 100% BD-driven
// Rota: /employees/bia (principal) + /employees/bia/scorecard (alias)
//
// Tudo vem da BD via hooks:
//   - useBiaProfile      → system.agent_profile
//   - useBiaInstructions → system.agent_profile.instructions (edit BD)
//   - useBiaStats        → system.inbox_items + system.approvals_queue
//   - useBiaIntegrations → system.agent_integrations JOIN system.integrations
//   - useBiaChannels     → system.agent_channels
//   - useBiaAutomations  → system.agent_recipes + count system.tasks
//   - useSkillsCount     → system.skills (count repo)

import { useState } from 'react'
import { useBiaProfile }      from '../hooks/useBiaProfile'
import { useBiaInstructions } from '../hooks/useBiaInstructions'
import { useBiaStats }        from '../hooks/useBiaStats'
import BiaHeader              from '../components/bia/BiaHeader'
import BiaStats               from '../components/bia/BiaStats'
import BiaInstructions        from '../components/bia/BiaInstructions'
import BiaIntegrations        from '../components/bia/BiaIntegrations'
import BiaChannels            from '../components/bia/BiaChannels'
import BiaAutomations         from '../components/bia/BiaAutomations'
import BiaConfiguration       from '../components/bia/BiaConfiguration'
import BiaMetaSidebar         from '../components/bia/BiaMetaSidebar'
import BiaTaskLauncher        from './BiaTaskLauncher.jsx'
import EmployeeActivityFeed   from '../components/EmployeeActivityFeed.jsx'

export default function BiaScorecard() {
  const { profile, loading: profileLoading, reload: reloadProfile } = useBiaProfile()
  const instructions = useBiaInstructions()
  const { stats, loading: statsLoading } = useBiaStats()
  const [testOpen, setTestOpen] = useState(false)

  const isEditing = instructions.mode === 'edit'

  if (profileLoading) {
    return <div style={{ padding: 40, fontSize: '0.78rem', color: 'var(--text-dim)' }}>A carregar ficha…</div>
  }
  if (!profile) {
    return <div style={{ padding: 40, fontSize: '0.78rem', color: 'var(--danger)' }}>
      Profile não encontrado em system.agent_profile (agent_id=bia). Verifica seed.
    </div>
  }

  return (
    <div className="bia-scorecard">
      <BiaHeader profile={profile} isEditing={isEditing} />

      {!isEditing && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <button onClick={() => setTestOpen(true)} style={{
            padding: '5px 14px', background: 'var(--primary)', color: '#fff',
            border: 'none', borderRadius: 6, cursor: 'pointer',
            fontSize: '0.74rem', fontWeight: 600,
          }}>Test</button>
        </div>
      )}

      <div className={`bsc-grid${isEditing ? ' editing' : ''}`}>
        <div>
          <BiaStats stats={stats} loading={statsLoading} dimmed={isEditing} />
          <BiaInstructions {...instructions} />
          {!isEditing && (
            <>
              <BiaIntegrations />
              <BiaChannels />
              <BiaAutomations />
              <BiaConfiguration profile={profile} reload={reloadProfile} />
              <div style={{ marginTop: 18 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--text-dim)',
                  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
                  fontFamily: 'JetBrains Mono, monospace',
                }}>Recent Activity</div>
                <div style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6,
                }}>
                  <EmployeeActivityFeed agentId="bia" limit={10} />
                </div>
              </div>
            </>
          )}
        </div>
        <BiaMetaSidebar hidden={isEditing} profile={profile} />
      </div>

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
