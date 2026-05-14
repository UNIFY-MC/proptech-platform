// CalendarSettingsPage — /calendar/settings · gerir ICS feeds + OAuth Google Calendar
//
// Permite colar URL ICS público (Google Calendar Settings → "Secret address in iCal format")
// e fazer sync imediato. Suporta múltiplas fontes (Mário + Bia + clientes).

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Plus, Trash2, Loader2, ArrowLeft, ExternalLink, RefreshCw, Check } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY

function timeAgo(iso) {
  if (!iso) return 'nunca'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function CalendarSettingsPage() {
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [syncingId, setSyncingId] = useState(null)
  const [form, setForm] = useState({ name: '', ics_url: '', vertical: '' })

  const fetch = useCallback(async () => {
    if (!supabase) return setLoading(false)
    setLoading(true)
    const { data } = await supabase.from('system_calendar_sources').select('*')
    setSources(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.name || !form.ics_url) return
    setAdding(true)
    const { data, error } = await supabase.schema('system').from('calendar_sources').insert({
      name:        form.name,
      source_type: 'ics',
      ics_url:     form.ics_url,
      vertical:    form.vertical || null,
      active:      true,
    }).select('*').single()
    if (!error && data) {
      setForm({ name: '', ics_url: '', vertical: '' })
      await fetch()
      // Auto-sync após adicionar
      handleSync(data.id)
    }
    setAdding(false)
  }

  const handleSync = async (id) => {
    setSyncingId(id)
    await window.fetch(`${SUPABASE_URL}/functions/v1/gcal-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
      body: JSON.stringify({ source_id: id }),
    })
    await fetch()
    setSyncingId(null)
  }

  const handleRemove = async (id) => {
    if (!confirm('Remover este calendar source?')) return
    await supabase.schema('system').from('calendar_sources').delete().eq('id', id)
    await fetch()
  }

  const handleToggle = async (id, active) => {
    await supabase.schema('system').from('calendar_sources').update({ active: !active }).eq('id', id)
    await fetch()
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}><Loader2 className="spin" size={18} /></div>
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '4px 0 40px' }}>
      <Link to="/calendar" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 12, color: 'var(--text-dim)', textDecoration: 'none', marginBottom: 12,
      }}>
        <ArrowLeft size={12} /> Calendar
      </Link>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>Calendar Settings</h1>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '4px 0 0' }}>
          Conecta Google Calendar / Outlook / Apple Calendar via ICS URL · sync hourly via pg_cron
        </p>
      </div>

      {/* How-to */}
      <div style={{
        padding: 14, borderRadius: 6, marginBottom: 18,
        background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)',
        fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6,
      }}>
        <strong style={{ color: '#60a5fa' }}>Como obter URL ICS do Google Calendar:</strong>
        <ol style={{ margin: '6px 0 0 18px', padding: 0 }}>
          <li>Abre <a href="https://calendar.google.com/calendar/u/0/r/settings" target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>calendar.google.com/settings</a></li>
          <li>Clica no calendário que queres partilhar (lado esquerdo)</li>
          <li>Scroll até <strong>"Integrar calendário"</strong></li>
          <li>Copia <strong>"Endereço secreto em formato iCal"</strong> (não o público — secret é HTTPS auth)</li>
          <li>Cola abaixo · Property007 sync horário</li>
        </ol>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 8, padding: 16, marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, fontFamily: 'JetBrains Mono, monospace' }}>
          Adicionar calendar source
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 100px auto', gap: 8 }}>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nome (ex: Mário)"
            style={input}
          />
          <input
            value={form.ics_url}
            onChange={(e) => setForm({ ...form, ics_url: e.target.value })}
            placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
            style={{ ...input, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}
          />
          <select value={form.vertical} onChange={(e) => setForm({ ...form, vertical: e.target.value })} style={input}>
            <option value="">Global</option>
            <option value="v2">V2</option>
            <option value="v3">V3</option>
            <option value="v4">V4</option>
            <option value="v5">V5</option>
            <option value="v7">V7</option>
            <option value="v8">V8</option>
          </select>
          <button type="submit" disabled={adding || !form.name || !form.ics_url} style={btnPrimary}>
            {adding ? <Loader2 size={11} className="spin" /> : <Plus size={11} />} Add
          </button>
        </div>
      </form>

      {/* Sources list */}
      {sources.length === 0 ? (
        <div style={{
          padding: 40, textAlign: 'center',
          background: 'var(--bg-card)', border: '1px dashed var(--border)',
          borderRadius: 8, color: 'var(--text-dim)',
        }}>
          <Calendar size={28} style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 13 }}>Sem calendar sources. Adiciona o primeiro acima.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sources.map(s => (
            <div key={s.id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderLeft: `3px solid ${s.active ? '#10b981' : 'var(--text-dim)'}`,
              borderRadius: 8, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
              opacity: s.active ? 1 : 0.6,
            }}>
              <Calendar size={18} color={s.active ? '#10b981' : 'var(--text-dim)'} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {s.ics_url} {s.vertical && `· ${s.vertical}`}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                  Last sync: <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{timeAgo(s.last_sync_at)}</span>
                  {' · '}<span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{s.event_count} events</span>
                </div>
              </div>
              <button onClick={() => handleToggle(s.id, s.active)} style={miniBtn} title={s.active ? 'Pausar' : 'Activar'}>
                {s.active ? <Check size={11} color="#10b981" /> : <X size={11} />}
              </button>
              <button onClick={() => handleSync(s.id)} disabled={syncingId === s.id} style={miniBtn} title="Sync now">
                {syncingId === s.id ? <Loader2 size={11} className="spin" /> : <RefreshCw size={11} />}
              </button>
              <button onClick={() => handleRemove(s.id)} style={miniBtn} title="Remover">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{
        marginTop: 24, padding: 14, borderRadius: 6,
        background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)',
        fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6,
      }}>
        <strong style={{ color: '#a78bfa' }}>Bidirectional OAuth (futuro):</strong> v1 só read-only via ICS.
        Para escrita (criar events Gcal a partir de Property007), precisa OAuth scope <code style={{
          background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 3,
        }}>https://www.googleapis.com/auth/calendar</code> — sprint futuro.
      </div>
    </div>
  )
}

const input = {
  padding: '7px 10px', background: 'var(--bg-elevated)',
  border: '1px solid var(--border)', borderRadius: 5,
  color: 'var(--text)', fontSize: 13, outline: 'none',
  width: '100%', boxSizing: 'border-box',
}
const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '7px 12px', borderRadius: 5,
  background: 'var(--primary)', border: 'none',
  color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  whiteSpace: 'nowrap',
}
const miniBtn = {
  background: 'transparent', border: '1px solid var(--border)',
  cursor: 'pointer', color: 'var(--text-dim)', padding: '5px 7px', borderRadius: 4,
}
