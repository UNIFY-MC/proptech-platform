import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supa, supaCore } from '../supa'
import { DEMO_PESSOA_ID } from './demo'

const Ctx = createContext(null)

export function ImovelAtivoProvider({ children }) {
  const [imoveis, setImoveis] = useState([])
  const [imovelAtivoId, setImovelAtivoIdState] = useState(null)
  const [viewMode, setViewModeState] = useState('individual') // 'individual' | 'global'
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    const [pessoaRes, locRes] = await Promise.all([
      supaCore.from('pessoas').select('id, localizacao_ativa_id').eq('id', DEMO_PESSOA_ID).single(),
      supa.from('localizacoes').select('*').eq('pessoa_id', DEMO_PESSOA_ID).eq('ativo', true).order('principal', { ascending: false }),
    ])
    const lista = locRes.data || []
    setImoveis(lista)
    const ativo = pessoaRes.data?.localizacao_ativa_id || lista[0]?.id || null
    setImovelAtivoIdState(ativo)
    setLoading(false)
  }, [])

  useEffect(() => { refetch() }, [refetch])

  const setImovelAtivoId = useCallback(async (id) => {
    setImovelAtivoIdState(id)
    setViewModeState('individual')
    await supaCore.from('pessoas').update({ localizacao_ativa_id: id }).eq('id', DEMO_PESSOA_ID)
  }, [])

  const setViewModeGlobal = useCallback(() => setViewModeState('global'), [])

  const isGlobal = viewMode === 'global'

  const imovelAtivo = isGlobal
    ? null
    : (imoveis.find(i => i.id === imovelAtivoId) || imoveis[0] || null)

  return (
    <Ctx.Provider value={{
      imoveis, imovelAtivo, imovelAtivoId, viewMode, isGlobal,
      setImovelAtivoId, setViewModeGlobal, loading, refetch,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useImovelAtivo = () => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useImovelAtivo deve estar dentro de ImovelAtivoProvider')
  return ctx
}
