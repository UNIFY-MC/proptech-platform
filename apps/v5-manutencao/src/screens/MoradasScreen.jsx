import React, { useState, useRef } from 'react'
import { supa } from '../supa.js'
import { DEMO_PESSOA_ID } from '../lib/demo.js'
import { useImovelAtivo } from '../lib/ImovelAtivoContext.jsx'
import { usePerfisFiscais } from '../lib/PerfisFiscaisContext.jsx'
import { tipoImovelEmoji, tipoImovelLabel, formatarMorada, moradaCurta, categoriaEmoji, isReadOnly, isExternalUse, externalAppLabel, usoLabel } from '../lib/labels.js'
import PerfilFiscalForm from '../components/PerfilFiscalForm.jsx'
import MapaPicker from '../components/MapaPicker.jsx'
import { pointToCoords, coordsToPoint, geocodificarMorada } from '../lib/geocoding.js'
import ImovelWizard from '../components/ImovelWizard.jsx'

const G = '#1B4332'; const GM = '#2D6A4F'; const GL = '#52B788'
const C = {
  ink: '#0f172a', slate: '#64748b', border: '#e2e8f0', bg: '#f8fafc', white: '#fff',
  line: '#E5E7EB', stone: '#6B7685', red: '#A32D2D', redSoft: '#FFEAEA',
  greenXl: '#D8F3DC', purpleSoft: '#EDE9FE', purple: '#6B4FA0',
  amber: '#FAEEDA', amberDk: '#854F0B',
}

function scoreColor(s) {
  if (s >= 70) return { bg: '#D8F3DC', c: G }
  if (s >= 50) return { bg: '#FEF9C3', c: '#854F0B' }
  return { bg: '#FDE4DC', c: '#C0392B' }
}

const INP = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: `1px solid ${C.border}`, fontSize: 13, background: C.white,
  color: C.ink, boxSizing: 'border-box',
}

const TIPOLOGIAS = ['T0','T1','T2','T3','T4','T5','V2','V3','V4','V5','V6','Moradia','Outro']
const TIPOS_IMOVEL = [
  { v: 'habitacao',         l: 'Casa / Habitação' },
  { v: 'segunda_habitacao', l: 'Casa secundária / Férias' },
  { v: 'condominio',        l: 'Condomínio' },
  { v: 'empresa',           l: 'Escritório / Empresa' },
]

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: C.slate,
      textTransform: 'uppercase', marginBottom: 8, marginTop: 18 }}>
      {children}
    </div>
  )
}

export function ModalEditarImovel({ imovel, onClose, onSaved }) {
  const initialCoords = pointToCoords(imovel.coords)
  const [form, setForm] = useState({
    nome:           imovel.nome           || '',
    tipo:           imovel.tipo           || 'habitacao',
    rua:            imovel.rua            || '',
    numero:         imovel.numero         || '',
    andar:          imovel.andar          || '',
    codigo_postal:  imovel.codigo_postal  || '',
    cidade:         imovel.cidade         || '',
    distrito:       imovel.distrito       || '',
    pais:           imovel.pais           || 'PT',
    tipologia:      imovel.tipologia      || '',
    area_m2:        imovel.area_m2        != null ? String(imovel.area_m2)         : '',
    ano_construcao: imovel.ano_construcao != null ? String(imovel.ano_construcao)  : '',
    num_quartos:    imovel.num_quartos    != null ? String(imovel.num_quartos)     : '',
    num_wcs:        imovel.num_wcs        != null ? String(imovel.num_wcs)         : '',
    num_pisos:      imovel.num_pisos      != null ? String(imovel.num_pisos)       : '',
    notas:          imovel.notas          || '',
    foto_principal_url: imovel.foto_principal_url || '',
  })
  const [coords,    setCoords]    = useState(initialCoords)
  const [saving,    setSaving]    = useState(false)
  const [uploading, setUploading] = useState(false)
  const [geoBtn,    setGeoBtn]    = useState(false)
  const fileRef = useRef(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function geocodificarForm() {
    const q = [form.rua, form.numero, form.codigo_postal, form.cidade, 'Portugal'].filter(Boolean).join(' ')
    if (!q.trim()) return
    setGeoBtn(true)
    const r = await geocodificarMorada(q)
    setGeoBtn(false)
    if (r) setCoords({ lat: r.lat, lng: r.lng })
  }

  async function handleFotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext  = file.name.split('.').pop() || 'jpg'
    const path = `${imovel.id}/${Date.now()}.${ext}`
    const { data, error } = await supa.storage.from('imoveis-fotos')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (!error) {
      const url = supa.storage.from('imoveis-fotos').getPublicUrl(data.path).data.publicUrl
      set('foto_principal_url', url)
    }
    setUploading(false)
  }

  async function guardar() {
    setSaving(true)
    await supa.from('localizacoes').update({
      nome:            form.nome,
      tipo:            form.tipo,
      rua:             form.rua             || null,
      numero:          form.numero          || null,
      andar:           form.andar           || null,
      codigo_postal:   form.codigo_postal   || null,
      cidade:          form.cidade          || null,
      distrito:        form.distrito        || null,
      pais:            form.pais            || 'PT',
      tipologia:       form.tipologia       || null,
      area_m2:         form.area_m2         ? Number(form.area_m2)         : null,
      ano_construcao:  form.ano_construcao  ? Number(form.ano_construcao)  : null,
      num_quartos:     form.num_quartos     ? Number(form.num_quartos)     : null,
      num_wcs:         form.num_wcs         ? Number(form.num_wcs)         : null,
      num_pisos:       form.num_pisos       ? Number(form.num_pisos)       : null,
      notas:           form.notas           || null,
      foto_principal_url: form.foto_principal_url || null,
      coords:          coordsToPoint(coords?.lat, coords?.lng),
    }).eq('id', imovel.id)
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 950,
      background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width: '100%', maxWidth: 600, margin: '0 auto',
        background: C.white, borderRadius: '16px 16px 0 0',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 10, color: C.slate, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>EDITAR IMÓVEL</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{imovel.nome}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: C.slate, cursor: 'pointer', padding: 4 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '4px 16px 16px', flex: 1 }}>

          {/* Foto */}
          <SectionLabel>Foto principal</SectionLabel>
          <div style={{ marginBottom: 4 }}>
            {form.foto_principal_url ? (
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <img src={form.foto_principal_url} alt="foto"
                  style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 10, border: `1px solid ${C.border}` }}/>
                <button onClick={() => set('foto_principal_url', '')} style={{
                  position: 'absolute', top: 6, right: 6,
                  background: 'rgba(0,0,0,.6)', color: '#fff', border: 'none',
                  borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer',
                }}>✕ Remover</button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  height: 100, borderRadius: 10, border: `2px dashed ${C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: 6, cursor: 'pointer',
                  background: C.bg, marginBottom: 8,
                }}>
                <span style={{ fontSize: 28 }}>📷</span>
                <span style={{ fontSize: 12, color: C.slate }}>
                  {uploading ? 'A carregar...' : 'Toque para adicionar foto'}
                </span>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }} onChange={handleFotoUpload}/>
            {form.foto_principal_url && (
              <button onClick={() => fileRef.current?.click()} style={{
                fontSize: 11, color: G, background: C.greenXl, border: 'none',
                borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontWeight: 600,
              }}>📷 Mudar foto</button>
            )}
          </div>

          {/* Identificação */}
          <SectionLabel>Identificação</SectionLabel>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: C.slate, marginBottom: 3, display: 'block' }}>Nome / Label</label>
            <input style={INP} value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Casa Principal"/>
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.slate, marginBottom: 3, display: 'block' }}>Tipo</label>
            <select style={INP} value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              {TIPOS_IMOVEL.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>

          {/* Morada */}
          <SectionLabel>Morada</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: C.slate, marginBottom: 3, display: 'block' }}>Rua / Avenida</label>
              <input style={INP} value={form.rua} onChange={e => set('rua', e.target.value)} placeholder="R. Palmira Bastos"/>
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.slate, marginBottom: 3, display: 'block' }}>Número</label>
              <input style={INP} value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="2"/>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: C.slate, marginBottom: 3, display: 'block' }}>Andar / Fracção</label>
              <input style={INP} value={form.andar} onChange={e => set('andar', e.target.value)} placeholder="2.º Dto"/>
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.slate, marginBottom: 3, display: 'block' }}>Código Postal</label>
              <input style={INP} value={form.codigo_postal} onChange={e => set('codigo_postal', e.target.value)} placeholder="3000-123"/>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: C.slate, marginBottom: 3, display: 'block' }}>Cidade</label>
              <input style={INP} value={form.cidade} onChange={e => set('cidade', e.target.value)} placeholder="Coimbra"/>
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.slate, marginBottom: 3, display: 'block' }}>Distrito</label>
              <input style={INP} value={form.distrito} onChange={e => set('distrito', e.target.value)} placeholder="Coimbra"/>
            </div>
          </div>

          {/* GPS */}
          <SectionLabel>GPS</SectionLabel>
          <MapaPicker
            coords={coords}
            onCoordsChange={setCoords}
            onAddressFound={addr => {
              if (addr.rua   && !form.rua)            set('rua',           addr.rua)
              if (addr.numero && !form.numero)         set('numero',        addr.numero)
              if (addr.codigo_postal && !form.codigo_postal) set('codigo_postal', addr.codigo_postal)
              if (addr.cidade && !form.cidade)         set('cidade',        addr.cidade)
              if (addr.distrito && !form.distrito)     set('distrito',      addr.distrito)
            }}
          />
          <button
            type="button"
            onClick={geocodificarForm}
            disabled={geoBtn}
            style={{
              marginTop: 6, fontSize: 11, color: G, background: C.greenXl,
              border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontWeight: 600,
              opacity: geoBtn ? 0.6 : 1,
            }}
          >{geoBtn ? '⏳ A geocodificar...' : '🔍 Geocodificar morada'}</button>

          {/* Características */}
          <SectionLabel>Características</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: C.slate, marginBottom: 3, display: 'block' }}>Tipologia</label>
              <select style={INP} value={form.tipologia} onChange={e => set('tipologia', e.target.value)}>
                <option value="">—</option>
                {TIPOLOGIAS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.slate, marginBottom: 3, display: 'block' }}>Área útil (m²)</label>
              <input style={INP} type="number" min="1" max="9999" value={form.area_m2} onChange={e => set('area_m2', e.target.value)} placeholder="85"/>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: C.slate, marginBottom: 3, display: 'block' }}>Quartos</label>
              <input style={INP} type="number" min="0" max="20" value={form.num_quartos} onChange={e => set('num_quartos', e.target.value)} placeholder="2"/>
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.slate, marginBottom: 3, display: 'block' }}>WCs</label>
              <input style={INP} type="number" min="0" max="10" value={form.num_wcs} onChange={e => set('num_wcs', e.target.value)} placeholder="1"/>
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.slate, marginBottom: 3, display: 'block' }}>Pisos</label>
              <input style={INP} type="number" min="1" max="10" value={form.num_pisos} onChange={e => set('num_pisos', e.target.value)} placeholder="1"/>
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.slate, marginBottom: 3, display: 'block' }}>Ano</label>
              <input style={INP} type="number" min="1800" max="2030" value={form.ano_construcao} onChange={e => set('ano_construcao', e.target.value)} placeholder="1985"/>
            </div>
          </div>

          {/* Notas */}
          <SectionLabel>Notas</SectionLabel>
          <textarea
            style={{ ...INP, resize: 'vertical', minHeight: 72 }}
            value={form.notas}
            onChange={e => set('notas', e.target.value)}
            placeholder="Notas de acesso, código da porta, informações úteis para o técnico..."
          />
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px 28px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button onClick={guardar} disabled={saving || !form.nome.trim()} style={{
            width: '100%', padding: 13, borderRadius: 10, background: G,
            border: 'none', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer',
            opacity: (saving || !form.nome.trim()) ? .5 : 1,
          }}>{saving ? 'A guardar...' : 'Guardar imóvel'}</button>
        </div>
      </div>
    </div>
  )
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
export default function MoradasScreen({ onBack, onNavigateDetalhe }) {
  const { imoveis, imovelAtivoId, setImovelAtivoId, refetch } = useImovelAtivo()
  const { perfis, refetch: refetchPerfis }                    = usePerfisFiscais()
  const [saving,      setSaving]      = useState(false)
  const [modalIm,     setModalIm]     = useState(null) // imóvel a editar faturação
  const [modalEditar, setModalEditar] = useState(null) // imóvel a editar completo
  const [showWizard,  setShowWizard]  = useState(false)

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
          onClick={() => setShowWizard(true)}
          style={{ width: '100%', padding: 12, borderRadius: 10, background: G, color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >+ Adicionar imóvel</button>
      </div>

      <div style={{ padding: '14px 16px 0', opacity: saving ? 0.6 : 1 }}>
        {imoveis.map(im => {
          const isPrincipal = im.id === imovelAtivoId
          const sc          = scoreColor(im.home_score ?? 0)
          const perfilFat   = getPerfilDoImovel(im)
          const readOnly    = isReadOnly(im)
          const extUse      = isExternalUse(im)
          const extApp      = externalAppLabel(im)
          return (
            <div key={im.id} style={{
              background: C.white,
              border: isPrincipal ? `2px solid ${GL}` : `1px solid ${C.border}`,
              borderRadius: 14, overflow: 'hidden', marginBottom: 10,
              boxShadow: isPrincipal ? '0 2px 10px rgba(82,183,136,.15)' : '0 1px 3px rgba(0,0,0,.05)',
            }}>
              {/* Banner V2 sync */}
              {readOnly && (
                <div style={{ background: C.purpleSoft, padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: C.purple, fontWeight: 600 }}>🔗 Sincronizado da V2 · gerido lá</span>
                  <button onClick={() => alert('TODO: link para V2')} style={{ fontSize: 10, color: C.purple, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Abrir na V2 →</button>
                </div>
              )}
              {/* Banner arrendado LT */}
              {!readOnly && extUse && (
                <div style={{ background: C.amber, padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: C.amberDk, fontWeight: 600 }}>🔗 Arrendamento gerido na {extApp}</span>
                  <button onClick={() => alert(`TODO: link para ${extApp}`)} style={{ fontSize: 10, color: C.amberDk, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Abrir na {extApp} →</button>
                </div>
              )}

              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div
                    onClick={() => onNavigateDetalhe?.(im.id)}
                    style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: onNavigateDetalhe ? 'pointer' : 'default', flex: 1 }}>
                    <span style={{ fontSize: 28 }}>{categoriaEmoji(im)}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{im.nome} {onNavigateDetalhe && <span style={{ fontSize: 12, color: C.slate }}>›</span>}</div>
                      {isPrincipal && (
                        <span style={{ fontSize: 9, background: C.greenXl, color: G, padding: '1px 7px', borderRadius: 4, fontWeight: 700 }}>PRINCIPAL</span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: sc.bg, color: sc.c }}>
                    Score {im.home_score ?? '—'}
                  </span>
                </div>

                {im.foto_principal_url && (
                  <div style={{ margin: '0 0 10px', borderRadius: 8, overflow: 'hidden', height: 100 }}>
                    <img src={im.foto_principal_url} alt="foto" style={{ width: '100%', height: 100, objectFit: 'cover' }}/>
                  </div>
                )}

                <div style={{ fontSize: 13, color: C.slate, marginBottom: 10 }}>{moradaCurta(im) || formatarMorada(im)}</div>

                {/* Badge faturação — só se não read-only */}
                {!readOnly && (
                  <FaturacaoBadge
                    perfil={im.perfil_fiscal_id ? perfilFat : null}
                    onClick={() => setModalIm(im)}
                  />
                )}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {im.tipologia && (
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: C.bg, color: C.slate, border: `1px solid ${C.border}` }}>
                      {im.tipologia}
                    </span>
                  )}
                  {im.uso && (
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: C.bg, color: C.slate, border: `1px solid ${C.border}` }}>
                      {usoLabel(im)}
                    </span>
                  )}
                  {im.area_m2 && (
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: C.bg, color: C.slate, border: `1px solid ${C.border}` }}>
                      {im.area_m2} m²
                    </span>
                  )}
                  {im.num_quartos != null && (
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: C.bg, color: C.slate, border: `1px solid ${C.border}` }}>
                      🛏 {im.num_quartos}
                    </span>
                  )}
                  {readOnly && (
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: C.purpleSoft, color: C.purple, border: `1px solid #c4b5fd` }}>
                      READ-ONLY
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {!readOnly && (
                    <button onClick={() => setModalEditar(im)} style={{
                      flex: 1, padding: '8px', borderRadius: 8, background: G,
                      border: 'none', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer',
                    }}>Editar imóvel</button>
                  )}
                  {!readOnly && (
                    <button onClick={() => setModalIm(im)} style={{
                      flex: 1, padding: '8px', borderRadius: 8, background: C.bg,
                      border: `1px solid ${C.border}`, fontSize: 12, fontWeight: 600, color: C.slate, cursor: 'pointer',
                    }}>Faturação</button>
                  )}
                  {!isPrincipal && !readOnly && (
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

      {/* Modal editar imóvel completo */}
      {modalEditar && (
        <ModalEditarImovel
          imovel={modalEditar}
          onClose={() => setModalEditar(null)}
          onSaved={async () => { await refetch() }}
        />
      )}

      {/* Wizard criação imóvel */}
      {showWizard && (
        <ImovelWizard
          onClose={() => setShowWizard(false)}
          onSaved={() => setShowWizard(false)}
        />
      )}
    </div>
  )
}
