import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supa } from '../supa.js'
import { useAuth } from './AuthContext.jsx'

const PerfisFiscaisContext = createContext(null)

export function PerfisFiscaisProvider({ children }) {
  const { pessoa_id } = useAuth()

  const [perfis,  setPerfis]  = useState([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!pessoa_id) { setPerfis([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supa
      .from('perfis_fiscais')
      .select('*')
      .eq('pessoa_id', pessoa_id)
      .order('principal', { ascending: false })
    setPerfis(data || [])
    setLoading(false)
  }, [pessoa_id])

  useEffect(() => { refetch() }, [refetch])

  async function addPerfil(campos) {
    const { data, error } = await supa
      .from('perfis_fiscais')
      .insert({ pessoa_id, ...campos })
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
