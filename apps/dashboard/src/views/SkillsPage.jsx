import { useState, useMemo } from 'react'

const SKILL_TAGS = {
  'classify': 'CLASSIFICATION',
  'match': 'MATCHING',
  'triage': 'TRIAGE',
  'score': 'SCORING',
  'compose': 'COMPOSE',
  'extract': 'EXTRACT',
  'escalate': 'ESCALATE',
  'vision': 'VISION',
  'simul': 'SIMULATION',
  'abrir': 'ACTION',
  'fechar': 'ACTION',
  'iniciar': 'ACTION',
  'gerir': 'MANAGE',
  'monitoriz': 'MONITOR',
  'alert': 'ALERT',
  'auditar': 'AUDIT',
  'participar': 'ACTION',
  'acompanhar': 'MONITOR',
  'actualiz': 'ACTION',
  'publicar': 'PUBLISH',
  'redigir': 'COMPOSE',
  'analis': 'ANALYSIS',
  'gerar': 'GENERATE',
  'import': 'IMPORT',
  'sincroniz': 'SYNC',
  'certific': 'COMPLIANCE',
}

function getTag(id) {
  const lower = id.toLowerCase()
  for (const [key, tag] of Object.entries(SKILL_TAGS)) {
    if (lower.includes(key)) return tag
  }
  return 'CORE'
}

const TAG_COLORS = {
  CLASSIFICATION: 'var(--primary)',
  MATCHING:       'var(--info)',
  TRIAGE:         'var(--warning)',
  SCORING:        'var(--info)',
  COMPOSE:        'var(--success)',
  EXTRACT:        'var(--info)',
  ESCALATE:       'var(--danger)',
  VISION:         'var(--primary)',
  SIMULATION:     'var(--warning)',
  ACTION:         'var(--success)',
  MANAGE:         'var(--info)',
  MONITOR:        'var(--warning)',
  ALERT:          'var(--warning)',
  AUDIT:          'var(--primary)',
  COMPLIANCE:     'var(--primary)',
  PUBLISH:        'var(--success)',
  ANALYSIS:       'var(--info)',
  GENERATE:       'var(--success)',
  IMPORT:         'var(--info)',
  SYNC:           'var(--success)',
  CORE:           'var(--text-dim)',
}

export default function SkillsPage({ data }) {
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('ALL')

  const allSkills = useMemo(() => {
    const seen = new Set()
    const result = []
    for (const emp of (data?.employees || [])) {
      for (const skill of (emp.skills || [])) {
        if (!seen.has(skill.id)) {
          seen.add(skill.id)
          result.push({ ...skill, tag: getTag(skill.id), owner: emp.name, ownerId: emp.id })
        }
      }
    }
    return result.sort((a, b) => a.id.localeCompare(b.id))
  }, [data])

  const allTags = useMemo(() => {
    const tags = new Set(allSkills.map(s => s.tag))
    return ['ALL', ...Array.from(tags).sort()]
  }, [allSkills])

  const filtered = useMemo(() => {
    return allSkills.filter(s => {
      const matchesTag = tagFilter === 'ALL' || s.tag === tagFilter
      const matchesSearch = !search || s.id.toLowerCase().includes(search.toLowerCase()) || s.desc.toLowerCase().includes(search.toLowerCase())
      return matchesTag && matchesSearch
    })
  }, [allSkills, tagFilter, search])

  return (
    <div>
      {/* Filter bar */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <input
          type="text"
          placeholder="Pesquisar skills…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '7px 12px', fontSize: '0.8rem', color: 'var(--text)',
            outline: 'none', minWidth: 200,
          }}
        />
        {allTags.map(tag => (
          <button
            key={tag}
            onClick={() => setTagFilter(tag)}
            style={{
              padding: '5px 10px', borderRadius: 6, fontSize: '0.62rem', fontWeight: 700,
              fontFamily: 'monospace', cursor: 'pointer', border: '1px solid',
              background: tagFilter === tag ? 'rgba(83,74,183,0.15)' : 'transparent',
              color: tagFilter === tag ? 'var(--primary)' : 'var(--text-dim)',
              borderColor: tagFilter === tag ? 'var(--primary)' : 'var(--border)',
            }}
          >{tag}</button>
        ))}
        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginLeft: 'auto' }}>
          {filtered.length} / {allSkills.length} skills
        </span>
      </div>

      {/* Skills grid */}
      <div className="grid-agents">
        {filtered.map(skill => {
          const tagColor = TAG_COLORS[skill.tag] || 'var(--text-dim)'
          return (
            <div key={skill.id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 16,
              borderLeft: `2px solid ${tagColor}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                <code style={{
                  fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 600,
                  color: 'var(--info)', lineHeight: 1.3,
                }}>{skill.id}</code>
                <span style={{
                  fontSize: '0.55rem', fontWeight: 700, fontFamily: 'monospace',
                  padding: '1px 6px', borderRadius: 3, flexShrink: 0,
                  background: `${tagColor}18`, color: tagColor,
                }}>{skill.tag}</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.5, margin: '0 0 8px' }}>
                {skill.desc}
              </p>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                via {skill.owner}
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty">Nenhuma skill encontrada</div>
      )}
    </div>
  )
}
