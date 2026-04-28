import { useState, useEffect, useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { supa } from '../supa'

const C = {
  forest:       '#0B3D2E',
  forestGrad:   'linear-gradient(145deg,#0B3D2E,#164E3A)',
  ink:          '#0A1620',
  slate:        '#6B7685',
  slateLight:   '#9CA3AF',
  border:       '#ECE9E2',
  bg:           '#FAFAF6',
  white:        '#FFFFFF',
  emerald:      '#10B981',
  emeraldDark:  '#059669',
  emeraldSoft:  '#D1FAE5',
  emeraldPale:  '#ECFDF5',
  amber:        '#F59E0B',
  amberSoft:    '#FEF3C7',
  red:          '#EF4444',
  redSoft:      '#FEE2E2',
  purple:       '#7C3AED',
  purplePale:   '#F5F3FF',
  purpleSoft:   '#DDD6FE',
}

const BUCKET = 'equipamentos-fotos'

const CATEGORIA_LABEL = {
  aquecimento:    'Aquecimento',
  climatizacao:   'Climatização',
  aguas_quentes:  'Águas quentes',
  canalizacao:    'Canalização',
  eletrica:       'Eléctrica',
  cobertura:      'Cobertura',
  estrutura:      'Estrutura',
  piscina:        'Piscina',
  solar:          'Solar',
  elevador:       'Elevador',
  gerador:        'Gerador',
  eletrodomestico:'Electrodoméstico',
  seguranca:      'Segurança',
  outros:         'Outros',
}

const CATEGORIA_EMOJI = {
  aquecimento: '🔥', climatizacao: '❄️', aguas_quentes: '🚿', canalizacao: '🚰',
  eletrica: '⚡', cobertura: '🏠', estrutura: '🏗️', piscina: '🏊',
  solar: '☀️', elevador: '🛗', gerador: '🔋', eletrodomestico: '🍽️',
  seguranca: '🔐', outros: '🔩',
}

const ESTADO_COLOR = {
  operacional:         C.emerald,
  avaria:              C.red,
  manutencao_pendente: C.amber,
  desativado:          C.slate,
}

const ESTADO_LABEL = {
  operacional:         'Operacional',
  avaria:              'Avaria',
  manutencao_pendente: 'Manutenção pendente',
  desativado:          'Desactivado',
}

const ISSUE_LABEL = {
  oxidacao:             'Oxidação',
  fuga_agua:            'Fuga de água',
  fuga_gas:             'Fuga de gás',
  fissura:              'Fissura',
  ferrugem:             'Ferrugem',
  manchas:              'Manchas',
  ruido_anormal:        'Ruído anormal',
  etiqueta_ilegivel:    'Etiqueta ilegível',
  instalacao_irregular: 'Instalação irregular',
}

function issueLabel(issue) {
  if (typeof issue === 'string' && issue.startsWith('outros:')) return issue.replace('outros:', '').trim()
  return ISSUE_LABEL[issue] || issue
}

function fmtDate(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtDateShort(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('pt-PT', { month: '2-digit', year: 'numeric' })
}

function fmtDateTime(d) {
  if (!d) return null
  return new Date(d).toLocaleString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function capitalize(s) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EquipamentoFichaScreen({ equipamentoId, onBack }) {
  const [eq,      setEq]      = useState(null)
  const [locNome, setLocNome] = useState(null)
  const [fotoUrl, setFotoUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!equipamentoId) return
    load()
  }, [equipamentoId])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data: eqData, error: eqErr } = await supa
        .from('equipamentos')
        .select('*')
        .eq('id', equipamentoId)
        .maybeSingle()
      if (eqErr) throw eqErr
      if (!eqData) throw new Error('Equipamento não encontrado.')
      setEq(eqData)

      if (eqData.localizacao_id) {
        const { data: locData } = await supa
          .from('localizacoes')
          .select('nome')
          .eq('id', eqData.localizacao_id)
          .maybeSingle()
        setLocNome(locData?.nome || null)
      }

      const fotoPath = eqData.dados_ia?.foto_principal_path
      if (fotoPath) {
        const { data: signed } = await supa.storage
          .from(BUCKET)
          .createSignedUrl(fotoPath, 300)
        if (signed?.signedUrl) setFotoUrl(signed.signedUrl)
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar equipamento.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingView onBack={onBack} />
  if (error || !eq) return <ErrorView message={error} onBack={onBack} onRetry={load} />

  const dadosIa  = eq.dados_ia || {}
  const issues   = Array.isArray(dadosIa.issues_detectados) ? dadosIa.issues_detectados : []
  const history  = Array.isArray(dadosIa.agente_inspecao_history) ? dadosIa.agente_inspecao_history : []
  const emoji    = CATEGORIA_EMOJI[eq.categoria] || '🔩'
  const nomeDisplay = [eq.marca, eq.modelo].filter(Boolean).join(' ') || eq.nome

  // resumo linha IA: "IA: alta confiança · ~7 anos" ou combinações
  const iaResumo = [
    dadosIa.confianca_identificacao ? `IA: ${dadosIa.confianca_identificacao} confiança` : null,
    dadosIa.idade_estimada_anos != null ? `~${dadosIa.idade_estimada_anos} anos` : null,
  ].filter(Boolean).join(' · ')

  const hasIA = dadosIa.agente_inspecao_em || dadosIa.confianca_identificacao || dadosIa.idade_estimada_anos != null
  const hasDates = eq.data_instalacao || eq.data_garantia_fim || eq.data_ultima_revisao || eq.data_proxima_revisao
  const hasHistorico = history.length > 0 || !!dadosIa.agente_inspecao_em

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Outfit, sans-serif', paddingBottom: 80 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Header ── */}
      <div style={{ background: C.forestGrad, color: '#fff', padding: '14px 16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span
            style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', cursor: 'pointer', padding: '4px 0' }}
            onClick={onBack}
          >
            ← Voltar
          </span>
          <button
            disabled
            title="Edição disponível em breve"
            style={{ opacity: 0.45, cursor: 'not-allowed', background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 8, padding: '5px 12px', color: '#fff', fontSize: 12, fontWeight: 500 }}
          >
            editar
          </button>
        </div>

        {/* Nome */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 28, lineHeight: 1 }}>{emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.2, marginBottom: 4 }}>
              {nomeDisplay}
            </div>
            {/* categoria · divisão ✏️ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.8)' }}>
                {CATEGORIA_LABEL[eq.categoria] || eq.categoria}
              </span>
              {eq.localizacao_imovel && (
                <>
                  <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 11 }}>·</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.85)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    📍 {capitalize(eq.localizacao_imovel)}
                    <span title="Edição disponível em breve" style={{ cursor: 'default', opacity: 0.6, fontSize: 11 }}>✏️</span>
                  </span>
                </>
              )}
            </div>
            {/* IA resumo */}
            {iaResumo && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.65)' }}>{iaResumo}</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bloco Análise IA ── */}
      {hasIA && (
        <AnaliseIABlock dadosIa={dadosIa} history={history} />
      )}

      {/* ── Análise do agente IA (markdown) ── */}
      <MarkdownAnaliseBlock markdown={eq.ai_resumo_markdown} updatedAt={eq.ai_resumo_updated_at} />

      {/* ── Issues ── */}
      {issues.length > 0 && (
        <Section title={`⚠️ Issues detectados (${issues.length})`} accent={C.amber}>
          {issues.map((issue, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 0',
              borderBottom: i < issues.length - 1 ? `1px solid ${C.border}` : 'none',
            }}>
              <span style={{ fontSize: 13 }}>•</span>
              <span style={{ fontSize: 14, color: C.ink }}>{issueLabel(issue)}</span>
            </div>
          ))}
        </Section>
      )}

      {/* ── Ficha técnica ── */}
      <Section title="Ficha técnica">
        <Row label="Marca"    value={eq.marca} />
        <Row label="Modelo"   value={eq.modelo} />
        <Row label="Nº série" value={eq.numero_serie} />
        {locNome && <Row label="Imóvel"  value={locNome} />}
        {eq.estado && (
          <Row
            label="Estado"
            value={ESTADO_LABEL[eq.estado] || capitalize(eq.estado)}
            color={ESTADO_COLOR[eq.estado]}
          />
        )}
        {eq.classe_energetica && <Row label="Classe energética" value={eq.classe_energetica} />}
      </Section>

      {/* ── Datas ── */}
      {hasDates && (
        <Section title="Datas">
          {eq.data_instalacao && (
            <Row
              label="Instalação"
              value={fmtDateShort(eq.data_instalacao)}
              note={
                dadosIa.data_instalacao_precisao === 'year_only' ? '(só ano)' : null
              }
            />
          )}
          {eq.data_garantia_fim && (
            <Row
              label="Garantia até"
              value={fmtDate(eq.data_garantia_fim)}
              color={new Date(eq.data_garantia_fim) < new Date() ? C.red : undefined}
            />
          )}
          {eq.data_ultima_revisao  && <Row label="Última revisão"  value={fmtDate(eq.data_ultima_revisao)} />}
          {eq.data_proxima_revisao && <Row label="Próxima revisão" value={fmtDate(eq.data_proxima_revisao)} />}
        </Section>
      )}

      {/* ── Notas ── */}
      {eq.notas && (
        <Section title="Notas">
          <p style={{ margin: '4px 0 0', fontSize: 14, color: C.ink, lineHeight: 1.55 }}>{eq.notas}</p>
        </Section>
      )}

      {/* ── Histórico inspecções ── */}
      {hasHistorico && (
        <HistoricoBlock dadosIa={dadosIa} history={history} />
      )}

      {/* ── Fotos (collapsible) ── */}
      <FotosCollapsible fotoUrl={fotoUrl} nomeDisplay={nomeDisplay} />

      {/* ── Acções ── */}
      <div style={{ padding: '8px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          disabled
          title="Disponível em breve"
          style={{
            opacity: 0.4, cursor: 'not-allowed',
            background: C.forest, color: '#fff', border: 'none',
            borderRadius: 12, padding: '14px 20px',
            fontSize: 15, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          🔧 Pedir manutenção
        </button>
        <button
          disabled
          title="Disponível em breve"
          style={{
            opacity: 0.4, cursor: 'not-allowed',
            background: C.white, color: C.red, border: `1px solid ${C.red}40`,
            borderRadius: 12, padding: '12px 20px',
            fontSize: 14, fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          🗑️ Eliminar equipamento
        </button>
      </div>
    </div>
  )
}

// ── CSS prose-content (injectado uma vez) ────────────────────────────────────

const PROSE_CSS = `
.prose-content h1,.prose-content h2,.prose-content h3{
  font-size:14px;font-weight:600;color:#0A1620;margin:10px 0 4px;line-height:1.3;
}
.prose-content h1{font-size:15px;}
.prose-content p{font-size:13px;color:#374151;line-height:1.6;margin:0 0 8px;}
.prose-content ul,.prose-content ol{font-size:13px;color:#374151;line-height:1.6;margin:0 0 8px;padding-left:18px;}
.prose-content li{margin-bottom:3px;}
.prose-content strong{font-weight:600;color:#0A1620;}
.prose-content em{font-style:italic;}
.prose-content table{font-size:12px;border-collapse:collapse;width:100%;margin-bottom:10px;}
.prose-content th{background:#F3F4F6;padding:5px 8px;text-align:left;font-weight:600;color:#374151;}
.prose-content td{padding:5px 8px;border-top:1px solid #E5E7EB;color:#374151;}
.prose-content hr{border:none;border-top:1px solid #E5E7EB;margin:10px 0;}
.prose-content a{color:#7C3AED;text-decoration:none;}
.prose-content blockquote{border-left:3px solid #DDD6FE;padding-left:10px;color:#6B7280;font-style:italic;margin:6px 0;}
`

let proseStyleInjected = false

// ── MarkdownAnaliseBlock ──────────────────────────────────────────────────────

function MarkdownAnaliseBlock({ markdown, updatedAt }) {
  const [open, setOpen] = useState(true)

  const sanitizedHtml = useMemo(() => {
    if (!markdown) return null
    const rawHtml = marked.parse(markdown, { breaks: true, gfm: true })
    return DOMPurify.sanitize(rawHtml)
  }, [markdown])

  if (!sanitizedHtml) return null

  // Inject prose CSS once
  if (!proseStyleInjected && typeof document !== 'undefined') {
    const style = document.createElement('style')
    style.textContent = PROSE_CSS
    document.head.appendChild(style)
    proseStyleInjected = true
  }

  return (
    <div style={{ margin: '12px 16px', borderRadius: 12, background: C.purplePale, border: `1px solid ${C.purpleSoft}`, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.purple, fontFamily: 'JetBrains Mono, monospace' }}>
          ✨ Análise do agente IA
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {updatedAt && (
            <span style={{ fontSize: 10, color: C.slateLight }}>
              {fmtDate(updatedAt)}
            </span>
          )}
          <span style={{ fontSize: 11, color: C.slateLight }}>{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div
          className="prose-content"
          style={{ padding: '0 16px 14px', borderTop: `1px solid ${C.purpleSoft}` }}
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      )}
    </div>
  )
}

// ── Bloco Análise IA ─────────────────────────────────────────────────────────

function AnaliseIABlock({ dadosIa, history }) {
  const totalInspecoes = history.length + (dadosIa.agente_inspecao_em ? 1 : 0)
  return (
    <div style={{ margin: '12px 16px', borderRadius: 12, background: C.purplePale, border: `1px solid ${C.purpleSoft}`, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px 8px', borderBottom: `1px solid ${C.purpleSoft}` }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.purple, fontFamily: 'JetBrains Mono, monospace' }}>
          ✨ Análise IA
        </span>
      </div>
      <div style={{ padding: '4px 16px 10px' }}>
        {dadosIa.idade_estimada_anos != null && (
          <IARow label="Idade estimada" value={`~${dadosIa.idade_estimada_anos} anos`} note="(visual)" />
        )}
        {dadosIa.confianca_identificacao && (
          <IARow label="Confiança" value={dadosIa.confianca_identificacao} />
        )}
        {dadosIa.agente_inspecao_em && (
          <IARow label="Última inspecção" value={fmtDateTime(dadosIa.agente_inspecao_em)} />
        )}
        {dadosIa.agente_inspecao_session_id && (
          <IARow label="Sessão" value={dadosIa.agente_inspecao_session_id.slice(0, 8) + '…'} />
        )}
        {totalInspecoes > 1 && (
          <IARow label="Total inspecções" value={String(totalInspecoes)} />
        )}
      </div>
    </div>
  )
}

function IARow({ label, value, note }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '7px 0', borderBottom: `1px solid ${C.purpleSoft}` }}>
      <span style={{ fontSize: 12, color: C.purple, minWidth: 130, flexShrink: 0, opacity: 0.8 }}>{label}</span>
      <span style={{ fontSize: 14, color: C.ink, fontWeight: 500 }}>
        {value}
        {note && <span style={{ fontSize: 11, color: C.slateLight, marginLeft: 6 }}>{note}</span>}
      </span>
    </div>
  )
}

// ── Histórico inspecções ─────────────────────────────────────────────────────

function HistoricoBlock({ dadosIa, history }) {
  const total = history.length + (dadosIa.agente_inspecao_em ? 1 : 0)

  // Ordenar: sessão actual primeiro (mais recente), depois history desc
  const sessions = []
  if (dadosIa.agente_inspecao_em) {
    sessions.push({
      em: dadosIa.agente_inspecao_em,
      session_id: dadosIa.agente_inspecao_session_id,
      confianca: dadosIa.confianca_identificacao,
      current: true,
    })
  }
  for (let i = history.length - 1; i >= 0; i--) {
    sessions.push({ ...history[i], current: false })
  }

  return (
    <Section title={`Histórico inspecções (${total})`}>
      {sessions.map((s, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '8px 0',
          borderBottom: i < sessions.length - 1 ? `1px solid ${C.border}` : 'none',
        }}>
          <span style={{ fontSize: 13, marginTop: 1 }}>🔍</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: C.ink, fontWeight: 500 }}>
              {fmtDateTime(s.em || s.session_id)}
              {s.current && <span style={{ marginLeft: 6, fontSize: 10, background: C.emeraldSoft, color: C.emeraldDark, borderRadius: 4, padding: '1px 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>actual</span>}
            </div>
            <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>
              {s.confianca ? `confiança: ${s.confianca}` : s.session_id ? s.session_id.slice(0, 8) + '…' : '—'}
            </div>
          </div>
        </div>
      ))}
    </Section>
  )
}

// ── Fotos collapsible ────────────────────────────────────────────────────────

function FotosCollapsible({ fotoUrl, nomeDisplay }) {
  const [open, setOpen] = useState(false)
  const count = fotoUrl ? 1 : 0

  return (
    <div style={{ background: C.white, margin: '12px 16px', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.slate, fontFamily: 'JetBrains Mono, monospace' }}>
          📷 Fotos ({count})
        </span>
        <span style={{ fontSize: 12, color: C.slateLight }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${C.border}` }}>
          {fotoUrl ? (
            <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              <img
                src={fotoUrl}
                alt={nomeDisplay}
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.border}`, cursor: 'pointer' }}
                onClick={() => window.open(fotoUrl, '_blank')}
              />
            </div>
          ) : (
            <p style={{ fontSize: 13, color: C.slate, margin: '10px 0 4px' }}>Sem fotos registadas.</p>
          )}
          <button
            disabled
            title="Disponível em breve"
            style={{
              marginTop: 10, opacity: 0.4, cursor: 'not-allowed',
              background: 'none', border: `1px dashed ${C.border}`,
              borderRadius: 8, padding: '8px 14px',
              fontSize: 12, color: C.slate,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            + adicionar foto
          </button>
        </div>
      )}
    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Section({ title, children, accent }) {
  const borderColor = accent ? accent + '40' : C.border
  const titleColor  = accent ? accent : C.slate
  return (
    <div style={{ background: C.white, margin: '12px 16px', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
      <div style={{ padding: '10px 16px 8px', borderBottom: `1px solid ${borderColor}` }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: titleColor, fontFamily: 'JetBrains Mono, monospace' }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '4px 16px 10px' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, note, color }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 12, color: C.slate, minWidth: 115, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 14, color: color || C.ink, fontWeight: color ? 600 : 400 }}>
        {value}
        {note && <span style={{ fontSize: 11, color: C.slateLight, marginLeft: 6 }}>{note}</span>}
      </span>
    </div>
  )
}

// ── Loading / Error views ─────────────────────────────────────────────────────

function LoadingView({ onBack }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Outfit, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ background: C.forestGrad, color: '#fff', padding: '14px 16px 16px' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', cursor: 'pointer' }} onClick={onBack}>← Voltar</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${C.emerald}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: 14, color: C.slate }}>A carregar equipamento…</span>
      </div>
    </div>
  )
}

function ErrorView({ message, onBack, onRetry }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ background: C.forestGrad, color: '#fff', padding: '14px 16px 16px' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', cursor: 'pointer' }} onClick={onBack}>← Voltar</span>
      </div>
      <div style={{ padding: 32, textAlign: 'center' }}>
        <p style={{ color: C.red, fontSize: 14, marginBottom: 20 }}>{message || 'Erro desconhecido.'}</p>
        <button
          onClick={onRetry}
          style={{ background: C.forest, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14 }}
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
