// useSuggestedInfluencers — lista curated de influencers/sources sugeridos
// + helpers para seguir/des-seguir (cria/desativa rows em system.watcher_sources)

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const PLATFORM_TO_KIND = {
  instagram: 'instagram_user',
  x:         'x_search',
  linkedin:  'linkedin_user',
  tiktok:    'apify_actor',
  youtube:   'youtube_channel',
  web:       'competitor_site',
  rss:       'rss',
  reddit:    'apify_actor',
}

export function useSuggestedInfluencers() {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('suggested_influencers')
      .select('*')
      .order('priority', { ascending: false })
    setSuggestions(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  // Follow: cria row em watcher_sources com config apropriada
  const follow = useCallback(async (sugg) => {
    if (!supabase) return null

    // Se tem apify_actor, usa kind=apify_actor com input pronto
    const useApify = !!sugg.apify_actor
    const kind = useApify ? 'apify_actor' : (PLATFORM_TO_KIND[sugg.platform] || 'competitor_site')

    let config
    if (useApify) {
      config = {
        actor_id:      sugg.apify_actor,
        platform:      sugg.platform,
        output_mapper: sugg.platform === 'instagram' ? 'instagram_post'
                     : sugg.platform === 'x'         ? 'twitter_post'
                     : sugg.platform === 'linkedin'  ? 'linkedin_post'
                     : 'page_content',
        input:         sugg.apify_input || {},
        handle:        sugg.handle,
        suggested_id:  sugg.id,
      }
    } else {
      config = {
        handle: sugg.handle,
        url:    sugg.url,
        suggested_id: sugg.id,
      }
    }

    const { data, error } = await supabase.schema('system').from('watcher_sources').insert({
      kind,
      label: sugg.display_name || sugg.handle,
      config,
      vertical: sugg.vertical || null,
      active: true,
    }).select('*').single()

    if (error) console.warn('[useSuggestedInfluencers] follow failed', error)
    await fetch()
    return data
  }, [fetch])

  return { suggestions, loading, follow, refresh: fetch }
}
