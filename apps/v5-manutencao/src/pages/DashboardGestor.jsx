import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import KpiCard from '../components/KpiCard'
import { supabase } from '../lib/supabase'
import { getStatsGestor } from '../lib/queries'

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS === 'true'

function fmt(value) {
  return `€${Number(value).toFixed(2).replace('.', ',')}`
}

export default function DashboardGestor() {
  const navigate = useNavigate()
  const [stats, setStats]     = useState({ ordensPendentes: 0, prestadoresActivos: 0, receitaMes: 0, servicosActivos: 0 })
  const [loading, setLoading] = useState(!DEV_BYPASS)

  useEffect(() => {
    if (DEV_BYPASS) return

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { navigate('/'); return }
      const s = await getStatsGestor()
      setStats(s)
      setLoading(false)
    })
  }, [])

  async function handleLogout() {
    if (!DEV_BYPASS) await supabase.auth.signOut()
    localStorage.removeItem('role')
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="text-gray-400 text-sm">A carregar…</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">V5 Manutenção · Gestor</h1>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
          Sair
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-2 gap-4">
          <KpiCard titulo="Ordens Pendentes"    valor={stats.ordensPendentes}    cor="amarelo" />
          <KpiCard titulo="Prestadores Activos" valor={stats.prestadoresActivos} cor="azul"    />
          <KpiCard titulo="Receita Este Mês"    valor={fmt(stats.receitaMes)}    cor="verde"   />
          <KpiCard titulo="Serviços Activos"    valor={stats.servicosActivos}    cor="azul"    />
        </div>
      </main>
    </div>
  )
}
