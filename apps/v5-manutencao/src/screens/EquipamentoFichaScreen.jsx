import { useState, useEffect } from 'react'
import { supa } from '../supa'

const C = {
  forest:      '#0B3D2E',
  forestGrad:  'linear-gradient(145deg,#0B3D2E,#164E3A)',
  ink:         '#0A1620',
  slate:       '#6B7685',
  border:      '#ECE9E2',
  bg:          '#FAFAF6',
  white:       '#FFFFFF',
  emerald:     '#10B981',
  emeraldDark: '#059669',
  emeraldSoft: '#D1FAE5',
  emeraldPale: '#ECFDF5',
  amber:       '#F59E0B',
  amberSoft:   '#FEF3C7',
  red:         '#EF4444',
  redSoft:     '#FEE2E2',
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
  operacional:          C.emerald,
  avaria:               C.red,
  manutencao_pendente:  C.amber,
  desativado:           C.slate,
}

const ESTADO_LABEL = {
  operacional:          'Operacional',
  avaria:               'Avaria',
  manutencao_pendente:  'Manutenção pendente',
  desativado:           'Desactivado',
}

const ISSUE_LABEL = {
  oxidacao:              'Oxidação',
  fuga_agua:             'Fuga de água',
  fuga_gas:              'Fuga de gás',
  fissura:               'Fissura',
  ferrugem:              'Ferrugem',
  manchas:               'Manchas',
  ruido_anormal:         'Ruído anormal',
  etiqueta_ilegivel:     'Etiqueta ilegível',
  instalacao_irregular:  'Instalação irregular',
}

function issueLabel(issue) {
  if (typeof issue === 'string' && issue.startsWith('outros:')) {
    return issue.replace('outros:', '').trim()
  }
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

function isExpired(d) {
  return d && new Date(d) < new Date()
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EquipamentoFichaScreen({ equipamentoId, onBack }) {
  const [eq,      setEq]      = useState(null)
  const [loc,     setLoc]     = useState(null)
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
          .select('nome, rua, numero, localidade, cidade, tipologia')
          .eq('id', eqData.localizacao_id)
          .maybeSingle()
        setLoc(locData)
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

  const dadosIa = eq.dados_ia || {}
  const issues  = Array.isArray(dadosIa.issues_detectados) ? dadosIa.issues_detectados : []
  const emoji   = CATEGORIA_EMOJI[eq.categoria] || '🔩'
  const estadoColor = ESTADO_COLOR[eq.estado] || C.slate
  const locLabel = loc
    ? [loc.nome, [loc.rua, loc.numero].filter(Boolean).join(' '), loc.localidade || loc.cidade].filter(Boolean).join(' · ')
    : null
  const nomeDisplay = [eq.marca, eq.modelo].filter(Boolean).join(' ') || eq.nome

  const hasDateSection = eq.data_instalacao || eq.data_garantia_fim || eq.data_ultima_revisao ||
    eq.data_proxima_revisao || dadosIa.idade_estimada_anos != null
  const hasEnergiaSection = eq.classe_energetica || eq.potencia_kw || eq.consumo_estimado_kwh_mes

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Outfit, sans-serif', paddingBottom: 80 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ background: C.forestGrad, color: '#fff', padding: '14px 16px 16px' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', cursor: 'pointer', marginBottom: 12 }}
          onClick={onBack}>
          ← Voltar
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 26 }}>{emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeDisplay}</div>
            {eq.nome !== nomeDisplay && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.65)', marginTop: 2 }}>{eq.nome}</div>
            )}
          </div>
          <button
            disabled
            title="Disponível em breve"
            style={{ opacity: 0.4, cursor: 'not-allowed', background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 12 }}
          >
            editar
          </button>
        </div>
        {/* Badges */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          <Badge label={CATEGORIA_LABEL[eq.categoria] || eq.categoria} />
          {eq.estado && (
            <Badge
              label={ESTADO_LABEL[eq.estado] || eq.estado}
              bg={estadoColor + '30'}
              color={estadoColor}
            />
          )}
          {dadosIa.confianca_identificacao && (
            <Badge
              label={`IA: ${dadosIa.confianca_identificacao}`}
              bg="rgba(255,255,255,.12)"
              color="rgba(255,255,255,.8)"
            />
          )}
        </div>
      </div>

      {/* Foto */}
      {fotoUrl ? (
        <div style={{ background: '#000', maxHeight: 280, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <img src={fotoUrl} alt={eq.nome} style={{ width: '100%', maxHeight: 280, objectFit: 'cover' }} />
        </div>
      ) : (
        <div style={{ background: C.border, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 24 }}>{emoji}</span>
          <span style={{ fontSize: 12, color: C.slate }}>sem foto registada</span>
        </div>
      )}

      {/* Identificação */}
      <Section title="Identificação">
        <Row label="Nome"    value={eq.nome} />
        <Row label="Marca"   value={eq.marca} />
        <Row label="Modelo"  value={eq.modelo} />
        <Row label="Nº série" value={eq.numero_serie} />
        {eq.localizacao_imovel && (
          <Row label="Zona"
            value={(eq.localizacao_imovel.charAt(0).toUpperCase() + eq.localizacao_imovel.slice(1)).replace(/_/g, ' ')}
          />
        )}
        {locLabel && <Row label="Imóvel" value={locLabel} />}
        {loc?.tipologia && <Row label="Tipologia" value={loc.tipologia.toUpperCase()} />}
      </Section>

      {/* Datas */}
      {hasDateSection && (
        <Section title="Datas & Histórico">
          {eq.data_instalacao ? (
            <Row
              label="Instalação"
              value={fmtDateShort(eq.data_instalacao)}
              note={
                dadosIa.data_instalacao_precisao === 'estimated' ? '(estimada)' :
                dadosIa.data_instalacao_precisao === 'year_only'  ? '(só ano)'  : null
              }
            />
          ) : dadosIa.idade_estimada_anos != null ? (
            <Row label="Idade estimada" value={`~${dadosIa.idade_estimada_anos} anos`} note="(visual)" />
          ) : null}
          {eq.data_garantia_fim && (
            <Row
              label="Garantia até"
              value={fmtDate(eq.data_garantia_fim)}
              expired={isExpired(eq.data_garantia_fim)}
            />
          )}
          {eq.data_ultima_revisao  && <Row label="Última revisão"  value={fmtDate(eq.data_ultima_revisao)} />}
          {eq.data_proxima_revisao && <Row label="Próxima revisão" value={fmtDate(eq.data_proxima_revisao)} />}
        </Section>
      )}

      {/* Anomalias */}
      {issues.length > 0 && (
        <Section title="Anomalias detectadas">
          {issues.map((issue, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 0',
              borderBottom: i < issues.length - 1 ? `1px solid ${C.border}` : 'none',
            }}>
              <span style={{ fontSize: 14 }}>⚠️</span>
              <span style={{ fontSize: 14, color: C.ink }}>{issueLabel(issue)}</span>
            </div>
          ))}
        </Section>
      )}

      {/* Energia */}
      {hasEnergiaSection && (
        <Section title="Energia">
          <Row label="Classe"          value={eq.classe_energetica} />
          <Row label="Potência"        value={eq.potencia_kw          ? `${eq.potencia_kw} kW`       : null} />
          <Row label="Consumo estimado" value={eq.consumo_estimado_kwh_mes ? `${eq.consumo_estimado_kwh_mes} kWh/mês` : null} />
        </Section>
      )}

      {/* Notas */}
      {eq.notas && (
        <Section title="Notas">
          <p style={{ margin: 0, fontSize: 14, color: C.ink, lineHeight: 1.5 }}>{eq.notas}</p>
        </Section>
      )}

      {/* Inspecção IA */}
      {dadosIa.agente_inspecao_em && (
        <Section title="Inspecção IA">
          <Row label="Data"   value={fmtDate(dadosIa.agente_inspecao_em)} />
          <Row label="Sessão" value={typeof dadosIa.agente_inspecao_session_id === 'string' ? dadosIa.agente_inspecao_session_id.slice(0, 8) + '…' : null} />
          {Array.isArray(dadosIa.agente_inspecao_history) && dadosIa.agente_inspecao_history.length > 0 && (
            <Row label="Inspecções" value={`${dadosIa.agente_inspecao_history.length + 1} no total`} />
          )}
        </Section>
      )}

      {/* Acções */}
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
          🗑️ Remover equipamento
        </button>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ background: C.white, margin: '12px 16px', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
      <div style={{ padding: '10px 16px 8px', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.slate, fontFamily: 'JetBrains Mono, monospace' }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '4px 16px 10px' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, note, expired }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 12, color: C.slate, minWidth: 115, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 14, color: expired ? C.red : C.ink }}>
        {value}
        {note && <span style={{ fontSize: 11, color: C.slate, marginLeft: 6 }}>{note}</span>}
      </span>
    </div>
  )
}

function Badge({ label, bg = 'rgba(255,255,255,.18)', color = '#fff' }) {
  return (
    <span style={{
      background: bg, color,
      borderRadius: 6, padding: '3px 10px',
      fontSize: 11, fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {label}
    </span>
  )
}

function LoadingView({ onBack }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Outfit, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ background: C.forestGrad, color: '#fff', padding: '14px 16px 16px' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', cursor: 'pointer' }} onClick={onBack}>
          ← Voltar
        </div>
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
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', cursor: 'pointer' }} onClick={onBack}>
          ← Voltar
        </div>
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
