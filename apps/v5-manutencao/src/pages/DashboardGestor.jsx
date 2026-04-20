import { useNavigate } from 'react-router-dom'
import KpiCard from '../components/KpiCard'
import { supabase } from '../lib/supabase'

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS === 'true'

export default function DashboardGestor() {
  const navigate = useNavigate()

  async function handleLogout() {
    if (!DEV_BYPASS) await supabase.auth.signOut()
    localStorage.removeItem('role')
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">V5 Manutenção · Gestor</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          Sair
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-2 gap-4">
          <KpiCard titulo="Ordens Pendentes" valor={0} cor="amarelo" />
          <KpiCard titulo="Prestadores Activos" valor={0} cor="azul" />
          <KpiCard titulo="Receita Este Mês" valor="€0,00" cor="verde" />
          <KpiCard titulo="Serviços Activos" valor={0} cor="azul" />
        </div>
      </main>
    </div>
  )
}
