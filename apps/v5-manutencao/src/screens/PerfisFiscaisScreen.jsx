import React, { useState } from 'react'
import { usePerfisFiscais } from '../lib/PerfisFiscaisContext.jsx'
import PerfilFiscalForm from '../components/PerfilFiscalForm.jsx'

const G  = '#1B4332'; const GM = '#2D6A4F'; const GL = '#52B788'
const C  = {
  ink: '#0f172a', slate: '#64748b', border: '#e2e8f0', bg: '#f8fafc', white: '#fff',
  line: '#E5E7EB', stone: '#6B7685', red: '#A32D2D', redSoft: '#FFEAEA',
  greenXl: '#D8F3DC', purpleSoft: '#EDE9FE', purple: '#6B4FA0',
}

export default function PerfisFiscaisScreen({ onBack }) {
  const { perfis, loading, addPerfil, updatePerfil, deletePerfil } = usePerfisFiscais()
  const [editando,  setEditando]  = useState(null)  // null | 'novo' | perfil
  const [saving,    setSaving]    = useState(false)

  async function handleSave(campos) {
    setSaving(true)
    try {
      if (editando === 'novo') {
        await addPerfil(campos)
      } else {
        await updatePerfil(editando.id, campos)
      }
      setEditando(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(perfil) {
    if (!confirm(`Apagar o perfil "${perfil.nome}"? As localizações que o usavam voltam aos dados pessoais.`)) return
    setSaving(true)
    try {
      await deletePerfil(perfil.id)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(145deg,${G},${GM})`, padding: '14px 16px 22px', color: '#fff' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', cursor: 'pointer', marginBottom: 12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: .8, color: 'rgba(255,255,255,.65)', marginBottom: 4 }}>FATURAÇÃO</div>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Georgia,serif' }}>Perfis fiscais</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', marginTop: 4 }}>
          {perfis.length} perfil{perfis.length !== 1 ? 'is' : ''}
        </div>
      </div>

      <div style={{ padding: '14px 16px 0' }}>
        {/* Botão adicionar */}
        {editando !== 'novo' && (
          <button
            onClick={() => setEditando('novo')}
            style={{ width: '100%', padding: 12, borderRadius: 10, background: G, color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 14 }}
          >+ Adicionar perfil fiscal</button>
        )}

        {/* Form novo perfil inline */}
        {editando === 'novo' && (
          <div style={{ marginBottom: 14 }}>
            <PerfilFiscalForm saving={saving} onSave={handleSave} onCancel={() => setEditando(null)} />
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', color: C.slate, fontSize: 13, padding: 20 }}>A carregar...</div>
        )}

        {/* Lista de perfis */}
        {!loading && perfis.map(p => {
          const isEditandoEste = editando && editando !== 'novo' && editando.id === p.id
          const isCustom = !p.principal
          return (
            <div key={p.id} style={{
              background: C.white, border: `1px solid ${C.border}`,
              borderRadius: 14, marginBottom: 10, overflow: 'hidden',
              opacity: saving ? .6 : 1,
            }}>
              {isEditandoEste ? (
                <div style={{ padding: 14 }}>
                  <PerfilFiscalForm perfilExistente={p} saving={saving} onSave={handleSave} onCancel={() => setEditando(null)} />
                </div>
              ) : (
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{p.nome || p.nome_facturacao}</div>
                        {p.principal && (
                          <span style={{ fontSize: 9, background: C.greenXl, color: G, padding: '1px 7px', borderRadius: 4, fontWeight: 700 }}>PRINCIPAL</span>
                        )}
                      </div>
                      {p.nif && <div style={{ fontSize: 12, color: C.slate }}>NIF {p.nif}</div>}
                    </div>
                    <span style={{ fontSize: 18 }}>{isCustom ? '🏢' : '👤'}</span>
                  </div>

                  {p.nome_facturacao && (
                    <div style={{ fontSize: 12, color: C.slate, marginBottom: 2 }}>{p.nome_facturacao}</div>
                  )}
                  {p.morada_facturacao && (
                    <div style={{ fontSize: 12, color: C.slate, marginBottom: 8 }}>{p.morada_facturacao}</div>
                  )}
                  {p.iban && (
                    <div style={{ fontSize: 11, color: C.slate, fontFamily: 'monospace', marginBottom: 8 }}>{p.iban}</div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditando(p)} style={{
                      flex: 1, padding: '7px', borderRadius: 8, background: C.bg,
                      border: `1px solid ${C.border}`, fontSize: 12, fontWeight: 600, color: C.slate, cursor: 'pointer',
                    }}>Editar</button>
                    {!p.principal && (
                      <button onClick={() => handleDelete(p)} disabled={saving} style={{
                        padding: '7px 12px', borderRadius: 8, background: C.redSoft,
                        border: 'none', fontSize: 12, fontWeight: 600, color: C.red, cursor: 'pointer',
                      }}>🗑</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {!loading && perfis.length === 0 && (
          <div style={{ textAlign: 'center', color: C.slate, fontSize: 13, padding: 30 }}>
            Nenhum perfil fiscal criado ainda.
          </div>
        )}
      </div>
    </div>
  )
}
