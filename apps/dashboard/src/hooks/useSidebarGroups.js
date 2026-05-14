// useSidebarGroups — gere expand/collapse state dos grupos colapsáveis da sidebar
// Persiste em localStorage para sobreviver a reload

import { useEffect, useState, useCallback } from 'react'

const STORAGE_KEY = 'dashboard:sidebar-groups'

// Grupos abertos por defeito (1ª visita ou cache miss)
const DEFAULTS = {
  daily: true,
  departments: true,
  growth: false,
  manage: false,
  build: false,
  strategy: true,
  settings: false,
  dev: false,
}

function readState() {
  if (typeof localStorage === 'undefined') return DEFAULTS
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(stored) }
  } catch {
    return DEFAULTS
  }
}

function writeState(state) {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
}

export function useSidebarGroups() {
  const [groups, setGroups] = useState(readState)

  useEffect(() => { writeState(groups) }, [groups])

  const toggle = useCallback((id) => {
    setGroups(g => ({ ...g, [id]: !g[id] }))
  }, [])

  const isOpen = useCallback((id) => groups[id] !== false, [groups])

  return { groups, toggle, isOpen }
}
