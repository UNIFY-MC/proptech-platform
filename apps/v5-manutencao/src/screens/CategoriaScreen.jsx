import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { supaPublic, supa } from '../supa.js'

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
  { ic:'✅', t:'Técnicos verificados', s:'NIF + RC' },
  { ic:'💰', t:'Preço fixo', s:'Sem surpresas' },
  { ic:'⚡', t:'2h urgência', s:'Mesmo dia' },
  { ic:'🛡️', t:'Garantia', s:'30 dias' },
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
  const [servicos,       setServicos]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [filtro,         setFiltro]         = useState('Tudo')
  const [faqOpen,        setFaqOpen]        = useState(null)
  const [subGrupo,       setSubGrupo]       = useState(null)
  const [subGruposConfig,setSubGruposConfig] = useState([])
  const [sectOpen,       setSectOpen]       = useState({ sobre:false, relac:false, aval:false, faq:false })
  const toggleSect = (k) => setSectOpen(s => ({...s, [k]: !s[k]}))

  const cat = categoria || { id:'', nome:'Serviços', emoji:'🔧' }

  const fetchData = useCallback(async () => {
    if (!cat.id) { setLoading(false); return }
    setLoading(true)
    let { data } = await supaPublic
      .from('servicos')
      .select('id, nome, preco, duracao_tipica, popular, icon, categoria_id, subcategoria_id, sub_grupo, imagem_url')
      .eq('activo', true)
      .is('servico_pai_id', null)
      .neq('tipo', 'personalizado')
      .eq('subcategoria_id', cat.id)
      .order('popular', { ascending: false })
      .order('ordem', { ascending: true })
    if (!data || data.length === 0) {
      const res = await supaPublic
        .from('servicos')
        .select('id, nome, preco, duracao_tipica, popular, icon, categoria_id, subcategoria_id, sub_grupo, imagem_url')
        .eq('activo', true)
        .is('servico_pai_id', null)
        .neq('tipo', 'personalizado')
        .eq('categoria_id', cat.id)
        .order('popular', { ascending: false })
        .order('ordem', { ascending: true })
      data = res.data
    }
    setServicos(data || [])
    setLoading(false)
  }, [cat.id])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!cat.id) return
    supa.from('sub_grupos_config')
      .select('sub_grupo, label, emoji, ordem')
      .eq('categoria_slug', cat.id)
      .eq('ativo', true)
      .order('ordem')
      .then(({ data }) => setSubGruposConfig(data || []))
  }, [cat.id])

  const subGruposDisponiveis = useMemo(() => {
    const slugsNosServicos = new Set(servicos.map(s => s.sub_grupo).filter(Boolean))
    if (subGruposConfig.length > 0) {
      return subGruposConfig.filter(sg => slugsNosServicos.has(sg.sub_grupo))
    }
    // Fallback enquanto sub_grupos_config não tem dados para esta categoria
    return [...slugsNosServicos].map(sg => ({ sub_grupo: sg, label: sg, emoji: '' }))
  }, [subGruposConfig, servicos])

  const sorted = [...servicos]
    .filter(s => !subGrupo || s.sub_grupo === subGrupo)
    .sort((a, b) => {
      if (filtro === 'Mais populares') return (b.popular ? 1 : 0) - (a.popular ? 1 : 0)
      if (filtro === 'Preço ↓') return (a.preco || 0) - (b.preco || 0)
      if (filtro === 'Preço ↑') return (b.preco || 0) - (a.preco || 0)
      return 0
    })

  const emoji   = cat.emoji || CAT_EMOJI[cat.id] || '🔧'
  const tagline = CAT_TAGLINE[cat.id] || 'Técnicos certificados em minutos'
  const sobre   = CAT_SOBRE[cat.id]   || 'Serviços profissionais certificados com garantia de qualidade.'
  const relac   = CAT_RELACIONADAS[cat.id] || []

  const scrollRow = {
    display:'flex', gap:7, overflowX:'auto', overflowY:'hidden',
    WebkitOverflowScrolling:'touch', scrollbarWidth:'none', msOverflowStyle:'none',
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:80 }}>

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

      {/* ── Badges de confiança 4 colunas ── */}
      <div style={{ padding:'10px 12px 0', display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:5 }}>
        {BADGES.map(b => (
          <div key={b.t} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:9, padding:'7px 8px', textAlign:'center' }}>
            <div style={{ fontSize:14, marginBottom:2 }}>{b.ic}</div>
            <div style={{ fontSize:9, fontWeight:700, lineHeight:1.2 }}>{b.t}</div>
            <div style={{ fontSize:8.5, color:C.slate, marginTop:1, lineHeight:1.2 }}>{b.s}</div>
          </div>
        ))}
      </div>

      {/* ── CTA orçamento grátis ── */}
      <div
        onClick={onNavigateOrcamento}
        style={{ margin:'10px 12px 0', background:G, borderRadius:12, padding:'13px 14px', color:'#fff', cursor: onNavigateOrcamento ? 'pointer' : 'default' }}
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
      <div style={{ padding:'12px 16px 0', ...scrollRow }}>
        {FILTROS.map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{
            flex:'0 0 auto', padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
            background: filtro===f ? G : C.white, color: filtro===f ? '#fff' : C.slate,
            border:`1px solid ${filtro===f ? G : C.border}`,
          }}>{f}</button>
        ))}
      </div>

      {/* ── Sub-grupos ── */}
      {subGruposDisponiveis.length > 1 && (
        <div style={{ padding:'6px 16px 0', ...scrollRow }}>
          <button onClick={() => setSubGrupo(null)} style={{
            flex:'0 0 auto', padding:'4px 11px', borderRadius:16, fontSize:11, fontWeight:600, cursor:'pointer',
            background: !subGrupo ? G : C.bg, color: !subGrupo ? '#fff' : C.slate,
            border:`1px solid ${!subGrupo ? G : C.border}`,
          }}>Todos</button>
          {subGruposDisponiveis.map(sg => (
            <button key={sg.sub_grupo} onClick={() => setSubGrupo(sg.sub_grupo === subGrupo ? null : sg.sub_grupo)} style={{
              flex:'0 0 auto', padding:'4px 11px', borderRadius:16, fontSize:11, fontWeight:600, cursor:'pointer',
              background: subGrupo === sg.sub_grupo ? G : C.bg, color: subGrupo === sg.sub_grupo ? '#fff' : C.slate,
              border:`1px solid ${subGrupo === sg.sub_grupo ? G : C.border}`,
            }}>
              {sg.emoji ? `${sg.emoji} ${sg.label || sg.sub_grupo}` : (sg.label || sg.sub_grupo)}
            </button>
          ))}
        </div>
      )}

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
              style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'12px 14px', marginBottom:10, cursor:'pointer', display:'flex', gap:12, alignItems:'center' }}
            >
              {s.imagem_url ? (
                <img
                  src={s.imagem_url}
                  alt={s.nome}
                  style={{ width:52, height:52, borderRadius:10, objectFit:'cover', flexShrink:0, background:'#e5e5e3' }}
                  onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}
                />
              ) : null}
              <span style={{ fontSize:28, flexShrink:0, display: s.imagem_url ? 'none' : 'inline' }}>{ic}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:4 }}>{s.nome}</div>
                <div style={{ display:'flex', gap:10, fontSize:11, color:C.slate }}>
                  {s.duracao_tipica && <span>⏱ {s.duracao_tipica}</span>}
                  {s.popular && <span style={{ color:G, fontWeight:700 }}>⭐ Popular</span>}
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:16, fontWeight:700, color:G }}>{precoFmt(s.preco)}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Accordions: Sobre / Relacionados / Avaliações / FAQ ── */}
      <div style={{ margin:'14px 12px 0', borderRadius:12, overflow:'hidden', border:`1px solid ${C.border}` }}>

        {/* Sobre */}
        <div>
          <div onClick={() => toggleSect('sobre')} style={{ padding:'12px 14px', background:C.white, borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
            <span style={{ fontSize:13, fontWeight:700, fontFamily:'Georgia,serif' }}>📖 Sobre este serviço</span>
            <span style={{ fontSize:16, color:C.slate, fontWeight:300 }}>{sectOpen.sobre ? '−' : '+'}</span>
          </div>
          {sectOpen.sobre && (
            <div style={{ padding:'10px 14px 14px', background:C.white, borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontSize:11.5, color:C.slate, lineHeight:1.6 }}>{sobre}</div>
            </div>
          )}
        </div>

        {/* Relacionados */}
        {relac.length > 0 && (
          <div>
            <div onClick={() => toggleSect('relac')} style={{ padding:'12px 14px', background:C.white, borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
              <span style={{ fontSize:13, fontWeight:700, fontFamily:'Georgia,serif' }}>🔗 Serviços relacionados</span>
              <span style={{ fontSize:16, color:C.slate, fontWeight:300 }}>{sectOpen.relac ? '−' : '+'}</span>
            </div>
            {sectOpen.relac && (
              <div style={{ padding:'8px 0 8px 14px', background:C.white, borderBottom:`1px solid ${C.border}`, display:'flex', gap:8, overflowX:'auto', overflowY:'hidden', WebkitOverflowScrolling:'touch', scrollbarWidth:'none' }}>
                {relac.map(r => (
                  <div key={r.id} style={{ minWidth:90, background:C.bg, border:`1px solid ${C.border}`, borderRadius:11, padding:'10px 6px', textAlign:'center', cursor:'pointer', flex:'0 0 auto', marginBottom:4 }}>
                    <div style={{ width:34, height:34, borderRadius:9, background:r.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, margin:'0 auto 5px' }}>
                      {CAT_EMOJI[r.id] || '🔧'}
                    </div>
                    <div style={{ fontSize:10, fontWeight:600 }}>{r.l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Avaliações */}
        <div>
          <div onClick={() => toggleSect('aval')} style={{ padding:'12px 14px', background:C.white, borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:13, fontWeight:700, fontFamily:'Georgia,serif' }}>⭐ Avaliações</span>
              <span style={{ fontSize:10, color:C.greenLt, fontWeight:700 }}>Ver todas →</span>
            </div>
            <span style={{ fontSize:16, color:C.slate, fontWeight:300 }}>{sectOpen.aval ? '−' : '+'}</span>
          </div>
          {sectOpen.aval && (
            <div style={{ padding:'8px 14px 12px', background:C.white, borderBottom:`1px solid ${C.border}` }}>
              {REVIEWS.map((r, i) => (
                <div key={i} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:11, padding:'11px 13px', marginBottom: i < REVIEWS.length-1 ? 7 : 0 }}>
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
          )}
        </div>

        {/* FAQ */}
        <div>
          <div onClick={() => toggleSect('faq')} style={{ padding:'12px 14px', background:C.white, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
            <span style={{ fontSize:13, fontWeight:700, fontFamily:'Georgia,serif' }}>❓ Perguntas frequentes</span>
            <span style={{ fontSize:16, color:C.slate, fontWeight:300 }}>{sectOpen.faq ? '−' : '+'}</span>
          </div>
          {sectOpen.faq && (
            <div style={{ padding:'4px 14px 10px', background:C.white }}>
              {FAQ.map((q, i) => (
                <div key={i} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, marginBottom:6, overflow:'hidden' }}>
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
          )}
        </div>

      </div>

    </div>
  )
}
