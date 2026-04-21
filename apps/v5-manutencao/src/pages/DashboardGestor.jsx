import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import KpiCard from '../components/KpiCard'
import { supabase } from '../lib/supabase'
import { getStatsGestor, getListaPrestadores, insertPrestador, updatePrestadorEstado } from '../lib/queries'

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS === 'true'

function fmt(v) { return `€${Number(v).toFixed(2).replace('.', ',')}` }

const NIVEL_CFG = {
  base:   { label: 'Base',   bg: 'bg-gray-100',   text: 'text-gray-600',  taxa: 22 },
  silver: { label: 'Silver', bg: 'bg-slate-100',  text: 'text-slate-600', taxa: 20 },
  gold:   { label: 'Gold',   bg: 'bg-amber-100',  text: 'text-amber-700', taxa: 18 },
  elite:  { label: 'Elite',  bg: 'bg-purple-100', text: 'text-purple-700',taxa: 16 },
}
const ESTADO_CFG = {
  candidato: { label: 'Candidato', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  activo:    { label: 'Activo',    bg: 'bg-green-100',  text: 'text-green-700'  },
  suspenso:  { label: 'Suspenso',  bg: 'bg-red-100',    text: 'text-red-700'    },
}

const DEV_PRESTADORES = [
  { id: '1', nome: 'Weverton Mariano', localidade: 'Lisboa', nivel: 'gold',   taxa_plataforma: 18, estado: 'activo',    nif: '123456789', email: 'wev@demo.com' },
  { id: '2', nome: 'Ana Costa',        localidade: 'Porto',  nivel: 'silver', taxa_plataforma: 20, estado: 'activo',    nif: '987654321', email: 'ana@demo.com' },
  { id: '3', nome: 'Rui Ferreira',     localidade: 'Braga',  nivel: 'base',   taxa_plataforma: 22, estado: 'candidato', nif: null,        email: 'rui@demo.com' },
]

const INVITE_EMPTY = { nome: '', email: '', telefone: '', nivel: 'base' }
const CREATE_EMPTY = { nome: '', localidade: '', nif: '', iban: '', nivel: 'base' }

// ── Invite result card ─────────────────────────────────────────────────────
function InviteResult({ prestador, onClose }) {
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}/convite/${prestador.id}`

  function copyLink() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function openWhatsApp() {
    const msg = encodeURIComponent(
      `Olá ${prestador.nome}! Foste convidado/a para a plataforma V5 Manutenção. Regista-te aqui: ${link}`
    )
    const phone = prestador.telefone?.replace(/\D/g, '')
    window.open(phone ? `https://wa.me/351${phone}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank')
  }

  function openEmail() {
    const subject = encodeURIComponent('Convite — V5 Manutenção')
    const body = encodeURIComponent(
      `Olá ${prestador.nome},\n\nForam-te enviadas as tuas credenciais de acesso à plataforma V5 Manutenção.\n\nRegista-te através deste link:\n${link}\n\nCumprimentos,\nEquipa V5 Manutenção`
    )
    window.open(`mailto:${prestador.email}?subject=${subject}&body=${body}`, '_blank')
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-2">
        <span className="text-green-600 text-lg">✓</span>
        <div>
          <p className="text-sm font-semibold text-green-800">Convite criado para {prestador.nome}</p>
          <p className="text-xs text-green-600 mt-0.5">Partilha o link abaixo com o prestador</p>
        </div>
      </div>

      {/* Link */}
      <div className="bg-white border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
        <p className="text-xs text-gray-500 truncate flex-1">{link}</p>
        <button
          onClick={copyLink}
          className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors shrink-0 ${
            copied ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>

      {/* Share buttons */}
      <div className="flex gap-2">
        <button
          onClick={openWhatsApp}
          className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white text-xs font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity"
        >
          <span>WhatsApp</span>
        </button>
        {prestador.email && (
          <button
            onClick={openEmail}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span>Email</span>
          </button>
        )}
        <button
          onClick={onClose}
          className="px-4 bg-white border border-gray-200 text-gray-600 text-xs font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function DashboardGestor() {
  const navigate = useNavigate()
  const [tab, setTab]               = useState('overview')
  const [stats, setStats]           = useState({ ordensPendentes: 0, prestadoresActivos: 0, receitaMes: 0, servicosActivos: 0 })
  const [prestadores, setPrestadores] = useState(DEV_BYPASS ? DEV_PRESTADORES : [])
  const [loading, setLoading]       = useState(!DEV_BYPASS)

  // Form state
  const [panel, setPanel]           = useState(null)  // null | 'convidar' | 'criar'
  const [inviteForm, setInviteForm] = useState(INVITE_EMPTY)
  const [createForm, setCreateForm] = useState(CREATE_EMPTY)
  const [saving, setSaving]         = useState(false)
  const [formError, setFormError]   = useState(null)
  const [inviteResult, setInviteResult] = useState(null)

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

  function openPanel(mode) {
    setPanel(mode)
    setFormError(null)
    setInviteResult(null)
    setInviteForm(INVITE_EMPTY)
    setCreateForm(CREATE_EMPTY)
  }

  function closePanel() {
    setPanel(null)
    setInviteResult(null)
    setFormError(null)
  }

  async function handleLogout() {
    if (!DEV_BYPASS) await supabase.auth.signOut()
    localStorage.removeItem('role')
    navigate('/')
  }

  // ── Convidar submit ──────────────────────────────────────────────────────
  async function handleConvidar(e) {
    e.preventDefault()
    setFormError(null)
    if (!inviteForm.nome.trim()) { setFormError('Nome é obrigatório.'); return }
    if (!inviteForm.email.trim()) { setFormError('Email é obrigatório.'); return }
    setSaving(true)

    const taxa = NIVEL_CFG[inviteForm.nivel]?.taxa ?? 22

    if (DEV_BYPASS) {
      const mock = {
        id:              String(Date.now()),
        nome:            inviteForm.nome,
        email:           inviteForm.email,
        telefone:        inviteForm.telefone,
        nivel:           inviteForm.nivel,
        taxa_plataforma: taxa,
        estado:          'candidato',
        localidade:      null,
        nif:             null,
      }
      setPrestadores(prev => [mock, ...prev])
      setInviteResult(mock)
      setSaving(false)
      return
    }

    const { data, error } = await insertPrestador({
      nome:            inviteForm.nome.trim(),
      nivel:           inviteForm.nivel,
      taxa_plataforma: taxa,
      estado:          'candidato',
    })
    if (error) { setFormError('Erro ao guardar. Verifica as permissões.'); setSaving(false); return }
    const result = { ...data, email: inviteForm.email, telefone: inviteForm.telefone }
    setPrestadores(prev => [result, ...prev])
    setInviteResult(result)
    setSaving(false)
  }

  // ── Criar submit ─────────────────────────────────────────────────────────
  async function handleCriar(e) {
    e.preventDefault()
    setFormError(null)
    if (!createForm.nome.trim()) { setFormError('Nome é obrigatório.'); return }
    setSaving(true)

    const taxa = NIVEL_CFG[createForm.nivel]?.taxa ?? 22

    if (DEV_BYPASS) {
      const mock = { ...createForm, id: String(Date.now()), taxa_plataforma: taxa, estado: 'candidato' }
      setPrestadores(prev => [mock, ...prev])
      closePanel()
      setSaving(false)
      return
    }

    const { data, error } = await insertPrestador({
      nome:            createForm.nome.trim(),
      localidade:      createForm.localidade.trim() || null,
      nif:             createForm.nif.trim()  || null,
      iban:            createForm.iban.trim() || null,
      nivel:           createForm.nivel,
      taxa_plataforma: taxa,
      estado:          'candidato',
    })
    if (error) { setFormError('Erro ao guardar. Verifica as permissões.'); setSaving(false); return }
    setPrestadores(prev => [data, ...prev])
    closePanel()
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

  // ── Shared field renderer ─────────────────────────────────────────────────
  function Field({ label, name, type = 'text', placeholder, value, onChange }) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">{label}</label>
        <input
          name={name} type={type} value={value} onChange={onChange}
          placeholder={placeholder}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 transition-colors"
        />
      </div>
    )
  }

  function NivelSelect({ value, onChange, name = 'nivel' }) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Nível</label>
        <select name={name} value={value} onChange={onChange}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 bg-white">
          <option value="base">Base — 22%</option>
          <option value="silver">Silver — 20%</option>
          <option value="gold">Gold — 18%</option>
          <option value="elite">Elite — 16%</option>
        </select>
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
        <button onClick={handleLogout} className="text-sm text-teal-200 hover:text-white transition-colors">Sair</button>
      </header>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-4 flex sticky top-[60px] z-20">
        {[{ key: 'overview', label: 'Visão Geral' }, { key: 'prestadores', label: 'Prestadores' }].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}>
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

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">Prestadores recentes</p>
              <button onClick={() => setTab('prestadores')} className="text-xs text-teal-600 font-medium hover:underline">
                Ver todos →
              </button>
            </div>
            {prestadores.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">Sem prestadores.</p>
            )}
            {prestadores.slice(0, 5).map(p => {
              const nc = NIVEL_CFG[p.nivel] ?? NIVEL_CFG.base
              const ec = ESTADO_CFG[p.estado] ?? ESTADO_CFG.candidato
              return (
                <div key={p.id} className="px-4 py-3 flex items-center justify-between border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.nome}</p>
                    <p className="text-xs text-gray-400">{p.localidade ?? p.email ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${nc.bg} ${nc.text}`}>{nc.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ec.bg} ${ec.text}`}>{ec.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </main>
      )}

      {/* ── Prestadores ── */}
      {tab === 'prestadores' && (
        <main className="max-w-2xl mx-auto p-4 space-y-4">

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">
              {prestadores.length} prestador{prestadores.length !== 1 ? 'es' : ''}
            </p>
            {!panel && (
              <div className="flex gap-2">
                <button
                  onClick={() => openPanel('convidar')}
                  className="text-sm bg-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors"
                >
                  + Convidar
                </button>
                <button
                  onClick={() => openPanel('criar')}
                  className="text-sm bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  + Criar
                </button>
              </div>
            )}
            {panel && (
              <button onClick={closePanel} className="text-sm text-gray-500 hover:text-gray-800">
                Cancelar
              </button>
            )}
          </div>

          {/* ── Convidar panel ── */}
          {panel === 'convidar' && !inviteResult && (
            <form onSubmit={handleConvidar} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-800">Convidar prestador</p>
              <p className="text-xs text-gray-400 -mt-1">Gera um link de convite para o prestador se registar.</p>

              <Field label="Nome *"     name="nome"     value={inviteForm.nome}     placeholder="Nome completo"
                onChange={e => setInviteForm(p => ({ ...p, nome: e.target.value }))} />
              <Field label="Email *"    name="email"    type="email" value={inviteForm.email}    placeholder="email@exemplo.com"
                onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} />
              <Field label="Telefone"   name="telefone" type="tel"   value={inviteForm.telefone} placeholder="912 345 678"
                onChange={e => setInviteForm(p => ({ ...p, telefone: e.target.value }))} />
              <NivelSelect value={inviteForm.nivel} onChange={e => setInviteForm(p => ({ ...p, nivel: e.target.value }))} />

              {formError && <p className="text-xs text-red-500">{formError}</p>}

              <button type="submit" disabled={saving}
                className="w-full bg-teal-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-60 transition-colors">
                {saving ? 'A criar…' : 'Criar convite'}
              </button>
            </form>
          )}

          {/* ── Invite result ── */}
          {panel === 'convidar' && inviteResult && (
            <InviteResult
              prestador={inviteResult}
              onClose={closePanel}
            />
          )}

          {/* ── Criar panel ── */}
          {panel === 'criar' && (
            <form onSubmit={handleCriar} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-800">Criar prestador manualmente</p>

              <Field label="Nome *"      name="nome"       value={createForm.nome}       placeholder="Nome completo"
                onChange={e => setCreateForm(p => ({ ...p, nome: e.target.value }))} />
              <Field label="Localidade"  name="localidade" value={createForm.localidade} placeholder="Lisboa"
                onChange={e => setCreateForm(p => ({ ...p, localidade: e.target.value }))} />
              <Field label="NIF"         name="nif"        value={createForm.nif}        placeholder="123456789"
                onChange={e => setCreateForm(p => ({ ...p, nif: e.target.value }))} />
              <Field label="IBAN"        name="iban"       value={createForm.iban}       placeholder="PT50…"
                onChange={e => setCreateForm(p => ({ ...p, iban: e.target.value }))} />
              <NivelSelect value={createForm.nivel} onChange={e => setCreateForm(p => ({ ...p, nivel: e.target.value }))} />

              {formError && <p className="text-xs text-red-500">{formError}</p>}

              <button type="submit" disabled={saving}
                className="w-full bg-gray-800 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-900 disabled:opacity-60 transition-colors">
                {saving ? 'A guardar…' : 'Guardar prestador'}
              </button>
            </form>
          )}

          {/* ── Prestadores list ── */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {prestadores.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-10">Sem prestadores. Convida o primeiro.</p>
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
                        {p.localidade ?? p.email ?? '—'}{p.nif ? ` · NIF ${p.nif}` : ''}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${nc.bg} ${nc.text}`}>
                      {nc.label} · {p.taxa_plataforma ?? nc.taxa}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ec.bg} ${ec.text}`}>
                      {ec.label}
                    </span>
                    <button
                      onClick={() => handleToggleEstado(p.id, p.estado)}
                      className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                        p.estado === 'activo'
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {p.estado === 'activo' ? 'Suspender' : p.estado === 'suspenso' ? 'Reactivar' : 'Activar'}
                    </button>
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
