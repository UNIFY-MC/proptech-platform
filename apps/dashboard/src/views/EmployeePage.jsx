import { useParams, Link } from 'react-router-dom'
import BiaScorecard from './BiaScorecard.jsx'

const TRIGGER_COLORS = {
  event:    { bg: 'rgba(59,130,246,0.12)', color: 'var(--info)' },
  schedule: { bg: 'rgba(16,185,129,0.12)', color: 'var(--success)' },
  manual:   { bg: 'rgba(245,158,11,0.12)', color: 'var(--warning)' },
}

function TriggerBadge({ trigger, label }) {
  const t = TRIGGER_COLORS[trigger] || TRIGGER_COLORS.manual
  return (
    <span style={{
      padding: '1px 7px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700,
      fontFamily: 'monospace', background: t.bg, color: t.color,
      textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
    }}>{label || trigger}</span>
  )
}

function Section({ title, children }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden', marginBottom: 12,
    }}>
      <div style={{
        padding: '8px 16px', borderBottom: '1px solid var(--border)',
        fontSize: '0.6rem', fontWeight: 700, fontFamily: 'monospace',
        textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)',
      }}>{title}</div>
      <div>{children}</div>
    </div>
  )
}

function MarkdownProse({ text }) {
  if (!text) return null

  const lines = text.split('\n')
  const elements = []
  let i = 0
  let inFrontmatter = false
  let skipFrontmatter = false

  if (lines[0] === '---') {
    inFrontmatter = true
    skipFrontmatter = true
    i = 1
  }

  while (i < lines.length) {
    const line = lines[i]

    if (inFrontmatter) {
      if (line === '---') { inFrontmatter = false }
      i++
      continue
    }
    if (skipFrontmatter && inFrontmatter === false) skipFrontmatter = false

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} style={{
          fontSize: '0.72rem', fontWeight: 700, fontFamily: 'monospace',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          color: 'var(--text-dim)', margin: '16px 0 6px',
          paddingTop: 12, borderTop: '1px solid var(--border)',
        }}>{line.slice(3)}</h2>
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} style={{
          fontSize: '0.7rem', fontWeight: 600, color: 'var(--text)',
          margin: '10px 0 4px',
        }}>{line.slice(4)}</h3>
      )
    } else if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      elements.push(
        <p key={i} style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', margin: '4px 0' }}>
          {line.slice(2, -2)}
        </p>
      )
    } else if (line.match(/^\d+\.\s/)) {
      elements.push(
        <div key={i} style={{
          display: 'flex', gap: 8, fontSize: '0.75rem', color: 'var(--text-dim)',
          lineHeight: 1.5, margin: '2px 0',
        }}>
          <span style={{ color: 'var(--primary)', fontWeight: 600, flexShrink: 0, minWidth: 16 }}>
            {line.match(/^(\d+)\./)[1]}.
          </span>
          <span dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        </div>
      )
    } else if (line.startsWith('- ')) {
      elements.push(
        <div key={i} style={{
          display: 'flex', gap: 8, fontSize: '0.75rem', color: 'var(--text-dim)',
          lineHeight: 1.5, margin: '2px 0',
        }}>
          <span style={{ color: 'var(--primary)', flexShrink: 0 }}>·</span>
          <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text)">$1</strong>') }} />
        </div>
      )
    } else if (line.startsWith('```')) {
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre key={`code-${i}`} style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '10px 12px', fontSize: '0.68rem',
          fontFamily: 'monospace', color: 'var(--text)', margin: '8px 0',
          overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>{codeLines.join('\n')}</pre>
      )
    } else if (line.startsWith('| ') && line.includes('|')) {
      // Skip table header separator rows but render data
      if (!line.match(/^\|[\s-|]+\|$/)) {
        const cells = line.split('|').filter(c => c.trim() !== '').map(c => c.trim())
        const isHeader = lines[i + 1]?.match(/^\|[\s-|]+\|$/)
        elements.push(
          <div key={i} style={{
            display: 'flex', gap: 12, fontSize: '0.7rem', padding: '3px 0',
            borderBottom: '1px solid var(--border)',
            fontWeight: isHeader ? 600 : 400,
            color: isHeader ? 'var(--text)' : 'var(--text-dim)',
          }}>
            {cells.map((c, ci) => (
              <span key={ci} style={{ flex: 1, minWidth: 0 }}>{c}</span>
            ))}
          </div>
        )
      }
    } else if (line.trim() !== '') {
      elements.push(
        <p key={i} style={{
          fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.6,
          margin: '4px 0',
        }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text)">$1</strong>').replace(/`(.*?)`/g, '<code style="font-family:monospace;font-size:0.72rem;background:var(--bg-elevated);padding:1px 4px;border-radius:3px;color:var(--info)">$1</code>') }} />
      )
    }

    i++
  }

  return <div style={{ padding: '12px 16px' }}>{elements}</div>
}

export default function EmployeePage({ data }) {
  const { slug } = useParams()

  if (slug === 'bia') return <BiaScorecard />

  const emp = data?.employees?.find(e => e.id === slug)

  if (!emp) {
    return (
      <div>
        <Link to="/employees" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textDecoration: 'none' }}>
          ← Equipa
        </Link>
        <div className="empty" style={{ marginTop: 20 }}>Employee não encontrado: {slug}</div>
      </div>
    )
  }

  const modelShort = emp.model?.replace('claude-', '').replace('-20251001', '') || '—'
  const enabledIntegrations = emp.integrations?.filter(i => i.enabled) || []
  const verticalLabel = [emp.vertical, ...(emp.secondary_verticals || [])].filter(Boolean).join(' + ')

  return (
    <div style={{ maxWidth: 820 }}>
      {/* Back link */}
      <Link to="/employees" style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textDecoration: 'none', display: 'inline-block', marginBottom: 14 }}>
        ← Equipa
      </Link>

      {/* Header */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '16px 20px', marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #534AB7, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem', fontWeight: 700, color: '#fff',
        }}>
          {emp.avatarInitial || emp.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>{emp.name}</span>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>·</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{emp.role}</span>
            {verticalLabel && (
              <span style={{
                fontSize: '0.6rem', fontWeight: 600, fontFamily: 'monospace',
                padding: '2px 7px', borderRadius: 4,
                background: 'rgba(83,74,183,0.12)', color: 'var(--primary)',
                border: '1px solid rgba(83,74,183,0.25)',
              }}>{verticalLabel}</span>
            )}
            {emp.department && (
              <span style={{
                fontSize: '0.6rem', padding: '2px 7px', borderRadius: 4,
                background: 'var(--bg-elevated)', color: 'var(--text-dim)',
              }}>{emp.department}</span>
            )}
          </div>
          <div style={{
            display: 'flex', gap: 8, marginTop: 4, fontSize: '0.65rem',
            color: 'var(--text-dim)', fontFamily: 'monospace', flexWrap: 'wrap',
          }}>
            <span>{emp.model?.replace('claude-', '') || '—'}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>v{emp.version || '1.0'}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>replies pt-pt</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <span style={{
            padding: '2px 10px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 600,
            fontFamily: 'monospace',
            background: emp.status === 'active' ? 'rgba(16,185,129,0.15)' : 'var(--bg-elevated)',
            color: emp.status === 'active' ? 'var(--success)' : 'var(--text-dim)',
          }}>{emp.status || 'draft'}</span>
          {emp.cost && (
            <span style={{ fontSize: '0.65rem', color: 'var(--warning)', fontFamily: 'monospace' }}>
              ~${emp.cost.current}/mês
            </span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12,
      }}>
        {[
          { label: 'Inbox 7d',          value: '—',  color: 'var(--info)' },
          { label: 'Approvals pending', value: '—',  color: 'var(--warning)' },
          { label: 'Approval rate',     value: '—',  color: 'var(--success)' },
          { label: 'Cost 30d',          value: emp.cost ? `$${emp.cost.current}` : '—', color: 'var(--text)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 12px',
          }}>
            <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              {s.label}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace', color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Integrations */}
      {emp.integrations?.length > 0 && (
        <Section title="Integrations">
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 1, padding: '4px 0',
          }}>
            {emp.integrations.map(integ => (
              <div key={integ.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 14px',
                opacity: integ.enabled ? 1 : 0.5,
                borderBottom: '1px solid var(--border)',
              }}>
                <span style={{
                  fontSize: '0.58rem', fontWeight: 700, fontFamily: 'monospace',
                  background: 'var(--bg-elevated)', padding: '2px 5px',
                  borderRadius: 3, color: 'var(--text-dim)', flexShrink: 0,
                }}>{integ.icon || integ.id.slice(0, 2).toUpperCase()}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text)' }}>{integ.name}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>{integ.desc}</div>
                </div>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: integ.enabled ? 'var(--success)' : 'var(--border)',
                }} />
                {integ.planned && (
                  <span style={{ fontSize: '0.55rem', color: 'var(--warning)', fontStyle: 'italic' }}>planeado</span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Skills */}
      {emp.skills?.length > 0 && (
        <Section title={`Skills · ${emp.skills.length}`}>
          {emp.skills.map(s => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '8px 16px', borderBottom: '1px solid var(--border)',
              cursor: 'default',
            }}>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.65rem', flexShrink: 0, marginTop: 2 }}>›</span>
              <div>
                <code style={{
                  display: 'block', fontSize: '0.68rem', fontFamily: 'monospace',
                  fontWeight: 600, color: 'var(--info)', marginBottom: 2,
                }}>{s.id}</code>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{s.desc}</span>
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Recipes */}
      {emp.recipes?.length > 0 && (
        <Section title={`Recipes · ${emp.recipes.length}`}>
          {emp.recipes.map(r => (
            <div key={r.id} style={{
              padding: '10px 16px', borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <TriggerBadge trigger={r.trigger} label={r.trigger_label || r.trigger} />
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace' }}>{r.id}</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{r.desc}</div>
            </div>
          ))}
        </Section>
      )}

      {/* Instructions — full .md rendered */}
      <Section title="Instructions">
        <MarkdownProse text={emp._mdRaw} />
        {!emp._mdRaw && (
          <div style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
            Ficheiro .md não carregado — disponível em .claude/employees/{slug}.md
          </div>
        )}
      </Section>

      {/* Peer reads */}
      {emp.peerReads?.length > 0 && (
        <Section title="Colabora com">
          {emp.peerReads.map((p, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, padding: '6px 16px',
              borderBottom: '1px solid var(--border)', fontSize: '0.72rem',
            }}>
              <span style={{
                fontFamily: 'monospace', fontSize: '0.6rem', fontWeight: 700,
                color: p.stage === 'current' ? 'var(--primary)' : 'var(--text-dim)',
                width: 70, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>{p.stage}</span>
              <span style={{ color: 'var(--text-dim)' }}>{p.value}</span>
            </div>
          ))}
        </Section>
      )}
    </div>
  )
}
