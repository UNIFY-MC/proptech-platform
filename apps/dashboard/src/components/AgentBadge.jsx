// AgentBadge — chip compacto que identifica o agente autor de uma acção
// Props: agent_slug (string), size ('sm' | 'md')
// Usado em ActivityTimeline e em qualquer sítio onde aparece o autor de uma acção

const AGENT_META = {
  bia:          { label: 'Bia',       color: '#8b5cf6', initial: 'B' },
  iris:         { label: 'Iris',      color: '#06b6d4', initial: 'I' },
  hermes:       { label: 'Hermes',    color: '#f59e0b', initial: 'H' },
  truth:        { label: 'Truth',     color: '#10b981', initial: 'T' },
  orchestrator: { label: 'Orch.',     color: '#d2a8ff', initial: 'O' },
  financeiro:   { label: 'Financeiro',color: '#3fb950', initial: 'F' },
  seguros:      { label: 'Seguros',   color: '#58a6ff', initial: 'S' },
  energia:      { label: 'Energia',   color: '#e3b341', initial: 'E' },
  manutencao:   { label: 'Manutenção',color: '#ff7b72', initial: 'M' },
}

const HUMAN_META = { label: 'Mário', color: '#58a6ff', initial: 'M' }

export default function AgentBadge({ agent_slug, size = 'sm' }) {
  if (!agent_slug) return null

  const isHuman = agent_slug === 'human' || agent_slug === 'mario'
  const meta = isHuman
    ? HUMAN_META
    : (AGENT_META[agent_slug] ?? { label: agent_slug, color: '#9198a1', initial: agent_slug[0]?.toUpperCase() })

  const dotSize = size === 'md' ? 18 : 14
  const fontSize = size === 'md' ? 10 : 8

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      background: 'var(--surface2)',
      padding: '1px 6px 1px 3px',
      borderRadius: 10,
      fontSize: size === 'md' ? 11 : 10,
      color: 'var(--text)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: dotSize,
        height: dotSize,
        borderRadius: '50%',
        background: meta.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 700,
        color: '#000',
        flexShrink: 0,
      }}>
        {isHuman ? '👤' : meta.initial}
      </span>
      {meta.label}
    </span>
  )
}
