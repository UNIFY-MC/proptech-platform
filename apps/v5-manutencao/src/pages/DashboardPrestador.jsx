import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import KpiCard from '../components/KpiCard'
import Drawer from '../components/Drawer'
import CalendarView from '../components/CalendarView'
import { supabase } from '../lib/supabase'
import { getPrestador, getOrdensPrestador, getCarteira } from '../lib/queries'

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS === 'true'

const DEV_USER    = { nome: 'Weverton Mariano', codigo: '301612811' }
const DEV_ORDENS  = [
  { titulo: 'Instalação de estore',  data_inicio: '2026-04-20T10:00:00', status: 'concluido' },
  { titulo: 'Reparação de estore',   data_inicio: '2026-04-20T14:30:00', status: 'concluido' },
  { titulo: 'Reparação de estore',   data_inicio: '2026-04-20T16:00:00', status: 'concluido' },
  { titulo: 'Instalação de portão',  data_inicio: '2026-04-22T09:00:00', status: 'agendado'  },
  { titulo: 'Manutenção ar cond.',   data_inicio: '2026-04-23T11:00:00', status: 'pendente'  },
  { titulo: 'Limpeza de caleiras',   data_inicio: '2026-04-25T08:30:00', status: 'confirmacao' },
]

function fmt(value) {
  return `€${Number(value).toFixed(2).replace('.', ',')}`
}

export default function DashboardPrestador() {
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [view, setView]             = useState('home')
  const [prestador, setPrestador]   = useState(DEV_BYPASS ? DEV_USER : null)
  const [ordens, setOrdens]         = useState(DEV_BYPASS ? DEV_ORDENS : [])
  const [carteira, setCarteira]     = useState({ saldo_disponivel: 0, saldo_pendente: 0 })
  const [loading, setLoading]       = useState(!DEV_BYPASS)

  useEffect(() => {
    if (DEV_BYPASS) return

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { navigate('/'); return }

      const p = await getPrestador(user.id)
      if (!p) { navigate('/'); return }
      setPrestador({ ...p, codigo: p.id.slice(0, 8).toUpperCase() })

      const [ords, cart] = await Promise.all([
        getOrdensPrestador(p.id),
        getCarteira(p.id),
      ])
      setOrdens(ords)
      setCarteira(cart)
      setLoading(false)
    })
  }, [])

  async function handleLogout() {
    if (!DEV_BYPASS) await supabase.auth.signOut()
    localStorage.removeItem('role')
    navigate('/')
  }

  const today = new Date().toISOString().slice(0, 10)
  const ordensHoje = ordens.filter(o => o.data_inicio?.slice(0, 10) === today).length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="text-gray-400 text-sm">A carregar…</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={prestador}
        onNavigate={path => { if (path === 'calendar') setView('calendar') }}
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
          {prestador?.nome?.[0] ?? 'P'}
        </div>
      </header>

      {/* Home */}
      {view === 'home' && (
        <main className="max-w-2xl mx-auto p-4">
          <div className="grid grid-cols-2 gap-3 mb-6">
            <KpiCard titulo="Ordens Hoje"       valor={ordensHoje}                     cor="azul"    />
            <KpiCard titulo="Saldo Disponível"  valor={fmt(carteira.saldo_disponivel)} cor="verde"   />
            <KpiCard titulo="Saldo Pendente"    valor={fmt(carteira.saldo_pendente)}   cor="amarelo" />
            <KpiCard titulo="Avaliação"         valor="—"                              cor="cinza"   />
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

      {/* Calendar */}
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
