import React, { useState, useEffect, useCallback } from 'react'
import { supa, supaPublic } from '../supa.js'
import { useImovelAtivo } from '../lib/ImovelAtivoContext.jsx'
import { useEscolherImovel } from '../lib/useEscolherImovel.jsx'
import SmartPromptsSheet from '../components/SmartPromptsSheet.jsx'
import ImagemServico from '../components/ImagemServico.jsx'

const G = '#1B4332'; const GM = '#2D6A4F'; const GL = '#52B788'
const C = {
  ink: '#0f172a', slate: '#64748b', border: '#e2e8f0', bg: '#f8fafc', white: '#fff',
  line: '#E5E7EB', stone: '#6B7685', greenXl: '#D8F3DC', amber: '#F59E0B',
}

const CAT_EMOJI = { limpeza:'✨', manutencao:'🔧', canalizacao:'💧', eletrica:'⚡', pintura:'🖌️', jardim:'🌿', piscina:'🏊', pos_obra:'🏗️' }
const CAT_BG    = { limpeza:'#E8F5D8', manutencao:'#E0ECF8', jardim:'#E0F2E0', piscina:'#E0F2F7', pintura:'#F7E0F0', eletrica:'#FAEEDA', canalizacao:'#E0E8FA', pos_obra:'#F5EDD8' }
const CAT_COLOR = { limpeza:'#2D6A4F', manutencao:'#1e40af', jardim:'#166534', piscina:'#0e7490', pintura:'#9d174d', eletrica:'#92400e', canalizacao:'#1e3a8a', pos_obra:'#78350f' }
const CAT_NOME  = { limpeza:'Limpeza', manutencao:'Manutenção', canalizacao:'Canalização', eletrica:'Eléctrica', pintura:'Pintura', jardim:'Jardim', piscina:'Piscina', pos_obra:'Pós-Obra' }

const MOCK_REVIEWS = [
  { nome:'Ana S.', cidade:'Lisboa', rating:5, data:'12 Abr', texto:'Serviço excelente! Técnico pontual e muito profissional. Casa ficou impecável.' },
  { nome:'Carlos M.', cidade:'Porto', rating:5, data:'8 Abr', texto:'Muito satisfeito. Comunicação rápida e trabalho de qualidade. Recomendo.' },
]

const FAQ_GENERICO = {
  limpeza: [
    { pergunta:'Preciso de estar em casa durante a limpeza?', resposta:'Não é obrigatório. Muitos clientes deixam chave ou código de acesso. O técnico segue o protocolo de segurança da plataforma.' },
    { pergunta:'O que preciso de preparar antes?', resposta:'Guardar objectos de valor e animais de estimação. O técnico traz todos os produtos profissionais necessários.' },
    { pergunta:'Posso cancelar ou reagendar?', resposta:'Sim, até 24h antes sem custo. Cancelamentos tardios podem ter penalização de 20%.' },
  ],
  manutencao: [
    { pergunta:'O técnico tem ferramentas próprias?', resposta:'Sim, todos chegam com equipamento completo. Se necessários materiais específicos, é informado previamente.' },
    { pergunta:'Qual é a garantia do trabalho?', resposta:'Mínimo 30 dias de garantia. Para manutenção preventiva, pode ser até 90 dias.' },
    { pergunta:'Posso pedir orçamento antes?', resposta:'Para serviços de preço fixo não é necessário. Para projectos maiores, usa "Orçamento à medida".' },
  ],
  canalizacao: [
    { pergunta:'Estão disponíveis para urgências 24/7?', resposta:'Sim, para fugas e emergências temos técnicos disponíveis 24h. Selecciona "Urgente" ao pedir.' },
    { pergunta:'As peças estão incluídas?', resposta:'O diagnóstico e mão-de-obra estão incluídos. Peças de substituição são orçamentadas separadamente quando necessário.' },
  ],
  eletrica: [
    { pergunta:'O técnico tem certificação DGEG?', resposta:'Sim, todos os electricistas têm certificação DGEG e estão cobertos por seguro de responsabilidade civil.' },
    { pergunta:'É necessário cortar a electricidade?', resposta:'Depende do trabalho. O técnico avisa sempre antecipadamente se houver interrupção.' },
  ],
  jardim: [
    { pergunta:'Com que frequência devo fazer manutenção?', resposta:'Recomenda-se manutenção mensal de Março a Outubro e de 6 em 6 semanas no Inverno.' },
    { pergunta:'Recolhem a relva cortada e ramos?', resposta:'Sim, ensacamos e retiramos todo o material. Volumes excepcionais têm custo adicional.' },
  ],
  pintura: [
    { pergunta:'Preciso de comprar a tinta?', resposta:'Para serviços de preço fixo, a tinta standard está incluída. Cores especiais ou premium podem ter custo adicional.' },
    { pergunta:'Quanto tempo demora a secar?', resposta:'Tinta de parede interior: 2-4h entre demãos. Uso total ao fim de 24h.' },
  ],
  piscina: [
    { pergunta:'Com que frequência devo tratar a piscina?', resposta:'Semanalmente no Verão (Junho-Setembro). Mensalmente no resto do ano.' },
    { pergunta:'O tratamento químico é seguro?', resposta:'Usamos produtos certificados CE. Pode usar a piscina 4h após o tratamento.' },
  ],
  pos_obra: [
    { pergunta:'Quantas pessoas vêm trabalhar?', resposta:'Depende da área. Para limpezas até 100m², tipicamente 2 técnicos.' },
    { pergunta:'Incluem remoção de entulho?', resposta:'A remoção de entulho é serviço separado. Para detritos ligeiros (pó, embalagens), está incluído.' },
  ],
}

const COMO_FUNCIONA = [
  { n:'1', titulo:'Escolhes data e hora', sub:'Selecciona quando precisas · disponibilidade em tempo real' },
  { n:'2', titulo:'Técnico verificado a caminho', sub:'Recebes notificação com nome, foto e tempo estimado' },
  { n:'3', titulo:'Trabalho concluído', sub:'Pagas só após confirmação · garantia mínima 30 dias' },
]

function precoFmt(v) {
  if (!v) return '—'
  if (typeof v === 'string') return v.includes('€') ? v : `€${v}`
  return `€${Number(v).toFixed(0)}`
}

function IncluiItem({ texto, tipo }) {
  const isInclui = tipo === 'inclui'
  return (
    <div style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'8px 0', borderBottom:`1px solid ${isInclui ? '#f0fdf4' : '#fff1f2'}` }}>
      <span style={{ color: isInclui ? GL : '#EF4444', fontWeight:700, flexShrink:0, fontSize:14, marginTop:1 }}>
        {isInclui ? '✓' : '✗'}
      </span>
      <span style={{ fontSize:12, color:C.ink, lineHeight:1.55 }}>{texto}</span>
    </div>
  )
}

export default function ServicoDetailScreen({ servico, onBack, onPedir, onAdicionarLista, onNavigateMoradas }) {
  const [detalhe,       setDetalhe]      = useState(null)
  const [inclui,        setInclui]       = useState([])
  const [naoInclui,     setNaoInclui]    = useState([])
  const [faq,           setFaq]          = useState([])
  const [stats,         setStats]        = useState([])
  const [relacionados,  setRelacionados] = useState([])
  const [descExpanded,  setDescExpanded] = useState(false)
  const [faqOpen,       setFaqOpen]      = useState({})
  const [smartConfig,   setSmartConfig]  = useState(null)

  const { imovelAtivo, isGlobal, imoveis } = useImovelAtivo()
  const { escolher, sheet } = useEscolherImovel()

  const servId = servico?.id

  const fetchDetalhe = useCallback(async () => {
    if (!servId) return
    const { data } = await supaPublic
      .from('servicos')
      .select('id, nome, preco, preco_original, duracao_tipica, garantia_dias, inclui, nao_inclui, descricao_curta, descricao_longa, tagline, icon, categoria_id, imagem_url, imagem_alt, popular, sub_grupo')
      .eq('id', servId)
      .single()
    if (data) setDetalhe(data)
  }, [servId])

  const fetchInclui = useCallback(async () => {
    if (!servId) return
    const { data } = await supa
      .from('servicos_inclui_exclui')
      .select('texto, tipo, ordem')
      .eq('servico_id', servId)
      .order('ordem')
    if (data && data.length) {
      setInclui(data.filter(r => r.tipo === 'inclui'))
      setNaoInclui(data.filter(r => r.tipo === 'nao_inclui'))
    }
  }, [servId])

  const fetchFaq = useCallback(async () => {
    if (!servId) return
    const { data } = await supa
      .from('servicos_faq')
      .select('pergunta, resposta, ordem')
      .eq('servico_id', servId)
      .order('ordem')
    if (data && data.length) setFaq(data)
  }, [servId])

  const fetchStats = useCallback(async () => {
    const { data } = await supa
      .from('platform_stats')
      .select('key, valor_numero, label, emoji')
      .eq('ativo', true)
      .order('ordem')
      .limit(3)
    if (data && data.length) setStats(data)
  }, [])

  const fetchRelacionados = useCallback(async (catId) => {
    if (!catId || !servId) return
    const { data } = await supaPublic
      .from('servicos')
      .select('id, nome, preco, imagem_url, categoria_id')
      .eq('activo', true)
      .eq('categoria_id', catId)
      .neq('id', servId)
      .eq('popular', true)
      .limit(5)
    if (data && data.length) setRelacionados(data)
  }, [servId])

  useEffect(() => {
    fetchDetalhe()
    fetchInclui()
    fetchFaq()
    fetchStats()
  }, [fetchDetalhe, fetchInclui, fetchFaq, fetchStats])

  useEffect(() => {
    const catId = detalhe?.categoria_id || servico?.categoria_id
    if (catId) fetchRelacionados(catId)
  }, [detalhe, servico, fetchRelacionados])

  // Merge: preferir BD, fallback ao prop servico
  const src     = detalhe || servico || {}
  const catId   = src.categoria_id || ''
  const catNome = CAT_NOME[catId] || 'Serviço'
  const catBg   = CAT_BG[catId] || '#f0f0f0'
  const catClr  = CAT_COLOR[catId] || '#333'
  const nome    = src.nome || 'Serviço'
  const duracao = src.duracao_tipica || '—'
  const garantia= src.garantia_dias ? `${src.garantia_dias} dias` : '30 dias'
  const preco   = precoFmt(src.preco)

  const descricao  = src.descricao_longa || src.descricao_curta || src.tagline || ''
  const descLonga  = descricao.length > 180
  const descTexto  = descLonga && !descExpanded ? descricao.substring(0, 180) + '…' : descricao

  // Inclui: BD prioritário, fallback JSONB da coluna legacy
  const incluiDisplay   = inclui.length   > 0 ? inclui   : (Array.isArray(src.inclui)     ? src.inclui.map(t => ({ texto:t, tipo:'inclui'    })) : [])
  const naoIncluiDisplay= naoInclui.length> 0 ? naoInclui: (Array.isArray(src.nao_inclui) ? src.nao_inclui.map(t => ({ texto:t, tipo:'nao_inclui' })) : [])

  // FAQ: BD prioritário, fallback genérico por categoria
  const faqDisplay = faq.length > 0 ? faq : (FAQ_GENERICO[catId] || [])

  async function handlePedirAgora() {
    let imovelDestino = imovelAtivo
    if (isGlobal || imoveis.length > 1) {
      imovelDestino = await escolher({
        titulo: 'Para qual imóvel?',
        motivo: `Onde queres ${(nome).toLowerCase()}?`,
        onAdicionarImovel: onNavigateMoradas,
      })
      if (!imovelDestino) return
    }
    const categoriaSlug = src.categoria_id || null
    if (categoriaSlug && imovelDestino?.id) {
      setSmartConfig({ localizacaoId: imovelDestino.id, categoriaSlug, imovelDestino })
    } else {
      onPedir?.({ ...src, localizacao_id: imovelDestino?.id })
    }
  }

  return (
    <>
      {sheet}
      {smartConfig && (
        <SmartPromptsSheet
          open={true}
          onClose={() => setSmartConfig(null)}
          onConfirmar={() => {
            const cfg = smartConfig
            setSmartConfig(null)
            onPedir?.({ ...src, localizacao_id: cfg.imovelDestino?.id })
          }}
          localizacaoId={smartConfig.localizacaoId}
          categoriaSlug={smartConfig.categoriaSlug}
          categoriaNome={catNome}
        />
      )}

      <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:110 }}>

        {/* C1 — HEADER FIXO */}
        <div style={{ position:'sticky', top:0, zIndex:20, background:C.white, borderBottom:`1px solid ${C.border}`, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div onClick={onBack} style={{ fontSize:13, fontWeight:600, color:C.slate, cursor:'pointer' }}>← Voltar</div>
          <div style={{ display:'flex', gap:16 }}>
            <span
              style={{ fontSize:20, cursor:'pointer' }}
              onClick={() => { onAdicionarLista?.(src) }}
              title="Adicionar à lista"
            >♡</span>
            <span
              style={{ fontSize:18, cursor:'pointer' }}
              onClick={() => {
                if (navigator.share) navigator.share({ title: nome, text: `${nome} — a partir de ${preco}`, url: window.location.href })
              }}
              title="Partilhar"
            >🔗</span>
          </div>
        </div>

        {/* C2 — HERO IMAGEM */}
        <div style={{ position:'relative' }}>
          <ImagemServico servico={src} height={220} />
          {src.popular && (
            <div style={{ position:'absolute', bottom:12, left:14, background:'#D97706', color:'#fff', fontSize:10, fontWeight:800, padding:'4px 10px', borderRadius:6, letterSpacing:.5 }}>
              POPULAR
            </div>
          )}
        </div>

        {/* C3 — RATING + COUNT */}
        <div style={{ padding:'12px 16px 2px', display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ color:C.amber, fontSize:13, letterSpacing:-1 }}>★★★★★</span>
          <span style={{ fontSize:11.5, color:C.slate }}>4.8 · 147 avaliações</span>
          {/* TODO(mario 3.5): rating real da tabela avaliacoes */}
        </div>

        {/* C4 — TÍTULO + CATEGORIA CHIP */}
        <div style={{ padding:'6px 16px 10px' }}>
          <div style={{ display:'inline-block', background:catBg, color:catClr, fontSize:9, fontWeight:800, letterSpacing:.7, textTransform:'uppercase', padding:'3px 10px', borderRadius:20, marginBottom:9 }}>
            {catNome}
          </div>
          <div style={{ fontSize:22, fontWeight:800, fontFamily:'Georgia,serif', color:C.ink, lineHeight:1.25, marginBottom:6 }}>{nome}</div>
          {src.tagline && (
            <div style={{ fontSize:12.5, color:C.slate, lineHeight:1.55 }}>{src.tagline}</div>
          )}
        </div>

        {/* C5 — CHIPS META */}
        <div style={{ padding:'0 14px 14px', display:'flex', gap:7, overflowX:'auto', WebkitOverflowScrolling:'touch', scrollbarWidth:'none', msOverflowStyle:'none' }}>
          {[
            duracao !== '—' ? `🕐 ${duracao}` : null,
            `🛡️ ${garantia} garantia`,
            '✓ Profissional verificado',
            '💰 Preço fixo',
          ].filter(Boolean).map(chip => (
            <span key={chip} style={{ flex:'0 0 auto', background:'#f5f5f3', color:C.stone, padding:'6px 13px', borderRadius:18, fontSize:11, fontWeight:500, whiteSpace:'nowrap' }}>{chip}</span>
          ))}
        </div>

        {/* C6 — PREÇO BLOCO */}
        <div style={{ margin:'0 14px 14px', background:C.greenXl, borderRadius:14, padding:'16px 18px' }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:4 }}>
            <span style={{ fontSize:32, fontWeight:800, color:G, lineHeight:1 }}>{preco}</span>
            {src.preco_original && Number(src.preco_original) > Number(src.preco) && (
              <span style={{ fontSize:14, color:C.slate, textDecoration:'line-through' }}>€{Number(src.preco_original).toFixed(0)}</span>
            )}
          </div>
          <div style={{ fontSize:12, color:GM, fontWeight:600 }}>Preço final · sem surpresas</div>
          {/* TODO(mario 3.3.14-fix-ux5): configurador dinâmico com cálculo de opções */}
          <div style={{ fontSize:11, color:C.stone, marginTop:5 }}>Algumas opções podem variar o preço · escolhes na próxima fase</div>
        </div>

        <div style={{ padding:'0 14px' }}>

          {/* C7 — DESCRIÇÃO */}
          {descricao ? (
            <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
              <div style={{ fontSize:9, fontWeight:800, letterSpacing:.7, color:C.stone, textTransform:'uppercase', marginBottom:9 }}>Descrição</div>
              <div style={{ fontSize:12.5, color:C.ink, lineHeight:1.65 }}>{descTexto}</div>
              {descLonga && (
                <div onClick={() => setDescExpanded(e => !e)} style={{ fontSize:12, color:G, fontWeight:700, marginTop:9, cursor:'pointer' }}>
                  {descExpanded ? 'Mostrar menos ↑' : 'Ler mais ›'}
                </div>
              )}
            </div>
          ) : null}

          {/* C8 — O QUE ESTÁ INCLUÍDO */}
          {incluiDisplay.length > 0 && (
            <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
              <div style={{ fontSize:9, fontWeight:800, letterSpacing:.7, color:'#166534', textTransform:'uppercase', marginBottom:4 }}>✓ O que está incluído</div>
              {incluiDisplay.map((item, i) => (
                <div key={i} style={{ borderBottom: i < incluiDisplay.length-1 ? `1px solid #f0fdf4` : 'none' }}>
                  <IncluiItem texto={item.texto || item} tipo="inclui" />
                </div>
              ))}
            </div>
          )}

          {/* C9 — O QUE NÃO ESTÁ INCLUÍDO */}
          {naoIncluiDisplay.length > 0 && (
            <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
              <div style={{ fontSize:9, fontWeight:800, letterSpacing:.7, color:'#991B1B', textTransform:'uppercase', marginBottom:4 }}>✗ O que não está incluído</div>
              {naoIncluiDisplay.map((item, i) => (
                <div key={i} style={{ borderBottom: i < naoIncluiDisplay.length-1 ? `1px solid #fff1f2` : 'none' }}>
                  <IncluiItem texto={item.texto || item} tipo="nao_inclui" />
                </div>
              ))}
            </div>
          )}

        </div>

        {/* C10 — COMO FUNCIONA */}
        <div style={{ padding:'0 14px 14px' }}>
          <div style={{ fontSize:9, fontWeight:800, letterSpacing:.7, color:C.stone, textTransform:'uppercase', marginBottom:10 }}>🚀 Como funciona</div>
          {COMO_FUNCIONA.map(step => (
            <div key={step.n} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 14px', marginBottom:8, display:'flex', gap:12, alignItems:'flex-start' }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:C.greenXl, color:G, fontWeight:800, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{step.n}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>{step.titulo}</div>
                <div style={{ fontSize:11, color:C.slate, marginTop:3, lineHeight:1.45 }}>{step.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* C11 — ESTATÍSTICAS PLATAFORMA */}
        {stats.length > 0 && (
          <div style={{ margin:'0 14px 14px', background:`linear-gradient(135deg,${G},${GM})`, borderRadius:14, padding:'18px 16px' }}>
            <div style={{ fontSize:14, fontWeight:700, fontFamily:'Georgia,serif', color:'#fff', marginBottom:16 }}>Confiança em números</div>
            <div style={{ display:'grid', gridTemplateColumns:`repeat(${stats.length},1fr)`, gap:10 }}>
              {stats.map(s => (
                <div key={s.key} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:20, marginBottom:4 }}>{s.emoji}</div>
                  <div style={{ fontSize:20, fontWeight:800, color:'#fff', lineHeight:1.1 }}>{s.valor_numero}</div>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,.72)', marginTop:4, lineHeight:1.35 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* C12 — AVALIAÇÕES MOCK */}
        <div style={{ padding:'0 14px 14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontSize:9, fontWeight:800, letterSpacing:.7, color:C.stone, textTransform:'uppercase' }}>⭐ Avaliações (147)</div>
            <div style={{ fontSize:11, color:GL, fontWeight:700, cursor:'pointer' }}>Ver todas →</div>
            {/* TODO(mario 3.5): query avaliacoes WHERE servico_id */}
          </div>
          {MOCK_REVIEWS.map((r, i) => (
            <div key={i} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 14px', marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:C.greenXl, color:G, fontWeight:800, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {r.nome.charAt(0)}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.ink }}>{r.nome} <span style={{ fontWeight:400, color:C.slate }}>· {r.cidade}</span></div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                    <span style={{ color:C.amber, fontSize:11, letterSpacing:-1 }}>{'★'.repeat(r.rating)}</span>
                    <span style={{ fontSize:10, color:C.slate }}>{r.data}</span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize:12, color:C.slate, lineHeight:1.55 }}>{r.texto}</div>
            </div>
          ))}
        </div>

        {/* C13 — SERVIÇOS RELACIONADOS */}
        {relacionados.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <div style={{ padding:'0 14px 10px', fontSize:9, fontWeight:800, letterSpacing:.7, color:C.stone, textTransform:'uppercase' }}>🔗 Relacionados</div>
            <div style={{ padding:'0 12px', display:'flex', gap:9, overflowX:'auto', WebkitOverflowScrolling:'touch', scrollbarWidth:'none', msOverflowStyle:'none' }}>
              {relacionados.map(r => (
                <div key={r.id} style={{ flex:'0 0 auto', width:128, background:C.white, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden', cursor:'pointer' }}>
                  <ImagemServico servico={r} height={76} />
                  <div style={{ padding:'8px 10px 10px' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:C.ink, lineHeight:1.35, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{r.nome}</div>
                    {r.preco && (
                      <div style={{ fontSize:13, fontWeight:800, color:G, marginTop:5 }}>€{Number(r.preco).toFixed(0)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* C14 — FAQ */}
        {faqDisplay.length > 0 && (
          <div style={{ padding:'0 14px 14px' }}>
            <div style={{ fontSize:9, fontWeight:800, letterSpacing:.7, color:C.stone, textTransform:'uppercase', marginBottom:10 }}>❓ Perguntas frequentes</div>
            {faqDisplay.map((q, i) => (
              <div key={i} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, marginBottom:8, overflow:'hidden' }}>
                <div onClick={() => setFaqOpen(o => ({ ...o, [i]: !o[i] }))} style={{ padding:'13px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
                  <span style={{ fontSize:13, fontWeight:600, color:C.ink, flex:1, paddingRight:10, lineHeight:1.4 }}>{q.pergunta}</span>
                  <span style={{ fontSize:18, color:C.slate, flexShrink:0, fontWeight:300 }}>{faqOpen[i] ? '−' : '+'}</span>
                </div>
                {faqOpen[i] && (
                  <div style={{ padding:'0 14px 14px', fontSize:12.5, color:C.slate, lineHeight:1.65, borderTop:`1px solid ${C.line}` }}>
                    {q.resposta}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>

      {/* C15 — CTA BOTTOM FIXED */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, maxWidth:600, margin:'0 auto', padding:'12px 16px 20px', background:C.white, borderTop:`1px solid ${C.border}`, boxShadow:'0 -4px 20px rgba(0,0,0,0.09)' }}>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ minWidth:80 }}>
            <div style={{ fontSize:26, fontWeight:800, color:G, lineHeight:1 }}>{preco}</div>
            {duracao !== '—' && <div style={{ fontSize:10, color:C.slate, marginTop:2 }}>⏱ {duracao}</div>}
          </div>
          <div style={{ flex:1, display:'flex', gap:8 }}>
            <button
              onClick={() => { onAdicionarLista?.(src) }}
              style={{ flex:1, padding:'12px 8px', borderRadius:10, background:C.bg, border:`1.5px solid ${C.border}`, fontSize:12, fontWeight:600, color:C.slate, cursor:'pointer' }}
            >
              + Lista
            </button>
            <button
              onClick={handlePedirAgora}
              style={{ flex:2, padding:12, borderRadius:10, background:G, border:'none', fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer' }}
            >
              Pedir agora →
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
