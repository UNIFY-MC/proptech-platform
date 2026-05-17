// EmployeeInstructions — visualização + edição inline de instructions
// Recebe o objecto retornado por useEmployeeInstructions(agentId)

import { useState } from 'react'

const PREVIEW_LEN = 500

function MarkdownProse({ text }) {
  if (!text) return null
  const lines    = text.split('\n')
  const elements = []
  let i             = 0
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

export default function EmployeeInstructions({ mode, draft, saved, diff, charCount, startEdit, cancel, save, updateDraft, loading, agentId }) {
  const isEditing  = mode === 'edit'
  const text       = isEditing ? draft : saved
  const needsExpand = text.length > PREVIEW_LEN

  const btnSmall = {
    background: 'none', border: '1px solid var(--border-soft)',
    borderRadius: 5, padding: '2px 8px', cursor: 'pointer',
    fontSize: '0.62rem', color: 'var(--text-dim)',
  }

  return (
    <div className="bia-intg" style={{ marginBottom: 12 }}>
      <div className="bia-intg-head">
        <span className="bia-intg-label">
          <span style={{ fontSize: 14 }}>📄</span>
          <span>Instructions</span>
          {isEditing && (
            <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8 }}>
              +{diff.added} -{diff.removed} linhas · {charCount} chars
            </span>
          )}
        </span>
        {isEditing ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={cancel} style={btnSmall}>Cancelar</button>
            <button
              onClick={() => save(draft)}
              style={{ ...btnSmall, background: 'var(--primary)', border: 'none', color: '#fff' }}
            >Guardar</button>
          </div>
        ) : (
          <button onClick={startEdit} style={btnSmall}>Editar ✏</button>
        )}
      </div>

      {isEditing ? (
        <textarea
          value={draft}
          onChange={e => updateDraft(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box', minHeight: 380,
            padding: 14, background: 'var(--bg-card-elevated)',
            border: 'none', resize: 'vertical', fontSize: '0.75rem',
            fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)', outline: 'none',
          }}
        />
      ) : (
        <div style={{ padding: '12px 16px' }}>
          {loading ? (
            <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>A carregar instructions…</div>
          ) : text ? (
            <ExpandableText text={text} maxLen={PREVIEW_LEN} />
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
              Sem instructions definidas para <code style={{ fontFamily: 'JetBrains Mono, monospace' }}>{agentId}</code> em system.agent_profile.
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function ExpandableText({ text, maxLen }) {
  const [expanded, setExpanded] = useState(false)
  const needsExpand = text.length > maxLen
  const display     = needsExpand && !expanded ? text.slice(0, maxLen) + '…' : text

  return (
    <>
      <MarkdownProse text={display} />
      {needsExpand && (
        <button
          onClick={() => setExpanded(p => !p)}
          style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.65rem', color: 'var(--primary)', padding: 0 }}
        >
          {expanded ? 'Mostrar menos ↑' : 'Mostrar mais ↓'}
        </button>
      )}
    </>
  )
}
