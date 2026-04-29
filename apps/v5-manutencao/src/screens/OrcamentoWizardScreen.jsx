import React, { useState } from 'react'
import { MOCK_ORCAMENTOS_AREAS, MOCK_ORCAMENTOS_FORMATOS } from '../data/mock.js'
import { supa } from '../supa.js'
import { DEMO_ORGANIZATION_ID } from '../lib/demo.js'
import { useAuth } from '../lib/AuthContext.jsx'

const P = '#534AB7'; const PD = '#3D35A0'
const C = {
  ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
  purpleLt:'#EEEDFE', greenLt:'#52B788', greenXl:'#D8F3DC',
  amber:'#F59E0B', amberLt:'#FAEEDA', blueLt:'#E6F1FB', blue:'#185FA5',
}

function Stepper({ step }) {
  const labels = ['Áreas', 'Descrição', 'Formato', 'Confirmar']
  return (
    <div style={{ padding: '12px 14px', background: C.white, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {[1, 2, 3, 4].map((n, i) => {
          const active = n === step; const done = n < step
          return (
            <React.Fragment key={n}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: active ? P : done ? C.greenLt : '#eee', color: active || done ? '#fff' : C.slate, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {done ? '✓' : n}
              </div>
              {i < 3 && <div style={{ flex: 1, height: 2, background: n < step ? C.greenLt : '#eee' }} />}
            </React.Fragment>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9, color: C.slate }}>
        {labels.map((l, i) => (
          <span key={l} style={{ color: i + 1 === step ? P : C.slate, fontWeight: i + 1 === step ? 700 : 400 }}>{l}</span>
        ))}
      </div>
    </div>
  )
}

// ── Step 1 — Áreas ────────────────────────────────────────────────────────────
function Step1({ areas, setAreas, onBack, onNext }) {
  const toggle = (id) => {
    setAreas(s => s.includes(id) ? s.filter(x => x !== id) : (s.length < 3 ? [...s, id] : s))
  }
  return (
    <div>
      <div style={{ background: P, padding: '10px 14px', color: '#fff' }}>
        <div style={{ fontSize: 10, opacity: .7, cursor: 'pointer', marginBottom: 3 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Pedir orçamento à medida</div>
      </div>
      <Stepper step={1} />

      <div style={{ padding: '14px 14px 4px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Georgia,serif' }}>Que áreas envolve?</div>
        <div style={{ fontSize: 11, color: C.slate, marginTop: 3 }}>Podes escolher até <b>3 áreas</b> para receberes mais orçamentos.</div>
      </div>

      <div style={{ padding: '12px 12px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
        {MOCK_ORCAMENTOS_AREAS.map(a => {
          const on = areas.includes(a.id)
          const disabled = !on && areas.length >= 3
          return (
            <div key={a.id} onClick={() => !disabled && toggle(a.id)}
              style={{ background: on ? C.purpleLt : C.white, border: `${on ? 2 : 1}px solid ${on ? P : C.border}`, borderRadius: 11, padding: '11px 4px', textAlign: 'center', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .4 : 1, position: 'relative' }}>
              {on && <div style={{ position: 'absolute', top: 5, right: 5, width: 16, height: 16, borderRadius: '50%', background: P, color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>✓</div>}
              <div style={{ fontSize: 22, marginBottom: 3 }}>{a.ic}</div>
              <div style={{ fontSize: 10, color: on ? P : C.slate, fontWeight: on ? 700 : 500 }}>{a.l}</div>
            </div>
          )
        })}
      </div>

      <div style={{ margin: '14px 12px 0', background: C.blueLt, border: '1px solid #85B7EB', borderRadius: 10, padding: '9px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ fontSize: 18 }}>💡</div>
        <div style={{ fontSize: 10.5, color: C.blue, lineHeight: 1.4 }}>Quanto mais áreas escolheres, mais orçamentos recebes. A IA agrupa pedidos compatíveis num só técnico.</div>
      </div>

      <div style={{ padding: '14px 12px 14px' }}>
        <button onClick={() => areas.length && onNext()}
          style={{ width: '100%', padding: 13, borderRadius: 12, background: areas.length ? P : '#eee', color: areas.length ? '#fff' : C.slate, fontSize: 14, fontWeight: 700, border: 'none', cursor: areas.length ? 'pointer' : 'not-allowed' }}>
          Continuar · {areas.length}/3 áreas
        </button>
      </div>
    </div>
  )
}

// ── Step 2 — Descrição + Media ────────────────────────────────────────────────
function Step2({ descricao, setDescricao, fotos, setFotos, onBack, onNext }) {
  const MIN = 30
  const ok = descricao.trim().length >= MIN

  const addFoto = () => {
    if (fotos.length < 5) setFotos(f => [...f, `foto-${Date.now()}`])
  }
  const remFoto = (i) => setFotos(f => f.filter((_, idx) => idx !== i))

  return (
    <div>
      <div style={{ background: P, padding: '10px 14px', color: '#fff' }}>
        <div style={{ fontSize: 10, opacity: .7, cursor: 'pointer', marginBottom: 3 }} onClick={onBack}>← Áreas</div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Descreve o projecto</div>
      </div>
      <Stepper step={2} />

      <div style={{ padding: '14px 14px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Georgia,serif', marginBottom: 3 }}>Descreve o que precisas</div>
        <div style={{ fontSize: 11, color: C.slate, marginBottom: 10 }}>Quanto mais detalhes, melhores orçamentos.</div>

        <textarea
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
          placeholder="Ex: Cozinha dos anos 90 com azulejos antigos. Quero renovar completamente: armários novos, bancada em quartzo, novo pavimento. Área ~18m²..."
          style={{ width: '100%', minHeight: 120, padding: '10px 12px', borderRadius: 11, border: `1px solid ${ok ? C.border : descricao.length > 0 ? '#F59E0B' : C.border}`, fontSize: 12, outline: 'none', background: '#fafafa', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }}>
          <div style={{ fontSize: 11, color: P, fontWeight: 700, cursor: 'pointer' }}>✨ Melhorar descrição com IA</div>
          <div style={{ fontSize: 10, color: C.slate }}>{descricao.length} / 2000 {!ok && descricao.length > 0 && `· mín ${MIN} caracteres`}</div>
        </div>
      </div>

      {/* Fotos */}
      <div style={{ padding: '0 14px 4px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>📸 Fotos do local ({fotos.length}/5)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 6 }}>
          {fotos.map((_, i) => (
            <div key={i} style={{ aspectRatio: '1', background: '#E0E8D5', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, position: 'relative' }}>
              📷
              <div onClick={() => remFoto(i)} style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,.5)', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>×</div>
            </div>
          ))}
          {fotos.length < 5 && (
            <div onClick={addFoto} style={{ aspectRatio: '1', background: C.white, border: `1px dashed ${C.border}`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: C.slate, cursor: 'pointer' }}>+</div>
          )}
        </div>
        <div style={{ fontSize: 10, color: C.slate, marginTop: 6 }}>💡 Fotos claras aumentam em 70% a precisão dos orçamentos</div>
      </div>

      {/* Vídeo opcional */}
      <div style={{ margin: '12px 14px 0', background: C.white, border: `1px dashed ${C.border}`, borderRadius: 10, padding: '11px 13px', display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
        <div style={{ fontSize: 22 }}>🎥</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700 }}>Adicionar vídeo (opcional)</div>
          <div style={{ fontSize: 10, color: C.slate, marginTop: 1 }}>Máx. 60s · ajuda técnico a preparar visita</div>
        </div>
        <span style={{ color: C.slate, fontSize: 16 }}>›</span>
      </div>

      {/* Docs */}
      <div style={{ margin: '8px 14px 14px', background: C.white, border: `1px dashed ${C.border}`, borderRadius: 10, padding: '11px 13px', display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
        <div style={{ fontSize: 22 }}>📄</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700 }}>Orçamentos anteriores (opcional)</div>
          <div style={{ fontSize: 10, color: C.slate, marginTop: 1 }}>Tira uma foto ou carrega PDF · só tu vês</div>
        </div>
        <span style={{ color: C.slate, fontSize: 16 }}>›</span>
      </div>

      <div style={{ padding: '0 12px 14px' }}>
        <button onClick={() => ok && onNext()}
          style={{ width: '100%', padding: 13, borderRadius: 12, background: ok ? P : '#eee', color: ok ? '#fff' : C.slate, fontSize: 14, fontWeight: 700, border: 'none', cursor: ok ? 'pointer' : 'not-allowed' }}>
          Continuar →
        </button>
      </div>
    </div>
  )
}

// ── Step 3 — Formato ──────────────────────────────────────────────────────────
function Step3({ formatos, setFormatos, onBack, onNext }) {
  const toggle = (id) => setFormatos(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  return (
    <div>
      <div style={{ background: P, padding: '10px 14px', color: '#fff' }}>
        <div style={{ fontSize: 10, opacity: .7, cursor: 'pointer', marginBottom: 3 }} onClick={onBack}>← Descrição</div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Como queres receber orçamentos?</div>
      </div>
      <Stepper step={3} />

      <div style={{ padding: '14px 14px 8px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Georgia,serif' }}>Escolhe um ou mais formatos</div>
        <div style={{ fontSize: 11, color: C.slate, marginTop: 3 }}>Quantos mais, mais orçamentos recebes.</div>
      </div>

      <div style={{ padding: '0 12px' }}>
        {MOCK_ORCAMENTOS_FORMATOS.map(o => {
          const on = formatos.includes(o.id)
          return (
            <div key={o.id} onClick={() => toggle(o.id)}
              style={{ background: on ? C.purpleLt : C.white, border: `${on ? 2 : 1}px solid ${on ? P : C.border}`, borderRadius: 12, padding: '13px 14px', marginBottom: 9, cursor: 'pointer' }}>
              <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${on ? P : C.border}`, background: on ? P : C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, flexShrink: 0, marginTop: 2 }}>{on ? '✓' : ''}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                    <span style={{ fontSize: 20 }}>{o.ic}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{o.t}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.slate, lineHeight: 1.5 }}>{o.s}</div>
                  <div style={{ fontSize: 10, color: P, fontWeight: 700, marginTop: 5 }}>📊 {o.max}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ margin: '4px 12px 0', background: '#FAEEDA', border: '1px solid #F59E0B', borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 9, alignItems: 'center' }}>
        <div style={{ fontSize: 18 }}>🎯</div>
        <div style={{ fontSize: 10.5, color: C.amber, lineHeight: 1.4 }}><b>Seleccionados: {formatos.length}/3</b> · sem compromisso</div>
      </div>

      <div style={{ padding: '14px 12px' }}>
        <button onClick={() => formatos.length && onNext()}
          style={{ width: '100%', padding: 13, borderRadius: 12, background: formatos.length ? P : '#eee', color: formatos.length ? '#fff' : C.slate, fontSize: 14, fontWeight: 700, border: 'none', cursor: formatos.length ? 'pointer' : 'not-allowed' }}>
          Continuar →
        </button>
      </div>
    </div>
  )
}

// ── Step 4 — Confirmar ────────────────────────────────────────────────────────
function Step4({ areas, descricao, fotos, formatos, onBack, onSubmit, enviando, setStep }) {
  const areasLabel = areas.map(id => MOCK_ORCAMENTOS_AREAS.find(a => a.id === id)?.l).filter(Boolean).join(', ')
  const formatosLabel = formatos.map(id => MOCK_ORCAMENTOS_FORMATOS.find(f => f.id === id)?.t).filter(Boolean).join(' + ')

  const Row = ({ l, v, onEdit, step }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}`, fontSize: 11, alignItems: 'center' }}>
      <span style={{ color: C.slate }}>{l}</span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <b>{v}</b>
        <span onClick={() => setStep(step)} style={{ fontSize: 9, color: P, cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}>Editar</span>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ background: P, padding: '10px 14px', color: '#fff' }}>
        <div style={{ fontSize: 10, opacity: .7, cursor: 'pointer', marginBottom: 3 }} onClick={onBack}>← Formato</div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Confirma e envia</div>
      </div>
      <Stepper step={4} />

      <div style={{ padding: '14px 12px 0' }}>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: '13px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: C.slate, textTransform: 'uppercase', letterSpacing: .4, fontWeight: 700, marginBottom: 8 }}>O teu pedido</div>
          <Row l="Áreas" v={areasLabel || '—'} step={1} />
          <Row l="Fotos" v={fotos.length > 0 ? `${fotos.length} anexada${fotos.length > 1 ? 's' : ''}` : 'Sem fotos'} step={2} />
          <Row l="Formato" v={formatosLabel || '—'} step={3} />
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 11, alignItems: 'center' }}>
            <span style={{ color: C.slate }}>Orçamentos esperados</span>
            <b style={{ color: P }}>Até {formatos.length * 5 || '—'}</b>
          </div>
        </div>

        {/* Descrição */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: '11px 13px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700 }}>📝 Descrição</div>
            <span onClick={() => setStep(2)} style={{ fontSize: 9, color: P, cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}>Editar</span>
          </div>
          <div style={{ fontSize: 11, color: C.slate, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{descricao}</div>
        </div>

        {/* Pontos */}
        <div style={{ background: '#FAEEDA', border: '1px solid #F0CC5A', borderRadius: 12, padding: '11px 13px', marginBottom: 14, display: 'flex', gap: 9, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 18 }}>🎁</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.amber }}>+50 pontos ao enviar</div>
            <div style={{ fontSize: 10, color: C.amber, marginTop: 1 }}>Ganhas +100 se contratares pela app</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 12px 14px' }}>
        <button
          onClick={onSubmit}
          disabled={enviando}
          style={{ width: '100%', padding: 14, borderRadius: 12, background: enviando ? '#9B95D4' : P, color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: enviando ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(83,74,183,.3)' }}>
          {enviando ? 'A enviar…' : 'Enviar pedido ✨'}
        </button>
        <div style={{ fontSize: 10, color: C.slate, textAlign: 'center', marginTop: 7 }}>Sem compromisso · Compara · Decide</div>
      </div>
    </div>
  )
}

// ── Main wizard ───────────────────────────────────────────────────────────────
export default function OrcamentoWizardScreen({ onBack, onConfirmado, localizacaoId, categoriaSlug, skipStep1, descricaoInicial }) {
  const { pessoa_id, memberships } = useAuth()
  const orgId = memberships?.[0]?.organization_id ?? null
  const [step,      setStep]      = useState(skipStep1 ? 2 : 1)
  const [areas,     setAreas]     = useState([])
  const [descricao, setDescricao] = useState(descricaoInicial || '')
  const [fotos,     setFotos]     = useState([])
  const [formatos,  setFormatos]  = useState([])
  const [enviando,  setEnviando]  = useState(false)

  const handleSubmit = async () => {
    if (enviando) return
    setEnviando(true)
    try {
      const { data, error } = await supa
        .from('pedidos_orcamento')
        .insert({
          pessoa_id:              pessoa_id,
          organization_id:        orgId,
          localizacao_id:         localizacaoId || null,
          areas,
          descricao,
          fotos_urls:             [],
          formatos,
          estado:                 'aberto',
          n_orcamentos_esperados: formatos.length * 5,
        })
        .select('id')
        .single()
      if (error) throw error
      onConfirmado(data?.id || null)
    } catch (err) {
      console.error('[OrcamentoWizard] insert error', err)
      onConfirmado(null)
    } finally {
      setEnviando(false)
    }
  }

  if (step === 1) return <Step1 areas={areas} setAreas={setAreas} onBack={onBack} onNext={() => setStep(2)} />
  if (step === 2) return <Step2 descricao={descricao} setDescricao={setDescricao} fotos={fotos} setFotos={setFotos} onBack={skipStep1 ? onBack : () => setStep(1)} onNext={() => setStep(3)} />
  if (step === 3) return <Step3 formatos={formatos} setFormatos={setFormatos} onBack={() => setStep(2)} onNext={() => setStep(4)} />
  return <Step4 areas={areas} descricao={descricao} fotos={fotos} formatos={formatos} onBack={() => setStep(3)} onSubmit={handleSubmit} enviando={enviando} setStep={setStep} />
}
