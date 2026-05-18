import { useState, useEffect, useRef, useCallback } from 'react';
import { supaSystem } from '../lib/supabase.js';

export function useSwarmDiscoveries(limit = 20) {
  const [discoveries, setDiscoveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newIds, setNewIds] = useState(new Set());
  const channelRef = useRef(null);

  const fetchDiscoveries = useCallback(async () => {
    const { data, error } = await supaSystem
      .from('swarm_discoveries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data) setDiscoveries(data);
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    fetchDiscoveries();

    channelRef.current = supaSystem
      .channel('truth-swarm-discoveries-v2')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'system',
        table: 'swarm_discoveries',
      }, (payload) => {
        setDiscoveries(prev => [payload.new, ...prev].slice(0, limit));
        setNewIds(prev => {
          const next = new Set(prev);
          next.add(payload.new.id);
          setTimeout(() => {
            setNewIds(old => { const c = new Set(old); c.delete(payload.new.id); return c; });
          }, 3000);
          return next;
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'system',
        table: 'swarm_discoveries',
      }, (payload) => {
        setDiscoveries(prev => prev.map(d => d.id === payload.new.id ? payload.new : d));
      })
      .subscribe();

    return () => {
      if (channelRef.current) supaSystem.removeChannel(channelRef.current);
    };
  }, [limit, fetchDiscoveries]);

  return { discoveries, loading, refresh: fetchDiscoveries, newIds };
}
