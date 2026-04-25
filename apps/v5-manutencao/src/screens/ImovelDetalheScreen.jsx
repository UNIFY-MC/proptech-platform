import React, { useState, useEffect } from 'react'
import { supa } from '../supa.js'
import { useImovelAtivo } from '../lib/ImovelAtivoContext.jsx'
import { calcularCompletude, corCompletude } from '../lib/completude.js'
import { usePerfisFiscais } from '../lib/PerfisFiscaisContext.jsx'
import { moradaCurta, moradaCompleta, tipoImovelEmoji, tipoImovelLabel, categoriaEmoji, categoriaLabel, isReadOnly, isExternalUse, externalAppLabel, usoLabel } from '../lib/labels.js'
import { SISTEMAS_LABELS, AMENITIES_LABELS } from '../lib/categorias.js'
import { pointToCoords } from '../lib/geocoding.js'
import { ModalEditarImovel } from './MoradasScreen.jsx'

const G  = '#1B4332'
const GM = '#2D6A4F'
const GL = '#52B788'
const C  = {
  ink: '#0f172a', slate: '#64748b', border: '#e2e8f0', bg: '#f8fafc', white: '#fff',
  line: '#E5E7EB', greenXl: '#D8F3DC', red: '#A32D2D', redSoft: '#FFEAEA',
  amber: '#854F0B', amberLt: '#FEF3C7',
}

function scoreColor(s) {
  if (s >= 70) return { bg: '#D8F3DC', c: G }
  if (s >= 50) return { bg: '#FEF9C3', c: '#854F0B' }
  return { bg: '#FDE4DC', c: '#C0392B' }
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: C.slate,
      textTransform: 'uppercase', marginBottom: 10, marginTop: 20, padding: '0 16px' }}>
      {children}
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{ margin: '0 16px', background: C.white, borderRadius: 12,
      border: `1px solid ${C.border}`, padding: '12px 14px', ...style }}>
      {children}
    </div>
  )
}

function InfoChip({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, padding: '8px 12px', flex: 1 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{value}</div>
      <div style={{ fontSize: 9, color: C.slate, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 }}>{label}</div>
    </div>
  )
}

const SCORE_KEYS = [
  { key: 'score_avac',      label: 'AVAC'      },
  { key: 'score_canaliz',   label: 'Canaliz.'  },
  { key: 'score_eletrica',  label: 'Eléctrica' },
  { key: 'score_estrutura', label: 'Estrutura' },
  { key: 'score_cobertura', label: 'Cobertura' },
]

export default function ImovelDetalheScreen({ id, onBack, onNavigateScore }) {
  const { imoveis, imovelAtivoId, setImovelAtivoId, refetch } = useImovelAtivo()
  const { perfis } = usePerfisFiscais()

  const [imovel,     setImovel]     = useState(() => imoveis.find(i => i.id === id) || null)
  const [ordens,     setOrdens]     = useState(null)
  const [eqCount,    setEqCount]    = useState(null)
  const [modalEdit,  setModalEdit]  = useState(false)
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      const [imRes, ordRes, eqRes] = await Promise.all([
        supa.from('localizacoes').select('*').eq('id', id).maybeSingle(),
        supa.from('ordens').select('id,numero,estado,created_at,descricao_personalizada,metadata')
          .eq('localizacao_id', id).order('created_at', { ascending: false }).limit(5),
        supa.from('equipamentos').select('id', { count: 'exact', head: true }).eq('localizacao_id', id),
      ])
      if (!active) return
      if (imRes.data)  setImovel(imRes.data)
      if (ordRes.data) setOrdens(ordRes.data)
      setEqCount(eqRes.count ?? 0)
    }
    load()
    return () => { active = false }
  }, [id])

  async function tornarPrincipal() {
    if (!imovel) return
    setSaving(true)
    await supa.from('localizacoes').update({ principal: false }).eq('pessoa_id', imovel.pessoa_id)
    await supa.from('localizacoes').update({ principal: true }).eq('id', imovel.id)
    await setImovelAtivoId(imovel.id)
    await refetch()
    setSaving(false)
  }

  async function apagarImovel() {
    if (!imovel) return
    if (!confirm('Apagar este imóvel permanentemente? Esta ação não pode ser desfeita.')) return
    setSaving(true)
    await supa.from('localizacoes').update({ ativo: false }).eq('id', imovel.id)
    if (imovel.id === imovelAtivoId) {
      const outro = imoveis.find(i => i.id !== imovel.id)
      if (outro) await setImovelAtivoId(outro.id)
    }
    await refetch()
    setSaving(false)
    onBack()
  }

  const perfilFat = imovel?.perfil_fiscal_id
    ? perfis.find(p => p.id === imovel.perfil_fiscal_id)
    : perfis.find(p => p.principal)

  const coords = imovel ? pointToCoords(imovel.coords) : null
  const isPrincipal = imovel?.id === imovelAtivoId
  const sc = scoreColor(imovel?.home_score ?? 0)

  const ESTADO_LABELS = {
    pendente: 'Pendente', aceite: 'Aceite', em_curso: 'Em curso',
    concluido: 'Concluído', cancelado: 'Cancelado',
  }

  if (!imovel) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 14, color: C.slate }}>A carregar...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 40 }}>

      {/* HEADER */}
      <div style={{ background: `linear-gradient(145deg,${G},${GM})`, padding: '14px 16px 18px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
            ← Voltar
          </button>
          {!isReadOnly(imovel) && (
            <button onClick={() => setModalEdit(true)} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '5px 12px', borderRadius: 8 }}>
              Editar →
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>{categoriaEmoji(imovel)}</span>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', fontWeight: 700, letterSpacing: 0.5 }}>
              {categoriaLabel(imovel).toUpperCase()}
              {isPrincipal && <span style={{ marginLeft: 8, background: GL, color: '#fff', padding: '1px 6px', borderRadius: 4, fontSize: 9 }}>PRINCIPAL</span>}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>{imovel.nome}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.65)', marginTop: 2 }}>{moradaCurta(imovel)}</div>
          </div>
        </div>
      </div>

      {/* BANNER V2 SYNC */}
      {isReadOnly(imovel) && (
        <div style={{ background: '#EDE9FE', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#534AB7', fontWeight: 600 }}>🔗 Sincronizado da V2 · estrutura gerida lá</span>
          <button onClick={() => alert('TODO: link para V2')} style={{ fontSize: 11, color: '#534AB7', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Abrir na V2 →</button>
        </div>
      )}
      {/* BANNER ARRENDADO LT */}
      {!isReadOnly(imovel) && isExternalUse(imovel) && (
        <div style={{ background: '#FAEEDA', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#854F0B', fontWeight: 600 }}>🔗 Arrendamento gerido na {externalAppLabel(imovel)}</span>
          <button onClick={() => alert(`TODO: link para ${externalAppLabel(imovel)}`)} style={{ fontSize: 11, color: '#854F0B', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Abrir →</button>
        </div>
      )}

      {/* FOTO */}
      {imovel.foto_principal_url && (
        <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
          <img src={imovel.foto_principal_url} alt="foto principal"
            style={{ width: '100%', height: 200, objectFit: 'cover' }}/>
          <button onClick={() => setModalEdit(true)} style={{
            position: 'absolute', bottom: 10, right: 10,
            background: 'rgba(0,0,0,.55)', color: '#fff', border: 'none',
            borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}>📷 Mudar foto</button>
        </div>
      )}
      {!imovel.foto_principal_url && (
        <div
          onClick={() => setModalEdit(true)}
          style={{ height: 90, background: C.greenXl, display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 8, cursor: 'pointer', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 22 }}>📷</span>
          <span style={{ fontSize: 12, color: G, fontWeight: 600 }}>Adicionar foto principal</span>
        </div>
      )}

      {/* HOME SCORE */}
      <SectionTitle>Home Score</SectionTitle>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: sc.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: sc.c }}>{imovel.home_score ?? 0}</span>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>
                {(imovel.home_score ?? 0) >= 70 ? 'Casa Saudável 🌱' : (imovel.home_score ?? 0) >= 40 ? 'A Melhorar ⚠️' : 'Em Risco 🚨'}
              </div>
              <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>Score calculado automaticamente</div>
            </div>
          </div>
          {onNavigateScore && (
            <button onClick={onNavigateScore} style={{ background: C.greenXl, border: 'none', color: G, borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              Detalhe →
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {SCORE_KEYS.map(({ key, label }) => {
            const val = imovel[key] ?? 0
            const sc2 = scoreColor(val)
            return (
              <div key={key} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: 40, background: C.bg, borderRadius: 4, overflow: 'hidden',
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 3 }}>
                  <div style={{ width: '70%', background: sc2.bg, borderRadius: 3, height: `${val}%` }}/>
                </div>
                <div style={{ fontSize: 8, color: C.slate, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: sc2.c }}>{val}</div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* COMPLETUDE */}
      {(() => {
        const { pct, faltam } = calcularCompletude({ ...imovel, perfil_fiscal_id: imovel.perfil_fiscal_id })
        const cor = corCompletude(pct)
        return (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>Completude do perfil</div>
              <span style={{ fontSize: 14, fontWeight: 800, color: cor }}>{pct}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: C.bg, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: faltam.length > 0 ? 8 : 0 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: cor, borderRadius: 3, transition: 'width .4s ease' }} />
            </div>
            {faltam.length > 0 && (
              <div style={{ fontSize: 10, color: C.slate, lineHeight: 1.5 }}>
                A preencher: {faltam.slice(0, 3).map(f => f.label).join(', ')}{faltam.length > 3 ? ` +${faltam.length - 3}` : ''}
              </div>
            )}
          </Card>
        )
      })()}

      {/* INFORMAÇÃO */}
      <SectionTitle>Informação</SectionTitle>
      <div style={{ margin: '0 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <InfoChip label="Tipologia" value={imovel.tipologia}/>
        <InfoChip label="m² úteis" value={imovel.area_m2}/>
        <InfoChip label="Ano" value={imovel.ano_construcao}/>
        <InfoChip label="Quartos" value={imovel.num_quartos}/>
        <InfoChip label="WCs" value={imovel.num_wcs}/>
        <InfoChip label="Pisos" value={imovel.num_pisos}/>
      </div>
      {usoLabel(imovel) && (
        <div style={{ margin: '8px 16px 0', display: 'flex', gap: 6 }}>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: C.bg, border: `1px solid ${C.border}`, color: C.slate, fontWeight: 600 }}>
            {usoLabel(imovel)}
          </span>
        </div>
      )}

      {/* SISTEMAS GERIDOS */}
      {Array.isArray(imovel.sistemas_geridos) && imovel.sistemas_geridos.length > 0 && (
        <>
          <SectionTitle>Sistemas geridos</SectionTitle>
          <div style={{ margin: '0 16px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {imovel.sistemas_geridos.map(s => (
              <span key={s} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: C.greenXl, color: G, border: `1px solid #95D5B2`, fontWeight: 600 }}>
                {SISTEMAS_LABELS[s] || s}
              </span>
            ))}
          </div>
        </>
      )}

      {/* AMENITIES */}
      {imovel.amenities && Object.entries(imovel.amenities).some(([k, v]) => v && AMENITIES_LABELS[k]) && (
        <>
          <SectionTitle>Características</SectionTitle>
          <div style={{ margin: '0 16px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(imovel.amenities)
              .filter(([k, v]) => v && AMENITIES_LABELS[k])
              .map(([k]) => (
                <span key={k} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: C.bg, color: C.slate, border: `1px solid ${C.border}`, fontWeight: 600 }}>
                  {AMENITIES_LABELS[k]}
                </span>
              ))}
          </div>
        </>
      )}

      {/* MORADA & GPS */}
      <SectionTitle>Morada & GPS</SectionTitle>
      <Card>
        <div style={{ fontSize: 13, color: C.ink, whiteSpace: 'pre-line', marginBottom: 10 }}>
          {moradaCompleta(imovel) || moradaCurta(imovel) || '(sem morada)'}
        </div>
        {coords ? (
          <>
            <div style={{ fontSize: 11, color: C.slate, marginBottom: 8 }}>
              📍 {coords.lat.toFixed(5)}°N, {coords.lng.toFixed(5)}°E
            </div>
            <a
              href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', textAlign: 'center', padding: '8px 12px', fontSize: 12,
                color: '#185FA5', background: '#E6F1FB', borderRadius: 8, textDecoration: 'none',
                fontWeight: 600, marginBottom: 4 }}>
              🗺️ Ver no Google Maps →
            </a>
          </>
        ) : (
          <div style={{ background: C.bg, borderRadius: 8, padding: '10px 12px', fontSize: 12, color: C.slate }}>
            Sem coordenadas GPS ·{' '}
            <span onClick={() => setModalEdit(true)} style={{ color: G, fontWeight: 600, cursor: 'pointer' }}>
              Adicionar →
            </span>
          </div>
        )}
        <button onClick={() => setModalEdit(true)} style={{
          marginTop: 10, background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: C.slate, cursor: 'pointer',
        }}>Editar morada →</button>
      </Card>

      {/* FATURAÇÃO */}
      <SectionTitle>Faturação</SectionTitle>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: C.slate, marginBottom: 2 }}>Perfil fiscal aplicável</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>
              {perfilFat ? (perfilFat.nome || perfilFat.nome_facturacao) : 'Dados pessoais'}
            </div>
            {perfilFat?.nif && (
              <div style={{ fontSize: 11, color: C.slate }}>NIF {perfilFat.nif}</div>
            )}
          </div>
          {!isPrincipal && (
            <span style={{ fontSize: 10, background: C.greenXl, color: G, padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
              {imovel.perfil_fiscal_id ? 'Personalizado' : 'Pessoal'}
            </span>
          )}
        </div>
      </Card>

      {/* EQUIPAMENTOS */}
      <SectionTitle>Equipamentos</SectionTitle>
      <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.ink }}>{eqCount ?? '—'}</div>
          <div style={{ fontSize: 11, color: C.slate }}>equipamentos registados</div>
        </div>
        <div style={{ fontSize: 24 }}>🔧</div>
      </Card>

      {/* HISTÓRICO */}
      <SectionTitle>Histórico de serviços</SectionTitle>
      <div style={{ margin: '0 16px' }}>
        {ordens === null ? (
          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: '20px', textAlign: 'center', fontSize: 12, color: C.slate }}>
            A carregar...
          </div>
        ) : ordens.length === 0 ? (
          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: '20px', textAlign: 'center', fontSize: 12, color: C.slate }}>
            Sem serviços registados para este imóvel.
          </div>
        ) : ordens.map(o => (
          <div key={o.id} style={{
            background: C.white, borderRadius: 10, border: `1px solid ${C.border}`,
            padding: '10px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>
                {o.metadata?.servico_nome || o.descricao_personalizada || `Ordem #${o.numero}`}
              </div>
              <div style={{ fontSize: 10, color: C.slate, marginTop: 2 }}>
                {new Date(o.created_at).toLocaleDateString('pt-PT')}
              </div>
            </div>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: C.bg, color: C.slate, border: `1px solid ${C.border}`, fontWeight: 600 }}>
              {ESTADO_LABELS[o.estado] || o.estado}
            </span>
          </div>
        ))}
      </div>

      {/* NOTAS */}
      {(imovel.notas || true) && (
        <>
          <SectionTitle>Notas</SectionTitle>
          <Card>
            {imovel.notas ? (
              <p style={{ fontSize: 13, color: C.ink, lineHeight: 1.5, margin: 0 }}>{imovel.notas}</p>
            ) : (
              <p style={{ fontSize: 12, color: C.slate, margin: 0 }}>Sem notas. Toque em Editar para adicionar.</p>
            )}
            <button onClick={() => setModalEdit(true)} style={{
              marginTop: 10, background: 'none', border: 'none', color: G, fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0,
            }}>Editar notas →</button>
          </Card>
        </>
      )}

      {/* ZONA PERIGOSA — só para imóveis criados aqui (não v2_sync) */}
      {!isReadOnly(imovel) && (
        <>
          <SectionTitle>Zona Perigosa</SectionTitle>
          <div style={{ margin: '0 16px', display: 'flex', flexDirection: 'column', gap: 8, opacity: saving ? 0.5 : 1 }}>
            {!isPrincipal && (
              <button onClick={tornarPrincipal} disabled={saving} style={{
                width: '100%', padding: 12, borderRadius: 10, background: C.greenXl,
                border: `1px solid ${GL}`, fontSize: 13, fontWeight: 700, color: G, cursor: 'pointer',
              }}>Tornar imóvel principal</button>
            )}
            <button onClick={apagarImovel} disabled={saving} style={{
              width: '100%', padding: 12, borderRadius: 10, background: C.redSoft,
              border: 'none', fontSize: 13, fontWeight: 700, color: C.red, cursor: 'pointer',
            }}>🗑 Apagar este imóvel</button>
          </div>
        </>
      )}

      {/* Modal editar */}
      {modalEdit && (
        <ModalEditarImovel
          imovel={imovel}
          onClose={() => setModalEdit(false)}
          onSaved={async () => {
            const { data } = await supa.from('localizacoes').select('*').eq('id', id).maybeSingle()
            if (data) setImovel(data)
            await refetch()
          }}
        />
      )}
    </div>
  )
}
