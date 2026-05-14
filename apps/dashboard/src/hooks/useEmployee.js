import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useNotificationsStore } from '../store'

// Hook para correr tasks contra edge functions de employees (Bia, etc.)
// API: const { running, lastResult, runTask } = useEmployee('bia')
//      runTask('outreach_compose', { pessoa_id: '...' })
//      → { success, approval_id?, message, session_id, iterations, cost_eur }
export function useEmployee(employeeId = 'bia') {
  const [running, setRunning] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const addToast = useNotificationsStore(s => s.addToast)

  const runTask = useCallback(async (taskType, payload = {}) => {
    if (!supabase) {
      const err = 'Supabase client não inicializado (env vars em falta)'
      addToast({ type: 'error', message: err })
      return { success: false, error: err }
    }

    setRunning(true)
    setLastResult(null)
    try {
      const fnSlug = `${employeeId}-chat`
      const { data, error } = await supabase.functions.invoke(fnSlug, {
        body: { task_type: taskType, payload },
      })
      if (error) {
        const msg = error.message || String(error)
        addToast({ type: 'error', message: `${employeeId} falhou: ${msg}` })
        const result = { success: false, error: msg }
        setLastResult(result)
        return result
      }
      // data já é o JSON parseado
      const result = data ?? { success: false, error: 'Resposta vazia' }
      setLastResult(result)

      if (result.success === false) {
        addToast({ type: 'error', message: `${employeeId}: ${result.error ?? 'erro desconhecido'}` })
      } else {
        // Para outreach/triagem, espera-se approval; para roundup, inbox item
        const approvalRef = extractApprovalId(result)
        addToast({
          type: 'success',
          message: approvalRef
            ? `Approval criada (${approvalRef.slice(0, 8)}…). Decide no dashboard.`
            : `Task ${taskType} concluída.`,
        })
      }
      return result
    } catch (err) {
      const msg = err?.message ?? String(err)
      addToast({ type: 'error', message: `Excepção: ${msg}` })
      const result = { success: false, error: msg }
      setLastResult(result)
      return result
    } finally {
      setRunning(false)
    }
  }, [employeeId, addToast])

  return { running, lastResult, runTask }
}

// O bia-chat devolve approval_id dentro do tool_output do submit_approval,
// mas no objecto top-level só temos message + session_id. Para extrair o
// approval criado, usamos o session_id e fazemos SELECT directo se necessário.
// Por agora, o front mostra apenas message + pede ao Mário verificar /approvals.
function extractApprovalId(result) {
  // Procura padrão "approval_id":"<uuid>" no message ou retorna null
  if (!result?.message) return null
  const m = String(result.message).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  return m ? m[0] : null
}

// Hook auxiliar: buscar approval associada a uma session de bia-chat
// (caso queiramos mostrar o draft directamente no TaskResultDrawer)
export async function fetchApprovalForSession(sessionId) {
  if (!supabase || !sessionId) return null
  // Atalho: a approval criada na mesma sessão é a mais recente do source_agent='bia'
  // criada nos últimos 5 minutos. Não há FK direct para session_id.
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .schema('system')
    .from('approvals_queue')
    .select('id, action_type, target_vertical, pedido_orcamento_id, draft_message, classification, prestador_suggested, status, created_at')
    .eq('source_agent', 'bia')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.warn('[fetchApprovalForSession]', error.message)
    return null
  }
  return data
}
