// useEmployeeInstructions — lê + edita system.agent_profile.instructions
// Versão generalizada de useBiaInstructions. Aceita qualquer agentId.

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useEmployeeInstructions(agentId) {
  const DRAFT_KEY = `${agentId}:instructions:draft`

  const [mode, setMode]       = useState('view')
  const [saved, setSaved]     = useState('')
  const [draft, setDraft]     = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!agentId || !supabase) { setLoading(false); return }
    let active = true
    async function load() {
      try {
        const { data, error } = await supabase
          .schema('system')
          .from('agent_profile')
          .select('instructions')
          .eq('agent_id', agentId)
          .maybeSingle()
        if (!active) return
        if (error) throw error
        const text = data?.instructions || ''
        setSaved(text)
        setDraft(text)
      } catch (err) {
        console.error('[useEmployeeInstructions] load', agentId, err)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [agentId])

  const startEdit = useCallback(() => {
    const stored = sessionStorage.getItem(DRAFT_KEY)
    setDraft(stored ?? saved)
    setMode('edit')
  }, [saved, DRAFT_KEY])

  const cancel = useCallback(() => {
    setMode('view')
    setDraft(saved)
  }, [saved])

  const save = useCallback(async (currentDraft) => {
    if (!supabase) { console.warn('[useEmployeeInstructions] no supabase'); return }
    try {
      const { error } = await supabase
        .schema('system')
        .from('agent_profile')
        .update({ instructions: currentDraft, updated_at: new Date().toISOString() })
        .eq('agent_id', agentId)
      if (error) throw error
      sessionStorage.removeItem(DRAFT_KEY)
      setSaved(currentDraft)
      setMode('view')
    } catch (err) {
      console.error('[useEmployeeInstructions] save', agentId, err)
      alert('Não foi possível guardar. Provavelmente faltam permissões UPDATE (RLS).')
    }
  }, [agentId, DRAFT_KEY])

  const updateDraft = useCallback((value) => {
    setDraft(value)
    sessionStorage.setItem(DRAFT_KEY, value)
  }, [DRAFT_KEY])

  const diff = (() => {
    const savedLines = saved.split('\n').length
    const draftLines = draft.split('\n').length
    return {
      added:   Math.max(0, draftLines - savedLines),
      removed: Math.max(0, savedLines - draftLines),
    }
  })()

  const charCount = draft.length

  useEffect(() => {
    if (mode !== 'edit') return
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save(draft) }
      if (e.key === 'Escape') cancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, draft, save, cancel])

  return { mode, draft, saved, diff, charCount, loading, startEdit, cancel, save, updateDraft }
}
