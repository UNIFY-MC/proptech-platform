// ApifyActorsPage — /apify-actors
// Gere watcher_sources kind=apify_actor:
//  - Lista actors configurados com last_run_at + last status
//  - "Adicionar actor" modal com presets (IG, X, LinkedIn, Web) +
//    input JSON editável + vertical
//  - "Run now" → invoca apify-run-actor edge fn
//  - Recent runs panel: últimas 10 runs (system_apify_runs view)

import { useState, useEffect } from 'react'
import {
  Plus, Play, X, Trash2, ExternalLink,
  Instagram, Twitter, Linkedin, Globe, Sparkles, Clock, CheckCircle2, AlertCircle,
  Music, Youtube, MessageSquare, Search, Building2, DollarSign,
} from 'lucide-react'
import { useWatcherSources } from '../hooks/useWatcherSources.js'
import { supabase } from '../lib/supabase.js'

const PRESETS = [
  {
    actor_id: 'apify/instagram-scraper',
    label: 'Instagram — posts por handle',
    platform: 'instagram', output_mapper: 'instagram_post',
    icon: Instagram, color: '#ec4899',
    input_template: { username: ['handle_concorrente'], resultsLimit: 5 },
    cost: '$0.02/run',
  },
  {
    actor_id: 'clockworks/free-tiktok-scraper',
    label: 'TikTok — profile posts (free tier)',
    platform: 'tiktok', output_mapper: 'instagram_post',
    icon: Music, color: '#ff0050',
    input_template: { profiles: ['handle_aqui'], resultsPerPage: 5 },
    cost: 'FREE',
  },
  {
    actor_id: 'apidojo/twitter-scraper',
    label: 'X / Twitter — tweets por handle',
    platform: 'x', output_mapper: 'twitter_post',
    icon: Twitter, color: '#1d9bf0',
    input_template: { handle: 'handle_aqui', tweetsDesired: 10 },
    cost: '$0.02/run',
  },
  {
    actor_id: 'apify/linkedin-profile-scraper',
    label: 'LinkedIn — perfil + posts',
    platform: 'linkedin', output_mapper: 'linkedin_post',
    icon: Linkedin, color: '#0a66c2',
    input_template: { profileUrls: ['https://linkedin.com/in/exemplo'] },
    cost: '$0.10/run',
  },
  {
    actor_id: 'apify/youtube-scraper',
    label: 'YouTube — videos por canal',
    platform: 'youtube', output_mapper: 'page_content',
    icon: Youtube, color: '#ff0000',
    input_template: { startUrls: [{ url: 'https://youtube.com/@channel' }], maxResults: 10 },
    cost: '$0.04/run',
  },
  {
    actor_id: 'trudax/reddit-scraper-lite',
    label: 'Reddit — search/subreddit (free)',
    platform: 'reddit', output_mapper: 'page_content',
    icon: MessageSquare, color: '#ff4500',
    input_template: { searches: ['condomínio Portugal'], maxItems: 10 },
    cost: 'FREE',
  },
  {
    actor_id: 'apify/google-search-scraper',
    label: 'Google SERP — tracking de queries',
    platform: 'web', output_mapper: 'page_content',
    icon: Search, color: '#4285f4',
    input_template: { queries: 'condomínios Lisboa\\ngestão condomínio Porto', resultsPerPage: 10 },
    cost: '$0.05/run',
  },
  {
    actor_id: 'epctex/idealista-scraper',
    label: 'Idealista — listings PT',
    platform: 'web', output_mapper: 'page_content',
    icon: Building2, color: '#ff6e00',
    input_template: { startUrls: [{ url: 'https://www.idealista.pt/comprar-casas/lisboa/' }], maxItems: 20 },
    cost: '$0.05/run',
  },
  {
    actor_id: 'apify/crunchbase-company-scraper',
    label: 'Crunchbase — funding signals',
    platform: 'web', output_mapper: 'page_content',
    icon: DollarSign, color: '#0288d1',
    input_template: { companies: ['spock-energia', 'fuelio'] },
    cost: '$0.10/run',
  },
  {
    actor_id: 'apify/web-scraper',
    label: 'Web — site concorrente genérico',
    platform: 'web', output_mapper: 'page_content',
    icon: Globe, color: '#10b981',
    input_template: { startUrls: [{ url: 'https://exemplo.pt' }] },
    cost: '$0.01/run',
  },
]

const PRESET_BY_ACTOR = Object.fromEntries(PRESETS.map(p => [p.actor_id, p]))

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY

async function runActor(sourceId) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/apify-run-actor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
      'apikey': ANON_KEY,
    },
    body: JSON.stringify({ source_id: sourceId }),
  })
  return await res.json()
}

function AddActorModal({ onClose, onCreate }) {
  const [preset, setPreset] = useState(PRESETS[0])
  const [label, setLabel] = useState('')
  const [vertical, setVertical] = useState('')
  const [inputJson, setInputJson] = useState(JSON.stringify(preset.input_template, null, 2))
  const [jsonError, setJsonError] = useState(null)

  function pickPreset(p) {
    setPreset(p)
    setInputJson(JSON.stringify(p.input_template, null, 2))
    if (!label.trim()) setLabel(p.label)
  }

  function submit(e) {
    e.preventDefault()
    if (!label.trim()) return
    try {
      const parsedInput = JSON.parse(inputJson)
      setJsonError(null)
      onCreate({
        kind: 'apify_actor',
        label: label.trim(),
        vertical: vertical || null,
        config: {
          actor_id: preset.actor_id,
          platform: preset.platform,
          output_mapper: preset.output_mapper,
          input: parsedInput,
        },
        active: true,
      })
      onClose()
    } catch (err) {
      setJsonError(err.message)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 22, width: 580, maxWidth: '92vw', maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>Adicionar actor Apify</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={18} /></button>
        </div>

        {/* Preset picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {PRESETS.map(p => {
            const Icon = p.icon
            const active = p.actor_id === preset.actor_id
            return (
              <button key={p.actor_id} type="button" onClick={() => pickPreset(p)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px',
                background: active ? `${p.color}15` : 'var(--bg-elevated)',
                border: `1px solid ${active ? p.color : 'var(--border)'}`,
                borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                color: 'var(--text)',
              }}>
                <Icon size={18} color={p.color} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{p.label}</div>
                  <code style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>{p.actor_id}</code>
                </div>
                <span style={{ fontSize: '0.62rem', color: p.color, fontWeight: 600 }}>{p.cost}</span>
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            value={label} onChange={e => setLabel(e.target.value)}
            placeholder="Label (ex: IG concorrente Acme)"
            autoFocus required
            style={inputStyle}
          />
          <select value={vertical} onChange={e => setVertical(e.target.value)} style={inputStyle}>
            <option value="">Sem vertical específica</option>
            <option value="v2">V2 Condomínios</option>
            <option value="v3">V3 Seguros</option>
            <option value="v4">V4 Energia</option>
            <option value="v5">V5 Manutenção</option>
            <option value="v10">V10 Owners Club</option>
          </select>

          <div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Input JSON (actor-specific)
            </div>
            <textarea
              value={inputJson} onChange={e => setInputJson(e.target.value)}
              rows={8}
              style={{
                ...inputStyle,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.72rem',
                resize: 'vertical',
              }}
            />
            {jsonError && (
              <div style={{
                marginTop: 4, padding: 6,
                background: 'rgba(239,68,68,0.1)', color: 'var(--danger)',
                borderRadius: 4, fontSize: '0.65rem',
              }}>JSON inválido: {jsonError}</div>
            )}
          </div>

          <button type="submit" style={{
            background: 'var(--text)', color: 'var(--bg)', border: 'none',
            padding: '9px 16px', borderRadius: 6, cursor: 'pointer',
            fontSize: '0.82rem', fontWeight: 600, marginTop: 4,
          }}>Adicionar actor</button>
        </div>
      </form>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  padding: '8px 11px',
  borderRadius: 6,
  fontSize: '0.82rem',
  outline: 'none',
  fontFamily: 'inherit',
}

function RecentRunsPanel() {
  const [runs, setRuns] = useState([])
  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    async function load() {
      const { data } = await supabase.from('system_apify_runs')
        .select('*').order('started_at', { ascending: false }).limit(8)
      if (!cancelled) setRuns(data || [])
    }
    load()
    const t = setInterval(load, 15_000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  if (runs.length === 0) return null

  const StatusIcon = ({ status }) => {
    if (status === 'succeeded') return <CheckCircle2 size={11} color="#10b981" />
    if (status === 'failed' || status === 'aborted' || status === 'timed-out') return <AlertCircle size={11} color="#ef4444" />
    return <Clock size={11} color="#f59e0b" />
  }

  return (
    <div style={{
      marginBottom: 16,
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 8,
    }}>
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--border)',
        fontSize: '0.6rem',
        fontWeight: 700,
        color: 'var(--text-dim)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>Recent runs</div>
      <div>
        {runs.map(r => (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 12px',
            borderBottom: '1px solid var(--border)',
            fontSize: '0.7rem',
          }}>
            <StatusIcon status={r.status} />
            <span style={{ flex: 1, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.source_label}
            </span>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
              {r.items_imported > 0 ? `+${r.items_imported} items` : r.status}
            </span>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>
              {new Date(r.started_at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
            <a href={`https://console.apify.com/actors?runId=${r.apify_run_id}`} target="_blank" rel="noreferrer"
              style={{ color: 'var(--info)', display: 'inline-flex', alignItems: 'center' }} title="Ver no Apify console">
              <ExternalLink size={11} />
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ApifyActorsPage() {
  const { sources, create, toggle, remove } = useWatcherSources()
  const [createOpen, setCreateOpen] = useState(false)
  const [runResult, setRunResult] = useState(null)

  const apifyActors = sources.filter(s => s.kind === 'apify_actor')

  async function handleRun(src) {
    setRunResult({ source_id: src.id, loading: true })
    try {
      const res = await runActor(src.id)
      setRunResult({ source_id: src.id, result: res })
    } catch (e) {
      setRunResult({ source_id: src.id, error: String(e) })
    }
  }

  return (
    <div style={{ padding: '4px 4px 80px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '4px 8px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>Apify actors</h1>
          <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            {apifyActors.length} actors configurados — Instagram, X, LinkedIn, Web scraping via Apify.
            Output normalizado vai para Inbox com análise IA.
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setCreateOpen(true)} style={{
          background: 'var(--text)', color: 'var(--bg)', border: 'none',
          padding: '7px 14px', borderRadius: 6, cursor: 'pointer',
          fontSize: '0.78rem', fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}><Plus size={13} /> Actor</button>
      </div>

      <RecentRunsPanel />

      {runResult && (
        <div style={{
          padding: 10, marginBottom: 12,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: 6,
          fontSize: '0.7rem', color: 'var(--text-dim)',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {runResult.loading
            ? '⏳ A invocar Apify actor…'
            : JSON.stringify(runResult.result || { error: runResult.error }).slice(0, 320)}
          <button onClick={() => setRunResult(null)} style={{
            float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)',
          }}><X size={12} /></button>
        </div>
      )}

      {apifyActors.length === 0 ? (
        <div style={{
          padding: 40, textAlign: 'center',
          background: 'var(--bg-card)', border: '1px dashed var(--border)',
          borderRadius: 10, color: 'var(--text-dim)', fontSize: '0.82rem',
        }}>
          <Sparkles size={24} color="var(--text-dim)" style={{ marginBottom: 10 }} />
          <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>Sem actors configurados.</div>
          <div style={{ marginTop: 6, fontSize: '0.72rem', maxWidth: 480, margin: '8px auto 0' }}>
            Adiciona o teu primeiro: Instagram, X, LinkedIn ou Web scraper. Configura o secret <code>APIFY_TOKEN</code>
            em Supabase Edge Functions → Secrets antes de tentar correr.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {apifyActors.map(src => {
            const cfg = src.config || {}
            const preset = PRESET_BY_ACTOR[cfg.actor_id]
            const Icon = preset?.icon || Sparkles
            const color = preset?.color || '#6b7280'
            return (
              <div key={src.id} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderLeft: `3px solid ${color}`,
                borderRadius: 8,
                padding: 14,
                opacity: src.active ? 1 : 0.55,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Icon size={18} color={color} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>
                      {src.label}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                      <code>{cfg.actor_id}</code>
                      {cfg.platform && ` · ${cfg.platform}`}
                      {src.vertical && ` · ${src.vertical.toUpperCase()}`}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginTop: 4 }}>
                      {src.last_run_at
                        ? `Last run: ${new Date(src.last_run_at).toLocaleString('pt-PT')}`
                        : 'Nunca correu'}
                    </div>
                    {cfg.input && (
                      <details style={{ marginTop: 6 }}>
                        <summary style={{ fontSize: '0.62rem', color: 'var(--text-dim)', cursor: 'pointer' }}>
                          Input config
                        </summary>
                        <pre style={{
                          marginTop: 4, padding: 6,
                          background: 'var(--bg-elevated)', borderRadius: 4,
                          fontSize: '0.6rem', fontFamily: 'JetBrains Mono, monospace',
                          color: 'var(--text-dim)', overflow: 'auto', maxHeight: 100,
                        }}>{JSON.stringify(cfg.input, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => handleRun(src)} disabled={!src.active}
                      style={runBtn(src.active)}>
                      <Play size={11} /> Run
                    </button>
                    <button onClick={() => toggle(src.id, !src.active)} style={smallBtn}
                      title={src.active ? 'Desactivar' : 'Activar'}>
                      {src.active ? 'On' : 'Off'}
                    </button>
                    <button onClick={() => { if (confirm(`Remover "${src.label}"?`)) remove(src.id) }}
                      style={smallBtn} title="Remover">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{
        marginTop: 28, padding: 14,
        background: 'var(--bg-card)', border: '1px dashed var(--border)',
        borderRadius: 8, fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.5,
      }}>
        <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 6 }}>Configuração:</div>
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <li>Conta apify.com (free tier $5/mês).</li>
          <li>Settings → Integrations → API tokens → cria token (ou usa default).</li>
          <li>Supabase Dashboard → Edge Functions → Secrets → Add: <code>APIFY_TOKEN</code>.</li>
          <li>Aqui adicionas actors (presets ou actor_id custom).</li>
          <li>"Run" arranca o actor. Apify chama webhook quando termina → items importados para Inbox.</li>
        </ol>
        <div style={{ marginTop: 8 }}>
          <strong style={{ color: 'var(--text)' }}>Custo estimado:</strong> $0.02-$0.10 por run.
          Com 10 sources × 1 run/dia = ~$10-30/mês.
        </div>
      </div>

      {createOpen && <AddActorModal onClose={() => setCreateOpen(false)} onCreate={create} />}
    </div>
  )
}

function runBtn(enabled) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: enabled ? 'var(--primary)' : 'var(--bg-elevated)',
    color: enabled ? '#fff' : 'var(--text-dim)',
    border: enabled ? 'none' : '1px solid var(--border)',
    padding: '5px 10px', borderRadius: 5,
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontSize: '0.66rem', fontWeight: 600,
  }
}

const smallBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center',
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text-dim)', padding: '5px 10px',
  borderRadius: 5, cursor: 'pointer', fontSize: '0.65rem',
}
