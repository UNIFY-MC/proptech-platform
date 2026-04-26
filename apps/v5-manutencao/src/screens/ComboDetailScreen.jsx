import React, { useState, useEffect } from 'react'
import { supa } from '../supa.js'
import { useImovelAtivo } from '../lib/ImovelAtivoContext.jsx'
import { useEscolherImovel } from '../lib/useEscolherImovel.jsx'

const G = '#1B4332'; const GM = '#2D6A4F'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', gold:'#D4A72C', goldLt:'#FFF4D6' }

const COMBO_FALLBACK = {
  titulo:'Pack Inverno', sub:'Caldeira + caleiras + cobertura', emoji:'❄️',
  preco:'185€', precoOriginal:'229€', desconto:19,
  bg:'#E6F1FB', cor_texto:'#1B4332',
  servicos:[], poupanca:'44€',
}

const CAT_EMOJI = { limpeza:'✨', manutencao:'🔧', canalizacao:'💧', eletrica:'⚡', pintura:'🖌️', jardim:'🌿', piscina:'🏊', pos_obra:'🏗️' }

function precoFmt(v) {
  if (!v) return '—'
  return `€${Number(v).toFixed(0)}`
}

export default function ComboDetailScreen({ combo, onBack, onPedir, onNavigateServico, onNavigateMoradas }) {
  const [servicos, setServicos] = useState([])
  const [loading,  setLoading]  = useState(true)

  const cb = combo || COMBO_FALLBACK
  const { imovelAtivo, isGlobal, imoveis } = useImovelAtivo()
  const { escolher, sheet } = useEscolherImovel()

  // Carregar serviços do combo via combo_servicos JOIN catalogo_servicos
  useEffect(() => {
    if (!cb?.id) { setLoading(false); return }
    supa
      .from('combo_servicos')
      .select('ordem, servico:servico_id(id, nome, preco_base, duracao_tipica, descricao, imagem_url, categoria)')
      .eq('combo_id', cb.id)
      .order('ordem')
      .then(({ data }) => {
        setServicos(data?.map(d => d.servico).filter(Boolean) || [])
        setLoading(false)
      })
  }, [cb?.id])

  async function handlePedirCombo() {
    let imovelDestino = imovelAtivo
    if (isGlobal || imoveis.length > 1) {
      imovelDestino = await escolher({
        titulo: 'Para qual imóvel?',
        motivo: `Onde queres "${cb.titulo}"?`,
        onAdicionarImovel: onNavigateMoradas,
      })
      if (!imovelDestino) return
    }
    onPedir?.({ ...cb, localizacao_id: imovelDestino?.id })
  }

  // Cor do hero: usar cor_texto do BD (garante contraste em fundos claros)
  const heroBg     = cb.bg || cb.cor_hex || '#E6F1FB'
  const heroTxt    = cb.cor_texto || '#1B4332'
  const heroTxtSub = heroTxt === '#fff' ? 'rgba(255,255,255,0.75)' : `${heroTxt}bb`

  const poupanca = cb.poupanca
    || (cb.precoOriginal && cb.preco
        ? `${(parseFloat(String(cb.precoOriginal).replace('€','')) - parseFloat(String(cb.preco).replace('€',''))).toFixed(0)}€`
        : '—')

  return (
    <>
    {sheet}
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:110 }}>

      {/* Hero — imagem + fundo claro com texto escuro (cor_texto da BD) */}
      <div style={{ background: heroBg }}>
        {cb.imagem_url && (
          <div style={{ height:160, position:'relative', overflow:'hidden' }}>
            <img src={cb.imagem_url} alt={cb.titulo || cb.nome}
                 style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            <div style={{ position:'absolute', inset:0,
                          background:`linear-gradient(180deg, transparent 50%, ${heroBg}dd)` }} />
          </div>
        )}
        <div style={{ padding:'14px 16px 28px' }}>
        <div style={{ fontSize:10, color: heroTxtSub, cursor:'pointer', marginBottom:16 }} onClick={onBack}>← Voltar</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ flex:1, paddingRight:12 }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:.8, color: heroTxtSub, marginBottom:6 }}>COMBO</div>
            <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif', color: heroTxt, marginBottom:4, lineHeight:1.2 }}>
              {cb.emoji && <span style={{ marginRight:8 }}>{cb.emoji}</span>}{cb.titulo || cb.nome}
            </div>
            <div style={{ fontSize:13, color: heroTxtSub }}>{cb.sub || cb.descricao}</div>
          </div>
          <div style={{
            background:'rgba(0,0,0,0.08)', borderRadius:12, padding:'8px 14px',
            textAlign:'center', flexShrink:0,
          }}>
            <div style={{ fontSize:9, color: heroTxtSub, marginBottom:2 }}>POUPA</div>
            <div style={{ fontSize:22, fontWeight:800, color: heroTxt }}>-{cb.desconto}%</div>
          </div>
        </div>
        </div>
      </div>

      <div style={{ padding:'16px 14px 0' }}>

        {/* Inclui N serviços */}
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:.6, color:C.stone, textTransform:'uppercase', marginBottom:loading ? 8 : 12 }}>
            {loading ? 'A carregar serviços…' : `INCLUI ${servicos.length} SERVIÇO${servicos.length !== 1 ? 'S' : ''}`}
          </div>

          {!loading && servicos.length === 0 && (
            <div style={{ background:'#FCEBEB', border:'1px solid #F4C5C5', borderRadius:10, padding:'12px 14px', fontSize:11.5, color:'#A32D2D' }}>
              ⚠ Este combo está em configuração · contacta o suporte para agendar
            </div>
          )}

          {servicos.map((s, i) => {
            const emoji = CAT_EMOJI[s.categoria] || '🛠️'
            return (
              <div
                key={s.id}
                onClick={() => onNavigateServico?.(s)}
                style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'10px 0', cursor: onNavigateServico ? 'pointer' : 'default',
                  borderBottom: i < servicos.length-1 ? `1px solid ${C.line}` : 'none',
                }}
              >
                <div style={{
                  width:36, height:36, borderRadius:9, background:'#f5f5f3', flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
                }}>
                  {s.imagem_url
                    ? <img src={s.imagem_url} alt={s.nome} style={{ width:'100%', height:'100%', borderRadius:9, objectFit:'cover' }} />
                    : emoji
                  }
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:600, color:C.ink }}>{s.nome}</div>
                  <div style={{ fontSize:10, color:C.stone, marginTop:1 }}>
                    {s.duracao_tipica && `⏱ ${s.duracao_tipica}`}
                    {s.duracao_tipica && s.preco_base && ' · '}
                    {s.preco_base && `individual ${precoFmt(s.preco_base)}`}
                  </div>
                </div>
                <div style={{ fontSize:14, color:C.stone, flexShrink:0 }}>›</div>
              </div>
            )
          })}
        </div>

        {/* Poupança */}
        <div style={{ background:C.goldLt, border:`1px solid ${C.gold}44`, borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <span style={{ fontSize:28, flexShrink:0 }}>💰</span>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>
                Poupas {poupanca} vs comprar separadamente
              </div>
              <div style={{ fontSize:11, color:C.slate, marginTop:3 }}>
                Preço individual:{' '}
                <span style={{ textDecoration:'line-through' }}>{cb.precoOriginal || (cb.preco_normal && `€${Number(cb.preco_normal).toFixed(0)}`)}</span>
                {' · '}Combo:{' '}
                <b style={{ color:G }}>{cb.preco || (cb.preco_combo && `€${Number(cb.preco_combo).toFixed(0)}`)}</b>
              </div>
            </div>
          </div>
        </div>

        {/* Descrição longa */}
        {cb.descricao && cb.descricao.length > 30 && (
          <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:.7, color:C.stone, textTransform:'uppercase', marginBottom:8 }}>Sobre este pack</div>
            <div style={{ fontSize:12.5, color:C.slate, lineHeight:1.65 }}>{cb.descricao}</div>
          </div>
        )}

      </div>

      {/* CTA fixo */}
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, maxWidth:600, margin:'0 auto',
        padding:'12px 16px 24px', background:C.white, borderTop:`1px solid ${C.border}`,
        boxShadow:'0 -4px 16px rgba(0,0,0,0.08)',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div>
            <span style={{ fontSize:13, color:C.slate, textDecoration:'line-through', marginRight:8 }}>
              {cb.precoOriginal || (cb.preco_normal && `€${Number(cb.preco_normal).toFixed(0)}`)}
            </span>
            <span style={{ fontSize:26, fontWeight:800, color:G }}>
              {cb.preco || (cb.preco_combo && `€${Number(cb.preco_combo).toFixed(0)}`)}
            </span>
          </div>
          <span style={{ fontSize:11, background:C.goldLt, color:C.gold, padding:'3px 10px', borderRadius:5, fontWeight:700 }}>
            -{cb.desconto}%
          </span>
        </div>
        <button onClick={handlePedirCombo} style={{
          width:'100%', padding:13, borderRadius:10, background:G,
          border:'none', fontSize:14, fontWeight:700, color:'#fff', cursor:'pointer',
        }}>Pedir combo →</button>
      </div>

    </div>
    </>
  )
}
