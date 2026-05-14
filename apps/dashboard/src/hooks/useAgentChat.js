// useAgentChat — cliente HTTP para edge function agent-chat
// Mantém histórico in-session (não persistido entre reloads — usar localStorage opcional)

import { useCallback, useState } from 'react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY
const ENDPOINT     = `${SUPABASE_URL}/functions/v1/agent-chat`

export function useAgentChat() {
  const [messages, setMessages] = useState([])
  const [pending, setPending]   = useState(false)
  const [error, setError]       = useState(null)

  const send = useCallback(async (text, context = null) => {
    if (!text?.trim() || pending) return
    setError(null)
    const userMsg = { role: 'user', content: text.trim(), ts: Date.now() }
    setMessages(m => [...m, userMsg])
    setPending(true)
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
          'apikey': ANON_KEY,
        },
        body: JSON.stringify({
          message: text,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          context: context || undefined,
        }),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`)
      }
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages(m => [...m, {
        role: 'assistant',
        content: data.reply || '(sem resposta)',
        tool_calls: data.tool_calls || [],
        ts: Date.now(),
      }])
    } catch (e) {
      setError(String(e))
      setMessages(m => [...m, {
        role: 'assistant',
        content: `⚠ Erro: ${e.message}`,
        error: true,
        ts: Date.now(),
      }])
    } finally {
      setPending(false)
    }
  }, [messages, pending])

  const clear = useCallback(() => { setMessages([]); setError(null) }, [])

  return { messages, send, pending, error, clear }
}
