import { useState, useEffect, useCallback } from 'react'
import biaRaw from '../../../../.claude/employees/bia.md?raw'

const DRAFT_KEY = 'bia:instructions:draft'

export function useBiaInstructions() {
  const [mode, setMode] = useState('view')
  const [draft, setDraft] = useState(biaRaw)
  const [saved, setSaved] = useState(biaRaw)

  const startEdit = useCallback(() => {
    const stored = sessionStorage.getItem(DRAFT_KEY)
    setDraft(stored ?? saved)
    setMode('edit')
  }, [saved])

  const cancel = useCallback(() => {
    setMode('view')
  }, [])

  const save = useCallback((currentDraft) => {
    // Phase 5.5: persist via system.employee_definitions versioning
    console.warn('[useBiaInstructions] mock save — Phase 5.5', currentDraft.slice(0, 80))
    sessionStorage.removeItem(DRAFT_KEY)
    setSaved(currentDraft)
    setMode('view')
  }, [])

  const updateDraft = useCallback((value) => {
    setDraft(value)
    sessionStorage.setItem(DRAFT_KEY, value)
  }, [])

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
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        save(draft)
      }
      if (e.key === 'Escape') cancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, draft, save, cancel])

  return { mode, draft, saved, diff, charCount, startEdit, cancel, save, updateDraft }
}
