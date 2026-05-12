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

// Fallback hardcoded — usado quando Supabase está unreachable ou BD vazia.
// Mantém o shell funcional offline. Slugs/ports alinhados com convenção 51XX
// (v2→5172, v3→5173, v4→5174, v5→5175). Os dados reais vêm de system.apps via
// public.cookai_apps; este fallback é só "fail-soft", não source-of-truth.
const FALLBACK_APPS = [
  { id: 'fb-dashboard', slug: 'dashboard', label: 'Dashboard',      icon: 'LayoutDashboard', embed: false, dev_url: null,                     prod_url: null,                     active: true, display_order: 0  },
  { id: 'fb-v2',        slug: 'v2',        label: 'V2 Condomínios', icon: 'Building2',       embed: true,  dev_url: 'http://localhost:5172',  prod_url: 'https://prataowners.pt', active: true, display_order: 10 },
  { id: 'fb-v4',        slug: 'v4',        label: 'V4 Energia',     icon: 'Zap',             embed: true,  dev_url: 'http://localhost:5174',  prod_url: null,                     active: true, display_order: 20 },
  { id: 'fb-v5',        slug: 'v5',        label: 'V5 Manutenção',  icon: 'Wrench',          embed: true,  dev_url: 'http://localhost:5175',  prod_url: null,                     active: true, display_order: 30 },
]

export function useApps() {
  const [apps, setApps]     = useState(FALLBACK_APPS) // arranca já com fallback
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    if (!supabase) {
      // Sem cliente Supabase → fica com fallback
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      const [appsRes, routesRes] = await Promise.all([
        supabase.from('cookai_apps').select('*').eq('active', true).order('display_order', { ascending: true }),
        supabase.from('cookai_app_routes').select('*').eq('active', true).order('display_order', { ascending: true }),
      ])
      if (cancelled) return
      // Se erro ou vazio, mantém fallback. Senão usa dados live.
      if (appsRes.error || !appsRes.data || appsRes.data.length === 0) {
        setError(appsRes.error?.message ?? null)
        // mantém FALLBACK_APPS já em state
      } else {
        setApps(appsRes.data)
        setError(null)
      }
      setRoutes(routesRes.data ?? [])
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
