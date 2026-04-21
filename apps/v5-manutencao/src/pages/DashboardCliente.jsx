import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import KpiCard from '../components/KpiCard'
import { supabase } from '../lib/supabase'
import { getServicosCliente } from '../lib/queries'

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS === 'true'

export default function DashboardCliente() {
  const navigate = useNavigate()
  const [stats, setStats]     = useState({ activos: 0, estesMes: 0, proximaVisita: '—', avaliacao: '—' })
  const [loading, setLoading] = useState(!DEV_BYPASS)

  useEffect(() => {
    if (DEV_BYPASS) return

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { navigate('/'); return }

      const servicos = await getServicosCliente(user.id)
      const activos  = servicos.filter(s => s.estado === 'activo').length

      const now      = new Date()
      const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const mesFim    = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

      const todasOrdens = servicos.flatMap(s => s.ordens_trabalho ?? [])
      const estesMes    = todasOrdens.filter(
        o => o.data_agendada >= mesInicio && o.data_agendada <= mesFim
      ).length

      const proximas = todasOrdens
        .filter(o => o.estado === 'agendada' && o.data_agendada >= now.toISOString())
        .sort((a, b) => a.data_agendada.localeCompare(b.data_agendada))
      const proximaVisita = proximas[0]
        ? new Date(proximas[0].data_agendada).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
        : '—'

      setStats({ activos, estesMes, proximaVisita, avaliacao: '—' })
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
        <h1 className="text-lg font-bold text-gray-900">V5 Manutenção · Cliente</h1>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
          Sair
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-2 gap-4">
          <KpiCard titulo="Serviços Activos" valor={stats.activos}       cor="azul"  />
          <KpiCard titulo="Ordens Este Mês"  valor={stats.estesMes}      cor="azul"  />
          <KpiCard titulo="Próxima Visita"   valor={stats.proximaVisita} cor="cinza" />
          <KpiCard titulo="Avaliação Média"  valor={stats.avaliacao}     cor="cinza" />
        </div>
      </main>
    </div>
  )
}
