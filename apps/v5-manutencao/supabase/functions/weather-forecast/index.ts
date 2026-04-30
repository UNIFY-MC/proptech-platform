// =============================================================================
// Edge Function: weather-forecast
// =============================================================================
// 2 modos:
//   { mode: 'localizacao', localizacao_id: 'uuid' } — casa específica
//   { mode: 'geo', lat: number, lng: number }      — geolocation user
//
// Cascade resolver coords (Modo localizacao):
//   1. localizacoes.coords NOT NULL → directo
//   2. localidade/cidade → Open-Meteo Geocoding API
//   3. concelho → Open-Meteo Geocoding API
//   4. codigo_postal → core.codigos_postais → localidade → Open-Meteo Geocoding
//   5. fail → { available: false, reason: 'no_geo' }
//
// Cache:
//   Modo localizacao: key="loc:{uuid}",              TTL=6h
//   Modo geo:         key="geo:lat:LL.LL,lng:LL.LL"  TTL=1h  (2 decimais ~1.1km)
// =============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";
import { getWeatherCodeInfo } from "../_shared/weather-codes.ts";
import { computeAlerts } from "../_shared/weather-alerts.ts";

// ─── Config ──────────────────────────────────────────────────────────────────
const OPEN_METEO_BASE    = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_GEOCODE = "https://geocoding-api.open-meteo.com/v1/search";

const TTL_LOCALIZACAO_MS = 6 * 60 * 60 * 1000;   // 6h
const TTL_GEO_MS         = 1 * 60 * 60 * 1000;   // 1h

const OPEN_METEO_PARAMS = {
  current:      "temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m",
  hourly:       "precipitation,precipitation_probability,wind_speed_10m,wind_gusts_10m,temperature_2m",
  daily:        "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,weather_code",
  forecast_days: "3",
  timezone:     "auto",
};

// ─── CORS ─────────────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST")    return json({ error: "Method not allowed" }, 405);

  try {
    // ── 1. Auth ────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey    = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const serviceRole = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "JWT inválido" }, 401);

    // ── 2. Parse body ──────────────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Body inválido" }, 400);

    const mode = body.mode;
    if (mode !== "localizacao" && mode !== "geo") {
      return json({ error: "mode inválido (esperado 'localizacao' ou 'geo')" }, 400);
    }

    let lat: number;
    let lng: number;
    let cacheKey: string;
    let cacheTTL: number;
    let locationLabel: string;
    let resolvedVia: string;
    let localizacaoMeta: { id: string; nome: string } | null = null;

    if (mode === "geo") {
      // ── Modo GEO ──────────────────────────────────────────────────────
      lat = Number(body.lat);
      lng = Number(body.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return json({ error: "lat/lng inválidos" }, 400);
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return json({ error: "lat/lng fora do range" }, 400);
      }

      // 2 decimais (~1.1km, privacidade)
      const latR = Math.round(lat * 100) / 100;
      const lngR = Math.round(lng * 100) / 100;
      cacheKey      = `geo:lat:${latR.toFixed(2)},lng:${lngR.toFixed(2)}`;
      cacheTTL      = TTL_GEO_MS;
      lat           = latR;
      lng           = lngR;
      resolvedVia   = "browser-geolocation";

      // Reverse geocoding para cidade próxima (fallback: coords cruas)
      locationLabel = await reverseGeocodeOpenMeteo(latR, lngR)
        ?? `${latR.toFixed(2)}, ${lngR.toFixed(2)}`;

    } else {
      // ── Modo LOCALIZACAO ──────────────────────────────────────────────
      const localizacao_id = body.localizacao_id;
      if (typeof localizacao_id !== "string" || !localizacao_id) {
        return json({ error: "localizacao_id requerido" }, 400);
      }

      // orgIds do user (padrão casa_advisor)
      const { data: orgIds, error: orgErr } = await userClient.rpc("current_organization_ids");
      if (orgErr) throw new Error(`Erro a obter orgs: ${orgErr.message}`);

      // Lookup via serviceRole (bypass RLS, validação manual por orgIds)
      const { data: loc, error: locErr } = await serviceRole
        .schema("v5_manutencao")
        .from("localizacoes")
        .select("id, organization_id, nome, coords, localidade, cidade, concelho, codigo_postal, pais")
        .eq("id", localizacao_id)
        .maybeSingle();

      if (locErr) throw new Error(`Erro a verificar localização: ${locErr.message}`);
      if (!loc) return json({ error: "localizacao não encontrada" }, 404);
      if (!(orgIds as string[]).includes(loc.organization_id)) {
        return json({ error: "localizacao_id sem acesso" }, 403);
      }

      cacheKey       = `loc:${localizacao_id}`;
      cacheTTL       = TTL_LOCALIZACAO_MS;
      localizacaoMeta = { id: loc.id, nome: loc.nome };

      // Cascade resolver
      const resolution = await resolveCoordsCascade(loc, serviceRole);
      if (!resolution) {
        return json({
          available: false,
          reason: "no_geo",
          message: "Localização sem coords nem morada utilizável para geocoding",
          localizacao: localizacaoMeta,
        }, 200);
      }

      lat           = resolution.lat;
      lng           = resolution.lng;
      locationLabel = resolution.label;
      resolvedVia   = resolution.via;
    }

    // ── 3. Cache lookup ────────────────────────────────────────────────────
    const { data: cached } = await serviceRole
      .schema("v5_manutencao")
      .from("weather_forecast_cache")
      .select("raw_json, alerts, fetched_at, expires_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();

    const now        = Date.now();
    const cacheValid = cached && new Date(cached.expires_at).getTime() > now;

    // deno-lint-ignore no-explicit-any
    let raw: any;
    // deno-lint-ignore no-explicit-any
    let alerts: any;
    let fromCache = false;

    if (cacheValid) {
      raw       = cached.raw_json;
      alerts    = cached.alerts;
      fromCache = true;
    } else {
      // ── 4. Fetch Open-Meteo ──────────────────────────────────────────
      const params = new URLSearchParams({
        latitude:     lat.toString(),
        longitude:    lng.toString(),
        current:      OPEN_METEO_PARAMS.current,
        hourly:       OPEN_METEO_PARAMS.hourly,
        daily:        OPEN_METEO_PARAMS.daily,
        forecast_days: OPEN_METEO_PARAMS.forecast_days,
        timezone:     OPEN_METEO_PARAMS.timezone,
      });

      const resp = await fetch(`${OPEN_METEO_BASE}?${params}`);
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Open-Meteo falhou (${resp.status}): ${errText.slice(0, 200)}`);
      }
      raw    = await resp.json();
      alerts = computeAlerts(raw);

      // Write cache (TTL por modo)
      const expiresAt = new Date(now + cacheTTL).toISOString();
      await serviceRole
        .schema("v5_manutencao")
        .from("weather_forecast_cache")
        .upsert({
          cache_key:  cacheKey,
          raw_json:   raw,
          alerts:     alerts,
          source:     "open-meteo",
          fetched_at: new Date(now).toISOString(),
          expires_at: expiresAt,
        }, { onConflict: "cache_key" });
    }

    // ── 5. Format response ─────────────────────────────────────────────────
    const currentCode = raw?.current?.weather_code;
    const codeInfo    = getWeatherCodeInfo(currentCode);

    return json({
      available:  true,
      mode,
      source:     "open-meteo",
      from_cache: fromCache,

      current: {
        temperature:   raw?.current?.temperature_2m,
        weather_code:  currentCode,
        weather_label: codeInfo.pt,
        weather_icon:  codeInfo.icon,
        wind_speed:    raw?.current?.wind_speed_10m,
        humidity:      raw?.current?.relative_humidity_2m,
      },

      forecast: {
        hourly: raw?.hourly,   // 48h+ — frontend faz slicing
        daily:  raw?.daily,    // 3 dias
      },

      alerts,

      location: {
        label:        locationLabel,
        coords:       [lat, lng],
        resolved_via: resolvedVia,
        ...(localizacaoMeta ? { localizacao: localizacaoMeta } : {}),
      },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[weather-forecast] erro:", msg);
    return json({ error: "erro_interno", message: msg }, 500);
  }
});

// ─── Cascade resolver ─────────────────────────────────────────────────────────
interface LocalizacaoRow {
  coords: unknown;          // point — Postgres retorna como string '(x,y)' ou objecto {x,y}
  localidade:    string | null;
  cidade:        string | null;
  concelho:      string | null;
  codigo_postal: string | null;
  pais:          string | null;
  nome:          string | null;
}

interface ResolvedCoords {
  lat: number;
  lng: number;
  label: string;
  via: "coords" | "localidade" | "cidade" | "concelho" | "codigo_postal";
}

async function resolveCoordsCascade(
  loc: LocalizacaoRow,
  serviceRole: ReturnType<typeof createClient>,
): Promise<ResolvedCoords | null> {
  // 1. coords NOT NULL
  if (loc.coords) {
    const parsed = parsePoint(loc.coords);
    if (parsed) {
      return {
        lat:   parsed.lat,
        lng:   parsed.lng,
        label: loc.localidade ?? loc.cidade ?? loc.nome ?? "localização",
        via:   "coords",
      };
    }
  }

  // 2. localidade → Open-Meteo Geocoding
  if (loc.localidade) {
    const geo = await geocodeOpenMeteo(loc.localidade, loc.pais ?? "PT");
    if (geo) return { ...geo, label: loc.localidade, via: "localidade" };
  }

  // 3. cidade → Open-Meteo Geocoding
  if (loc.cidade) {
    const geo = await geocodeOpenMeteo(loc.cidade, loc.pais ?? "PT");
    if (geo) return { ...geo, label: loc.cidade, via: "cidade" };
  }

  // 4. concelho → Open-Meteo Geocoding
  if (loc.concelho) {
    const geo = await geocodeOpenMeteo(loc.concelho, loc.pais ?? "PT");
    if (geo) return { ...geo, label: loc.concelho, via: "concelho" };
  }

  // 5. codigo_postal → core.codigos_postais → localidade → Geocoding
  if (loc.codigo_postal) {
    const { data: cp } = await serviceRole
      .schema("core")
      .from("codigos_postais")
      .select("localidade, designacao_postal, pais")
      .eq("cp_completo", loc.codigo_postal)
      .eq("pais", loc.pais ?? "PT")
      .limit(1)
      .maybeSingle();

    const cpPlace = cp?.localidade ?? cp?.designacao_postal;
    if (cpPlace) {
      const geo = await geocodeOpenMeteo(cpPlace, cp?.pais ?? "PT");
      if (geo) return { ...geo, label: cpPlace, via: "codigo_postal" };
    }
  }

  return null;
}

function parsePoint(coords: unknown): { lat: number; lng: number } | null {
  // Postgres point: string "(x,y)" ou objecto { x, y }
  if (typeof coords === "string") {
    const m = coords.match(/^\(([-\d.]+),([-\d.]+)\)$/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  }
  if (typeof coords === "object" && coords !== null) {
    const c = coords as { x?: number; y?: number };
    if (typeof c.x === "number" && typeof c.y === "number") {
      return { lat: c.x, lng: c.y };
    }
  }
  return null;
}

async function geocodeOpenMeteo(
  name: string,
  countryCode: string,
): Promise<{ lat: number; lng: number } | null> {
  const params = new URLSearchParams({ name, count: "1", language: "pt", format: "json" });
  try {
    const resp = await fetch(`${OPEN_METEO_GEOCODE}?${params}`);
    if (!resp.ok) return null;
    const data    = await resp.json();
    const results = data?.results;
    if (!Array.isArray(results) || results.length === 0) return null;

    // Prefere match com country_code, fallback ao primeiro resultado
    const match = results.find((r: { country_code?: string }) =>
      r.country_code?.toUpperCase() === countryCode.toUpperCase()
    ) ?? results[0];

    if (typeof match.latitude !== "number" || typeof match.longitude !== "number") return null;
    return { lat: match.latitude, lng: match.longitude };
  } catch {
    return null;
  }
}

// ─── Reverse geocoding ────────────────────────────────────────────────────────

/**
 * Reverse geocoding via BigDataCloud (free, sem API key, cobertura mundial).
 * Retorna cidade/localidade próxima em PT, ou null se falhar.
 */
async function reverseGeocodeOpenMeteo(
  lat: number,
  lng: number,
): Promise<string | null> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?` +
      `latitude=${lat}&longitude=${lng}&localityLanguage=pt`;

    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();

    // Preferir city > locality > principalSubdivision
    const name = data?.city || data?.locality || data?.principalSubdivision;
    return name || null;
  } catch {
    return null;
  }
}
