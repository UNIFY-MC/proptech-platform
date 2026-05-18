import { useState, useEffect, useRef, useCallback } from 'react';
import { supaSystem } from '../lib/supabase.js';

export function useSwarmWorkers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  const fetchWorkers = useCallback(async () => {
    const { data, error } = await supaSystem
      .from('swarm_workers')
      .select('*')
      .order('id', { ascending: true });

    if (!error && data) {
      setWorkers(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWorkers();

    channelRef.current = supaSystem
      .channel('truth-swarm-workers-v2')
      .on('postgres_changes', {
        event: '*',
        schema: 'system',
        table: 'swarm_workers',
      }, (payload) => {
        setWorkers(prev => {
          if (payload.eventType === 'INSERT') {
            return [...prev, payload.new].sort((a, b) => a.id.localeCompare(b.id));
          }
          if (payload.eventType === 'UPDATE') {
            return prev.map(w =>
              w.id === payload.new.id ? { ...payload.new, _updatedAt: Date.now() } : w
            );
          }
          if (payload.eventType === 'DELETE') {
            return prev.filter(w => w.id !== payload.old.id);
          }
          return prev;
        });
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supaSystem.removeChannel(channelRef.current);
      }
    };
  }, [fetchWorkers]);

  return { workers, loading, refresh: fetchWorkers };
}
