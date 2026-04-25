import React from 'react'

const P = '#534AB7'; const PD = '#3D35A0'
const C = {
  ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
  purpleLt:'#EEEDFE', amber:'#F59E0B', amberLt:'#FAEEDA',
  green:'#1B4332', greenLt:'#52B788', greenXl:'#D8F3DC',
}

const COMO_FUNCIONA = [
  { n:'1', t:'Descreve o projecto', s:'Fotos, vídeos, orçamentos anteriores. Até 3 áreas de trabalho.' },
  { n:'2', t:'Escolhe como recebes orçamentos', s:'Videochamada, só online, ou vistoria agendada. Podes escolher várias.' },
  { n:'3', t:'Recebe até 10 propostas', s:'Compara preços, ratings, histórico. Sem compromisso.' },
  { n:'4', t:'Escolhes e arrancas', s:'Tudo registado. Chat e pagamento seguros na app.' },
]

const BADGES = [
  { ic:'✅', t:'Técnicos verificados', s:'NIF + seguro + 4.5★ mín' },
  { ic:'💰', t:'Preços transparentes', s:'Sem surpresas · tudo na app' },
  { ic:'⚡', t:'Respostas rápidas', s:'Primeiro orçamento em ~2h' },
  { ic:'🛡️', t:'Qualidade garantida', s:'Reparação grátis se falhar' },
]

const EXEMPLOS = ['Obra cozinha','Reabilitação','Mudança casa','Impermeab. telhado','Pintura exterior','Pest control','Janelas','Isolamento','Fossa séptica','AVAC completo','Piscina nova','Segurança']

export default function OrcamentosLandingScreen({ onBack, onIniciar }) {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', paddingBottom: 80 }}>
      {/* Header gradient roxo */}
      <div style={{ background: `linear-gradient(135deg,${PD},${P})`, padding: '12px 16px 22px', color: '#fff' }}>
        <div style={{ fontSize: 10, opacity: .7, cursor: 'pointer', marginBottom: 10 }} onClick={onBack}>← Serviços</div>
        <div style={{ fontSize: 9, color: '#FFD166', fontWeight: 700, letterSpacing: .6, marginBottom: 5 }}>📋 ORÇAMENTOS À MEDIDA</div>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Georgia,serif', lineHeight: 1.2, marginBottom: 6 }}>
          Descreve o trabalho.<br />Recebe propostas.
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', lineHeight: 1.5 }}>
          Para projectos complexos, obras grandes ou situações fora do catálogo.
        </div>
      </div>

      {/* Como funciona */}
      <div style={{ margin: '-14px 12px 0', background: C.white, borderRadius: 14, padding: '14px', boxShadow: '0 4px 12px rgba(0,0,0,.06)', border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 11 }}>Como funciona</div>
        {COMO_FUNCIONA.map((p, i, arr) => (
          <div key={i} style={{ display: 'flex', gap: 11, marginBottom: i < arr.length - 1 ? 10 : 0 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: P, color: '#fff', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{p.n}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{p.t}</div>
              <div style={{ fontSize: 11, color: C.slate, marginTop: 2, lineHeight: 1.5 }}>{p.s}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Badges garantia */}
      <div style={{ padding: '12px 12px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {BADGES.map(b => (
          <div key={b.t} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 11px' }}>
            <div style={{ fontSize: 18, marginBottom: 3 }}>{b.ic}</div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>{b.t}</div>
            <div style={{ fontSize: 10, color: C.slate, marginTop: 1, lineHeight: 1.3 }}>{b.s}</div>
          </div>
        ))}
      </div>

      {/* Exemplos */}
      <div style={{ padding: '14px 12px 4px', fontSize: 12, fontWeight: 700, fontFamily: 'Georgia,serif' }}>Tipo de pedidos à medida</div>
      <div style={{ padding: '0 12px', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {EXEMPLOS.map(e => (
          <div key={e} style={{ fontSize: 10.5, padding: '5px 11px', borderRadius: 14, background: C.bg, border: `1px solid ${C.border}`, color: C.slate, fontWeight: 600 }}>{e}</div>
        ))}
      </div>

      {/* Review */}
      <div style={{ padding: '14px 12px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'Georgia,serif' }}>⭐ O que dizem os clientes</div>
        <div style={{ fontSize: 10, color: C.greenLt, fontWeight: 700 }}>Ver todas →</div>
      </div>
      <div style={{ margin: '0 12px', background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: '11px 13px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E57373', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>RM</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>Rita Martins · Coimbra</div>
            <div style={{ fontSize: 10, color: C.amber }}>{'★'.repeat(5)}</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: C.slate, lineHeight: 1.5 }}>
          "Remodelei a cozinha. Recebi 6 orçamentos em 48h, escolhi o melhor. O técnico já chegou com o plano todo na app, não tive de explicar nada."
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '14px 12px 4px' }}>
        <button
          onClick={onIniciar}
          style={{ width: '100%', padding: 13, borderRadius: 12, background: P, color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(83,74,183,.3)' }}
        >
          Começar · Orçamentos grátis ↗
        </button>
        <div style={{ textAlign: 'center', fontSize: 10, color: C.slate, marginTop: 8 }}>Sem compromisso · Compara · Decide</div>
      </div>
    </div>
  )
}
