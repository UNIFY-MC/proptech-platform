import { useState, useEffect, useRef, useCallback } from 'react';
import { supaSystem } from '../lib/supabase.js';

const PAGE_SIZE = 25;

/**
 * useDiscoveries — query paginada + filtros + Realtime para system.swarm_discoveries
 *
 * @param {Object} filters
 * @param {string}   filters.niche      - slug do niche ('' = todos)
 * @param {string[]} filters.kind       - ['opportunity','competitor',...] ([] = todos)
 * @param {string[]} filters.significance - ['low','medium','high','critical'] ([] = todos)
 * @param {string}   filters.dateRange  - '24h'|'7d'|'30d'|'all'
 * @param {boolean|null} filters.promoted - true/false/null (null = todos)
 * @param {number}   page               - página actual (0-indexed)
 */
export function useDiscoveries(filters = {}, page = 0) {
  const {
    niche = '',
    kind = [],
    significance = [],
    dateRange = 'all',
    promoted = null,
  } = filters;

  const [discoveries, setDiscoveries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newIds, setNewIds] = useState(new Set());
  const channelRef = useRef(null);

  function buildQuery(countOnly = false) {
    let q = supaSystem
      .from('swarm_discoveries')
      .select(countOnly ? 'id' : '*', { count: 'exact' });

    if (niche) q = q.eq('niche_slug', niche);
    if (kind.length > 0) q = q.in('kind', kind);
    if (significance.length > 0) q = q.in('significance', significance);
    if (promoted === true) q = q.eq('promoted_to_inbox', true);
    if (promoted === false) q = q.eq('promoted_to_inbox', false);

    if (dateRange !== 'all') {
      const now = new Date();
      const hours = dateRange === '24h' ? 24 : dateRange === '7d' ? 168 : 720;
      const since = new Date(now.getTime() - hours * 3_600_000).toISOString();
      q = q.gte('created_at', since);
    }

    return q;
  }

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count, error } = await buildQuery()
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (!error) {
        setDiscoveries(data || []);
        setTotal(count ?? 0);
      } else {
        console.error('[useDiscoveries] fetch error:', error);
      }
    } catch (err) {
      console.error('[useDiscoveries] unexpected:', err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niche, kind.join(','), significance.join(','), dateRange, promoted, page]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Realtime — INSERT vai para o topo se não há filtros que o excluam
  useEffect(() => {
    if (channelRef.current) supaSystem.removeChannel(channelRef.current);

    channelRef.current = supaSystem
      .channel('discoveries-page-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'system',
        table: 'swarm_discoveries',
      }, (payload) => {
        const d = payload.new;

        // Verificar se passa os filtros activos antes de inserir
        const passKind = kind.length === 0 || kind.includes(d.kind);
        const passSig  = significance.length === 0 || significance.includes(d.significance);
        const passNiche = !niche || d.niche_slug === niche;
        const passPromoted = promoted === null || d.promoted_to_inbox === promoted;
        const passDate = dateRange === 'all' || (() => {
          const hours = dateRange === '24h' ? 24 : dateRange === '7d' ? 168 : 720;
          const since = new Date(Date.now() - hours * 3_600_000);
          return new Date(d.created_at) >= since;
        })();

        if (!passKind || !passSig || !passNiche || !passPromoted || !passDate) return;

        // Inserir no topo (página 0 apenas)
        if (page === 0) {
          setDiscoveries(prev => [d, ...prev].slice(0, PAGE_SIZE));
          setTotal(prev => prev + 1);
        } else {
          setTotal(prev => prev + 1);
        }

        setNewIds(prev => {
          const next = new Set(prev);
          next.add(d.id);
          setTimeout(() => {
            setNewIds(old => { const c = new Set(old); c.delete(d.id); return c; });
          }, 4000);
          return next;
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'system',
        table: 'swarm_discoveries',
      }, (payload) => {
        setDiscoveries(prev =>
          prev.map(d => d.id === payload.new.id ? payload.new : d)
        );
      })
      .subscribe();

    return () => {
      if (channelRef.current) supaSystem.removeChannel(channelRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niche, kind.join(','), significance.join(','), dateRange, promoted, page]);

  return {
    discoveries,
    total,
    loading,
    newIds,
    refresh: fetch,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}

// KPIs específicos da página Discoveries
export function useDiscoveriesKPIs() {
  const [kpis, setKpis] = useState({
    hoje: 0,
    noveltyMedio: null,
    promotedPct: null,
    custo7d: null,
    loading: true,
  });

  const fetch = useCallback(async () => {
    try {
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const week = new Date(now.getTime() - 7 * 24 * 3_600_000);

      const [todayRes, allRes, promotedRes, weekCostRes] = await Promise.all([
        // Discoveries hoje
        supaSystem
          .from('swarm_discoveries')
          .select('id', { count: 'exact' })
          .gte('created_at', today.toISOString()),

        // Novelty médio (últimas 100 para não puxar toda a tabela)
        supaSystem
          .from('swarm_discoveries')
          .select('novelty_score, promoted_to_inbox')
          .order('created_at', { ascending: false })
          .limit(100),

        // % promoted (últimos 7d)
        supaSystem
          .from('swarm_discoveries')
          .select('id, promoted_to_inbox', { count: 'exact' })
          .gte('created_at', week.toISOString()),

        // Custo total 7d via swarm_runs
        supaSystem
          .from('swarm_runs')
          .select('cost_usd')
          .gte('started_at', week.toISOString()),
      ]);

      const hoje = todayRes.count ?? 0;

      const rows = allRes.data || [];
      const novs = rows.map(r => r.novelty_score).filter(v => v != null);
      const noveltyMedio = novs.length > 0
        ? (novs.reduce((a, b) => a + b, 0) / novs.length).toFixed(2)
        : null;

      const total7d = promotedRes.data?.length ?? 0;
      const promoted7d = (promotedRes.data || []).filter(r => r.promoted_to_inbox).length;
      const promotedPct = total7d > 0 ? Math.round((promoted7d / total7d) * 100) : null;

      const custo7d = (weekCostRes.data || [])
        .reduce((s, r) => s + (r.cost_usd || 0), 0)
        .toFixed(4);

      setKpis({ hoje, noveltyMedio, promotedPct, custo7d, loading: false });
    } catch (err) {
      console.error('[useDiscoveriesKPIs]', err);
      setKpis(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetch();
    const iv = setInterval(fetch, 60_000);
    return () => clearInterval(iv);
  }, [fetch]);

  return kpis;
}
