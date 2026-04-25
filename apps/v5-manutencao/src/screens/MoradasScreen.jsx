import React, { useState } from 'react'
import { supa } from '../supa.js'
import { DEMO_PESSOA_ID } from '../lib/demo.js'
import { useImovelAtivo } from '../lib/ImovelAtivoContext.jsx'
import { usePerfisFiscais } from '../lib/PerfisFiscaisContext.jsx'
import { tipoImovelEmoji, tipoImovelLabel, formatarMorada } from '../lib/labels.js'
import PerfilFiscalForm from '../components/PerfilFiscalForm.jsx'

const G = '#1B4332'; const GM = '#2D6A4F'; const GL = '#52B788'
const C = {
  ink: '#0f172a', slate: '#64748b', border: '#e2e8f0', bg: '#f8fafc', white: '#fff',
  line: '#E5E7EB', stone: '#6B7685', red: '#A32D2D', redSoft: '#FFEAEA',
  greenXl: '#D8F3DC', purpleSoft: '#EDE9FE', purple: '#6B4FA0',
}

function scoreColor(s) {
  if (s >= 70) return { bg: '#D8F3DC', c: G }
  if (s >= 50) return { bg: '#FEF9C3', c: '#854F0B' }
  return { bg: '#FDE4DC', c: '#C0392B' }
}

function FaturacaoBadge({ perfil, onClick }) {
  const isCustom = !!perfil && !perfil.principal
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10,
      padding: '4px 10px', borderRadius: 6, cursor: 'pointer', border: 'none',
      background: isCustom ? C.purpleSoft : C.greenXl,
      color: isCustom ? C.purple : G,
    }}>
      <span style={{ fontSize: 11 }}>📋</span>
      <span style={{ fontSize: 10, fontWeight: 700 }}>
        {isCustom ? `Faturação: ${perfil.nome || perfil.nome_facturacao}` : `Faturação: ${perfil?.nome_facturacao || 'dados pessoais'}`}
      </span>
    </button>
  )
}

/* ─── Modal edição de faturação ─── */
function ModalFaturacao({ imovel, perfis, onClose, onSaved }) {
  const [opcao,          setOpcao]          = useState(imovel.perfil_fiscal_id ? 'custom' : 'pessoal')
  const [perfilSel,      setPerfilSel]      = useState(imovel.perfil_fiscal_id || '')
  const [showNovoForm,   setShowNovoForm]   = useState(false)
  const [saving,         setSaving]         = useState(false)
  const { addPerfil, refetch: refetchPerfis } = usePerfisFiscais()

  const perfisPessoal = perfis.filter(p => p.principal)
  const perfisExtra   = perfis.filter(p => !p.principal)
  const pessoal       = perfisPessoal[0]

  async function guardar() {
    setSaving(true)
    const novoId = opcao === 'pessoal' ? null : (perfilSel || null)
    await supa.from('localizacoes').update({ perfil_fiscal_id: novoId }).eq('id', imovel.id)
    setSaving(false)
    onSaved()
    onClose()
  }

  async function handleNovoPerfil(campos) {
    setSaving(true)
    try {
      const novo = await addPerfil(campos)
      setPerfilSel(novo.id)
      setOpcao('custom')
      setShowNovoForm(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900,
      background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-end',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width: '100%', maxWidth: 600, margin: '0 auto',
        background: C.white, borderRadius: '16px 16px 0 0', overflow: 'hidden',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, color: C.slate, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>FATURAÇÃO</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{imovel.nome}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: C.slate, cursor: 'pointer', padding: 4 }}>×</button>
        </div>

        {/* Scroll body */}
        <div style={{ overflowY: 'auto', padding: '16px', flex: 1 }}>
          {/* Info imóvel */}
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: C.slate }}>{tipoImovelLabel(imovel.tipo)}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{formatarMorada(imovel) || '(sem morada)'}</div>
          </div>

          {/* Opção pessoal */}
          <button onClick={() => setOpcao('pessoal')} style={{
            width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '12px 14px', borderRadius: 10, marginBottom: 8, cursor: 'pointer',
            background: opcao === 'pessoal' ? C.greenXl : C.bg,
            border: `2px solid ${opcao === 'pessoal' ? GL : C.border}`,
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
              border: `2px solid ${opcao === 'pessoal' ? G : C.slate}`,
              background: opcao === 'pessoal' ? G : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {opcao === 'pessoal' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Usar os meus dados</div>
              {pessoal && <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>{pessoal.nome_facturacao} · NIF {pessoal.nif}</div>}
            </div>
          </button>

          {/* Opção perfil custom */}
          <button onClick={() => setOpcao('custom')} style={{
            width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '12px 14px', borderRadius: 10, marginBottom: 4, cursor: 'pointer',
            background: opcao === 'custom' ? C.purpleSoft : C.bg,
            border: `2px solid ${opcao === 'custom' ? C.purple : C.border}`,
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
              border: `2px solid ${opcao === 'custom' ? C.purple : C.slate}`,
              background: opcao === 'custom' ? C.purple : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {opcao === 'custom' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
            </div>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Usar outro perfil fiscal</div>
              <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>Empresa, condomínio ou proprietário real</div>
            </div>
          </button>

          {/* Dropdown de perfis extra */}
          {opcao === 'custom' && (
            <div style={{ paddingLeft: 30, marginBottom: 8 }}>
              <select
                value={perfilSel}
                onChange={e => {
                  if (e.target.value === '__novo') { setShowNovoForm(true); return }
                  setPerfilSel(e.target.value)
                  setShowNovoForm(false)
                }}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8,
                  border: `1px solid ${C.border}`, fontSize: 13, background: C.white,
                  color: C.ink, marginTop: 6, boxSizing: 'border-box',
                }}
              >
                <option value="">— escolha um perfil —</option>
                {perfisExtra.map(p => (
                  <option key={p.id} value={p.id}>{p.nome} · {p.nif}</option>
                ))}
                <option value="__novo">+ Adicionar novo perfil fiscal</option>
              </select>
            </div>
          )}

          {/* Form inline para novo perfil */}
          {opcao === 'custom' && showNovoForm && (
            <div style={{ paddingLeft: 30, marginBottom: 8 }}>
              <PerfilFiscalForm
                saving={saving}
                onSave={handleNovoPerfil}
                onCancel={() => setShowNovoForm(false)}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px 28px', borderTop: `1px solid ${C.border}` }}>
          <button onClick={guardar} disabled={saving || (opcao === 'custom' && !perfilSel)} style={{
            width: '100%', padding: 13, borderRadius: 10, background: G,
            border: 'none', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer',
            opacity: (saving || (opcao === 'custom' && !perfilSel)) ? .5 : 1,
          }}>{saving ? 'A guardar...' : 'Guardar faturação'}</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Ecrã principal ─── */
export default function MoradasScreen({ onBack }) {
  const { imoveis, imovelAtivoId, setImovelAtivoId, refetch } = useImovelAtivo()
  const { perfis, refetch: refetchPerfis }                    = usePerfisFiscais()
  const [saving,    setSaving]    = useState(false)
  const [modalIm,   setModalIm]   = useState(null) // imóvel a editar faturação

  function getPerfilDoImovel(im) {
    if (!im.perfil_fiscal_id) return perfis.find(p => p.principal) || null
    return perfis.find(p => p.id === im.perfil_fiscal_id) || null
  }

  async function tornarPrincipal(id) {
    setSaving(true)
    await supa.from('localizacoes').update({ principal: false }).eq('pessoa_id', DEMO_PESSOA_ID)
    await supa.from('localizacoes').update({ principal: true  }).eq('id', id)
    await setImovelAtivoId(id)
    await refetch()
    setSaving(false)
  }

  async function apagarImovel(id) {
    if (!confirm('Apagar este imóvel permanentemente?')) return
    setSaving(true)
    await supa.from('localizacoes').update({ ativo: false }).eq('id', id)
    if (id === imovelAtivoId) {
      const proximo = imoveis.find(i => i.id !== id)
      if (proximo) await setImovelAtivoId(proximo.id)
    }
    await refetch()
    setSaving(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 32 }}>
      <div style={{ background: `linear-gradient(145deg,${G},${GM})`, padding: '14px 16px 22px', color: '#fff' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', cursor: 'pointer', marginBottom: 12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: .8, color: 'rgba(255,255,255,.65)', marginBottom: 4 }}>IMÓVEIS</div>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Georgia,serif' }}>Os meus imóveis</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', marginTop: 4 }}>
          {imoveis.length} imóvel{imoveis.length !== 1 ? 'is' : ''} · 1 principal
        </div>
      </div>

      <div style={{ padding: '14px 16px 0' }}>
        <button
          onClick={() => alert('Adicionar imóvel — form completo disponível Fase 3.4.')}
          style={{ width: '100%', padding: 12, borderRadius: 10, background: G, color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >+ Adicionar imóvel</button>
      </div>

      <div style={{ padding: '14px 16px 0', opacity: saving ? 0.6 : 1 }}>
        {imoveis.map(im => {
          const isPrincipal = im.id === imovelAtivoId
          const sc          = scoreColor(im.home_score ?? 0)
          const perfilFat   = getPerfilDoImovel(im)
          return (
            <div key={im.id} style={{
              background: C.white,
              border: isPrincipal ? `2px solid ${GL}` : `1px solid ${C.border}`,
              borderRadius: 14, padding: '14px 16px', marginBottom: 10,
              boxShadow: isPrincipal ? '0 2px 10px rgba(82,183,136,.15)' : '0 1px 3px rgba(0,0,0,.05)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 28 }}>{tipoImovelEmoji(im.tipo)}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{im.nome}</div>
                    {isPrincipal && (
                      <span style={{ fontSize: 9, background: C.greenXl, color: G, padding: '1px 7px', borderRadius: 4, fontWeight: 700 }}>PRINCIPAL</span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: sc.bg, color: sc.c }}>
                  Score {im.home_score ?? '—'}
                </span>
              </div>

              <div style={{ fontSize: 13, color: C.slate, marginBottom: 10 }}>{formatarMorada(im)}</div>

              {/* Badge faturação */}
              <FaturacaoBadge
                perfil={im.perfil_fiscal_id ? perfilFat : null}
                onClick={() => setModalIm(im)}
              />

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: C.bg, color: C.slate, border: `1px solid ${C.border}` }}>
                  {tipoImovelLabel(im.tipo)}
                </span>
                {im.tipologia && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: C.bg, color: C.slate, border: `1px solid ${C.border}` }}>
                    {im.tipologia}
                  </span>
                )}
                {im.created_at && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: C.bg, color: C.slate, border: `1px solid ${C.border}` }}>
                    Desde {new Date(im.created_at).getFullYear()}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setModalIm(im)} style={{
                  flex: 1, padding: '8px', borderRadius: 8, background: C.bg,
                  border: `1px solid ${C.border}`, fontSize: 12, fontWeight: 600, color: C.slate, cursor: 'pointer',
                }}>Editar faturação</button>
                {!isPrincipal && (
                  <>
                    <button onClick={() => tornarPrincipal(im.id)} disabled={saving} style={{
                      flex: 1, padding: '8px', borderRadius: 8, background: C.greenXl,
                      border: `1px solid ${GL}`, fontSize: 12, fontWeight: 600, color: G, cursor: 'pointer',
                    }}>Tornar principal</button>
                    <button onClick={() => apagarImovel(im.id)} disabled={saving} style={{
                      padding: '8px 12px', borderRadius: 8, background: C.redSoft,
                      border: 'none', fontSize: 12, fontWeight: 600, color: C.red, cursor: 'pointer',
                    }}>🗑</button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal faturação */}
      {modalIm && (
        <ModalFaturacao
          imovel={modalIm}
          perfis={perfis}
          onClose={() => setModalIm(null)}
          onSaved={async () => { await refetch(); await refetchPerfis() }}
        />
      )}
    </div>
  )
}
