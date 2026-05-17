import { useState, useEffect, useRef } from 'react';
import { supaSystem } from '../lib/supabase.js';

export function useSwarmWorkers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  async function fetchWorkers() {
    const { data, error } = await supaSystem
      .from('swarm_workers')
      .select('*')
      .order('worker_id', { ascending: true });

    if (!error && data) {
      setWorkers(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchWorkers();

    // Realtime subscribe a alterações em swarm_workers
    channelRef.current = supaSystem
      .channel('truth-swarm-workers')
      .on('postgres_changes', {
        event: '*',
        schema: 'system',
        table: 'swarm_workers',
      }, (payload) => {
        setWorkers(prev => {
          if (payload.eventType === 'INSERT') {
            return [...prev, payload.new];
          }
          if (payload.eventType === 'UPDATE') {
            return prev.map(w => w.id === payload.new.id ? payload.new : w);
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
  }, []);

  return { workers, loading };
}
