import { useMemo, useState } from 'react'
import RecipeModal from '../components/RecipeModal.jsx'

const TRIGGER_STYLES = {
  event:    { bg: 'rgba(59,130,246,0.12)',  color: 'var(--info)',    label: 'EVENT' },
  schedule: { bg: 'rgba(16,185,129,0.12)', color: 'var(--success)', label: 'CRON' },
  manual:   { bg: 'rgba(245,158,11,0.12)', color: 'var(--warning)', label: 'MANUAL' },
}

function TriggerBadge({ trigger }) {
  const s = TRIGGER_STYLES[trigger] || TRIGGER_STYLES.manual
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: '0.58rem', fontWeight: 700,
      fontFamily: 'monospace', background: s.bg, color: s.color,
      textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
    }}>{s.label}</span>
  )
}

export default function RecipesPage({ data }) {
  const [selectedRecipe, setSelectedRecipe] = useState(null)

  const allRecipes = useMemo(() => {
    const result = []
    for (const emp of (data?.employees || [])) {
      for (const recipe of (emp.recipes || [])) {
        result.push({ ...recipe, ownerName: emp.name, ownerId: emp.id, ownerDept: emp.department })
      }
    }
    return result.sort((a, b) => {
      const order = { event: 0, schedule: 1, manual: 2 }
      return (order[a.trigger] ?? 3) - (order[b.trigger] ?? 3)
    })
  }, [data])

  const grouped = useMemo(() => {
    const g = { event: [], schedule: [], manual: [] }
    for (const r of allRecipes) {
      const key = r.trigger in g ? r.trigger : 'manual'
      g[key].push(r)
    }
    return g
  }, [allRecipes])

  const sections = [
    { key: 'event',    title: 'Event triggers',    style: TRIGGER_STYLES.event },
    { key: 'schedule', title: 'Scheduled (cron)',   style: TRIGGER_STYLES.schedule },
    { key: 'manual',   title: 'Manual',             style: TRIGGER_STYLES.manual },
  ]

  return (
    <div>
      {selectedRecipe && <RecipeModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />}

      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: 20 }}>
        {allRecipes.length} receitas em {(data?.employees || []).filter(e => e.recipes?.length).length} employees
      </div>

      {sections.map(({ key, title, style }) => {
        const recipes = grouped[key]
        if (!recipes.length) return null
        return (
          <div key={key} style={{ marginBottom: 28 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)',
            }}>
              <span style={{
                padding: '2px 8px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700,
                fontFamily: 'monospace', background: style.bg, color: style.color,
              }}>{title.toUpperCase()}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>· {recipes.length}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recipes.map((r, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedRecipe(r)}
                  style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '12px 16px',
                    borderLeft: `2px solid ${style.color}`,
                    cursor: 'pointer', transition: 'transform 0.1s, background 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'var(--bg-card)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 600, fontFamily: 'monospace', color: 'var(--text)',
                    }}>{r.id}</span>
                    {r.trigger_label && (
                      <code style={{
                        fontSize: '0.6rem', fontFamily: 'monospace',
                        background: 'var(--bg-elevated)', padding: '1px 6px',
                        borderRadius: 3, color: style.color,
                      }}>{r.trigger_label}</code>
                    )}
                    <span style={{
                      marginLeft: 'auto', fontSize: '0.62rem', color: 'var(--text-dim)',
                      fontStyle: 'italic', flexShrink: 0,
                    }}>via {r.ownerName}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                    {r.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
