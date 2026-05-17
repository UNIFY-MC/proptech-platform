import { useState, useEffect } from 'react';
import { supaSystem } from '../lib/supabase.js';

export function useNiches() {
  const [niches, setNiches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supaSystem
      .from('swarm_niches')
      .select('*')
      .order('priority', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setNiches(data);
        setLoading(false);
      });
  }, []);

  return { niches, loading };
}
