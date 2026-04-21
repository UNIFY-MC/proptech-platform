import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import KpiCard from '../components/KpiCard'
import { supabase } from '../lib/supabase'
import { getStatsGestor, getListaPrestadores, insertPrestador, updatePrestadorEstado } from '../lib/queries'

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS === 'true'

function fmt(value) {
  return `€${Number(value).toFixed(2).replace('.', ',')}`
}

const NIVEL_CFG = {
  base:   { label: 'Base',   bg: 'bg-gray-100',   text: 'text-gray-600',   taxa: '22%' },
  silver: { label: 'Silver', bg: 'bg-slate-100',  text: 'text-slate-600',  taxa: '20%' },
  gold:   { label: 'Gold',   bg: 'bg-amber-100',  text: 'text-amber-700',  taxa: '18%' },
  elite:  { label: 'Elite',  bg: 'bg-purple-100', text: 'text-purple-700', taxa: '16%' },
}

const ESTADO_CFG = {
  candidato: { label: 'Candidato', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  activo:    { label: 'Activo',    bg: 'bg-green-100',  text: 'text-green-700'  },
  suspenso:  { label: 'Suspenso',  bg: 'bg-red-100',    text: 'text-red-700'    },
}

const DEV_PRESTADORES = [
  { id: '1', nome: 'Weverton Mariano', localidade: 'Lisboa',  nivel: 'gold',   taxa_plataforma: 18, estado: 'activo',    nif: '123456789' },
  { id: '2', nome: 'Ana Costa',        localidade: 'Porto',   nivel: 'silver', taxa_plataforma: 20, estado: 'activo',    nif: '987654321' },
  { id: '3', nome: 'Rui Ferreira',     localidade: 'Braga',   nivel: 'base',   taxa_plataforma: 22, estado: 'candidato', nif: null        },
]

const FORM_EMPTY = { nome: '', localidade: '', nif: '', iban: '', nivel: 'base' }

export default function DashboardGestor() {
  const navigate = useNavigate()
  const [tab, setTab]             = useState('overview')
  const [stats, setStats]         = useState({ ordensPendentes: 0, prestadoresActivos: 0, receitaMes: 0, servicosActivos: 0 })
  const [prestadores, setPrestadores] = useState(DEV_BYPASS ? DEV_PRESTADORES : [])
  const [loading, setLoading]     = useState(!DEV_BYPASS)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(FORM_EMPTY)
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    if (DEV_BYPASS) return

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { navigate('/'); return }
      const [s, p] = await Promise.all([getStatsGestor(), getListaPrestadores()])
      setStats(s)
      setPrestadores(p)
      setLoading(false)
    })
  }, [])

  async function handleLogout() {
    if (!DEV_BYPASS) await supabase.auth.signOut()
    localStorage.removeItem('role')
    navigate('/')
  }

  function handleFormChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleAddPrestador(e) {
    e.preventDefault()
    setFormError(null)
    if (!form.nome.trim()) { setFormError('Nome é obrigatório.'); return }

    setSaving(true)

    if (DEV_BYPASS) {
      const mock = { ...form, id: String(Date.now()), taxa_plataforma: Number(NIVEL_CFG[form.nivel]?.taxa), estado: 'candidato' }
      setPrestadores(prev => [mock, ...prev])
      setForm(FORM_EMPTY)
      setShowForm(false)
      setSaving(false)
      return
    }

    const taxa = { base: 22, silver: 20, gold: 18, elite: 16 }[form.nivel] ?? 22
    const { data, error } = await insertPrestador({
      nome:            form.nome.trim(),
      localidade:      form.localidade.trim() || null,
      nif:             form.nif.trim()  || null,
      iban:            form.iban.trim() || null,
      nivel:           form.nivel,
      taxa_plataforma: taxa,
      estado:          'candidato',
    })

    if (error) { setFormError('Erro ao guardar. Verifica as permissões.'); setSaving(false); return }
    setPrestadores(prev => [data, ...prev])
    setForm(FORM_EMPTY)
    setShowForm(false)
    setSaving(false)
  }

  async function handleToggleEstado(id, estadoActual) {
    const novo = estadoActual === 'activo' ? 'suspenso' : 'activo'
    if (DEV_BYPASS) {
      setPrestadores(prev => prev.map(p => p.id === id ? { ...p, estado: novo } : p))
      return
    }
    const ok = await updatePrestadorEstado(id, novo)
    if (ok) setPrestadores(prev => prev.map(p => p.id === id ? { ...p, estado: novo } : p))
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
      {/* Header */}
      <header className="bg-teal-700 text-white px-4 py-4 flex items-center justify-between sticky top-0 z-30">
        <div>
          <p className="text-xs text-teal-200 font-medium tracking-widest uppercase">Admin</p>
          <h1 className="text-base font-bold leading-tight">V5 Manutenção</h1>
        </div>
        <button onClick={handleLogout} className="text-sm text-teal-200 hover:text-white transition-colors">
          Sair
        </button>
      </header>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-4 flex gap-0 sticky top-[60px] z-20">
        {[
          { key: 'overview',    label: 'Visão Geral'  },
          { key: 'prestadores', label: 'Prestadores'  },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Visão Geral ── */}
      {tab === 'overview' && (
        <main className="max-w-2xl mx-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <KpiCard titulo="Ordens Pendentes"    valor={stats.ordensPendentes}    cor="amarelo" />
            <KpiCard titulo="Prestadores Activos" valor={stats.prestadoresActivos} cor="azul"    />
            <KpiCard titulo="Receita Este Mês"    valor={fmt(stats.receitaMes)}    cor="verde"   />
            <KpiCard titulo="Serviços Activos"    valor={stats.servicosActivos}    cor="azul"    />
          </div>

          {/* Quick summary table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">Prestadores recentes</p>
              <button
                onClick={() => setTab('prestadores')}
                className="text-xs text-teal-600 font-medium hover:underline"
              >
                Ver todos →
              </button>
            </div>
            {prestadores.slice(0, 5).map(p => {
              const nc = NIVEL_CFG[p.nivel]  ?? NIVEL_CFG.base
              const ec = ESTADO_CFG[p.estado] ?? ESTADO_CFG.candidato
              return (
                <div key={p.id} className="px-4 py-3 flex items-center justify-between border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.nome}</p>
                    <p className="text-xs text-gray-400">{p.localidade ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${nc.bg} ${nc.text}`}>
                      {nc.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ec.bg} ${ec.text}`}>
                      {ec.label}
                    </span>
                  </div>
                </div>
              )
            })}
            {prestadores.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">Sem prestadores.</p>
            )}
          </div>
        </main>
      )}

      {/* ── Prestadores ── */}
      {tab === 'prestadores' && (
        <main className="max-w-2xl mx-auto p-4 space-y-4">
          {/* Add button / form toggle */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">
              {prestadores.length} prestador{prestadores.length !== 1 ? 'es' : ''}
            </p>
            <button
              onClick={() => { setShowForm(v => !v); setFormError(null) }}
              className="text-sm bg-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-teal-700 active:bg-teal-800 transition-colors"
            >
              {showForm ? 'Cancelar' : '+ Adicionar'}
            </button>
          </div>

          {/* Inline form */}
          {showForm && (
            <form
              onSubmit={handleAddPrestador}
              className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
            >
              <p className="text-sm font-semibold text-gray-800 mb-1">Novo Prestador</p>

              {[
                { name: 'nome',       label: 'Nome *',       type: 'text',  placeholder: 'Nome completo' },
                { name: 'localidade', label: 'Localidade',   type: 'text',  placeholder: 'Lisboa' },
                { name: 'nif',        label: 'NIF',          type: 'text',  placeholder: '123456789' },
                { name: 'iban',       label: 'IBAN',         type: 'text',  placeholder: 'PT50...' },
              ].map(f => (
                <div key={f.name} className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">{f.label}</label>
                  <input
                    name={f.name}
                    type={f.type}
                    value={form[f.name]}
                    onChange={handleFormChange}
                    placeholder={f.placeholder}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
              ))}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Nível</label>
                <select
                  name="nivel"
                  value={form.nivel}
                  onChange={handleFormChange}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 bg-white"
                >
                  <option value="base">Base — 22%</option>
                  <option value="silver">Silver — 20%</option>
                  <option value="gold">Gold — 18%</option>
                  <option value="elite">Elite — 16%</option>
                </select>
              </div>

              {formError && <p className="text-xs text-red-500">{formError}</p>}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-teal-600 text-white py-2.5 rounded-lg text-sm font-semibold
                  hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'A guardar…' : 'Guardar prestador'}
              </button>
            </form>
          )}

          {/* List */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {prestadores.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-10">
                Sem prestadores. Adiciona o primeiro.
              </p>
            )}
            {prestadores.map(p => {
              const nc = NIVEL_CFG[p.nivel]  ?? NIVEL_CFG.base
              const ec = ESTADO_CFG[p.estado] ?? ESTADO_CFG.candidato
              return (
                <div key={p.id} className="px-4 py-4 border-b border-gray-50 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{p.nome}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {p.localidade ?? '—'}{p.nif ? ` · NIF ${p.nif}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${nc.bg} ${nc.text}`}>
                        {nc.label} · {p.taxa_plataforma ?? nc.taxa.replace('%', '')}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ec.bg} ${ec.text}`}>
                      {ec.label}
                    </span>
                    {p.estado !== 'suspenso' ? (
                      <button
                        onClick={() => handleToggleEstado(p.id, p.estado)}
                        className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                          p.estado === 'activo'
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {p.estado === 'activo' ? 'Suspender' : 'Activar'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleEstado(p.id, p.estado)}
                        className="text-xs px-3 py-1 rounded-lg font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                      >
                        Reactivar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </main>
      )}
    </div>
  )
}
