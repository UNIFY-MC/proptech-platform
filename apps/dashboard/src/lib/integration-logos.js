// integration-logos — resolve URL do logo brand real para cada integração
//
// Estratégia:
//  1. Simple Icons CDN (https://cdn.simpleicons.org/<slug>) — 3000+ marcas SVG oficiais
//  2. URLs customizadas para marcas que não estão em Simple Icons (PT/PT-EU)
//  3. Fallback: null → o componente usa lucide-react

// Mapping slug interno → simpleicons slug
const SIMPLEICONS_MAP = {
  'github':            'github',
  'vercel':            'vercel',
  'supabase':          'supabase',
  'anthropic':         'anthropic',
  'openai':            'openai',
  'notion':            'notion',
  'google-drive':      'googledrive',
  'gmail':             'gmail',
  'google-calendar':   'googlecalendar',
  'google-maps':       'googlemaps',
  'resend':            'resend',
  'apify':             'apify',
  'meta-graph':        'meta',
  'linkedin':          'linkedin',
  'x-twitter':         'x',
  'whatsapp-business': 'whatsapp',
  'twilio':            'twilio',
  'stripe':            'stripe',
  'zapier':            'zapier',
  'make':              'make',
  'clickup':           'clickup',
  'asana':             'asana',
  'airbnb':            'airbnb',
  'booking':           'bookingdotcom',
  'repsol-eletric':    'repsol',
  'idealista':         'idealista',
  // ('galp' não existe em simpleicons mas é uma marca PT — uso custom)
}

// Custom logo URLs para marcas locais PT/EU sem Simple Icons
const CUSTOM_LOGOS = {
  'toconline':    'https://www.toconline.pt/wp-content/uploads/2024/01/Logo-Toconline-Sage.svg',
  'banco-bcp':    'https://logos-world.net/wp-content/uploads/2024/04/Millennium-bcp-Logo.png',
  'generali':     'https://logos-world.net/wp-content/uploads/2021/02/Generali-Logo.png',
  'liberty':      'https://www.libertyseguros.pt/sites/default/files/imce/files/styles/logo/public/logos/Liberty_logo_RGB.png',
  'spock-es':     'https://spock.es/wp-content/uploads/2023/06/logo-spock-bw.svg',
  'galp':         'https://logos-world.net/wp-content/uploads/2023/01/Galp-Logo.png',
  'imovirtual':   'https://www.imovirtual.com/_next/static/media/logo-text-only.85eb89e7.svg',
  'swan-baas':    'https://swan.io/favicon.svg',
  'gohighlevel':  'https://www.gohighlevel.com/favicon.png',
}

/**
 * Devolve URL do logo brand para a integração.
 * @param {object} integ — { slug, brand_color }
 * @returns {string|null} — URL absoluta ou null se não há logo (usar fallback Lucide)
 */
export function getIntegrationLogo(integ) {
  if (!integ) return null
  const slug = integ.slug

  // 1. Custom override primeiro (marcas PT/EU)
  if (CUSTOM_LOGOS[slug]) return CUSTOM_LOGOS[slug]

  // 2. Simple Icons (com cor brand se disponível)
  const siSlug = SIMPLEICONS_MAP[slug]
  if (siSlug) {
    const color = (integ.brand_color || '').replace('#', '')
    return color ? `https://cdn.simpleicons.org/${siSlug}/${color}` : `https://cdn.simpleicons.org/${siSlug}`
  }

  return null
}

/**
 * Devolve cor brand de fundo apropriada para o ícone.
 * Algumas marcas (Notion, Vercel) têm logo preto que não fica visível em fundo escuro;
 * para essas usamos invert via CSS filter.
 */
export const NEEDS_DARK_INVERT = new Set([
  'github', 'notion', 'vercel', 'x-twitter', 'resend', 'anthropic',
  'meta-graph', 'swan-baas',
])
