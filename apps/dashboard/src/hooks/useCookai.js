// useCookai — CRUD hooks sobre views public.cookai_*
// Aponta para system.* via security_invoker views (ADR-011 + migration 20260512)
//
// API:
//   const { skills, loading, refetch, create, update, remove } = useCookaiSkills()
//   const { recipes, ... } = useCookaiRecipes()
//   const { integrations, ... } = useCookaiIntegrations()
//   const { docs, ... } = useCookaiContextDocs()

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useNotificationsStore } from '../store'

function useCrudResource(tableView, orderBy = 'name', extraQuery = null) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const addToast = useNotificationsStore(s => s.addToast)

  const fetchAll = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    let query = supabase.from(tableView).select('*')
    if (extraQuery) query = extraQuery(query)
    query = query.order(orderBy, { ascending: true })
    const { data, error } = await query
    if (error) {
      setError(error.message)
      setItems([])
    } else {
      setItems(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [tableView, orderBy])

  useEffect(() => { fetchAll() }, [fetchAll])

  const create = useCallback(async (row) => {
    const { data, error } = await supabase.from(tableView).insert(row).select().single()
    if (error) {
      addToast({ type: 'error', message: `Criar falhou: ${error.message}` })
      return null
    }
    addToast({ type: 'success', message: 'Criado.' })
    await fetchAll()
    return data
  }, [tableView, fetchAll, addToast])

  const update = useCallback(async (id, patch) => {
    const { data, error } = await supabase.from(tableView).update(patch).eq('id', id).select().single()
    if (error) {
      addToast({ type: 'error', message: `Update falhou: ${error.message}` })
      return null
    }
    addToast({ type: 'success', message: 'Actualizado.' })
    await fetchAll()
    return data
  }, [tableView, fetchAll, addToast])

  const remove = useCallback(async (id) => {
    const { error } = await supabase.from(tableView).delete().eq('id', id)
    if (error) {
      addToast({ type: 'error', message: `Remover falhou: ${error.message}` })
      return false
    }
    addToast({ type: 'success', message: 'Removido.' })
    await fetchAll()
    return true
  }, [tableView, fetchAll, addToast])

  return { items, loading, error, refetch: fetchAll, create, update, remove }
}

export function useCookaiSkills() {
  const r = useCrudResource('cookai_skills', 'name')
  return { skills: r.items, ...r }
}

export function useCookaiRecipes() {
  const r = useCrudResource('cookai_recipes', 'name')
  return { recipes: r.items, ...r }
}

export function useCookaiIntegrations() {
  const r = useCrudResource('cookai_integrations', 'name')
  return { integrations: r.items, ...r }
}

export function useCookaiContextDocs() {
  const r = useCrudResource('cookai_context_docs', 'title')
  return { docs: r.items, ...r }
}

// Junctions read-only (junction CRUD vive na drawer da própria recipe/employee)
export function useEmployeeSkills() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.from('cookai_employee_skills').select('*').then(({ data }) => {
      setItems(data ?? [])
      setLoading(false)
    })
  }, [])
  return { items, loading }
}

export function useEmployeeIntegrations() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.from('cookai_employee_integrations').select('*').then(({ data }) => {
      setItems(data ?? [])
      setLoading(false)
    })
  }, [])
  return { items, loading }
}
