// =============================================================================
// WMO Weather Codes (Open-Meteo) → PT translations + UI metadata
// =============================================================================
// Fonte: https://open-meteo.com/en/docs (lista oficial WMO)
// Mapping cobre 95% casos práticos. Códigos não listados retornam 'unknown'.
// =============================================================================

export type WeatherSeverity = 'normal' | 'caution' | 'severe';

export interface WeatherCodeInfo {
  pt: string;          // descrição em pt-PT minúsculas
  icon: string;        // emoji para UI
  severity: WeatherSeverity;
}

export const WEATHER_CODES: Record<number, WeatherCodeInfo> = {
  // Céu limpo / pouco nublado
  0:  { pt: 'céu limpo',                icon: '☀️', severity: 'normal' },
  1:  { pt: 'principalmente limpo',     icon: '🌤️', severity: 'normal' },
  2:  { pt: 'parcialmente nublado',     icon: '⛅', severity: 'normal' },
  3:  { pt: 'muito nublado',            icon: '☁️', severity: 'normal' },

  // Nevoeiro
  45: { pt: 'nevoeiro',                 icon: '🌫️', severity: 'caution' },
  48: { pt: 'nevoeiro com geada',       icon: '🌫️', severity: 'caution' },

  // Chuvisco
  51: { pt: 'chuvisco fraco',           icon: '🌦️', severity: 'normal' },
  53: { pt: 'chuvisco moderado',        icon: '🌦️', severity: 'caution' },
  55: { pt: 'chuvisco forte',           icon: '🌧️', severity: 'caution' },

  // Chuva
  61: { pt: 'chuva fraca',              icon: '🌦️', severity: 'normal' },
  63: { pt: 'chuva moderada',           icon: '🌧️', severity: 'caution' },
  65: { pt: 'chuva forte',              icon: '🌧️', severity: 'severe' },

  // Chuva gelada
  66: { pt: 'chuva gelada fraca',       icon: '🌧️', severity: 'caution' },
  67: { pt: 'chuva gelada forte',       icon: '🌧️', severity: 'severe' },

  // Neve
  71: { pt: 'neve fraca',               icon: '🌨️', severity: 'caution' },
  73: { pt: 'neve moderada',            icon: '🌨️', severity: 'caution' },
  75: { pt: 'neve forte',               icon: '❄️', severity: 'severe' },
  77: { pt: 'grãos de neve',            icon: '🌨️', severity: 'caution' },

  // Aguaceiros
  80: { pt: 'aguaceiros fracos',        icon: '🌦️', severity: 'normal' },
  81: { pt: 'aguaceiros moderados',     icon: '🌧️', severity: 'caution' },
  82: { pt: 'aguaceiros violentos',     icon: '⛈️', severity: 'severe' },

  // Aguaceiros de neve
  85: { pt: 'aguaceiros de neve fracos', icon: '🌨️', severity: 'caution' },
  86: { pt: 'aguaceiros de neve fortes', icon: '❄️', severity: 'severe' },

  // Trovoada
  95: { pt: 'trovoada',                 icon: '⛈️', severity: 'severe' },
  96: { pt: 'trovoada com granizo fraco',  icon: '⛈️', severity: 'severe' },
  99: { pt: 'trovoada com granizo forte',  icon: '⛈️', severity: 'severe' },
};

const UNKNOWN: WeatherCodeInfo = {
  pt: 'condições variáveis',
  icon: '🌥️',
  severity: 'normal',
};

export function getWeatherCodeInfo(code: number | null | undefined): WeatherCodeInfo {
  if (code == null) return UNKNOWN;
  return WEATHER_CODES[code] ?? UNKNOWN;
}
