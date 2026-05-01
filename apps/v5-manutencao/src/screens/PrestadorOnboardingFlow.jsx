/**
 * PrestadorOnboardingFlow — Sprint 1D Receipt Trojan Horse
 * Wrapper público (sem auth) que guia o prestador por 4 ecrãs:
 *   landing → step1 → step2 → step3 → success | error
 *
 * Montado em App.jsx ANTES do guard de auth, quando o pathname
 * corresponde a /join/{64hex} (magic link gerado por gerar-magic-link edge fn).
 */
import React, { useState, useEffect } from 'react'
import { SUPABASE_URL, SUPABASE_ANON_KEY, supaPublic } from '../supa'
import ReceiptLandingScreen from '../components/prestador/ReceiptLandingScreen'
import PrestadorStep1 from '../components/prestador/PrestadorStep1'
import PrestadorStep2 from '../components/prestador/PrestadorStep2'
import PrestadorStep3 from '../components/prestador/PrestadorStep3'
import PrestadorSuccess from '../components/prestador/PrestadorSuccess'
import PrestadorError from '../components/prestador/PrestadorError'

const INITIAL_FORM = {
  nome_completo: '',
  nif: '',
  telefone: '',
  morada: '',
  email: '',
  confirmacao_valor: false,
}

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function PrestadorOnboardingFlow({ token }) {
  const [stage, setStage] = useState('loading')
  const [linkInfo, setLinkInfo] = useState(null)
  const [errorState, setErrorState] = useState(null)
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [reciboId, setReciboId] = useState(null)

  useEffect(() => {
    async function resolveLink() {
      if (!token || !/^[0-9a-f]{64}$/.test(token)) {
        setErrorState({ code: 'token_not_found' })
        setStage('error')
        return
      }
      try {
        const _tokenHash = await sha256Hex(token)

        const { data, error: rpcErr } = await supaPublic
          .schema('v5_manutencao')
          .rpc('get_magic_link_public_info', { p_token_hash: _tokenHash })
        if (rpcErr) {
          setErrorState({ code: 'network', message: rpcErr.message })
          setStage('error')
          return
        }
        if (data?.error === 'not_found') { setErrorState({ code: 'token_not_found' }); setStage('error'); return }
        if (data?.error === 'used') { setErrorState({ code: 'token_used' }); setStage('error'); return }
        if (data?.error === 'expired') { setErrorState({ code: 'token_expired' }); setStage('error'); return }
        setLinkInfo(data)
        setStage('landing')
      } catch (e) {
        setErrorState({ code: 'network', message: e.message })
        setStage('error')
      }
    }
    resolveLink()
  }, [token])

  async function submitOnboarding() {
    setStage('submitting')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/prestador-onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          token_clear: token,
          prestador_data: {
            nome_completo: formData.nome_completo,
            nif: formData.nif,
            telefone: formData.telefone,
            morada: formData.morada || null,
            email: formData.email || null,
            confirmacao_valor: formData.confirmacao_valor,
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setReciboId(data.recibo_id)
        setStage('success')
        return
      }
      // Map HTTP status + code to error state
      let code = data?.code || 'unknown'
      if (res.status === 404) code = 'token_not_found'
      else if (res.status === 410) code = code || 'token_used'
      setErrorState({ code, message: data?.error, status: res.status })
      setStage('error')
    } catch (e) {
      setErrorState({ code: 'network', message: e.message })
      setStage('error')
    }
  }

  if (stage === 'loading' || stage === 'submitting') {
    return (
      <div style={{ minHeight: '100vh', background: '#FAFAF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#6B7685', fontFamily: 'Outfit, sans-serif' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⟳</div>
          <div style={{ fontSize: 14 }}>{stage === 'submitting' ? 'A emitir recibo…' : 'A carregar…'}</div>
        </div>
      </div>
    )
  }

  if (stage === 'error') return <PrestadorError errorState={errorState} />

  if (stage === 'landing') {
    return <ReceiptLandingScreen linkInfo={linkInfo} onAccept={() => setStage('step1')} />
  }

  if (stage === 'step1') {
    return <PrestadorStep1 data={formData} onChange={setFormData} onNext={() => setStage('step2')} />
  }

  if (stage === 'step2') {
    return (
      <PrestadorStep2
        data={formData}
        onChange={setFormData}
        onNext={() => setStage('step3')}
        onSkip={() => setStage('step3')}
        onBack={() => setStage('step1')}
      />
    )
  }

  if (stage === 'step3') {
    return (
      <PrestadorStep3
        data={formData}
        linkInfo={linkInfo}
        onChange={setFormData}
        onSubmit={submitOnboarding}
        onBack={() => setStage('step2')}
      />
    )
  }

  if (stage === 'success') {
    return <PrestadorSuccess reciboId={reciboId} prestadorNome={formData.nome_completo} />
  }

  return null
}
