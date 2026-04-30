// =============================================================================
// Weather Alerts — calcula alertas de manutenção a partir do forecast Open-Meteo
// =============================================================================
// 4 alerts: chuva_forte, vento_forte, geada, calor_extremo
// 3 níveis severity: info, warning, urgent
//
// manutencao_relevant=true → alertas que justificam acção preventiva (banner)
// =============================================================================

export type AlertSeverity = 'info' | 'warning' | 'urgent';

export interface WeatherAlert {
  id: 'chuva_forte' | 'vento_forte' | 'geada' | 'calor_extremo';
  severity: AlertSeverity;
  title: string;
  detail: string;
  window: string;                  // 'próximas 24h', 'próximas 48h', etc
  manutencao_relevant: boolean;    // dispara banner manutenção?
}

interface ForecastData {
  hourly?: {
    time: string[];
    precipitation?: number[];
    precipitation_probability?: number[];
    wind_speed_10m?: number[];
    wind_gusts_10m?: number[];
    temperature_2m?: number[];
  };
  daily?: {
    time: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    precipitation_probability_max?: number[];
    wind_speed_10m_max?: number[];
    wind_gusts_10m_max?: number[];
  };
}

/**
 * Calcula alertas baseado em forecast Open-Meteo.
 * Janela: próximas 48h (hourly) + próximos 3 dias (daily).
 */
export function computeAlerts(forecast: ForecastData): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  // Próximas 48h (hourly slice)
  const hourly48h = forecast.hourly ? sliceHourly(forecast.hourly, 48) : null;
  // Próximos 3 dias (daily slice)
  const daily3d = forecast.daily ? sliceDaily(forecast.daily, 3) : null;

  // ── 1. Chuva forte ────────────────────────────────────────────────────
  if (hourly48h?.precipitation && hourly48h.precipitation_probability) {
    const precipSum = hourly48h.precipitation.reduce((a, b) => a + (b || 0), 0);
    const precipProbMax = Math.max(...hourly48h.precipitation_probability.filter(v => v != null));

    if (precipSum > 60 || (precipSum > 30 && precipProbMax > 80)) {
      alerts.push({
        id: 'chuva_forte',
        severity: precipSum > 60 ? 'urgent' : 'warning',
        title: 'Chuva forte prevista',
        detail: `Acumulado esperado: ${Math.round(precipSum)}mm`,
        window: 'próximas 48h',
        manutencao_relevant: true,
      });
    } else if (precipSum > 15 && precipProbMax > 70) {
      alerts.push({
        id: 'chuva_forte',
        severity: 'info',
        title: 'Chuva moderada prevista',
        detail: `Acumulado esperado: ${Math.round(precipSum)}mm`,
        window: 'próximas 48h',
        manutencao_relevant: false,
      });
    }
  }

  // ── 2. Vento forte ────────────────────────────────────────────────────
  if (hourly48h?.wind_gusts_10m) {
    const gustsMax = Math.max(...hourly48h.wind_gusts_10m.filter(v => v != null));

    if (gustsMax > 90) {
      alerts.push({
        id: 'vento_forte',
        severity: 'urgent',
        title: 'Vento muito forte previsto',
        detail: `Rajadas até ${Math.round(gustsMax)} km/h`,
        window: 'próximas 48h',
        manutencao_relevant: true,
      });
    } else if (gustsMax > 60) {
      alerts.push({
        id: 'vento_forte',
        severity: 'warning',
        title: 'Vento forte previsto',
        detail: `Rajadas até ${Math.round(gustsMax)} km/h`,
        window: 'próximas 48h',
        manutencao_relevant: true,
      });
    }
  }

  // ── 3. Geada ──────────────────────────────────────────────────────────
  if (daily3d?.temperature_2m_min) {
    const tempMin = Math.min(...daily3d.temperature_2m_min.filter(v => v != null));

    if (tempMin < 0) {
      alerts.push({
        id: 'geada',
        severity: 'urgent',
        title: 'Geada severa prevista',
        detail: `Mínima esperada: ${Math.round(tempMin)}°C`,
        window: 'próximos 3 dias',
        manutencao_relevant: true,
      });
    } else if (tempMin < 2) {
      alerts.push({
        id: 'geada',
        severity: 'warning',
        title: 'Geada prevista',
        detail: `Mínima esperada: ${Math.round(tempMin)}°C`,
        window: 'próximos 3 dias',
        manutencao_relevant: true,
      });
    }
  }

  // ── 4. Calor extremo ──────────────────────────────────────────────────
  if (daily3d?.temperature_2m_max) {
    const tempMax = Math.max(...daily3d.temperature_2m_max.filter(v => v != null));

    if (tempMax > 40) {
      alerts.push({
        id: 'calor_extremo',
        severity: 'urgent',
        title: 'Calor extremo previsto',
        detail: `Máxima esperada: ${Math.round(tempMax)}°C`,
        window: 'próximos 3 dias',
        manutencao_relevant: true,
      });
    } else if (tempMax > 35) {
      alerts.push({
        id: 'calor_extremo',
        severity: 'warning',
        title: 'Calor intenso previsto',
        detail: `Máxima esperada: ${Math.round(tempMax)}°C`,
        window: 'próximos 3 dias',
        manutencao_relevant: true,
      });
    }
  }

  return alerts;
}

function sliceHourly(hourly: NonNullable<ForecastData['hourly']>, hours: number) {
  return {
    time: hourly.time.slice(0, hours),
    precipitation: hourly.precipitation?.slice(0, hours),
    precipitation_probability: hourly.precipitation_probability?.slice(0, hours),
    wind_speed_10m: hourly.wind_speed_10m?.slice(0, hours),
    wind_gusts_10m: hourly.wind_gusts_10m?.slice(0, hours),
    temperature_2m: hourly.temperature_2m?.slice(0, hours),
  };
}

function sliceDaily(daily: NonNullable<ForecastData['daily']>, days: number) {
  return {
    time: daily.time.slice(0, days),
    temperature_2m_max: daily.temperature_2m_max?.slice(0, days),
    temperature_2m_min: daily.temperature_2m_min?.slice(0, days),
    precipitation_sum: daily.precipitation_sum?.slice(0, days),
    precipitation_probability_max: daily.precipitation_probability_max?.slice(0, days),
    wind_speed_10m_max: daily.wind_speed_10m_max?.slice(0, days),
    wind_gusts_10m_max: daily.wind_gusts_10m_max?.slice(0, days),
  };
}
