import { useState, useEffect } from 'react';
import { supaSystem } from '../lib/supabase.js';

export function useWorkerRuns(workerId, limit = 10) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workerId) {
      setRuns([]);
      setLoading(false);
      return;
    }

    async function fetchRuns() {
      setLoading(true);
      const { data, error } = await supaSystem
        .from('swarm_runs')
        .select('*')
        .eq('worker_id', workerId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (!error && data) {
        setRuns(data);
      }
      setLoading(false);
    }

    fetchRuns();
  }, [workerId, limit]);

  return { runs, loading };
}
