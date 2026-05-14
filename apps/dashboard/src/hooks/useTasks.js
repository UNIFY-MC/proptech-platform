// useTasks — CRUD básico para system.tasks via PostgREST + RPCs
// API:
//   const { tasks, loading, error, createTask, updateStatus, assign, refresh } = useTasks({ vertical, status })

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export function useTasks({ vertical = null, status = null, ownerAgent = null } = {}) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    let q = supabase.from('system_tasks').select('*').order('created_at', { ascending: false })
    if (vertical) q = q.ilike('vertical', vertical)  // case-insensitive: V2 == v2
    if (status)   q = q.eq('status', status)
    if (ownerAgent) q = q.eq('owner_agent_id', ownerAgent)
    const { data, error } = await q
    if (error) setError(error.message)
    else setTasks(data || [])
    setLoading(false)
  }, [vertical, status, ownerAgent])

  useEffect(() => { fetch() }, [fetch])

  // Realtime: re-fetch on any change
  useEffect(() => {
    if (!supabase) return
    const ch = supabase
      .channel(`tasks-${Math.random().toString(36).slice(2, 7)}`)
      .on('postgres_changes', { event: '*', schema: 'system', table: 'tasks' }, () => fetch())
      .subscribe()
    return () => { try { supabase.removeChannel(ch) } catch {} }
  }, [fetch])

  const createTask = useCallback(async (input) => {
    if (!supabase) return null
    const { data, error } = await supabase.schema('system').rpc('task_create', {
      p_title:          input.title,
      p_description_md: input.description_md || null,
      p_kind:           input.kind || 'task',
      p_priority:       input.priority || 'normal',
      p_vertical:       input.vertical || null,
      p_owner_agent_id: input.owner_agent_id || null,
      p_owner_user_id:  input.owner_user_id || null,
      p_due_at:         input.due_at || null,
      p_source_kind:    input.source_kind || 'manual',
      p_source_id:      input.source_id || null,
      p_payload:        input.payload || {},
      p_tags:           input.tags || [],
    })
    if (error) { console.warn('[useTasks] create failed', error); return null }
    await fetch()
    return data  // uuid
  }, [fetch])

  const updateStatus = useCallback(async (taskId, status) => {
    if (!supabase) return
    const { error } = await supabase.schema('system').rpc('task_update_status', {
      p_task_id: taskId, p_status: status,
    })
    if (error) console.warn('[useTasks] update_status failed', error)
    await fetch()
  }, [fetch])

  const assign = useCallback(async (taskId, { agentId = null, userId = null } = {}) => {
    if (!supabase) return
    const { error } = await supabase.schema('system').rpc('task_assign', {
      p_task_id: taskId, p_owner_agent_id: agentId, p_owner_user_id: userId,
    })
    if (error) console.warn('[useTasks] assign failed', error)
    await fetch()
  }, [fetch])

  return { tasks, loading, error, createTask, updateStatus, assign, refresh: fetch }
}
