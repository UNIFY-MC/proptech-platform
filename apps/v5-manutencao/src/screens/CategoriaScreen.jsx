import React, { useState, useEffect, useCallback } from 'react'
import { supaPublic } from '../supa.js'

const G = '#1B4332'; const GM = '#2D6A4F'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', greenXl:'#D8F3DC', greenLt:'#52B788' }

const FILTROS = ['Tudo','Mais populares','Preço ↓','Preço ↑']

const CAT_EMOJI = {
  limpeza:'✨', manutencao:'🔧', canalizacao:'💧', eletrica:'⚡',
  pintura:'🖌️', jardim:'🌿', piscina:'🏊', pos_obra:'🏗️',
}

const CAT_TAGLINE = {
  limpeza:    'Limpeza profissional ao domicílio',
  manutencao: 'Diagnóstico e reparação ao domicílio',
  canalizacao:'Urgências, desentupimentos, reparações e instalações',
  eletrica:   'Instalações e reparações elétricas certificadas',
  pintura:    'Acabamentos profissionais em 1 dia',
  jardim:     'Manutenção e design de espaços verdes',
  piscina:    'Manutenção e tratamento de água',
  pos_obra:   'Limpeza profunda pós-construção',
}

const CAT_SOBRE = {
  limpeza:    'Serviço de limpeza profissional para habitações, escritórios e espaços comerciais. Os nossos técnicos usam produtos certificados e equipamentos profissionais.',
  manutencao: 'Manutenção preventiva e correctiva ao domicílio. Caldeiras, ACs, electrodomésticos e sistemas de aquecimento. Diagnóstico incluído no preço.',
  canalizacao:'Canalização é um dos serviços mais requisitados em casa. Fugas, desentupimentos, instalações e reparações podem todas ser resolvidas pelos nossos técnicos certificados.',
  eletrica:   'Instalações eléctricas, substituição de quadros, tomadas e iluminação. Todos os trabalhos com certificação DGEG.',
  pintura:    'Pintura de interiores e exteriores, tectos e reparação de paredes. Materiais de qualidade incluídos.',
  jardim:     'Corte de relva, poda, plantação e design de jardim. Serviço sazonal disponível com desconto.',
  piscina:    'Tratamento de água, limpeza de filtros, reparação de bombas e cobertura. Manutenção mensal com contrato.',
  pos_obra:   'Limpeza profunda após obras e remodelações. Remoção de pó de construção, polimento de pavimentos e limpeza de vidros.',
}

const CAT_RELACIONADAS = {
  limpeza:    [{ id:'pos_obra', l:'Pós-obra', bg:'#F4E8D8' }, { id:'manutencao', l:'Manutenção', bg:'#E0ECF8' }, { id:'jardim', l:'Jardim', bg:'#E0F2E0' }],
  manutencao: [{ id:'eletrica', l:'Elétrica', bg:'#FAEEDA' }, { id:'canalizacao', l:'Canalização', bg:'#E0E8FA' }, { id:'pintura', l:'Pintura', bg:'#F7E0F0' }],
  canalizacao:[{ id:'eletrica', l:'Elétrica', bg:'#FAEEDA' }, { id:'manutencao', l:'Manutenção', bg:'#E0ECF8' }, { id:'pos_obra', l:'Pós-obra', bg:'#F4E8D8' }],
  eletrica:   [{ id:'canalizacao', l:'Canalização', bg:'#E0E8FA' }, { id:'manutencao', l:'Manutenção', bg:'#E0ECF8' }, { id:'pintura', l:'Pintura', bg:'#F7E0F0' }],
  pintura:    [{ id:'limpeza', l:'Limpeza', bg:'#E8F5D8' }, { id:'pos_obra', l:'Pós-obra', bg:'#F4E8D8' }, { id:'manutencao', l:'Manutenção', bg:'#E0ECF8' }],
  jardim:     [{ id:'piscina', l:'Piscina', bg:'#E0F2F7' }, { id:'limpeza', l:'Limpeza', bg:'#E8F5D8' }, { id:'manutencao', l:'Manutenção', bg:'#E0ECF8' }],
  piscina:    [{ id:'jardim', l:'Jardim', bg:'#E0F2E0' }, { id:'manutencao', l:'Manutenção', bg:'#E0ECF8' }, { id:'eletrica', l:'Elétrica', bg:'#FAEEDA' }],
  pos_obra:   [{ id:'pintura', l:'Pintura', bg:'#F7E0F0' }, { id:'limpeza', l:'Limpeza', bg:'#E8F5D8' }, { id:'manutencao', l:'Manutenção', bg:'#E0ECF8' }],
}

const BADGES = [
  { ic:'✅', t:'Verificados', s:'NIF + seguro RC' },
  { ic:'💰', t:'Preço à cabeça', s:'Sem surpresas' },
  { ic:'⚡', t:'Urgência 2h', s:'Mesmo dia' },
  { ic:'🛡️', t:'Garantia', s:'Reparação grátis' },
]

const REVIEWS = [
  { ini:'JS', nome:'João S.', local:'Lisboa', rating:5, texto:'"Chegou em 1h30, resolveu em 20 min, preço exacto do orçamento."', tempo:'há 2 dias' },
  { ini:'RM', nome:'Rita M.', local:'Coimbra', rating:5, texto:'"Profissional impecável. Trabalho bem feito e com garantia. Recomendo."', tempo:'há 5 dias' },
]

const FAQ = [
  'Como sei quanto vai custar?',
  'E se o técnico não aparecer?',
  'Posso cancelar?',
  'Como funciona a garantia?',
]

function precoFmt(preco) {
  if (!preco) return '—'
  return `${Number(preco).toFixed(0)}€`
}

export default function CategoriaScreen({ categoria, onBack, onNavigateServico, onNavigateOrcamento }) {
  const [servicos, setServicos] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filtro,   setFiltro]   = useState('Tudo')
  const [faqOpen,  setFaqOpen]  = useState(null)

  const cat = categoria || { id:'', nome:'Serviços', emoji:'🔧' }

  const fetchData = useCallback(async () => {
    if (!cat.id) { setLoading(false); return }
    setLoading(true)
    let { data } = await supaPublic
      .from('servicos')
      .select('id, nome, preco, duracao_tipica, popular, icon, categoria_id, subcategoria_id')
      .eq('activo', true)
      .is('servico_pai_id', null)
      .eq('subcategoria_id', cat.id)
      .order('popular', { ascending: false })
      .order('ordem', { ascending: true })
    if (!data || data.length === 0) {
      const res = await supaPublic
        .from('servicos')
        .select('id, nome, preco, duracao_tipica, popular, icon, categoria_id, subcategoria_id')
        .eq('activo', true)
        .is('servico_pai_id', null)
        .eq('categoria_id', cat.id)
        .order('popular', { ascending: false })
        .order('ordem', { ascending: true })
      data = res.data
    }
    setServicos(data || [])
    setLoading(false)
  }, [cat.id])

  useEffect(() => { fetchData() }, [fetchData])

  const sorted = [...servicos].sort((a, b) => {
    if (filtro === 'Mais populares') return (b.popular ? 1 : 0) - (a.popular ? 1 : 0)
    if (filtro === 'Preço ↓') return (a.preco || 0) - (b.preco || 0)
    if (filtro === 'Preço ↑') return (b.preco || 0) - (a.preco || 0)
    return 0
  })

  const emoji     = cat.emoji || CAT_EMOJI[cat.id] || '🔧'
  const tagline   = CAT_TAGLINE[cat.id]   || 'Técnicos certificados em minutos'
  const sobre     = CAT_SOBRE[cat.id]     || 'Serviços profissionais certificados com garantia de qualidade.'
  const relac     = CAT_RELACIONADAS[cat.id] || []

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:32 }}>

      {/* ── Hero gradient ── */}
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 20px', color:'#fff', position:'relative', overflow:'hidden' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:10 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:9, color:'rgba(255,255,255,.65)', fontWeight:700, letterSpacing:.6, marginBottom:4 }}>
          {(cat.nome || '').toUpperCase()} · {loading ? '...' : `${sorted.length} SERVIÇOS`}
        </div>
        <div style={{ fontSize:20, fontWeight:700, fontFamily:'Georgia,serif', lineHeight:1.2, marginBottom:5 }}>{tagline}</div>
        <div style={{ fontSize:11.5, color:'rgba(255,255,255,.8)', lineHeight:1.5 }}>Tudo com preço à cabeça · sem surpresas.</div>
        <div style={{ position:'absolute', right:-20, bottom:-20, fontSize:120, opacity:.12 }}>{emoji}</div>
      </div>

      {/* ── Badges de confiança 2x2 ── */}
      <div style={{ padding:'12px 12px 0', display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
        {BADGES.map(b => (
          <div key={b.t} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:'9px 11px' }}>
            <div style={{ fontSize:16, marginBottom:2 }}>{b.ic}</div>
            <div style={{ fontSize:11, fontWeight:700 }}>{b.t}</div>
            <div style={{ fontSize:10, color:C.slate, marginTop:1 }}>{b.s}</div>
          </div>
        ))}
      </div>

      {/* ── CTA orçamento grátis ── */}
      <div
        onClick={onNavigateOrcamento}
        style={{ margin:'14px 12px 0', background:G, borderRadius:12, padding:'13px 14px', color:'#fff', cursor: onNavigateOrcamento ? 'pointer' : 'default' }}
      >
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700 }}>Pedir orçamento grátis</div>
            <div style={{ fontSize:10.5, color:'rgba(255,255,255,.75)', marginTop:2 }}>Sem compromisso · compara · decide</div>
          </div>
          <div style={{ background:'rgba(255,255,255,.2)', borderRadius:8, padding:'7px 11px', fontSize:13 }}>→</div>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div style={{ padding:'12px 16px 0', display:'flex', gap:7, overflowX:'auto', scrollbarWidth:'none' }}>
        {FILTROS.map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{
            flexShrink:0, padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
            background: filtro===f ? G : C.white, color: filtro===f ? '#fff' : C.slate,
            border:`1px solid ${filtro===f ? G : C.border}`,
          }}>{f}</button>
        ))}
      </div>

      {/* ── Lista de serviços ── */}
      <div style={{ padding:'12px 16px 0' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:32, color:C.slate, fontSize:13 }}>A carregar...</div>
        ) : sorted.length === 0 ? (
          <div style={{ background:C.white, border:`1px dashed ${C.border}`, borderRadius:12, padding:'32px 16px', textAlign:'center' }}>
            <div style={{ fontSize:13, color:C.slate }}>Sem serviços nesta categoria</div>
          </div>
        ) : sorted.map(s => {
          const ic = s.icon || CAT_EMOJI[s.categoria_id] || '🔧'
          return (
            <div
              key={s.id}
              onClick={() => onNavigateServico?.(s)}
              style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:10, cursor:'pointer', display:'flex', gap:12 }}
            >
              <span style={{ fontSize:28, flexShrink:0 }}>{ic}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:4 }}>{s.nome}</div>
                <div style={{ display:'flex', gap:10, fontSize:11, color:C.slate }}>
                  {s.duracao_tipica && <span>⏱ {s.duracao_tipica}</span>}
                  {s.popular && <span style={{ color:G, fontWeight:700 }}>⭐</span>}
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:16, fontWeight:700, color:G }}>{precoFmt(s.preco)}</div>
                <div style={{ fontSize:10, color:C.slate, marginTop:2 }}>+ IVA</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Sobre este serviço ── */}
      <div style={{ padding:'14px 14px 4px', fontSize:13, fontWeight:700, fontFamily:'Georgia,serif' }}>Sobre este serviço</div>
      <div style={{ padding:'0 14px', fontSize:11.5, color:C.slate, lineHeight:1.6 }}>
        {sobre}
        <span style={{ color:G, fontWeight:700, cursor:'pointer' }}> Ler mais ›</span>
      </div>

      {/* ── Serviços relacionados ── */}
      {relac.length > 0 && (
        <>
          <div style={{ padding:'14px 14px 4px', fontSize:13, fontWeight:700, fontFamily:'Georgia,serif' }}>Serviços relacionados</div>
          <div style={{ padding:'0 0 0 14px', display:'flex', gap:8, overflowX:'auto', scrollbarWidth:'none' }}>
            {relac.map(r => (
              <div key={r.id} style={{ minWidth:90, background:C.white, border:`1px solid ${C.border}`, borderRadius:11, padding:'10px 6px', textAlign:'center', cursor:'pointer', flexShrink:0, marginBottom:4 }}>
                <div style={{ width:34, height:34, borderRadius:9, background:r.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, margin:'0 auto 5px' }}>
                  {CAT_EMOJI[r.id] || '🔧'}
                </div>
                <div style={{ fontSize:10, fontWeight:600 }}>{r.l}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Avaliações ── */}
      <div style={{ padding:'14px 14px 4px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:13, fontWeight:700, fontFamily:'Georgia,serif' }}>⭐ Avaliações</div>
        <div style={{ fontSize:10, color:C.greenLt, fontWeight:700 }}>Ver todas →</div>
      </div>
      <div style={{ padding:'0 14px' }}>
        {REVIEWS.map((r, i) => (
          <div key={i} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:11, padding:'11px 13px', marginBottom:7 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'#E57373', color:'#fff', fontWeight:700, fontSize:10, display:'flex', alignItems:'center', justifyContent:'center' }}>{r.ini}</div>
                <div>
                  <div style={{ fontSize:11, fontWeight:700 }}>{r.nome} · {r.local}</div>
                  <div style={{ fontSize:10, color:'#F59E0B' }}>{'★'.repeat(r.rating)}</div>
                </div>
              </div>
              <div style={{ fontSize:9, color:C.slate }}>{r.tempo}</div>
            </div>
            <div style={{ fontSize:11, color:C.slate, lineHeight:1.5 }}>{r.texto}</div>
          </div>
        ))}
      </div>

      {/* ── FAQ ── */}
      <div style={{ padding:'14px 14px 4px', fontSize:13, fontWeight:700, fontFamily:'Georgia,serif' }}>❓ Perguntas frequentes</div>
      <div style={{ padding:'0 14px 8px' }}>
        {FAQ.map((q, i) => (
          <div key={i} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, marginBottom:6, overflow:'hidden' }}>
            <div onClick={() => setFaqOpen(faqOpen === i ? null : i)} style={{ padding:'11px 13px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
              <span style={{ fontSize:11.5 }}>{q}</span>
              <span style={{ color:C.slate, fontSize:16, transition:'transform .2s', transform: faqOpen === i ? 'rotate(45deg)' : 'none' }}>+</span>
            </div>
            {faqOpen === i && (
              <div style={{ padding:'0 13px 11px', fontSize:11, color:C.slate, lineHeight:1.5 }}>
                {i === 0 && 'O preço é apresentado antes de confirmar. Sem taxas escondidas ou cobranças surpresa.'}
                {i === 1 && 'Tens garantia de chegada. Se não aparecer, recebes reembolso total e crédito extra.'}
                {i === 2 && 'Sim, cancelamento gratuito até 2h antes do serviço agendado.'}
                {i === 3 && 'Garantia de 30 dias em todos os trabalhos. Se houver problema, o técnico volta sem custo.'}
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  )
}
