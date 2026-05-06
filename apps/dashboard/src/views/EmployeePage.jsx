import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import SkillModal from '../components/SkillModal.jsx'
import RecipeModal from '../components/RecipeModal.jsx'
import EmployeeHeader from '../components/EmployeeHeader.jsx'

const TRIGGER_COLORS = {
  event:    { bg: 'rgba(59,130,246,0.12)',  color: 'var(--info)',     label: 'EVENT'  },
  schedule: { bg: 'rgba(245,158,11,0.12)',  color: 'var(--warning)', label: 'CRON'   },
  manual:   { bg: 'rgba(107,114,128,0.15)', color: 'var(--text-dim)',label: 'MANUAL' },
}

function TriggerBadge({ trigger }) {
  const t = TRIGGER_COLORS[trigger] || TRIGGER_COLORS.manual
  return (
    <span style={{
      padding: '2px 7px', borderRadius: 4, fontSize: '0.58rem', fontWeight: 700,
      fontFamily: 'monospace', background: t.bg, color: t.color,
      textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
    }}>{t.label}</span>
  )
}

function SectionCard({ title, action, children }) {
  return (
    <div style={{
      background: 'var(--bg-card-soft)', border: '1px solid var(--border-soft)',
      borderRadius: 10, overflow: 'hidden', marginBottom: 12,
    }}>
      <div style={{
        padding: '8px 16px', borderBottom: '1px solid var(--border-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: '0.6rem', fontWeight: 700, fontFamily: 'monospace',
          textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)',
        }}>{title}</span>
        {action}
      </div>
      <div>{children}</div>
    </div>
  )
}

function Toggle({ on }) {
  return (
    <div style={{
      width: 28, height: 16, borderRadius: 8, flexShrink: 0,
      background: on ? 'var(--success)' : 'var(--border)',
      position: 'relative', transition: 'background 0.15s',
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 14 : 2,
        width: 12, height: 12, borderRadius: '50%',
        background: '#fff', transition: 'left 0.15s',
      }} />
    </div>
  )
}

function MarkdownProse({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  const elements = []
  let i = 0
  let inFrontmatter = false

  if (lines[0] === '---') { inFrontmatter = true; i = 1 }

  while (i < lines.length) {
    const line = lines[i]
    if (inFrontmatter) {
      if (line === '---') inFrontmatter = false
      i++; continue
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} style={{ fontSize: '0.68rem', fontWeight: 700, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', margin: '14px 0 6px', paddingTop: 10, borderTop: '1px solid var(--border-soft)' }}>{line.slice(3)}</h2>)
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text)', margin: '8px 0 4px' }}>{line.slice(4)}</h3>)
    } else if (line.startsWith('---')) {
      elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border-soft)', margin: '10px 0' }} />)
    } else if (line.startsWith('- ')) {
      elements.push(
        <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.5, margin: '2px 0' }}>
          <span style={{ color: 'var(--primary)', flexShrink: 0 }}>·</span>
          <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text)">$1</strong>') }} />
        </div>
      )
    } else if (line.match(/^\d+\.\s/)) {
      elements.push(
        <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.5, margin: '2px 0' }}>
          <span style={{ color: 'var(--primary)', fontWeight: 600, flexShrink: 0, minWidth: 16 }}>{line.match(/^(\d+)\./)[1]}.</span>
          <span dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        </div>
      )
    } else if (line.startsWith('```')) {
      const codeLines = []; i++
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++ }
      elements.push(<pre key={`code-${i}`} style={{ background: 'var(--bg-card-elevated)', border: '1px solid var(--border-soft)', borderRadius: 6, padding: '8px 12px', fontSize: '0.68rem', fontFamily: 'monospace', color: 'var(--text)', margin: '6px 0', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>{codeLines.join('\n')}</pre>)
    } else if (line.trim() !== '') {
      elements.push(
        <p key={i} style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.6, margin: '4px 0' }}
          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text)">$1</strong>').replace(/`(.*?)`/g, '<code style="font-family:monospace;font-size:0.7rem;background:var(--bg-card-elevated);padding:1px 4px;border-radius:3px;color:var(--info)">$1</code>') }}
        />
      )
    }
    i++
  }
  return <div>{elements}</div>
}

const PREVIEW_LEN = 400

export default function EmployeePage({ data }) {
  const { slug } = useParams()
  const [expanded, setExpanded] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState('')
  const [selectedSkill, setSelectedSkill] = useState(null)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const emp = data?.employees?.find(e => e.id === slug)

  if (!emp) {
    return (
      <div>
        <Link to="/employees" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textDecoration: 'none' }}>← Equipa</Link>
        <div className="empty" style={{ marginTop: 20 }}>Employee não encontrado: {slug}</div>
      </div>
    )
  }

  const enabledCount = emp.integrations?.filter(i => i.enabled && !i.planned).length ?? 0
  const totalInteg = emp.integrations?.length ?? 0
  const mdText = emp._mdRaw || ''
  const needsExpand = mdText.length > PREVIEW_LEN

  const openSkill = (skill) => {
    const full = data?.skills?.find(s => s.id === skill.id) || { ...skill, usedBy: [{ id: emp.id, name: emp.name }] }
    setSelectedSkill(full)
  }

  const openRecipe = (recipe) => {
    setSelectedRecipe({ ...recipe, ownerId: emp.id, ownerName: emp.name })
  }

  const btnSmall = { background: 'none', border: '1px solid var(--border-soft)', borderRadius: 5, padding: '2px 8px', cursor: 'pointer', fontSize: '0.62rem', color: 'var(--text-dim)' }

  return (
    <div style={{ maxWidth: 1400 }}>
      {selectedSkill && <SkillModal skill={selectedSkill} onClose={() => setSelectedSkill(null)} />}
      {selectedRecipe && <RecipeModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />}

      <Link to="/employees" style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textDecoration: 'none', display: 'inline-block', marginBottom: 14 }}>← Equipa</Link>

      <EmployeeHeader emp={emp} />

      {/* 2-COLUMN GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 320px',
        gap: 24,
        alignItems: 'start',
      }}>

        {/* LEFT COLUMN */}
        <div>
          {/* 4 KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'Messages 7D',       value: '—', sub: 'No data yet' },
              { label: 'Approvals pending', value: '—', sub: 'aguardam'    },
              { label: 'Approval rate',     value: '—', sub: 'últimos 30d' },
              { label: 'Cost 30D',          value: emp.cost ? `$${emp.cost.current}` : '—', sub: 'USD' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg-card-soft)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: '0.52rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text)' }}>{s.value}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Instructions */}
          <SectionCard
            title="📄  Instructions"
            action={editMode ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setEditMode(false)} style={btnSmall}>Cancel</button>
                <button onClick={() => setEditMode(false)} style={{ ...btnSmall, background: 'var(--primary)', border: 'none', color: '#fff' }}>Save</button>
              </div>
            ) : (
              <button onClick={() => { setEditMode(true); setDraft(mdText) }} style={btnSmall}>Edit ✏</button>
            )}
          >
            {editMode ? (
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', minHeight: 400, padding: 14, background: 'var(--bg-card-elevated)', border: 'none', resize: 'vertical', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text)', outline: 'none' }}
              />
            ) : (
              <div style={{ padding: '12px 16px' }}>
                {mdText ? (
                  <>
                    <MarkdownProse text={needsExpand && !expanded ? mdText.slice(0, PREVIEW_LEN) + '…' : mdText} />
                    {needsExpand && (
                      <button onClick={() => setExpanded(p => !p)} style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.65rem', color: 'var(--primary)', padding: 0 }}>
                        {expanded ? 'Show less ↑' : 'Show more ↓'}
                      </button>
                    )}
                  </>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    Ficheiro .md não disponível em .claude/employees/{slug}.md
                  </span>
                )}
              </div>
            )}
          </SectionCard>

          {/* Integrations — left column after Instructions */}
          {emp.integrations?.length > 0 && (
            <SectionCard title={`Integrations · ${enabledCount}/${totalInteg}`}>
              {emp.integrations.map(integ => (
                <div key={integ.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: '1px solid var(--border-soft)' }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                    background: 'var(--bg-card-elevated)', border: '1px solid var(--border-soft)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.48rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-dim)',
                  }}>{integ.icon || integ.id.slice(0, 2).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: integ.enabled && !integ.planned ? 'var(--text)' : 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{integ.name}</div>
                  </div>
                  {integ.planned && (
                    <span style={{ fontSize: '0.5rem', padding: '1px 4px', borderRadius: 3, background: 'rgba(245,158,11,0.12)', color: 'var(--warning)', fontWeight: 600, flexShrink: 0 }}>plan</span>
                  )}
                  <Toggle on={integ.enabled && !integ.planned} />
                </div>
              ))}
            </SectionCard>
          )}

          {/* Peer Reads */}
          {emp.peerReads?.length > 0 && (
            <SectionCard title="Colabora com">
              {emp.peerReads.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 16px', borderBottom: '1px solid var(--border-soft)', fontSize: '0.72rem' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.6rem', fontWeight: 700, color: p.stage === 'current' ? 'var(--primary)' : 'var(--text-dim)', width: 70, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.stage}</span>
                  <span style={{ color: 'var(--text-dim)' }}>{p.value}</span>
                </div>
              ))}
            </SectionCard>
          )}
        </div>

        {/* RIGHT COLUMN — sticky */}
        <div style={{
          position: 'sticky',
          top: 24,
          alignSelf: 'start',
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
        }}>
          {/* Quick stats */}
          <div style={{
            background: 'var(--bg-card-soft)', border: '1px solid var(--border-soft)',
            borderRadius: 10, marginBottom: 12, display: 'flex',
          }}>
            {[
              { label: 'Integrations', value: totalInteg },
              { label: 'Skills',       value: emp.skills?.length ?? 0 },
              { label: 'Recipes',      value: emp.recipes?.length ?? 0 },
              { label: '$/mo',         value: emp.cost ? `$${emp.cost.current}` : '—', color: emp.cost ? 'var(--warning)' : undefined },
            ].map((stat, i, arr) => (
              <div key={stat.label} style={{ flex: 1, textAlign: 'center', padding: '12px 8px', borderRight: i < arr.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace', color: stat.color || 'var(--text)' }}>{stat.value}</div>
                <div style={{ fontSize: '0.5rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Skills */}
          {emp.skills?.length > 0 && (
            <SectionCard title={`Skills · ${emp.skills.length}`}>
              {emp.skills.map(s => (
                <div
                  key={s.id}
                  onClick={() => openSkill(s)}
                  style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-soft)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <code style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--info)', display: 'block', marginBottom: s.desc ? 2 : 0 }}>{s.id}</code>
                  {s.desc && (
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: 1.4, display: 'block' }}>{s.desc}</span>
                  )}
                </div>
              ))}
            </SectionCard>
          )}

          {/* Recipes */}
          {emp.recipes?.length > 0 && (
            <SectionCard title={`Recipes · ${emp.recipes.length}`}>
              {emp.recipes.map(r => (
                <div
                  key={r.id}
                  onClick={() => openRecipe(r)}
                  style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-soft)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <TriggerBadge trigger={r.trigger} />
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{r.id}</span>
                  </div>
                  {r.trigger_label && (
                    <div style={{ fontSize: '0.58rem', color: 'var(--text-dim)', fontFamily: 'monospace', marginBottom: r.desc ? 3 : 0 }}>{r.trigger_label}</div>
                  )}
                  {r.desc && (
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: 1.4, display: 'block' }}>{r.desc}</span>
                  )}
                </div>
              ))}
            </SectionCard>
          )}
        </div>

      </div>
    </div>
  )
}
