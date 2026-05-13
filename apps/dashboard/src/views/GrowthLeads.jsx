import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hkmvszkpxjbxmnixzqbl.supabase.co'
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const sb = createClient(SUPABASE_URL, ANON_KEY, { db: { schema: 'growth' } })

const STAGES = [
  { id: 'novo',          label: 'Novo',          color: '#888'    },
  { id: 'qualificado',   label: 'Qualificado',   color: '#58a6ff' },
  { id: 'em_negociacao', label: 'Em Negociação', color: '#e3b341' },
  { id: 'convertido',    label: 'Convertido',    color: '#3fb950' },
  { id: 'perdido',       label: 'Perdido',       color: '#ff7b72' },
]

function fdate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
}

export default function GrowthLeads() {
  const [leads, setLeads] = useState(null)
  const [error, setError] = useState(null)
  const [filterVertical, setFilterVertical] = useState('')
  const [busy, setBusy] = useState(null)
  const [flash, setFlash] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    let q = sb.from('leads')
      .select('id, vertical_alvo, nome, email, telefone, estado, lead_score, utm_source, utm_campaign, created_at, qualificado_em, convertido_em, dados_extra')
      .order('created_at', { ascending: false })
      .limit(500)
    const { data, error } = await q
    if (error) setError(error.message)
    else setLeads(data || [])
  }

  const visible = useMemo(() => {
    if (!leads) return null
    if (!filterVertical) return leads
    return leads.filter(l => l.vertical_alvo === filterVertical)
  }, [leads, filterVertical])

  const grouped = useMemo(() => {
    const out = Object.fromEntries(STAGES.map(s => [s.id, []]))
    for (const l of (visible || [])) if (out[l.estado]) out[l.estado].push(l)
    return out
  }, [visible])

  async function moveStage(leadId, newStage) {
    setBusy(leadId)
    setFlash(null)
    const patch = { estado: newStage, updated_at: new Date().toISOString() }
    if (newStage === 'qualificado') patch.qualificado_em = new Date().toISOString()
    if (newStage === 'convertido')  patch.convertido_em  = new Date().toISOString()
    if (newStage === 'perdido')     patch.perdido_em     = new Date().toISOString()
    const { error } = await sb.from('leads').update(patch).eq('id', leadId)
    setBusy(null)
    if (error) {
      setFlash({ ok: false, msg: error.message })
    } else {
      setFlash({ ok: true, msg: `→ ${newStage}` })
      load()
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 4 }}>Growth · Leads Kanban</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
        Drag-free kanban: click no estado para mover lead. Schema <code style={{ fontFamily: 'monospace' }}>growth.leads</code>.
      </p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <select
          value={filterVertical}
          onChange={e => setFilterVertical(e.target.value)}
          style={{
            background: '#1c2840', border: '1px solid #35405a', color: '#e6edf3',
            padding: '6px 10px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace',
          }}
        >
          <option value="">Todas as verticais ({leads?.length ?? 0})</option>
          {['v2','v3','v4','v5','v10'].map(v => (
            <option key={v} value={v}>
              {v} ({leads?.filter(l => l.vertical_alvo === v).length ?? 0})
            </option>
          ))}
        </select>
        {flash && (
          <span style={{
            padding: '4px 10px', borderRadius: 4, fontSize: 11,
            background: flash.ok ? 'rgba(63,185,80,0.15)' : 'rgba(255,123,114,0.15)',
            color: flash.ok ? '#3fb950' : '#ff7b72',
          }}>{flash.msg}</span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#888' }}>
          {visible?.length ?? 0} leads visíveis
        </span>
      </div>

      {error && <div style={{ padding: 12, background: 'rgba(255,123,114,0.1)', border: '1px solid rgba(255,123,114,0.3)', borderRadius: 6, color: '#ff7b72', fontSize: 13, marginBottom: 16 }}>Erro: {error}</div>}

      {leads === null && <div style={{ color: '#888' }}>A carregar leads…</div>}

      {leads && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STAGES.length}, 1fr)`, gap: 12 }}>
          {STAGES.map(stage => (
            <div key={stage.id} style={{ background: '#1c2840', border: '1px solid #35405a', borderRadius: 8, padding: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: stage.color }}>
                  ● {stage.label}
                </span>
                <span style={{ fontSize: 11, color: '#888', fontFamily: 'monospace' }}>{grouped[stage.id].length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                {grouped[stage.id].map(l => (
                  <LeadCard
                    key={l.id}
                    lead={l}
                    busy={busy === l.id}
                    stages={STAGES}
                    currentStage={stage.id}
                    onMove={moveStage}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LeadCard({ lead, busy, stages, currentStage, onMove }) {
  const [showMenu, setShowMenu] = useState(false)
  return (
    <div style={{
      background: '#233050', border: '1px solid #35405a', borderRadius: 6,
      padding: 10, fontSize: 12, opacity: busy ? 0.4 : 1, position: 'relative',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{lead.nome || lead.email?.split('@')[0] || '—'}</span>
        <span style={{ fontSize: 9, color: '#888' }}>{fdate(lead.created_at)}</span>
      </div>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 6, fontFamily: 'monospace' }}>{lead.email}</div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, padding: '1px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: 3, fontFamily: 'monospace' }}>
          {lead.vertical_alvo}
        </span>
        {lead.utm_source && (
          <span style={{ fontSize: 9, padding: '1px 6px', background: 'rgba(88,166,255,0.15)', color: '#58a6ff', borderRadius: 3, fontFamily: 'monospace' }}>
            {lead.utm_source}
          </span>
        )}
        {lead.lead_score != null && (
          <span style={{ fontSize: 9, padding: '1px 6px', background: lead.lead_score >= 70 ? 'rgba(63,185,80,0.2)' : 'rgba(255,255,255,0.05)',
                         color: lead.lead_score >= 70 ? '#3fb950' : '#888', borderRadius: 3, fontFamily: 'monospace' }}>
            {lead.lead_score}
          </span>
        )}
      </div>

      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={busy}
        style={{
          width: '100%', background: 'transparent', border: '1px solid #35405a',
          color: '#888', padding: '3px 6px', borderRadius: 3, fontSize: 9,
          fontFamily: 'monospace', cursor: 'pointer',
        }}
      >
        Mover ▾
      </button>
      {showMenu && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: 2,
          background: '#1c2840', border: '1px solid #35405a', borderRadius: 4, padding: 4,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          {stages.filter(s => s.id !== currentStage).map(s => (
            <button
              key={s.id}
              onClick={() => { setShowMenu(false); onMove(lead.id, s.id) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'transparent', border: 'none', color: s.color,
                padding: '4px 8px', fontSize: 10, cursor: 'pointer', fontFamily: 'monospace',
              }}
            >
              → {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
