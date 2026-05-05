import { useBiaMeta } from '../../hooks/useBiaMeta'

function MetaBlock({ title, children }) {
  return (
    <div className="bia-meta-block">
      <div className="bia-meta-head">{title}</div>
      <div className="bia-meta-body">{children}</div>
    </div>
  )
}

export default function BiaMetaSidebar({ hidden }) {
  const meta = useBiaMeta()

  if (hidden) return null

  return (
    <aside className="bia-meta-sidebar">

      {/* SKILLS */}
      <MetaBlock title="Skills">
        {meta.skills.map(s => (
          <div key={s.id} className="bia-skill-row">
            <span className="arrow">▸</span>
            <div>
              <span className="name bia-mono">{s.id}</span>
              <span className="desc">{s.desc}</span>
            </div>
          </div>
        ))}
      </MetaBlock>

      {/* RECIPES */}
      <div className="bia-meta-block">
        <div className="bia-meta-head">Recipes</div>
        <div className="bia-recipes-body">
          {meta.recipes.map(r => (
            <div key={r.id} className="bia-recipe-card">
              <div className="bia-recipe-name bia-mono">{r.id}</div>
              <div className="bia-recipe-meta">
                {r.trigger_type} ▸ <span className="bia-recipe-trigger">{r.trigger_label}</span>
              </div>
              <div className="bia-recipe-desc">{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PEER READS */}
      <MetaBlock title="Peer Reads">
        {meta.peer_reads.map(p => (
          <div key={p.sprint} className={`bia-peer-row${p.sprint === 'current' ? ' current' : ''}`}>
            <span className="bia-peer-sprint bia-mono">{p.sprint}</span>
            <span className="bia-peer-agents">
              {p.agents.length === 0 ? '─ none' : `▸ ${p.agents.join(', ')}`}
            </span>
          </div>
        ))}
      </MetaBlock>

      {/* COST */}
      <MetaBlock title="Cost">
        <div className="bia-cost-row">
          <span className="label bia-mono">1E</span>
          <span className="value bia-mono">{meta.cost.sprint_1e}</span>
        </div>
        <div className="bia-cost-row">
          <span className="label bia-mono">1F</span>
          <span className="value bia-mono">{meta.cost.sprint_1f}</span>
        </div>
        {meta.cost.notes && <div className="bia-cost-note">{meta.cost.notes}</div>}
      </MetaBlock>

    </aside>
  )
}
