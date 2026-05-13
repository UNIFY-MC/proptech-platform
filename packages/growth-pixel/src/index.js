/*
 * @proptech/growth-pixel — tracking de eventos de marketing/growth
 * Funcionalidade:
 *   1. Captura UTM params do URL automaticamente (1ª pageview por sessão)
 *   2. Envia eventos para growth-track-event edge function
 *   3. Auto-pageview + auto-form-submit opcional
 *   4. Persiste lead_id no localStorage entre sessões (atribuição multi-touch)
 *
 * Uso simples (HTML estático):
 *   <script type="module">
 *     import { initGrowthPixel } from 'https://cdn.skypack.dev/@proptech/growth-pixel'
 *     initGrowthPixel({ vertical: 'v4', endpoint: 'https://...supabase.co/functions/v1/growth-track-event', anonKey: 'eyJ...', autoPageview: true })
 *   </script>
 *
 * Uso React (V2, V4, etc):
 *   import { useGrowthPixel } from '@proptech/growth-pixel/hook'
 *   const { track, identify } = useGrowthPixel({ vertical: 'v4' })
 *   track('simulador_completo', { consumo: 350 })
 *   identify({ email: 'a@b.pt' })
 */

const STORAGE_KEY = 'pg_pixel'
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']

function readState() {
  if (typeof localStorage === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
function writeState(s) {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

function captureUtmFromUrl() {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  const captured = {}
  for (const k of UTM_KEYS) {
    const v = params.get(k)
    if (v) captured[k] = v
  }
  return captured
}

let _config = null
let _state = null

/**
 * @param {object} cfg
 * @param {string} cfg.vertical — v2|v3|v4|v5|v10
 * @param {string} cfg.endpoint — full URL para growth-track-event edge function
 * @param {string} cfg.anonKey — Supabase anon key (segura para expor frontend)
 * @param {boolean} [cfg.autoPageview=true] — envia pageview no init
 * @param {boolean} [cfg.autoForms=false] — track automaticamente <form> submits
 * @param {object} [cfg.defaults] — campos extra para incluir em todos eventos
 */
export function initGrowthPixel(cfg) {
  if (!cfg?.vertical || !cfg?.endpoint || !cfg?.anonKey) {
    console.warn('[growth-pixel] cfg incompleto:', cfg)
    return null
  }
  _config = { autoPageview: true, autoForms: false, defaults: {}, ...cfg }
  _state = readState()

  // Captura UTM do URL e persiste para multi-touch
  const urlUtm = captureUtmFromUrl()
  if (Object.keys(urlUtm).length > 0) {
    _state.utm = { ..._state.utm, ...urlUtm, last_seen_at: Date.now() }
    _state.first_landing = _state.first_landing || window.location.href
    writeState(_state)
  }

  if (_config.autoPageview) {
    track('pageview', { title: typeof document !== 'undefined' ? document.title : null })
  }

  if (_config.autoForms && typeof document !== 'undefined') {
    document.addEventListener('submit', autoFormHandler, true)
  }

  return { track, identify, getState: () => ({ ..._state }) }
}

function autoFormHandler(e) {
  const form = e.target
  if (!(form instanceof HTMLFormElement)) return
  const data = {}
  const fd = new FormData(form)
  for (const [k, v] of fd.entries()) {
    if (k.toLowerCase() === 'password') continue
    data[k] = v
  }
  track('form_submit', {
    form_id: form.id || form.name || null,
    form_action: form.action || null,
    fields: data,
  })
}

/**
 * Identifica o user (atribuição pessoa). Chamar quando obtens o email.
 */
export function identify(profile) {
  if (!_config || !_state) return
  _state.identity = { ..._state.identity, ...profile, identified_at: Date.now() }
  writeState(_state)
  return track('identify', profile)
}

/**
 * Track evento custom.
 * @param {string} tipo — pageview | form_submit | simulador_completo | cta_click | etc
 * @param {object} [dados] — payload extra
 */
export function track(tipo, dados = {}) {
  if (!_config) {
    console.warn('[growth-pixel] not initialized — call initGrowthPixel first')
    return Promise.resolve(null)
  }
  const utm = _state?.utm || {}
  const identity = _state?.identity || {}
  const body = {
    vertical: _config.vertical,
    tipo,
    email:    identity.email || dados.email || null,
    nome:     identity.nome || dados.nome || null,
    telefone: identity.telefone || dados.telefone || null,
    lead_id:  _state?.lead_id || null,
    pessoa_id: _state?.pessoa_id || null,
    utm_source:   utm.utm_source || null,
    utm_medium:   utm.utm_medium || null,
    utm_campaign: utm.utm_campaign || null,
    utm_term:     utm.utm_term || null,
    utm_content:  utm.utm_content || null,
    referrer_url: typeof document !== 'undefined' ? document.referrer : null,
    landing_page: _state?.first_landing || (typeof window !== 'undefined' ? window.location.href : null),
    url:          typeof window !== 'undefined' ? window.location.href : null,
    dados:        { ..._config.defaults, ...dados },
  }
  return fetch(_config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + _config.anonKey,
      'apikey':        _config.anonKey,
    },
    body: JSON.stringify(body),
    keepalive: true,
  })
  .then(r => r.json().catch(() => ({})))
  .then(data => {
    // Persistir lead_id devolvido para próximos eventos
    if (data?.lead_id && data.lead_id !== _state.lead_id) {
      _state.lead_id = data.lead_id
      _state.pessoa_id = data.pessoa_id || _state.pessoa_id
      writeState(_state)
    }
    return data
  })
  .catch(err => {
    if (typeof console !== 'undefined') console.warn('[growth-pixel] track failed:', err)
    return null
  })
}

/**
 * Reset state (logout, GDPR delete, etc).
 */
export function resetPixel() {
  _state = {}
  if (typeof localStorage !== 'undefined') {
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }
}

export default { initGrowthPixel, identify, track, resetPixel }
