// useClientFlowSteps — lista + CRUD steps de um cliente
// Sprint Q3

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export function useClientFlowSteps(clientId) {
  const [steps, setSteps] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase || !clientId) { setLoading(false); setSteps([]); return }
    setLoading(true)
    const { data } = await supabase.from('system_client_flow_steps')
      .select('*')
      .eq('client_id', clientId)
      .order('step_index', { ascending: true })
    setSteps(data || [])
    setLoading(false)
  }, [clientId])

  useEffect(() => { fetch() }, [fetch])

  const createFromTemplate = useCallback(async (templateSlug) => {
    if (!supabase || !clientId) return 0
    const { data, error } = await supabase.schema('system').rpc('client_flow_create_from_template', {
      p_client_id: clientId,
      p_template_slug: templateSlug,
    })
    if (error) return 0
    await fetch()
    return data || 0
  }, [clientId, fetch])

  const updateStep = useCallback(async (stepId, patch) => {
    if (!supabase) return false
    const { data, error } = await supabase.schema('system').rpc('client_flow_step_update', {
      p_step_id: stepId,
      p_status: patch.status ?? null,
      p_form_responses: patch.form_responses ?? null,
      p_label: patch.label ?? null,
      p_config: patch.config ?? null,
    })
    if (error) return false
    await fetch()
    return data
  }, [fetch])

  const addStep = useCallback(async (step) => {
    if (!supabase || !clientId) return false
    const maxIndex = steps.reduce((m, s) => Math.max(m, s.step_index), 0)
    const { error } = await supabase.from('system_client_flow_steps').insert({
      client_id: clientId,
      step_index: maxIndex + 1,
      label: step.label || 'Novo step',
      type: step.type || 'custom',
      required: step.required ?? true,
      config: step.config || {},
    })
    if (error) return false
    await fetch()
    return true
  }, [clientId, steps, fetch])

  const removeStep = useCallback(async (stepId) => {
    if (!supabase) return false
    const { error } = await supabase.from('system_client_flow_steps').delete().eq('id', stepId)
    if (!error) await fetch()
    return !error
  }, [fetch])

  const reorderSteps = useCallback(async (newOrder) => {
    // newOrder: array de step ids na nova ordem
    if (!supabase) return false
    for (let i = 0; i < newOrder.length; i++) {
      await supabase.from('system_client_flow_steps')
        .update({ step_index: i + 1 })
        .eq('id', newOrder[i])
    }
    await fetch()
    return true
  }, [fetch])

  // Progress %: done / total
  const progress = steps.length === 0 ? 0
    : Math.round((steps.filter(s => s.status === 'done').length / steps.length) * 100)

  return { steps, loading, progress, refresh: fetch, createFromTemplate, updateStep, addStep, removeStep, reorderSteps }
}
