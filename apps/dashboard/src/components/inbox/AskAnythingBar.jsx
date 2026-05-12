// AskAnythingBar — bottom bar global no inbox (Sprint B Fase B3)
import { useState } from 'react'
import { useNotificationsStore } from '../../store'

const LIVE_EMPLOYEES = [
  { id: 'bia', label: 'Bia · V5 Manutenção', live: true },
]
const COMING_SOON = [
  { id: 'orquestrador', label: 'Orquestrador · V2 Condo' },
  { id: 'diretor-marketing', label: 'Diretor · Marketing' },
]

export default function AskAnythingBar() {
  const [prompt, setPrompt] = useState('')
  const [employeeId, setEmployeeId] = useState('bia')
  const [running, setRunning] = useState(false)
  const addToast = useNotificationsStore(s => s.addToast)

  async function handleSubmit(e) {
    e?.preventDefault?.()
    if (!prompt.trim() || running) return
    setRunning(true)
    try {
      const isLive = LIVE_EMPLOYEES.some(e => e.id === employeeId)
      if (!isLive) {
        addToast({ type: 'info', message: `${employeeId} chat live: Sprint C.` })
        return
      }
      // Sprint B placeholder: free-form chat ainda não está em bia-chat
      // Vai à página /employees/bia para 3 tasks estruturadas
      addToast({
        type: 'info',
        message: 'Free-form chat: Sprint C. Para tasks estruturadas vai a /employees/bia',
      })
      setPrompt('')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{
      position: 'sticky', bottom: 0, left: 0, right: 0,
      background: 'var(--bg)', borderTop: '1px solid var(--border)',
      padding: '10px 14px', marginTop: 20,
    }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <select value={employeeId} onChange={e => setEmployeeId(e.target.value)}
          style={{
            padding: '7px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 5, fontSize: '0.74rem', color: 'var(--text)',
            outline: 'none', minWidth: 180,
          }}>
          <optgroup label="Live">
            {LIVE_EMPLOYEES.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
          </optgroup>
          <optgroup label="Em construção (Sprint C)">
            {COMING_SOON.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
          </optgroup>
        </select>

        <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder="Ask anything…  ( pergunta a um employee )"
          disabled={running} maxLength={500}
          style={{
            flex: 1, padding: '7px 12px',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 5, fontSize: '0.8rem', color: 'var(--text)', outline: 'none',
          }} />

        <button type="submit" disabled={running || !prompt.trim()}
          style={{
            padding: '7px 16px',
            background: prompt.trim() ? 'var(--primary)' : 'var(--bg-card)',
            color: prompt.trim() ? '#fff' : 'var(--text-dim)',
            border: 'none', borderRadius: 5,
            fontSize: '0.78rem', fontWeight: 600,
            cursor: prompt.trim() ? 'pointer' : 'not-allowed',
          }}>
          {running ? '…' : 'Ask'}
        </button>
      </form>
    </div>
  )
}
