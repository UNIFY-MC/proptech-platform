import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { supa, supaCore } from '../supa'
import { useAuth } from './AuthContext'

const Ctx = createContext(null)

export function ImovelAtivoProvider({ children }) {
  const { pessoa_id, memberships } = useAuth()

  // Stable dep: lista de org IDs como string para evitar re-render em cada ref change
  const orgIdsKey = useMemo(
    () => (memberships || []).map(m => m.organization_id).join(','),
    [memberships]
  )

  // ── state ──────────────────────────────────────────────────────────────
  const [organizations,     setOrganizations]    = useState([])
  const [organizationId,    setOrganizationId]   = useState(null)
  const [imoveis,           setImoveis]          = useState([])
  const [imovelAtivoId,     setImovelAtivoIdSt]  = useState(null)
  const [viewMode,          setViewModeState]    = useState('individual')
  const [loading,           setLoading]          = useState(true)
  const [imovelAtivoPorTab, setImovelAtivoPorTab] = useState({
    inicio: null, casa: null, servicos: null, pedidos: 'global',
  })

  // ── refetch principal: carrega org + localizacoes ──────────────────────
  const refetch = useCallback(async () => {
    if (!pessoa_id || !orgIdsKey) {
      setImoveis([])
      setImovelAtivoIdSt(null)
      setOrganizationId(null)
      setOrganizations([])
      setLoading(false)
      return
    }

    setLoading(true)

    const orgIds = orgIdsKey.split(',').filter(Boolean)

    const [orgsRes, pessoaRes] = await Promise.all([
      supaCore.from('organizations').select('id, nome, tipo').in('id', orgIds),
      supaCore.from('pessoas').select('metadata, localizacao_ativa_id').eq('id', pessoa_id).maybeSingle(),
    ])

    const orgs      = orgsRes.data  || []
    const pessoaMeta = pessoaRes.data || {}
    setOrganizations(orgs)

    const savedOrgId = pessoaMeta.metadata?.last_org_id
    const firstOrgId = orgIds[0]
    const orgId = (savedOrgId && orgIds.includes(savedOrgId)) ? savedOrgId : firstOrgId
    setOrganizationId(orgId)

    const { data: locData } = await supa
      .from('localizacoes')
      .select('*')
      .eq('organization_id', orgId)
      .eq('ativo', true)
      .order('principal', { ascending: false })

    const lista = locData || []
    setImoveis(lista)

    const savedLocId = pessoaMeta.localizacao_ativa_id
    const ativo = (savedLocId && lista.find(l => l.id === savedLocId))
      ? savedLocId
      : lista[0]?.id || null
    setImovelAtivoIdSt(ativo)
    setLoading(false)
  }, [pessoa_id, orgIdsKey])

  useEffect(() => { refetch() }, [refetch])

  // ── setActiveOrg — muda entidade activa ────────────────────────────────
  const setActiveOrg = useCallback(async (id) => {
    setOrganizationId(id)
    if (pessoa_id) {
      const { data } = await supaCore.from('pessoas').select('metadata').eq('id', pessoa_id).maybeSingle()
      await supaCore.from('pessoas')
        .update({ metadata: { ...(data?.metadata || {}), last_org_id: id } })
        .eq('id', pessoa_id)
    }
    const { data: locData } = await supa
      .from('localizacoes')
      .select('*')
      .eq('organization_id', id)
      .eq('ativo', true)
      .order('principal', { ascending: false })
    const lista = locData || []
    setImoveis(lista)
    setImovelAtivoIdSt(lista[0]?.id || null)
  }, [pessoa_id])

  // ── setImovelAtivoId — persiste localizacao_ativa_id em core.pessoas ───
  const setImovelAtivoId = useCallback(async (id) => {
    setImovelAtivoIdSt(id)
    setViewModeState('individual')
    if (pessoa_id) {
      await supaCore.from('pessoas').update({ localizacao_ativa_id: id }).eq('id', pessoa_id)
    }
  }, [pessoa_id])

  const setViewModeGlobal = useCallback(() => setViewModeState('global'), [])

  const setImovelAtivoForTab = useCallback((tab, idOrGlobal) => {
    setImovelAtivoPorTab(prev => ({ ...prev, [tab]: idOrGlobal }))
    if (idOrGlobal === 'global') {
      setViewModeState('global')
    } else if (idOrGlobal) {
      setImovelAtivoIdSt(idOrGlobal)
      setViewModeState('individual')
    }
  }, [])

  const onTabChange = useCallback((newTab) => {
    const memoria = imovelAtivoPorTab[newTab]
    if (memoria === 'global') {
      setViewModeState('global')
    } else if (memoria) {
      setImovelAtivoIdSt(memoria)
      setViewModeState('individual')
    } else {
      const principal = imoveis.find(i => i.principal)
      if (principal) {
        setImovelAtivoIdSt(principal.id)
        setViewModeState('individual')
      }
    }
  }, [imovelAtivoPorTab, imoveis])

  const resetParaPrincipal = useCallback(() => {
    const principal = imoveis.find(i => i.principal)
    if (principal) setImovelAtivoIdSt(principal.id)
    setViewModeState('individual')
    setImovelAtivoPorTab({ inicio: null, casa: null, servicos: null, pedidos: 'global' })
  }, [imoveis])

  const isGlobal    = viewMode === 'global'
  const imovelAtivo = isGlobal
    ? null
    : (imoveis.find(i => i.id === imovelAtivoId) || imoveis[0] || null)

  return (
    <Ctx.Provider value={{
      // ── interface legacy (useImovelAtivo) ──────────────────────────────
      imoveis, imovelAtivo, imovelAtivoId, viewMode, isGlobal,
      setImovelAtivoId, setViewModeGlobal, loading, refetch,
      imovelAtivoPorTab, setImovelAtivoForTab, onTabChange, resetParaPrincipal,
      // ── nova interface org-aware ───────────────────────────────────────
      organizationId,
      organizations,
      setActiveOrg,
      localizacaoId:        imovelAtivoId,
      localizacoes:         imoveis,
      setActiveLocalizacao: setImovelAtivoId,
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
