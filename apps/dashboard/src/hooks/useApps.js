// useApps — hook BD-driven que carrega apps + routes de system.apps via views public.cookai_*
// Padrão alinhado com useCookai.js (ADR-011)
//
// API:
//   const { apps, routes, sectionsFor, urlFor, loading } = useApps()
//   apps        → [{ id, slug, label, icon, embed, dev_url, prod_url, display_order, active }]
//   routes      → [{ id, app_id, section, label, path, icon, display_order, role_filter }]
//   sectionsFor(slug) → [{ label, routes: [...] }]  agrupado por section
//   urlFor(app)       → URL base (dev: /embed/<slug>, prod: prod_url || dev_url)

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useApps() {
  const [apps, setApps]     = useState([])
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    let cancelled = false
    async function load() {
      setLoading(true)
      const [appsRes, routesRes] = await Promise.all([
        supabase.from('cookai_apps').select('*').eq('active', true).order('display_order', { ascending: true }),
        supabase.from('cookai_app_routes').select('*').eq('active', true).order('display_order', { ascending: true }),
      ])
      if (cancelled) return
      if (appsRes.error || routesRes.error) {
        setError(appsRes.error?.message || routesRes.error?.message)
        setApps([]); setRoutes([])
      } else {
        setApps(appsRes.data ?? [])
        setRoutes(routesRes.data ?? [])
        setError(null)
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const sectionsFor = useCallback((slug) => {
    const app = apps.find(a => a.slug === slug)
    if (!app) return []
    const appRoutes = routes.filter(r => r.app_id === app.id)
    const grouped = new Map()
    for (const r of appRoutes) {
      const k = r.section ?? '_default'
      if (!grouped.has(k)) grouped.set(k, [])
      grouped.get(k).push(r)
    }
    return [...grouped.entries()].map(([section, items]) => ({
      label: section === '_default' ? null : section,
      routes: items,
    }))
  }, [apps, routes])

  const urlFor = useCallback((app) => {
    if (!app || !app.embed) return null
    // Em dev: proxy via /embed/<slug> (Vite proxy reescreve para dev_url)
    // Em prod: prod_url directo (com fallback para dev_url se prod_url ainda não definido)
    return import.meta.env.DEV
      ? `/embed/${app.slug}`
      : (app.prod_url || app.dev_url || '')
  }, [])

  return { apps, routes, sectionsFor, urlFor, loading, error }
}
