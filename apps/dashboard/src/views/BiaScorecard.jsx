import biaRaw from '../../../../.claude/employees/bia.md?raw'

// ── Parser ────────────────────────────────────────────────────────────────────

function slug(s) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!m) return { fm: {}, body: raw }
  const fm = {}
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*"?([^"#\n]*?)"?\s*$/)
    if (kv) fm[kv[1].trim()] = kv[2].trim()
  }
  return { fm, body: m[2] }
}

function parseSections(body) {
  return body
    .split(/^## /m)
    .filter(Boolean)
    .map(part => {
      const nl = part.indexOf('\n')
      const title = part.slice(0, nl).trim()
      return { title, content: part.slice(nl + 1).trim(), slug: slug(title) }
    })
}

// ── Inline renderer (bold + inline code) ─────────────────────────────────────

function Inline({ children: text }) {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**'))
          return <strong key={i}>{p.slice(2, -2)}</strong>
        if (p.startsWith('`') && p.endsWith('`'))
          return (
            <code key={i} style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.83em',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              padding: '1px 5px',
              borderRadius: 3,
            }}>
              {p.slice(1, -1)}
            </code>
          )
        return <span key={i}>{p}</span>
      })}
    </>
  )
}

// ── Block renderer ────────────────────────────────────────────────────────────

function ContentBlock({ content }) {
  const lines = content.split('\n')
  const result = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code fence
    if (line.startsWith('```')) {
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      result.push(
        <pre key={`code-${i}`} style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '12px 14px',
          margin: '8px 0 4px',
          overflow: 'auto',
          lineHeight: 1.6,
          color: 'var(--text)',
        }}>
          {codeLines.join('\n')}
        </pre>
      )
      i++ // skip closing ```
      continue
    }

    // Table row
    if (line.trim().startsWith('|')) {
      const tableLines = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      const rows = tableLines.filter(l => !/^\s*\|[\s\-:|]+\|\s*$/.test(l))
      result.push(
        <div key={`tbl-${i}`} style={{ overflowX: 'auto', margin: '8px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <tbody>
              {rows.map((row, ri) => {
                const cells = row.split('|').filter((_, ci, arr) => ci > 0 && ci < arr.length - 1)
                const isHeader = ri === 0
                return (
                  <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
                    {cells.map((cell, ci) => (
                      <td key={ci} style={{
                        padding: '5px 10px',
                        fontWeight: isHeader ? 700 : 400,
                        fontSize: isHeader ? '0.65rem' : '0.78rem',
                        fontFamily: isHeader ? 'JetBrains Mono, monospace' : 'inherit',
                        textTransform: isHeader ? 'uppercase' : 'none',
                        letterSpacing: isHeader ? '0.06em' : 0,
                        color: isHeader ? 'var(--text-dim)' : 'var(--text)',
                      }}>
                        <Inline>{cell.trim()}</Inline>
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // Ordered list
    if (/^\d+\.\s/.test(line.trim())) {
      const items = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ''))
        i++
      }
      result.push(
        <ol key={`ol-${i}`} style={{ margin: '6px 0 4px', paddingLeft: 22 }}>
          {items.map((item, li) => (
            <li key={li} style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text)', marginBottom: 3 }}>
              <Inline>{item}</Inline>
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Unordered list
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const items = []
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        items.push(lines[i].trim().slice(2))
        i++
      }
      result.push(
        <ul key={`ul-${i}`} style={{ margin: '6px 0 4px', paddingLeft: 22 }}>
          {items.map((item, li) => (
            <li key={li} style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text)', marginBottom: 3 }}>
              <Inline>{item}</Inline>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Flag lines (🔴 🟡)
    if (line.startsWith('🔴') || line.startsWith('🟡')) {
      const isRed = line.startsWith('🔴')
      result.push(
        <div key={`flag-${i}`} style={{
          fontSize: 13,
          lineHeight: 1.6,
          padding: '5px 10px',
          borderRadius: 5,
          borderLeft: `3px solid ${isRed ? 'var(--danger)' : 'var(--warning)'}`,
          background: isRed ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)',
          color: 'var(--text)',
          marginBottom: 6,
        }}>
          <Inline>{line}</Inline>
        </div>
      )
      i++
      continue
    }

    // H3
    if (line.startsWith('### ')) {
      result.push(
        <div key={`h3-${i}`} style={{
          fontSize: 11,
          fontWeight: 700,
          fontFamily: 'JetBrains Mono, monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          color: 'var(--text-dim)',
          marginTop: 14,
          marginBottom: 6,
        }}>
          {line.slice(4)}
        </div>
      )
      i++
      continue
    }

    // Empty line
    if (!line.trim()) { i++; continue }

    // Paragraph
    result.push(
      <p key={`p-${i}`} style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text)', marginBottom: 8 }}>
        <Inline>{line}</Inline>
      </p>
    )
    i++
  }

  return <>{result}</>
}

// ── Section accent colours ────────────────────────────────────────────────────

const SECTION_ACCENT = {
  'Core Belief':      'var(--primary)',
  'Job':              'var(--success)',
  'Identity':         'var(--info)',
  'Primary ICP':      'var(--warning)',
  'Five Levers':      'var(--primary)',
  'For Every Intake': 'var(--info)',
  'Daily':            'var(--warning)',
  'Bia Standard':     'var(--success)',
  'Communication':    'var(--info)',
  'Data Sources':     'var(--text-dim)',
  'NEVER':            'var(--danger)',
}

function sectionAccent(title) {
  for (const [k, v] of Object.entries(SECTION_ACCENT)) {
    if (title.includes(k)) return v
  }
  return 'var(--primary)'
}

// ── MetaBadge ─────────────────────────────────────────────────────────────────

function MetaBadge({ label, color }) {
  if (!label) return null
  return (
    <span style={{
      fontSize: 10,
      fontFamily: 'JetBrains Mono, monospace',
      fontWeight: 600,
      background: 'var(--bg-elevated)',
      color: color || 'var(--text-dim)',
      border: '1px solid var(--border)',
      borderRadius: 4,
      padding: '2px 8px',
    }}>
      {label}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BiaScorecard() {
  const { fm, body } = parseFrontmatter(biaRaw)
  const sections = parseSections(body)

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        marginBottom: 28,
        paddingBottom: 24,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          flexShrink: 0,
        }}>
          🤖
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>{fm.name || 'Bia'}</h1>
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{fm.vertical || 'v5'}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}>
            {fm.tagline || fm.role}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <MetaBadge label={fm.model} />
            <MetaBadge label={fm.integrations ? `${fm.integrations} integrations` : null} />
            <MetaBadge label={fm.skills ? `${fm.skills} skills` : null} />
            <MetaBadge label={fm.recipes ? `${fm.recipes} recipes` : null} />
            <MetaBadge label={fm.status} color="var(--success)" />
            <MetaBadge label={fm.version ? `v${fm.version}` : null} />
          </div>
        </div>
      </div>

      {/* TOC + Content */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* TOC — sticky */}
        <aside style={{
          width: 156,
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          maxHeight: 'calc(100vh - 60px)',
          overflowY: 'auto',
          paddingRight: 4,
        }}>
          <div style={{
            fontSize: 9,
            fontWeight: 700,
            fontFamily: 'JetBrains Mono, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-dim)',
            marginBottom: 8,
          }}>
            Secções
          </div>
          {sections.map(s => {
            const accent = sectionAccent(s.title)
            return (
              <a
                key={s.slug}
                href={`#${s.slug}`}
                style={{
                  display: 'block',
                  fontSize: 12,
                  color: 'var(--text-dim)',
                  textDecoration: 'none',
                  padding: '4px 0 4px 9px',
                  borderLeft: '2px solid transparent',
                  lineHeight: 1.4,
                  transition: 'color 0.1s, border-color 0.1s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--text)'
                  e.currentTarget.style.borderLeftColor = accent
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--text-dim)'
                  e.currentTarget.style.borderLeftColor = 'transparent'
                }}
              >
                {s.title}
              </a>
            )
          })}
        </aside>

        {/* Sections */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {sections.map(s => {
            const accent = sectionAccent(s.title)
            const isNever = s.title === 'NEVER'
            return (
              <div
                key={s.slug}
                id={s.slug}
                style={{
                  marginBottom: 14,
                  background: isNever ? 'rgba(239,68,68,0.04)' : 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderLeft: `3px solid ${accent}`,
                  borderRadius: 8,
                  padding: '14px 18px',
                }}
              >
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono, monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: accent,
                  marginBottom: 10,
                }}>
                  {s.title}
                </div>
                <ContentBlock content={s.content} />
              </div>
            )
          })}

          {/* Footer: costs + tech debt */}
          <div style={{
            marginTop: 4,
            padding: '14px 18px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            borderLeft: '3px solid var(--text-dim)',
          }}>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-dim)',
              marginBottom: 10,
            }}>
              Custos & Tech Debt
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 10 }}>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: 'var(--text-dim)' }}>Sprint 1E: </span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{fm.cost_1e || '~$5/mês'}</span>
              </div>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: 'var(--text-dim)' }}>Sprint 1F: </span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{fm.cost_1f || '~$25/mês'}</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              Tech debt: Gmail integration (Sprint 1F) · Voice TTS (Sprint 1F+) · Prompt cache (reduz 60-70% custo)
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
