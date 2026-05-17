// DailyRoundupCard — card compacto para mostrar o roundup mais recente
// Reusa-se em /email (topo da lista) e potencialmente noutras vistas.
// Lê o último system.inbox_items kind='roundup' vertical=null.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ChevronRight, X, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY

export default function DailyRoundupCard({ onDismiss }) {
  const navigate = useNavigate()
  const [roundup, setRoundup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('dailyRoundup:dismissedAt') === todayKey() } catch { return false }
  })

  useEffect(() => { fetchLatest() }, [])

  async function fetchLatest() {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('system_inbox_items')
      .select('id, title, body, kind, payload, created_at, vertical')
      .eq('kind', 'roundup')
      .is('vertical', null)
      .order('created_at', { ascending: false })
      .limit(1)
    setRoundup((data && data[0]) || null)
    setLoading(false)
  }

  async function regenerate() {
    setRefreshing(true)
    try {
      await window.fetch(`${SUPABASE_URL}/functions/v1/daily-roundup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
      })
      // Apagar o de hoje primeiro (a fn é idempotente — se já existe, skip)
      // Para forçar, podemos chamar com ?force=true mas não está implementado.
      // Por agora, simplesmente re-fetch.
      await fetchLatest()
    } catch (err) {
      console.error('regenerate', err)
    } finally {
      setRefreshing(false)
    }
  }

  function dismiss() {
    try { localStorage.setItem('dailyRoundup:dismissedAt', todayKey()) } catch {}
    setDismissed(true)
    onDismiss?.()
  }

  if (loading || dismissed || !roundup) return null

  const p = roundup.payload || {}
  const stats = p.stats || {}
  const actions = p.top_actions || []
  const summary = p.executive_summary || roundup.body

  return (
    <div style={{
      margin: '0 0 12px', padding: '14px 16px',
      background: 'linear-gradient(135deg, rgba(107,79,160,0.10) 0%, rgba(16,185,129,0.06) 100%)',
      border: '1px solid rgba(107,79,160,0.30)',
      borderLeft: '4px solid var(--primary)',
      borderRadius: 8, position: 'relative',
    }}>
      <button
        onClick={dismiss}
        title="Esconder até amanhã"
        style={{
          position: 'absolute', top: 10, right: 10,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-dim)', padding: 2,
        }}
      ><X size={14} /></button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Sparkles size={14} color="var(--primary)" />
        <span style={{
          fontSize: 10, fontWeight: 700, color: 'var(--primary)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          fontFamily: 'JetBrains Mono, monospace',
        }}>Daily Roundup</span>
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          {new Date(roundup.created_at).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
        <button
          onClick={regenerate} disabled={refreshing}
          title="Regenerar roundup"
          style={{
            marginLeft: 'auto', marginRight: 22,
            background: 'none', border: 'none', cursor: refreshing ? 'wait' : 'pointer',
            color: 'var(--text-dim)', padding: 2,
          }}
        ><RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} /></button>
      </div>

      <h3 style={{
        fontSize: 14, fontWeight: 600, margin: '0 0 8px',
        color: 'var(--text)',
      }}>{roundup.title}</h3>

      {summary && (
        <p style={{
          fontSize: 12, color: 'var(--text)', lineHeight: 1.55, margin: '0 0 10px',
        }}>{summary}</p>
      )}

      {/* Stats em chips */}
      {Object.keys(stats).length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {stats.leads_new > 0       && <Chip>📈 {stats.leads_new} leads</Chip>}
          {stats.approvals_open > 0  && <Chip>⏳ {stats.approvals_open} aprovações</Chip>}
          {stats.tasks_due_today > 0 && <Chip>📌 {stats.tasks_due_today} hoje</Chip>}
          {stats.news_24h > 0        && <Chip>📰 {stats.news_24h} notícias</Chip>}
          {stats.instagram_24h > 0   && <Chip>📷 {stats.instagram_24h} posts</Chip>}
          {stats.competitor_24h > 0  && <Chip>🎯 {stats.competitor_24h} concorrência</Chip>}
        </div>
      )}

      {/* Top actions check-list */}
      {actions.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{
            fontSize: 9, fontWeight: 700, color: 'var(--text-dim)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5,
            fontFamily: 'JetBrains Mono, monospace',
          }}>Top acções de hoje</div>
          {actions.slice(0, 3).map((a, i) => (
            <ActionItem key={i} itemId={roundup.id} idx={i} text={a} />
          ))}
        </div>
      )}

      <button
        onClick={() => navigate('/inbox')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--primary)', fontSize: 11, fontWeight: 600,
          padding: 0, marginTop: 4,
        }}
      >Abrir Inbox <ChevronRight size={12} /></button>
    </div>
  )
}

function Chip({ children }) {
  return (
    <span style={{
      fontSize: 10, padding: '3px 8px', borderRadius: 12,
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace',
    }}>{children}</span>
  )
}

function ActionItem({ itemId, idx, text }) {
  const key = `roundup-check:${itemId}:${idx}`
  const [done, setDone] = useState(() => {
    try { return localStorage.getItem(key) === '1' } catch { return false }
  })
  const toggle = () => {
    const v = !done
    setDone(v)
    try { localStorage.setItem(key, v ? '1' : '0') } catch {}
  }
  return (
    <label style={{
      display: 'flex', alignItems: 'flex-start', gap: 7,
      padding: '4px 0', cursor: 'pointer', userSelect: 'none',
    }}>
      <input
        type="checkbox" checked={done} onChange={toggle}
        style={{ marginTop: 3, cursor: 'pointer' }}
      />
      <span style={{
        fontSize: 12, color: done ? 'var(--text-dim)' : 'var(--text)',
        textDecoration: done ? 'line-through' : 'none', lineHeight: 1.4,
      }}>{text}</span>
    </label>
  )
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
