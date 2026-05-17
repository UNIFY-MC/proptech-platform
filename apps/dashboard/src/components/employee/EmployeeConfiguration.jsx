// EmployeeConfiguration — versão generalizada de BiaConfiguration
// Lê/escreve system.agent_profile para qualquer agentId

import { useCallback, useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

const MODELS = [
  { id: 'claude-sonnet-4-6', label: 'Claude',  icon: '☼' },
  { id: 'claude-haiku-4-5',  label: 'Haiku',   icon: '⚡' },
  { id: 'gpt-5',             label: 'Codex',   icon: '◆' },
]

const REPLY_POLICIES = [
  { id: 'team-auto-guests-reviewed', label: 'Team auto, guests reviewed',
    desc: 'Internal members get immediate replies. Clients & unknown users queue for approval.' },
  { id: 'human-approval-all', label: 'Human approval (Tier 1)',
    desc: 'Every outbound action passes through approvals_queue.' },
  { id: 'team-auto-all', label: 'Team auto (no approval)',
    desc: 'All replies sent without human review.' },
]

const labelStyle = {
  fontSize: 11, color: 'var(--text-dim)', marginBottom: 8,
  fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase',
  letterSpacing: '0.08em', fontWeight: 600,
}

export default function EmployeeConfiguration({ agentId, profile, reload }) {
  const [model, setModel]   = useState(profile?.model || 'claude-sonnet-4-6')
  const [policy, setPolicy] = useState(profile?.reply_policy || 'team-auto-guests-reviewed')

  useEffect(() => {
    setModel(profile?.model || 'claude-sonnet-4-6')
    setPolicy(profile?.reply_policy || 'team-auto-guests-reviewed')
  }, [profile?.model, profile?.reply_policy])

  const currentPolicy = REPLY_POLICIES.find(p => p.id === policy) || REPLY_POLICIES[0]

  const updateField = useCallback(async (field, value) => {
    if (!supabase) return
    try {
      const { error } = await supabase
        .schema('system').from('agent_profile')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('agent_id', agentId)
      if (error) throw error
      reload?.()
    } catch (err) {
      console.error('[EmployeeConfiguration]', agentId, field, err)
    }
  }, [agentId, reload])

  return (
    <div className="bia-intg">
      <div className="bia-intg-head">
        <span className="bia-intg-label">
          <span style={{ fontSize: 14 }}>⚙</span>
          <span>Configuration</span>
        </span>
        <button className="bia-intg-manage" onClick={() => alert('Full Settings — em breve')}>
          Full Settings
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 18, padding: '14px 16px' }}>
        {/* Model selector */}
        <div>
          <div style={labelStyle}>Model</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {MODELS.map(m => {
              const selected = m.id === model
              return (
                <button
                  key={m.id}
                  onClick={() => { setModel(m.id); updateField('model', m.id) }}
                  style={{
                    padding: '5px 12px', borderRadius: 8,
                    background: selected ? 'rgba(124,58,237,0.16)' : 'transparent',
                    color: selected ? '#a78bfa' : 'var(--text-dim)',
                    border: selected ? '1px solid #7c3aed' : '1px solid var(--border)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    transition: 'all 0.12s',
                  }}
                >
                  <span style={{ fontSize: 13 }}>{m.icon}</span>{m.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Reply policy */}
        <div>
          <div style={labelStyle}>Reply Policy</div>
          <select
            value={policy}
            onChange={e => { setPolicy(e.target.value); updateField('reply_policy', e.target.value) }}
            style={{
              width: '100%', padding: '6px 10px', borderRadius: 6,
              background: 'var(--bg-card)', color: 'var(--text)',
              border: '1px solid var(--border)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {REPLY_POLICIES.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6, lineHeight: 1.55 }}>
            {currentPolicy.desc}
          </div>
        </div>
      </div>
    </div>
  )
}
