import { useEffect, useState, useMemo } from 'react'

// Cache de permissões por sessão (refresh ao login/logout)
let cache = { grants: null, group_code: null, auth_user_id: null }

/**
 * Hook para verificar permissões cross-vertical via schema iam.
 * ADR-013: usePermission('v5.ordens', 'edit') → true/false
 *
 * Lê grants via RPC iam.get_my_permissions() (1 call por sessão, depois cache).
 * Reinicializa quando auth_user_id muda.
 *
 * @param {object} mainClient - Supabase main client com JWT do user
 * @param {string} section    - ex: 'v2.fracoes', 'v5.ordens', 'marketing.leads'
 * @param {string} action     - 'view' (default) | 'edit' | 'create' | 'delete'
 * @returns {{ allowed: boolean, loading: boolean, group: string|null, grants: object|null }}
 */
export function usePermission(mainClient, section, action = 'view') {
  const [state, setState] = useState(() => ({
    allowed: cache.grants?.[section]?.[action] === true,
    loading: cache.grants === null,
    group:   cache.group_code,
    grants:  cache.grants,
  }))

  useEffect(() => {
    if (!mainClient) return
    let active = true
    const userId = mainClient.auth.session?.()?.user?.id

    async function load() {
      if (cache.grants && cache.auth_user_id === userId) {
        // cache hit
        if (active) setState({ allowed: cache.grants[section]?.[action] === true, loading: false, group: cache.group_code, grants: cache.grants })
        return
      }

      const { data, error } = await mainClient.rpc('get_my_permissions', {}, { schema: 'iam' })
        .catch(() => mainClient.schema('iam').rpc('get_my_permissions'))

      if (!active) return
      if (error || !data) {
        setState({ allowed: false, loading: false, group: null, grants: null })
        return
      }
      cache = { grants: data.grants, group_code: data.group_code, auth_user_id: data.auth_user_id }
      setState({ allowed: data.grants?.[section]?.[action] === true, loading: false, group: data.group_code, grants: data.grants })
    }

    load()
    return () => { active = false }
  }, [mainClient, section, action])

  return state
}

/**
 * Helper síncrono para verificar a partir de grants já carregados.
 * Útil quando há já um state com grants do contexto.
 */
export function canDo(grants, section, action = 'view') {
  return grants?.[section]?.[action] === true
}

/**
 * Limpa cache (chamar no logout).
 */
export function resetPermissionCache() {
  cache = { grants: null, group_code: null, auth_user_id: null }
}

/**
 * Hook para obter TODAS as permissões do user (matrix completa).
 * Útil para UIs de gestão de permissões.
 */
export function useAllPermissions(mainClient) {
  const [state, setState] = useState({ grants: cache.grants, group: cache.group_code, loading: cache.grants === null })

  useEffect(() => {
    if (!mainClient) return
    let active = true
    async function load() {
      const { data, error } = await mainClient.schema('iam').rpc('get_my_permissions')
      if (!active) return
      if (error || !data) {
        setState({ grants: null, group: null, loading: false })
        return
      }
      cache = { grants: data.grants, group_code: data.group_code, auth_user_id: data.auth_user_id }
      setState({ grants: data.grants, group: data.group_code, loading: false })
    }
    if (cache.grants) {
      setState({ grants: cache.grants, group: cache.group_code, loading: false })
    } else {
      load()
    }
    return () => { active = false }
  }, [mainClient])

  return state
}
