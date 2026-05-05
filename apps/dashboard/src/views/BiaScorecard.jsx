import biaRaw from '../../../../.claude/employees/bia.md?raw'
import biaMeta from '../../../../.claude/employees/bia.meta.json'
import BiaHeader from '../components/bia/BiaHeader'
import BiaTOC from '../components/bia/BiaTOC'
import BiaMetaSidebar from '../components/bia/BiaMetaSidebar'

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
      return { id: slug(title), title, content: part.slice(nl + 1).trim() }
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
      i++
      continue
    }

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

    if (!line.trim()) { i++; continue }

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

// ── Main component ────────────────────────────────────────────────────────────

export default function BiaScorecard() {
  const { body } = parseFrontmatter(biaRaw)
  const sections = parseSections(body)

  return (
    <div className="bia-page">
      <BiaHeader meta={biaMeta} />

      <div className="bia-layout">
        <BiaTOC sections={sections} />

        <main className="bia-content">
          {sections.map(s => {
            const accent = sectionAccent(s.title)
            return (
              <div
                key={s.id}
                id={s.id}
                className="bia-section"
                style={{
                  borderLeftColor: accent,
                  background: s.title === 'NEVER' ? 'rgba(239,68,68,0.04)' : 'var(--bia-surface)',
                }}
              >
                <div className="bia-section-title" style={{ color: accent }}>
                  {s.title}
                </div>
                <ContentBlock content={s.content} />
              </div>
            )
          })}
        </main>

        <BiaMetaSidebar meta={biaMeta} />
      </div>
    </div>
  )
}
