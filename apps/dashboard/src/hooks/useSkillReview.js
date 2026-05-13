// useSkillReview — lê skills em review/draft + RPC activate/archive

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export function useSkillReview() {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('cookai_skills')
      .select('*')
      .in('status', ['review', 'draft'])
      .order('proposed_at', { ascending: false })
    setSkills(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const activate = useCallback(async (skillId, notes = null) => {
    if (!supabase) return
    await supabase.schema('system').rpc('skill_activate', { p_skill_id: skillId, p_notes: notes })
    await fetch()
  }, [fetch])

  const archive = useCallback(async (skillId, notes = null) => {
    if (!supabase) return
    await supabase.schema('system').rpc('skill_archive', { p_skill_id: skillId, p_notes: notes })
    await fetch()
  }, [fetch])

  return { skills, loading, activate, archive, refresh: fetch }
}

// Trigger manual da edge fn agent-self-generate-skill (botão "Propor skill nova" no UI)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY

export async function proposeSkill({ intent, agentId, context }) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-self-generate-skill`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
      'apikey': ANON_KEY,
    },
    body: JSON.stringify({ intent, agent_id: agentId, context }),
  })
  return await res.json()
}
