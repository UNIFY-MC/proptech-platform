import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import KpiCard from '../components/KpiCard'
import Drawer from '../components/Drawer'
import CalendarView from '../components/CalendarView'
import { supabase } from '../lib/supabase'

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS === 'true'

const DEV_USER = { nome: 'Weverton Mariano', codigo: '301612811' }

// Sample orders for dev testing
const DEV_ORDENS = [
  { titulo: 'Instalação de estore',   data_inicio: '2026-04-20T10:00:00', status: 'concluido' },
  { titulo: 'Reparação de estore',    data_inicio: '2026-04-20T14:30:00', status: 'concluido' },
  { titulo: 'Reparação de estore',    data_inicio: '2026-04-20T16:00:00', status: 'concluido' },
  { titulo: 'Instalação de portão',   data_inicio: '2026-04-22T09:00:00', status: 'agendado' },
  { titulo: 'Manutenção ar cond.',    data_inicio: '2026-04-23T11:00:00', status: 'pendente' },
  { titulo: 'Limpeza de caleiras',    data_inicio: '2026-04-25T08:30:00', status: 'confirmacao' },
]

export default function DashboardPrestador() {
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [view, setView] = useState('home') // 'home' | 'calendar'

  async function handleLogout() {
    if (!DEV_BYPASS) await supabase.auth.signOut()
    localStorage.removeItem('role')
    navigate('/')
  }

  function handleNav(path) {
    if (path === 'calendar') setView('calendar')
  }

  const ordens = DEV_BYPASS ? DEV_ORDENS : []

  return (
    <div className="min-h-screen bg-gray-50">
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={DEV_BYPASS ? DEV_USER : null}
        onNavigate={handleNav}
        onLogout={handleLogout}
      />

      {/* Header */}
      <header className="bg-teal-600 text-white px-4 py-4 flex items-center justify-between sticky top-0 z-30">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col gap-1.5 p-1"
          aria-label="Menu"
        >
          <span className="block w-5 h-0.5 bg-white" />
          <span className="block w-5 h-0.5 bg-white" />
          <span className="block w-5 h-0.5 bg-white" />
        </button>

        <h1 className="text-base font-semibold tracking-wide">
          {view === 'calendar' ? 'Os meus serviços' : 'V5 Manutenção'}
        </h1>

        <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center text-sm font-bold">
          {DEV_USER.nome[0]}
        </div>
      </header>

      {/* Content */}
      {view === 'home' && (
        <main className="max-w-2xl mx-auto p-4">
          <div className="grid grid-cols-2 gap-3 mb-6">
            <KpiCard titulo="Ordens Hoje" valor={3}      cor="azul"    />
            <KpiCard titulo="Saldo Disponível" valor="€124,00" cor="verde"   />
            <KpiCard titulo="Saldo Pendente"   valor="€48,00"  cor="amarelo" />
            <KpiCard titulo="Avaliação"        valor="4.8 ★"   cor="cinza"   />
          </div>

          <button
            onClick={() => setView('calendar')}
            className="w-full bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <span className="flex items-center gap-3 font-medium">
              <span className="text-lg">📅</span> Os meus serviços
            </span>
            <span className="text-gray-300 text-lg">›</span>
          </button>
        </main>
      )}

      {view === 'calendar' && (
        <div className="max-w-2xl mx-auto bg-white min-h-screen">
          <button
            onClick={() => setView('home')}
            className="flex items-center gap-2 px-4 py-3 text-teal-600 text-sm font-medium"
          >
            ← Voltar
          </button>
          <CalendarView ordens={ordens} />
        </div>
      )}
    </div>
  )
}
