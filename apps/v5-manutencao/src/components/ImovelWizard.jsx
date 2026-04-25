import React, { useState, useRef } from 'react'
import { supa } from '../supa.js'
import { DEMO_PESSOA_ID } from '../lib/demo.js'
import { useImovelAtivo } from '../lib/ImovelAtivoContext.jsx'
import { usePerfisFiscais } from '../lib/PerfisFiscaisContext.jsx'
import MapaPicker from './MapaPicker.jsx'
import { coordsToPoint, geocodificarMorada } from '../lib/geocoding.js'
import {
  CATEGORIAS, TIPOLOGIAS, USOS,
  SISTEMAS_DEFAULT, SISTEMAS_POR_USO, SISTEMAS_LABELS, AMENITIES_LABELS,
} from '../lib/categorias.js'

const G  = '#1B4332'
const GM = '#2D6A4F'
const GL = '#52B788'
const C  = {
  ink: '#0f172a', slate: '#64748b', border: '#e2e8f0', bg: '#f8fafc', white: '#fff',
  line: '#E5E7EB', stone: '#6B7685', greenXl: '#D8F3DC', amber: '#FAEEDA', amberDk: '#854F0B',
  red: '#A32D2D', redSoft: '#FFEAEA', purpleSoft: '#EDE9FE', purple: '#6B4FA0',
}
const INP = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: `1px solid ${C.border}`, fontSize: 13, background: C.white,
  color: C.ink, boxSizing: 'border-box',
}

const CATEGORIA_TO_TIPO = {
  habitacional: 'habitacao', comercial: 'empresa',
  industrial: 'empresa', rural: 'habitacao', condominio: 'condominio',
}
const DEFAULT_USO = {
  habitacional: 'residencia_principal', comercial: 'actividade_propria',
  industrial: 'actividade_propria', rural: 'actividade_propria', condominio: 'gestao_terceiros',
}

function SectionLabel({ children, mt = 16 }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: C.slate,
      textTransform: 'uppercase', marginBottom: 8, marginTop: mt }}>
      {children}
    </div>
  )
}

export default function ImovelWizard({ onClose, onSaved }) {
  const { refetch } = useImovelAtivo()
  const { perfis }  = usePerfisFiscais()

  const [step,     setStep]     = useState(1)
  const [saving,   setSaving]   = useState(false)
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [geoBtn,   setGeoBtn]   = useState(false)
  const fileRef = useRef(null)

  // Form state
  const [categoria,  setCategoria]  = useState(null)
  const [tipologia,  setTipologia]  = useState('')
  const [uso,        setUso]        = useState('')
  const [coords,     setCoords]     = useState(null)
  const [form, setForm] = useState({
    nome: '', rua: '', numero: '', andar: '',
    codigo_postal: '', cidade: '', distrito: '', pais: 'PT',
    area_m2: '', ano_construcao: '', num_quartos: '', num_wcs: '', num_pisos: '',
    notas: '',
  })
  const [sistemas,   setSistemas]   = useState([])
  const [amenities,  setAmenities]  = useState({})
  const [perfilOpc,  setPerfilOpc]  = useState('pessoal')
  const [perfilId,   setPerfilId]   = useState('')
  const [principal,  setPrincipal]  = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function selectCategoria(cat) {
    setCategoria(cat)
    setUso(DEFAULT_USO[cat] || '')
    setSistemas([...(SISTEMAS_DEFAULT[cat] || []), ...(SISTEMAS_POR_USO[DEFAULT_USO[cat]] || [])])
    setStep(2)
  }

  function toggleSistema(s) {
    setSistemas(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }
  function toggleAmenity(k) {
    setAmenities(prev => ({ ...prev, [k]: !prev[k] }))
  }

  async function geocodificarForm() {
    const q = [form.rua, form.numero, form.codigo_postal, form.cidade, 'Portugal'].filter(Boolean).join(' ')
    if (!q.trim()) return
    setGeoBtn(true)
    const r = await geocodificarMorada(q)
    setGeoBtn(false)
    if (r) setCoords({ lat: r.lat, lng: r.lng })
  }

  async function guardar() {
    if (!form.nome.trim()) return
    setSaving(true)
    try {
      const payload = {
        pessoa_id:        DEMO_PESSOA_ID,
        nome:             form.nome.trim(),
        categoria,
        tipo:             CATEGORIA_TO_TIPO[categoria] || 'habitacao',
        tipologia:        tipologia || null,
        uso:              uso || null,
        rua:              form.rua             || null,
        numero:           form.numero          || null,
        andar:            form.andar           || null,
        codigo_postal:    form.codigo_postal   || null,
        cidade:           form.cidade          || null,
        distrito:         form.distrito        || null,
        pais:             form.pais            || 'PT',
        area_m2:          form.area_m2         ? Number(form.area_m2)        : null,
        ano_construcao:   form.ano_construcao  ? Number(form.ano_construcao) : null,
        num_quartos:      form.num_quartos     ? Number(form.num_quartos)    : null,
        num_wcs:          form.num_wcs         ? Number(form.num_wcs)        : null,
        num_pisos:        form.num_pisos       ? Number(form.num_pisos)      : null,
        coords:           coordsToPoint(coords?.lat, coords?.lng),
        sistemas_geridos: sistemas,
        amenities,
        notas:            form.notas           || null,
        principal,
        ativo:            true,
        origem:           'v5_cliente',
        home_score:       50,
        perfil_fiscal_id: perfilOpc === 'custom' && perfilId ? perfilId : null,
      }

      const { data, error } = await supa.from('localizacoes').insert(payload).select('id').single()
      if (error) throw error

      // Upload foto se seleccionada
      if (fotoFile && data?.id) {
        const ext  = fotoFile.name.split('.').pop() || 'jpg'
        const path = `${data.id}/${Date.now()}.${ext}`
        const { data: upData, error: upErr } = await supa.storage.from('imoveis-fotos')
          .upload(path, fotoFile, { upsert: true, contentType: fotoFile.type })
        if (!upErr && upData) {
          const url = supa.storage.from('imoveis-fotos').getPublicUrl(upData.path).data.publicUrl
          await supa.from('localizacoes').update({ foto_principal_url: url }).eq('id', data.id)
        }
      }

      await refetch()
      onSaved?.()
      onClose?.()
    } catch (e) {
      console.error('Erro ao criar imóvel:', e)
      alert('Erro ao guardar. Tenta novamente.')
    } finally {
      setSaving(false)
    }
  }

  const perfisExtra = perfis.filter(p => !p.principal)
  const pessoal     = perfis.find(p => p.principal)

  // Usos filtrados pela categoria seleccionada
  const usosDisponiveis = Object.entries(USOS).filter(([, u]) =>
    u.categorias.includes(categoria)
  )

  // Sistemas disponíveis: todos os do SISTEMAS_LABELS
  const todosSistemas = Object.keys(SISTEMAS_LABELS)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 950,
      background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end',
    }} onClick={e => { if (e.target === e.currentTarget) onClose?.() }}>
      <div style={{
        width: '100%', maxWidth: 600, margin: '0 auto',
        background: C.white, borderRadius: '16px 16px 0 0',
        maxHeight: '94vh', display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          background: `linear-gradient(145deg,${G},${GM})`,
          padding: '14px 16px', borderRadius: '16px 16px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            {step > 1 && (
              <div onClick={() => setStep(s => s - 1)}
                style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', cursor: 'pointer', marginBottom: 2 }}>
                ← Voltar
              </div>
            )}
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: 'rgba(255,255,255,.65)' }}>
              ADICIONAR IMÓVEL · {step}/3
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'Georgia,serif', color: '#fff', marginTop: 2 }}>
              {step === 1 ? 'Que tipo de imóvel?' :
               step === 2 ? `${CATEGORIAS[categoria]?.emoji} Detalhes` :
               `${CATEGORIAS[categoria]?.emoji} Sistemas e finalização`}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff',
            fontSize: 18, width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 16px 8px' }}>

          {/* ── STEP 1 — Categoria ───────────────────────────────────── */}
          {step === 1 && (
            <div>
              {Object.entries(CATEGORIAS).filter(([, c]) => c.criavel).map(([key, cat]) => (
                <button key={key} onClick={() => selectCategoria(key)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 12, marginBottom: 8, cursor: 'pointer',
                  background: C.bg, border: `1px solid ${C.border}`, textAlign: 'left',
                }}>
                  <span style={{ fontSize: 28, flexShrink: 0 }}>{cat.emoji}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{cat.label}</div>
                    <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>{cat.descricao}</div>
                  </div>
                </button>
              ))}

              <div style={{
                background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
                padding: '10px 14px', marginTop: 8, fontSize: 12, color: C.slate,
              }}>
                ⓘ Os teus condomínios são geridos na V2 e aparecem aqui automaticamente.
              </div>
            </div>
          )}

          {/* ── STEP 2 — Tipologia + uso + morada + GPS ──────────────── */}
          {step === 2 && categoria && (
            <div>
              {/* Tipologia */}
              <SectionLabel mt={0}>Tipologia</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                {(TIPOLOGIAS[categoria] || []).map(t => (
                  <button key={t} onClick={() => setTipologia(tipologia === t ? '' : t)} style={{
                    padding: '5px 12px', borderRadius: 20, border: `1px solid ${tipologia === t ? GL : C.border}`,
                    background: tipologia === t ? C.greenXl : C.bg, fontSize: 12, fontWeight: 600,
                    color: tipologia === t ? G : C.stone, cursor: 'pointer',
                  }}>{t}</button>
                ))}
              </div>

              {/* Uso */}
              <SectionLabel>Como vais usar?</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {usosDisponiveis.map(([key, u]) => (
                  <div key={key}>
                    <button onClick={() => {
                      setUso(key)
                      const extra = SISTEMAS_POR_USO[key] || []
                      const base  = SISTEMAS_DEFAULT[categoria] || []
                      const merged = [...new Set([...base, ...extra])]
                      setSistemas(merged)
                    }} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                      background: uso === key ? C.greenXl : C.bg,
                      border: `1.5px solid ${uso === key ? GL : C.border}`,
                    }}>
                      <span style={{ fontSize: 18 }}>{u.emoji}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{u.label}</span>
                      {uso === key && <span style={{ marginLeft: 'auto', color: GL, fontWeight: 700 }}>✓</span>}
                    </button>
                    {uso === key && u.external && (
                      <div style={{ background: C.amber, border: `1px solid #e9c67a`, borderRadius: 8,
                        padding: '7px 12px', fontSize: 12, color: C.amberDk, marginTop: 4 }}>
                        ⚠️ {u.aviso}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Detalhes numéricos */}
              <SectionLabel>Características</SectionLabel>
              {categoria === 'habitacional' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                  {[['num_quartos','🛏 Quartos'],['num_wcs','🚿 WCs'],['num_pisos','Pisos']].map(([k,l]) => (
                    <div key={k}>
                      <label style={{ fontSize: 10, color: C.slate, marginBottom: 3, display: 'block' }}>{l}</label>
                      <input style={INP} type="number" min="0" max="20" value={form[k]}
                        onChange={e => set(k, e.target.value)} placeholder="—"/>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 10, color: C.slate, marginBottom: 3, display: 'block' }}>Área útil (m²)</label>
                  <input style={INP} type="number" min="1" value={form.area_m2}
                    onChange={e => set('area_m2', e.target.value)} placeholder="85"/>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: C.slate, marginBottom: 3, display: 'block' }}>Ano construção</label>
                  <input style={INP} type="number" min="1800" max="2030" value={form.ano_construcao}
                    onChange={e => set('ano_construcao', e.target.value)} placeholder="1985"/>
                </div>
              </div>

              {/* Identificação */}
              <SectionLabel>Identificação</SectionLabel>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 10, color: C.slate, marginBottom: 3, display: 'block' }}>Nome / label <span style={{ color: C.red }}>*</span></label>
                <input style={{ ...INP, borderColor: form.nome.trim() ? C.border : C.red }}
                  value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Casa Coimbra"/>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={{ fontSize: 10, color: C.slate, marginBottom: 3, display: 'block' }}>Rua</label>
                  <input style={INP} value={form.rua} onChange={e => set('rua', e.target.value)} placeholder="R. Palmira Bastos"/>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: C.slate, marginBottom: 3, display: 'block' }}>Número</label>
                  <input style={INP} value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="2"/>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={{ fontSize: 10, color: C.slate, marginBottom: 3, display: 'block' }}>Cód. Postal</label>
                  <input style={INP} value={form.codigo_postal} onChange={e => set('codigo_postal', e.target.value)} placeholder="3000-123"/>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: C.slate, marginBottom: 3, display: 'block' }}>Cidade</label>
                  <input style={INP} value={form.cidade} onChange={e => set('cidade', e.target.value)} placeholder="Coimbra"/>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, color: C.slate, marginBottom: 3, display: 'block' }}>Distrito</label>
                <input style={INP} value={form.distrito} onChange={e => set('distrito', e.target.value)} placeholder="Coimbra"/>
              </div>

              {/* GPS */}
              <SectionLabel>GPS</SectionLabel>
              <MapaPicker
                coords={coords}
                onCoordsChange={setCoords}
                onAddressFound={addr => {
                  if (addr.rua           && !form.rua)           set('rua',           addr.rua)
                  if (addr.numero        && !form.numero)        set('numero',        addr.numero)
                  if (addr.codigo_postal && !form.codigo_postal) set('codigo_postal', addr.codigo_postal)
                  if (addr.cidade        && !form.cidade)        set('cidade',        addr.cidade)
                  if (addr.distrito      && !form.distrito)      set('distrito',      addr.distrito)
                }}
              />
              <button type="button" onClick={geocodificarForm} disabled={geoBtn} style={{
                marginTop: 6, fontSize: 11, color: G, background: C.greenXl,
                border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontWeight: 600,
                opacity: geoBtn ? 0.6 : 1,
              }}>{geoBtn ? '⏳ A geocodificar...' : '🔍 Geocodificar morada'}</button>
            </div>
          )}

          {/* ── STEP 3 — Sistemas + amenities + foto + faturação ─────── */}
          {step === 3 && categoria && (
            <div>
              {/* Sistemas */}
              <SectionLabel mt={0}>O que vais querer gerir aqui?</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {todosSistemas.map(s => (
                  <label key={s} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                    background: sistemas.includes(s) ? C.greenXl : C.bg,
                    border: `1px solid ${sistemas.includes(s) ? GL : C.border}`,
                  }}>
                    <input type="checkbox" checked={sistemas.includes(s)}
                      onChange={() => toggleSistema(s)}
                      style={{ width: 14, height: 14, accentColor: G, flexShrink: 0 }}/>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>
                      {SISTEMAS_LABELS[s]}
                    </span>
                  </label>
                ))}
              </div>

              {/* Amenities */}
              <SectionLabel>Características</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {Object.entries(AMENITIES_LABELS).map(([k, l]) => (
                  <label key={k} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                    background: amenities[k] ? C.greenXl : C.bg,
                    border: `1px solid ${amenities[k] ? GL : C.border}`,
                  }}>
                    <input type="checkbox" checked={!!amenities[k]}
                      onChange={() => toggleAmenity(k)}
                      style={{ width: 13, height: 13, accentColor: G, flexShrink: 0 }}/>
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.ink }}>{l}</span>
                  </label>
                ))}
              </div>

              {/* Faturação */}
              <SectionLabel>Faturação</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button onClick={() => setPerfilOpc('pessoal')} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
                  cursor: 'pointer', background: perfilOpc === 'pessoal' ? C.greenXl : C.bg,
                  border: `1.5px solid ${perfilOpc === 'pessoal' ? GL : C.border}`,
                }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${perfilOpc === 'pessoal' ? G : C.slate}`,
                    background: perfilOpc === 'pessoal' ? G : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {perfilOpc === 'pessoal' && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }}/>}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Usar os meus dados</div>
                    {pessoal && <div style={{ fontSize: 11, color: C.slate }}>{pessoal.nome_facturacao} · NIF {pessoal.nif}</div>}
                  </div>
                </button>

                {perfisExtra.length > 0 && (
                  <div>
                    <button onClick={() => setPerfilOpc('custom')} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
                      cursor: 'pointer', background: perfilOpc === 'custom' ? C.purpleSoft : C.bg,
                      border: `1.5px solid ${perfilOpc === 'custom' ? C.purple : C.border}`,
                    }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                        border: `2px solid ${perfilOpc === 'custom' ? C.purple : C.slate}`,
                        background: perfilOpc === 'custom' ? C.purple : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {perfilOpc === 'custom' && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }}/>}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, textAlign: 'left' }}>Usar outro perfil fiscal</div>
                    </button>
                    {perfilOpc === 'custom' && (
                      <select value={perfilId} onChange={e => setPerfilId(e.target.value)} style={{ ...INP, marginTop: 6 }}>
                        <option value="">— escolha um perfil —</option>
                        {perfisExtra.map(p => <option key={p.id} value={p.id}>{p.nome} · {p.nif}</option>)}
                      </select>
                    )}
                  </div>
                )}
              </div>

              {/* Foto */}
              <SectionLabel>Foto principal (opcional)</SectionLabel>
              {fotoPreview ? (
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <img src={fotoPreview} alt="preview"
                    style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 10, border: `1px solid ${C.border}` }}/>
                  <button onClick={() => { setFotoFile(null); setFotoPreview(null) }} style={{
                    position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.6)',
                    color: '#fff', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer',
                  }}>✕ Remover</button>
                </div>
              ) : (
                <div onClick={() => fileRef.current?.click()} style={{
                  height: 90, borderRadius: 10, border: `2px dashed ${C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: 6, cursor: 'pointer', background: C.bg, marginBottom: 8,
                }}>
                  <span style={{ fontSize: 26 }}>📷</span>
                  <span style={{ fontSize: 12, color: C.slate }}>Toque para adicionar foto</span>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  setFotoFile(f)
                  setFotoPreview(URL.createObjectURL(f))
                }}/>

              {/* Notas */}
              <SectionLabel>Notas</SectionLabel>
              <textarea style={{ ...INP, resize: 'vertical', minHeight: 64 }}
                value={form.notas} onChange={e => set('notas', e.target.value)}
                placeholder="Código da porta, notas de acesso, informações úteis..."/>

              {/* Tornar principal */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10, marginTop: 12,
                padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                background: principal ? C.greenXl : C.bg,
                border: `1px solid ${principal ? GL : C.border}`,
              }}>
                <input type="checkbox" checked={principal} onChange={e => setPrincipal(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: G, flexShrink: 0 }}/>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Tornar imóvel principal</div>
                  <div style={{ fontSize: 11, color: C.slate, marginTop: 1 }}>Aparecerá em primeiro lugar em todas as listas</div>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        {step > 1 && (
          <div style={{ padding: '12px 16px 28px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
            {step === 2 && (
              <button onClick={() => {
                if (!form.nome.trim()) { alert('Preenche o nome do imóvel.'); return }
                setStep(3)
              }} style={{
                width: '100%', padding: 13, borderRadius: 10, background: G,
                border: 'none', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer',
              }}>Continuar →</button>
            )}
            {step === 3 && (
              <button onClick={guardar} disabled={saving} style={{
                width: '100%', padding: 13, borderRadius: 10, background: G,
                border: 'none', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer',
                opacity: saving ? 0.5 : 1,
              }}>{saving ? 'A guardar...' : 'Guardar imóvel →'}</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
