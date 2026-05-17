import { useState, useEffect } from 'react';
import { supaSystem } from '../lib/supabase.js';

const EMPTY = { running: 0, listingsHoje: 0, discoveriesHoje: 0, niches: 0, loading: true };

export function useSwarmKPIs() {
  const [kpis, setKpis] = useState(EMPTY);

  async function fetchKPIs() {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const [wRes, runsRes, discRes, nicheRes] = await Promise.all([
      // Agents running
      supaSystem.from('swarm_workers').select('id', { count: 'exact', head: true }).eq('status', 'running'),
      // Listings hoje (soma das runs de hoje)
      supaSystem.from('swarm_runs')
        .select('listings_count')
        .gte('started_at', today + 'T00:00:00Z')
        .lt('started_at', today + 'T23:59:59Z'),
      // Discoveries hoje
      supaSystem.from('swarm_discoveries').select('id', { count: 'exact', head: true })
        .gte('created_at', today + 'T00:00:00Z'),
      // Niches activos
      supaSystem.from('swarm_niches').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ]);

    const listingsHoje = (runsRes.data || []).reduce((s, r) => s + (r.listings_count || 0), 0);

    setKpis({
      running: wRes.count ?? 0,
      listingsHoje,
      discoveriesHoje: discRes.count ?? 0,
      niches: nicheRes.count ?? 0,
      loading: false,
    });
  }

  useEffect(() => {
    fetchKPIs();
    // Refrescar KPIs a cada 30 segundos
    const interval = setInterval(fetchKPIs, 30_000);
    return () => clearInterval(interval);
  }, []);

  return kpis;
}
