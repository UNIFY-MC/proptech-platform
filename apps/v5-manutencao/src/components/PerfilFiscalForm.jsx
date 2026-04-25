import React, { useState } from 'react'

const G   = '#1B4332'
const GL  = '#52B788'
const C   = {
  ink: '#0f172a', slate: '#64748b', border: '#e2e8f0',
  bg: '#f8fafc', white: '#fff', red: '#A32D2D', redSoft: '#FFEAEA',
  greenXl: '#D8F3DC',
}

function Field({ label, value, onChange, type = 'text', maxLength, placeholder }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: .5, color: C.slate, marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '9px 12px', borderRadius: 8,
          border: `1px solid ${C.border}`, fontSize: 14,
          background: C.white, color: C.ink, boxSizing: 'border-box', outline: 'none',
        }}
      />
    </div>
  )
}

export default function PerfilFiscalForm({ perfilExistente = null, onSave, onCancel, saving = false }) {
  const [nome,     setNome]     = useState(perfilExistente?.nome              || '')
  const [nif,      setNif]      = useState(perfilExistente?.nif               || '')
  const [nomeFat,  setNomeFat]  = useState(perfilExistente?.nome_facturacao   || '')
  const [morada,   setMorada]   = useState(perfilExistente?.morada_facturacao || '')
  const [iban,     setIban]     = useState(perfilExistente?.iban              || '')
  const [erro,     setErro]     = useState(null)

  function validar() {
    if (!nome.trim())    return 'O nome do perfil é obrigatório'
    if (nif && !/^\d{9}$/.test(nif)) return 'NIF deve ter 9 dígitos'
    // TODO(mario): validar checkdigit NIF português
    return null
  }

  function handleSave() {
    const err = validar()
    if (err) { setErro(err); return }
    setErro(null)
    onSave({ nome: nome.trim(), nif: nif.trim() || null, nome_facturacao: nomeFat.trim() || null, morada_facturacao: morada.trim() || null, iban: iban.trim() || null })
  }

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: .6, color: C.slate, textTransform: 'uppercase', marginBottom: 14 }}>
        {perfilExistente ? 'Editar perfil fiscal' : 'Novo perfil fiscal'}
      </div>

      <Field label="Nome do perfil"       value={nome}    onChange={setNome}    placeholder='Ex: Pessoal, Empresa AL, Condomínio Y' />
      <Field label="NIF"                  value={nif}     onChange={setNif}     maxLength={9} placeholder='9 dígitos' />
      <Field label="Nome para faturação"  value={nomeFat} onChange={setNomeFat} placeholder='Nome que aparece na fatura' />
      <Field label="Morada de faturação"  value={morada}  onChange={setMorada}  placeholder='Rua, número, CP, cidade' />
      <Field label="IBAN (opcional)"      value={iban}    onChange={setIban}    placeholder='PT50...' />

      {erro && (
        <div style={{ fontSize: 12, color: C.red, background: C.redSoft, borderRadius: 7, padding: '6px 10px', marginBottom: 10 }}>{erro}</div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '9px', borderRadius: 8, background: C.bg,
          border: `1px solid ${C.border}`, fontSize: 13, fontWeight: 600, color: C.slate, cursor: 'pointer',
        }}>Cancelar</button>
        <button onClick={handleSave} disabled={saving} style={{
          flex: 2, padding: '9px', borderRadius: 8, background: G,
          border: 'none', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer',
          opacity: saving ? .6 : 1,
        }}>{saving ? 'A guardar...' : perfilExistente ? 'Guardar alterações' : 'Criar perfil'}</button>
      </div>
    </div>
  )
}
