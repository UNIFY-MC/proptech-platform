function MetaBlock({ title, children }) {
  return (
    <div className="bia-meta-block">
      <div className="bia-meta-head">{title}</div>
      {children}
    </div>
  )
}

export default function BiaMetaSidebar({ meta }) {
  return (
    <aside className="bia-meta">
      {/* QUICK STATS */}
      <MetaBlock title="Quick Stats">
        <div className="bia-meta-body">
          {[
            ['integrations', meta.integrations.length],
            ['skills',       meta.skills.length],
            ['recipes',      meta.recipes.length],
            ['version',      `v${meta.version}`],
            ['model',        meta.model],
          ].map(([label, value]) => (
            <div key={label} className="bia-stat-row">
              <span>{label}</span>
              <span className="v">{value}</span>
            </div>
          ))}
        </div>
      </MetaBlock>

      {/* INTEGRATIONS */}
      <MetaBlock title="Integrations">
        <div className="bia-int-grid">
          {meta.integrations.map(int => (
            <div
              key={int.id}
              className={`bia-int-cell ${int.status}`}
              title={`${int.name} · ${int.status}`}
            >
              {int.icon}
            </div>
          ))}
        </div>
      </MetaBlock>

      {/* SKILLS */}
      <MetaBlock title="Skills">
        {meta.skills.map(sk => (
          <div
            key={sk.id}
            className="bia-skill-row"
            onClick={() => console.log('skill:', sk.id)}
          >
            <span className="arrow">▸</span>
            <div>
              <span className="name">{sk.id}</span>
              <span className="desc">{sk.desc}</span>
            </div>
          </div>
        ))}
      </MetaBlock>

      {/* RECIPES */}
      <MetaBlock title="Recipes">
        {meta.recipes.map(r => (
          <div
            key={r.id}
            className="bia-recipe-card"
            onClick={() => console.log('recipe:', r.id)}
          >
            <div className="bia-recipe-name">{r.id}</div>
            <div className="bia-recipe-meta">
              {r.trigger_type}&nbsp;▸&nbsp;
              <span className="bia-recipe-trigger">{r.trigger_label}</span>
            </div>
            <div className="bia-recipe-desc">{r.desc}</div>
          </div>
        ))}
      </MetaBlock>

      {/* PEER READS */}
      <MetaBlock title="Peer Reads">
        {meta.peer_reads.map(pr => (
          <div key={pr.sprint} className={`bia-peer-row${pr.sprint === 'current' ? ' current' : ''}`}>
            <span className="bia-peer-sprint">{pr.sprint}</span>
            <span className="bia-peer-agents">
              {pr.agents.length === 0
                ? '— none'
                : pr.agents.map((a, i) => (
                    <span key={a}>{i > 0 ? ' · ' : ''}{a}</span>
                  ))}
            </span>
          </div>
        ))}
      </MetaBlock>

      {/* COST */}
      <MetaBlock title="Cost">
        <div className="bia-cost-row">
          <span className="label">1E</span>
          <span className="value">{meta.cost.sprint_1e}</span>
        </div>
        <div className="bia-cost-row">
          <span className="label">1F</span>
          <span className="value">{meta.cost.sprint_1f}</span>
        </div>
        <div className="bia-cost-note">{meta.cost.notes}</div>
      </MetaBlock>
    </aside>
  )
}
