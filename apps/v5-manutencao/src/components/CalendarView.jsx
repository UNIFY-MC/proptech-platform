import { useState } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'

const STATUS_COLORS = {
  pendente:    { dot: 'bg-red-400',    label: 'Pendente',                bg: 'bg-red-50',    text: 'text-red-700' },
  concluido:   { dot: 'bg-green-500',  label: 'Concluído',               bg: 'bg-green-50',  text: 'text-green-700' },
  agendado:    { dot: 'bg-blue-400',   label: 'Agendado',                bg: 'bg-blue-50',   text: 'text-blue-700' },
  confirmacao: { dot: 'bg-purple-400', label: 'A aguardar confirmação',  bg: 'bg-purple-50', text: 'text-purple-700' },
  bloqueado:   { dot: 'bg-gray-400',   label: 'Bloqueado',               bg: 'bg-gray-100',  text: 'text-gray-600' },
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10)
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

export default function CalendarView({ ordens = [] }) {
  const [selected, setSelected] = useState(new Date())

  // Build map: dateKey → [{ hora, titulo, status }]
  const byDay = {}
  for (const o of ordens) {
    const key = toDateKey(new Date(o.data_inicio))
    if (!byDay[key]) byDay[key] = []
    byDay[key].push(o)
  }

  const selectedKey = toDateKey(selected)
  const dayOrdens = byDay[selectedKey] ?? []

  function tileContent({ date, view }) {
    if (view !== 'month') return null
    const key = toDateKey(date)
    const items = byDay[key]
    if (!items?.length) return null
    const statuses = [...new Set(items.map(o => o.status))]
    return (
      <div className="flex justify-center gap-0.5 mt-0.5">
        {statuses.slice(0, 3).map(s => (
          <span
            key={s}
            className={`block w-1.5 h-1.5 rounded-full ${STATUS_COLORS[s]?.dot ?? 'bg-gray-400'}`}
          />
        ))}
      </div>
    )
  }

  const weekday = selected.toLocaleDateString('pt-PT', { weekday: 'long' }).toUpperCase()
  const dayMonth = selected.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
    .toUpperCase().replace('.', '')

  return (
    <div className="flex flex-col">
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 text-xs text-gray-500">
        {Object.entries(STATUS_COLORS).map(([key, { dot, label }]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
            {label}
          </span>
        ))}
      </div>

      {/* Calendar */}
      <div className="px-2 react-calendar-wrapper">
        <Calendar
          onChange={setSelected}
          value={selected}
          locale="pt-PT"
          tileContent={tileContent}
          className="w-full border-none text-sm"
          navigationLabel={({ date }) =>
            date.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
              .replace(/^\w/, c => c.toUpperCase())
          }
        />
      </div>

      {/* Day list */}
      <div className="px-4 pt-4 pb-6">
        <p className="text-xs font-bold text-gray-500 mb-3 tracking-wide">
          {weekday}, {dayMonth}
        </p>

        {dayOrdens.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">Sem serviços neste dia.</p>
        )}

        <div className="flex flex-col gap-3">
          {dayOrdens
            .sort((a, b) => a.data_inicio.localeCompare(b.data_inicio))
            .map((o, i) => {
              const cfg = STATUS_COLORS[o.status] ?? STATUS_COLORS.bloqueado
              const hora = new Date(o.data_inicio).toLocaleTimeString('pt-PT', {
                hour: '2-digit', minute: '2-digit',
              })
              return (
                <div key={i} className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
                  <span className="text-xs text-gray-400 w-12 pt-0.5 shrink-0">{hora}h</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{o.titulo}</p>
                    <span className={`inline-flex items-center gap-1 text-xs mt-1 px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>
                  <span className="text-gray-300 text-lg pt-0.5">›</span>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
