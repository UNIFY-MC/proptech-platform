// useAgentsList — lista distinct de agentes em uso nas recipes (employee_id)
// + merge com system.agent_profile se existir. Usado nos dropdowns "Assign to".

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Mapping employee_id (v<N>.<slug>) → nome humanizado fallback
function humanizeAgent(employeeId) {
  if (!employeeId) return null
  const [, vertical, slug] = employeeId.match(/^(v\d+)\.(.+)$/) || []
  if (!slug) return employeeId
  const name = slug.replace(/_/g, '-').replace(/\b\w/g, c => c.toUpperCase())
  return `${name} · ${vertical?.toUpperCase()}`
}

export function useAgentsList() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    try {
      // distinct employee_id de system.recipes (via system_recipes view se existe, senão schema)
      const { data: recipeRows } = await supabase
        .schema('system').from('recipes')
        .select('employee_id')
        .not('employee_id', 'is', null)

      const distinct = Array.from(new Set((recipeRows || []).map(r => r.employee_id))).sort()

      // Tenta enriquecer com agent_profile (nome real, avatar)
      const { data: profiles } = await supabase
        .schema('system').from('agent_profile')
        .select('agent_id, name, vertical, avatar_url')

      const profileMap = {}
      ;(profiles || []).forEach(p => {
        // agent_profile.agent_id é o slug (ex: 'bia') sem prefixo v<N>
        profileMap[p.agent_id] = p
      })

      const list = distinct.map(employeeId => {
        const [, vertical, slug] = employeeId.match(/^(v\d+)\.(.+)$/) || []
        const profile = profileMap[slug?.replace(/_/g, '-')] || profileMap[slug]
        return {
          employee_id: employeeId,
          vertical,
          slug,
          name: profile?.name || humanizeAgent(employeeId).split(' · ')[0],
          avatar_url: profile?.avatar_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${slug}`,
          label: profile?.name ? `${profile.name} · ${vertical?.toUpperCase()}` : humanizeAgent(employeeId),
        }
      })

      setAgents(list)
    } catch (err) {
      console.warn('[useAgentsList]', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { agents, loading, reload: load }
}
