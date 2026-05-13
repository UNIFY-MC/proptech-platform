import { useEffect, useMemo, useState } from 'react'
import { initGrowthPixel, identify, track, resetPixel } from './index.js'

const GROWTH_ENDPOINT = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GROWTH_ENDPOINT) ||
  'https://hkmvszkpxjbxmnixzqbl.supabase.co/functions/v1/growth-track-event'
const ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || ''

/**
 * React hook que inicializa o pixel uma vez por mount + devolve track/identify.
 *
 * @param {{ vertical: string, autoPageview?: boolean, autoForms?: boolean, defaults?: object }} cfg
 */
export function useGrowthPixel(cfg) {
  const [ready, setReady] = useState(false)
  const config = useMemo(() => ({
    autoPageview: true,
    autoForms: false,
    ...cfg,
    endpoint: GROWTH_ENDPOINT,
    anonKey: ANON_KEY,
  }), [cfg?.vertical])

  useEffect(() => {
    if (!config.vertical || !config.anonKey) {
      console.warn('[useGrowthPixel] missing vertical or anon key')
      return
    }
    initGrowthPixel(config)
    setReady(true)
  }, [config.vertical, config.anonKey])

  return { ready, track, identify, reset: resetPixel }
}
