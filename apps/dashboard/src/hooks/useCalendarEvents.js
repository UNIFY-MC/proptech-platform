// useCalendarEvents — lê public.calendar_events (UNION events + tasks com due_at)
// Filtra por range de datas (mês actual ou semana)

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export function useCalendarEvents({ fromISO, toISO, vertical = null } = {}) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    let q = supabase.from('calendar_events').select('*').order('starts_at', { ascending: true })
    if (fromISO) q = q.gte('starts_at', fromISO)
    if (toISO)   q = q.lte('starts_at', toISO)
    if (vertical && vertical !== 'all') q = q.eq('vertical', vertical.toLowerCase())
    const { data } = await q
    setEvents(data || [])
    setLoading(false)
  }, [fromISO, toISO, vertical])

  useEffect(() => { fetch() }, [fetch])

  const createEvent = useCallback(async (input) => {
    if (!supabase) return null
    const { data, error } = await supabase.schema('system').rpc('event_create', {
      p_title:        input.title,
      p_starts_at:    input.starts_at,
      p_ends_at:      input.ends_at || null,
      p_all_day:      input.all_day || false,
      p_description:  input.description || null,
      p_kind:         input.kind || 'manual',
      p_owner_agent_id: input.owner_agent_id || null,
      p_vertical:     input.vertical || null,
      p_color:        input.color || null,
      p_location:     input.location || null,
      p_payload:      input.payload || {},
    })
    if (error) { console.warn('[useCalendarEvents] create failed', error); return null }
    await fetch()
    return data
  }, [fetch])

  const deleteEvent = useCallback(async (id) => {
    if (!supabase) return
    await supabase.schema('system').rpc('event_delete', { p_event_id: id })
    await fetch()
  }, [fetch])

  return { events, loading, createEvent, deleteEvent, refresh: fetch }
}
