import React, { useState, useEffect } from 'react'
import { supa } from '../supa.js'

const G = '#1B4332'; const GM = '#2D6A4F'
const P = '#534AB7'; const PLt = '#EEEDFE'
const C = {
  ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
  greenXl:'#D8F3DC', greenLt:'#52B788',
}

function tempoRestante(iso) {
  if (!iso) return ''
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'Expirado'
  const h = Math.floor(ms / 3600000)
  if (h < 24) return `${h}h restantes`
  return `${Math.floor(h / 24)}d restantes`
}

function Skel() {
  return <div style={{ height:120, borderRadius:12, background:'#e8ece9', marginBottom:10, animation:'pulse 1.4s ease-in-out infinite' }} />
}

export default function OrcamentoDetalheScreen({ orcamentoId, onBack }) {
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [orc,      setOrc]      = useState(null)
  const [propostas, setPropostas] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!orcamentoId) { setLoading(false); return }
    let active = true

    async function load() {
      const [pedRes, propRes] = await Promise.all([
        supa.from('pedidos_orcamento')
          .select('*')
          .eq('id', orcamentoId)
          .single(),
        supa.from('orcamentos_recebidos')
          .select('*, prestadores(nome, iniciais, rating_medio, aprovado)')
          .eq('pedido_id', orcamentoId)
          .order('valor', { ascending: true }),
      ])
      if (!active) return
      setOrc(pedRes.data || null)
      setPropostas(propRes.data || [])
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [orcamentoId])

  if (loading) return (
    <div style={{ minHeight:'100vh', background:C.bg, padding:'16px 14px' }}>
      <Skel /><Skel /><Skel />
    </div>
  )

  if (!orc) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:10 }}>🔍</div>
        <div style={{ color:C.slate, fontSize:13 }}>Orçamento não encontrado</div>
        <button onClick={onBack} style={{ marginTop:14, padding:'9px 20px', borderRadius:9, background:G, color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer' }}>Voltar</button>
      </div>
    </div>
  )

  const propostas_alvo = orc.n_orcamentos_esperados || 3
  const propostas_recv = orc.propostas_recebidas || propostas.length
  const progresso = Math.min(100, Math.round((propostas_recv / propostas_alvo) * 100))
  const fotos_count = (orc.fotos_urls || []).length

  const estadoLabel = {
    aberto:     'AGUARDA PROPOSTAS',
    em_cotacao: 'EM COTAÇÃO',
    cotado:     'COTADO',
    aceite:     'ACEITE',
    cancelado:  'CANCELADO',
    expirado:   'EXPIRADO',
  }[orc.estado] || orc.estado?.toUpperCase()

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:40 }}>

      {/* ── Header ── */}
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 20px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:10 }} onClick={onBack}>← Voltar</div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <div style={{ fontSize:9, background:'rgba(255,255,255,.18)', color:'#fff', padding:'3px 9px', borderRadius:5, fontWeight:700, letterSpacing:.3 }}>
            📋 ORÇAMENTOS À MEDIDA
          </div>
          <div style={{ fontSize:9, background:'rgba(255,255,255,.12)', color:'rgba(255,255,255,.85)', padding:'3px 9px', borderRadius:5, fontWeight:700 }}>
            ⏳ {estadoLabel}
          </div>
        </div>
        <div style={{ fontSize:20, fontWeight:700, fontFamily:'Georgia,serif', lineHeight:1.2, marginBottom:6 }}>{orc.titulo || orc.areas?.join(', ') || 'Orçamento'}</div>

        {/* Barra de progresso */}
        <div style={{ background:'rgba(255,255,255,.2)', borderRadius:4, height:5, overflow:'hidden', marginBottom:4 }}>
          <div style={{ width:`${progresso}%`, height:'100%', background:'#fff', borderRadius:4 }}/>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(255,255,255,.75)' }}>
          <span>{propostas_recv} de {propostas_alvo} propostas recebidas</span>
          <span>{tempoRestante(orc.data_limite)}</span>
        </div>
      </div>

      <div style={{ padding:'12px 14px 0' }}>

        {/* ── Descrição ── */}
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:'13px 14px', marginBottom:10 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.ink, marginBottom:6 }}>📝 Descrição do pedido</div>
          <div style={{ fontSize:12, color:C.slate, lineHeight:1.6 }}>{orc.descricao}</div>
          {orc.formatos && orc.formatos.length > 0 && (
            <div style={{ display:'flex', gap:6, marginTop:9, flexWrap:'wrap' }}>
              {orc.formatos.map(f => (
                <span key={f} style={{ fontSize:10, background:PLt, color:P, padding:'3px 8px', borderRadius:5, fontWeight:700 }}>
                  {f === 'instant' ? '⚡ Instantâneo' : f === 'online' ? '💻 Online' : '📅 Vistoria'}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Fotos ── */}
        {fotos_count > 0 && (
          <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:'13px 14px', marginBottom:10 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.ink, marginBottom:8 }}>📸 Fotos ({fotos_count})</div>
            <div style={{ display:'flex', gap:8 }}>
              {[...Array(fotos_count)].map((_, i) => (
                <div key={i} style={{ width:70, height:70, borderRadius:9, background:'#f0f0f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, border:`1px solid ${C.border}` }}>🏠</div>
              ))}
            </div>
          </div>
        )}

        {/* ── Propostas ── */}
        <div style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:8 }}>
          💼 Propostas recebidas ({propostas.length})
        </div>
        {propostas.length === 0 ? (
          <div style={{ background:C.white, border:`1px dashed ${C.border}`, borderRadius:12, padding:'24px 16px', textAlign:'center', marginBottom:10 }}>
            <div style={{ fontSize:28, marginBottom:6 }}>⏳</div>
            <div style={{ fontSize:12, fontWeight:700, color:C.ink }}>A aguardar propostas</div>
            <div style={{ fontSize:11, color:C.slate, marginTop:3 }}>Os profissionais têm até 24h para responder</div>
          </div>
        ) : propostas.map(prop => {
          const p = prop.prestadores || {}
          const iniciais = p.iniciais || (p.nome ? p.nome.split(' ').map(w=>w[0]).slice(0,2).join('') : '?')
          return (
            <div key={prop.id} style={{ background:C.white, border:`1px solid ${C.border}`, borderLeft:`4px solid ${G}`, borderRadius:12, padding:'13px 14px', marginBottom:9 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:`linear-gradient(135deg,${G},${GM})`, color:'#fff', fontWeight:700, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {iniciais}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:C.ink }}>{p.nome || 'Prestador'}</span>
                    {p.aprovado && <span style={{ fontSize:9, background:C.greenXl, color:G, padding:'2px 6px', borderRadius:4, fontWeight:700 }}>✓ Verificado</span>}
                  </div>
                  {p.rating_medio != null && (
                    <div style={{ fontSize:10, color:'#F59E0B' }}>{'★'.repeat(Math.round(p.rating_medio))} <span style={{ color:C.slate }}>{Number(p.rating_medio).toFixed(1)}</span></div>
                  )}
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:18, fontWeight:800, color:G }}>{Number(prop.valor || 0).toLocaleString('pt-PT')}€</div>
                  {prop.tempo_dias && <div style={{ fontSize:10, color:C.slate }}>{prop.tempo_dias} dias úteis</div>}
                </div>
              </div>
              {prop.descricao_curta && (
                <div style={{ fontSize:11, color:C.slate, lineHeight:1.5, marginBottom:9 }}>{prop.descricao_curta}</div>
              )}
              {prop.garantia_meses && (
                <div style={{ fontSize:10, color:G, fontWeight:700, marginBottom:9 }}>🛡️ Garantia {prop.garantia_meses} meses</div>
              )}
              <div style={{ display:'flex', gap:8 }}>
                <button style={{ flex:1, padding:'9px', background:G, color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  Aceitar proposta
                </button>
                <button style={{ flex:1, padding:'9px', background:C.white, color:C.ink, border:`1px solid ${C.border}`, borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  Ver detalhes
                </button>
              </div>
            </div>
          )
        })}

        {/* ── Cronologia ── */}
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:'13px 14px', marginBottom:10 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.ink, marginBottom:10 }}>📋 Cronologia</div>
          {[
            { ic:'✅', l:'Pedido enviado', t: new Date(orc.created_at).toLocaleDateString('pt-PT', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }), done:true },
            { ic:'📬', l:`${propostas_recv} proposta${propostas_recv !== 1 ? 's' : ''} recebida${propostas_recv !== 1 ? 's' : ''}`, t:'Em progresso', done: propostas_recv > 0 },
            { ic:'🤝', l:'Aceitar proposta', t:'Pendente', done: orc.estado === 'aceite' },
            { ic:'🏠', l:'Trabalho concluído', t:'Pendente', done: !!orc.concluido_em },
          ].map((step, i) => (
            <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom: i < 3 ? 10 : 0 }}>
              <div style={{ width:24, height:24, borderRadius:'50%', background: step.done ? C.greenXl : '#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0, marginTop:1 }}>{step.ic}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, fontWeight: step.done ? 700 : 600, color: step.done ? C.ink : C.slate }}>{step.l}</div>
                <div style={{ fontSize:10, color:C.slate }}>{step.t}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Zona perigosa ── */}
        {orc.estado !== 'cancelado' && orc.estado !== 'aceite' && (
          !cancelConfirm ? (
            <button
              onClick={() => setCancelConfirm(true)}
              style={{ width:'100%', background:'none', border:`1px solid #FCA5A5`, color:'#DC2626', borderRadius:10, padding:'11px', fontSize:12, fontWeight:700, cursor:'pointer', marginBottom:4 }}
            >
              Cancelar pedido
            </button>
          ) : (
            <div style={{ background:'#FEF2F2', border:`1px solid #FCA5A5`, borderRadius:12, padding:'14px', marginBottom:4 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#DC2626', marginBottom:6 }}>Confirmar cancelamento?</div>
              <div style={{ fontSize:11, color:C.slate, marginBottom:10 }}>Os profissionais que já responderam serão notificados.</div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setCancelConfirm(false)} style={{ flex:1, padding:'9px', background:C.white, color:C.ink, border:`1px solid ${C.border}`, borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>Manter</button>
                <button style={{ flex:1, padding:'9px', background:'#DC2626', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>Cancelar pedido</button>
              </div>
            </div>
          )
        )}

      </div>
    </div>
  )
}
