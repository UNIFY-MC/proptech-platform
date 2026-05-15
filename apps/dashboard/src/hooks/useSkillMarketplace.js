// useSkillMarketplace — Sprint Q5
// Lista skills team/public + tracking de installs do utilizador actual.

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Para já, "utilizador actual" é guardado em localStorage até IAM v1.
// Quando IAM v1 estiver wired, ler de auth context.
const STAFF_ID_LS_KEY = 'property007.staff_id'

export function getCurrentStaffId() {
  try {
    return localStorage.getItem(STAFF_ID_LS_KEY) || 'mario'
  } catch { return 'mario' }
}

export function setCurrentStaffId(id) {
  try { localStorage.setItem(STAFF_ID_LS_KEY, id) } catch {}
}

export function useSkillMarketplace() {
  const [skills, setSkills] = useState([])
  const [installs, setInstalls] = useState([])
  const [loading, setLoading] = useState(true)
  const staffId = getCurrentStaffId()

  const fetch = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const [marketplaceRes, installsRes] = await Promise.all([
      supabase.from('system_skills_marketplace').select('*').order('install_count', { ascending: false }).limit(200),
      supabase.from('system_my_skill_installs').select('*').eq('installed_by_employee_id', staffId),
    ])
    setSkills(marketplaceRes.data || [])
    setInstalls(installsRes.data || [])
    setLoading(false)
  }, [staffId])

  useEffect(() => { fetch() }, [fetch])

  const installSkill = useCallback(async (skillId) => {
    if (!supabase) return false
    const { error } = await supabase.schema('system').rpc('skill_install', {
      p_skill_id: skillId,
      p_employee_id: staffId,
    })
    if (!error) await fetch()
    return !error
  }, [staffId, fetch])

  const uninstallSkill = useCallback(async (skillId) => {
    if (!supabase) return false
    const { error } = await supabase.schema('system').rpc('skill_uninstall', {
      p_skill_id: skillId,
      p_employee_id: staffId,
    })
    if (!error) await fetch()
    return !error
  }, [staffId, fetch])

  // Skills que o staff actual já instalou (set de IDs)
  const installedIds = new Set(installs.map(i => i.skill_id))

  return {
    skills, installs, installedIds, loading,
    staffId, refresh: fetch,
    installSkill, uninstallSkill,
  }
}
