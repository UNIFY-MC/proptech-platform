import { useState, useRef, useEffect } from 'react'
import { compressImage } from '../lib/imageCompression'
import { supa } from '../supa'

const G = '#0B3D2E'
const C = {
  ink:     '#0A1620',
  slate:   '#6B7685',
  border:  '#ECE9E2',
  bg:      '#FAFAF6',
  white:   '#FFFFFF',
  emerald: '#10B981',
  emeraldDark: '#059669',
  emeraldSoft: '#D1FAE5',
  emeraldPale: '#ECFDF5',
  amber:   '#F59E0B',
  amberSoft: '#FEF3C7',
  red:     '#DC2626',
  redSoft: '#FEF2F2',
}

const STATES = {
  INITIAL:       'initial',
  CAMERA_ACTIVE: 'camera_active',
  PREVIEW:       'preview',
  ANALYZING:     'analyzing',
  RESULT:        'result',
  ERROR:         'error',
}

const LOADING_MESSAGES = [
  'a comprimir foto...',
  'a enviar para análise...',
  'a identificar equipamento...',
  'a procurar serviços relacionados...',
  'quase pronto...',
]

const CATEGORIA_EMOJI = {
  aquecimento:    '🔥',
  climatizacao:   '❄️',
  aguas_quentes:  '🚿',
  canalizacao:    '🔧',
  eletrica:       '⚡',
  cobertura:      '🏠',
  estrutura:      '🏗️',
  piscina:        '🏊',
  solar:          '☀️',
  elevador:       '🛗',
  gerador:        '⚙️',
  eletrodomestico:'🫙',
  seguranca:      '🔒',
  outros:         '🔩',
}

function parseError(err) {
  const msg = err?.message || ''
  const status = err?.context?.status || err?.status

  if (status === 429 || msg.toLowerCase().includes('free tier') || msg.toLowerCase().includes('daily limit') || msg.toLowerCase().includes('monthly limit')) {
    return {
      titulo: 'limite de análises atingido',
      detalhe: 'já usaste as tuas análises gratuitas deste mês. faz upgrade para home+ para análises ilimitadas.',
      acção: 'upgrade',
    }
  }
  if (msg.toLowerCase().includes('não reconhecível') || msg.toLowerCase().includes('não é um equipamento') || msg.toLowerCase().includes('foto mais clara') || status === 422) {
    return {
      titulo: 'foto sem equipamento reconhecível',
      detalhe: 'não consegui identificar um equipamento nesta foto. tira uma foto mais próxima da etiqueta ou placa do equipamento.',
      acção: 'retry',
    }
  }
  if (status >= 500 || msg.toLowerCase().includes('server') || msg.toLowerCase().includes('edge function')) {
    return {
      titulo: 'erro de servidor',
      detalhe: 'ocorreu um problema no servidor. tenta novamente em alguns minutos.',
      acção: 'retry',
    }
  }
  return {
    titulo: 'não foi possível analisar',
    detalhe: msg || 'ocorreu um erro inesperado. tenta novamente.',
    acção: 'retry',
  }
}

export default function AdicionarCamaraScreen({ onBack, localizacaoId }) {
  const [uiState,        setUiState]        = useState(STATES.INITIAL)
  const [photoFile,      setPhotoFile]      = useState(null)
  const [photoPreview,   setPhotoPreview]   = useState(null)
  const [result,         setResult]         = useState(null)
  const [error,          setError]          = useState(null)
  const [loadingMsg,     setLoadingMsg]     = useState(LOADING_MESSAGES[0])
  const [canUseCamera,   setCanUseCamera]   = useState(false)

  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const fileInputRef = useRef(null)
  const streamRef   = useRef(null)

  useEffect(() => {
    setCanUseCamera(!!(navigator.mediaDevices?.getUserMedia))
  }, [])

  // Cleanup câmara ao sair
  useEffect(() => {
    return () => stopStream()
  }, [])

  // Loading messages rotativas
  useEffect(() => {
    if (uiState !== STATES.ANALYZING) return
    let i = 0
    setLoadingMsg(LOADING_MESSAGES[0])
    const id = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length
      setLoadingMsg(LOADING_MESSAGES[i])
    }, 5000)
    return () => clearInterval(id)
  }, [uiState])

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      setUiState(STATES.CAMERA_ACTIVE)
      // Dar tempo ao DOM para montar o <video>
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      }, 50)
    } catch {
      // Permissão negada ou câmara indisponível → abrir galeria
      fileInputRef.current?.click()
    }
  }

  function capture() {
    const v = videoRef.current
    const c = canvasRef.current
    if (!v || !c) return
    c.width  = v.videoWidth
    c.height = v.videoHeight
    c.getContext('2d').drawImage(v, 0, 0)
    c.toBlob(blob => {
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(blob))
      stopStream()
      setUiState(STATES.PREVIEW)
    }, 'image/jpeg', 0.92)
  }

  function onFileSelected(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setUiState(STATES.PREVIEW)
    // Reset input para permitir re-selecção do mesmo ficheiro
    e.target.value = ''
  }

  function retake() {
    setPhotoFile(null)
    setPhotoPreview(null)
    setUiState(STATES.INITIAL)
  }

  async function analyze() {
    if (!photoFile) return
    setUiState(STATES.ANALYZING)
    setError(null)
    try {
      const compressed = await compressImage(photoFile)
      const { data, error: fnErr } = await supa.functions.invoke('agent-image-inspector', {
        body: {
          base64Image:   compressed.base64,
          mimeType:      compressed.mimeType,
          ...(localizacaoId ? { localizacaoId } : {}),
        },
      })
      if (fnErr) throw fnErr
      if (!data?.success) throw new Error(data?.error || 'agente retornou erro')

      // Fetch equipamento rico da BD (o agente criou/actualizou)
      let equipamento = null
      if (data.equipamento_id) {
        const { data: eq } = await supa
          .from('equipamentos')
          .select('id, categoria, nome, marca, modelo, localizacao_imovel, dados_ia, data_instalacao')
          .eq('id', data.equipamento_id)
          .maybeSingle()
        equipamento = eq
      }

      setResult({ ...data, equipamento })
      setUiState(STATES.RESULT)
    } catch (e) {
      console.error('[AdicionarCamaraScreen] analyze error:', e)
      setError(e)
      setUiState(STATES.ERROR)
    }
  }

  function resetToInitial() {
    setPhotoFile(null)
    setPhotoPreview(null)
    setResult(null)
    setError(null)
    setUiState(STATES.INITIAL)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(145deg,${G},#164E3A)`, padding: '14px 16px 22px', color: '#fff' }}>
        <div
          style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', cursor: 'pointer', marginBottom: 12 }}
          onClick={() => { stopStream(); onBack?.() }}
        >
          ← Voltar
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>📸</span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Registar equipamento</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>
              Tira uma foto — a IA identifica e regista automaticamente
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {uiState === STATES.INITIAL    && <StateInitial    localizacaoId={localizacaoId} canUseCamera={canUseCamera} onOpenCamera={openCamera} onOpenGallery={() => fileInputRef.current?.click()} />}
        {uiState === STATES.CAMERA_ACTIVE && <StateCameraActive videoRef={videoRef} onCapture={capture} onCancel={() => { stopStream(); setUiState(STATES.INITIAL) }} />}
        {uiState === STATES.PREVIEW    && <StatePreview    preview={photoPreview} onRetake={retake} onAnalyze={analyze} />}
        {uiState === STATES.ANALYZING  && <StateAnalyzing  message={loadingMsg} />}
        {uiState === STATES.RESULT     && <StateResult     result={result} onAddAnother={resetToInitial} />}
        {uiState === STATES.ERROR      && <StateError      error={error} onRetry={() => { setUiState(STATES.PREVIEW) }} />}
      </div>

      {/* Inputs ocultos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onFileSelected}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

// ── Sub-estados ───────────────────────────────────────────────────────────────

function StateInitial({ localizacaoId, canUseCamera, onOpenCamera, onOpenGallery }) {
  const semImovel = !localizacaoId

  return (
    <div>
      {semImovel ? (
        <div style={{ background: C.amberSoft, border: `1px solid ${C.amber}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400E' }}>
          ⚠ Nenhum imóvel activo. Vai primeiro a <strong>Moradas</strong> e selecciona um imóvel.
        </div>
      ) : null}

      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: C.slate, marginBottom: 16, lineHeight: 1.5 }}>
          Tira uma foto da etiqueta ou placa do equipamento. A IA identifica marca, modelo, estado e sugere serviços adequados.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            onClick={onOpenCamera}
            disabled={semImovel || !canUseCamera}
            style={{
              padding: '18px 12px', borderRadius: 12, border: `1px solid ${C.border}`,
              background: (semImovel || !canUseCamera) ? C.bg : C.white,
              color: (semImovel || !canUseCamera) ? C.slate : C.ink,
              cursor: (semImovel || !canUseCamera) ? 'not-allowed' : 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              fontSize: 13, fontWeight: 600,
              opacity: (semImovel || !canUseCamera) ? 0.5 : 1,
            }}
          >
            <span style={{ fontSize: 28 }}>📷</span>
            câmara
          </button>

          <button
            onClick={onOpenGallery}
            disabled={semImovel}
            style={{
              padding: '18px 12px', borderRadius: 12, border: `1px solid ${C.border}`,
              background: semImovel ? C.bg : C.white,
              color: semImovel ? C.slate : C.ink,
              cursor: semImovel ? 'not-allowed' : 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              fontSize: 13, fontWeight: 600,
              opacity: semImovel ? 0.5 : 1,
            }}
          >
            <span style={{ fontSize: 28 }}>🖼</span>
            galeria
          </button>
        </div>
      </div>

      <div style={{ background: C.emeraldPale, border: `1px solid ${C.emeraldSoft}`, borderRadius: 10, padding: '10px 14px', fontSize: 11.5, color: C.emeraldDark, lineHeight: 1.5 }}>
        💡 funciona melhor com foto nítida da etiqueta. equipamento identificado em segundos.
      </div>
    </div>
  )
}

function StateCameraActive({ videoRef, onCapture, onCancel }) {
  return (
    <div>
      <div style={{ background: C.ink, borderRadius: 14, overflow: 'hidden', marginBottom: 16, aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>

      <button
        onClick={onCapture}
        style={{
          width: '100%', padding: 16, borderRadius: 12, border: 'none',
          background: C.emerald, color: '#fff', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', marginBottom: 10,
        }}
      >
        ● capturar foto
      </button>

      <button
        onClick={onCancel}
        style={{
          width: '100%', padding: 12, borderRadius: 12, border: `1px solid ${C.border}`,
          background: C.white, color: C.slate, fontSize: 13, cursor: 'pointer',
        }}
      >
        cancelar
      </button>
    </div>
  )
}

function StatePreview({ preview, onRetake, onAnalyze }) {
  return (
    <div>
      <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 16, background: C.ink }}>
        <img
          src={preview}
          alt="Preview da foto"
          style={{ width: '100%', display: 'block', maxHeight: 360, objectFit: 'contain' }}
        />
      </div>

      <button
        onClick={onAnalyze}
        style={{
          width: '100%', padding: 16, borderRadius: 12, border: 'none',
          background: G, color: '#fff', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', marginBottom: 10,
        }}
      >
        analisar com IA →
      </button>

      <button
        onClick={onRetake}
        style={{
          width: '100%', padding: 12, borderRadius: 12, border: `1px solid ${C.border}`,
          background: C.white, color: C.slate, fontSize: 13, cursor: 'pointer',
        }}
      >
        repetir foto
      </button>
    </div>
  )
}

function StateAnalyzing({ message }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 400)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ textAlign: 'center', padding: '48px 16px' }}>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
        {[0, 1, 2].map(i => {
          const active = tick % 9 >= i * 3 && tick % 9 < i * 3 + 3
          return (
            <div key={i} style={{
              width: 12, height: 12, borderRadius: '50%',
              background: C.emeraldDark,
              opacity: active ? 1 : 0.25,
              transform: active ? 'translateY(-6px)' : 'translateY(0)',
              transition: 'transform 0.2s ease, opacity 0.2s ease',
            }} />
          )
        })}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 8 }}>
        a analisar...
      </div>
      <div style={{ fontSize: 12, color: C.slate }}>{message}</div>
    </div>
  )
}

function StateResult({ result, onAddAnother }) {
  const eq      = result?.equipamento || {}
  const dadosIa = eq.dados_ia || {}
  const issues  = dadosIa.issues_detectados || []
  const emoji   = CATEGORIA_EMOJI[eq.categoria] || '🔩'

  // Nome display: "Marca Modelo" se existirem, senão eq.nome
  const nomeDisplay = [eq.marca, eq.modelo].filter(Boolean).join(' ') || eq.nome || 'equipamento identificado'

  return (
    <div>
      <div style={{ background: C.emeraldPale, border: `1px solid ${C.emeraldSoft}`, borderRadius: 14, padding: '16px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.emeraldDark, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.6 }}>
          ✅ equipamento registado
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
          <span style={{ fontSize: 32 }}>{emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{nomeDisplay}</div>
            {eq.categoria && (
              <div style={{ fontSize: 11, color: C.slate, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                {eq.categoria.replace(/_/g, ' ')}
              </div>
            )}
            {eq.localizacao_imovel && (
              <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>
                📍 {(eq.localizacao_imovel.charAt(0).toUpperCase() + eq.localizacao_imovel.slice(1)).replace(/_/g, ' ')}
              </div>
            )}
          </div>
        </div>

        {dadosIa.confianca_identificacao && (
          <div style={{ fontSize: 11, color: C.slate, marginBottom: 4 }}>
            confiança: {dadosIa.confianca_identificacao}
          </div>
        )}

        {dadosIa.data_instalacao_precisao !== 'estimated' && eq.data_instalacao && (
          <div style={{ fontSize: 11, color: C.slate, marginBottom: 4 }}>
            instalado: {eq.data_instalacao.slice(0, 7)}
          </div>
        )}
        {dadosIa.data_instalacao_precisao === 'estimated' && dadosIa.idade_estimada_anos != null && (
          <div style={{ fontSize: 11, color: C.slate, marginBottom: 4 }}>
            idade estimada: ~{dadosIa.idade_estimada_anos} anos
          </div>
        )}

        {issues.length > 0 && (
          <div style={{ background: C.amberSoft, border: `1px solid ${C.amber}`, borderRadius: 8, padding: '8px 12px', marginTop: 8, fontSize: 12, color: '#92400E' }}>
            ⚠ {issues.length} problema{issues.length > 1 ? 's' : ''} detectado{issues.length > 1 ? 's' : ''}: {issues.join(', ')}
          </div>
        )}
      </div>

      <button
        disabled
        style={{
          width: '100%', padding: 14, borderRadius: 12, border: 'none',
          background: C.border, color: C.slate, fontSize: 14, fontWeight: 600,
          cursor: 'not-allowed', marginBottom: 10,
        }}
      >
        ver ficha completa → (em breve)
      </button>

      <button
        onClick={onAddAnother}
        style={{
          width: '100%', padding: 12, borderRadius: 12, border: `1px solid ${C.border}`,
          background: C.white, color: C.ink, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
      >
        adicionar outro equipamento
      </button>
    </div>
  )
}

function StateError({ error, onRetry }) {
  const parsed = parseError(error)

  return (
    <div>
      <div style={{ background: C.redSoft, border: `1px solid #FECACA`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 8 }}>
          ❌ {parsed.titulo}
        </div>
        <div style={{ fontSize: 12, color: '#7F1D1D', lineHeight: 1.5 }}>
          {parsed.detalhe}
        </div>
      </div>

      <button
        onClick={onRetry}
        style={{
          width: '100%', padding: 14, borderRadius: 12, border: 'none',
          background: G, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}
      >
        {parsed.acção === 'upgrade' ? 'ver planos →' : 'tentar novamente'}
      </button>
    </div>
  )
}
