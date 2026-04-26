import React, { useState, useEffect, useCallback } from 'react'
import { supaCore, supa } from '../supa'
import PhoneInput from '../components/PhoneInput.jsx'

const G = '#0B3D2E'; const G2 = '#164E3A'; const EM = '#10B981'
const C = {
  ink: '#0f172a', slate: '#64748b', border: '#e2e8f0',
  bg: '#f8fafc', white: '#fff', red: '#dc2626', redSoft: '#fee2e2',
}

/* ─── Validators ─────────────────────────────────────────────── */
function validarNIF(nif) {
  if (!nif || !/^\d{9}$/.test(nif)) return false
  const factors = [9, 8, 7, 6, 5, 4, 3, 2]
  const sum = factors.reduce((acc, f, i) => acc + parseInt(nif[i]) * f, 0)
  const r = sum % 11
  const check = r < 2 ? 0 : 11 - r
  return parseInt(nif[8]) === check
}
function validarTelefone(t, indicativo = '+351') {
  if (!t || t.trim() === '') return false // obrigatório
  const digits = t.replace(/\s/g, '')
  if (indicativo === '+351') return /^9\d{8}$/.test(digits)
  return /^\d{6,15}$/.test(digits)
}
function validarIBAN(iban) {
  if (!iban || iban.trim() === '') return true // opcional
  return /^PT50\d{21}$/.test(iban.replace(/[\s-]/g, '').toUpperCase())
}
function validarPrimeiroNome(n) {
  return n && n.trim().length >= 1
}

/* ─── Tipo de cliente ────────────────────────────────────────── */
const TIPO_CARDS = [
  { id: 'individual',       emoji: '👤', titulo: 'Individual',            sub: 'Uma casa ou várias minhas' },
  { id: 'empresa_comercial', emoji: '🏢', titulo: 'Empresa / AL',          sub: 'Alojamento local, escritório, comercial' },
  { id: 'condominio',       emoji: '🏘️', titulo: 'Condomínio',            sub: 'Geres 1 ou mais condomínios' },
  { id: 'gestor_imoveis',   emoji: '🔑', titulo: 'Gestor de imóveis',     sub: 'Geres casas de terceiros' },
]

/* Steps visíveis por tipo */
const STEPS_FOR_TIPO = {
  individual:       [1, 2, 4, 5],
  empresa_comercial: [1, 2, 3, 4, 5],
  condominio:       [1, 2, 3, 4, 5],
  gestor_imoveis:   [1, 2, 3, 5],
}

const DEFAULT_STATE = {
  tipo: '', primeiro_nome: '', apelidos: '', nome: '', nif: '', telemovel: '', telefone_indicativo: '+351', foto_url: '',
  ent_nome: '', ent_nif: '', ent_morada: '', ent_localidade: '', ent_cp: '', ent_iban: '',
  loc_nome: '', loc_tipo: 'habitacao', loc_morada: '', loc_localidade: '', loc_cp: '', loc_area: '',
  loc_mesma_morada: false,
}

function canContinue(step, state) {
  if (step === 1) return !!state.tipo
  if (step === 2) {
    return validarPrimeiroNome(state.primeiro_nome) &&
           validarNIF(state.nif) &&
           validarTelefone(state.telemovel, state.telefone_indicativo)
  }
  if (step === 3) {
    if (state.tipo === 'gestor_imoveis') return true
    return (
      state.ent_nome.trim().length > 1 &&
      validarNIF(state.ent_nif) &&
      state.ent_cp.trim() !== '' &&
      state.ent_localidade.trim() !== '' &&
      validarIBAN(state.ent_iban)
    )
  }
  if (step === 4) return state.loc_nome.trim().length > 0
  return false
}

/* ─── Shared input style ─────────────────────────────────────── */
const inp = (invalid) => ({
  width: '100%', padding: '10px 12px', fontSize: 14,
  border: `1.5px solid ${invalid ? C.red : C.border}`,
  borderRadius: 9, boxSizing: 'border-box', outline: 'none',
  fontFamily: 'inherit', background: C.white,
})
const lbl = { fontSize: 10, color: '#555', fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }
function Field({ label, children }) {
  return <div style={{ marginBottom: 12 }}><label style={lbl}>{label}</label>{children}</div>
}
function Hint({ ok, text }) {
  if (!text) return null
  return <div style={{ fontSize: 11, color: ok ? EM : C.red, marginTop: 3 }}>{text}</div>
}

/* ══════════════════════════════════════════════════════════════
   STEP 1 — Tipo de cliente
══════════════════════════════════════════════════════════════ */
function Step1Tipo({ state, setState }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.ink, fontFamily: "'Fraunces',Georgia,serif", marginBottom: 4 }}>
        Como vais usar a plataforma?
      </div>
      <div style={{ fontSize: 13, color: C.slate, marginBottom: 20 }}>
        Escolhe o perfil que melhor te representa.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {TIPO_CARDS.map(t => {
          const active = state.tipo === t.id
          return (
            <button
              key={t.id}
              onClick={() => setState(s => ({ ...s, tipo: t.id }))}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                border: `2px solid ${active ? EM : C.border}`,
                background: active ? '#ECFDF5' : C.white,
                textAlign: 'left', width: '100%', fontFamily: 'inherit',
                transition: 'border-color .15s, background .15s',
              }}
            >
              <div style={{ fontSize: 28, flexShrink: 0 }}>{t.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: active ? G : C.ink }}>{t.titulo}</div>
                <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>{t.sub}</div>
              </div>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${active ? EM : C.border}`,
                background: active ? EM : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.white }} />}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   STEP 2 — Dados pessoais
══════════════════════════════════════════════════════════════ */
function Step2DadosPessoais({ state, setState }) {
  const [touched, setTouch] = useState({})
  const touch = (f) => setTouch(t => ({ ...t, [f]: true }))
  const set = (f) => (e) => setState(s => ({ ...s, [f]: e.target.value }))

  const nifOk        = validarNIF(state.nif)
  const telOk        = validarTelefone(state.telemovel, state.telefone_indicativo)
  const primeiroNomeOk = validarPrimeiroNome(state.primeiro_nome)

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.ink, fontFamily: "'Fraunces',Georgia,serif", marginBottom: 4 }}>
        Os teus dados
      </div>
      <div style={{ fontSize: 13, color: C.slate, marginBottom: 20 }}>
        Precisamos disto para a tua conta e para os recibos.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 0 }}>
        <Field label="Primeiro nome *">
          <input
            type="text" value={state.primeiro_nome}
            onChange={set('primeiro_nome')} onBlur={() => touch('primeiro_nome')}
            placeholder="Maria" style={inp(touched.primeiro_nome && !primeiroNomeOk)}
          />
          {touched.primeiro_nome && !primeiroNomeOk && <Hint ok={false} text="Obrigatório" />}
        </Field>
        <Field label="Apelido">
          <input
            type="text" value={state.apelidos}
            onChange={set('apelidos')} onBlur={() => touch('apelidos')}
            placeholder="Santos" style={inp(false)}
          />
        </Field>
      </div>
      <div style={{ fontSize: 11, color: C.slate, marginBottom: 12, marginTop: -4 }}>
        O primeiro nome aparece nas saudações. O apelido completa o nome nos recibos.
      </div>

      <Field label="NIF pessoal">
        <input
          type="text" inputMode="numeric" maxLength={9}
          value={state.nif} onChange={set('nif')} onBlur={() => touch('nif')}
          placeholder="123456789" style={inp(touched.nif && !nifOk)}
        />
        {touched.nif && !nifOk && <Hint ok={false} text="NIF inválido — 9 dígitos" />}
        {state.nif.length === 9 && nifOk && <Hint ok={true} text="✓ NIF válido" />}
      </Field>

      <Field label="Telemóvel">
        <PhoneInput
          value={state.telemovel}
          indicativo={state.telefone_indicativo}
          hasError={touched.telemovel && !telOk}
          onChange={(num, ind) => {
            setState(s => ({ ...s, telemovel: num, telefone_indicativo: ind }))
          }}
        />
        <div onClick={() => touch('telemovel')}>
          {touched.telemovel && !state.telemovel.trim() && (
            <Hint ok={false} text="Precisamos do telefone para o prestador te contactar" />
          )}
          {touched.telemovel && state.telemovel.trim() && !telOk && (
            <Hint ok={false} text={state.telefone_indicativo === '+351'
              ? 'Formato PT: 9X XXX XXXX (9 dígitos, começa em 9)'
              : 'Número inválido (6-15 dígitos)'} />
          )}
          {state.telemovel.trim() && telOk && (
            <Hint ok={true} text="✓ Número válido" />
          )}
        </div>
      </Field>

      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 12px' }}>
        <div style={{ fontSize: 12, color: '#166534' }}>
          📎 Foto de perfil — disponível após o registo nas definições.
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   STEP 3 — Entidade (empresa/condo) ou info (gestor)
══════════════════════════════════════════════════════════════ */
function Step3Entidade({ state, setState }) {
  const [touched, setTouch] = useState({})
  const touch = (f) => setTouch(t => ({ ...t, [f]: true }))
  const set = (f) => (e) => setState(s => ({ ...s, [f]: e.target.value }))

  if (state.tipo === 'gestor_imoveis') {
    return (
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.ink, fontFamily: "'Fraunces',Georgia,serif", marginBottom: 4 }}>
          Gestão de imóveis de terceiros
        </div>
        <div style={{ fontSize: 13, color: C.slate, marginBottom: 20, lineHeight: 1.6 }}>
          Vais começar sem entidades associadas. Podes adicionar as casas dos teus clientes depois, directamente na plataforma.
        </div>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: G, marginBottom: 8 }}>O que podes fazer:</div>
          {['Adicionar imóveis de clientes', 'Agendar serviços em seu nome', 'Receber relatórios por imóvel', 'Gerir múltiplas equipas'].map(item => (
            <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <div style={{ color: EM, fontWeight: 700, fontSize: 14 }}>✓</div>
              <div style={{ fontSize: 13, color: C.ink }}>{item}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const isEmpresa = state.tipo === 'empresa_comercial'
  const nomePlaceholder = isEmpresa ? 'Lda., Unipessoal, AL...' : 'Condomínio Edifício Lisboa'
  const nifOk = validarNIF(state.ent_nif)
  const ibanOk = validarIBAN(state.ent_iban)

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.ink, fontFamily: "'Fraunces',Georgia,serif", marginBottom: 4 }}>
        {isEmpresa ? 'A tua empresa' : 'O teu condomínio'}
      </div>
      <div style={{ fontSize: 13, color: C.slate, marginBottom: 20 }}>
        Dados fiscais da entidade. Aparecem nos recibos e facturas.
      </div>

      <Field label={isEmpresa ? 'Nome da empresa' : 'Nome do condomínio'}>
        <input
          type="text" value={state.ent_nome}
          onChange={set('ent_nome')} onBlur={() => touch('ent_nome')}
          placeholder={nomePlaceholder} style={inp(touched.ent_nome && state.ent_nome.trim().length < 2)}
        />
      </Field>

      <Field label="NIF da entidade">
        <input
          type="text" inputMode="numeric" maxLength={9}
          value={state.ent_nif} onChange={set('ent_nif')} onBlur={() => touch('ent_nif')}
          placeholder="500123456" style={inp(touched.ent_nif && !nifOk)}
        />
        {touched.ent_nif && !nifOk && <Hint ok={false} text="NIF inválido — 9 dígitos" />}
        {state.ent_nif.length === 9 && nifOk && <Hint ok={true} text="✓ NIF válido" />}
      </Field>

      <Field label="Morada fiscal">
        <input
          type="text" value={state.ent_morada}
          onChange={set('ent_morada')} onBlur={() => touch('ent_morada')}
          placeholder="Rua, número, andar" style={inp(false)}
        />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <Field label="Código postal">
          <input
            type="text" value={state.ent_cp}
            onChange={set('ent_cp')} onBlur={() => touch('ent_cp')}
            placeholder="1000-001" style={inp(touched.ent_cp && state.ent_cp.trim() === '')}
          />
        </Field>
        <Field label="Localidade">
          <input
            type="text" value={state.ent_localidade}
            onChange={set('ent_localidade')} onBlur={() => touch('ent_localidade')}
            placeholder="Lisboa" style={inp(false)}
          />
        </Field>
      </div>

      <Field label="IBAN (opcional)">
        <input
          type="text" value={state.ent_iban}
          onChange={(e) => setState(s => ({ ...s, ent_iban: e.target.value.toUpperCase() }))}
          onBlur={() => touch('ent_iban')}
          placeholder="PT50 0000 0000 0000 0000 0000 0" style={inp(touched.ent_iban && !ibanOk)}
        />
        {touched.ent_iban && !ibanOk && <Hint ok={false} text="Formato PT50 XXXX... (25 dígitos após PT50)" />}
      </Field>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   STEP 4 — Primeira localização
══════════════════════════════════════════════════════════════ */
const TIPOS_IMOVEL = [
  { id: 'habitacao',         label: 'Apartamento / Moradia' },
  { id: 'segunda_habitacao', label: 'Segunda habitação' },
  { id: 'condominio',        label: 'Edifício / Condomínio' },
  { id: 'empresa',           label: 'Escritório / Comercial' },
]

function Step4Localizacao({ state, setState }) {
  const set = (f) => (e) => setState(s => ({ ...s, [f]: e.target.value }))
  const temMoradaEntidade = state.ent_morada && state.ent_cp

  const handleMesmaMorada = (checked) => {
    if (checked) {
      setState(s => ({
        ...s,
        loc_mesma_morada: true,
        loc_morada: s.ent_morada,
        loc_localidade: s.ent_localidade,
        loc_cp: s.ent_cp,
      }))
    } else {
      setState(s => ({ ...s, loc_mesma_morada: false }))
    }
  }

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.ink, fontFamily: "'Fraunces',Georgia,serif", marginBottom: 4 }}>
        O teu primeiro imóvel
      </div>
      <div style={{ fontSize: 13, color: C.slate, marginBottom: 20 }}>
        Podes adicionar mais depois nas definições.
      </div>

      <Field label="Nome amigável">
        <input
          type="text" value={state.loc_nome}
          onChange={set('loc_nome')}
          placeholder='Ex: "Casa Cascais", "Apartamento Lisboa"'
          style={inp(false)}
        />
      </Field>

      <Field label="Tipo de imóvel">
        <select value={state.loc_tipo} onChange={set('loc_tipo')} style={{ ...inp(false), appearance: 'none', paddingRight: 28 }}>
          {TIPOS_IMOVEL.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </Field>

      {temMoradaEntidade && (
        <button
          onClick={() => handleMesmaMorada(!state.loc_mesma_morada)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: state.loc_mesma_morada ? '#ECFDF5' : C.bg,
            border: `1.5px solid ${state.loc_mesma_morada ? EM : C.border}`,
            borderRadius: 9, padding: '9px 12px', cursor: 'pointer',
            marginBottom: 12, width: '100%', fontFamily: 'inherit',
          }}
        >
          <div style={{
            width: 18, height: 18, borderRadius: 4, border: `2px solid ${state.loc_mesma_morada ? EM : C.border}`,
            background: state.loc_mesma_morada ? EM : C.white,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {state.loc_mesma_morada && <span style={{ color: C.white, fontSize: 11, fontWeight: 800 }}>✓</span>}
          </div>
          <span style={{ fontSize: 13, color: C.ink }}>Mesma morada da entidade fiscal</span>
        </button>
      )}

      <Field label="Morada">
        <input
          type="text" value={state.loc_morada}
          onChange={set('loc_morada')}
          readOnly={state.loc_mesma_morada}
          placeholder="Rua, número, andar"
          style={{ ...inp(false), background: state.loc_mesma_morada ? C.bg : C.white }}
        />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <Field label="Código postal">
          <input
            type="text" value={state.loc_cp}
            onChange={set('loc_cp')}
            readOnly={state.loc_mesma_morada}
            placeholder="1000-001"
            style={{ ...inp(false), background: state.loc_mesma_morada ? C.bg : C.white }}
          />
        </Field>
        <Field label="Localidade">
          <input
            type="text" value={state.loc_localidade}
            onChange={set('loc_localidade')}
            readOnly={state.loc_mesma_morada}
            placeholder="Lisboa"
            style={{ ...inp(false), background: state.loc_mesma_morada ? C.bg : C.white }}
          />
        </Field>
      </div>

      <Field label="Área m² (opcional)">
        <input
          type="number" inputMode="numeric"
          value={state.loc_area} onChange={set('loc_area')}
          placeholder="85" min="0" style={inp(false)}
        />
      </Field>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   STEP 5 — Welcome + chamada RPC
══════════════════════════════════════════════════════════════ */
function Step5Welcome({ state, user, onComplete, clearStorage }) {
  const [status, setStatus] = useState('idle') // idle | loading | ok | error
  const [erro, setErro]     = useState(null)
  // sessionStorage persiste através de re-mounts React (StrictMode / needsOnboarding flicker)
  const RPC_KEY = `v5:onboarding:rpc:${user.id}`

  const primeiroNome = state.primeiro_nome || (state.nome || '').split(' ')[0] || 'bem-vindo'

  const callRPC = useCallback(async () => {
    if (sessionStorage.getItem(RPC_KEY)) return
    sessionStorage.setItem(RPC_KEY, '1')
    setStatus('loading')
    setErro(null)

    const nomeCompleto = [state.primeiro_nome, state.apelidos].filter(Boolean).join(' ').trim()
      || state.nome?.trim() || ''

    const payload = {
      auth_user_id:         user.id,
      tipo:                 state.tipo,
      primeiro_nome:        state.primeiro_nome?.trim() || '',
      apelidos:             state.apelidos?.trim() || '',
      nome:                 nomeCompleto,
      nif_pessoal:          state.nif.trim(),
      telemovel:            state.telemovel.trim(),
      telefone_indicativo:  state.telefone_indicativo || '+351',
      foto_url:             state.foto_url || null,
      ent_nome:             state.ent_nome.trim(),
      ent_nif:              state.ent_nif.trim(),
      ent_morada:           state.ent_morada.trim(),
      ent_localidade:       state.ent_localidade.trim(),
      ent_cp:               state.ent_cp.trim(),
      ent_iban:             state.ent_iban.trim(),
      loc_nome:             state.loc_nome.trim(),
      loc_tipo:             state.loc_tipo,
      loc_morada:           state.loc_morada.trim(),
      loc_localidade:       state.loc_localidade.trim(),
      loc_cp:               state.loc_cp.trim(),
      loc_area:             state.loc_area ? parseFloat(state.loc_area) : null,
    }

    const { data, error } = await supaCore.rpc('fn_complete_onboarding', { payload })

    if (error || !data?.ok) {
      sessionStorage.removeItem(RPC_KEY) // permite tentar de novo
      setErro(error?.message || 'Erro desconhecido — tenta de novo.')
      setStatus('error')
      return
    }

    clearStorage()
    setStatus('ok')
  }, [state, user, clearStorage, RPC_KEY])

  useEffect(() => { callRPC() }, [callRPC])

  if (status === 'loading') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16 }}>
      <div style={{ width: 48, height: 48, border: `4px solid ${C.border}`, borderTopColor: EM, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <div style={{ fontSize: 14, color: C.slate }}>A criar a tua conta...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (status === 'error') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 32 }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Algo correu mal</div>
      <div style={{ background: C.redSoft, border: `1px solid #fca5a5`, borderRadius: 10, padding: '12px 14px', fontSize: 13, color: C.red, width: '100%' }}>
        {erro}
      </div>
      <button
        onClick={() => { sessionStorage.removeItem(RPC_KEY); callRPC() }}
        style={{ width: '100%', padding: '13px', borderRadius: 10, background: G, color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        Tentar de novo
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16, gap: 0 }}>
      {/* Checkmark animado */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%', background: `linear-gradient(135deg,${G},${EM})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
        animation: 'popIn .4s cubic-bezier(.175,.885,.32,1.275)',
      }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <style>{`@keyframes popIn { from { transform: scale(0); opacity:0 } to { transform: scale(1); opacity:1 } }`}</style>

      <div style={{ fontSize: 26, fontWeight: 700, color: C.ink, fontFamily: "'Fraunces',Georgia,serif", textAlign: 'center', marginBottom: 8 }}>
        Bem-vindo, {primeiroNome}!
      </div>
      <div style={{ fontSize: 14, color: C.slate, textAlign: 'center', lineHeight: 1.6, marginBottom: 24 }}>
        A tua conta está pronta.{'\n'}
        <span style={{ color: EM, fontWeight: 700 }}>Ganha 50€ na primeira contratação.</span>
      </div>

      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', width: '100%', marginBottom: 24 }}>
        {[
          { emoji: '🏠', text: 'Imóvel registado e pronto a gerir' },
          { emoji: '✅', text: 'Perfil fiscal criado' },
          { emoji: '🔧', text: '199 serviços disponíveis para ti' },
        ].map(({ emoji, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>{emoji}</span>
            <span style={{ fontSize: 13, color: C.ink }}>{text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onComplete}
        style={{
          width: '100%', padding: '15px', borderRadius: 12,
          background: `linear-gradient(135deg,${G},${G2})`,
          color: '#fff', border: 'none', fontSize: 16, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 4px 14px rgba(11,61,46,.35)',
        }}
      >
        Começar 🚀
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN — OnboardingWizardScreen
══════════════════════════════════════════════════════════════ */
export default function OnboardingWizardScreen({ user, onComplete }) {
  const storageKey = `v5:onboarding:${user.id}`

  const saved = (() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || 'null') } catch { return null }
  })()

  const [step,  setStep]  = useState(saved?.step  || 1)
  const [state, setState] = useState(() => {
    const base = { ...DEFAULT_STATE, ...saved?.state }
    // Pré-preencher de user_metadata (Google OAuth, etc.) se ainda sem nome
    if (!base.primeiro_nome && user.user_metadata?.nome_completo) {
      const partes = user.user_metadata.nome_completo.trim().split(/\s+/)
      base.primeiro_nome = partes[0] || ''
      base.apelidos      = partes.slice(1).join(' ') || ''
    }
    return base
  })

  // Persistir a cada mudança
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ step, state }))
  }, [step, state, storageKey])

  const steps   = !state.tipo ? [1, 2, 3, 4, 5] : (STEPS_FOR_TIPO[state.tipo] || [1, 2, 3, 4, 5])
  const stepIdx = steps.indexOf(step)
  const ok      = canContinue(step, state)

  const goNext = () => {
    const nextIdx = stepIdx + 1
    if (nextIdx < steps.length) setStep(steps[nextIdx])
  }
  const goBack = () => {
    const prevIdx = stepIdx - 1
    if (prevIdx >= 0) setStep(steps[prevIdx])
  }

  const handleLogout = async () => {
    // NÃO limpa localStorage — retoma no próximo login
    await supa.auth.signOut()
  }

  const handleComplete = async () => {
    await onComplete()
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Outfit',system-ui,sans-serif" }}>
      {/* Header — logo centrado, consistente com LoginScreen/SignupScreen */}
      <div style={{
        background: `linear-gradient(145deg,${G},${G2})`,
        padding: '13px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Placeholder com mesma largura do botão "Sair" para centrar o logo */}
        <div style={{ width: 52 }} />

        {/* TODO(mario fix-ux): rever brand pública (V5/Property7/outra?) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 26 }}>🏠</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Fraunces',Georgia,serif", letterSpacing: '-0.01em' }}>
            V5 Manutenção
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)',
            borderRadius: 8, padding: '5px 12px', color: 'rgba(255,255,255,.8)',
            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', width: 52,
          }}
        >
          Sair
        </button>
      </div>

      {/* Progress bar */}
      <div style={{
        background: C.white, padding: '12px 16px',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        {steps.map((s, i) => (
          <div
            key={s}
            style={{
              height: 8, borderRadius: 4,
              width: i === stepIdx ? 28 : (i < stepIdx ? 28 : 8),
              background: i < stepIdx ? EM : i === stepIdx ? G : C.border,
              transition: 'all .25s ease',
            }}
          />
        ))}
        <span style={{ fontSize: 11, color: C.slate, marginLeft: 6 }}>
          {stepIdx + 1}/{steps.length}
        </span>
      </div>

      {/* Conteúdo */}
      <div style={{ padding: '20px 16px', paddingBottom: step === 5 ? 32 : 100 }}>
        {step === 1 && <Step1Tipo         state={state} setState={setState} />}
        {step === 2 && <Step2DadosPessoais state={state} setState={setState} />}
        {step === 3 && <Step3Entidade     state={state} setState={setState} />}
        {step === 4 && <Step4Localizacao  state={state} setState={setState} />}
        {step === 5 && (
          <Step5Welcome
            state={state}
            user={user}
            onComplete={handleComplete}
            clearStorage={() => localStorage.removeItem(storageKey)}
          />
        )}
      </div>

      {/* Footer nav — oculto no step 5 */}
      {step !== 5 && (
        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430,
          background: C.white, borderTop: `1px solid ${C.border}`,
          padding: '12px 16px', display: 'flex', gap: 10,
          boxShadow: '0 -2px 12px rgba(0,0,0,.06)',
        }}>
          {stepIdx > 0 && (
            <button
              onClick={goBack}
              style={{
                width: 48, padding: '12px', border: `1.5px solid ${C.border}`,
                borderRadius: 10, background: C.white, fontSize: 16,
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              ←
            </button>
          )}
          <button
            onClick={goNext}
            disabled={!ok}
            style={{
              flex: 1, padding: '13px', borderRadius: 10,
              background: ok ? G : '#cbd5e1',
              color: '#fff', border: 'none', fontSize: 14, fontWeight: 700,
              cursor: ok ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
              transition: 'background .15s',
            }}
          >
            {step === 4 || (state.tipo === 'gestor_imoveis' && step === 3) ? 'Ver resumo →' : 'Continuar →'}
          </button>
        </div>
      )}
    </div>
  )
}
