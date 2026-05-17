import { useState, useEffect, useRef } from 'react';
import { supaSystem } from '../lib/supabase.js';

export function useSwarmDiscoveries(limit = 20) {
  const [discoveries, setDiscoveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  async function fetchDiscoveries() {
    const { data, error } = await supaSystem
      .from('swarm_discoveries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data) {
      setDiscoveries(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchDiscoveries();

    // Realtime subscribe a novas discoveries
    channelRef.current = supaSystem
      .channel('truth-swarm-discoveries')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'system',
        table: 'swarm_discoveries',
      }, (payload) => {
        setDiscoveries(prev => [payload.new, ...prev].slice(0, limit));
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
      if (channelRef.current) {
        supaSystem.removeChannel(channelRef.current);
      }
    };
  }, [limit]);

  return { discoveries, loading, refresh: fetchDiscoveries };
}
