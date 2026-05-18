// useCustomFields — CRUD em core.records_metadata.attributes por record_type
// Enquanto o RPC core.upsert_custom_field não existir, usamos UPDATE directo via supabase-js.
// Workaround explícito: quando RPC disponível, substituir por supabase.rpc('core.upsert_custom_field', ...)

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

const sb = supabase

/**
 * Hook que devolve os custom fields (attributes) para um dado record_type,
 * e utilitários para adicionar / actualizar / remover campos.
 *
 * @param {string} recordType  'pessoa' | 'empresa' | 'imovel' | 'condominio' | 'oportunidade'
 */
export function useCustomFields(recordType) {
  const [fields, setFields]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  // Carregar attributes da tabela core.records_metadata
  const load = useCallback(async () => {
    if (!recordType || !sb) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await sb
        .schema('core')
        .from('records_metadata')
        .select('attributes')
        .eq('record_type', recordType)
        .maybeSingle()

      if (err) throw err
      setFields(data?.attributes ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [recordType])

  useEffect(() => { load() }, [load])

  // Adicionar ou actualizar um campo.
  // fieldDef: { slug, label, type, default_value, required, description, options, relation_type }
  const upsertField = useCallback(async (fieldDef) => {
    if (!recordType || !fieldDef?.slug || !sb) return { error: 'slug obrigatório' }
    setError(null)

    // Obter estado actual da tabela
    const { data: current, error: fetchErr } = await sb
      .schema('core')
      .from('records_metadata')
      .select('attributes')
      .eq('record_type', recordType)
      .maybeSingle()

    if (fetchErr) return { error: fetchErr.message }

    const existing = current?.attributes ?? []
    const idx = existing.findIndex(f => f.slug === fieldDef.slug)
    let updated
    if (idx >= 0) {
      updated = [...existing]
      updated[idx] = { ...existing[idx], ...fieldDef }
    } else {
      updated = [...existing, fieldDef]
    }

    const { error: updateErr } = await sb
      .schema('core')
      .from('records_metadata')
      .update({ attributes: updated })
      .eq('record_type', recordType)

    if (updateErr) return { error: updateErr.message }
    setFields(updated)
    return { ok: true }
  }, [recordType])

  // Remover um campo pelo slug
  const removeField = useCallback(async (slug) => {
    if (!recordType || !slug || !sb) return { error: 'slug obrigatório' }

    const updated = fields.filter(f => f.slug !== slug)
    const { error: updateErr } = await sb
      .schema('core')
      .from('records_metadata')
      .update({ attributes: updated })
      .eq('record_type', recordType)

    if (updateErr) return { error: updateErr.message }
    setFields(updated)
    return { ok: true }
  }, [recordType, fields])

  // Guardar valor de um campo custom num record específico.
  // Faz SELECT + merge + UPDATE em core.<tabela>.custom_fields jsonb.
  const saveFieldValue = useCallback(async (table, recordId, slug, value) => {
    if (!sb) return { error: 'Supabase não iniciado' }

    const { data: rec, error: fetchErr } = await sb
      .schema('core')
      .from(table)
      .select('custom_fields')
      .eq('id', recordId)
      .maybeSingle()

    if (fetchErr) return { error: fetchErr.message }

    const merged = { ...(rec?.custom_fields ?? {}), [slug]: value }
    const { error: updateErr } = await sb
      .schema('core')
      .from(table)
      .update({ custom_fields: merged })
      .eq('id', recordId)

    if (updateErr) return { error: updateErr.message }
    return { ok: true }
  }, [])

  return { fields, loading, error, upsertField, removeField, saveFieldValue, reload: load }
}
