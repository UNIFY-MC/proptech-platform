// useAgentChat — cliente HTTP para edge function agent-chat
// Sprint Q1.5: persistência via system.chat_threads + system.chat_messages.
// API: useAgentChat(employeeId) → { messages, send, pending, error,
//                                    clear, threadId, openThread, newThread }

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY
const ENDPOINT     = `${SUPABASE_URL}/functions/v1/agent-chat`

export function useAgentChat(employeeId) {
  const [messages, setMessages] = useState([])
  const [pending, setPending]   = useState(false)
  const [error, setError]       = useState(null)
  const [threadId, setThreadId] = useState(null)

  // Carrega mensagens de uma thread específica
  const loadThread = useCallback(async (tid) => {
    if (!supabase || !tid) return
    setThreadId(tid)
    const { data, error: e } = await supabase
      .from('system_chat_messages')
      .select('*')
      .eq('thread_id', tid)
      .order('created_at', { ascending: true })
    if (e) { setError(e.message); return }
    setMessages((data || []).map(m => ({
      role: m.role,
      content: m.content,
      tool_calls: m.tool_calls || [],
      agent_id: m.metadata?.agent,
      auto_routed: m.metadata?.auto_routed,
      ts: new Date(m.created_at).getTime(),
    })))
  }, [])

  // Abre thread "current" do agent (ou nova se a última >6h)
  const openThread = useCallback(async () => {
    if (!supabase || !employeeId) return
    const { data: tid, error: e } = await supabase.schema('system').rpc('chat_thread_open', {
      p_employee_id: employeeId,
      p_force_new: false,
    })
    if (e) { setError(e.message); return }
    if (tid) await loadThread(tid)
  }, [employeeId, loadThread])

  // Força criação de nova thread
  const newThread = useCallback(async () => {
    if (!supabase || !employeeId) return
    const { data: tid, error: e } = await supabase.schema('system').rpc('chat_thread_open', {
      p_employee_id: employeeId,
      p_force_new: true,
    })
    if (e) { setError(e.message); return }
    setThreadId(tid)
    setMessages([])
  }, [employeeId])

  // Auto-abre thread quando employeeId muda
  useEffect(() => {
    if (employeeId) openThread()
  }, [employeeId, openThread])

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
          context: context || (employeeId ? { active_employee_id: employeeId } : undefined),
          thread_id: threadId,
        }),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`)
      }
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      // Edge fn devolve thread_id (pode ter criado uma nova)
      if (data.thread_id && data.thread_id !== threadId) setThreadId(data.thread_id)
      setMessages(m => [...m, {
        role: 'assistant',
        content: data.reply || '(sem resposta)',
        tool_calls: data.tool_calls || [],
        agent_id: data.agent_id,
        auto_routed: data.auto_routed,
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
  }, [messages, pending, threadId, employeeId])

  const clear = useCallback(() => { setMessages([]); setError(null) }, [])

  return { messages, send, pending, error, clear, threadId, openThread, newThread, loadThread }
}
