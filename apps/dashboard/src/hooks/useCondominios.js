// useCondominios + useCondominio — leitura/update da v2_condominios.condominio
// Multi-tenant: cada row é um condomínio (Lote 2A=001, Lote 2B=002, …)

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useCondominios() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.schema('v2_condominios').from('condominio')
      .select('id, codigo, nome, nif, email, email_from_name, gmail_staff_id, ativo, jsonb_array_length(proprietarios) AS n_proprietarios')
      .order('codigo')
    // jsonb_array_length não funciona aqui; vai vir null. Calcula client-side se preciso.
    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  return { items, loading, reload: load }
}

export function useCondominio(idOrCodigo) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!supabase || !idOrCodigo) { setLoading(false); return }
    setLoading(true)
    setError(null)
    let q = supabase.schema('v2_condominios').from('condominio').select('*')
    q = /^\d+$/.test(String(idOrCodigo)) ? q.eq('id', Number(idOrCodigo)) : q.eq('codigo', idOrCodigo)
    const { data: row, error: err } = await q.maybeSingle()
    if (err) setError(err.message)
    setData(row || null)
    setLoading(false)
  }, [idOrCodigo])

  useEffect(() => { load() }, [load])

  const update = useCallback(async (patch) => {
    if (!supabase || !data?.id) return false
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.schema('v2_condominios').from('condominio')
      .update({ ...patch, atualizado_em: new Date().toISOString() })
      .eq('id', data.id)
    if (err) { setError(err.message); setSaving(false); return false }
    await load()
    setSaving(false)
    return true
  }, [data?.id, load])

  return { data, loading, saving, error, reload: load, update }
}
