import { useState, useEffect, useRef } from 'react';
import { supa } from '../supa';

const TTL_LOCALIZACAO_MS = 6 * 60 * 60 * 1000;
const TTL_GEO_MS         = 1 * 60 * 60 * 1000;

// Cache em memória para evitar re-fetch durante navegação da mesma sessão
const memoryCache = new Map();

/**
 * Hook unificado para forecast meteorológico.
 *
 * @param {Object} opts
 * @param {string|null} opts.localizacao_id - se fornecido, modo B (casa)
 * @param {boolean} opts.geo - se true e sem localizacao_id, modo A (browser geolocation)
 * @returns {{ weather, loading, error, refresh }}
 */
export function useWeatherForecast(opts = {}) {
  const { localizacao_id = null, geo = false } = opts;

  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const lastKeyRef = useRef(null);

  const key = localizacao_id
    ? `loc:${localizacao_id}`
    : geo
      ? 'geo'
      : null;

  useEffect(() => {
    if (!key) {
      setWeather(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (lastKeyRef.current === key && weather) return;
    lastKeyRef.current = key;

    let cancelled = false;

    const fetchWeather = async () => {
      const cached = memoryCache.get(key);
      const ttl = localizacao_id ? TTL_LOCALIZACAO_MS : TTL_GEO_MS;
      if (cached && Date.now() - cached.fetchedAt < ttl) {
        if (!cancelled) {
          setWeather(cached.data);
          setLoading(false);
          setError(null);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let body;

        if (localizacao_id) {
          body = { mode: 'localizacao', localizacao_id };
        } else if (geo) {
          if (!navigator.geolocation) {
            throw new Error('Geolocation não suportada');
          }

          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              {
                enableHighAccuracy: false,
                timeout: 8000,
                maximumAge: 5 * 60 * 1000,
              }
            );
          });

          body = {
            mode: 'geo',
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
        }

        const { data, error: invokeErr } = await supa.functions.invoke(
          'weather-forecast',
          { body }
        );

        if (cancelled) return;

        if (invokeErr) throw new Error(invokeErr.message);

        if (!data?.available) {
          setWeather(null);
          setLoading(false);
          return;
        }

        memoryCache.set(key, { data, fetchedAt: Date.now() });
        setWeather(data);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        // Falha silenciosa — geo negada, network error, etc.
        setError(err.message ?? String(err));
        setWeather(null);
        setLoading(false);
      }
    };

    fetchWeather();

    return () => { cancelled = true; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => {
    if (key) {
      memoryCache.delete(key);
      lastKeyRef.current = null;
    }
  };

  return { weather, loading, error, refresh };
}

/**
 * Retorna o alert mais severo de uma lista (ou null).
 * Ordem: urgent > warning > info
 */
export function getMostSevereAlert(alerts, opts = {}) {
  const { manutencaoOnly = false } = opts;
  if (!Array.isArray(alerts) || alerts.length === 0) return null;

  const filtered = manutencaoOnly
    ? alerts.filter(a => a.manutencao_relevant)
    : alerts;

  if (filtered.length === 0) return null;

  const order = { urgent: 3, warning: 2, info: 1 };
  return filtered.reduce((most, current) => {
    const m = order[most.severity] ?? 0;
    const c = order[current.severity] ?? 0;
    return c > m ? current : most;
  });
}
