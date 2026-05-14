// CalendarPage — /calendar
// Vista mensal simples (sem deps externas — DIY).
// Eventos vêm de calendar_events view (events + tasks com due_at unified).
// Click numa data → cria evento. Click num evento → drawer/delete.

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCalendarEvents } from '../hooks/useCalendarEvents.js'
import { useData } from '../hooks/useData.js'
import { useVerticalStore } from '../store'

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MONTH_LABELS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const KIND_META = {
  manual:   { color: '#534AB7', label: 'Manual' },
  task:     { color: '#3b82f6', label: 'Task' },
  approval: { color: '#f59e0b', label: 'Approval' },
  cron:     { color: '#10b981', label: 'Cron' },
  meeting:  { color: '#ec4899', label: 'Meeting' },
  external: { color: '#6b7280', label: 'External' },
}

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59) }
function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1) }
function sameDay(a, b)   { return a.toDateString() === b.toDateString() }

// Constrói grid 7×N: começando segunda-feira até cobrir o mês
function monthGrid(monthDate) {
  const first = startOfMonth(monthDate)
  // Day of week 1=seg ... 7=dom (ISO)
  const startWeekday = first.getDay() === 0 ? 7 : first.getDay()
  // Início da grid = 1ª segunda visível
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - (startWeekday - 1))
  const cells = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    cells.push(d)
  }
  return cells
}

function EventChip({ event, onClick }) {
  const meta = KIND_META[event.kind] || KIND_META.manual
  const bg = event.color || meta.color
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(event) }}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: `${bg}22`,
        borderLeft: `2px solid ${bg}`,
        border: 'none',
        padding: '2px 5px',
        margin: '1px 0',
        borderRadius: 2,
        fontSize: '0.62rem',
        color: 'var(--text)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontWeight: 500,
      }}
      title={`${event.title} · ${meta.label}`}
    >
      {event.title}
    </button>
  )
}

function EventModal({ event, onClose, onDelete }) {
  const meta = KIND_META[event.kind] || KIND_META.manual
  const isTask = event.kind === 'task'
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderLeft: `4px solid ${event.color || meta.color}`,
        borderRadius: 10, padding: 20, width: 440, maxWidth: '90vw',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>{event.title}</h3>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
              {meta.label.toUpperCase()}
              {event.vertical && ` · ${event.vertical.toUpperCase()}`}
              {event.owner_agent_id && ` · @${event.owner_agent_id}`}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={16} /></button>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text)', marginBottom: 10 }}>
          <strong>Quando:</strong> {new Date(event.starts_at).toLocaleString('pt-PT')}
          {event.ends_at && ` → ${new Date(event.ends_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`}
        </div>
        {event.location && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 10 }}>📍 {event.location}</div>
        )}
        {event.description && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.5, marginBottom: 14, whiteSpace: 'pre-wrap' }}>
            {event.description}
          </div>
        )}
        {isTask && (
          <a href={`/tasks`} style={{ fontSize: '0.7rem', color: 'var(--info)', textDecoration: 'none' }}>
            → Abrir em /tasks
          </a>
        )}
        {!isTask && (
          <button onClick={() => { if (confirm('Apagar evento?')) onDelete(event.id) }} style={{
            background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)',
            padding: '6px 12px', borderRadius: 5, cursor: 'pointer', fontSize: '0.72rem',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}><Trash2 size={11} /> Apagar</button>
        )}
      </div>
    </div>
  )
}

function CreateEventModal({ date, onClose, onCreate, employees }) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [startsAt, setStartsAt] = useState(date.toISOString().slice(0, 16))
  const [endsAt, setEndsAt] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [location, setLocation] = useState('')
  const [vertical, setVertical] = useState('')
  const [ownerAgent, setOwnerAgent] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!title.trim() || !startsAt) return
    onCreate({
      title: title.trim(),
      description: desc.trim() || null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      all_day: allDay,
      location: location.trim() || null,
      vertical: vertical || null,
      owner_agent_id: ownerAgent || null,
      kind: 'manual',
    })
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 20, width: 500, maxWidth: '90vw',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>Novo evento</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título" autoFocus style={inputStyle} />
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição (opcional)" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} required style={{ ...inputStyle, flex: 1 }} />
            <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} placeholder="Fim (opcional)" style={{ ...inputStyle, flex: 1 }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} /> Dia inteiro
          </label>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Localização (opcional)" style={inputStyle} />
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={vertical} onChange={e => setVertical(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="">Sem vertical</option>
              <option value="v2">V2</option><option value="v3">V3</option>
              <option value="v4">V4</option><option value="v5">V5</option>
              <option value="v10">V10</option>
            </select>
            <select value={ownerAgent} onChange={e => setOwnerAgent(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="">Sem owner</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <button type="submit" style={{
            background: 'var(--primary)', color: '#fff', border: 'none',
            padding: '8px 14px', borderRadius: 5, cursor: 'pointer',
            fontSize: '0.78rem', fontWeight: 600,
          }}>Criar</button>
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

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const { activeVertical } = useVerticalStore()
  const { data } = useData()
  const employees = data?.employees || []

  const grid = useMemo(() => monthGrid(cursor), [cursor])
  const monthStart = startOfMonth(cursor)
  const monthEnd   = endOfMonth(cursor)

  // Estende range para abranger toda a grid (incluindo dias de mês adjacente)
  const rangeFrom = grid[0].toISOString()
  const rangeTo   = grid[grid.length - 1].toISOString()

  const { events, createEvent, deleteEvent } = useCalendarEvents({
    fromISO: rangeFrom,
    toISO: rangeTo,
    vertical: activeVertical,
  })

  const today = new Date()

  // Group events por dia (string YYYY-MM-DD)
  const byDay = useMemo(() => {
    const map = new Map()
    for (const e of events) {
      const key = new Date(e.starts_at).toDateString()
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(e)
    }
    return map
  }, [events])

  return (
    <div style={{ padding: '4px 4px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '4px 8px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>
            {MONTH_LABELS[cursor.getMonth()]} {cursor.getFullYear()}
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            {events.length} eventos {activeVertical !== 'all' ? `· ${activeVertical}` : '· todas verticais'} · tasks com due_at sync automático
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setCursor(c => addMonths(c, -1))} style={iconBtn}><ChevronLeft size={14} /></button>
        <button onClick={() => setCursor(new Date())} style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          padding: '5px 10px', borderRadius: 5, cursor: 'pointer',
          color: 'var(--text)', fontSize: '0.7rem',
        }}>Hoje</button>
        <button onClick={() => setCursor(c => addMonths(c, 1))} style={iconBtn}><ChevronRight size={14} /></button>
        <Link to="/calendar/settings" style={{
          ...iconBtn, textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }} title="Settings · Google Calendar sync">
          <Settings size={13} />
        </Link>
        <button onClick={() => setSelectedDate(new Date())} style={{
          background: 'var(--primary)', color: '#fff', border: 'none',
          padding: '6px 12px', borderRadius: 5, cursor: 'pointer',
          fontSize: '0.72rem', fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}><Plus size={12} /> Evento</button>
      </div>

      {/* Day labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 2 }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{
            fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-dim)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '6px 8px', textAlign: 'center',
          }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 1,
        background: 'var(--border)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        overflow: 'hidden',
      }}>
        {grid.map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth()
          const isToday = sameDay(d, today)
          const dayEvents = byDay.get(d.toDateString()) || []
          return (
            <div
              key={i}
              onClick={() => setSelectedDate(d)}
              style={{
                background: 'var(--bg-card)',
                minHeight: 96,
                padding: '4px 6px',
                cursor: 'pointer',
                opacity: inMonth ? 1 : 0.4,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              <div style={{
                fontSize: '0.7rem',
                fontWeight: isToday ? 700 : 500,
                color: isToday ? '#fff' : 'var(--text)',
                background: isToday ? 'var(--primary)' : 'transparent',
                borderRadius: '50%',
                width: 22, height: 22,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 2,
                alignSelf: 'flex-start',
                fontFamily: 'JetBrains Mono, monospace',
              }}>{d.getDate()}</div>
              {dayEvents.slice(0, 4).map(ev => (
                <EventChip key={ev.id} event={ev} onClick={setSelectedEvent} />
              ))}
              {dayEvents.length > 4 && (
                <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)' }}>+{dayEvents.length - 4} mais</div>
              )}
            </div>
          )
        })}
      </div>

      {selectedDate && (
        <CreateEventModal
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
          onCreate={createEvent}
          employees={employees}
        />
      )}
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={(id) => { deleteEvent(id); setSelectedEvent(null) }}
        />
      )}
    </div>
  )
}

const iconBtn = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  padding: 6, borderRadius: 5, cursor: 'pointer',
  color: 'var(--text-dim)',
  display: 'inline-flex', alignItems: 'center',
}
