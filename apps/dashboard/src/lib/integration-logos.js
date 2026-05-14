// integration-logos — resolve URL do logo brand real para cada integração
//
// Estratégia (prioridade descendente):
//  1. CLEARBIT_DOMAIN_MAP → logo.clearbit.com/<domain> (multi-color real, PNG)
//  2. CUSTOM_LOGOS → URL directa do site oficial (PT/EU marcas)
//  3. SIMPLEICONS_MAP → cdn.simpleicons.org/<slug>/<color> (mono SVG)
//  4. null → fallback Lucide no componente

// Clearbit Logo API: domínio oficial → logo multi-color
// (https://logo.clearbit.com/<domain> — PNG transparente com cores reais)
const CLEARBIT_DOMAIN_MAP = {
  'github':            'github.com',
  'vercel':            'vercel.com',
  'supabase':          'supabase.com',
  'anthropic':         'anthropic.com',
  'openai':            'openai.com',
  'notion':            'notion.so',
  'google-drive':      'drive.google.com',
  'gmail':             'gmail.com',
  'google-calendar':   'calendar.google.com',
  'google-maps':       'maps.google.com',
  'resend':            'resend.com',
  'apify':             'apify.com',
  'meta-graph':        'meta.com',
  'linkedin':          'linkedin.com',
  'x-twitter':         'x.com',
  'whatsapp-business': 'whatsapp.com',
  'twilio':            'twilio.com',
  'stripe':            'stripe.com',
  'zapier':            'zapier.com',
  'make':              'make.com',
  'clickup':           'clickup.com',
  'asana':             'asana.com',
  'airbnb':            'airbnb.com',
  'booking':           'booking.com',
  'toconline':         'toconline.pt',
  'moloni':            'moloni.com',
  'banco-bcp':         'millenniumbcp.pt',
  'generali':          'generali.pt',
  'liberty':           'libertyseguros.pt',
  'spock-es':          'spock.es',
  'galp':              'galp.com',
  'repsol-eletric':    'repsol.com',
  'idealista':         'idealista.pt',
  'imovirtual':        'imovirtual.com',
  'swan-baas':         'swan.io',
  'gohighlevel':       'gohighlevel.com',
  'vonage-sms':        'vonage.com',
  'posthog':           'posthog.com',
  'discord-webhook':   'discord.com',
  'erse-api':          'erse.pt',
  'seguradoras-api':   'apsesguradores.pt',
}

// Mapping slug interno → simpleicons slug (fallback mono)
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
 * Prefere Clearbit (multi-color real) → Custom URLs → Simple Icons (mono) → null.
 * @param {object} integ — { slug, brand_color }
 * @returns {string|null} — URL absoluta ou null se não há logo (usar fallback Lucide)
 */
export function getIntegrationLogo(integ) {
  if (!integ) return null
  const slug = integ.slug

  // 1. Clearbit — multi-color, melhor opção visual
  if (CLEARBIT_DOMAIN_MAP[slug]) {
    return `https://logo.clearbit.com/${CLEARBIT_DOMAIN_MAP[slug]}`
  }

  // 2. Custom override (marcas sem Clearbit)
  if (CUSTOM_LOGOS[slug]) return CUSTOM_LOGOS[slug]

  // 3. Simple Icons (mono, com cor brand)
  const siSlug = SIMPLEICONS_MAP[slug]
  if (siSlug) {
    const color = (integ.brand_color || '').replace('#', '')
    return color ? `https://cdn.simpleicons.org/${siSlug}/${color}` : `https://cdn.simpleicons.org/${siSlug}`
  }

  return null
}

/**
 * URL de fallback alternativa para usar se o primário falhar (img onError).
 * @param {object} integ
 * @returns {string|null}
 */
export function getIntegrationLogoFallback(integ) {
  if (!integ) return null
  const slug = integ.slug
  // Se primário foi Clearbit, fallback é Simple Icons colorido
  if (CLEARBIT_DOMAIN_MAP[slug] && SIMPLEICONS_MAP[slug]) {
    const color = (integ.brand_color || '').replace('#', '')
    return color
      ? `https://cdn.simpleicons.org/${SIMPLEICONS_MAP[slug]}/${color}`
      : `https://cdn.simpleicons.org/${SIMPLEICONS_MAP[slug]}`
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
