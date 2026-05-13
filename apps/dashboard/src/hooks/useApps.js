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
// Modelo: cada vertical (v2..v10) tem N surfaces (form-factor × role).
const FALLBACK_APPS = [
  { id: 'fb-dashboard',           slug: 'dashboard',           label: 'Dashboard',             icon: 'LayoutDashboard', embed: false, dev_url: null,                    prod_url: null,                     active: true, display_order: 0,  vertical: null, surface: 'desktop_web', role: null,        coming_soon: false },
  // V2 Condomínios
  { id: 'fb-v2-staff',            slug: 'v2',                  label: 'V2 Staff',              icon: 'Building2',       embed: true,  dev_url: 'http://localhost:5172', prod_url: 'https://prataowners.pt', active: true, display_order: 10, vertical: 'v2', surface: 'desktop_web', role: 'staff',     coming_soon: false },
  { id: 'fb-v2-condomino-mobile', slug: 'v2-condomino-mobile', label: 'V2 Condómino (mobile)', icon: 'Smartphone',      embed: true,  dev_url: null,                    prod_url: null,                     active: true, display_order: 11, vertical: 'v2', surface: 'mobile_web',  role: 'cliente',   coming_soon: true  },
  { id: 'fb-v2-prestador-mobile', slug: 'v2-prestador-mobile', label: 'V2 Prestador (mobile)', icon: 'HardHat',         embed: true,  dev_url: null,                    prod_url: null,                     active: true, display_order: 12, vertical: 'v2', surface: 'mobile_web',  role: 'prestador', coming_soon: true  },
  // V3 Seguros
  { id: 'fb-v3-broker',           slug: 'v3-broker',           label: 'V3 Broker (desktop)',   icon: 'Briefcase',       embed: true,  dev_url: null,                    prod_url: null,                     active: true, display_order: 15, vertical: 'v3', surface: 'desktop_web', role: 'staff',     coming_soon: true  },
  { id: 'fb-v3-cliente-mobile',   slug: 'v3-cliente-mobile',   label: 'V3 Cliente (mobile)',   icon: 'Shield',          embed: true,  dev_url: null,                    prod_url: null,                     active: true, display_order: 16, vertical: 'v3', surface: 'mobile_web',  role: 'cliente',   coming_soon: true  },
  // V4 Energia
  { id: 'fb-v4-staff',            slug: 'v4',                  label: 'V4 Staff',              icon: 'Zap',             embed: true,  dev_url: 'http://localhost:5174', prod_url: null,                     active: true, display_order: 20, vertical: 'v4', surface: 'desktop_web', role: 'staff',     coming_soon: false },
  { id: 'fb-v4-cliente-web',      slug: 'v4-cliente-web',      label: 'V4 Simulador público',  icon: 'Zap',             embed: true,  dev_url: null,                    prod_url: null,                     active: true, display_order: 21, vertical: 'v4', surface: 'mobile_web',  role: 'cliente',   coming_soon: true  },
  // V5 Manutenção (cliente é o monolito actual; prestador aponta para o mesmo SPA com role)
  { id: 'fb-v5-cliente',          slug: 'v5',                  label: 'V5 Cliente (mobile)',   icon: 'Wrench',          embed: true,  dev_url: 'http://localhost:5175', prod_url: null,                     active: true, display_order: 30, vertical: 'v5', surface: 'mobile_web',  role: 'cliente',   coming_soon: false },
  { id: 'fb-v5-prestador',        slug: 'v5-prestador',        label: 'V5 Prestador (mobile)', icon: 'Wrench',          embed: true,  dev_url: 'http://localhost:5175', prod_url: null,                     active: true, display_order: 31, vertical: 'v5', surface: 'mobile_web',  role: 'prestador', coming_soon: false },
  { id: 'fb-v5-staff',            slug: 'v5-staff',            label: 'V5 Staff (desktop)',    icon: 'Briefcase',       embed: true,  dev_url: null,                    prod_url: null,                     active: true, display_order: 32, vertical: 'v5', surface: 'desktop_web', role: 'staff',     coming_soon: true  },
  // V10 Owners Club
  { id: 'fb-v10-owner-mobile',    slug: 'v10-owner-mobile',    label: 'V10 Owners Club',       icon: 'Crown',           embed: true,  dev_url: null,                    prod_url: null,                     active: true, display_order: 41, vertical: 'v10',surface: 'mobile_web',  role: 'owner',     coming_soon: true  },
]

// Lista de verticais conhecidas e ordem para tabs no Topbar
export const VERTICALS = [
  { id: 'v2',  label: 'V2 Condomínios', icon: 'Building2' },
  { id: 'v3',  label: 'V3 Seguros',     icon: 'Shield' },
  { id: 'v4',  label: 'V4 Energia',     icon: 'Zap' },
  { id: 'v5',  label: 'V5 Manutenção',  icon: 'Wrench' },
  { id: 'v10', label: 'V10 Owners',     icon: 'Crown' },
]

// Filtra apps de uma vertical específica, ordenadas
export function appsByVertical(apps, verticalId) {
  if (!verticalId) return []
  return apps
    .filter(a => a.vertical === verticalId && a.active)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
}

// Encontra a primeira surface "real" (não coming-soon) de uma vertical, fallback à primeira
export function defaultSurfaceOf(apps, verticalId) {
  const list = appsByVertical(apps, verticalId)
  return list.find(a => !a.coming_soon) || list[0] || null
}

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
