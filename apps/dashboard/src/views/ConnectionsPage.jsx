// ConnectionsPage — /connections
// Gere watcher_sources (news queries, Instagram users, RSS, competitor sites)
// + atalhos para correr edge fns manualmente (teste).
// Listas dos secrets (NEWS_API_KEY, IG_GRAPH_TOKEN) em modo "configurado/não"

import { useState, useEffect } from 'react'
import { Plus, Newspaper, Instagram, Rss, Globe, Play, Trash2, X, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { useWatcherSources } from '../hooks/useWatcherSources.js'
import { supabase } from '../lib/supabase.js'

const KIND_META = {
  news_query:      { icon: Newspaper, label: 'News query',     color: '#3b82f6' },
  instagram_user:  { icon: Instagram, label: 'Instagram user', color: '#ec4899' },
  rss:             { icon: Rss,       label: 'RSS feed',       color: '#f59e0b' },
  competitor_site: { icon: Globe,     label: 'Competitor site',color: '#ef4444' },
  x_search:        { icon: Newspaper, label: 'X search',       color: '#6b7280' },
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY

async function invokeWatcher(name) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
  })
  return await res.json()
}

function CreateSourceModal({ onClose, onCreate }) {
  const [kind, setKind] = useState('news_query')
  const [label, setLabel] = useState('')
  const [vertical, setVertical] = useState('')
  const [query, setQuery] = useState('')
  const [handle, setHandle] = useState('')
  const [accountId, setAccountId] = useState('')
  const [feedUrl, setFeedUrl] = useState('')
  const [siteUrl, setSiteUrl] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!label.trim()) return
    let config = {}
    if (kind === 'news_query')      config = { query, language: 'pt', country: 'pt' }
    else if (kind === 'instagram_user') config = { handle, account_id: accountId }
    else if (kind === 'rss')        config = { feed_url: feedUrl }
    else if (kind === 'competitor_site') config = { url: siteUrl }
    onCreate({ kind, label: label.trim(), vertical: vertical || null, config, active: true })
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 20, width: 480, maxWidth: '90vw',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>Nova source</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <select value={kind} onChange={e => setKind(e.target.value)} style={inputStyle}>
            {Object.entries(KIND_META).map(([k, m]) => (
              <option key={k} value={k}>{m.label}</option>
            ))}
          </select>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label (ex: Notícias condomínios PT)" autoFocus style={inputStyle} />

          {kind === 'news_query' && (
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Query (ex: tarifa eléctrica Portugal)" style={inputStyle} />
          )}
          {kind === 'instagram_user' && (
            <>
              <input value={handle} onChange={e => setHandle(e.target.value)} placeholder="@handle (ex: @prataowners)" style={inputStyle} />
              <input value={accountId} onChange={e => setAccountId(e.target.value)} placeholder="Account ID Instagram Graph" style={inputStyle} />
            </>
          )}
          {kind === 'rss' && (
            <input value={feedUrl} onChange={e => setFeedUrl(e.target.value)} placeholder="https://exemplo.pt/feed.xml" style={inputStyle} />
          )}
          {kind === 'competitor_site' && (
            <input value={siteUrl} onChange={e => setSiteUrl(e.target.value)} placeholder="https://concorrente.pt" style={inputStyle} />
          )}

          <select value={vertical} onChange={e => setVertical(e.target.value)} style={inputStyle}>
            <option value="">Sem vertical específica</option>
            <option value="v2">V2 Condomínios</option>
            <option value="v3">V3 Seguros</option>
            <option value="v4">V4 Energia</option>
            <option value="v5">V5 Manutenção</option>
          </select>

          <button type="submit" style={{
            background: 'var(--primary)', color: '#fff', border: 'none',
            padding: '8px 14px', borderRadius: 5, cursor: 'pointer',
            fontSize: '0.78rem', fontWeight: 600,
          }}>Criar source</button>
        </div>
      </form>
    </div>
  )
}

const inputStyle = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  padding: '7px 10px',
  borderRadius: 5,
  fontSize: '0.78rem',
  outline: 'none',
  fontFamily: 'inherit',
}

function CronStatusPanel() {
  const [jobs, setJobs] = useState([])
  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    async function load() {
      const { data } = await supabase.from('cron_jobs_status').select('*')
      if (!cancelled) setJobs(data || [])
    }
    load()
    const t = setInterval(load, 30_000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  if (jobs.length === 0) {
    return (
      <div style={{
        padding: 10, marginBottom: 12,
        background: 'var(--bg-card)',
        border: '1px dashed var(--border)', borderRadius: 6,
        fontSize: '0.7rem', color: 'var(--text-dim)',
      }}>
        ⏰ Cron jobs não configurados — aplica <code>20260513_watchers_cron.sql</code> em Supabase + define GUC
        <code> app.settings.supabase_url</code> e <code>service_role_key</code>.
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: 8,
      marginBottom: 16,
    }}>
      {jobs.map(j => {
        const ok = j.last_status === 'succeeded' || !j.last_status
        const Icon = j.last_status === 'failed' ? AlertCircle : (j.last_status === 'succeeded' ? CheckCircle2 : Clock)
        const color = j.last_status === 'failed' ? '#ef4444' : (j.last_status === 'succeeded' ? '#10b981' : '#6b7280')
        return (
          <div key={j.jobname} style={{
            padding: '10px 12px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderLeft: `3px solid ${color}`,
            borderRadius: 6,
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon size={12} color={color} />
              <span style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: 'var(--text)' }}>
                {j.jobname.replace(/_/g, '-')}
              </span>
            </div>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
              <code>{j.schedule}</code>
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>
              {j.last_run_at
                ? `Last: ${new Date(j.last_run_at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                : 'Nunca correu'}
              {j.last_status && ` · ${j.last_status}`}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function ConnectionsPage() {
  const { sources, create, toggle, remove } = useWatcherSources()
  const [createOpen, setCreateOpen] = useState(false)
  const [runResult, setRunResult] = useState(null)

  async function runWatcher(name) {
    setRunResult({ name, loading: true })
    try {
      const res = await invokeWatcher(name)
      setRunResult({ name, result: res })
    } catch (e) {
      setRunResult({ name, error: String(e) })
    }
  }

  return (
    <div style={{ padding: '4px 4px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '4px 8px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>Connections</h1>
          <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            Watcher sources: notícias, Instagram, X, concorrência, RSS. Edge fns puxam conteúdo → Inbox.
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => runWatcher('watcher-news')} style={smallBtn} title="Correr watcher-news manualmente">
          <Play size={11} /> News
        </button>
        <button onClick={() => runWatcher('watcher-instagram')} style={smallBtn} title="Correr watcher-instagram manualmente">
          <Play size={11} /> IG
        </button>
        <button onClick={() => runWatcher('watcher-x')} style={smallBtn} title="Correr watcher-x manualmente">
          <Play size={11} /> X
        </button>
        <button onClick={() => runWatcher('watcher-competitor')} style={smallBtn} title="Correr watcher-competitor manualmente">
          <Play size={11} /> Competitor
        </button>
        <button onClick={() => runWatcher('daily-roundup')} style={smallBtn} title="Correr daily-roundup manualmente">
          <Play size={11} /> Roundup
        </button>
        <button onClick={() => setCreateOpen(true)} style={{
          background: 'var(--primary)', color: '#fff', border: 'none',
          padding: '6px 12px', borderRadius: 5, cursor: 'pointer',
          fontSize: '0.72rem', fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}><Plus size={12} /> Source</button>
      </div>

      <CronStatusPanel />

      {runResult && (
        <div style={{
          padding: 10, marginBottom: 12,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: 6,
          fontSize: '0.7rem', color: 'var(--text-dim)',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          <strong style={{ color: 'var(--primary)' }}>{runResult.name}</strong> →{' '}
          {runResult.loading ? 'a correr…' : JSON.stringify(runResult.result || runResult.error).slice(0, 280)}
          <button onClick={() => setRunResult(null)} style={{
            float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)',
          }}><X size={12} /></button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sources.length === 0 && (
          <div style={{
            padding: 30, textAlign: 'center',
            color: 'var(--text-dim)', fontSize: '0.8rem',
            background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 8,
          }}>
            Sem sources. Adiciona uma com "+ Source".
          </div>
        )}
        {sources.map(src => {
          const meta = KIND_META[src.kind] || KIND_META.news_query
          const Icon = meta.icon
          return (
            <div key={src.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderLeft: `3px solid ${meta.color}`,
              borderRadius: 6,
              opacity: src.active ? 1 : 0.5,
            }}>
              <Icon size={16} color={meta.color} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>{src.label}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {meta.label}{src.vertical ? ` · ${src.vertical.toUpperCase()}` : ''}
                  {src.last_run_at ? ` · last run: ${new Date(src.last_run_at).toLocaleString('pt-PT')}` : ' · nunca correu'}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                  {Object.entries(src.config || {}).map(([k, v]) => `${k}=${v}`).join(' · ')}
                </div>
              </div>
              <button onClick={() => toggle(src.id, !src.active)} style={{
                ...smallBtn,
                color: src.active ? 'var(--success)' : 'var(--text-dim)',
              }}>{src.active ? 'On' : 'Off'}</button>
              <button onClick={() => { if (confirm(`Remover "${src.label}"?`)) remove(src.id) }} style={smallBtn} title="Remover">
                <Trash2 size={11} />
              </button>
            </div>
          )
        })}
      </div>

      <div style={{
        marginTop: 24, padding: 14,
        background: 'var(--bg-card)', border: '1px dashed var(--border)',
        borderRadius: 8, fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.5,
      }}>
        <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 6 }}>Secrets necessários (verifica no Supabase Edge Functions → Secrets):</div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li><code>ANTHROPIC_API_KEY</code> — agent-chat, daily-roundup (resumo IA), watcher-competitor + watcher-x (análise "why it matters")</li>
          <li><code>NEWS_API_KEY</code> — watcher-news (newsapi.org · free 100/dia)</li>
          <li><code>IG_GRAPH_TOKEN</code> — watcher-instagram (Facebook Graph long-lived)</li>
        </ul>
        <div style={{ marginTop: 10, color: 'var(--text)', fontWeight: 600 }}>X / Twitter:</div>
        <div>Sem secret. Configura RSS bridge no campo <code>rss_url</code> da source (kind=x_search):</div>
        <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
          <li><code>rss.app</code> — cria conta, adiciona handle, copia URL do feed RSS</li>
          <li><code>rsshub.app/twitter/user/&lt;handle&gt;</code> — gratuito, instável às vezes</li>
        </ul>
        <div style={{ marginTop: 10, color: 'var(--text)', fontWeight: 600 }}>LinkedIn:</div>
        <div>Sem API pública. Opções pagas: <code>Apify LinkedIn actor</code> (~$30/mês) ou <code>PhantomBuster</code> (~$30/mês).
        Quando configurares, podes adicionar source kind=linkedin_user com <code>config.scraper_url</code>.</div>
      </div>

      {createOpen && <CreateSourceModal onClose={() => setCreateOpen(false)} onCreate={create} />}
    </div>
  )
}

const smallBtn = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text-dim)', padding: '5px 10px',
  borderRadius: 5, cursor: 'pointer',
  fontSize: '0.7rem',
  display: 'inline-flex', alignItems: 'center', gap: 4,
}
