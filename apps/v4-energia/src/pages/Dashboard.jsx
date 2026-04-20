import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import KpiCard from '../components/KpiCard'

const KPIS = [
  { titulo: 'Contratos Activos', valor: 0, unidade: 'contratos' },
  { titulo: 'Poupança Total', valor: 0, unidade: '€/ano' },
  { titulo: 'Comercializadoras', valor: 0, unidade: 'parceiros' },
  { titulo: 'Leads em Análise', valor: 0, unidade: 'leads' },
]

export default function Dashboard() {
  const navigate = useNavigate()

  async function handleLogout() {
    if (import.meta.env.VITE_DEV_BYPASS !== 'true') {
      await supabase.auth.signOut()
    }
    navigate('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
          V4 Energia
        </h1>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            color: '#374151',
            cursor: 'pointer',
          }}
        >
          Sair
        </button>
      </header>

      <main style={{ padding: '32px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          maxWidth: '800px',
        }}>
          {KPIS.map(kpi => (
            <KpiCard
              key={kpi.titulo}
              titulo={kpi.titulo}
              valor={kpi.valor}
              unidade={kpi.unidade}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
