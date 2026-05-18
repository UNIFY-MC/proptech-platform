import { useState, useEffect, useCallback } from 'react';
import { supaSystem } from '../lib/supabase.js';

function todayRange() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return { start: start.toISOString(), end: now.toISOString() };
}

function yesterdayRange() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function useSwarmKPIs() {
  const [kpis, setKpis] = useState({
    running: 0,
    listingsHoje: 0,
    discoveriesHoje: 0,
    niches: 0,
    deltaListings: null,
    deltaDiscoveries: null,
    loading: true,
  });

  const fetchKPIs = useCallback(async () => {
    try {
      const today = todayRange();
      const yesterday = yesterdayRange();

      const [
        workersRes,
        runsRes,
        discRes,
        nichesRes,
        runsYesterdayRes,
        discYesterdayRes,
      ] = await Promise.all([
        supaSystem.from('swarm_workers').select('status').eq('status', 'running'),
        supaSystem.from('swarm_runs')
          .select('listings_count')
          .gte('started_at', today.start)
          .lte('started_at', today.end),
        supaSystem.from('swarm_discoveries')
          .select('id', { count: 'exact' })
          .gte('created_at', today.start)
          .lte('created_at', today.end),
        supaSystem.from('swarm_niches').select('id', { count: 'exact' }).eq('status', 'active'),
        supaSystem.from('swarm_runs')
          .select('listings_count')
          .gte('started_at', yesterday.start)
          .lte('started_at', yesterday.end),
        supaSystem.from('swarm_discoveries')
          .select('id', { count: 'exact' })
          .gte('created_at', yesterday.start)
          .lte('created_at', yesterday.end),
      ]);

      const listingsHoje = (runsRes.data || []).reduce((s, r) => s + (r.listings_count || 0), 0);
      const listingsOntem = (runsYesterdayRes.data || []).reduce((s, r) => s + (r.listings_count || 0), 0);
      const discoveriesHoje = discRes.count ?? 0;
      const discoveriesOntem = discYesterdayRes.count ?? 0;

      setKpis({
        running: workersRes.data?.length ?? 0,
        listingsHoje,
        discoveriesHoje,
        niches: nichesRes.count ?? 0,
        deltaListings: listingsHoje - listingsOntem,
        deltaDiscoveries: discoveriesHoje - discoveriesOntem,
        loading: false,
      });
    } catch (err) {
      console.error('useSwarmKPIs error:', err);
      setKpis(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchKPIs();
    const interval = setInterval(fetchKPIs, 30_000);
    return () => clearInterval(interval);
  }, [fetchKPIs]);

  return kpis;
}
