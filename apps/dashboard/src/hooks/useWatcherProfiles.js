// useWatcherProfiles — cache de core.watcher_profiles via public.cookai_watcher_profiles
// Usado por FeedRow para mostrar foto real do autor (Chamath, Guillermo, etc.)

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export function useWatcherProfiles() {
  const [bySlug, setBySlug] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    let cancelled = false
    supabase.from('cookai_watcher_profiles').select('*').eq('active', true).then(({ data }) => {
      if (cancelled) return
      const map = {}
      for (const w of (data ?? [])) map[w.slug] = w
      setBySlug(map)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  return { bySlug, loading }
}
