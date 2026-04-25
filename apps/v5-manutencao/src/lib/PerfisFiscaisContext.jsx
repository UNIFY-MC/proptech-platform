import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supa } from '../supa.js'
import { DEMO_PESSOA_ID } from './demo.js'

const PerfisFiscaisContext = createContext(null)

export function PerfisFiscaisProvider({ children }) {
  const [perfis,  setPerfis]  = useState([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supa
      .from('perfis_fiscais')
      .select('*')
      .eq('pessoa_id', DEMO_PESSOA_ID)
      .order('principal', { ascending: false })
    setPerfis(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { refetch() }, [refetch])

  async function addPerfil(campos) {
    const { data, error } = await supa
      .from('perfis_fiscais')
      .insert({ pessoa_id: DEMO_PESSOA_ID, ...campos })
      .select()
      .single()
    if (error) throw error
    await refetch()
    return data
  }

  async function updatePerfil(id, campos) {
    const { error } = await supa
      .from('perfis_fiscais')
      .update(campos)
      .eq('id', id)
    if (error) throw error
    await refetch()
  }

  async function deletePerfil(id) {
    const { error } = await supa
      .from('perfis_fiscais')
      .delete()
      .eq('id', id)
    if (error) throw error
    await refetch()
  }

  return (
    <PerfisFiscaisContext.Provider value={{ perfis, loading, refetch, addPerfil, updatePerfil, deletePerfil }}>
      {children}
    </PerfisFiscaisContext.Provider>
  )
}

export function usePerfisFiscais() {
  const ctx = useContext(PerfisFiscaisContext)
  if (!ctx) throw new Error('usePerfisFiscais fora do PerfisFiscaisProvider')
  return ctx
}
