// src/App.jsx — v5-manutencao 2026.0422 (catálogo canalização + personalizado)

import React, { useState, useMemo, useEffect, useRef } from 'react'
import CWishlist from './CWishlist'
import { DEMO_PESSOA_ID, DEMO_ORGANIZATION_ID } from './lib/demo.js'
import IniciaScreen from './IniciaScreen.jsx'
import CasaScreen from './CasaScreen.jsx'
import ServicosScreen from './ServicosScreen.jsx'
import PedidosScreen from './PedidosScreen.jsx'
import PerfilSheet from './PerfilSheet.jsx'
import PerfilDrawer from './PerfilDrawer.jsx'
import SubscricaoScreen from './SubscricaoScreen.jsx'
import ScoreDetailScreen from './ScoreDetailScreen.jsx'
import AlertaDetailScreen from './AlertaDetailScreen.jsx'
import OwnersClubScreen from './OwnersClubScreen.jsx'
import ChatPedidoScreen from './ChatPedidoScreen.jsx'
import {
  ArrowLeft, X, Check, Camera, Clock, Plus, MapPin, ChevronRight,
  Shield, Lock, MessageSquare, FileImage, RefreshCw, Wrench,
  Sparkles, Trash2, Tag, Receipt, Banknote, CreditCard, Info,
  Calendar, MapPinned, PartyPopper, Search, Star, Leaf, Zap,
} from 'lucide-react'

/* ══ UI COMPONENTS (inline) ══ */
function Av({ ini, size = 44, green = true }) {
  const bg = green ? `linear-gradient(135deg,#16a34a,#22c55e)` : `linear-gradient(135deg,#C17E3A,#E8A857)`
  return <div style={{ width:size, height:size, borderRadius:'50%', flexShrink:0, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*.34, fontWeight:800, color:'#fff', boxShadow:'0 2px 8px rgba(0,0,0,0.2)' }}>{ini}</div>
}
function Stars({ v, s = 12 }) {
  return <span>{[1,2,3,4,5].map(i => <span key={i} style={{ color: i<=Math.round(v) ? '#f59e0b' : '#e2e8f0', fontSize:s }}>★</span>)}</span>
}
function Card({ children, style, onClick }) {
  return <div onClick={onClick} style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', cursor: onClick?'pointer':'default', ...style }}>{children}</div>
}
function Pill({ text, bg, col }) {
  return <span style={{ fontSize:10, fontWeight:800, background:bg, color:col, padding:'2px 8px', borderRadius:20, textTransform:'uppercase', letterSpacing:'0.04em' }}>{text}</span>
}
function EstBadge({ st }) {
  const m = { pendente:{l:'Pendente',bg:'#fef3c7',c:'#92400e'}, atribuida:{l:'Atribuída',bg:'#eff6ff',c:'#1d4ed8'}, em_curso:{l:'Em curso',bg:'#dcfce7',c:'#14532d'}, concluida:{l:'Concluída',bg:'#f8fafc',c:'#64748b'} }
  const s = m[st]||m.pendente
  return <span style={{ fontSize:11, fontWeight:700, background:s.bg, color:s.c, padding:'3px 10px', borderRadius:20 }}>{s.l}</span>
}
function Btn({ children, onClick, v='navy', full, sm, dis }) {
  const bg = {navy:'#0f172a',green:'#16a34a',ghost:'#fff',red:'#ef4444'}[v]||'#0f172a'
  const col = v==='ghost' ? '#0f172a' : '#fff'
  return <button onClick={dis?null:onClick} style={{ background:dis?'#e2e8f0':bg, color:dis?'#64748b':col, border:v==='ghost'?'1.5px solid #e2e8f0':'none', borderRadius:12, fontWeight:700, cursor:dis?'not-allowed':'pointer', padding:sm?'8px 14px':'13px 20px', fontSize:sm?12:14, width:full?'100%':'auto', opacity:dis?.7:1 }}>{children}</button>
}
function Header({ title, sub, onBack, right }) {
  return <div style={{ background:'#0f172a', padding:'14px 16px', position:'sticky', top:0, zIndex:20, display:'flex', alignItems:'center', gap:10 }}>
    {onBack && <button onClick={onBack} style={{ background:'none', border:'none', color:'#fff', fontSize:22, cursor:'pointer', padding:0, flexShrink:0 }}>←</button>}
    <div style={{ flex:1 }}><div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{title}</div>{sub&&<div style={{ fontSize:11, color:'#8FA8BB' }}>{sub}</div>}</div>
    {right}
  </div>
}
function FixedBottom({ children }) {
  return <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, background:'#fff', padding:'12px 16px 20px', borderTop:'1px solid #e2e8f0', zIndex:30 }}>{children}</div>
}
function SectTitle({ t, action, onAction }) {
  return <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', margin:'16px 0 10px' }}>
    <h2 style={{ fontSize:14, fontWeight:800, color:'#0f172a' }}>{t}</h2>
    {action && <button onClick={onAction} style={{ fontSize:11, color:'#16a34a', fontWeight:600, background:'none', border:'none', cursor:'pointer' }}>{action}</button>}
  </div>
}

/* ══ DRAWER MENU (inline) ══ */
const MENU_ITEMS = [
  { id:'rating',         ic:'⭐', l:'Rating' },
  { id:'servicos_ativos',ic:'🔧', l:'Serviços ativos' },
  { id:'meus_servicos',  ic:'📅', l:'Os meus serviços' },
  { id:'carteira',       ic:'💰', l:'A minha Carteira' },
  { id:'perfil',         ic:'👤', l:'Perfil' },
  { id:'estatisticas',   ic:'📊', l:'Estatísticas' },
  { id:'tarefas',        ic:'🛠️', l:'Tarefas' },
  { id:'disponibilidade',ic:'🕐', l:'A tua disponibilidade' },
  { id:'ajuda',          ic:'ℹ️', l:'Ajuda' },
  { id:'sair',           ic:'🚪', l:'Sair' },
]

const CLIENTE_MENU_ITEMS = [
  { id:'wishlist',      ic:'📝', l:'A minha lista' },
  { id:'perfil',        ic:'👤', l:'Perfil' },
  { id:'moradas',       ic:'📍', l:'As minhas moradas' },
  { id:'pagamentos',    ic:'💳', l:'Métodos de pagamento' },
  { id:'avaliacoes',    ic:'⭐', l:'As minhas avaliações' },
  { id:'referencia',    ic:'🎁', l:'Código de referência' },
  { id:'notificacoes',  ic:'🔔', l:'Notificações' },
  { id:'ajuda',         ic:'ℹ️', l:'Ajuda & Suporte' },
  { id:'sair',          ic:'🚪', l:'Terminar sessão' },
]
function DrawerMenu({ open, onClose, onNavigate, user, activeItem, menuItems = MENU_ITEMS }) {
  const ref = useRef(null)
  const nivel = user?.nivel
  const nc = nivel ? NIVEIS[nivel] : null
  useEffect(() => {
    if (!open) return
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, onClose])
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [open])
  const handle = id => {
    if (id==='sair') { if (window.confirm('Tens a certeza que queres sair?')) { onNavigate?.(id); onClose() }; return }
    onNavigate?.(id); onClose()
  }
  const cL = 'max(0px, calc(50vw - 215px))'
  return <>
    <div onClick={onClose} style={{ position:'fixed', top:0, bottom:0, left:cL, width:'min(100vw,430px)', zIndex:40, background:'rgba(0,0,0,0.55)', opacity:open?1:0, pointerEvents:open?'auto':'none', transition:'opacity 0.25s ease' }}/>
    <div ref={ref} style={{ position:'fixed', top:0, bottom:0, left:cL, width:Math.min(290, window.innerWidth), zIndex:50, background:'#fff', transform:open?'translateX(0)':'translateX(-100%)', transition:'transform 0.28s cubic-bezier(0.4,0,0.2,1)', display:'flex', flexDirection:'column', boxShadow:'4px 0 32px rgba(0,0,0,0.22)', overflowY:'auto' }}>
      {/* Avatar clicável → ficha do prestador */}
      <div style={{ background:'linear-gradient(145deg,#0f172a,#14532d)', padding:'52px 22px 24px', display:'flex', flexDirection:'column', alignItems:'center', gap:10, flexShrink:0 }}>
        <button onClick={()=>handle('perfil')} style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}>
          <div style={{ width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg,#16a34a,#22c55e)', border:'3px solid rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, color:'#fff', fontWeight:800 }}>{user?.ini||'👤'}</div>
        </button>
        <div style={{ textAlign:'center' }}>
          <div style={{ color:'#fff', fontSize:15, fontWeight:700, marginBottom:3, letterSpacing:'-0.01em' }}>{user?.n||'Prestador'}</div>
          <div style={{ color:'#94a3b8', fontSize:11, fontWeight:500 }}>{user?.id_num||'—'}</div>
          {nc && <div style={{ marginTop:8, display:'inline-flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.1)', borderRadius:20, padding:'4px 12px', fontSize:11, color:'#bbf7d0', fontWeight:600 }}>{nc.ic} {nc.l} · {nc.taxa}%</div>}
        </div>
      </div>
      {/* Nav — mesma tipografia do resto da app */}
      <nav style={{ flex:1, padding:'8px 0' }}>
        {menuItems.map(item => {
          const isActive = activeItem===item.id
          const isDanger = item.id==='sair'
          return (
            <button key={item.id} onClick={()=>handle(item.id)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'13px 22px', border:'none', cursor:'pointer', background:isActive?'#f0fdf4':'transparent', borderLeft:isActive?`3px solid #16a34a`:'3px solid transparent', color:isDanger?'#ef4444':isActive?'#16a34a':'#1e293b', fontSize:13, fontWeight:isActive?700:500, textAlign:'left', fontFamily:'inherit' }}
              onMouseEnter={e=>{ if(!isActive) e.currentTarget.style.background='#f8fafc' }}
              onMouseLeave={e=>{ if(!isActive) e.currentTarget.style.background='transparent' }}>
              <span style={{ fontSize:17, width:22, textAlign:'center', flexShrink:0 }}>{item.ic}</span>
              <span style={{ fontSize:13, fontWeight:isActive?700:500 }}>{item.l}</span>
            </button>
          )
        })}
      </nav>
      <div style={{ padding:'12px 22px 24px', borderTop:'1px solid #e2e8f0' }}>
        <div style={{ fontSize:10, color:'#94a3b8', fontWeight:500 }}>v5-manutenção · PropTech Platform</div>
        <div style={{ fontSize:10, color:'#cbd5e1', marginTop:2 }}>Legal · Privacidade</div>
      </div>
    </div>
  </>
}

/* ══ MEUS SERVIÇOS CALENDÁRIO (inline) ══ */
const ESTADO_CAL = {
  pendente:    { l:'Pendente',               cor:'#ef4444' },
  concluido:   { l:'Concluído',              cor:'#16a34a' },
  agendado:    { l:'Agendado',               cor:'#3b82f6' },
  a_confirmar: { l:'A aguardar confirmação', cor:'#8b5cf6' },
  bloqueado:   { l:'Bloqueado',              cor:'#94a3b8' },
  em_curso:    { l:'Em curso',               cor:'#16a34a' },
}
const DN_CAL   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MESES_CAL= ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const p2 = n => String(n).padStart(2,'0')
const toStr = (y,m,d) => `${y}-${p2(m+1)}-${p2(d)}`

function MeusServicos({ servicos = [], bloqueados = [], onBack }) {
  const hoje = new Date()
  const [vista, setVista] = useState('mes') // dia|semana|mes|ano|lista
  const [ano,   setAno]   = useState(hoje.getFullYear())
  const [mes,   setMes]   = useState(hoje.getMonth())
  const [dia,   setDia]   = useState(hoje.getDate())
  const [selSvc,setSelSvc]= useState(null)

  const porData = useMemo(() => { const m={}; servicos.forEach(s=>{ (m[s.data]=m[s.data]||[]).push(s) }); return m }, [servicos])
  const toStr_ = (d) => typeof d==='string' ? d : d.toISOString().split('T')[0]

  // Gerar eventos de bloqueio para o período
  const eventosBloq = useMemo(() => {
    const evs=[]
    bloqueados.forEach(b => {
      if (!b.range) return
      // simplificado: extrair datas do range
      const inicio = b.range.includes('→') ? b.range.split('→')[0].trim() : b.range
      evs.push({...b, dataStr: inicio})
    })
    return evs
  }, [bloqueados])

  // ── Detalhe do serviço ──
  if (selSvc) {
    const cfg = ESTADO_CAL[selSvc.estado]||ESTADO_CAL.agendado
    const isBloq = selSvc._bloq
    return (
      <div style={{ minHeight:'100vh', background:C.mist }}>
        <Header title={isBloq?selSvc.desc:selSvc.nome} sub={isBloq?selSvc.range:`${selSvc.hora}h · ${selSvc.dur||'—'}`} onBack={()=>setSelSvc(null)}/>
        <div style={{ padding:'16px 16px 60px' }}>
          {!isBloq && <>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}>
              <span style={{ fontSize:12, fontWeight:700, background:cfg.cor+'22', color:cfg.cor, padding:'5px 14px', borderRadius:20 }}>● {cfg.l}</span>
            </div>
            <div style={{ background:`linear-gradient(135deg,${C.navy},${C.gd})`, borderRadius:14, padding:16, marginBottom:12 }}>
              <div style={{ fontSize:9, color:'#86efac', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>📍 Localização</div>
              <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:6 }}>{selSvc.local}</div>
              <span style={{ background:'rgba(34,197,94,0.2)', borderRadius:9, padding:'4px 10px', fontSize:12, fontWeight:800, color:'#86efac' }}>📏 {selSvc.km} km de distância</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9, marginBottom:12 }}>
              {[['👤','Cliente',selSvc.cliente],['🕐','Hora',selSvc.hora+'h'],['⏱️','Duração',selSvc.dur||'—'],['💶','Valor',`€${selSvc.valor}`]].map(([ic,l,v])=>(
                <div key={l} style={{ background:C.white, borderRadius:12, padding:'12px', border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:16, marginBottom:3 }}>{ic}</div>
                  <div style={{ fontSize:9, color:C.slate, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ background:C.gl, borderRadius:12, padding:'13px 16px', border:'1px solid rgba(22,163,74,0.2)' }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <div><div style={{ fontSize:11, color:C.slate }}>O teu ganho (18% taxa)</div><div style={{ fontSize:20, fontWeight:800, color:C.g }}>€{(selSvc.valor*0.82).toFixed(2)}</div></div>
                <div style={{ textAlign:'right' }}><div style={{ fontSize:10, color:C.slate }}>Plataforma</div><div style={{ fontSize:13, fontWeight:700, color:C.slate }}>€{(selSvc.valor*0.18).toFixed(2)}</div></div>
              </div>
            </div>
          </>}
          {isBloq && <div style={{ background:selSvc.bg||C.mist, borderRadius:14, padding:20, border:`2px solid ${selSvc.cor||C.border}44`, textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:10 }}>{selSvc.ic}</div>
            <div style={{ fontSize:16, fontWeight:800, color:C.navy, marginBottom:4 }}>{selSvc.desc}</div>
            <div style={{ fontSize:13, color:selSvc.cor||C.slate, fontWeight:600 }}>{selSvc.range}</div>
            <div style={{ fontSize:11, color:C.slate, marginTop:4 }}>{selSvc.dias} dia{selSvc.dias>1?'s':''} bloqueado{selSvc.dias>1?'s':''}</div>
          </div>}
        </div>
      </div>
    )
  }

  const prevPeriod = () => {
    if (vista==='dia')    { const d=new Date(ano,mes,dia-1); setAno(d.getFullYear());setMes(d.getMonth());setDia(d.getDate()) }
    if (vista==='semana') { const d=new Date(ano,mes,dia-7); setAno(d.getFullYear());setMes(d.getMonth());setDia(d.getDate()) }
    if (vista==='mes')    { mes===0?(setAno(a=>a-1),setMes(11)):setMes(m=>m-1) }
    if (vista==='ano')    { setAno(a=>a-1) }
    if (vista==='lista')  { mes===0?(setAno(a=>a-1),setMes(11)):setMes(m=>m-1) }
  }
  const nextPeriod = () => {
    if (vista==='dia')    { const d=new Date(ano,mes,dia+1); setAno(d.getFullYear());setMes(d.getMonth());setDia(d.getDate()) }
    if (vista==='semana') { const d=new Date(ano,mes,dia+7); setAno(d.getFullYear());setMes(d.getMonth());setDia(d.getDate()) }
    if (vista==='mes')    { mes===11?(setAno(a=>a+1),setMes(0)):setMes(m=>m+1) }
    if (vista==='ano')    { setAno(a=>a+1) }
    if (vista==='lista')  { mes===11?(setAno(a=>a+1),setMes(0)):setMes(m=>m+1) }
  }

  const periodoLabel = () => {
    if (vista==='dia')    return new Date(ano,mes,dia).toLocaleDateString('pt-PT',{weekday:'short',day:'2-digit',month:'short'})
    if (vista==='semana') { const d=new Date(ano,mes,dia); const m0=new Date(d); m0.setDate(d.getDate()-(d.getDay()||7)+1); const m6=new Date(m0); m6.setDate(m0.getDate()+6); return `${m0.getDate()} – ${m6.getDate()} ${MESES_CAL[m6.getMonth()].substring(0,3)}` }
    if (vista==='mes')    return `${MESES_CAL[mes]} ${ano}`
    if (vista==='ano')    return `${ano}`
    if (vista==='lista')  return `${MESES_CAL[mes]} ${ano}`
  }

  const primeiroDia = new Date(ano,mes,1).getDay()
  const totalDias   = new Date(ano,mes+1,0).getDate()
  const linhas      = Math.ceil((primeiroDia+totalDias)/7)
  const dataSel     = toStr(ano,mes,dia)
  const servicosDia = (porData[dataSel]||[]).sort((a,b)=>a.hora.localeCompare(b.hora))

  // Semana actual (segunda a domingo)
  const semana = (() => {
    const d = new Date(ano,mes,dia)
    const dow = d.getDay()
    const seg = new Date(d); seg.setDate(d.getDate()-(dow===0?6:dow-1))
    return Array.from({length:7},(_,i)=>{ const dd=new Date(seg); dd.setDate(seg.getDate()+i); return dd })
  })()

  const EventChip = ({s, isBloq}) => {
    const cfg = isBloq ? {cor:s.cor||C.amber} : (ESTADO_CAL[s.estado]||ESTADO_CAL.agendado)
    return (
      <div onClick={()=>setSelSvc(isBloq?{...s,_bloq:true}:s)} style={{ background:cfg.cor+'20', borderLeft:`3px solid ${cfg.cor}`, borderRadius:'0 6px 6px 0', padding:'3px 6px', marginBottom:2, cursor:'pointer', minHeight:20 }}>
        <div style={{ fontSize:10, fontWeight:700, color:cfg.cor, lineHeight:1.2 }}>{isBloq?s.ic+' '+s.desc:s.hora+' '+s.nome}</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:'#fff', display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <Header title='Os meus serviços' onBack={onBack}/>

      {/* Vista selector */}
      <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, background:C.white, position:'sticky', top:56, zIndex:10 }}>
        {[{id:'dia',l:'Dia'},{id:'semana',l:'Semana'},{id:'mes',l:'Mês'},{id:'ano',l:'Ano'},{id:'lista',l:'Lista'}].map(v=>(
          <button key={v.id} onClick={()=>setVista(v.id)} style={{ flex:1, padding:'10px 0', border:'none', background:'none', cursor:'pointer', borderBottom: vista===v.id?`2px solid ${C.g}`:'2px solid transparent', color:vista===v.id?C.g:C.slate, fontSize:11, fontWeight:vista===v.id?700:500 }}>{v.l}</button>
        ))}
      </div>

      {/* Navegação período */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px 4px' }}>
        <button onClick={prevPeriod} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:C.navy, padding:'4px 10px', fontWeight:700 }}>‹</button>
        <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>{periodoLabel()}</span>
        <button onClick={nextPeriod} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:C.navy, padding:'4px 10px', fontWeight:700 }}>›</button>
      </div>

      {/* ── VISTA: MÊS ── */}
      {vista==='mes' && <div style={{ flex:1, padding:'0 6px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:2 }}>
          {DN_CAL.map(d=><div key={d} style={{ textAlign:'center', fontSize:10, color:C.slate, fontWeight:600, padding:'3px 0' }}>{d}</div>)}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
          {Array.from({length:linhas*7}).map((_,i) => {
            const d=i-primeiroDia+1, eMes=d>=1&&d<=totalDias
            const dStr=eMes?toStr(ano,mes,d):null
            const svcs=dStr?(porData[dStr]||[]):[]
            const ests=[...new Set(svcs.map(s=>s.estado))]
            const isHj=eMes&&d===hoje.getDate()&&mes===hoje.getMonth()&&ano===hoje.getFullYear()
            const isSel=eMes&&d===dia
            let show=d; if(d<1) show=new Date(ano,mes,0).getDate()+d; else if(d>totalDias) show=d-totalDias
            const hasBloq = bloqueados.some(b=>b.range&&b.range.includes(d+''))
            return <div key={i} onClick={()=>eMes&&setDia(d)} style={{ minHeight:52, padding:'2px 1px', cursor:eMes?'pointer':'default', borderBottom:`1px solid ${C.border}`, borderRight:`1px solid ${C.border}` }}>
              <div style={{ width:26, height:26, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:isSel||isHj?700:400, background:isSel?C.navy:isHj?C.gl:'transparent', color:isSel?'#fff':!eMes?'#cbd5e1':isHj?C.g:C.navy, border:isHj&&!isSel?`1.5px solid ${C.g}`:'none', margin:'1px auto' }}>{Math.abs(show)||show}</div>
              {eMes && <>
                {hasBloq && <div style={{ height:3, background:C.amber, borderRadius:2, margin:'0 2px 1px' }}/>}
                <div style={{ display:'flex', gap:1, padding:'0 2px', flexWrap:'wrap' }}>
                  {ests.slice(0,2).map(e=><div key={e} style={{ width:5, height:5, borderRadius:'50%', background:ESTADO_CAL[e]?.cor||C.slate, flexShrink:0 }}/>)}
                  {svcs.length>2&&<div style={{ fontSize:8, color:C.slate }}>+{svcs.length-2}</div>}
                </div>
              </>}
            </div>
          })}
        </div>
        {/* Legenda + lista do dia sel */}
        <div style={{ padding:'8px 10px', borderTop:`1px solid ${C.border}`, display:'flex', flexWrap:'wrap', gap:'4px 12px' }}>
          {Object.entries(ESTADO_CAL).filter(([k])=>k!=='em_curso').map(([id,cfg])=>(
            <div key={id} style={{ display:'flex', alignItems:'center', gap:4 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:cfg.cor }}/>
              <span style={{ fontSize:9, color:C.slate }}>{cfg.l}</span>
            </div>
          ))}
        </div>
        <div style={{ padding:'0 0 80px' }}>
          <div style={{ padding:'8px 14px 6px', fontSize:10, fontWeight:800, color:C.slate, textTransform:'uppercase', letterSpacing:'0.06em' }}>
            {DN_CAL[new Date(ano,mes,dia).getDay()]}-FEIRA, {MESES_CAL[mes].substring(0,3).toUpperCase()} {p2(dia)}
          </div>
          {servicosDia.length===0
            ? <div style={{ padding:'20px', textAlign:'center', color:'#94a3b8', fontSize:12 }}>Sem serviços neste dia</div>
            : servicosDia.map((s,i)=>{ const cfg=ESTADO_CAL[s.estado]||ESTADO_CAL.agendado; return (
              <div key={s.id} onClick={()=>setSelSvc(s)} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 16px', borderBottom:i<servicosDia.length-1?`1px solid ${C.border}`:'none', cursor:'pointer' }}>
                <div style={{ width:44, textAlign:'right', flexShrink:0, paddingTop:2 }}><span style={{ fontSize:12, color:C.slate }}>{s.hora}h</span></div>
                <div style={{ width:9, height:9, borderRadius:'50%', background:cfg.cor, flexShrink:0, marginTop:4 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{s.nome}</div>
                  <div style={{ fontSize:11, color:C.slate, marginTop:1 }}>{cfg.l}</div>
                  <div style={{ display:'flex', gap:8, marginTop:3 }}>
                    <span style={{ fontSize:10, color:C.slate }}>📍 {s.local}</span>
                    {s.km&&<span style={{ fontSize:10, background:C.gl, color:C.gd, padding:'1px 6px', borderRadius:7, fontWeight:700 }}>📏 {s.km} km</span>}
                  </div>
                </div>
                <span style={{ color:C.border, fontSize:16 }}>›</span>
              </div>
            )})}
        </div>
      </div>}

      {/* ── VISTA: SEMANA ── */}
      {vista==='semana' && <div style={{ flex:1, overflowX:'auto', paddingBottom:80 }}>
        {/* Cabeçalho dos dias */}
        <div style={{ display:'flex', borderBottom:`2px solid ${C.border}`, background:C.white, position:'sticky', top:0, zIndex:3 }}>
          <div style={{ width:44, flexShrink:0 }}/>
          {semana.map((d,i)=>{
            const isHj = d.toDateString()===hoje.toDateString()
            const dStr = toStr(d.getFullYear(),d.getMonth(),d.getDate())
            const temEvs = (porData[dStr]||[]).length > 0
            return (
              <div key={i} onClick={()=>{setAno(d.getFullYear());setMes(d.getMonth());setDia(d.getDate());setVista('dia')}} style={{ flex:1, textAlign:'center', padding:'8px 2px', borderLeft:`1px solid ${C.border}`, cursor:'pointer', background:isHj?C.gl:'transparent' }}>
                <div style={{ fontSize:9, color:isHj?C.g:C.slate, textTransform:'uppercase', fontWeight:700 }}>{DN_CAL[d.getDay()]}</div>
                <div style={{ width:26, height:26, borderRadius:'50%', background:isHj?C.g:'transparent', color:isHj?'#fff':C.navy, fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', margin:'3px auto 2px' }}>{d.getDate()}</div>
                {temEvs && <div style={{ width:5, height:5, borderRadius:'50%', background:isHj?C.g:C.slate, margin:'0 auto' }}/>}
              </div>
            )
          })}
        </div>
        {/* Grelha de horas */}
        {['08','09','10','11','12','13','14','15','16','17','18','19','20'].map(h => (
          <div key={h} style={{ display:'flex', borderBottom:`1px solid #f1f5f9`, minHeight:48 }}>
            {/* Label da hora */}
            <div style={{ width:44, flexShrink:0, textAlign:'right', padding:'6px 6px 0 0', fontSize:9, color:'#94a3b8' }}>{h}h</div>
            {/* Células por dia */}
            {semana.map((d,di) => {
              const dStr = toStr(d.getFullYear(),d.getMonth(),d.getDate())
              const svcs = (porData[dStr]||[]).filter(s => s.hora && s.hora.startsWith(h))
              return (
                <div key={di} style={{ flex:1, borderLeft:`1px solid ${C.border}`, padding:2, minHeight:48 }}>
                  {svcs.map(s => {
                    const cfg = ESTADO_CAL[s.estado]||ESTADO_CAL.agendado
                    return (
                      <div key={s.id} onClick={()=>setSelSvc(s)} style={{ background:cfg.cor+'22', borderLeft:`2.5px solid ${cfg.cor}`, borderRadius:'0 5px 5px 0', padding:'2px 3px', marginBottom:1, cursor:'pointer' }}>
                        <div style={{ fontSize:8, fontWeight:700, color:cfg.cor, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', lineHeight:1.3 }}>{s.nome}</div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>}

      {/* ── VISTA: DIA ── */}
      {vista==='dia' && <div style={{ flex:1, paddingBottom:80 }}>
        <div style={{ padding:'8px 16px', display:'flex', gap:8, overflowX:'auto' }}>
          {bloqueados.filter(b=>b.dias>0).map(b=>(
            <div key={b.id} style={{ flexShrink:0, background:b.bg||C.mist, borderRadius:9, padding:'5px 10px', border:`1px solid ${b.cor||C.border}44` }}>
              <span style={{ fontSize:11, fontWeight:700, color:b.cor||C.slate }}>{b.ic} {b.desc}</span>
            </div>
          ))}
        </div>
        {['08','09','10','11','12','13','14','15','16','17','18','19','20'].map(h=>{
          const svcs=(porData[dataSel]||[]).filter(s=>s.hora.startsWith(h))
          return <div key={h} style={{ display:'flex', minHeight:60, borderBottom:`1px solid ${C.border}` }}>
            <div style={{ width:50, textAlign:'right', padding:'8px 10px 0 0', fontSize:12, color:C.slate, flexShrink:0 }}>{h}:00</div>
            <div style={{ flex:1, padding:'4px 8px 4px 0' }}>
              {svcs.map(s=>{ const cfg=ESTADO_CAL[s.estado]||ESTADO_CAL.agendado; return (
                <div key={s.id} onClick={()=>setSelSvc(s)} style={{ background:cfg.cor+'18', border:`1.5px solid ${cfg.cor}`, borderRadius:10, padding:'8px 12px', marginBottom:4, cursor:'pointer' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{s.nome}</div>
                    <span style={{ fontSize:10, background:cfg.cor+'30', color:cfg.cor, padding:'2px 7px', borderRadius:9, fontWeight:700 }}>{ESTADO_CAL[s.estado]?.l}</span>
                  </div>
                  <div style={{ fontSize:11, color:C.slate, marginTop:2 }}>📍 {s.local}</div>
                  {s.km&&<div style={{ display:'inline-block', marginTop:4, background:C.gl, borderRadius:8, padding:'2px 8px' }}><span style={{ fontSize:10, fontWeight:700, color:C.gd }}>📏 {s.km} km</span></div>}
                </div>
              )})}
            </div>
          </div>
        })}
      </div>}

      {/* ── VISTA: ANO ── */}
      {vista==='ano' && <div style={{ flex:1, padding:'8px 10px 80px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {Array.from({length:12},(_,mi)=>{
          const pD=new Date(ano,mi,1).getDay(), tD=new Date(ano,mi+1,0).getDate()
          const lns=Math.ceil((pD+tD)/7)
          return <div key={mi} style={{ background:mi===mes?C.gl:C.white, borderRadius:12, padding:'8px', border:`1.5px solid ${mi===mes?C.g:C.border}`, cursor:'pointer' }} onClick={()=>{setMes(mi);setVista('mes')}}>
            <div style={{ fontSize:11, fontWeight:700, color:mi===mes?C.g:C.navy, marginBottom:4, textAlign:'center' }}>{MESES_CAL[mi].substring(0,3).toUpperCase()}</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:0 }}>
              {Array.from({length:lns*7}).map((_,i)=>{ const d=i-pD+1; const eMes=d>=1&&d<=tD; const dStr=eMes?toStr(ano,mi,d):null; const svcs=dStr?(porData[dStr]||[]):[]
                const isHj=eMes&&d===hoje.getDate()&&mi===hoje.getMonth()&&ano===hoje.getFullYear()
                return <div key={i} style={{ textAlign:'center', height:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {eMes&&<div style={{ width:13, height:13, borderRadius:'50%', background:isHj?C.g:svcs.length>0?C.gm+'44':'transparent', fontSize:7, color:isHj?'#fff':eMes?C.navy:'transparent', fontWeight:isHj?700:400, display:'flex', alignItems:'center', justifyContent:'center' }}>{d}</div>}
                </div>
              })}
            </div>
          </div>
        })}
      </div>}

      {/* ── VISTA: LISTA ── */}
      {vista==='lista' && <div style={{ flex:1, paddingBottom:80 }}>
        {/* Bloqueados */}
        {bloqueados.length>0&&<>
          <div style={{ padding:'10px 16px 4px', fontSize:10, fontWeight:800, color:C.amber, textTransform:'uppercase', letterSpacing:'0.06em' }}>🚫 Períodos Bloqueados</div>
          {bloqueados.map(b=>(
            <div key={b.id} onClick={()=>setSelSvc({...b,_bloq:true})} style={{ display:'flex', gap:12, padding:'11px 16px', borderBottom:`1px solid ${C.border}`, cursor:'pointer', background:b.bg||C.mist, alignItems:'center' }}>
              <span style={{ fontSize:24 }}>{b.ic}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{b.desc}</div>
                <div style={{ fontSize:11, color:b.cor||C.slate, fontWeight:600 }}>{b.range}</div>
                <div style={{ fontSize:10, color:C.slate }}>{b.dias} dias bloqueados</div>
              </div>
              <span style={{ color:C.border, fontSize:16 }}>›</span>
            </div>
          ))}
        </>}
        {/* Serviços agrupados por data */}
        {Object.entries(porData).sort(([a],[b])=>a.localeCompare(b)).map(([data,svcs])=>(
          <div key={data}>
            <div style={{ padding:'10px 16px 4px', fontSize:10, fontWeight:800, color:C.slate, textTransform:'uppercase', letterSpacing:'0.06em', background:C.mist }}>
              {new Date(data+'T00:00').toLocaleDateString('pt-PT',{weekday:'long',day:'2-digit',month:'long'})}
            </div>
            {svcs.map((s,i)=>{ const cfg=ESTADO_CAL[s.estado]||ESTADO_CAL.agendado; return (
              <div key={s.id} onClick={()=>setSelSvc(s)} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 16px', borderBottom:`1px solid ${C.border}`, cursor:'pointer' }}>
                <div style={{ width:44, textAlign:'right', flexShrink:0, paddingTop:2 }}><span style={{ fontSize:12, color:C.slate, fontWeight:500 }}>{s.hora}h</span></div>
                <div style={{ width:9, height:9, borderRadius:'50%', background:cfg.cor, flexShrink:0, marginTop:5 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{s.nome}</div>
                  <div style={{ fontSize:11, color:C.slate, marginTop:1 }}>{cfg.l}</div>
                  <div style={{ display:'flex', gap:8, marginTop:3 }}>
                    <span style={{ fontSize:10, color:C.slate }}>📍 {s.local}</span>
                    {s.km&&<span style={{ fontSize:10, background:C.gl, color:C.gd, padding:'1px 6px', borderRadius:7, fontWeight:700 }}>📏 {s.km} km</span>}
                  </div>
                </div>
                <span style={{ color:C.border, fontSize:16 }}>›</span>
              </div>
            )})}
          </div>
        ))}
        {Object.keys(porData).length===0&&bloqueados.length===0&&<div style={{ padding:'60px 0', textAlign:'center', color:C.slate }}>
          <div style={{ fontSize:40, marginBottom:10 }}>📅</div>
          <div style={{ fontSize:13, fontWeight:500 }}>Sem eventos futuros</div>
        </div>}
      </div>}
    </div>
  )
}

/* ══════════════════════════════════
   SUPABASE AUTH — Cliente, registo, login
   URL: https://hkmvszkpxjbxmnixzqbl.supabase.co
══════════════════════════════════ */
const SB_URL = 'https://hkmvszkpxjbxmnixzqbl.supabase.co'
const SB_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || ''

// ── Auth helpers ────────────────────────
const sbHeaders = (token) => ({
  'apikey': SB_KEY,
  'Authorization': `Bearer ${token||SB_KEY}`,
  'Content-Type': 'application/json',
})

async function sbSignUp(email, password, meta) {
  if (!SB_KEY) return {error:'Sem chave Supabase. Modo demo activo.'}
  try {
    const r = await fetch(`${SB_URL}/auth/v1/signup`, {
      method:'POST',
      headers: sbHeaders(),
      body: JSON.stringify({ email, password, data: meta }),
    })
    const d = await r.json()
    if (!r.ok) return {error: d.error_description||d.msg||'Erro no registo'}
    return {user: d.user, session: d.session}
  } catch(e) { return {error: e.message} }
}

async function sbSignIn(email, password) {
  if (!SB_KEY) return {error:'Sem chave Supabase. Modo demo activo.'}
  try {
    const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
      method:'POST',
      headers: sbHeaders(),
      body: JSON.stringify({ email, password }),
    })
    const d = await r.json()
    if (!r.ok) return {error: d.error_description||'Email ou password incorrectos'}
    return {user: d.user, session: d.access_token, token: d.access_token}
  } catch(e) { return {error: e.message} }
}

async function sbSignOut(token) {
  if (!SB_KEY || !token) return
  try {
    await fetch(`${SB_URL}/auth/v1/logout`, {
      method:'POST', headers: sbHeaders(token),
    })
  } catch {}
}

async function sbGetPerfil(userId, token) {
  if (!SB_KEY) return null
  try {
    const r = await fetch(`${SB_URL}/rest/v1/perfis?id=eq.${userId}&select=*`, {
      headers: sbHeaders(token)
    })
    if (!r.ok) return null
    const d = await r.json()
    return d[0] || null
  } catch { return null }
}

async function sbUpdatePerfil(data, token) {
  if (!SB_KEY || !token) return null
  try {
    const r = await fetch(`${SB_URL}/rest/v1/perfis?id=eq.${data.id}`, {
      method:'PATCH',
      headers: {...sbHeaders(token), 'Prefer':'return=representation'},
      body: JSON.stringify(data),
    })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

async function sbGet(table, filter='', token) {
  if (!SB_KEY) return null
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}${filter}`, {
      headers: sbHeaders(token||SB_KEY)
    })
    return r.ok ? r.json() : null
  } catch { return null }
}

// Variantes para schemas não-default (ex: v5_manutencao) — PostgREST usa
// Accept-Profile para GET e Content-Profile para writes. Precisa do schema
// estar listado como "Exposed schemas" no Supabase Dashboard → Settings → API.
async function sbGetV5(table, filter='', token) {
  if (!SB_KEY) return null
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}${filter}`, {
      headers: { ...sbHeaders(token||SB_KEY), 'Accept-Profile': 'v5_manutencao' },
    })
    return r.ok ? r.json() : null
  } catch { return null }
}

async function sbSaveV5(table, data, token) {
  if (!SB_KEY) return null
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method:'POST',
      headers: { ...sbHeaders(token||SB_KEY), 'Content-Profile':'v5_manutencao', 'Prefer':'return=representation' },
      body: JSON.stringify(data),
    })
    if (!r.ok) { console.warn(`[sbSaveV5 ${table}]`, r.status, await r.text().catch(()=>'')); return null }
    return r.json()
  } catch (e) { console.warn(`[sbSaveV5 ${table}] ex`, e); return null }
}

async function sbUpdateV5(table, filter, data, token) {
  if (!SB_KEY) return null
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}${filter}`, {
      method:'PATCH',
      headers: { ...sbHeaders(token||SB_KEY), 'Content-Profile':'v5_manutencao', 'Prefer':'return=representation' },
      body: JSON.stringify(data),
    })
    if (!r.ok) { console.warn(`[sbUpdateV5 ${table}]`, r.status, await r.text().catch(()=>'')); return null }
    return r.json()
  } catch (e) { console.warn(`[sbUpdateV5 ${table}] ex`, e); return null }
}

async function sbDeleteV5(table, filter, token) {
  if (!SB_KEY) return false
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}${filter}`, {
      method:'DELETE',
      headers: { ...sbHeaders(token||SB_KEY), 'Content-Profile':'v5_manutencao' },
    })
    return r.ok
  } catch { return false }
}

async function sbSave(table, data, token) {
  if (!SB_KEY) return null
  try {
    const effectiveToken = token || SB_KEY
    const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method:'POST',
      headers: {...sbHeaders(effectiveToken), 'Prefer':'return=representation,resolution=merge-duplicates'},
      body: JSON.stringify(data),
    })
    if (!r.ok) {
      const errorBody = await r.text().catch(()=>'<unreadable>')
      console.warn(`[sbSave ${table}] HTTP ${r.status}`, errorBody, '\npayload keys:', Object.keys(data))
      return null
    }
    return r.json()
  } catch (e) {
    console.warn(`[sbSave ${table}] exception:`, e)
    return null
  }
}

async function sbUpdate(table, filter, data, token) {
  if (!SB_KEY) return null
  try {
    const effectiveToken = token || SB_KEY
    const r = await fetch(`${SB_URL}/rest/v1/${table}${filter}`, {
      method:'PATCH',
      headers: {...sbHeaders(effectiveToken), 'Prefer':'return=representation'},
      body: JSON.stringify(data),
    })
    if (!r.ok) {
      const errorBody = await r.text().catch(()=>'<unreadable>')
      console.warn(`[sbUpdate ${table}] HTTP ${r.status}`, errorBody, '\npayload keys:', Object.keys(data))
      return null
    }
    return r.json()
  } catch (e) {
    console.warn(`[sbUpdate ${table}] exception:`, e)
    return null
  }
}

async function sbDelete(table, filter, token) {
  if (!SB_KEY) return false
  try {
    const effectiveToken = token || SB_KEY
    const r = await fetch(`${SB_URL}/rest/v1/${table}${filter}`, {
      method:'DELETE',
      headers: sbHeaders(effectiveToken),
    })
    if (!r.ok) {
      const errorBody = await r.text().catch(()=>'<unreadable>')
      console.warn(`[sbDelete ${table}] HTTP ${r.status}`, errorBody)
      return false
    }
    return true
  } catch (e) {
    console.warn(`[sbDelete ${table}] exception:`, e)
    return false
  }
}

async function sbGetOrCreateListaAberta(uid, token) {
  const existing = await sbGet('listas_cliente', `?cliente_id=eq.${uid}&estado=eq.aberta&select=*`, token)
  if (Array.isArray(existing) && existing.length > 0) return existing[0]
  const created = await sbSave('listas_cliente', { cliente_id: uid, estado: 'aberta' }, token)
  const row = Array.isArray(created) ? created[0] : created
  return row || null
}

async function sbUpload(bucket, path, file, token) {
  if (!SB_KEY || !file) return null
  try {
    const r = await fetch(`${SB_URL}/storage/v1/object/${bucket}/${path}`, {
      method:'POST',
      headers: sbHeaders(token||SB_KEY),
      body: file,
    })
    return r.ok ? `${SB_URL}/storage/v1/object/public/${bucket}/${path}` : null
  } catch { return null }
}

async function sbDeleteStorage(bucket, path, token) {
  if (!SB_KEY || !path) return false
  try {
    const r = await fetch(`${SB_URL}/storage/v1/object/${bucket}`, {
      method: 'DELETE',
      headers: { ...sbHeaders(token||SB_KEY), 'Content-Type':'application/json' },
      body: JSON.stringify({ prefixes: [path] }),
    })
    return r.ok
  } catch { return false }
}

function SyncBadge({synced,loading}){
  if(loading)return<span style={{fontSize:10,color:'#64748b'}}>⟳ A sincronizar…</span>
  if(synced)return<span style={{fontSize:10,color:'#16a34a',fontWeight:600}}>● Supabase</span>
  return<span style={{fontSize:10,color:'#f59e0b',fontWeight:600}}>○ Demo local</span>
}

// ── Ecrã de Autenticação — design ServiçoPRO ──────────────────
function AuthScreen({ onAuth }) {
  // step: 'welcome' | 'otp_input' | 'otp_code' | 'role' | 'categories' | 'pending' | 'success'
  const [step,    setStep]    = useState('welcome')
  const [inputMode, setInputMode] = useState('phone') // 'phone' | 'email'
  const [contact, setContact] = useState('')
  const [code,    setCode]    = useState(['','','','','',''])
  const [role,    setRole]    = useState(null)  // 'cliente' | 'prestador'
  const [cats,    setCats]    = useState([])
  const [loading, setLoad]    = useState(false)
  const [err,     setErr]     = useState('')
  const [timer,   setTimer]   = useState(58)

  // Timer OTP
  React.useEffect(() => {
    if (step !== 'otp_code') return
    const t = setInterval(() => setTimer(n => n > 0 ? n-1 : 0), 1000)
    return () => clearInterval(t)
  }, [step])

  const isPhone = contact.startsWith('+') || /^[239]\d/.test(contact)
  const isEmail = contact.includes('@')
  const contactValid = isPhone || isEmail

  const SP = {
    green:'#16a34a', greenDeep:'#14532d', greenSoft:'#dcfce7',
    navy:'#0f172a',  gray:'#64748b',      grayLight:'#94a3b8',
    border:'#e2e8f0',amber:'#f59e0b',     red:'#dc2626',
    redSoft:'#fee2e2', bg:'#f8fafc',      ink:'#0f172a',
  }
  const FONT = 'system-ui,-apple-system,sans-serif'

  const signInWithGoogle = async () => {
    if (!SB_KEY) { demoLogin('cliente'); return }
    setLoad(true)
    try {
      const { data, error } = await fetch(`${SB_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin)}`, {
        method: 'GET',
        headers: { 'apikey': SB_KEY },
        redirect: 'manual',
      }).then(async r => {
        // Supabase returns a redirect — open it
        const body = await r.text()
        const urlMatch = body.match(/href="([^"]+)"/) || body.match(/url=([^\s&"]+)/)
        return { data: { url: r.url || urlMatch?.[1] }, error: null }
      }).catch(e => ({ data: null, error: e }))

      // Simpler: just redirect directly to Supabase OAuth URL
      const oauthUrl = `${SB_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin)}`
      window.location.href = oauthUrl
    } catch(e) {
      setErr('Erro ao iniciar Google OAuth. Verifica a configuração.')
      setLoad(false)
    }
  }

  // Check for OAuth callback (hash contains access_token)
  React.useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1))
      const token = params.get('access_token')
      const type  = params.get('type')
      if (token) {
        // Clear hash from URL
        window.history.replaceState(null, '', window.location.pathname)
        // Get user info
        fetch(`${SB_URL}/auth/v1/user`, {
          headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()).then(user => {
          const role = user.user_metadata?.role || 'cliente'
          const nome = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Utilizador'
          onAuth({ user, token, role, nome, perfil: { role, nome, email: user.email } })
        }).catch(() => {
          onAuth({ user: { id: token }, token, role: 'cliente', nome: 'Utilizador Google', demo: false })
        })
      }
    }
  }, [])

  const sendCode = async () => {
    if (!contact || contact.length < 9) { setErr('Insere um número válido de 9 dígitos.'); return }
    setErr(''); setLoad(true)
    await new Promise(r => setTimeout(r, 900)) // simula envio SMS
    setLoad(false); setTimer(58); setStep('otp_code')
  }

  const verifyCode = async () => {
    setLoad(true)
    await new Promise(r=>setTimeout(r,800))
    setLoad(false); setStep('role')
  }

  const chooseRole = (r) => {
    setRole(r)
    if (r === 'prestador') setStep('categories')
    else { setStep('success'); setTimeout(() => onAuth({user:{id:`u${Date.now()}`},token:null,role:'cliente',nome:contact.split('@')[0]||contact,demo:!SB_KEY}), 1500) }
  }

  const finishPrestador = () => {
    setStep('pending')
  }

  const demoLogin = async (r) => {
    // Fallback local quando não há chave Supabase (dev sem env) —
    // mantém o comportamento pre-2d para não bloquear demos offline.
    if (!SB_KEY) {
      const locals = {
        cliente:   { id:'demo-cli',  nome:'Maria Santos' },
        prestador: { id:'demo-prest',nome:'António Ferreira' },
        admin:     { id:'admin',     nome:'Admin' },
      }
      onAuth({ user:locals[r], token:null, role:r, nome:locals[r].nome, demo:true })
      return
    }
    // Fase 2d.2 — signInWithPassword contra as 3 contas demo do Supabase.
    // Ver CLAUDE.md "Auth dos botões demo" para credenciais e UUIDs.
    const credenciais = {
      cliente:   { email:'cliente@demov5.pt',   password:'Demo2026!', nome:'Maria Santos' },
      prestador: { email:'prestador@demov5.pt', password:'Demo2026!', nome:'António Ferreira' },
      admin:     { email:'admin@demov5.pt',     password:'Demo2026!', nome:'Admin' },
    }
    const { email, password, nome } = credenciais[r]
    const res = await sbSignIn(email, password)
    if (res.error) {
      alert(`Login demo falhou: ${res.error}`)
      console.error('[auth] demo login failed', res.error)
      return
    }
    onAuth({ user:res.user, token:res.token, role:r, nome, demo:true })
  }

  // Componentes UI ────────────────────────────────
  const Logo = ({size=64,light=false}) => (
    <div style={{width:size,height:size,borderRadius:'50%',background:light?'#fff':SP.green,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:light?'none':`0 8px 24px rgba(22,163,74,0.35)`}}>
      <svg width={size*.45} height={size*.45} viewBox="0 0 24 24" fill="none">
        <path d="M3 11l9-8 9 8v9a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2v-9z" stroke={light?SP.green:'#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    </div>
  )

  const Btn = ({children,ghost=false,light=false,onClick,disabled,isLoading}) => (
    <button onClick={onClick} disabled={disabled||isLoading}
      style={{width:'100%',height:52,borderRadius:14,border:ghost?`1.5px solid ${light?'rgba(255,255,255,0.4)':SP.border}`:'none',background:ghost?'transparent':light?'#fff':SP.green,color:ghost?(light?'#fff':SP.ink):(light?SP.ink:'#fff'),fontFamily:FONT,fontSize:15,fontWeight:800,cursor:disabled?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,opacity:disabled&&!isLoading?.6:1,transition:'opacity 0.2s'}}>
      {isLoading
        ? <div style={{width:20,height:20,borderRadius:'50%',border:'2.5px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .8s linear infinite'}}/>
        : children}
    </button>
  )

  const BackBtn = ({onClick}) => (
    <button onClick={onClick} style={{width:40,height:40,borderRadius:12,background:'#fff',border:`1px solid ${SP.border}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
      <svg width="14" height="14" viewBox="0 0 14 14"><path d="M9 1L3 7l6 6" stroke={SP.ink} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </button>
  )

  // Containers ─────────────────────────────────────
  const DarkScreen = ({children}) => (
    <div style={{minHeight:'100vh',background:`linear-gradient(160deg,${SP.navy} 0%,${SP.greenDeep} 100%)`,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{position:'absolute',top:'15%',left:'50%',transform:'translateX(-50%)',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(22,163,74,0.2) 0%,transparent 70%)',pointerEvents:'none'}}/>
      <div style={{width:'100%',maxWidth:390,position:'relative',padding:'60px 24px 32px',display:'flex',flexDirection:'column',minHeight:'85vh'}}>{children}</div>
    </div>
  )

  const LightScreen = ({children}) => (
    <div style={{minHeight:'100vh',background:SP.bg,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{width:'100%',maxWidth:390,padding:'32px 24px',display:'flex',flexDirection:'column',minHeight:'85vh'}}>{children}</div>
    </div>
  )

  // ── WELCOME ─────────────────────────────────────
  if (step==='welcome') return (
    <DarkScreen>
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',marginBottom:32}}>
        <Logo size={72}/>
        <div style={{fontFamily:FONT,fontSize:28,fontWeight:900,color:'#fff',marginTop:20,letterSpacing:'-0.5px'}}>ServiçoPRO</div>
        <div style={{fontFamily:FONT,fontSize:14,color:'rgba(255,255,255,0.65)',marginTop:6}}>Serviços domésticos de confiança</div>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:18}}>
        <Btn onClick={signInWithGoogle} isLoading={loading}>
          <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.49h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92C16.66 14.02 17.64 11.71 17.64 9.2z" fill="#fff"/><path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 009 18z" fill="#fff"/><path d="M3.97 10.71a5.41 5.41 0 010-3.42V4.96H.96a9 9 0 000 8.08l3.01-2.33z" fill="#fff"/><path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 00.96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" fill="#fff"/></svg>
          Entrar com Google
        </Btn>
        <Btn ghost light onClick={()=>{}}>
          <svg width="16" height="18" viewBox="0 0 16 18" fill="#fff"><path d="M13.1 9.6c0-2.2 1.8-3.3 1.9-3.3-1-1.5-2.7-1.7-3.3-1.7-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.2 0 2-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.6-1-2.6-3.9zM10.9 3.1c.6-.8 1-1.9.9-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-.9 2.9 1.1.1 2.1-.5 2.7-1.3z"/></svg>
          Entrar com Apple
        </Btn>
        <button onClick={()=>setStep('otp_input')} style={{background:'none',border:'none',cursor:'pointer',fontFamily:FONT,fontSize:13,color:'rgba(255,255,255,0.7)',fontWeight:500,padding:'8px 0',textAlign:'center'}}>
          Entrar com <span style={{color:'#fff',textDecoration:'underline'}}>email</span> ou <span style={{color:'#fff',textDecoration:'underline'}}>telemóvel</span>
        </button>
      </div>

      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
        <div style={{flex:1,height:1,background:'rgba(255,255,255,0.12)'}}/>
        <div style={{fontFamily:FONT,fontSize:10,color:'rgba(255,255,255,0.5)',letterSpacing:'1.5px',fontWeight:700}}>NOVO AQUI?</div>
        <div style={{flex:1,height:1,background:'rgba(255,255,255,0.12)'}}/>
      </div>

      <div style={{display:'flex',gap:10,marginBottom:14}}>
        {[{r:'cliente',ic:'👤',l:'Sou cliente'},{r:'prestador',ic:'👷',l:'Sou prestador'}].map(({r,ic,l})=>(
          <button key={r} onClick={()=>setStep('otp_input')} style={{flex:1,padding:'14px 12px',borderRadius:16,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
            <span style={{fontSize:22}}>{ic}</span>
            <span style={{fontFamily:FONT,fontSize:13,fontWeight:700,color:'#fff'}}>{l}</span>
          </button>
        ))}
      </div>

      {/* ── Bypass de teste — sempre visível ── */}
      <div style={{background:'rgba(255,255,255,0.05)',borderRadius:14,padding:'14px 16px',border:'1px solid rgba(255,255,255,0.1)',marginBottom:12}}>
        <div style={{fontFamily:FONT,fontSize:10,color:'rgba(255,255,255,0.4)',textAlign:'center',marginBottom:10,textTransform:'uppercase',letterSpacing:'1px',fontWeight:700}}>
          🔧 Acesso directo para testar
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
          <button onClick={()=>demoLogin('cliente')} style={{padding:'11px 8px',background:'rgba(22,163,74,0.2)',border:'1px solid rgba(22,163,74,0.4)',borderRadius:10,color:'#86efac',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:FONT}}>
            👤 Cliente demo
          </button>
          <button onClick={()=>demoLogin('prestador')} style={{padding:'11px 8px',background:'rgba(22,163,74,0.2)',border:'1px solid rgba(22,163,74,0.4)',borderRadius:10,color:'#86efac',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:FONT}}>
            👷 Prestador demo
          </button>
        </div>
        <button onClick={()=>demoLogin('admin')} style={{width:'100%',padding:'8px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:9,color:'rgba(255,255,255,0.4)',fontSize:11,cursor:'pointer',fontFamily:FONT,fontWeight:600}}>
          ⚙️ Painel Admin
        </button>
      </div>

      <div style={{textAlign:'center',fontFamily:FONT,fontSize:11,color:'rgba(255,255,255,0.35)',lineHeight:1.5}}>
        Ao continuar aceitas os <span style={{textDecoration:'underline'}}>Termos</span> e a <span style={{textDecoration:'underline'}}>Privacidade</span>
      </div>
    </DarkScreen>
  )

  // ── OTP INPUT — telefone + email ──────────────────
  if (step==='otp_input') {
    const isEmailMode = contact.includes('@') || step==='otp_input' && inputMode==='email'
    return (
    <div style={{minHeight:'100vh',background:'#f8fafc',padding:'24px 20px',display:'flex',flexDirection:'column'}}>
      <BackBtn onClick={()=>setStep('welcome')}/>
      <div style={{marginTop:32,marginBottom:28}}>
        <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'1.2px',color:'#64748b',marginBottom:8}}>Passo 1 de 2</div>
        <div style={{fontSize:26,fontWeight:900,color:'#0f172a',letterSpacing:'-0.4px',lineHeight:1.2,marginBottom:6}}>
          {inputMode==='email' ? 'Qual o teu email?' : 'Qual o teu telemóvel?'}
        </div>
        <div style={{fontSize:14,color:'#64748b',lineHeight:1.5}}>
          {inputMode==='email' ? 'Enviamos um link de acesso para o teu email.' : 'Enviamos um código de 6 dígitos por SMS.'}
        </div>
      </div>

      {/* Toggle SMS / Email */}
      <div style={{display:'flex',background:'#e2e8f0',borderRadius:12,padding:3,marginBottom:20}}>
        {[{id:'phone',l:'📱 Telemóvel'},{id:'email',l:'✉️ Email'}].map(m=>(
          <button key={m.id} onClick={()=>setInputMode(m.id)} style={{flex:1,padding:'9px',borderRadius:10,border:'none',background:inputMode===m.id?'#fff':'transparent',color:inputMode===m.id?'#0f172a':'#64748b',fontSize:13,fontWeight:inputMode===m.id?700:500,cursor:'pointer',transition:'all 0.15s',boxShadow:inputMode===m.id?'0 1px 3px rgba(0,0,0,0.1)':'none'}}>
            {m.l}
          </button>
        ))}
      </div>

      {inputMode==='phone' ? (
        <div>
          <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'1.2px',color:'#64748b',marginBottom:8}}>Telemóvel</div>
          <div style={{display:'flex',gap:8}}>
            <div style={{background:'#fff',border:'1.5px solid #e2e8f0',borderRadius:12,padding:'14px 12px',display:'flex',alignItems:'center',gap:6,flexShrink:0,cursor:'pointer'}}>
              <span style={{fontSize:20}}>🇵🇹</span>
              <span style={{fontSize:15,color:'#0f172a',fontWeight:700}}>+351</span>
              <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="#94a3b8" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>
            </div>
            <input
              key="phone-input"
              type="tel"
              inputMode="numeric"
              maxLength={9}
              placeholder="912 345 678"
              style={{flex:1,background:'#fff',border:`1.5px solid ${err?'#dc2626':'#e2e8f0'}`,borderRadius:12,padding:'14px 16px',fontSize:18,fontWeight:500,color:'#0f172a',outline:'none',letterSpacing:'1px',WebkitAppearance:'none'}}
              autoFocus
              id="contact-input"
            />
          </div>
        </div>
      ) : (
        <div>
          <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'1.2px',color:'#64748b',marginBottom:8}}>Email</div>
          <input
            key="email-input"
            type="email"
            inputMode="email"
            placeholder="o.teu@email.pt"
            style={{width:'100%',background:'#fff',border:`1.5px solid ${err?'#dc2626':'#e2e8f0'}`,borderRadius:12,padding:'14px 16px',fontSize:16,color:'#0f172a',outline:'none',boxSizing:'border-box',WebkitAppearance:'none'}}
            autoFocus
            id="contact-input"
          />
        </div>
      )}

      {err && <div style={{marginTop:8,fontSize:13,color:'#dc2626',fontWeight:600,display:'flex',alignItems:'center',gap:6}}>
        <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" fill="#dc2626"/><path d="M7 4v3M7 9.5v.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
        {err}
      </div>}

      <div style={{flex:1,minHeight:24}}/>

      <button
        onClick={async () => {
          const el = document.getElementById('contact-input')
          const val = el?.value?.trim() || ''
          if (!val) { setErr('Preenche o campo antes de continuar.'); return }
          if (inputMode==='phone' && val.replace(/\s/g,'').length < 9) { setErr('Insere 9 dígitos sem espaços.'); return }
          if (inputMode==='email' && !val.includes('@')) { setErr('Insere um email válido.'); return }
          setContact(val); setErr(''); setLoad(true)
          // Supabase: magic link (email) ou OTP SMS (telemóvel)
          if (SB_KEY) {
            try {
              if (inputMode==='email') {
                const r = await fetch(`${SB_URL}/auth/v1/otp`, {
                  method:'POST',
                  headers:{'apikey':SB_KEY,'Content-Type':'application/json'},
                  body: JSON.stringify({email:val, create_user:true})
                })
                if (!r.ok) { const d=await r.json(); setErr(d.msg||'Erro ao enviar email.'); setLoad(false); return }
              } else {
                const tel = '+351'+val.replace(/\s/g,'')
                const r = await fetch(`${SB_URL}/auth/v1/otp`, {
                  method:'POST',
                  headers:{'apikey':SB_KEY,'Content-Type':'application/json'},
                  body: JSON.stringify({phone:tel, create_user:true})
                })
                if (!r.ok) { const d=await r.json(); setErr(d.msg||'Erro ao enviar SMS. Verifica a configuração Twilio.'); setLoad(false); return }
              }
            } catch(e) { setErr('Erro de rede. Tenta novamente.'); setLoad(false); return }
          }
          setLoad(false); setTimer(58); setStep('otp_code')
        }}
        disabled={loading}
        style={{width:'100%',height:54,borderRadius:14,border:'none',background:loading?'#94a3b8':'#16a34a',color:'#fff',fontSize:16,fontWeight:800,cursor:loading?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginBottom:12}}>
        {loading
          ? <div style={{width:20,height:20,borderRadius:'50%',border:'2.5px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .8s linear infinite'}}/>
          : inputMode==='email' ? 'Enviar link de acesso →' : 'Enviar código SMS →'}
      </button>

      {!SB_KEY && <div style={{textAlign:'center',fontSize:11,color:'#94a3b8',padding:'8px',background:'#f1f5f9',borderRadius:9}}>
        🔧 Modo demo — sem Supabase key. <span style={{color:'#16a34a',fontWeight:700,cursor:'pointer'}} onClick={()=>setStep('otp_code')}>Continuar sem código</span>
      </div>}
    </div>
  )}

  // ── OTP CODE ─────────────────────────────────────
  if (step==='otp_code') return (
    <LightScreen>
      <BackBtn onClick={()=>setStep('otp_input')}/>
      <div style={{marginTop:28}}>
        <div style={{fontFamily:FONT,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'1.2px',color:SP.gray}}>Passo 1 de 2</div>
        <div style={{fontFamily:FONT,fontSize:24,fontWeight:900,color:SP.ink,marginTop:8,letterSpacing:'-0.4px'}}>Código enviado</div>
        <div style={{fontFamily:FONT,fontSize:14,color:SP.gray,marginTop:6,lineHeight:1.5}}>Enviámos para <b style={{color:SP.ink}}>+351 {contact}</b></div>
      </div>
      <div style={{marginTop:28,display:'flex',gap:8}}>
        {code.map((d,i)=>{
          const active=d===''&&code.slice(0,i).every(x=>x!=='')
          return(
            <div key={i} style={{flex:1,aspectRatio:'1/1.1',background:'#fff',borderRadius:10,border:`1.5px solid ${active?SP.green:SP.border}`,boxShadow:active?`0 0 0 4px ${SP.greenSoft}`:'none',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:FONT,fontSize:24,fontWeight:900,color:SP.ink,position:'relative'}}>
              {d}
              {active&&<span style={{width:2,height:22,background:SP.green,animation:'blink 1s infinite'}}/>}
            </div>
          )
        })}
      </div>
      <input value={code.join('')} onChange={e=>{const v=e.target.value.replace(/\D/g,'').slice(0,6);setCode(Array.from({length:6},(_,i)=>v[i]||''))}} style={{position:'absolute',opacity:0,pointerEvents:'none'}} autoFocus/>
      <div style={{marginTop:20,display:'flex',justifyContent:'space-between',fontFamily:FONT,fontSize:13}}>
        <div style={{color:SP.gray}}>Reenviar em <b style={{color:SP.ink}}>00:{String(timer).padStart(2,'0')}</b></div>
        <div style={{color:SP.green,fontWeight:700,cursor:'pointer'}} onClick={()=>setStep('otp_input')}>Mudar contacto</div>
      </div>
      <div style={{flex:1,minHeight:40}}/>
      <Btn onClick={verifyCode} disabled={code.filter(Boolean).length<6} isLoading={loading}>Verificar</Btn>
    </LightScreen>
  )

  // ── ROLE SELECTION ────────────────────────────────
  if (step==='role') return (
    <LightScreen>
      <BackBtn onClick={()=>setStep('otp_code')}/>
      <div style={{marginTop:28}}>
        <div style={{fontFamily:FONT,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'1.2px',color:SP.gray}}>Perfil</div>
        <div style={{fontFamily:FONT,fontSize:24,fontWeight:900,color:SP.ink,marginTop:8,letterSpacing:'-0.4px',lineHeight:1.15}}>Como queres usar o ServiçoPRO?</div>
        <div style={{fontFamily:FONT,fontSize:14,color:SP.gray,marginTop:6,lineHeight:1.5}}>Podes mudar mais tarde nas definições.</div>
      </div>
      <div style={{marginTop:28,display:'flex',flexDirection:'column',gap:12}}>
        {[{r:'cliente',ic:'👤',t:'Preciso de serviços',d:'Agenda limpeza, jardim e muito mais'},{r:'prestador',ic:'👷',t:'Quero prestar serviços',d:'Recebe ordens e gere o teu negócio'}].map(({r,ic,t,d})=>{
          const sel=role===r
          return(
            <button key={r} onClick={()=>setRole(r)} style={{padding:20,borderRadius:16,background:'#fff',border:`${sel?2:1}px solid ${sel?SP.green:SP.border}`,boxShadow:sel?'0 8px 24px rgba(22,163,74,0.12)':'none',display:'flex',gap:14,alignItems:'center',cursor:'pointer',width:'100%',textAlign:'left'}}>
              <div style={{width:52,height:52,borderRadius:14,background:sel?SP.greenSoft:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,flexShrink:0}}>{ic}</div>
              <div style={{flex:1}}><div style={{fontFamily:FONT,fontSize:16,fontWeight:800,color:SP.ink}}>{t}</div><div style={{fontFamily:FONT,fontSize:13,color:SP.gray,marginTop:2,lineHeight:1.4}}>{d}</div></div>
              <div style={{width:22,height:22,borderRadius:'50%',background:sel?SP.green:'transparent',border:sel?'none':`1.5px solid ${SP.border}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {sel&&<svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
            </button>
          )
        })}
      </div>
      <div style={{flex:1,minHeight:40}}/>
      <Btn onClick={()=>{if(role==='cliente')setStep('cli_morada');else setStep('categories')}} disabled={!role}>Continuar</Btn>
    </LightScreen>
  )

  // ── CLIENTE: MORADA ───────────────────────────────
  if (step==='cli_morada') return (
    <LightScreen>
      <BackBtn onClick={()=>setStep('role')}/>
      <div style={{marginTop:28}}>
        <div style={{fontFamily:FONT,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'1.2px',color:SP.gray}}>Passo 1 de 2 · Cliente</div>
        <div style={{fontFamily:FONT,fontSize:24,fontWeight:900,color:SP.ink,marginTop:8,letterSpacing:'-0.4px',lineHeight:1.15}}>Onde precisas dos serviços?</div>
        <div style={{fontFamily:FONT,fontSize:14,color:SP.gray,marginTop:6,lineHeight:1.5}}>Adicionamos moradas extra mais tarde.</div>
      </div>
      <div style={{marginTop:24}}>
        <div style={{fontFamily:FONT,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'1.2px',color:SP.gray,marginBottom:8}}>Morada</div>
        <div style={{background:'#fff',border:`1.5px solid ${SP.green}`,borderRadius:10,padding:'12px 14px',boxShadow:`0 0 0 4px ${SP.greenSoft}`,display:'flex',alignItems:'center',gap:10}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7z" stroke={SP.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="9" r="2.5" stroke={SP.green} strokeWidth="2"/></svg>
          <input placeholder="Rua Augusta, Lisboa" style={{flex:1,border:'none',outline:'none',fontFamily:FONT,fontSize:15,color:SP.ink,fontWeight:500,background:'transparent'}}/>
          <span style={{width:2,height:18,background:SP.green,animation:'blink 1s infinite'}}/>
        </div>
        {/* Sugestões */}
        <div style={{marginTop:10,background:'#fff',border:`1px solid ${SP.border}`,borderRadius:12,overflow:'hidden'}}>
          {['Rua Augusta 42 · 1100-048 Lisboa','Rua Augusta Rosa · 2775-618 Carcavelos','Avenida da Liberdade · 1250-096 Lisboa'].map((s,i)=>(
            <div key={i} style={{padding:'12px 14px',display:'flex',alignItems:'center',gap:12,borderTop:i===0?'none':`1px solid ${SP.border}`,cursor:'pointer'}}
              onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{width:28,height:28,borderRadius:8,background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>📍</div>
              <div><div style={{fontFamily:FONT,fontSize:14,fontWeight:600,color:SP.ink}}>{s.split('·')[0]}</div><div style={{fontFamily:FONT,fontSize:12,color:SP.gray}}>{s.split('·')[1]}</div></div>
            </div>
          ))}
        </div>
      </div>
      <div style={{marginTop:14,padding:'10px 12px',borderRadius:10,background:SP.greenSoft,display:'flex',alignItems:'center',gap:8}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={SP.greenDeep} strokeWidth="2"/><path d="M12 8v4l3 2" stroke={SP.greenDeep} strokeWidth="2" strokeLinecap="round"/></svg>
        <div style={{fontFamily:FONT,fontSize:12,color:SP.greenDeep,fontWeight:600}}>24 profissionais disponíveis nesta zona</div>
      </div>
      <div style={{flex:1,minHeight:24}}/>
      <Btn onClick={()=>setStep('cli_servicos')}>Continuar</Btn>
    </LightScreen>
  )

  // ── CLIENTE: SERVIÇOS PREFERIDOS ──────────────────
  if (step==='cli_servicos') return (
    <LightScreen>
      <BackBtn onClick={()=>setStep('cli_morada')}/>
      <div style={{marginTop:28}}>
        <div style={{fontFamily:FONT,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'1.2px',color:SP.gray}}>Passo 2 de 2 · Cliente</div>
        <div style={{fontFamily:FONT,fontSize:24,fontWeight:900,color:SP.ink,marginTop:8,letterSpacing:'-0.4px',lineHeight:1.15}}>O que costumas precisar?</div>
        <div style={{fontFamily:FONT,fontSize:14,color:SP.gray,marginTop:6,lineHeight:1.5}}>Opcional — para te mostrar resultados mais relevantes.</div>
      </div>
      <div style={{marginTop:20,display:'flex',flexDirection:'column',gap:8}}>
        {[{ic:'🧹',l:'Limpeza',sub:'Semanal · quinzenal'},{ic:'🌿',l:'Jardim',sub:'Manutenção · poda'},{ic:'🚿',l:'Canalização',sub:'Reparação · urgências'},{ic:'⚡',l:'Elétrica',sub:'Instalação · avarias'},{ic:'🎨',l:'Pintura',sub:'Interior · exterior'},{ic:'🏗️',l:'Pós-Obra',sub:'Limpeza profunda'}].map((s,i)=>{
          const sel=cats.includes(s.l)
          return(
            <button key={s.l} onClick={()=>setCats(p=>sel?p.filter(x=>x!==s.l):[...p,s.l])}
              style={{padding:'12px 14px',borderRadius:14,background:sel?SP.greenSoft:'#fff',border:`${sel?1.5:1}px solid ${sel?SP.green:SP.border}`,display:'flex',alignItems:'center',gap:12,cursor:'pointer',width:'100%',textAlign:'left'}}>
              <div style={{width:40,height:40,borderRadius:10,background:sel?'#fff':'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{s.ic}</div>
              <div style={{flex:1}}><div style={{fontFamily:FONT,fontSize:14,fontWeight:700,color:SP.ink}}>{s.l}</div><div style={{fontFamily:FONT,fontSize:12,color:SP.gray,marginTop:1}}>{s.sub}</div></div>
              <div style={{width:20,height:20,borderRadius:6,background:sel?SP.green:'transparent',border:sel?'none':`1.5px solid ${SP.border}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {sel&&<svg width="11" height="11" viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
            </button>
          )
        })}
      </div>
      <div style={{flex:1,minHeight:24}}/>
      <div style={{display:'flex',gap:10}}>
        <Btn ghost onClick={()=>{setStep('success');setTimeout(()=>onAuth({user:{id:`c${Date.now()}`},token:null,role:'cliente',nome:contact||'Cliente',demo:!SB_KEY}),1500)}}>Saltar</Btn>
        <Btn onClick={()=>{setStep('success');setTimeout(()=>onAuth({user:{id:`c${Date.now()}`},token:null,role:'cliente',nome:contact||'Cliente',demo:!SB_KEY}),1500)}}>Concluir</Btn>
      </div>
    </LightScreen>
  )

  // ── CATEGORIES (prestador) ────────────────────────
  if (step==='categories') return (
    <LightScreen>
      <BackBtn onClick={()=>setStep('role')}/>
      <div style={{marginTop:28}}>
        <div style={{fontFamily:FONT,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'1.2px',color:SP.gray}}>Passo 1 de 3 · Prestador</div>
        <div style={{fontFamily:FONT,fontSize:24,fontWeight:900,color:SP.ink,marginTop:8,letterSpacing:'-0.4px'}}>Que serviços prestas?</div>
        <div style={{fontFamily:FONT,fontSize:14,color:SP.gray,marginTop:6,lineHeight:1.5}}>Escolhe uma ou mais. Podes adicionar depois.</div>
      </div>
      <div style={{marginTop:28,display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {[{id:'limpeza',ic:'🧹',l:'Limpeza'},{id:'jardim',ic:'🌿',l:'Jardim'},{id:'canalizacao',ic:'🚿',l:'Canalização'},{id:'eletrica',ic:'⚡',l:'Elétrica'},{id:'pintura',ic:'🎨',l:'Pintura'},{id:'obra',ic:'🏗️',l:'Pós-Obra'}].map(c=>{
          const sel=cats.includes(c.id)
          return(
            <button key={c.id} onClick={()=>setCats(p=>sel?p.filter(x=>x!==c.id):[...p,c.id])}
              style={{padding:'14px 12px',borderRadius:14,background:sel?SP.greenSoft:'#fff',border:`${sel?1.5:1}px solid ${sel?SP.green:SP.border}`,display:'flex',flexDirection:'column',alignItems:'flex-start',gap:6,cursor:'pointer',textAlign:'left'}}>
              <span style={{fontSize:22}}>{c.ic}</span>
              <span style={{fontFamily:FONT,fontSize:13,fontWeight:700,color:sel?SP.greenDeep:SP.ink}}>{c.l}</span>
            </button>
          )
        })}
      </div>
      {cats.length>0&&<div style={{marginTop:12}}><span style={{background:SP.greenSoft,color:SP.greenDeep,padding:'3px 10px',borderRadius:6,fontSize:11,fontWeight:700}}>{cats.length} seleccionado{cats.length>1?'s':''}</span></div>}
      <div style={{flex:1,minHeight:24}}/>
      <Btn onClick={()=>setStep('prest_docs')} disabled={cats.length===0}>Continuar</Btn>
    </LightScreen>
  )

  // ── PRESTADOR: DOCUMENTOS (v2 novo) ───────────────
  if (step==='prest_docs') return (
    <LightScreen>
      <BackBtn onClick={()=>setStep('categories')}/>
      <div style={{marginTop:28}}>
        <div style={{fontFamily:FONT,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'1.2px',color:SP.gray}}>Passo 2 de 3 · Prestador</div>
        <div style={{fontFamily:FONT,fontSize:24,fontWeight:900,color:SP.ink,marginTop:8,letterSpacing:'-0.4px',lineHeight:1.15}}>Documentos <span style={{color:SP.green}}>(opcional)</span></div>
        <div style={{fontFamily:FONT,fontSize:14,color:SP.gray,marginTop:6,lineHeight:1.5}}>Podes enviar agora ou depois. Se faltar algo, pedimos-te na aprovação.</div>
      </div>
      <div style={{marginTop:22,display:'flex',flexDirection:'column',gap:10}}>
        {[{ic:'🪪',t:'Cartão de Cidadão',sub:'Verificado · frente + verso',st:'done'},{ic:'📋',t:'NIF / atividade aberta',sub:'123 456 789',st:'done'},{ic:'🛡️',t:'Seguro resp. civil',sub:'Recomendado',st:'pending'},{ic:'🏅',t:'Certificações',sub:'Ex: CAP, IEFP',st:'pending'}].map(d=>(
          <div key={d.t} style={{padding:'12px 14px',borderRadius:14,background:'#fff',border:`1px solid ${SP.border}`,display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:40,height:40,borderRadius:10,background:d.st==='done'?SP.greenSoft:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{d.ic}</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:FONT,fontSize:14,fontWeight:700,color:SP.ink}}>{d.t}</div>
              <div style={{fontFamily:FONT,fontSize:12,marginTop:2,fontWeight:500,color:d.st==='done'?SP.green:SP.grayLight}}>{d.sub}</div>
            </div>
            {d.st==='done'
              ?<div style={{width:24,height:24,borderRadius:'50%',background:SP.green,display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
              :<div style={{fontFamily:FONT,fontSize:12,color:SP.green,fontWeight:700,cursor:'pointer'}}>Adicionar</div>
            }
          </div>
        ))}
      </div>
      <div style={{marginTop:14,padding:'10px 12px',borderRadius:10,background:SP.greenSoft,display:'flex',alignItems:'flex-start',gap:8}}>
        <svg width="14" height="14" viewBox="0 0 14 14" style={{flexShrink:0,marginTop:2}}><circle cx="7" cy="7" r="6" fill={SP.green}/><path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <div style={{fontFamily:FONT,fontSize:12,color:SP.greenDeep,lineHeight:1.45}}>Só precisas de CC + NIF para avançar. O resto pode ser adicionado mais tarde.</div>
      </div>
      <div style={{flex:1,minHeight:24}}/>
      <div style={{display:'flex',gap:10}}>
        <Btn ghost onClick={()=>setStep('pending')}>Saltar por agora</Btn>
        <Btn onClick={()=>setStep('pending')}>Continuar</Btn>
      </div>
    </LightScreen>
  )

  // ── PENDING (prestador) ────────────────────────────
  if (step==='pending') return (
    <LightScreen>
      <div style={{display:'flex',justifyContent:'flex-end'}}>
        <button onClick={()=>onAuth({user:{id:`p${Date.now()}`},token:null,role:'prestador',nome:contact||'Prestador',demo:!SB_KEY,cats})} style={{background:'none',border:'none',cursor:'pointer',fontFamily:FONT,fontSize:13,color:SP.gray,fontWeight:600}}>Sair</button>
      </div>
      <div style={{marginTop:20,display:'flex',justifyContent:'center'}}>
        <div style={{width:96,height:96,borderRadius:'50%',background:SP.greenSoft,display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
          <div style={{position:'absolute',inset:-6,borderRadius:'50%',border:`3px solid ${SP.green}`,borderTopColor:'transparent',borderRightColor:'transparent',animation:'spin 2s linear infinite'}}/>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={SP.green} strokeWidth="2"/><path d="M12 7v5l3 2" stroke={SP.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>
      <div style={{marginTop:24,textAlign:'center'}}>
        <div style={{fontFamily:FONT,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'1.2px',color:SP.amber,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>● Em análise</div>
        <div style={{fontFamily:FONT,fontSize:24,fontWeight:900,color:SP.ink,marginTop:8,letterSpacing:'-0.4px'}}>Conta em análise</div>
        <div style={{fontFamily:FONT,fontSize:14,color:SP.gray,marginTop:8,lineHeight:1.5,maxWidth:280,margin:'8px auto 0'}}>Estamos a verificar os teus dados. Normalmente em menos de 24h.</div>
      </div>
      <div style={{marginTop:32,background:'#fff',border:`1px solid ${SP.border}`,borderRadius:16,padding:20}}>
        {[{ic:'✅',t:'Registo',d:'Concluído · hoje',st:'done'},{ic:'⏳',t:'Verificação',d:'A decorrer · até 24h',st:'active'},{ic:'🔒',t:'Activo',d:'Recebe as primeiras ordens',st:'pending',last:true}].map(s=>{
          const col=s.st==='done'?SP.green:s.st==='active'?SP.amber:SP.grayLight
          return(
            <div key={s.t} style={{display:'flex',gap:14,position:'relative',paddingBottom:s.last?0:18}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:s.st==='done'?SP.greenSoft:s.st==='active'?'#fef3c7':'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0}}>{s.ic}</div>
                {!s.last&&<div style={{width:2,flex:1,marginTop:4,background:s.st==='done'?SP.green:SP.border}}/>}
              </div>
              <div style={{flex:1,paddingTop:4}}>
                <div style={{fontFamily:FONT,fontSize:14,fontWeight:700,color:SP.ink}}>{s.t}</div>
                <div style={{fontFamily:FONT,fontSize:12,color:col,marginTop:2,fontWeight:600}}>{s.d}</div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{flex:1,minHeight:32}}/>
      <Btn onClick={()=>onAuth({user:{id:`p${Date.now()}`},token:null,role:'prestador',nome:contact||'Prestador',demo:!SB_KEY,cats})}>Completar o meu perfil</Btn>
      <div style={{textAlign:'center',fontFamily:FONT,fontSize:13,color:SP.gray,fontWeight:500,marginTop:10}}>Avisamos-te por SMS assim que fores aprovado</div>
    </LightScreen>
  )

  // ── SUCCESS (cliente) ──────────────────────────────
  if (step==='success') return (
    <div style={{minHeight:'100vh',background:`linear-gradient(160deg,${SP.green} 0%,${SP.greenDeep} 100%)`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{position:'relative',width:140,height:140,display:'flex',alignItems:'center',justifyContent:'center',animation:'popIn 0.4s ease'}}>
        {[1,.72,.48].map((s,i)=><div key={i} style={{position:'absolute',width:140*s,height:140*s,borderRadius:'50%',border:`2px solid rgba(255,255,255,${0.15+i*.1})`}}/>)}
        <div style={{width:72,height:72,borderRadius:'50%',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 12px 40px rgba(0,0,0,0.2)'}}>
          <svg width="34" height="26" viewBox="0 0 40 30" fill="none"><path d="M3 15l11 11L37 3" stroke={SP.green} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>
      <div style={{fontFamily:FONT,fontSize:26,fontWeight:900,color:'#fff',marginTop:32,letterSpacing:'-0.4px',textAlign:'center'}}>Bem-vinda!</div>
      <div style={{fontFamily:FONT,fontSize:14,color:'rgba(255,255,255,0.8)',marginTop:8,lineHeight:1.5,textAlign:'center',maxWidth:280}}>A tua conta está pronta. <b style={{color:'#fff'}}>24 profissionais</b> na tua zona.</div>
      <div style={{marginTop:28,width:'100%',maxWidth:360,background:'rgba(255,255,255,0.1)',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:16,padding:16}}>
        <div style={{fontFamily:FONT,fontSize:10,fontWeight:700,letterSpacing:'1.2px',color:'rgba(255,255,255,0.6)',textTransform:'uppercase',marginBottom:10}}>Próximo passo</div>
        <div style={{fontFamily:FONT,fontSize:15,fontWeight:700,color:'#fff',marginBottom:4}}>Primeira marcação grátis</div>
        <div style={{fontFamily:FONT,fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.5}}>Usa o código <b style={{color:'#fff'}}>BEMVINDA</b> até 31 de Maio.</div>
      </div>
    </div>
  )

  return null
}

/* ══ PALETA ══ */
const C = {
  g:'#16a34a', gd:'#14532d', gl:'#dcfce7', gm:'#22c55e',
  navy:'#0f172a', navyM:'#1e293b', slate:'#64748b',
  border:'#e2e8f0', mist:'#f8fafc', white:'#fff',
  amber:'#f59e0b', red:'#ef4444',
  copper:'#C17E3A', copperL:'#E8A857',
}

/* ══ DADOS ══ */
const CATS = [
  {id:'limpeza',    l:'Limpeza',     ic:'🧹', cor:'#16a34a'},
  {id:'manutencao', l:'Manutenção',  ic:'🔧', cor:'#0ea5e9'},
  {id:'jardim',     l:'Jardim',      ic:'🌿', cor:'#22c55e'},
  {id:'piscina',    l:'Piscina',     ic:'🏊', cor:'#06b6d4'},
  {id:'pintura',    l:'Pintura',     ic:'🎨', cor:'#f97316'},
  {id:'eletrica',   l:'Elétrica',    ic:'⚡', cor:'#eab308'},
  {id:'canalizacao',l:'Canalização', ic:'🚿', cor:'#8b5cf6'},
  {id:'pos_obra',   l:'Pós-Obra',    ic:'🏗️', cor:'#78716c'},
]
const SVCS = [
  // ── LIMPEZA ──────────────────────────────────────────
  {id:'s1', cat:'limpeza',     n:'Plano Anual Preventivo',   p:499, u:'/ano',    d:'12 visitas/ano',  r:4.9,rv:312, badge:'Destaque', ic:'🛡️', margem:90, desc:'Visita mensal de limpeza geral. Prioridade na marcação.'},
  {id:'s2', cat:'limpeza',     n:'Limpeza Regular (T2)',      p:75,  u:'/visita', d:'3–4h',            r:4.8,rv:840, badge:null,       ic:'🧹', margem:14, desc:'Limpeza completa de apartamento T2. Produtos incluídos.'},
  {id:'s3', cat:'limpeza',     n:'Limpeza Profunda',         p:120, u:'/visita', d:'5–7h',            r:4.9,rv:220, badge:'Popular',  ic:'✨', margem:22, desc:'Limpeza a fundo, incluindo armários, electrodomésticos e janelas.'},
  {id:'s4', cat:'limpeza',     n:'Limpeza Pós-Obra',         p:180, u:'fixo',    d:'6–10h',           r:4.9,rv:180, badge:null,       ic:'🏗️',margem:32, desc:'Remoção de resíduos de construção, poeiras e acabamentos.'},
  {id:'s5', cat:'limpeza',     n:'Limpeza Pós-Evento',       p:100, u:'/visita', d:'3–5h',            r:4.7,rv:95,  badge:null,       ic:'🎉', margem:18, desc:'Limpeza após festas, eventos ou reuniões.'},
  {id:'s6', cat:'limpeza',     n:'Limpeza de Janelas',       p:55,  u:'/visita', d:'1–2h',            r:4.6,rv:140, badge:null,       ic:'🪟', margem:10, desc:'Interior e exterior. Inclui molduras e parapeitos.'},
  {id:'s7', cat:'limpeza',     n:'Condomínio Mensal',        p:150, u:'/mês',    d:'Recorrente',      r:4.8,rv:65,  badge:null,       ic:'🏢', margem:27, desc:'Limpeza de áreas comuns, escadas e elevadores.'},
  {id:'s8', cat:'limpeza',     n:'Limpeza Tapetes/Estofos',  p:45,  u:'/unidade',d:'1–2h',            r:4.7,rv:80,  badge:null,       ic:'🛋️', margem:8,  desc:'Lavagem a fundo de tapetes, sofás e colchões.'},

  // ── JARDIM ───────────────────────────────────────────
  {id:'s10',cat:'jardim',      n:'Manutenção de Jardim',     p:100, u:'/visita', d:'2–4h',            r:4.7,rv:190, badge:null,       ic:'🌿', margem:18, desc:'Corte de relva, poda de arbustos e limpeza geral.'},
  {id:'s11',cat:'jardim',      n:'Corte de Relva',           p:45,  u:'/visita', d:'1–2h',            r:4.6,rv:220, badge:null,       ic:'🌱', margem:8,  desc:'Corte, aparagem de bordas e recolha de aparas.'},
  {id:'s12',cat:'jardim',      n:'Poda de Árvores',          p:80,  u:'/visita', d:'2–4h',            r:4.8,rv:110, badge:null,       ic:'🌳', margem:14, desc:'Poda formativa e de manutenção. Remoção de ramos.'},
  {id:'s13',cat:'jardim',      n:'Limpeza de Terreno',       p:150, u:'fixo',    d:'4–8h',            r:4.7,rv:70,  badge:null,       ic:'🏕️', margem:27, desc:'Remoção de ervas daninhas, lixo e vegetação seca.'},
  {id:'s14',cat:'jardim',      n:'Sistema de Rega',          p:180, u:'fixo',    d:'3–6h',            r:4.8,rv:45,  badge:null,       ic:'💧', margem:32, desc:'Instalação de rega automática por gotejamento.'},

  // ── PISCINA ──────────────────────────────────────────
  {id:'s20',cat:'piscina',     n:'Manutenção Mensal',        p:120, u:'/mês',    d:'Recorrente',      r:4.8,rv:140, badge:null,       ic:'🏊', margem:22, desc:'Limpeza, análise e tratamento de água. Visita semanal.'},
  {id:'s21',cat:'piscina',     n:'Limpeza Pontual',          p:75,  u:'/visita', d:'1–3h',            r:4.7,rv:95,  badge:null,       ic:'🧽', margem:14, desc:'Aspiração, tratamento químico e limpeza de bordas.'},
  {id:'s22',cat:'piscina',     n:'Abertura de Temporada',    p:150, u:'fixo',    d:'3–5h',            r:4.9,rv:80,  badge:'Sazonal',  ic:'☀️', margem:27, desc:'Limpeza completa, verificação de equipamentos e tratamento.'},
  {id:'s23',cat:'piscina',     n:'Fecho de Temporada',       p:120, u:'fixo',    d:'2–4h',            r:4.8,rv:75,  badge:null,       ic:'🍂', margem:22, desc:'Tratamento de conservação, lona e revisão de filtros.'},

  // ── CANALIZAÇÃO ──────────────────────────────────────
  {id:'s30',cat:'canalizacao', n:'Urgência Canalização',     p:95,  u:'fixo',    d:'1–2h',            r:4.9,rv:390, badge:'Urgente',  ic:'🚨', margem:17, desc:'Intervenção rápida em fugas, desentupimentos urgentes.'},
  {id:'s31',cat:'canalizacao', n:'Desentupimento Sanita',    p:80,  u:'fixo',    d:'30min–2h',        r:4.8,rv:210, badge:null,       ic:'🚿', margem:14, desc:'Desentupimento profissional com equipamento adequado.'},
  {id:'s32',cat:'canalizacao', n:'Reparação de Torneira',    p:45,  u:'fixo',    d:'30min–1h',        r:4.7,rv:180, badge:null,       ic:'🔧', margem:8,  desc:'Substituição de torneiras, vedantes e cartucho.'},
  {id:'s33',cat:'canalizacao', n:'Visita Técnica',           p:49,  u:'fixo',    d:'30min–1h',        r:4.6,rv:300, badge:null,       ic:'🔍', margem:9,  desc:'Diagnóstico e orçamento. Valor deduzido na reparação.'},
  {id:'s34',cat:'canalizacao', n:'Deteção de Fuga',          p:95,  u:'fixo',    d:'1–3h',            r:4.8,rv:120, badge:null,       ic:'💧', margem:17, desc:'Deteção e reparação de fugas em tubagens.'},

  // ── ELÉTRICA ─────────────────────────────────────────
  {id:'s40',cat:'eletrica',    n:'Avaria Elétrica',          p:55,  u:'fixo',    d:'30min–2h',        r:4.8,rv:210, badge:null,       ic:'⚡', margem:10, desc:'Diagnóstico e reparação de avarias elétricas.'},
  {id:'s41',cat:'eletrica',    n:'Instalação Tomadas/Focos', p:35,  u:'/unidade',d:'30min',           r:4.7,rv:190, badge:null,       ic:'🔌', margem:6,  desc:'Instalação ou substituição de tomadas, interruptores e focos.'},
  {id:'s42',cat:'eletrica',    n:'Instalação Ar Condicionado',p:150,u:'fixo',    d:'2–4h',            r:4.8,rv:120, badge:null,       ic:'❄️', margem:27, desc:'Instalação completa de unidade split. Sem materiais.'},
  {id:'s43',cat:'eletrica',    n:'Substituição Quadro',      p:280, u:'fixo',    d:'3–6h',            r:4.9,rv:60,  badge:null,       ic:'⚙️', margem:50, desc:'Substituição do quadro elétrico com disjuntores.'},
  {id:'s44',cat:'eletrica',    n:'Urgência Elétrica',        p:88,  u:'fixo',    d:'1–2h',            r:4.9,rv:150, badge:'Urgente',  ic:'🚨', margem:16, desc:'Intervenção urgente em avarias e cortes de energia.'},

  // ── PINTURA ──────────────────────────────────────────
  {id:'s50',cat:'pintura',     n:'Pintura de Divisão',       p:220, u:'fixo',    d:'1–2 dias',        r:4.7,rv:160, badge:null,       ic:'🎨', margem:40, desc:'Pintura de paredes e teto de uma divisão. Inclui preparação.'},
  {id:'s51',cat:'pintura',     n:'Pintura Apartamento T2',   p:900, u:'fixo',    d:'3–5 dias',        r:4.8,rv:80,  badge:'Popular',  ic:'🏠', margem:162,desc:'Pintura completa de apartamento T2. Inclui todos os materiais.'},
  {id:'s52',cat:'pintura',     n:'Pintura de Fachada (m²)',  p:13,  u:'/m²',     d:'Variável',        r:4.7,rv:55,  badge:null,       ic:'🏗️',margem:2,  desc:'Preparação, primário e pintura exterior. Por metro quadrado.'},

  // ── MANUTENÇÃO GERAL ─────────────────────────────────
  {id:'s60',cat:'manutencao',  n:'Handyman (2h)',             p:80,  u:'fixo',    d:'2h',              r:4.7,rv:230, badge:null,       ic:'🔨', margem:14, desc:'Pequenas reparações: prateleiras, rodapés, colagem, selagem.'},
  {id:'s61',cat:'manutencao',  n:'Montagem de Móveis',       p:50,  u:'/visita', d:'1–3h',            r:4.6,rv:310, badge:null,       ic:'🪑', margem:9,  desc:'Montagem de móveis IKEA e outras marcas.'},
  {id:'s62',cat:'manutencao',  n:'Controlo de Pragas',       p:90,  u:'/visita', d:'1–2h',            r:4.8,rv:85,  badge:null,       ic:'🐜', margem:16, desc:'Tratamento contra formigas, baratas, ratos e outros.'},
  {id:'s63',cat:'manutencao',  n:'Limpeza de Chaminé',       p:80,  u:'/visita', d:'1–2h',            r:4.7,rv:70,  badge:'Sazonal',  ic:'🔥', margem:14, desc:'Limpeza e inspeção de chaminé e lareira.'},
]
const TECNICOS = [
  {id:'p1',n:'António Ferreira',ini:'AF',
   morada:'Rua das Flores, 23',cp:'2500-123',cidade:'Caldas da Rainha',
   nif:'123 456 789',indicativo:'+351',tel:'914 000 001',email:'antonio.ferreira@email.com',
   foto:null, comprovativo_iban:null,
   bio:'Especialista em limpeza residencial e pós-obra com 8 anos de experiência em Caldas da Rainha e arredores.',
   cats:['limpeza','obra'],r:4.9,jobs:340,anos:8,loc:'Caldas da Rainha',st:'activo',ok:true,
   iban:'PT50 0035 0000 1111 0001 0',nivel:'gold',saldo:105},
  {id:'p2',n:'Ricardo Gomes',ini:'RG',
   morada:'Rua do Castelo, 5',cp:'2510-089',cidade:'Óbidos',
   nif:'234 567 890',indicativo:'+351',tel:'914 000 002',email:'ricardo.gomes@email.com',
   foto:null,comprovativo_iban:null,bio:'Canalizador e eletricista com 12 anos de experiência. Disponível para urgências.',
   cats:['canalizacao','eletrica'],r:4.8,jobs:520,anos:12,loc:'Óbidos',st:'activo',ok:true,
   iban:'PT50 0010 0000 2222 0002 0',nivel:'silver',saldo:210},
  {id:'p3',n:'Sandra Matos',ini:'SM',
   morada:'Av. Central, 88',cp:'2500-456',cidade:'Caldas da Rainha',
   nif:'345 678 901',indicativo:'+351',tel:'914 000 003',email:'sandra.matos@email.com',
   foto:null,comprovativo_iban:null,bio:'Especialista em limpeza profissional. Rigor, pontualidade e qualidade garantidas.',
   cats:['limpeza'],r:5.0,jobs:190,anos:6,loc:'Caldas da Rainha',st:'activo',ok:true,
   iban:'PT50 0033 0000 3333 0003 0',nivel:'base',saldo:68},
  {id:'p4',n:'Manuel Costa',ini:'MC',
   morada:'Rua do Jardim, 12',cp:'2460-123',cidade:'Alcobaça',
   nif:'456 789 012',indicativo:'+351',tel:'914 000 004',email:'manuel.costa@email.com',
   foto:null,comprovativo_iban:null,bio:'Jardinagem e manutenção de piscinas. Projetos residenciais e condominiais.',
   cats:['jardim','piscina'],r:4.7,jobs:210,anos:9,loc:'Alcobaça',st:'ocupado',ok:true,
   iban:'PT50 0020 0000 4444 0004 0',nivel:'silver',saldo:34},
]
const REVIEWS = [
  {n:'Ana S.',    c:'Caldas da Rainha',t:'Serviço incrível! O técnico foi pontual e muito cuidadoso.',         r:5,svc:'Limpeza Mensal',      tec:'António F.'},
  {n:'Carlos M.', c:'Óbidos',          t:'Urgência de canalização resolvida em 1h. Muito profissional.',       r:5,svc:'Urgência Canalização', tec:'Ricardo G.'},
  {n:'Maria A.',  c:'Leiria',          t:'Já sou cliente há 2 anos. Sempre o mesmo técnico, sempre excelente.',r:5,svc:'Plano Anual',           tec:'Sandra M.'},
]
const ORDENS_INIT = [
  {id:'ot1',sid:'s2',cli:'Sr. Ferreira', cliId:'cl1',morada:'Rua das Flores, 23, Caldas',  km:2.1, data:'Hoje',   hora:'14:00',tid:'p1',st:'em_curso',          fotos:[],               ass:false,aval:null,notas:'3.º andar',      pago:true,  val:75,  taxa:18,dt_pedido:'21 Abr 09:12'},
  {id:'ot2',sid:'s6',cli:'Cond. Verde',  cliId:'cl2',morada:'Av. da Liberdade, 10, Caldas',km:5.3, data:'Amanhã', hora:'10:00',tid:null,st:'pendente',           fotos:[],               ass:false,aval:null,notas:'Fuga na cave',   pago:true,  val:65,  taxa:18,dt_pedido:'21 Abr 10:05'},
  {id:'ot3',sid:'s4',cli:'Sra. Alves',   cliId:'cl3',morada:'Quinta Rosas, Óbidos',        km:12.4,data:'12 Abr', hora:'10:00',tid:'p4',st:'paga',               fotos:['🌿','📷','📷'],ass:true, aval:5,   notas:'',              pago:true,  val:45,  taxa:20,dt_pedido:'10 Abr 14:30'},
  {id:'ot4',sid:'s2',cli:'Cond. Sol',    cliId:'cl4',morada:'Rua do Sol, 5, Caldas',       km:3.8, data:'22 Abr', hora:'11:00',tid:null,st:'pendente',           fotos:[],               ass:false,aval:null,notas:'',              pago:true,  val:75,  taxa:18,dt_pedido:'21 Abr 11:47'},
  {id:'ot5',sid:'s3',cli:'Ed. Atlântico',cliId:'cl6',morada:'Rua do Porto, 1, Caldas',     km:4.1, data:'23 Abr', hora:'09:00',tid:'p3',st:'agendado',           fotos:[],               ass:false,aval:null,notas:'4 apartamentos',pago:true,  val:120, taxa:22,dt_pedido:'20 Abr 16:22'},
  {id:'ot6',sid:'s7',cli:'Sr. Martins',  cliId:'cl5',morada:'Ed. Atlântico, Caldas',       km:2.9, data:'24 Abr', hora:'14:00',tid:'p2',st:'proposta_hora',      fotos:[],               ass:false,aval:null,notas:'Quadro antigo',  pago:true,  val:80,  taxa:20,hora_proposta:'16:00',dt_pedido:'21 Abr 08:00'},
  {id:'ot7',sid:'s1',cli:'Sr. Ferreira', cliId:'cl1',morada:'Rua das Flores, 23, Caldas',  km:2.1, data:'25 Abr', hora:'10:00',tid:'p1',st:'aguarda_validacao',  fotos:['📷','📷','📷'],ass:false,aval:null,notas:'',              pago:true,  val:49,  taxa:18,dt_pedido:'19 Abr 09:00'},
  {id:'ot8',sid:'s5',cli:'Cond. Sol',    cliId:'cl4',morada:'Rua do Sol, 5, Caldas',       km:3.8, data:'18 Abr', hora:'11:00',tid:'p4',st:'concluida',          fotos:['🏊','📷'],     ass:true, aval:4,   notas:'',              pago:true,  val:55,  taxa:20,dt_pedido:'16 Abr 10:00'},
  {id:'ot9',sid:'s8',cli:'Sra. Alves',   cliId:'cl3',morada:'Quinta Rosas, Óbidos',        km:12.4,data:'10 Abr', hora:'09:00',tid:'p4',st:'faturada',           fotos:['🎨','📷','📷'],ass:true, aval:5,   notas:'Sala + quarto',  pago:true,  val:90,  taxa:20,dt_pedido:'8 Abr 15:00'},
]
const MOVS = [
  {id:'m1',tipo:'credito', v:57.00, d:'Limpeza Mensal — Rua das Flores', dt:'Hoje 14:32',  st:'disponivel',oid:'ot1'},
  {id:'m2',tipo:'credito', v:57.00, d:'Limpeza Mensal — Av. Brasil',     dt:'Ontem 11:15', st:'disponivel',oid:'ot2'},
  {id:'m3',tipo:'credito', v:91.00, d:'Limpeza Pós-Obra — Ed. Roma',     dt:'12 Abr',      st:'disponivel',oid:'ot3'},
  {id:'m4',tipo:'levantar',v:-145.00,d:'Levantamento IBAN pessoal',      dt:'10 Abr',      st:'processado', oid:null},
  {id:'m5',tipo:'bonus',   v:10.00, d:'Bónus avaliação perfeita — Março',dt:'1 Abr',       st:'disponivel',oid:null},
  {id:'m6',tipo:'seguro',  v:-8.50, d:'Seguro RC Grupo — Abril',         dt:'1 Abr',       st:'processado', oid:null},
  {id:'m7',tipo:'credito', v:34.00, d:'Manutenção Jardim — Sra. Alves',  dt:'28 Mar',      st:'disponivel',oid:'ot4'},
]
// Mensagens de chat por ordem (sistema + utilizadores)
const CHAT_INIT = {
  ot1:[
    {id:'c1',tipo:'system_auto',texto:'💳 Pagamento confirmado. Ordem criada com sucesso.',dt:'21 Abr 09:12'},
    {id:'c2',tipo:'system_auto',texto:'👷 António Ferreira aceitou o serviço. Data: Hoje · 14:00.',dt:'21 Abr 09:35'},
    {id:'c3',tipo:'user_provider',autor:'António F.',texto:'Bom dia! Estarei aí às 14h. Tenho todos os materiais. Alguma instrução especial?',dt:'21 Abr 09:40'},
    {id:'c4',tipo:'user_client',autor:'Sr. Ferreira',texto:'Bom dia! 3.º andar, código da porta é 1234. Obrigado!',dt:'21 Abr 09:45'},
    {id:'c5',tipo:'system_auto',texto:'⏰ Lembrete: o seu serviço começa em 2 horas.',dt:'21 Abr 12:00'},
    {id:'c6',tipo:'system_auto',texto:'🔧 António Ferreira chegou ao local e iniciou o trabalho.',dt:'21 Abr 14:02'},
  ],
  ot2:[
    {id:'c10',tipo:'system_auto',texto:'💳 Pagamento confirmado. À procura de técnico disponível...',dt:'21 Abr 10:05'},
    {id:'c11',tipo:'system_auto',texto:'📬 Ordem em aberto. Notificámos 3 prestadores disponíveis na sua zona.',dt:'21 Abr 10:05'},
  ],
  ot5:[
    {id:'c20',tipo:'system_auto',texto:'💳 Pagamento confirmado. Ordem criada.',dt:'20 Abr 16:22'},
    {id:'c21',tipo:'system_auto',texto:'👷 Sandra Matos aceitou o serviço. Data: 23 Abr · 09:00.',dt:'20 Abr 16:45'},
    {id:'c22',tipo:'user_provider',autor:'Sandra M.',texto:'Olá! Para a limpeza pós-obra de 4 apartamentos vou precisar de trazer a minha equipa (2 pessoas). Está bem?',dt:'20 Abr 17:00'},
    {id:'c23',tipo:'user_client',autor:'Ed. Atlântico',texto:'Sim claro! Combinado. O condomínio abre às 08:30.',dt:'20 Abr 17:10'},
    {id:'c24',tipo:'user_provider',autor:'Sandra M.',texto:'Perfeito, estamos às 09:00. Precisa de algum produto específico?',dt:'20 Abr 17:12'},
    {id:'c25',tipo:'user_client',autor:'Ed. Atlântico',texto:'Não, tragam tudo. Apartamentos têm muita sujidade de obra.',dt:'20 Abr 17:15'},
    {id:'c26',tipo:'system_auto',texto:'⏰ Lembrete: o serviço é amanhã às 09:00. Sandra Matos · +351 914 000 003',dt:'22 Abr 09:00'},
  ],
  ot6:[
    {id:'c30',tipo:'system_auto',texto:'💳 Pagamento confirmado. Ordem criada.',dt:'21 Abr 08:00'},
    {id:'c31',tipo:'system_auto',texto:'👷 Ricardo Gomes aceitou mas propôs nova hora.',dt:'21 Abr 08:20'},
    {id:'c32',tipo:'user_provider',autor:'Ricardo G.',texto:'Bom dia! Tenho outro serviço até às 15h. Consigo estar consigo às 16h em vez das 14h. Serve?',dt:'21 Abr 08:22'},
    {id:'c33',tipo:'action',texto:'Ricardo Gomes propôs nova hora: 16:00. O que prefere?',dt:'21 Abr 08:22',payload:{tipo:'proposta_hora',hora:'16:00'}},
  ],
}
const NIVEIS = {
  base:  {l:'Base',  ic:'🟤',cor:'#92400e',bg:'#fef3c7',taxa:22,min:0,   mr:0},
  silver:{l:'Silver',ic:'⚪',cor:'#64748b',bg:'#f1f5f9',taxa:20,min:50,  mr:4.5},
  gold:  {l:'Gold',  ic:'🟡',cor:'#b45309',bg:'#fef3c7',taxa:18,min:200, mr:4.7},
  elite: {l:'Elite', ic:'🟢',cor:'#14532d',bg:'#dcfce7',taxa:16,min:500, mr:4.8},
}
const BENEFICIOS = [
  {id:'b1',n:'Seguro RC em Grupo',  ic:'🛡️',d:'Apólice negociada para a rede. Poupança de 35% face ao mercado.',                        nivel:'silver',preco:'€8,50/mês'},
  {id:'b2',n:'Fundo de Equipamento',ic:'🔧',d:'Adiantamento para ferramentas profissionais, sem juros. Desconto automático nas ordens.',nivel:'gold',  preco:'Sem juros'},
  {id:'b3',n:'Formação Certificada',ic:'📜',d:'Certificações (gás, electricidade, AVAC) com desconto de 40%.',                          nivel:'base',  preco:'Desde €45'},
  {id:'b4',n:'Cartão Combustível',  ic:'⛽',d:'Desconto de 4% em combustível e portagens com parceiro da rede.',                        nivel:'silver',preco:'Sem custo'},
]
const SERVICOS_CAL = [
  {id:'c1',data:'2026-04-20',hora:'14:00',nome:'Limpeza Mensal',    estado:'em_curso',   local:'Rua das Flores, 23, Caldas', km:2.1, cliente:'Sr. Ferreira',   valor:75,  dur:'3–4h', ic:'🧹'},
  {id:'c2',data:'2026-04-22',hora:'09:00',nome:'Manutenção Jardim', estado:'agendado',   local:'Quinta Rosas, Óbidos',       km:12.4,cliente:'Sra. Alves',     valor:45,  dur:'2–3h', ic:'🌿'},
  {id:'c3',data:'2026-04-22',hora:'14:00',nome:'Limpeza Mensal',    estado:'a_confirmar',local:'Rua do Sol, 5, Caldas',      km:3.8, cliente:'Cond. Sol',      valor:75,  dur:'3–4h', ic:'🧹'},
  {id:'c4',data:'2026-04-25',hora:'11:00',nome:'Manutenção Piscina',estado:'agendado',   local:'Av. Central, 45, Caldas',    km:1.5, cliente:'Ed. Atlântico',  valor:55,  dur:'1–2h', ic:'🏊'},
  {id:'c5',data:'2026-04-27',hora:'09:00',nome:'Limpeza Mensal',    estado:'agendado',   local:'Rua Nova, 12, Óbidos',       km:14.2,cliente:'Cond. Verde',    valor:75,  dur:'3–4h', ic:'🧹'},
  {id:'c6',data:'2026-04-12',hora:'10:00',nome:'Manutenção Jardim', estado:'concluido',  local:'Quinta Rosas, Óbidos',       km:12.4,cliente:'Sra. Alves',     valor:45,  dur:'2h',   ic:'🌿'},
  {id:'c7',data:'2026-04-20',hora:'09:00',nome:'Limpeza Pós-Obra',  estado:'concluido',  local:'Rua da Liberdade, 8, Caldas',km:0.9, cliente:'Sr. Martins',    valor:120, dur:'5h',   ic:'🏗️'},
]

/* ════════════════════════════════════════════════════════════════════
   ══ NOVO FLUXO CANALIZAÇÃO — Catálogo + Personalizado ══
   Paleta CC (coexiste com C actual). Fontes Fraunces + Outfit.
   ════════════════════════════════════════════════════════════════════ */
const CC = {
  forest:"#0B3D2E", forestDeep:"#072819", forestSoft:"#164E3A",
  emerald:"#10B981", emeraldDark:"#059669", emeraldBright:"#22C55E",
  emeraldSoft:"#D1FAE5", emeraldPale:"#ECFDF5",
  cream:"#FAFAF6", paper:"#FFFFFF",
  ink:"#0A1620", stone:"#6B7685", stoneLight:"#E5E7EB", line:"#ECE9E2",
  amber:"#F59E0B", amberSoft:"#FEF3C7",
  discount:"#DC2626", discountSoft:"#FEE2E2",
}

const TRAVEL_FEE=5.90, PROTECTION_FEE=0.98, PROTECTION_FEE_NOW=0,
      IMEDIATO_FEE=6.90, HOJE_FEE=3.90,
      PROMO_CODE="CHEGUEI50_", PROMO_SAVINGS=4.99

const PERSONALIZADO = {
  id:"personalizado", slug:"personalizado",
  name:"Serviço personalizado",
  tagline:"Algo fora do comum? Descreva o trabalho e enviamos o técnico certo.",
  pricePerHour:44.91, pricePerHourOriginal:49.90,
  icon:"✨", type:"hourly",
}

const SUBCATEGORIES = [
  { id:"autoclismo", name:"Autoclismo e sanita", icon:"🚽", services:[
    { id:"auto-repair",    name:"Reparação de autoclismo",    price:36.46,  priceOriginal:42.90,  popular:true },
    { id:"auto-install",   name:"Instalação de autoclismo",   price:30.43,  priceOriginal:32.90 },
    { id:"seat-repair",    name:"Reparar tampo de sanita",    price:27.65,  priceOriginal:29.90 },
    { id:"seat-replace",   name:"Substituir tampo de sanita", price:29.25,  priceOriginal:32.50 },
    { id:"toilet-replace", name:"Substituir sanita",          price:79.11,  priceOriginal:87.90 },
    { id:"toilet-install", name:"Instalar sanita",            price:57.15,  priceOriginal:63.50 },
    { id:"toilet-remove",  name:"Remover sanita",             price:57.15,  priceOriginal:63.50 },
    { id:"toilet-unclog",  name:"Desentupir sanita",          price:105.75, priceOriginal:117.50 },
  ]},
  { id:"torneiras", name:"Torneiras", icon:"🚰", services:[
    { id:"bath-tap-repair",  name:"Reparar torneira de casa de banho", price:35.55, priceOriginal:39.50 },
    { id:"sink-tap-repair",  name:"Reparar torneira de lava-loiça",    price:35.55, priceOriginal:39.50 },
    { id:"sink-tap-replace", name:"Substituir torneira de lavatório",  price:29.61, priceOriginal:32.90 },
    { id:"kitchen-tap-eff",  name:"Substituir torneira de lava-loiça (Eficiência energética)",      price:39.15, priceOriginal:43.50, eco:true },
    { id:"bath-tap-eff",     name:"Substituir torneira de casa de banho (Eficiência energética)",    price:35.55, priceOriginal:39.50, eco:true },
    { id:"safety-tap",       name:"Substituir torneira de segurança",    price:18.40, priceOriginal:19.90 },
    { id:"bath-tap-install", name:"Instalar torneira de banheira",       price:35.55, priceOriginal:39.50 },
  ]},
  { id:"fugas", name:"Fugas e diagnósticos", icon:"💧", services:[
    { id:"leak-diagnosis", name:"Diagnóstico de fuga de água",            price:35.55,  priceOriginal:39.50 },
    { id:"kitchen-leak",   name:"Fuga de água no lava-loiça",             price:42.21,  priceOriginal:46.90, popular:true },
    { id:"sink-leak",      name:"Fuga de água no lavatório",              price:40.37,  priceOriginal:42.50 },
    { id:"shower-leak",    name:"Reparar cabine de duche (Fuga de água)", price:207.18, priceOriginal:212.50 },
  ]},
  { id:"desentupimentos", name:"Desentupimentos", icon:"🌊", services:[
    { id:"kitchen-unclog",  name:"Desentupir lava-loiça",    price:70.97, priceOriginal:83.50 },
    { id:"bathroom-unclog", name:"Desentupir casa de banho", price:83.25, priceOriginal:92.50 },
  ]},
  { id:"lavatorio", name:"Lavatório", icon:"🪞", services:[
    { id:"valve-replace",  name:"Substituir válvula de lavatório", price:33.15, priceOriginal:34.90 },
    { id:"vanity-replace", name:"Substituir móvel de lavatório",   price:82.35, priceOriginal:91.50 },
    { id:"vanity-install", name:"Instalar móvel de lavatório",     price:53.01, priceOriginal:58.90 },
  ]},
  { id:"duche", name:"Duche e banheira", icon:"🚿", services:[
    { id:"shower-column",   name:"Substituir coluna de duche",                   price:43.11,   priceOriginal:47.90 },
    { id:"shower-head-eff", name:"Substituir chuveiro (Eficiência energética)",  price:35.01,   priceOriginal:38.90, eco:true },
    { id:"shower-cabin",    name:"Substituir cabine de duche",                   price:227.66,  priceOriginal:233.50 },
    { id:"tub-to-shower",   name:"Substituir banheira por duche",                price:2084.50, priceOriginal:null },
  ]},
  { id:"manutencao_can", name:"Manutenção", icon:"🧱", services:[
    { id:"grout-replace", name:"Substituir juntas de azulejos", price:35.64, priceOriginal:41.93 },
  ]},
]

const TIMESLOTS = [
  "07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30",
  "11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30",
  "15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30",
  "19:00","19:30","20:00","20:30","21:00","21:30","22:00",
]

const BOOKING_BUFFER_MIN = 90

function eur(n){ return `€${Number(n||0).toFixed(2).replace(".",",")}` }

function fmtDate(d){
  const M=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"]
  return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`
}

function getDays(){
  const DN=["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"]
  const today=new Date(), days=[]
  for(let i=0;i<5;i++){
    const d=new Date(today); d.setDate(today.getDate()+i)
    const label = i===0 ? "Hoje" : i===1 ? "Amanhã" : DN[d.getDay()]
    days.push({ id: i===0?"hoje":i===1?"amanha":`d${i}`, label, date:fmtDate(d),
                extra: i===0?HOJE_FEE:0, dateObj:d })
  }
  return days
}

function isSlotBookable(dayId, time, now=new Date()){
  if(dayId!=="hoje") return true
  const [h,m]=time.split(":").map(Number)
  const s=new Date(now); s.setHours(h,m,0,0)
  return s >= new Date(now.getTime()+BOOKING_BUFFER_MIN*60000)
}

function hasAvailableSlotsToday(now=new Date()){
  return TIMESLOTS.some(t => isSlotBookable("hoje", t, now))
}

/* ── Flag global para carregar fontes novas uma só vez ── */
let __ccFontsLoaded = false
function ensureCCFonts(){
  if(__ccFontsLoaded || typeof document==='undefined') return
  __ccFontsLoaded = true
  const l = document.createElement('link')
  l.rel = 'stylesheet'
  l.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Outfit:wght@300;400;500;600;700&display=swap'
  document.head.appendChild(l)
  const s = document.createElement('style')
  s.innerHTML = `
    .cc-root .serif{font-family:'Fraunces',Georgia,serif;font-optical-sizing:auto;letter-spacing:-0.01em}
    .cc-root{font-family:'Outfit',-apple-system,BlinkMacSystemFont,sans-serif}
    .cc-no-scrollbar::-webkit-scrollbar{display:none}
    .cc-no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
    @keyframes ccSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
    @keyframes ccFadeIn{from{opacity:0}to{opacity:1}}
  `
  document.head.appendChild(s)
}

/* ══ UI PRIMITIVES (novo fluxo) ══ */
function CCShell({ children }){
  useEffect(()=>{ ensureCCFonts() }, [])
  return (
    <div className="cc-root" style={{
      maxWidth:440, margin:"0 auto", minHeight:"100vh", background:CC.cream,
      color:CC.ink, display:"flex", flexDirection:"column", position:"relative",
      animation:"screenIn 0.22s ease-out",
    }}>
      {children}
    </div>
  )
}

function CCTopBar({ onBack, title, subtitle, onClose }){
  return (
    <div style={{
      position:"sticky", top:0, background:CC.cream, zIndex:20,
      padding:"14px 18px 12px", borderBottom:`1px solid ${CC.line}`,
      display:"flex", alignItems:"center", gap:12,
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          width:36, height:36, borderRadius:999, background:"transparent",
          border:`1px solid ${CC.line}`, display:"grid", placeItems:"center",
          cursor:"pointer", color:CC.ink,
        }}><ArrowLeft size={18}/></button>
      )}
      <div style={{ flex:1, minWidth:0 }}>
        <div className="serif" style={{ fontSize:17, fontWeight:600, letterSpacing:-0.2, textAlign:onClose?"center":"left" }}>{title}</div>
        {subtitle && <div style={{ fontSize:12, color:CC.stone, marginTop:1 }}>{subtitle}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} style={{
          width:36, height:36, borderRadius:999, background:"transparent",
          border:`1px solid ${CC.line}`, display:"grid", placeItems:"center",
          cursor:"pointer", color:CC.ink,
        }}><X size={18}/></button>
      )}
    </div>
  )
}

function CCPrimaryBtn({ children, onClick, disabled }){
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:"100%", background: disabled?CC.stoneLight:CC.emerald,
      color: disabled?CC.stone:CC.paper,
      border:"none", borderRadius:14, padding:"16px",
      fontSize:15, fontWeight:600, cursor: disabled?"not-allowed":"pointer",
      letterSpacing:0.1, boxShadow: disabled?"none":`0 8px 24px -10px ${CC.emerald}`,
    }}>{children}</button>
  )
}

function CCStickyCTA({ children, banner }){
  return (
    <div style={{ position:"sticky", bottom:0, zIndex:15, marginTop:"auto", background:CC.cream }}>
      {banner && (
        <div style={{
          background:CC.forest, color:CC.paper, padding:"10px 18px",
          fontSize:12.5, fontWeight:500, textAlign:"center",
          display:"flex", alignItems:"center", justifyContent:"center", gap:6,
        }}><Tag size={13} color={CC.emeraldBright}/>{banner}</div>
      )}
      <div style={{ padding:"14px 18px 20px" }}>{children}</div>
    </div>
  )
}

function CCValueRow({ icon:Icon, title, desc }){
  return (
    <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
      <div style={{ width:36, height:36, flexShrink:0, borderRadius:10,
                    background:CC.emeraldPale, color:CC.emerald,
                    display:"grid", placeItems:"center" }}>
        <Icon size={18}/>
      </div>
      <div style={{ flex:1, paddingTop:1 }}>
        <div style={{ fontSize:14, fontWeight:600, color:CC.ink }}>{title}</div>
        <div style={{ fontSize:12.5, color:CC.stone, marginTop:3, lineHeight:1.45 }}>{desc}</div>
      </div>
    </div>
  )
}

function CCChip({ children, icon:Icon, tone="default" }){
  const styles = {
    default:{bg:CC.paper,fg:CC.ink,border:CC.line},
    emerald:{bg:CC.emeraldSoft,fg:CC.emeraldDark,border:CC.emeraldSoft},
    eco:{bg:"#E8F5EE",fg:"#2D7A5F",border:"#E8F5EE"},
    amber:{bg:CC.amberSoft,fg:"#92400E",border:CC.amberSoft},
    discount:{bg:CC.discountSoft,fg:CC.discount,border:CC.discountSoft},
  }[tone]
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      padding:"3px 9px", borderRadius:999,
      background:styles.bg, color:styles.fg, border:`1px solid ${styles.border}`,
      fontSize:11, fontWeight:600, letterSpacing:0.2, whiteSpace:"nowrap",
    }}>{Icon && <Icon size={11}/>}{children}</span>
  )
}

function CCPriceTag({ price, priceOriginal, size="md" }){
  const sz = {sm:{c:15,o:11}, md:{c:17,o:12}, lg:{c:22,o:13}}[size]
  return (
    <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
      {priceOriginal && priceOriginal>price && (
        <span style={{ fontSize:sz.o, color:CC.stone, textDecoration:"line-through" }}>{eur(priceOriginal)}</span>
      )}
      <span className="serif" style={{ fontSize:sz.c, fontWeight:600, color:CC.forest }}>{eur(price)}</span>
    </div>
  )
}

function CCDivisor(){
  return <div style={{ height:8, background:CC.cream, margin:"20px 0",
                       borderTop:`1px solid ${CC.line}`, borderBottom:`1px solid ${CC.line}` }}/>
}

function CCBottomSheet({ title, onClose, children, footer }){
  return (
    <>
      <div onClick={onClose} style={{
        position:"fixed", inset:0, zIndex:50, background:"rgba(7,40,25,0.55)",
        animation:"ccFadeIn 0.2s ease", maxWidth:440, margin:"0 auto",
      }}/>
      <div style={{
        position:"fixed", left:0, right:0, bottom:0, zIndex:51,
        maxWidth:440, margin:"0 auto", background:CC.cream,
        borderTopLeftRadius:24, borderTopRightRadius:24,
        maxHeight:"92vh", display:"flex", flexDirection:"column",
        animation:"ccSlideUp 0.25s cubic-bezier(.2,.8,.2,1)",
        boxShadow:"0 -20px 60px -10px rgba(0,0,0,0.3)",
      }}>
        <div style={{ height:22, display:"grid", placeItems:"center", flexShrink:0 }}>
          <div style={{ width:36, height:4, background:CC.stoneLight, borderRadius:999 }}/>
        </div>
        <div style={{
          padding:"0 18px 12px", display:"flex", alignItems:"center", gap:12,
          borderBottom:`1px solid ${CC.line}`, flexShrink:0,
        }}>
          <button onClick={onClose} style={{
            width:34, height:34, borderRadius:999, background:"transparent",
            border:"none", cursor:"pointer", display:"grid", placeItems:"center", color:CC.ink,
          }}><X size={18}/></button>
          <div className="serif" style={{ flex:1, fontSize:17, fontWeight:600, textAlign:"center", paddingRight:34 }}>{title}</div>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"16px 18px 0" }}>{children}</div>
        {footer && (
          <div style={{ padding:"12px 18px 20px", borderTop:`1px solid ${CC.line}`, background:CC.cream, flexShrink:0 }}>{footer}</div>
        )}
      </div>
    </>
  )
}

function CCFormField({ label, value, onChange, placeholder, inputMode }){
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:12, color:CC.stone, fontWeight:500, marginBottom:6 }}>{label}</div>
      <input value={value} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder} inputMode={inputMode}
        style={{ width:"100%", padding:"12px 14px", background:CC.paper,
                 border:`1px solid ${CC.line}`, borderRadius:10, fontSize:14,
                 color:CC.ink, fontFamily:"inherit", outline:"none" }}/>
    </div>
  )
}

function CCExampleLine({ children, last }){
  return (
    <div style={{
      display:"flex", gap:8, alignItems:"flex-start",
      paddingBottom: last?0:8, marginBottom: last?0:8,
      borderBottom: last?"none":`1px dashed ${CC.line}`,
    }}>
      <div style={{ width:4, height:4, borderRadius:999, background:CC.emerald, marginTop:8, flexShrink:0 }}/>
      <div style={{ fontSize:12.5, color:CC.stone, lineHeight:1.45 }}>{children}</div>
    </div>
  )
}

function CCLineRow({ label, value, valueOriginal, strike }){
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", padding:"4px 0", fontSize:13.5 }}>
      <span style={{ color:CC.ink }}>{label}</span>
      <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
        {valueOriginal!==undefined && valueOriginal!==null && valueOriginal>value && (
          <span style={{ fontSize:12, color:CC.stone, textDecoration:"line-through" }}>{eur(valueOriginal)}</span>
        )}
        <span style={{ fontWeight:600, color: strike && value===0 ? CC.emerald : CC.ink }}>{eur(value)}</span>
      </div>
    </div>
  )
}

function CCSubPill({ children, active, onClick, subId }){
  return (
    <button data-sub-id={subId} onClick={onClick} style={{
      padding:"8px 14px", borderRadius:999,
      background: active?CC.forest:CC.paper, color: active?CC.paper:CC.ink,
      border:`1px solid ${active?CC.forest:CC.line}`,
      fontSize:12, fontWeight:600, cursor:"pointer",
      whiteSpace:"nowrap", flexShrink:0, scrollSnapAlign:"start",
      transition:"background 0.15s, color 0.15s, border-color 0.15s",
    }}>{children}</button>
  )
}

function CCServiceCard({ service, onClick }){
  const hasDisc = service.priceOriginal && service.priceOriginal>service.price
  const pct = hasDisc ? Math.round(((service.priceOriginal-service.price)/service.priceOriginal)*100) : 0
  return (
    <button onClick={onClick} style={{
      background:CC.paper, border:`1px solid ${CC.line}`,
      borderRadius:14, padding:12,
      display:"flex", gap:12, alignItems:"center",
      cursor:"pointer", textAlign:"left", width:"100%",
    }}>
      <div style={{
        width:56, height:56, flexShrink:0, borderRadius:12,
        background: service.eco?"#E8F5EE":CC.emeraldPale,
        color: service.eco?"#2D7A5F":CC.emerald,
        display:"grid", placeItems:"center", position:"relative",
      }}>
        {service.eco ? <Leaf size={24}/> : <Wrench size={22}/>}
        {service.popular && (
          <div style={{
            position:"absolute", top:-6, right:-6,
            background:CC.emerald, color:CC.paper,
            width:22, height:22, borderRadius:999,
            display:"grid", placeItems:"center",
            boxShadow:`0 2px 6px -1px ${CC.emeraldDark}`,
          }}><Star size={11} fill={CC.paper} color={CC.paper}/></div>
        )}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13.5, fontWeight:600, color:CC.ink, lineHeight:1.25 }}>{service.name}</div>
        <div style={{ display:"flex", gap:6, alignItems:"center", marginTop:6, flexWrap:"wrap" }}>
          {service.eco && <CCChip tone="eco" icon={Leaf}>Eco</CCChip>}
          {service.popular && <CCChip tone="emerald" icon={Star}>Popular</CCChip>}
          {hasDisc && pct>=10 && <CCChip tone="discount">−{pct}%</CCChip>}
        </div>
        <div style={{ marginTop:6 }}>
          <CCPriceTag price={service.price} priceOriginal={service.priceOriginal} size="sm"/>
        </div>
      </div>
      <ChevronRight size={18} color={CC.stone} style={{ flexShrink:0 }}/>
    </button>
  )
}

function CCJaFaltaPouco(){
  const steps = [
    { icon:Check,       title:"Confirmar e agendar",          current:true },
    { icon:PartyPopper, title:"Confirmação imediata" },
    { icon:MapPinned,   title:"Acompanha o técnico no mapa" },
    { icon:Shield,      title:"Problema resolvido" },
  ]
  return (
    <div style={{
      background:`linear-gradient(135deg,${CC.forest} 0%,${CC.forestSoft} 100%)`,
      color:CC.paper, borderRadius:18, padding:"22px 20px",
      position:"relative", overflow:"hidden",
    }}>
      <div style={{
        position:"absolute", right:-30, top:-30, width:120, height:120, borderRadius:999,
        background:`radial-gradient(circle,${CC.emerald} 0%,transparent 70%)`, opacity:0.15,
      }}/>
      <div style={{
        display:"inline-flex", gap:6, alignItems:"center",
        background:"rgba(34,197,94,0.18)", color:CC.emeraldBright,
        padding:"4px 10px", borderRadius:999,
        fontSize:10, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase",
        position:"relative",
      }}><Sparkles size={10}/> Já falta pouco!</div>
      <div className="serif" style={{ fontSize:20, fontWeight:500, marginTop:8, letterSpacing:-0.3, position:"relative" }}>
        O seu problema está a <span style={{ color:CC.emeraldBright, fontStyle:"italic" }}>4 passos</span> de ficar resolvido.
      </div>
      <div style={{ marginTop:18, position:"relative" }}>
        {steps.map((step,i) => {
          const Icon = step.icon
          const isLast = i===steps.length-1
          return (
            <div key={i} style={{
              display:"flex", alignItems:"flex-start", gap:12,
              position:"relative", paddingBottom: isLast?0:14,
            }}>
              {!isLast && <div style={{
                position:"absolute", left:13, top:28,
                width:2, height:"calc(100% - 14px)",
                background:"rgba(255,255,255,0.12)",
              }}/>}
              <div style={{
                width:28, height:28, borderRadius:999, flexShrink:0,
                background: step.current?CC.emeraldBright:"rgba(255,255,255,0.08)",
                color: step.current?CC.forest:"rgba(255,255,255,0.5)",
                display:"grid", placeItems:"center",
                border: step.current?`2px solid ${CC.emeraldBright}`:"2px solid rgba(255,255,255,0.12)",
                boxShadow: step.current?`0 0 0 4px rgba(34,197,94,0.15)`:"none",
                position:"relative", zIndex:1,
              }}><Icon size={13} strokeWidth={step.current?3:2}/></div>
              <div style={{ flex:1, paddingTop:5 }}>
                <div style={{
                  fontSize:13.5, fontWeight: step.current?600:400,
                  color: step.current?CC.paper:"rgba(255,255,255,0.7)",
                }}>{step.title}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ══ MODAIS DO NOVO FLUXO ══ */
function CCScheduleModal({ onClose, slots, onConfirm }){
  const now = new Date()
  const DAYS = useMemo(()=>getDays(), [])
  const todayAvailable = hasAvailableSlotsToday(now)
  const [activeDay, setActiveDay] = useState(() =>
    (slots && slots.length>0) ? slots[0].day : (todayAvailable ? "hoje" : "amanha")
  )
  const [selected, setSelected] = useState(slots || [])
  const slotKey = (day,time) => `${day}|${time}`
  const isSelected = (day,time) => selected.some(s => s.key===slotKey(day,time))

  const toggleSlot = (day,time) => {
    if(!isSlotBookable(day, time, now)) return
    const key = slotKey(day, time)
    setSelected(prev => {
      if(prev.some(s => s.key===key)) return prev.filter(s => s.key!==key)
      if(prev.length>=5) return prev
      const dayObj = DAYS.find(d => d.id===day)
      return [...prev, { key, day, time, dayLabel:dayObj.label, dayDate:dayObj.date }]
    })
  }

  const footer = (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, padding:"0 4px" }}>
        <span style={{ fontSize:13, color:CC.ink, fontWeight:500 }}>
          {selected.length===0 ? "Nenhum horário selecionado" : `${selected.length} horário${selected.length>1?"s":""} selecionado${selected.length>1?"s":""}`}
        </span>
        {selected.length>0 && (
          <button onClick={()=>setSelected([])} style={{
            background:"transparent", border:"none", cursor:"pointer",
            color:CC.stone, fontSize:13, fontWeight:500, textDecoration:"underline",
          }}>Limpar tudo</button>
        )}
      </div>
      <CCPrimaryBtn onClick={()=>onConfirm(selected)} disabled={selected.length===0}>Confirmar</CCPrimaryBtn>
    </div>
  )

  return (
    <CCBottomSheet title="Selecionar data" onClose={onClose} footer={footer}>
      <div className="cc-no-scrollbar" style={{ display:"flex", gap:0, overflowX:"auto", borderBottom:`1px solid ${CC.line}`, marginBottom:16 }}>
        {DAYS.map(d => {
          const isActive = activeDay===d.id
          const daySlots = selected.filter(s => s.day===d.id).length
          const isHojeDisabled = d.id==="hoje" && !todayAvailable
          return (
            <button key={d.id} onClick={()=>!isHojeDisabled && setActiveDay(d.id)} disabled={isHojeDisabled}
              style={{
                flex:"0 0 auto", padding:"10px 14px", background:"transparent", border:"none",
                borderBottom:`2px solid ${isActive?CC.forest:"transparent"}`,
                cursor: isHojeDisabled?"not-allowed":"pointer",
                textAlign:"left", minWidth:92, opacity: isHojeDisabled?0.4:1,
              }}>
              <div style={{ fontSize:14, fontWeight: isActive?700:500, color: isActive?CC.ink:CC.stone, display:"flex", alignItems:"center", gap:4, flexWrap:"wrap" }}>
                {d.label}
                {daySlots>0 && (
                  <span style={{
                    background:CC.emerald, color:CC.paper, fontSize:10, fontWeight:700,
                    minWidth:16, height:16, borderRadius:999, display:"inline-grid", placeItems:"center", padding:"0 4px",
                  }}>{daySlots}</span>
                )}
                {d.extra>0 && <span style={{ fontSize:10.5, color:CC.amber, fontWeight:600 }}>+{eur(d.extra)}</span>}
              </div>
              <div style={{ fontSize:11, color:CC.stone, marginTop:2 }}>{d.date}</div>
            </button>
          )
        })}
      </div>

      <div style={{
        background:CC.emeraldPale, border:`1px solid ${CC.emeraldSoft}`,
        borderRadius:12, padding:"10px 12px",
        display:"flex", gap:10, alignItems:"flex-start", marginBottom:16,
      }}>
        <Calendar size={16} color={CC.emerald} style={{ flexShrink:0, marginTop:2 }}/>
        <div style={{ fontSize:12.5, color:CC.forestSoft, lineHeight:1.4 }}>
          Tem um horário flexível? Pode selecionar <strong>até 5 horários disponíveis</strong> — aumenta a probabilidade de conseguir o técnico de preferência.
        </div>
      </div>

      {activeDay==="hoje" && !todayAvailable && (
        <div style={{
          background:CC.amberSoft, border:`1px solid ${CC.amber}`,
          borderRadius:12, padding:"12px 14px", marginBottom:16,
          display:"flex", gap:10, alignItems:"flex-start",
        }}>
          <Info size={16} color={CC.amber} style={{ flexShrink:0, marginTop:2 }}/>
          <div style={{ fontSize:12.5, color:"#92400E", lineHeight:1.4 }}>
            Sem horários disponíveis hoje. Escolha outro dia ou use a opção <strong>Imediato</strong> para chegada em 30-40 min.
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, paddingBottom:16 }}>
        {TIMESLOTS.map(t => {
          const bookable = isSlotBookable(activeDay, t, now)
          const sel = isSelected(activeDay, t)
          const atLimit = selected.length>=5 && !sel
          const disabled = !bookable || atLimit
          return (
            <button key={t} onClick={()=>toggleSlot(activeDay, t)} disabled={disabled}
              style={{
                background: sel?CC.forest:CC.paper,
                color: sel?CC.paper : !bookable?CC.stoneLight : atLimit?CC.stoneLight : CC.ink,
                border:`1.5px solid ${sel?CC.forest : !bookable?CC.stoneLight : CC.line}`,
                borderRadius:10, padding:"10px 0", fontSize:13, fontWeight:600,
                cursor: disabled?"not-allowed":"pointer",
                opacity: !bookable?0.35 : atLimit?0.5 : 1,
                textDecoration: !bookable?"line-through":"none",
                transition:"all 0.12s",
              }}
              title={!bookable?"Horário já passado ou demasiado próximo":undefined}
            >{t}</button>
          )
        })}
      </div>
    </CCBottomSheet>
  )
}

function CCPhotosNotesModal({ onClose, notes, photos, onConfirm }){
  const [localNotes, setLocalNotes] = useState(notes || "")
  const [localPhotos, setLocalPhotos] = useState(photos || [])
  const addPhoto = () => { if(localPhotos.length<5) setLocalPhotos(p => [...p, { id:Date.now(), placeholder:true }]) }
  const removePhoto = (id) => setLocalPhotos(p => p.filter(x => x.id!==id))

  const footer = (
    <CCPrimaryBtn onClick={()=>onConfirm({ notes:localNotes, photos:localPhotos })}>Guardar</CCPrimaryBtn>
  )
  return (
    <CCBottomSheet title="Fotografias e notas" onClose={onClose} footer={footer}>
      <div>
        <div style={{ fontSize:14, fontWeight:600, color:CC.ink, marginBottom:6 }}>Fotografias</div>
        <div style={{ fontSize:12.5, color:CC.stone, marginBottom:12, lineHeight:1.4 }}>
          Adicione imagens para ajudar o técnico a preparar-se para o serviço.
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
          {localPhotos.map(p => (
            <div key={p.id} style={{
              aspectRatio:"1", borderRadius:12, background:CC.emeraldPale,
              border:`1px solid ${CC.emeraldSoft}`, display:"grid", placeItems:"center", position:"relative",
            }}>
              <FileImage size={24} color={CC.emerald}/>
              <button onClick={()=>removePhoto(p.id)} style={{
                position:"absolute", top:4, right:4, width:24, height:24, borderRadius:999,
                background:"rgba(0,0,0,0.6)", color:CC.paper, border:"none", cursor:"pointer",
                display:"grid", placeItems:"center",
              }}><X size={12}/></button>
            </div>
          ))}
          {localPhotos.length<5 && (
            <button onClick={addPhoto} style={{
              aspectRatio:"1", borderRadius:12, background:CC.paper,
              border:`1.5px dashed ${CC.stoneLight}`,
              display:"grid", placeItems:"center", cursor:"pointer", color:CC.stone,
            }}><Plus size={24}/></button>
          )}
        </div>
        <div style={{ fontSize:11, color:CC.stone, marginTop:6, textAlign:"right" }}>{localPhotos.length}/5 fotografias</div>
      </div>
      <div style={{ marginTop:24 }}>
        <div style={{ fontSize:14, fontWeight:600, color:CC.ink, marginBottom:6 }}>Notas sobre o serviço</div>
        <div style={{ fontSize:12.5, color:CC.stone, marginBottom:12, lineHeight:1.4 }}>Adicione notas como os exemplos seguintes:</div>
        <div style={{ background:CC.paper, border:`1px solid ${CC.line}`, borderRadius:12, padding:12, marginBottom:12 }}>
          <CCExampleLine>Se precisa que o técnico compre algum material</CCExampleLine>
          <CCExampleLine>A marca e modelo do aparelho avariado, e o erro que aparece</CCExampleLine>
          <CCExampleLine>Áreas específicas da casa que deseja que sejam intervencionadas</CCExampleLine>
          <CCExampleLine last>Instruções de acesso — porteiro, código do prédio, estacionamento</CCExampleLine>
        </div>
        <textarea value={localNotes} onChange={e=>setLocalNotes(e.target.value)} maxLength={200}
          placeholder="Ex: Torneira da cozinha pinga há 2 dias, já substituí vedantes sem sucesso. Prédio com porteiro no R/C."
          style={{
            width:"100%", minHeight:100, background:CC.paper,
            border:`1px solid ${CC.line}`, borderRadius:12, padding:14,
            fontSize:13.5, fontFamily:"inherit", color:CC.ink, resize:"vertical", outline:"none",
          }}/>
        <div style={{ fontSize:11, color:CC.stone, marginTop:4, textAlign:"right" }}>{localNotes.length}/200</div>
      </div>
      <div style={{ height:8 }}/>
    </CCBottomSheet>
  )
}

function CCBillingModal({ onClose, billing, onConfirm }){
  const [local, setLocal] = useState(billing || { nome:"", nif:"", morada:"", cp:"", localidade:"" })
  const canSave = local.nome && local.nif && local.morada && local.cp && local.localidade
  const footer = <CCPrimaryBtn onClick={()=>onConfirm(local)} disabled={!canSave}>Guardar</CCPrimaryBtn>
  return (
    <CCBottomSheet title="Informações de faturação" onClose={onClose} footer={footer}>
      <div>
        <div style={{ fontSize:13, fontWeight:700, color:CC.ink, textTransform:"uppercase", letterSpacing:0.5, marginBottom:14 }}>Identificação fiscal</div>
        <CCFormField label="Nome"       value={local.nome}        onChange={v=>setLocal(p=>({...p,nome:v}))}         placeholder="Nome completo"/>
        <CCFormField label="NIF"        value={local.nif}         onChange={v=>setLocal(p=>({...p,nif:v.replace(/\D/g,"").slice(0,9)}))} placeholder="9 dígitos" inputMode="numeric"/>
      </div>
      <div style={{ marginTop:28 }}>
        <div style={{ fontSize:13, fontWeight:700, color:CC.ink, textTransform:"uppercase", letterSpacing:0.5, marginBottom:14 }}>Morada de faturação</div>
        <CCFormField label="Morada" value={local.morada} onChange={v=>setLocal(p=>({...p,morada:v}))} placeholder="Rua, número, andar"/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1.3fr", gap:10 }}>
          <CCFormField label="Código postal" value={local.cp}         onChange={v=>setLocal(p=>({...p,cp:v}))}         placeholder="0000-000"/>
          <CCFormField label="Localidade"    value={local.localidade} onChange={v=>setLocal(p=>({...p,localidade:v}))} placeholder="Cidade"/>
        </div>
      </div>
      <div style={{ height:8 }}/>
    </CCBottomSheet>
  )
}

/* ══════════════════════════════════════════════════════════════════
   Fase 2a — primitivos de detalhe + opções dinâmicas
   ══════════════════════════════════════════════════════════════════ */

/* Mapa prefixos id categoria → sufixo usado nos 8 ids de personalizados
   (personalizado-cln, personalizado-can, ...). Permite render dinâmico
   do hero Personalizado conforme a categoria actual do cliente. */
const CATEGORY_PREFIX = {
  limpeza:'cln', manutencao:'mnt', jardim:'jar', piscina:'pol',
  pintura:'pnt', eletrica:'elc', canalizacao:'can', pos_obra:'pos',
}
const getPersonalizadoId = (categoryId) => `personalizado-${CATEGORY_PREFIX[categoryId]}`

/* Templates de frequência — alinhadas com a tabela frequency_templates da BD.
   Cada serviço aplicável aponta a uma destas via campo frequencyTemplate. */
const FREQUENCY_TEMPLATES = {
  cln_home: [
    { id:"pontual",         label:"Pontual",                      hint:"1 visita apenas",                    multiplier:1,    discount:0,    suffix:"" },
    { id:"mensal",          label:"Plano mensal (4 visitas/mês)", hint:"Mesma técnica sempre · −15%",        multiplier:4,    discount:0.15, suffix:"/mês" },
    { id:"mensal-profunda", label:"Mensal + profunda trimestral", hint:"4 regulares + 1 profunda/3 meses",   multiplier:4.33, discount:0.12, suffix:"/mês", includesDeep:true },
  ],
  cln_occasional: [
    { id:"pontual",    label:"Pontual",    hint:"1 visita apenas",                 multiplier:1, discount:0,    suffix:"" },
    { id:"trimestral", label:"Trimestral", hint:"1 visita cada 3 meses · −10%",    multiplier:1, discount:0.10, suffix:"/visita", perVisit:true },
    { id:"semestral",  label:"Semestral",  hint:"1 visita cada 6 meses · −5%",     multiplier:1, discount:0.05, suffix:"/visita", perVisit:true },
  ],
  cln_office: [
    { id:"pontual",   label:"Pontual",   hint:"1 visita apenas",          multiplier:1, discount:0,    suffix:"" },
    { id:"semanal",   label:"Semanal",   hint:"4 visitas/mês · −20%",     multiplier:4, discount:0.20, suffix:"/mês" },
    { id:"quinzenal", label:"Quinzenal", hint:"2 visitas/mês · −15%",     multiplier:2, discount:0.15, suffix:"/mês" },
    { id:"mensal",    label:"Mensal",    hint:"1 visita/mês · −10%",      multiplier:1, discount:0.10, suffix:"/mês" },
  ],
  jardim_corte: [
    { id:"pontual",   label:"Pontual",   hint:"1 corte apenas",          multiplier:1, discount:0,    suffix:"" },
    { id:"semanal",   label:"Semanal",   hint:"4 cortes/mês · −15%",     multiplier:4, discount:0.15, suffix:"/mês" },
    { id:"quinzenal", label:"Quinzenal", hint:"2 cortes/mês · −12%",     multiplier:2, discount:0.12, suffix:"/mês" },
    { id:"mensal",    label:"Mensal",    hint:"1 corte/mês · −8%",       multiplier:1, discount:0.08, suffix:"/mês" },
  ],
  sazonal_cut: [
    { id:"pontual",   label:"Pontual",   hint:"1 visita apenas",            multiplier:1, discount:0,    suffix:"" },
    { id:"semestral", label:"Semestral", hint:"2 visitas/ano · −10%",       multiplier:1, discount:0.10, suffix:"/visita", perVisit:true },
    { id:"anual",     label:"Anual",     hint:"1 visita/ano · −5%",         multiplier:1, discount:0.05, suffix:"/visita", perVisit:true },
  ],
  plano_gradual: [
    { id:"mensal",     label:"Mensal",       hint:"Sem compromisso",                           multiplier:1, discount:0,    suffix:"/mês" },
    { id:"trimestral", label:"Trimestral",   hint:"3 meses comprometidos · −3%",               multiplier:1, discount:0.03, suffix:"/mês" },
    { id:"semestral",  label:"Semestral",    hint:"6 meses comprometidos · −6%",               multiplier:1, discount:0.06, suffix:"/mês" },
    { id:"anual",      label:"Plano anual",  hint:"12 meses · −10% · prioridade na agenda",    multiplier:1, discount:0.10, suffix:"/mês" },
  ],
  piscina_quimica: [
    { id:"pontual",   label:"Pontual",   hint:"1 tratamento apenas",            multiplier:1, discount:0,    suffix:"" },
    { id:"quinzenal", label:"Quinzenal", hint:"2 tratamentos/mês · −12%",       multiplier:2, discount:0.12, suffix:"/mês" },
    { id:"mensal",    label:"Mensal",    hint:"1 tratamento/mês · −8%",         multiplier:1, discount:0.08, suffix:"/mês" },
  ],
  manutencao_anual: [
    { id:"pontual", label:"Pontual",      hint:"1 visita apenas",                                     multiplier:1, discount:0,    suffix:"" },
    { id:"anual",   label:"Plano anual",  hint:"12 meses · lembrete automático · −10% · prioridade",  multiplier:1, discount:0.10, suffix:"/visita", perVisit:true },
  ],
}

const PRODUCTS_OPTIONS = [
  { id:"cliente", label:"Eu forneço produtos e materiais", hint:"Detergentes, panos e sacos seus",      extra:0 },
  { id:"tecnica", label:"Técnica traz produtos",            hint:"Profissional, não precisa preparar nada" }, // extra vem de service.productsExtraPrice
]

function getFrequencyOptions(service, parent){
  const key = (parent || service)?.frequencyTemplate
  if(!key || !FREQUENCY_TEMPLATES[key]) return null
  return FREQUENCY_TEMPLATES[key]
}

function calcDynamicPrice(basePrice, productsId, frequencyId, productsExtra, deepPrice, frequencyOptions){
  const prodExtra = productsId === "tecnica" ? (productsExtra || 0) : 0
  if(!frequencyOptions) return basePrice + prodExtra
  const freq = frequencyOptions.find(f => f.id === frequencyId)
  if(!freq) return basePrice + prodExtra
  if(freq.perVisit) return (basePrice + prodExtra) * (1 - freq.discount)
  let total = (basePrice + prodExtra) * freq.multiplier * (1 - freq.discount)
  if(freq.includesDeep && deepPrice) total += (deepPrice / 3) * (1 - freq.discount)
  return total
}

/* Primitivos para o ServiceDetailScreen (Fase 2b) */
function DetailSection({ title, icon:Icon, iconColor, children }){
  return (
    <div style={{ marginTop:22 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
        {Icon && (
          <div style={{
            width:24, height:24, borderRadius:6,
            background:`${iconColor}15`, color:iconColor,
            display:"grid", placeItems:"center",
          }}><Icon size={14}/></div>
        )}
        <div className="serif" style={{ fontSize:15, fontWeight:600, color:CC.ink }}>{title}</div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>{children}</div>
    </div>
  )
}

function DetailItem({ icon:Icon, iconColor, children }){
  return (
    <div style={{
      display:"flex", gap:10, alignItems:"flex-start",
      fontSize:13, lineHeight:1.45, color:CC.ink,
    }}>
      {Icon && <Icon size={14} color={iconColor} style={{ flexShrink:0, marginTop:3 }}/>}
      <div style={{ flex:1 }}>{children}</div>
    </div>
  )
}

function FaqItem({ q, a }){
  const [open, setOpen] = useState(false)
  return (
    <div style={{
      border:`1px solid ${CC.line}`, borderRadius:10, overflow:"hidden",
      background:CC.paper,
    }}>
      <button onClick={()=>setOpen(!open)} style={{
        width:"100%", padding:"12px 14px",
        background:"transparent", border:"none", cursor:"pointer",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        gap:10, textAlign:"left",
        fontSize:13, fontWeight:600, color:CC.ink,
        fontFamily:"inherit",
      }}>
        <span style={{ flex:1 }}>{q}</span>
        <ChevronRight size={16} color={CC.stone}
          style={{ transform: open?"rotate(90deg)":"none", transition:"transform 0.15s" }}/>
      </button>
      {open && (
        <div style={{ padding:"0 14px 14px", fontSize:13, lineHeight:1.5, color:CC.stone }}>{a}</div>
      )}
    </div>
  )
}

/* Primitivos para opções dinâmicas (produtos + frequência) */
function OptionRow({ selected, label, hint, priceLabel, onClick, accent }){
  return (
    <button onClick={onClick} style={{
      background: selected ? `${accent}08` : CC.paper,
      border: `2px solid ${selected ? accent : CC.line}`,
      borderRadius:12, padding:"12px 14px",
      display:"flex", alignItems:"center", gap:12,
      cursor:"pointer", textAlign:"left", width:"100%",
      transition:"all 0.15s",
    }}>
      <div style={{
        width:18, height:18, borderRadius:999,
        border:`2px solid ${selected ? accent : CC.stoneLight}`,
        background: selected ? accent : "transparent",
        display:"grid", placeItems:"center", flexShrink:0,
      }}>
        {selected && <Check size={10} color={CC.paper} strokeWidth={3}/>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13.5, fontWeight:600, color:CC.ink, lineHeight:1.3 }}>{label}</div>
        {hint && <div style={{ fontSize:11.5, color:CC.stone, marginTop:3, lineHeight:1.3 }}>{hint}</div>}
      </div>
      {priceLabel && (
        <div style={{ fontSize:12.5, fontWeight:600, color:accent, flexShrink:0 }}>{priceLabel}</div>
      )}
    </button>
  )
}

function OptionsSection({ service, parent, productsId, setProductsId, frequencyId, setFrequencyId, accent }){
  const src = parent || service
  const frequencyOptions = getFrequencyOptions(service, parent)
  const hasFrequency = !!frequencyOptions
  if(!src.hasProductsOption && !hasFrequency) return null

  return (
    <div style={{ marginTop:22 }}>
      <div className="serif" style={{ fontSize:15, fontWeight:600, color:CC.ink, marginBottom:12 }}>Opções</div>

      {src.hasProductsOption && (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:12, color:CC.stone, marginBottom:8, fontWeight:600, textTransform:"uppercase", letterSpacing:0.3 }}>
            Produtos e materiais
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {PRODUCTS_OPTIONS.map(opt => (
              <OptionRow key={opt.id}
                selected={productsId === opt.id}
                onClick={()=>setProductsId(opt.id)}
                label={opt.label} hint={opt.hint}
                priceLabel={opt.id === "tecnica" && src.productsExtraPrice
                  ? `+${eur(src.productsExtraPrice)}`
                  : null}
                accent={accent}/>
            ))}
          </div>
        </div>
      )}

      {hasFrequency && (
        <div>
          <div style={{ fontSize:12, color:CC.stone, marginBottom:8, fontWeight:600, textTransform:"uppercase", letterSpacing:0.3 }}>
            Frequência
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {frequencyOptions.map(opt => (
              <OptionRow key={opt.id}
                selected={frequencyId === opt.id}
                onClick={()=>setFrequencyId(opt.id)}
                label={opt.label} hint={opt.hint}
                priceLabel={opt.discount > 0 ? `−${Math.round(opt.discount * 100)}%` : null}
                accent={accent}/>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══ FIM DO BLOCO NOVO FLUXO (parte 1) ══ */

/* ══ HELPERS ══ */
const svcById = id => SVCS.find(s => s.id === id)
const tecById = id => TECNICOS.find(t => t.id === id)
const catById = id => CATS.find(c => c.id === id)

const CHAT_C = [
  {de:'plat',   t:'O António está confirmado para amanhã às 10h. Tenha acesso à entrada disponível.',h:'09:32'},
  {de:'cliente',t:'Perfeito, obrigado!',h:'09:45'},
]
const CHAT_P = [
  {de:'plat',     t:'António, urgência na Av. Brasil, 10. Podes ir quinta às 9h?',h:'08:15'},
  {de:'prestador',t:'Confirmado, estarei lá.',h:'08:22'},
]

/* ══ COMPONENTES LOCAIS ══ */

/* ── FotoThumb — renderiza foto: imagem se for dataURL/http, senão emoji ── */
function FotoThumb({ src, size=68, radius=10, border=true }) {
  const isImg = typeof src === 'string' && (src.startsWith('data:') || src.startsWith('http') || src.startsWith('blob:'))
  return (
    <div style={{ width:size, height:size, borderRadius:radius, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:Math.round(size*0.36), border: border ? '1px solid rgba(0,0,0,0.08)' : 'none', overflow:'hidden', flexShrink:0 }}>
      {isImg ? <img src={src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : src}
    </div>
  )
}

/* ── OrderChat — Chat partilhado cliente/prestador ── */
function OrderChat({ ordem, role='cliente', prest, onBack, onUpdate }) {
  const s = SVCS.find(sv=>sv.id===ordem.sid)
  const p = prest || TECNICOS.find(t=>t.id===ordem.tid)
  const [msgs, setMsgs] = useState(CHAT_INIT[ordem.id]||[
    {id:'c_init',tipo:'system_auto',texto:`💳 Pagamento confirmado. Ordem de "${s?.n}" criada.`,dt:'Agora'},
    {id:'c_init2',tipo:'system_auto',texto:'📬 À procura de técnico disponível na sua zona...',dt:'Agora'},
  ])
  const [txt, setTxt] = useState('')
  const [horaProp, setHoraProp] = useState(null)
  const [showHoras, setShowHoras] = useState(false)
  const endRef = useState(null)[0]

  const SLOTS = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
                 '12:00','13:00','14:00','14:30','15:00','15:30','16:00','16:30','17:00','18:00']

  const addMsg = (tipo, texto, payload=null) => {
    const m = {id:`c${Date.now()}`,tipo,autor:role==='prestador'?p?.n||'Prestador':'Cliente',texto,dt:new Date().toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}),payload}
    setMsgs(ms=>[...ms,m])
  }
  const addSys = texto => setMsgs(ms=>[...ms,{id:`s${Date.now()}`,tipo:'system_auto',texto,dt:new Date().toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}])

  const enviar = () => {
    if(!txt.trim()) return
    addMsg(role==='prestador'?'user_provider':'user_client', txt.trim())
    setTxt('')
  }

  const proporHora = (h) => {
    setHoraProp(h); setShowHoras(false)
    addMsg('user_provider',`Prefiro às ${h}. Serve-te?`,{tipo:'proposta_hora',hora:h})
    addSys(`🕐 Proposta de nova hora enviada ao cliente: ${h}`)
    if(onUpdate) onUpdate({...ordem, st:'proposta_hora', hora_proposta:h})
  }

  const confirmarHora = (h) => {
    addMsg('user_client',`✅ Perfeito, confirmo às ${h}!`)
    addSys(`✅ Hora confirmada: ${h}. Ordem agendada.`)
    if(onUpdate) onUpdate({...ordem, st:'agendado', hora:h})
  }

  const aceitarOrdem = () => {
    addSys(`✅ Serviço aceite por ${p?.n||'Prestador'}. Data: ${ordem.data} · ${ordem.hora}`)
    if(onUpdate) onUpdate({...ordem, st:'agendado', tid: p?.id || ordem.tid})
  }

  const ST = {
    pendente:          {l:'Pendente',         col:C.amber, bg:'#fef3c7'},
    proposta_hora:     {l:'Proposta de hora', col:'#8b5cf6',bg:'#f5f3ff'},
    agendado:          {l:'Agendado',         col:C.g,      bg:C.gl},
    em_curso:          {l:'Em execução',      col:'#0ea5e9',bg:'#e0f2fe'},
    aguarda_validacao: {l:'Aguarda validação',col:C.amber,  bg:'#fff7ed'},
    concluida:         {l:'Concluído',        col:C.g,      bg:C.gl},
    faturada:          {l:'Faturado',         col:C.gd,     bg:C.gl},
    paga:              {l:'Pago',             col:C.gd,     bg:C.gl},
  }
  const st = ST[ordem.st]||{l:ordem.st,col:C.slate,bg:'#f1f5f9'}

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:C.mist}}>
      {/* Header */}
      <div style={{background:C.navy,padding:'10px 14px',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'#94a3b8',fontSize:20,cursor:'pointer',lineHeight:1,padding:0}}>←</button>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:800,color:'#fff'}}>{s?.n}</div>
          <div style={{fontSize:10,color:'#94a3b8'}}>{ordem.cli} · {ordem.morada?.split(',')[0]}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <span style={{fontSize:10,fontWeight:700,background:st.bg,color:st.col,padding:'3px 9px',borderRadius:12}}>{st.l}</span>
          <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{ordem.data} · {ordem.hora}</div>
        </div>
      </div>

      {/* Info card prestador (se atribuído) */}
      {p && (
        <div style={{background:'#0f2a1a',padding:'10px 14px',display:'flex',alignItems:'center',gap:10,flexShrink:0,borderBottom:'1px solid rgba(34,197,94,0.2)'}}>
          <div style={{width:34,height:34,borderRadius:'50%',background:`linear-gradient(135deg,${C.g},${C.gm})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#fff',fontWeight:800,flexShrink:0}}>{p.ini}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:700,color:'#86efac'}}>{p.n}</div>
            <div style={{fontSize:10,color:'#4ade80'}}>⭐ {p.r} · {p.indicativo} {p.tel}</div>
          </div>
          <div style={{fontSize:10,color:'#4ade80',fontWeight:600}}>🔗 Em linha</div>
        </div>
      )}

      {/* Mensagens */}
      <div style={{flex:1,overflowY:'auto',padding:'12px 14px',display:'flex',flexDirection:'column',gap:8}}>
        {msgs.map(m => {
          const isMe = (role==='cliente'&&m.tipo==='user_client') || (role==='prestador'&&m.tipo==='user_provider')
          const isSys = m.tipo==='system_auto'||m.tipo==='system_alert'
          const isAction = m.tipo==='action'

          if(isSys) return (
            <div key={m.id} style={{textAlign:'center',margin:'4px 0'}}>
              <span style={{fontSize:10,color:C.slate,background:'rgba(0,0,0,0.06)',padding:'4px 10px',borderRadius:12,display:'inline-block'}}>{m.texto}</span>
              <div style={{fontSize:9,color:C.muted,marginTop:2}}>{m.dt}</div>
            </div>
          )

          if(isAction&&m.payload?.tipo==='proposta_hora') return (
            <div key={m.id} style={{background:C.white,borderRadius:12,padding:12,border:'2px solid #8b5cf6',margin:'4px 0'}}>
              <div style={{fontSize:12,fontWeight:700,color:'#7c3aed',marginBottom:8}}>🕐 {m.texto}</div>
              {role==='cliente'&&ordem.st==='proposta_hora'&&(
                <div style={{display:'flex',gap:7}}>
                  <button onClick={()=>confirmarHora(m.payload.hora)} style={{flex:1,padding:'8px',border:'none',borderRadius:8,background:C.g,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>✅ Aceitar {m.payload.hora}</button>
                  <button onClick={()=>setShowHoras(true)} style={{flex:1,padding:'8px',border:`1.5px solid ${C.border}`,borderRadius:8,background:C.white,fontSize:12,fontWeight:600,cursor:'pointer'}}>Propor outra</button>
                </div>
              )}
              <div style={{fontSize:9,color:C.slate,marginTop:6,textAlign:'right'}}>{m.dt}</div>
            </div>
          )

          return (
            <div key={m.id} style={{display:'flex',flexDirection:isMe?'row-reverse':'row',gap:7,alignItems:'flex-end'}}>
              {!isMe&&<div style={{width:26,height:26,borderRadius:'50%',background:`linear-gradient(135deg,${C.g},${C.gm})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff',fontWeight:800,flexShrink:0}}>{m.autor?.[0]||'?'}</div>}
              <div style={{maxWidth:'75%'}}>
                {!isMe&&<div style={{fontSize:9,color:C.slate,marginBottom:2}}>{m.autor}</div>}
                <div style={{background:isMe?C.navy:C.white,color:isMe?'#fff':C.navy,padding:'9px 12px',borderRadius:isMe?'16px 16px 4px 16px':'16px 16px 16px 4px',fontSize:13,lineHeight:1.5,boxShadow:'0 1px 3px rgba(0,0,0,0.08)'}}>{m.texto}</div>
                <div style={{fontSize:9,color:C.slate,marginTop:2,textAlign:isMe?'right':'left'}}>{m.dt}</div>
              </div>
            </div>
          )
        })}

        {/* Botões de acção rápida para prestador */}
        {role==='prestador'&&ordem.st==='pendente'&&(
          <div style={{background:C.white,borderRadius:12,padding:12,border:`2px solid ${C.g}`,marginTop:4}}>
            <div style={{fontSize:12,fontWeight:700,color:C.navy,marginBottom:8}}>📬 Nova ordem disponível</div>
            <div style={{display:'flex',gap:7}}>
              <button onClick={aceitarOrdem} style={{flex:2,padding:'9px',border:'none',borderRadius:9,background:C.g,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>✅ Aceitar</button>
              <button onClick={()=>setShowHoras(true)} style={{flex:1,padding:'9px',border:`1.5px solid ${C.border}`,borderRadius:9,background:C.white,fontSize:12,fontWeight:600,cursor:'pointer'}}>🕐 Propor hora</button>
            </div>
          </div>
        )}
      </div>

      {/* Selector de horas (proposta) */}
      {showHoras&&<>
        <div onClick={()=>setShowHoras(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:40}}/>
        <div style={{position:'fixed',bottom:70,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:430,background:C.white,borderRadius:'16px 16px 0 0',zIndex:41,padding:'16px 14px 20px'}}>
          <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:10}}>🕐 Propor nova hora</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7}}>
            {SLOTS.map(h=><button key={h} onClick={()=>proporHora(h)} style={{padding:'8px',borderRadius:9,border:`1.5px solid ${C.border}`,background:C.white,fontSize:12,fontWeight:600,cursor:'pointer'}}>{h}</button>)}
          </div>
        </div>
      </>}

      {/* Input de mensagem */}
      <div style={{padding:'10px 12px',background:C.white,borderTop:`1px solid ${C.border}`,display:'flex',gap:8,alignItems:'flex-end',flexShrink:0}}>
        <div style={{flex:1,background:'#f8fafc',borderRadius:20,padding:'9px 14px',border:`1.5px solid ${C.border}`,display:'flex',alignItems:'center',gap:8}}>
          <input value={txt} onChange={e=>setTxt(e.target.value)} onKeyDown={e=>e.key==='Enter'&&enviar()} placeholder='Escreve uma mensagem…' style={{flex:1,border:'none',background:'transparent',fontSize:14,outline:'none',color:C.navy}}/>
        </div>
        <button onClick={enviar} disabled={!txt.trim()} style={{width:42,height:42,borderRadius:'50%',border:'none',background:txt.trim()?C.g:'#e2e8f0',color:'#fff',fontSize:18,cursor:txt.trim()?'pointer':'default',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>↑</button>
      </div>
    </div>
  )
}
function RoleBar({ role, onChange }) {
  return (
    <div style={{ background:'#0f172a', padding:'8px 12px', display:'flex', gap:6, position:'sticky', top:0, zIndex:60 }}>
      <span style={{ fontSize:9, color:'#475569', fontWeight:700, alignSelf:'center', whiteSpace:'nowrap', marginRight:2 }}>MODO</span>
      {[{id:'cliente',l:'👤 Cliente'},{id:'prestador',l:'👷 Prestador'},{id:'gestor',l:'🏢 Gestor'}].map(r => (
        <button key={r.id} onClick={() => onChange(r.id)} style={{
          flex:1, padding:'7px 4px', borderRadius:8, border:'none', cursor:'pointer',
          background: role===r.id ? C.g : 'rgba(255,255,255,0.07)',
          color: role===r.id ? '#fff' : '#94a3b8', fontSize:11, fontWeight:700,
        }}>{r.l}</button>
      ))}
    </div>
  )
}

function BNav({ tab, set, onFabClick }) {
  // 3.2A: Início · Serviços · FAB · Casa · Pedidos. Perfil migrou para avatar (3.2D).
  const tabsL = [{id:'inicio',ic:'🏠',l:'Início'},{id:'servicos',ic:'🔧',l:'Serviços'}]
  const tabsR = [{id:'casa',ic:'🏡',l:'Casa'},{id:'pedidos',ic:'📋',l:'Pedidos'}]
  const renderTab = t => (
    <button key={t.id} onClick={() => set(t.id)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', padding:'8px 0 6px', background:'none', border:'none', cursor:'pointer', gap:2 }}>
      <span style={{ fontSize:20 }}>{t.ic}</span>
      <span style={{ fontSize:10, fontWeight:700, color: tab===t.id ? C.g : '#94a3b8' }}>{t.l}</span>
      {tab===t.id && <div style={{ width:16, height:2, borderRadius:2, background:C.g }}/>}
    </button>
  )
  return (
    <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, background:C.white, borderTop:`1px solid ${C.border}`, display:'flex', zIndex:50 }}>
      {tabsL.map(renderTab)}
      {/* FAB central — assistente de pedido (Fase 2e) */}
      <div style={{ flex:1, display:'flex', justifyContent:'center', alignItems:'flex-start', position:'relative' }}>
        <button onClick={onFabClick} aria-label="Novo pedido" style={{
          marginTop:-22,
          width:52, height:52, borderRadius:'50%',
          background:'linear-gradient(135deg,#52B788,#2D6A4F)',
          border:'none', cursor:'pointer',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          boxShadow:'0 6px 18px rgba(82,183,136,0.5)',
          color:'#fff',
        }}>
          <span style={{ fontSize:18, lineHeight:1 }}>✨</span>
          <span style={{ fontSize:7, marginTop:1, letterSpacing:.3, fontWeight:700 }}>PEDIR</span>
        </button>
      </div>
      {tabsR.map(renderTab)}
    </div>
  )
}

/* Picker modal das moradas guardadas (Fase 2f.4).
   Lista as cliente_moradas com radio-select; atalho "Gerir moradas"
   leva ao ecrã CMoradas para criar novas ou editar existentes. */
function MoradaPickerModal({ moradas, selectedMoradaId, onClose, onSelect, onManage }){
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(10,22,32,0.55)',
      zIndex:80, display:'flex', alignItems:'flex-end', justifyContent:'center',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'#fff', width:'100%', maxWidth:430,
        borderRadius:'18px 18px 0 0', padding:'18px 18px 22px',
        maxHeight:'86vh', overflowY:'auto',
        animation:'popIn 0.18s ease-out',
      }}>
        <div style={{ width:38, height:4, borderRadius:2, background:'#e5e7eb', margin:'0 auto 14px' }}/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
          <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:'#0A1620' }}>Morada do serviço</h2>
          <button onClick={onClose} aria-label="Fechar" style={{ background:'none', border:'none', cursor:'pointer', padding:6, color:'#6B7685' }}><X size={18}/></button>
        </div>
        <div style={{ fontSize:12, color:'#6B7685', marginBottom:14 }}>Escolha onde o técnico deve ir. Pode gerir o quadro de moradas no Perfil.</div>

        {moradas === null && (
          <div className="sk" style={{ height:72, borderRadius:12, marginBottom:8 }}/>
        )}
        {moradas && moradas.length === 0 && (
          <div style={{ padding:'22px 16px', textAlign:'center', background:'#FAFAF6', borderRadius:12, border:'1px dashed #ECE9E2', marginBottom:12 }}>
            <div style={{ fontSize:28, marginBottom:8 }}>📍</div>
            <div style={{ fontSize:13, fontWeight:600, color:'#0A1620', marginBottom:4 }}>Sem moradas guardadas</div>
            <div style={{ fontSize:12, color:'#6B7685', lineHeight:1.4 }}>Adicione a sua primeira morada para avançar.</div>
          </div>
        )}
        {moradas && moradas.map(m => {
          const sel = m.id === selectedMoradaId
          return (
            <button key={m.id} onClick={()=>onSelect(m)} style={{
              width:'100%', display:'flex', alignItems:'flex-start', gap:12,
              background: sel ? 'rgba(22,163,74,0.06)' : '#fff',
              border:`1.5px solid ${sel ? '#16a34a' : '#ECE9E2'}`, borderRadius:14,
              padding:14, marginBottom:8, cursor:'pointer', textAlign:'left',
            }}>
              <div style={{
                width:20, height:20, borderRadius:999, flexShrink:0, marginTop:2,
                border:`2px solid ${sel ? '#16a34a' : '#CBD5E1'}`,
                display:'grid', placeItems:'center',
              }}>
                {sel && <div style={{ width:10, height:10, borderRadius:999, background:'#16a34a' }}/>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                  <span style={{ fontSize:13.5, fontWeight:700, color:'#0A1620' }}>{m.label}</span>
                  {m.is_default && <span style={{ fontSize:9, fontWeight:700, color:'#16a34a', background:'rgba(22,163,74,0.12)', padding:'2px 6px', borderRadius:4, textTransform:'uppercase', letterSpacing:0.4 }}>Default</span>}
                </div>
                <div style={{ fontSize:12.5, color:'#0A1620', lineHeight:1.4 }}>{m.morada}</div>
                {(m.cp || m.cidade) && <div style={{ fontSize:11.5, color:'#6B7685', marginTop:1 }}>{[m.cp, m.cidade].filter(Boolean).join(' ')}</div>}
                {m.notas_acesso && <div style={{ fontSize:11, color:'#6B7685', marginTop:4, fontStyle:'italic' }}>🔑 {m.notas_acesso}</div>}
              </div>
            </button>
          )
        })}

        <button onClick={onManage} style={{
          width:'100%', padding:'12px 14px', borderRadius:12,
          border:'1px dashed #ECE9E2', background:'transparent',
          color:'#16a34a', fontSize:13, fontWeight:700, cursor:'pointer',
          marginTop:6,
        }}>+ Gerir moradas</button>
      </div>
    </div>
  )
}

/* Picker modal do FAB central — 8 categorias em grid + descrição livre.
   Click numa categoria abre ServiceListScreenV2 dessa categoria.
   "Descrever livremente" leva ao PersonalizadoLandingV2 de Manutenção
   (catch-all mais abrangente) com a descrição pré-preenchida. */
function FabPickerModal({ onClose, onPickCategory, onPickPersonalizado }) {
  const [description, setDescription] = useState('')
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(10,22,32,0.55)',
      zIndex:80, display:'flex', alignItems:'flex-end', justifyContent:'center',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'#fff', width:'100%', maxWidth:430,
        borderRadius:'18px 18px 0 0', padding:'18px 18px 22px',
        maxHeight:'86vh', overflowY:'auto',
        animation:'popIn 0.18s ease-out',
      }}>
        <div style={{ width:38, height:4, borderRadius:2, background:'#e5e7eb', margin:'0 auto 14px' }}/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
          <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:'#0A1620' }}>Como podemos ajudar?</h2>
          <button onClick={onClose} aria-label="Fechar" style={{ background:'none', border:'none', cursor:'pointer', padding:6, color:'#6B7685' }}><X size={18}/></button>
        </div>
        <div style={{ fontSize:12, color:'#6B7685', marginBottom:14 }}>Escolha uma categoria ou descreva o serviço que precisa.</div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
          {CATS.map(c => (
            <button key={c.id} onClick={()=>{ onPickCategory(c.id); onClose() }} style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:6,
              background:'#fff', border:`1.5px solid #ECE9E2`, borderRadius:12,
              padding:'12px 4px', cursor:'pointer',
            }}>
              <span style={{ fontSize:22 }}>{c.ic}</span>
              <span style={{ fontSize:10, fontWeight:700, color:'#0A1620', textAlign:'center', lineHeight:1.2 }}>{c.l}</span>
            </button>
          ))}
        </div>

        <div style={{ fontSize:10, fontWeight:700, color:'#6B7685', textTransform:'uppercase', letterSpacing:0.6, marginBottom:6 }}>Ou descreva livremente</div>
        <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} maxLength={500}
          placeholder="Ex: torneira a pingar na cozinha, barulho quando abro. Tem uma semana."
          style={{
            width:'100%', background:'#FAFAF6', border:'1px solid #ECE9E2',
            borderRadius:12, padding:12, fontSize:13.5, fontFamily:'inherit',
            color:'#0A1620', resize:'vertical', outline:'none', marginBottom:10,
          }}/>
        <button
          onClick={()=>{ onPickPersonalizado(description.trim()); onClose() }}
          disabled={description.trim().length < 10}
          style={{
            width:'100%', padding:'12px 16px', borderRadius:12,
            background: description.trim().length < 10 ? '#E5E7EB' : `linear-gradient(135deg,${C.g},#16a34a)`,
            color: description.trim().length < 10 ? '#94a3b8' : '#fff',
            border:'none', cursor: description.trim().length < 10 ? 'default' : 'pointer',
            fontSize:14, fontWeight:700,
          }}>
          {description.trim().length < 10 ? 'Descreva pelo menos 10 caracteres' : 'Continuar com descrição livre →'}
        </button>
      </div>
    </div>
  )
}

function Chat({ titulo, msgs: iM, lado, onBack }) {
  const [msgs, setMsgs] = useState(iM)
  const [nova, setNova] = useState('')
  const env = () => { if (!nova.trim()) return; setMsgs(m => [...m, {de:lado, t:nova, h:'agora'}]); setNova('') }
  return (
    <div style={{ minHeight:'100vh', background:C.mist, display:'flex', flexDirection:'column' }}>
      <Header title={titulo} onBack={onBack}/>
      <div style={{ flex:1, padding:'12px 14px 90px', display:'flex', flexDirection:'column', gap:8 }}>
        {msgs.map((m,i) => {
          const mine = m.de===lado
          return (
            <div key={i} style={{ display:'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth:'78%', background: mine ? C.navy : C.white, color: mine ? '#fff' : C.navy, borderRadius: mine ? '15px 4px 15px 15px' : '4px 15px 15px 15px', padding:'9px 12px', fontSize:13, lineHeight:1.5, border: mine ? 'none' : `1px solid ${C.border}` }}>
                <p style={{ margin:0 }}>{m.t}</p>
                <div style={{ fontSize:9, color: mine ? '#8FA8BB' : C.slate, marginTop:3, textAlign:'right' }}>{m.h}</div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, background:C.white, padding:'9px 13px 18px', borderTop:`1px solid ${C.border}`, display:'flex', gap:7 }}>
        <input value={nova} onChange={e=>setNova(e.target.value)} onKeyDown={e=>e.key==='Enter'&&env()} placeholder='Escrever mensagem...' style={{ flex:1, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'9px 12px', fontSize:13, outline:'none', color:C.navy }}/>
        <button onClick={env} style={{ background:C.g, color:'#fff', border:'none', borderRadius:10, width:40, height:40, fontSize:16, cursor:'pointer' }}>➤</button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════
   CLIENTE
══════════════════════════════════ */
function CHome({ ordens, onSvc, onOrdem, authUser, onCategoryV2, onDrawerOpen, categoriesCache }) {
  const [cat, setCat] = useState(null)
  const [q,   setQ]   = useState('')
  const nomeCliente = authUser?.nome || 'Cliente'
  const meus = ordens.filter(o => o.cli===nomeCliente && o.st!=='concluida')
  const svcs = SVCS.filter(s => (cat ? s.cat===cat : true) && (q ? s.n.toLowerCase().includes(q.toLowerCase()) : true))
  // TEMP(2b) DESACTIVADO: bypass de teste validado (passos 1-7 OK).
  // A integração proper dos screens V2 com o click de Canalização na CHome é feita na Fase 2c-A.
  // Se precisar de re-testar em isolado, recolocar o bloco que esteve aqui em commit ff87563 ~ bd828dd.
  return (
    <div style={{ minHeight:'100vh', background:C.mist, paddingBottom:80 }}>
      {/* Hero */}
      <div style={{ background:`linear-gradient(145deg,${C.navy},${C.gd})`, padding:'22px 20px 32px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-50, right:-50, width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }}/>
        <div style={{ position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            {/* Hamburger ☰ → drawer do cliente */}
            <button onClick={()=>onDrawerOpen?.()} aria-label="Menu" style={{ background:'none', border:'none', cursor:'pointer', padding:6, display:'flex', flexDirection:'column', gap:5 }}>
              {[0,1,2].map(i => <div key={i} style={{ width:22, height:2, background:'#fff', borderRadius:2 }}/>)}
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <span style={{ fontSize:11 }}>🔐</span>
              <span style={{ color:C.gm, fontSize:10, fontWeight:700, letterSpacing:'0.06em' }}>REDE DE CONFIANÇA</span>
            </div>
          </div>
          <h1 style={{ color:'#fff', fontSize:24, fontWeight:800, lineHeight:1.2, margin:'0 0 8px', fontFamily:'Georgia,serif' }}>
            A sua equipa,<br/><span style={{ color:'#86efac' }}>sempre a mesma.</span>
          </h1>
          <p style={{ color:'#94a3b8', fontSize:13, margin:'0 0 18px', lineHeight:1.5 }}>Técnico fixo. Relatório fotográfico. Preço garantido.</p>
          <div style={{ display:'flex', gap:8, background:'rgba(255,255,255,0.08)', borderRadius:14, padding:5 }}>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Que serviço precisa?" style={{ flex:1, background:C.white, border:'none', borderRadius:10, padding:'10px 14px', fontSize:14, outline:'none', color:C.navy }}/>
            <button style={{ background:C.g, color:C.white, border:'none', borderRadius:10, padding:'0 14px', fontSize:16, cursor:'pointer' }}>🔍</button>
          </div>
          <div style={{ display:'flex', gap:14, marginTop:14 }}>
            {[['⭐','4.9/5'],['✅','+500 serviços'],['🔐','Técnico fixo']].map(([ic,t]) => (
              <div key={t} style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ fontSize:11 }}>{ic}</span>
                <span style={{ color:'#bbf7d0', fontSize:10, fontWeight:600 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding:'0 16px' }}>
        {meus.length>0 && <>
          <SectTitle t="Os meus pedidos"/>
          {meus.map(o => {
            const s = svcById(o.sid)
            const t = tecById(o.tid)
            const titulo = s?.n || o.servico_nome || (o.is_personalizado ? 'Serviço personalizado' : 'Serviço')
            const catNome = (() => {
              const names = { limpeza:'Limpeza', manutencao:'Manutenção', jardim:'Jardim', piscina:'Piscina', pintura:'Pintura', eletrica:'Eléctrica', canalizacao:'Canalização', pos_obra:'Pós-obra' }
              return o.categoria_id ? names[o.categoria_id] : null
            })()
            const valorText = o.valor_cobrado != null
              ? `€${Number(o.valor_cobrado).toFixed(2).replace('.',',')}`
              : (o.val != null ? `€${Number(o.val).toFixed(2).replace('.',',')}` : null)
            let quando = o.data
            if(o.schedule_mode === 'imediato') quando = 'Imediato · 30-40 min'
            else if(o.data_agendada && o.hora_agendada){
              try {
                const d = new Date(o.data_agendada + 'T00:00:00')
                quando = `${d.toLocaleDateString('pt-PT', { weekday:'short', day:'numeric', month:'short' })} · ${o.hora_agendada}`
              } catch {}
            }
            const pedidoIso = o.dt_pedido_iso || o.created_at
            const pedidoLabel = (() => {
              if(!pedidoIso) return null
              const ms = Date.now() - new Date(pedidoIso).getTime()
              if(ms < 0 || Number.isNaN(ms)) return null
              const m = Math.floor(ms / 60000)
              if(m < 1) return 'há instantes'
              if(m < 60) return `há ${m} min`
              const h = Math.floor(m / 60)
              if(h < 24) return `há ${h}h`
              return `há ${Math.floor(h/24)} dias`
            })()
            return (
              <Card key={o.id} style={{ padding:14, marginBottom:8 }} onClick={() => onOrdem(o)}>
                <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <span style={{ fontSize:24, lineHeight:1 }}>{s?.ic||'🔧'}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:C.slate, fontFamily:'ui-monospace,monospace', letterSpacing:0.3 }}>
                        {o.numero_sequencial || 'Pedido recente'}
                      </span>
                      <EstBadge st={o.st}/>
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.navy, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{titulo}</div>
                    {(catNome || valorText) && (
                      <div style={{ fontSize:11, color:C.slate, marginTop:2 }}>
                        {catNome && <span>{catNome}</span>}
                        {catNome && valorText && <span> · </span>}
                        {valorText && <span style={{ fontWeight:700, color:C.navy }}>{valorText}</span>}
                      </div>
                    )}
                    <div style={{ fontSize:11, color:C.slate, marginTop:2 }}>{quando}</div>
                    {t
                      ? <div style={{ fontSize:10, color:C.g, fontWeight:600, marginTop:2 }}>👤 {t.n}</div>
                      : <div style={{ fontSize:10, color:C.amber, fontWeight:600, marginTop:2 }}>⏳ A atribuir técnico</div>}
                    {pedidoLabel && (
                      <div style={{ fontSize:10, color:C.slate, marginTop:2 }}>{pedidoLabel}</div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
          <div style={{ height:6 }}/>
        </>}
        {/* Categorias */}
        <SectTitle t="O que precisa?"/>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:18 }}>
          {CATS.map(c => (
            <button key={c.id} onClick={() => {
              if (onCategoryV2) { onCategoryV2(c.id); return }
              setCat(cat===c.id ? null : c.id)
            }} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, background: cat===c.id ? c.cor : C.white, border:`2px solid ${cat===c.id ? c.cor : C.border}`, borderRadius:13, padding:'10px 4px', cursor:'pointer' }}>
              <span style={{ fontSize:20 }}>{c.ic}</span>
              <span style={{ fontSize:9, fontWeight:700, color: cat===c.id ? '#fff' : '#64748b', textAlign:'center', lineHeight:1.2 }}>{c.l}</span>
            </button>
          ))}
        </div>
        {/* Equipa */}
        {!cat && !q && <>
          <SectTitle t="A nossa equipa"/>
          <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:8, marginBottom:16 }}>
            {TECNICOS.filter(t=>t.st==='activo').map(t => (
              <div key={t.id} style={{ flexShrink:0, width:118, background:C.white, borderRadius:14, padding:12, border:`1px solid ${C.border}`, textAlign:'center' }}>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:7 }}><Av ini={t.ini} size={44}/></div>
                <div style={{ fontSize:11, fontWeight:700, color:C.navy, lineHeight:1.3 }}>{t.n}</div>
                <div style={{ fontSize:9, color:C.slate, marginTop:2 }}>{t.cats.map(c=>catById(c)?.ic).join(' ')}</div>
                <div style={{ display:'flex', justifyContent:'center', marginTop:3 }}><Stars v={t.r} s={10}/></div>
                <div style={{ fontSize:9, color:C.g, fontWeight:700, marginTop:3, background:C.gl, borderRadius:7, padding:'2px 5px', display:'inline-block' }}>{t.jobs} serviços</div>
              </div>
            ))}
          </div>
        </>}
        {/* Serviços */}
        <SectTitle t={cat ? CATS.find(c=>c.id===cat)?.l||'Serviços' : 'Serviços Populares'} action={cat?'Ver todos':null} onAction={()=>setCat(null)}/>
        {svcs.map(s => (
          <Card key={s.id} style={{ padding:15, marginBottom:8, cursor:'pointer' }} onClick={() => onSvc(s)}>
            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
              <div style={{ width:50, height:50, borderRadius:13, background:(catById(s.cat)?.cor||C.g)+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{s.ic}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:6 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:C.navy, lineHeight:1.3 }}>{s.n}</span>
                  {s.badge && <Pill text={s.badge} bg={s.badge==='Urgente'?'#fee2e2':s.badge==='Destaque'?'#fef3c7':C.gl} col={s.badge==='Urgente'?C.red:s.badge==='Destaque'?'#92400e':C.gd}/>}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:3 }}><Stars v={s.r} s={10}/><span style={{ fontSize:10, color:C.slate }}>{s.r} ({s.rv})</span></div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:5 }}>
                  <span style={{ fontSize:11, color:C.slate }}>⏱ {s.d}</span>
                  <div><span style={{ fontSize:16, fontWeight:800, color:C.g }}>€{s.p}</span><span style={{ fontSize:10, color:C.slate }}> {s.u}</span></div>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {/* Reviews */}
        {!cat && !q && <>
          <SectTitle t="O que dizem os clientes"/>
          {REVIEWS.map((r,i) => (
            <Card key={i} style={{ padding:15, marginBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
                <div><span style={{ fontWeight:700, fontSize:13, color:C.navy }}>{r.n}</span><span style={{ color:'#94a3b8', fontSize:11, marginLeft:5 }}>{r.c}</span></div>
                <Stars v={r.r} s={12}/>
              </div>
              <p style={{ margin:'0 0 6px', fontSize:12, color:'#475569', lineHeight:1.5 }}>"{r.t}"</p>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:10, color:'#94a3b8' }}>{r.svc}</span>
                <span style={{ fontSize:10, color:C.g, fontWeight:600 }}>👤 {r.tec}</span>
              </div>
            </Card>
          ))}
        </>}
      </div>
    </div>
  )
}

// DEPRECATED 3.2C: replaced by ServicosScreen. Safe to delete in next cleanup pass.
function CExplorar({ onSvc }) {
  const [cat, setCat] = useState(null)
  return (
    <div style={{ minHeight:'100vh', background:C.mist, paddingBottom:80 }}>
      <div style={{ background:C.white, padding:'18px 16px 14px', borderBottom:`1px solid ${C.border}` }}>
        <h1 style={{ fontSize:19, fontWeight:800, color:C.navy, marginBottom:12 }}>Explorar serviços</h1>
        <div style={{ display:'flex', gap:8, overflowX:'auto' }}>
          {[{id:null,l:'Todos'},...CATS.map(c=>({id:c.id,l:c.l}))].map(f => (
            <button key={f.id||'t'} onClick={()=>setCat(f.id)} style={{ flexShrink:0, padding:'6px 12px', borderRadius:18, border:'none', cursor:'pointer', background: cat===f.id ? C.g : '#f1f5f9', color: cat===f.id ? '#fff' : '#64748b', fontSize:12, fontWeight:600 }}>{f.l}</button>
          ))}
        </div>
      </div>
      <div style={{ padding:'14px 16px 20px' }}>
        {SVCS.filter(s => cat ? s.cat===cat : true).map(s => (
          <Card key={s.id} style={{ padding:15, marginBottom:8, cursor:'pointer' }} onClick={() => onSvc(s)}>
            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
              <div style={{ width:54, height:54, borderRadius:13, background:(catById(s.cat)?.cor||C.g)+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>{s.ic}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}><span style={{ fontSize:13, fontWeight:700, color:C.navy }}>{s.n}</span>{s.badge&&<Pill text={s.badge} bg={s.badge==='Urgente'?'#fee2e2':C.gl} col={s.badge==='Urgente'?C.red:C.gd}/>}</div>
                <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}><Stars v={s.r} s={10}/><span style={{ fontSize:10, color:C.slate }}>{s.r} ({s.rv})</span></div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}><span style={{ fontSize:11, color:C.slate }}>⏱ {s.d}</span><span style={{ fontSize:15, fontWeight:800, color:C.g }}>€{s.p} <span style={{ fontSize:10, fontWeight:500, color:C.slate }}>{s.u}</span></span></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// DEPRECATED 3.2C: replaced by PedidosScreen. Safe to delete in next cleanup pass.
function CPedidos({ ordens, onOrdem, authUser }) {
  const nomeCliente = authUser?.nome || 'Cliente'
  const meus = ordens.filter(o => o.cli===nomeCliente)

  const CATEGORY_NAMES_LOCAL = {
    limpeza:'Limpeza', manutencao:'Manutenção', jardim:'Jardim',
    piscina:'Piscina', pintura:'Pintura', eletrica:'Eléctrica',
    canalizacao:'Canalização', pos_obra:'Pós-obra',
  }
  const eurFmt = v => v==null ? null : `€${Number(v).toFixed(2).replace('.',',')}`
  const haMin = iso => {
    if(!iso) return ''
    const ms = Date.now() - new Date(iso).getTime()
    if(ms < 0 || Number.isNaN(ms)) return ''
    const m = Math.floor(ms / 60000)
    if(m < 1) return 'há instantes'
    if(m < 60) return `há ${m} min`
    const h = Math.floor(m / 60)
    if(h < 24) return `há ${h}h`
    return `há ${Math.floor(h/24)} dias`
  }
  const quandoLabel = o => {
    if(o.schedule_mode === 'imediato') return 'Imediato · 30-40 min'
    if(o.data_agendada && o.hora_agendada){
      try {
        const d = new Date(o.data_agendada + 'T00:00:00')
        return `${d.toLocaleDateString('pt-PT', { weekday:'short', day:'numeric', month:'short' })} · ${o.hora_agendada}`
      } catch {}
    }
    return o.data || 'Em breve'
  }
  const nomeServico = o => {
    if(o.sid){ const s = svcById(o.sid); if(s?.n) return s.n }
    if(o.servico_id){
      for(const sub of SUBCATEGORIES){
        const hit = sub.services.find(x => x.id === o.servico_id)
        if(hit) return hit.name
      }
    }
    if(o.is_personalizado) return 'Serviço personalizado'
    if(o.servico_nome) return o.servico_nome
    if(o.nome) return o.nome
    return 'Serviço'
  }
  const icServico = o => {
    if(o.sid){ const s = svcById(o.sid); if(s?.ic) return s.ic }
    return '🔧'
  }

  return (
    <div style={{ minHeight:'100vh', background:C.mist, paddingBottom:80 }}>
      <div style={{ background:C.white, padding:'18px 16px 14px', borderBottom:`1px solid ${C.border}` }}>
        <h1 style={{ fontSize:19, fontWeight:800, color:C.navy }}>Os meus pedidos</h1>
      </div>
      <div style={{ padding:'14px 16px 20px' }}>
        {meus.map(o => {
          const t = tecById(o.tid)
          const svc = nomeServico(o)
          const catNome = o.categoria_id ? CATEGORY_NAMES_LOCAL[o.categoria_id] : null
          const valor = eurFmt(o.valor_cobrado ?? o.val)
          const quando = quandoLabel(o)
          const pedido = o.dt_pedido_iso || o.created_at
          const pedidoLabel = pedido ? haMin(pedido) : ''
          return (
            <Card key={o.id} style={{ padding:15, marginBottom:8 }} onClick={() => onOrdem(o)}>
              <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                <span style={{ fontSize:26, lineHeight:1 }}>{icServico(o)}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:C.slate, fontFamily:'ui-monospace,monospace', letterSpacing:0.3 }}>
                      {o.numero_sequencial || 'Pedido recente'}
                    </span>
                    <EstBadge st={o.st}/>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.navy, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {svc}
                  </div>
                  {(catNome || valor) && (
                    <div style={{ fontSize:11, color:C.slate, marginTop:2 }}>
                      {catNome && <span>{catNome}</span>}
                      {catNome && valor && <span> · </span>}
                      {valor && <span style={{ fontWeight:700, color:C.navy }}>{valor}</span>}
                    </div>
                  )}
                  <div style={{ fontSize:11, color:C.slate, marginTop:2 }}>{quando}</div>
                  {t
                    ? <div style={{ fontSize:10, color:C.g, fontWeight:600, marginTop:2 }}>👤 {t.n}</div>
                    : <div style={{ fontSize:10, color:C.amber, fontWeight:600, marginTop:2 }}>⏳ A atribuir técnico</div>}
                  {pedidoLabel && (
                    <div style={{ fontSize:10, color:C.slate, marginTop:2 }}>{pedidoLabel}</div>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
        {meus.length===0 && (
          <div style={{
            padding:'40px 24px 32px', textAlign:'center',
            background:C.white, borderRadius:14, border:`1px dashed ${C.border}`,
            margin:'12px 4px',
          }}>
            <div style={{
              width:64, height:64, margin:'0 auto 14px', borderRadius:999,
              background:'rgba(22,163,74,0.08)', color:C.g,
              display:'grid', placeItems:'center',
              fontSize:32,
            }}>📋</div>
            <div style={{ fontSize:15, fontWeight:700, color:C.navy, marginBottom:6 }}>
              Ainda não tem pedidos
            </div>
            <div style={{ fontSize:12.5, color:C.slate, lineHeight:1.5, maxWidth:260, margin:'0 auto 16px' }}>
              Toque no botão central ✨ para criar um serviço ou escolha uma categoria no Início.
            </div>
            <div style={{ fontSize:10, color:C.g, fontWeight:700, letterSpacing:0.5, textTransform:'uppercase' }}>
              Técnico fixo · 90 dias de garantia
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CPerfil({ authUser, onMoradas, onLogout, onPlaceholder }) {
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingFiscal, setEditingFiscal] = useState(false)
  const [fiscal, setFiscal] = useState({ nif:'', morada_fiscal:'', cp_fiscal:'', cidade_fiscal:'' })
  const [saving, setSaving] = useState(false)
  const uid = authUser?.user?.id

  useEffect(() => {
    if(!uid || !SB_KEY) { setLoading(false); return }
    let active = true
    sbGet('perfis', `?id=eq.${uid}&select=*`, authUser?.token).then(rows => {
      if(!active) return
      const row = Array.isArray(rows) ? rows[0] : null
      setPerfil(row)
      if(row) setFiscal({
        nif:           row.nif || '',
        morada_fiscal: row.morada_fiscal || '',
        cp_fiscal:     row.cp_fiscal || '',
        cidade_fiscal: row.cidade_fiscal || '',
      })
      setLoading(false)
    })
    return () => { active = false }
  }, [uid, authUser?.token])

  const saveFiscal = async () => {
    if(!uid) return
    setSaving(true)
    const res = await sbUpdate('perfis', `?id=eq.${uid}`, fiscal, authUser?.token)
    setSaving(false)
    if(!res){ alert('Erro ao guardar dados fiscais. Ver consola.'); return }
    setPerfil(p => ({...p, ...fiscal}))
    setEditingFiscal(false)
  }

  const nome = perfil?.nome || authUser?.nome || 'Cliente'
  const email = perfil?.email || authUser?.user?.email || '—'
  const ini = (nome[0] || 'C').toUpperCase()

  return (
    <div style={{ minHeight:'100vh', background:C.mist, paddingBottom:80 }}>
      <div style={{ background:`linear-gradient(135deg,${C.navy},${C.gd})`, padding:'32px 20px 26px', textAlign:'center' }}>
        <div style={{ width:74, height:74, borderRadius:'50%', background:C.g, display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, margin:'0 auto 10px', color:'#fff', fontWeight:800 }}>{ini}</div>
        <h2 style={{ color:'#fff', margin:'0 0 3px', fontSize:18, fontWeight:800 }}>{nome}</h2>
        <p style={{ color:'#94a3b8', margin:0, fontSize:12 }}>{email}</p>
      </div>

      <div style={{ padding:'14px 16px 20px' }}>
        {/* Dados fiscais (NIF + morada fiscal) */}
        <div style={{ fontSize:10, fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:0.6, margin:'4px 4px 8px' }}>
          Dados de faturação
        </div>
        <Card style={{ padding:16, marginBottom:14 }}>
          {loading ? (
            <div className="sk" style={{ height:48 }}/>
          ) : editingFiscal ? (
            <>
              <FiscalInput label="NIF" value={fiscal.nif} onChange={v=>setFiscal(f=>({...f,nif:v}))} inputMode="numeric" maxLength={9}/>
              <FiscalInput label="Morada fiscal" value={fiscal.morada_fiscal} onChange={v=>setFiscal(f=>({...f,morada_fiscal:v}))}/>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:10 }}>
                <FiscalInput label="Código postal" value={fiscal.cp_fiscal} onChange={v=>setFiscal(f=>({...f,cp_fiscal:v}))}/>
                <FiscalInput label="Localidade" value={fiscal.cidade_fiscal} onChange={v=>setFiscal(f=>({...f,cidade_fiscal:v}))}/>
              </div>
              <div style={{ display:'flex', gap:8, marginTop:12 }}>
                <button onClick={()=>setEditingFiscal(false)} style={{ flex:1, padding:'10px 14px', borderRadius:10, border:`1px solid ${C.border}`, background:C.white, color:C.slate, fontWeight:600, fontSize:13, cursor:'pointer' }}>Cancelar</button>
                <button onClick={saveFiscal} disabled={saving} style={{ flex:2, padding:'10px 14px', borderRadius:10, border:'none', background:C.g, color:'#fff', fontWeight:700, fontSize:13, cursor:saving?'default':'pointer', opacity:saving?0.6:1 }}>{saving?'A guardar…':'Guardar'}</button>
              </div>
            </>
          ) : (
            <>
              {perfil?.nif ? (
                <>
                  <FiscalLine label="NIF" value={perfil.nif}/>
                  <FiscalLine label="Morada" value={perfil.morada_fiscal || '—'}/>
                  <FiscalLine label="Localidade" value={[perfil.cp_fiscal, perfil.cidade_fiscal].filter(Boolean).join(' ') || '—'}/>
                </>
              ) : (
                <div style={{ fontSize:13, color:C.slate, lineHeight:1.45, marginBottom:10 }}>Ainda não tem dados de faturação guardados. Adicione para receber fatura automaticamente em cada serviço.</div>
              )}
              <button onClick={()=>setEditingFiscal(true)} style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:`1px solid ${C.g}`, background:'transparent', color:C.g, fontWeight:700, fontSize:13, cursor:'pointer', marginTop:perfil?.nif?6:0 }}>
                {perfil?.nif ? '✏️ Editar dados' : '+ Adicionar NIF e morada fiscal'}
              </button>
            </>
          )}
        </Card>

        {/* Navegação principal */}
        <div style={{ fontSize:10, fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:0.6, margin:'4px 4px 8px' }}>
          Conta
        </div>
        {[
          { ic:'📍', l:'As minhas moradas', act:onMoradas, show:true },
          { ic:'💳', l:'Métodos de pagamento',  act:()=>onPlaceholder?.('Métodos de pagamento') },
          { ic:'⭐', l:'As minhas avaliações',   act:()=>onPlaceholder?.('As minhas avaliações') },
          { ic:'🎁', l:'Código de referência',   act:()=>onPlaceholder?.('Código de referência') },
          { ic:'🔔', l:'Notificações',           act:()=>onPlaceholder?.('Notificações') },
          { ic:'❓', l:'Ajuda & Suporte',        act:()=>onPlaceholder?.('Ajuda & Suporte') },
        ].map(({ic,l,act}) => (
          <Card key={l} onClick={act} style={{ padding:'14px 16px', marginBottom:7, display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}>
            <span style={{ fontSize:19 }}>{ic}</span>
            <span style={{ flex:1, fontSize:13, color:C.navy, fontWeight:600 }}>{l}</span>
            <span style={{ color:C.border, fontSize:16 }}>›</span>
          </Card>
        ))}
        <Card onClick={onLogout} style={{ padding:'14px 16px', marginTop:14, display:'flex', alignItems:'center', gap:12, cursor:'pointer', border:`1px solid #fecaca` }}>
          <span style={{ fontSize:19 }}>🚪</span>
          <span style={{ flex:1, fontSize:13, color:'#ef4444', fontWeight:700 }}>Terminar sessão</span>
        </Card>
      </div>
    </div>
  )
}

function FiscalInput({ label, value, onChange, inputMode, maxLength }){
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ fontSize:10, fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{label}</div>
      <input value={value} onChange={e=>onChange(e.target.value)} inputMode={inputMode} maxLength={maxLength}
        style={{ width:'100%', boxSizing:'border-box', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, fontFamily:'inherit', color:C.navy, outline:'none', background:C.white }}/>
    </div>
  )
}

function FiscalLine({ label, value }){
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #f1f5f9', fontSize:12 }}>
      <span style={{ color:C.slate }}>{label}</span>
      <span style={{ color:C.navy, fontWeight:600, textAlign:'right', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{value}</span>
    </div>
  )
}

function CMoradas({ authUser, onBack }){
  const [moradas, setMoradas] = useState(null)
  const [editing, setEditing] = useState(null)   // null | 'new' | row
  const [form, setForm] = useState({ label:'', morada:'', cp:'', cidade:'', tipologia:'', notas_acesso:'', is_default:false })
  const [saving, setSaving] = useState(false)
  const uid = authUser?.user?.id

  const refetch = async () => {
    if(!uid) return
    const rows = await sbGet('cliente_moradas', `?cliente_id=eq.${uid}&order=is_default.desc,created_at.asc`, authUser?.token)
    setMoradas(rows || [])
  }
  useEffect(() => { refetch() /* eslint-disable-next-line */ }, [uid])

  const openNew = () => { setForm({ label:'', morada:'', cp:'', cidade:'', tipologia:'', notas_acesso:'', is_default:false }); setEditing('new') }
  const openEdit = (m) => { setForm({
    label:        m.label        || '',
    morada:       m.morada       || '',
    cp:           m.cp           || '',
    cidade:       m.cidade       || '',
    tipologia:    m.tipologia    || '',
    notas_acesso: m.notas_acesso || '',
    is_default:   !!m.is_default,
  }); setEditing(m) }

  const save = async () => {
    if(!uid) return
    const clean = s => (s || '').trim()
    if(!clean(form.label) || !clean(form.morada)){ alert('Label e morada são obrigatórios.'); return }
    setSaving(true)
    const payload = {
      cliente_id: uid,
      label:        clean(form.label),
      morada:       clean(form.morada),
      cp:           clean(form.cp)           || null,
      cidade:       clean(form.cidade)       || null,
      tipologia:    clean(form.tipologia)    || null,
      notas_acesso: clean(form.notas_acesso) || null,
      is_default:   !!form.is_default,
    }
    // Se marcar esta como default, primeiro tira o default das outras
    if(payload.is_default){
      await sbUpdate('cliente_moradas', `?cliente_id=eq.${uid}&is_default=eq.true`, { is_default:false }, authUser?.token)
    }
    let result
    if(editing === 'new'){
      result = await sbSave('cliente_moradas', payload, authUser?.token)
    } else {
      result = await sbUpdate('cliente_moradas', `?id=eq.${editing.id}`, payload, authUser?.token)
    }
    setSaving(false)
    if(!result){ alert('Erro ao guardar a morada.'); return }
    setEditing(null)
    await refetch()
  }

  const remove = async (m) => {
    if(!window.confirm(`Eliminar "${m.label}"?`)) return
    const ok = await sbDelete('cliente_moradas', `?id=eq.${m.id}`, authUser?.token)
    if(!ok){ alert('Erro ao eliminar.'); return }
    await refetch()
  }

  return (
    <div style={{ minHeight:'100vh', background:C.mist, paddingBottom:80 }}>
      <div style={{ background:C.white, padding:'13px 16px', display:'flex', alignItems:'center', gap:10, borderBottom:`1px solid ${C.border}`, position:'sticky', top:0, zIndex:20 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:C.navy }}>←</button>
        <div style={{ flex:1, fontSize:14, fontWeight:700, color:C.navy }}>As minhas moradas</div>
        <button onClick={openNew} style={{ background:C.g, color:'#fff', border:'none', borderRadius:8, padding:'7px 12px', fontSize:12, fontWeight:700, cursor:'pointer' }}>+ Nova</button>
      </div>

      <div style={{ padding:'14px 16px' }}>
        {moradas === null && (
          <div className="sk" style={{ height:96, marginBottom:8 }}/>
        )}
        {moradas && moradas.length === 0 && (
          <div style={{ padding:'32px 20px', textAlign:'center', background:C.white, borderRadius:14, border:`1px dashed ${C.border}` }}>
            <div style={{ fontSize:32, marginBottom:10 }}>📍</div>
            <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:4 }}>Ainda não tem moradas guardadas</div>
            <div style={{ fontSize:12, color:C.slate, lineHeight:1.5, maxWidth:260, margin:'0 auto 14px' }}>Adicione a sua morada principal para agilizar os próximos pedidos.</div>
            <button onClick={openNew} style={{ background:C.g, color:'#fff', border:'none', borderRadius:10, padding:'9px 18px', fontSize:13, fontWeight:700, cursor:'pointer' }}>+ Adicionar morada</button>
          </div>
        )}
        {moradas && moradas.map(m => (
          <Card key={m.id} style={{ padding:14, marginBottom:8 }}>
            <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
              <div style={{ width:36, height:36, borderRadius:10, background:m.is_default ? 'rgba(22,163,74,0.15)' : '#f1f5f9', color:m.is_default ? C.g : C.slate, display:'grid', placeItems:'center', fontSize:16, flexShrink:0 }}>📍</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:C.navy }}>{m.label}</span>
                  {m.is_default && <span style={{ fontSize:9, fontWeight:700, color:C.g, background:'rgba(22,163,74,0.12)', padding:'2px 6px', borderRadius:4, textTransform:'uppercase', letterSpacing:0.4 }}>Default</span>}
                </div>
                <div style={{ fontSize:12, color:C.slate, lineHeight:1.4 }}>{m.morada}</div>
                {(m.cp || m.cidade) && <div style={{ fontSize:11, color:C.slate, marginTop:1 }}>{[m.cp, m.cidade].filter(Boolean).join(' ')}</div>}
                {m.notas_acesso && <div style={{ fontSize:11, color:C.slate, marginTop:4, fontStyle:'italic' }}>🔑 {m.notas_acesso}</div>}
              </div>
            </div>
            <div style={{ display:'flex', gap:6, marginTop:10 }}>
              <button onClick={()=>openEdit(m)} style={{ flex:1, padding:'7px', borderRadius:8, border:`1px solid ${C.border}`, background:C.white, color:C.slate, fontSize:12, fontWeight:600, cursor:'pointer' }}>✏️ Editar</button>
              <button onClick={()=>remove(m)} style={{ padding:'7px 12px', borderRadius:8, border:`1px solid #fecaca`, background:C.white, color:'#ef4444', fontSize:12, fontWeight:600, cursor:'pointer' }}>🗑</button>
            </div>
          </Card>
        ))}
      </div>

      {editing && (
        <div onClick={()=>!saving && setEditing(null)} style={{ position:'fixed', inset:0, background:'rgba(10,22,32,0.55)', zIndex:80, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', width:'100%', maxWidth:430, borderRadius:'18px 18px 0 0', padding:'18px 18px 22px', maxHeight:'88vh', overflowY:'auto', animation:'popIn 0.18s ease-out' }}>
            <div style={{ width:38, height:4, borderRadius:2, background:'#e5e7eb', margin:'0 auto 14px' }}/>
            <h2 style={{ margin:'0 0 14px', fontSize:17, fontWeight:700, color:C.navy }}>{editing==='new' ? 'Nova morada' : 'Editar morada'}</h2>
            <FiscalInput label="Label (Casa, Escritório, ...)" value={form.label} onChange={v=>setForm(f=>({...f,label:v}))}/>
            <FiscalInput label="Morada" value={form.morada} onChange={v=>setForm(f=>({...f,morada:v}))}/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:10 }}>
              <FiscalInput label="Código postal" value={form.cp} onChange={v=>setForm(f=>({...f,cp:v}))}/>
              <FiscalInput label="Localidade" value={form.cidade} onChange={v=>setForm(f=>({...f,cidade:v}))}/>
            </div>
            <FiscalInput label="Tipologia (T2, Moradia, ...)" value={form.tipologia} onChange={v=>setForm(f=>({...f,tipologia:v}))}/>
            <FiscalInput label="Notas de acesso (porteiro, código)" value={form.notas_acesso} onChange={v=>setForm(f=>({...f,notas_acesso:v}))}/>
            <label style={{ display:'flex', alignItems:'center', gap:8, marginTop:4, marginBottom:14, cursor:'pointer' }}>
              <input type="checkbox" checked={!!form.is_default} onChange={e=>setForm(f=>({...f,is_default:e.target.checked}))}/>
              <span style={{ fontSize:13, color:C.navy }}>Usar como morada default</span>
            </label>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setEditing(null)} disabled={saving} style={{ flex:1, padding:'11px 14px', borderRadius:10, border:`1px solid ${C.border}`, background:C.white, color:C.slate, fontWeight:600, fontSize:13, cursor:saving?'default':'pointer' }}>Cancelar</button>
              <button onClick={save} disabled={saving} style={{ flex:2, padding:'11px 14px', borderRadius:10, border:'none', background:C.g, color:'#fff', fontWeight:700, fontSize:13, cursor:saving?'default':'pointer', opacity:saving?0.6:1 }}>{saving?'A guardar…':'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════
   MÓDULO CASA — Fase 3 (v5-casa)
   Paleta da Casa (verde 1B4332) vive aqui, isolada do resto do app.
══════════════════════════════════ */
const CASA = {
  green:"#1B4332", greenMid:"#2D6A4F", greenLt:"#52B788", greenXl:"#D8F3DC",
  amber:"#854F0B", amberLt:"#FAEEDA", red:"#A32D2D", redLt:"#FCEBEB",
  border:"#e5e5e3", bg:"#f5f5f3",
}

// Mapa categoria BD → label humano
const CASA_CAT_LABELS = {
  aquecimento:'Aquecimento', climatizacao:'Climatização', aguas_quentes:'Águas Quentes',
  canalizacao:'Canalização', eletrica:'Eléctrica', cobertura:'Cobertura',
  estrutura:'Estrutura', piscina:'Piscina', solar:'Solar',
  elevador:'Elevador', gerador:'Gerador', outros:'Outros',
}

/* EquipamentoFicha — detalhe com 4 tabs + edição (Fase 3.3) */
function EquipamentoFicha({ equipamento, authUser, onBack, onUpdated, onDeleted, onAskAI }){
  const [tab, setTab] = useState('detalhes')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null) // 'abater' | 'apagar' | null
  const [intervencoes, setIntervencoes] = useState(null)
  const [documentos, setDocumentos] = useState(null)
  const [tecnicoHabitual, setTecnicoHabitual] = useState(null)
  const [registarOpen, setRegistarOpen] = useState(false)
  const [rForm, setRForm] = useState({ tipo:'revisao', descricao:'', data: new Date().toISOString().slice(0,10), duracao_min:'', custo_total:'', notas_tecnico:'' })
  const [rSaving, setRSaving] = useState(false)
  const [rSuccess, setRSuccess] = useState(false)
  const [filtroDoc, setFiltroDoc] = useState('todos')
  const [uploadDocOpen, setUploadDocOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uForm, setUForm] = useState({ tipo:'fatura', nome:'', data_documento:'', valido_ate:'', valor:'', file:null })
  const [docMenuId, setDocMenuId] = useState(null)
  const fileDocRef = useRef(null)

  useEffect(() => {
    if(!equipamento) return
    setForm({
      nome:              equipamento.nome || '',
      marca:             equipamento.marca || '',
      modelo:            equipamento.modelo || '',
      numero_serie:      equipamento.numero_serie || '',
      localizacao_imovel: equipamento.localizacao_imovel || '',
      data_instalacao:   equipamento.data_instalacao || '',
      data_garantia_fim: equipamento.data_garantia_fim || '',
      potencia_kw:       equipamento.potencia_kw ?? '',
      classe_energetica: equipamento.classe_energetica || '',
      notas:             equipamento.notas || '',
    })
  }, [equipamento?.id])

  // Fetch intervenções + documentos associados ao equipamento
  useEffect(() => {
    if(!equipamento?.id) return
    let active = true
    Promise.all([
      sbGetV5('intervencoes_equipamento', `?equipamento_id=eq.${equipamento.id}&order=data.desc`, authUser?.token),
      sbGetV5('documentos',              `?equipamento_id=eq.${equipamento.id}&order=created_at.desc`, authUser?.token),
    ]).then(([intv, docs]) => {
      if(!active) return
      setIntervencoes(intv || [])
      setDocumentos(docs || [])
    })
    // Fetch técnico habitual se houver
    if(equipamento.tecnico_habitual_id){
      sbGetV5('prestadores', `?id=eq.${equipamento.tecnico_habitual_id}&select=*`, authUser?.token).then(rows => {
        if(active) setTecnicoHabitual(Array.isArray(rows) ? rows[0] : null)
      })
    }
    return () => { active = false }
  }, [equipamento?.id, authUser?.token])

  if(!equipamento) return null

  const registarIntervencao = async () => {
    if(!rForm.descricao.trim()) return
    setRSaving(true)
    const payload = {
      equipamento_id: equipamento.id,
      tipo:           rForm.tipo,
      descricao:      rForm.descricao.trim(),
      data:           rForm.data || new Date().toISOString().slice(0,10),
      duracao_min:    rForm.duracao_min !== '' ? Number(rForm.duracao_min) : null,
      custo_total:    rForm.custo_total !== '' ? Number(rForm.custo_total) : null,
      notas_tecnico:  rForm.notas_tecnico.trim() || null,
    }
    const rows = await sbSaveV5('intervencoes_equipamento', payload, authUser?.token)
    if(!rows) { setRSaving(false); alert('Erro ao registar. Ver consola.'); return }
    const nova = Array.isArray(rows) ? rows[0] : rows
    // +50 pontos
    const pessoaId = authUser?.user?.id || DEMO_PESSOA_ID
    await sbSaveV5('pontos_historico', { pessoa_id: pessoaId, pontos: 50, motivo: 'Registou intervenção em equipamento', ref_tipo: 'intervencao', ref_id: nova?.id }, authUser?.token)
    // recarregar timeline
    const updated = await sbGetV5('intervencoes_equipamento', `?equipamento_id=eq.${equipamento.id}&order=data.desc`, authUser?.token)
    setIntervencoes(updated || [])
    setRSaving(false)
    setRSuccess(true)
    setTimeout(() => { setRSuccess(false); setRegistarOpen(false); setRForm({ tipo:'revisao', descricao:'', data: new Date().toISOString().slice(0,10), duracao_min:'', custo_total:'', notas_tecnico:'' }) }, 1200)
  }

  const save = async () => {
    setSaving(true)
    const payload = {
      nome:              form.nome.trim(),
      marca:             form.marca.trim() || null,
      modelo:            form.modelo.trim() || null,
      numero_serie:      form.numero_serie.trim() || null,
      localizacao_imovel: form.localizacao_imovel.trim() || null,
      data_instalacao:   form.data_instalacao || null,
      data_garantia_fim: form.data_garantia_fim || null,
      potencia_kw:       form.potencia_kw === '' ? null : Number(form.potencia_kw),
      classe_energetica: form.classe_energetica || null,
      notas:             form.notas.trim() || null,
      updated_at:        new Date().toISOString(),
    }
    const r = await sbUpdateV5('equipamentos', `?id=eq.${equipamento.id}`, payload, authUser?.token)
    setSaving(false)
    if(!r){ alert('Erro ao guardar. Ver consola.'); return }
    setEditing(false)
    onUpdated?.(Array.isArray(r) ? r[0] : r)
  }

  const doAbater = async () => {
    const r = await sbUpdateV5('equipamentos', `?id=eq.${equipamento.id}`, { estado:'abatido', updated_at:new Date().toISOString() }, authUser?.token)
    setConfirmAction(null)
    if(!r){ alert('Erro ao abater.'); return }
    onDeleted?.(equipamento.id)
  }
  const doApagar = async () => {
    const r = await sbUpdateV5('equipamentos', `?id=eq.${equipamento.id}`, { estado:'apagado', updated_at:new Date().toISOString() }, authUser?.token)
    setConfirmAction(null)
    if(!r){ alert('Erro ao apagar.'); return }
    onDeleted?.(equipamento.id)
  }

  const uploadDoc = async () => {
    if(!uForm.file){ alert('Escolha um ficheiro primeiro.'); return }
    if(uForm.file.size > 52428800){ alert('Ficheiro demasiado grande. Máximo 50MB.'); return }
    if(!uForm.nome.trim()){ alert('Dê um nome ao documento.'); return }
    setUploading(true)
    const pessoaId = authUser?.user?.id || DEMO_PESSOA_ID
    const locId = equipamento.localizacao_id
    const ext = (uForm.file.name.split('.').pop() || 'bin').toLowerCase()
    const safeName = uForm.nome.trim().replace(/[^a-zA-Z0-9._-]+/g,'-').slice(0,60)
    const path = `${pessoaId}/${locId}/${uForm.tipo}/${Date.now()}-${safeName}.${ext}`
    const url = await sbUpload('v5-casa-docs', path, uForm.file, authUser?.token)
    if(!url){ alert('Erro de upload. Verifica a consola.'); setUploading(false); return }
    const payload = {
      equipamento_id: equipamento.id,
      localizacao_id: locId,
      organization_id: DEMO_ORGANIZATION_ID,
      tipo: uForm.tipo,
      nome: uForm.nome.trim(),
      url,
      storage_path: path,
      mime_type: uForm.file.type || null,
      tamanho_bytes: uForm.file.size,
      data_documento: uForm.data_documento || null,
      valido_ate: uForm.valido_ate || null,
      valor_euros: uForm.valor === '' ? null : Number(uForm.valor),
    }
    const r = await sbSaveV5('documentos', payload, authUser?.token)
    if(!r){
      console.warn('[uploadDoc] INSERT falhou após upload. Orphan file:', path) // TODO(mario): cleanup job
      alert('Upload feito mas erro a registar. Ver consola.')
      setUploading(false)
      return
    }
    const newDoc = Array.isArray(r) ? r[0] : r
    const docsReaisEsteMes = (documentos||[]).filter(d => d.storage_path && d.created_at &&
      new Date(d.created_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length
    if(docsReaisEsteMes < 10){
      await sbSaveV5('pontos_historico', { pessoa_id: pessoaId, pontos: 30, motivo: 'Upload de documento de equipamento', ref_tipo: 'documento', ref_id: newDoc?.id }, authUser?.token)
    }
    setUploading(false)
    setUploadDocOpen(false)
    setUForm({ tipo:'fatura', nome:'', data_documento:'', valido_ate:'', valor:'', file:null })
    const updated = await sbGetV5('documentos', `?equipamento_id=eq.${equipamento.id}&order=created_at.desc`, authUser?.token)
    setDocumentos(updated || [])
  }

  const deleteDoc = async (d) => {
    if(!window.confirm(`Apagar "${d.nome}"? Esta acção não pode ser revertida.`)) return
    setDocMenuId(null)
    if(d.storage_path) await sbDeleteStorage('v5-casa-docs', d.storage_path, authUser?.token)
    await sbDeleteV5('documentos', `?id=eq.${d.id}`, authUser?.token)
    setDocumentos(prev => (prev||[]).filter(x => x.id !== d.id))
  }

  // Helpers de formatação
  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('pt-PT', { month:'short', year:'numeric' }) : '—'
  const garantiaExpirada = equipamento.data_garantia_fim && new Date(equipamento.data_garantia_fim) < new Date()
  const healthAmber = equipamento.health_score != null && equipamento.health_score < 75
  const CATLABEL = CASA_CAT_LABELS[equipamento.categoria] || equipamento.categoria

  // Recomendação IA (mock deterministic até Fase 3.5)
  const recomendacao = (() => {
    const ef = equipamento.eficiencia_estimada
    const hs = equipamento.health_score
    if(hs != null && hs < 50) return 'Health Score crítico — recomenda-se inspecção imediata. Intervenção preventiva evita custos 3-4× maiores.'
    if(garantiaExpirada) return 'Garantia do fabricante expirada. Considere contrato de manutenção anual para cobrir custos de peças.'
    if(ef != null && ef < 85) return `Eficiência estimada ~${ef}% (ideal 94%+). Limpeza/calibração recupera 5-10% imediatamente. Avaliar substituição por modelo A-rated em 1-2 anos.`
    return 'Equipamento em condições adequadas. Manter revisões anuais conforme plano do fabricante.'
  })()

  const tabs = ['Detalhes','Intervenções','Documentos','Fornecedor']

  return (
    <div style={{ minHeight:'100vh', background:CASA.bg, paddingBottom:88 }}>
      {/* HEADER */}
      <div style={{ background:CASA.green, padding:'12px 14px 14px', color:'#fff' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', padding:0, fontSize:10, color:'rgba(255,255,255,0.7)', cursor:'pointer', marginBottom:4 }}>← A minha casa</button>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{equipamento.nome}</div>
            <div style={{ fontSize:11, opacity:0.75, marginTop:2 }}>{CATLABEL}{equipamento.localizacao_imovel ? ` · ${equipamento.localizacao_imovel}` : ''}</div>
          </div>
          <button onClick={()=>{ if(editing){ save() } else { setEditing(true) } }} disabled={saving} style={{
            background:'rgba(255,255,255,0.2)', border:'none', borderRadius:8, padding:'5px 11px',
            fontSize:11, color:'#fff', cursor:saving?'default':'pointer', fontWeight:600, flexShrink:0,
          }}>{saving ? 'A guardar…' : editing ? '✓ Guardar' : '✎ Editar'}</button>
        </div>
        {healthAmber && !editing && (
          <div style={{ marginTop:8, display:'inline-flex', alignItems:'center', gap:6, background:'rgba(250,199,117,0.25)', border:'1px solid rgba(250,199,117,0.5)', borderRadius:12, padding:'4px 10px', fontSize:10 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#FAC775' }}/> Health Score {equipamento.health_score}/100
          </div>
        )}
      </div>

      {/* TABS */}
      <div style={{ display:'flex', borderBottom:`1px solid ${CASA.border}`, background:'#fff' }}>
        {tabs.map(t => {
          const k = t.toLowerCase().replace('ç','c').replace('õ','o')
          const on = tab === k
          return (
            <button key={t} onClick={()=>setTab(k)} style={{
              flex:1, padding:'9px 2px', textAlign:'center', fontSize:10.5, cursor:'pointer',
              color: on ? CASA.greenLt : '#999', fontWeight: on ? 700 : 400,
              borderBottom:`2px solid ${on ? CASA.greenLt : 'transparent'}`,
              background:'none', border:'none',
            }}>{t}</button>
          )
        })}
      </div>

      {/* TAB DETALHES */}
      {tab==='detalhes' && !editing && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>
            {[
              ['Instalação',       fmtDate(equipamento.data_instalacao),       false],
              ['Garantia',         fmtDate(equipamento.data_garantia_fim) + (garantiaExpirada ? ' ✕' : ''), garantiaExpirada],
              ['Última revisão',   fmtDate(equipamento.data_ultima_revisao),   false],
              ['Técnico habitual', tecnicoHabitual?.nome || '—',               false],
              ['Consumo/mês',      equipamento.consumo_estimado_kwh_mes ? `${equipamento.consumo_estimado_kwh_mes}kWh` : '—', false],
              ['Health Score',     (equipamento.health_score ?? '—') + ' / 100', healthAmber],
              ['Classe energética', equipamento.classe_energetica || '—',      ['C','D','E','F','G'].includes(equipamento.classe_energetica)],
              ['Potência nominal', equipamento.potencia_kw ? `${equipamento.potencia_kw} kW` : '—', false],
            ].map(([l,v,w],i) => (
              <div key={l} style={{ padding:'9px 12px', borderRight:i%2===0?`1px solid ${CASA.border}`:'none', borderBottom:`1px solid ${CASA.border}` }}>
                <div style={{ fontSize:9, color:'#999', textTransform:'uppercase', letterSpacing:0.3, marginBottom:2 }}>{l}</div>
                <div style={{ fontSize:12, fontWeight:600, color: w ? CASA.amber : '#111' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ margin:'10px 12px', background:CASA.amberLt, borderRadius:11, padding:'10px 12px', border:'1px solid #EF9F27' }}>
            <div style={{ fontSize:11, fontWeight:700, color:CASA.amber, marginBottom:4 }}>✨ Recomendação IA</div>
            <div style={{ fontSize:11, color:CASA.amber, lineHeight:1.55 }}>{recomendacao}</div>
          </div>
          <div style={{ display:'flex', gap:8, padding:'0 12px 14px' }}>
            <button onClick={()=>onAskAI?.({ context:{ titulo:`Pedir orçamento para revisão de ${equipamento.nome}`, desc:`Categoria ${CATLABEL}. Qual técnico e quando agendar?` }})} style={{ flex:2, padding:12, borderRadius:11, border:'none', background:CASA.greenLt, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>Agendar revisão ↗</button>
            <button onClick={()=>onAskAI?.({ context:{ titulo:`Dúvidas sobre ${equipamento.nome}`, desc:`Manutenção e consumo do modelo ${equipamento.modelo||'—'}` }})} style={{ flex:1, padding:12, borderRadius:11, border:`1px solid ${CASA.border}`, background:CASA.bg, fontSize:13, cursor:'pointer' }}>AI Expert</button>
          </div>
        </div>
      )}

      {tab==='detalhes' && editing && (
        <div style={{ padding:12, display:'flex', flexDirection:'column', gap:10 }}>
          {[
            ['Nome',               'nome',              'text'],
            ['Marca',              'marca',             'text'],
            ['Modelo',             'modelo',            'text'],
            ['Número de série',    'numero_serie',      'text'],
            ['Localização',        'localizacao_imovel','text'],
            ['Data instalação',    'data_instalacao',   'date'],
            ['Fim da garantia',    'data_garantia_fim', 'date'],
            ['Potência (kW)',      'potencia_kw',       'number'],
          ].map(([label, key, type]) => (
            <div key={key}>
              <div style={{ fontSize:9, color:'#999', textTransform:'uppercase', letterSpacing:0.3, marginBottom:4 }}>{label}</div>
              <input type={type} value={form[key] ?? ''} onChange={e=>setForm(p=>({...p, [key]:e.target.value}))}
                style={{ width:'100%', boxSizing:'border-box', padding:'8px 11px', borderRadius:9, border:`1px solid ${CASA.border}`, fontSize:12, background:'#fafafa', outline:'none' }}/>
            </div>
          ))}
          <div>
            <div style={{ fontSize:9, color:'#999', textTransform:'uppercase', letterSpacing:0.3, marginBottom:6 }}>Classe energética</div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {['A+++','A++','A+','A','B','C','D'].map(cl => {
                const on = form.classe_energetica === cl
                const good = ['A+++','A++','A+','A'].includes(cl)
                const bad  = ['C','D'].includes(cl)
                return (
                  <button key={cl} onClick={()=>setForm(p=>({...p, classe_energetica: on ? '' : cl}))} style={{
                    padding:'6px 12px', borderRadius:9, fontSize:11, fontWeight:700, cursor:'pointer',
                    border:`2px solid ${on?CASA.greenLt:CASA.border}`, background: on?CASA.greenLt:CASA.bg,
                    color: on?'#fff' : good?CASA.green : bad?CASA.red : '#111',
                  }}>{cl}</button>
                )
              })}
            </div>
          </div>
          <div>
            <div style={{ fontSize:9, color:'#999', textTransform:'uppercase', letterSpacing:0.3, marginBottom:4 }}>Notas</div>
            <textarea value={form.notas || ''} onChange={e=>setForm(p=>({...p, notas:e.target.value}))} rows={3}
              style={{ width:'100%', boxSizing:'border-box', padding:'8px 11px', borderRadius:9, border:`1px solid ${CASA.border}`, fontSize:12, background:'#fafafa', outline:'none', fontFamily:'inherit' }}/>
          </div>
          <div style={{ borderTop:`1px solid ${CASA.border}`, paddingTop:12, marginTop:4 }}>
            <div style={{ fontSize:9, color:'#999', textTransform:'uppercase', letterSpacing:0.3, marginBottom:8 }}>Ações de gestão</div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setConfirmAction('abater')} style={{ flex:1, padding:10, borderRadius:11, border:'1px solid #EF9F27', background:CASA.amberLt, cursor:'pointer', textAlign:'center' }}>
                <div style={{ fontSize:22, marginBottom:3 }}>📦</div>
                <div style={{ fontSize:12, fontWeight:700, color:CASA.amber }}>Abater</div>
                <div style={{ fontSize:9, color:CASA.amber, marginTop:2 }}>Manter histórico</div>
              </button>
              <button onClick={()=>setConfirmAction('apagar')} style={{ flex:1, padding:10, borderRadius:11, border:'1px solid #F9BABA', background:CASA.redLt, cursor:'pointer', textAlign:'center' }}>
                <div style={{ fontSize:22, marginBottom:3 }}>🗑️</div>
                <div style={{ fontSize:12, fontWeight:700, color:CASA.red }}>Apagar</div>
                <div style={{ fontSize:9, color:CASA.red, marginTop:2 }}>Permanente</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB INTERVENÇÕES */}
      {tab==='intervencoes' && (
        <div style={{ padding:'8px 12px' }}>
          {intervencoes === null && <div className="sk" style={{ height:60, marginBottom:8 }}/>}
          {intervencoes && intervencoes.length === 0 && (
            <div style={{ padding:'28px 14px', textAlign:'center', color:'#666', fontSize:12, lineHeight:1.55 }}>
              Sem intervenções registadas.<br/>Quando um técnico atende este equipamento, a intervenção aparece aqui.
            </div>
          )}
          {intervencoes && intervencoes.map((iv,i,arr) => {
            const isNew = iv.data && (Date.now() - new Date(iv.data).getTime()) < 180*86400000
            return (
              <div key={iv.id} style={{ display:'flex', gap:9, padding:'10px 0', borderBottom:i<arr.length-1?`1px solid ${CASA.border}`:'none' }}>
                <div style={{ width:9, height:9, borderRadius:'50%', flexShrink:0, marginTop:3, background: isNew ? CASA.greenLt : '#ccc' }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:10, color:'#999' }}>{iv.data ? new Date(iv.data).toLocaleDateString('pt-PT') : '—'}</div>
                  <div style={{ fontSize:12, fontWeight:600, marginTop:1 }}>{iv.descricao}</div>
                  <div style={{ fontSize:10, color:'#555', marginTop:2 }}>
                    {iv.tipo}{iv.duracao_min ? ` · ${iv.duracao_min}min` : ''}{iv.custo_total != null ? ` · €${Number(iv.custo_total).toFixed(2)}` : ''}
                  </div>
                </div>
              </div>
            )
          })}
          <button onClick={()=>setRegistarOpen(true)} style={{
            width:'100%', marginTop:10, padding:11, borderRadius:11, border:`1px dashed ${CASA.border}`,
            background:CASA.bg, color:CASA.greenLt, fontSize:12, fontWeight:700, cursor:'pointer',
          }}>+ Registar nova intervenção</button>
        </div>
      )}

      {/* TAB DOCUMENTOS */}
      {tab==='documentos' && (
        <div onClick={()=>docMenuId && setDocMenuId(null)}>
          {/* Filter chips */}
          <div className="cc-no-scrollbar" style={{ display:'flex', gap:6, overflowX:'auto', padding:'8px 12px', borderBottom:`1px solid ${CASA.border}` }}>
            {DOC_TIPOS.map(t => {
              const n = t.id==='todos' ? (documentos||[]).length : (documentos||[]).filter(d=>d.tipo===t.id).length
              const on = filtroDoc === t.id
              return (
                <button key={t.id} onClick={()=>setFiltroDoc(t.id)} style={{
                  flexShrink:0, padding:'5px 10px', borderRadius:14, fontSize:10, cursor:'pointer',
                  border:`1px solid ${on?CASA.greenLt:CASA.border}`,
                  background: on?CASA.greenXl:'#fff',
                  color: on?CASA.green:'#555', fontWeight: on?700:400, whiteSpace:'nowrap',
                }}>{t.label}{n>0 ? ` (${n})` : ''}</button>
              )
            })}
          </div>

          {/* Lista */}
          {documentos === null && <div className="sk" style={{ height:60, margin:12 }}/>}
          {documentos && (() => {
            const filtered = documentos.filter(d => filtroDoc==='todos' || d.tipo===filtroDoc)
            if(filtered.length === 0) return (
              <div style={{ padding:'28px 20px', textAlign:'center', color:'#666', fontSize:12, lineHeight:1.6 }}>
                {documentos.length === 0
                  ? <><strong>Sem documentos</strong><br/>Adiciona o primeiro e ganha +30 pts (até 300 pts/mês).</>
                  : `Sem documentos do tipo ${DOC_TIPO_META[filtroDoc]?.label || filtroDoc}.`}
              </div>
            )
            return filtered.map(d => {
              const m = DOC_TIPO_META[d.tipo] || DOC_TIPO_META.outro
              const isPlaceholder = !d.storage_path
              const menuOpen = docMenuId === d.id
              return (
                <div key={d.id} style={{ position:'relative', display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderBottom:`1px solid ${CASA.border}`, opacity: isPlaceholder ? 0.55 : 1 }}>
                  <div style={{ width:36, height:36, borderRadius:9, background:m.bg, display:'grid', placeItems:'center', fontSize:18, flexShrink:0 }}>{m.ic}</div>
                  <div onClick={()=>{ if(!isPlaceholder) window.open(d.url,'_blank') }}
                    style={{ flex:1, minWidth:0, cursor: isPlaceholder?'default':'pointer' }}>
                    <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.nome}</div>
                    <div style={{ fontSize:10, color:'#999', marginTop:1 }}>
                      {m.label}
                      {d.tamanho_bytes ? ` · ${(d.tamanho_bytes/1024/1024).toFixed(1)} MB` : ''}
                      {d.data_documento ? ` · ${new Date(d.data_documento).toLocaleDateString('pt-PT',{month:'short',year:'numeric'})}` : ''}
                      {isPlaceholder ? ' · ficheiro demo' : ''}
                    </div>
                  </div>
                  {!isPlaceholder && (
                    <div style={{ position:'relative' }}>
                      <button onClick={e=>{e.stopPropagation(); setDocMenuId(menuOpen?null:d.id)}}
                        style={{ background:'none', border:'none', padding:'4px 8px', cursor:'pointer', fontSize:16, color:'#aaa', lineHeight:1 }}>•••</button>
                      {menuOpen && (
                        <div onClick={e=>e.stopPropagation()} style={{ position:'absolute', right:0, top:'110%', background:'#fff', border:`1px solid ${CASA.border}`, borderRadius:10, padding:4, zIndex:50, minWidth:130, boxShadow:'0 4px 16px -4px rgba(0,0,0,0.12)' }}>
                          <button onClick={()=>{ window.open(d.url,'_blank'); setDocMenuId(null) }}
                            style={{ display:'block', width:'100%', textAlign:'left', padding:'8px 12px', fontSize:12, background:'none', border:'none', cursor:'pointer', borderRadius:7, color:'#111' }}>⬇ Download</button>
                          <button onClick={()=>deleteDoc(d)}
                            style={{ display:'block', width:'100%', textAlign:'left', padding:'8px 12px', fontSize:12, background:'none', border:'none', cursor:'pointer', borderRadius:7, color:CASA.red }}>🗑 Apagar</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          })()}

          <button onClick={()=>setUploadDocOpen(true)} style={{
            width:'calc(100% - 24px)', margin:12, padding:12, borderRadius:11, border:'none',
            background:CASA.greenLt, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer',
          }}>+ Novo documento</button>
        </div>
      )}

      {/* TAB FORNECEDOR */}
      {tab==='fornecedor' && (
        <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:10 }}>
          <FornecedorCard icon="🏭" title="Fabricante" rows={[
            ['Marca',      equipamento.marca  || '—'],
            ['Modelo',     equipamento.modelo || '—'],
            ['Instalação', fmtDate(equipamento.data_instalacao)],
            ['Garantia',   fmtDate(equipamento.data_garantia_fim) + (garantiaExpirada ? ' ✕' : (equipamento.data_garantia_fim && new Date(equipamento.data_garantia_fim) < new Date(Date.now()+90*86400000) ? ' ⚠️' : ''))],
          ]} cta={{ label:'🔍 Site do fabricante', onClick:()=>window.open(`https://www.google.com/search?q=${encodeURIComponent((equipamento.marca||'')+' '+(equipamento.modelo||''))}`, '_blank') }}/>
          <FornecedorCard icon="🔧" title="Técnico habitual" rows={tecnicoHabitual ? [
            ['Nome',      tecnicoHabitual.nome || '—'],
            ['Contacto',  tecnicoHabitual.telefone || tecnicoHabitual.tel || '—'],
            ['Email',     tecnicoHabitual.email || '—'],
          ] : [['Sem técnico atribuído','Será atribuído no próximo pedido']]}
          cta={tecnicoHabitual
            ? { label:'📅 Agendar revisão', onClick:()=>alert('Agendamento disponível na Fase 3.6.') }
            : { label:'+ Atribuir técnico', onClick:()=>alert('Lista de prestadores disponível em fase futura.') }}/>
          <FornecedorCard icon="🔩" title="Peças e consumíveis" rows={PECAS_COMPAT[equipamento.marca?.toLowerCase?.()] || [['Catálogo indisponível','Peças surgirão após intervenções']]}
          cta={{ label:'🛒 Comprar peças', onClick:()=>alert('Marketplace de peças disponível em fase futura.') }}/>
        </div>
      )}

      {/* MODAL REGISTAR INTERVENÇÃO */}
      {registarOpen && (
        <div onClick={()=>setRegistarOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:'18px 18px 0 0', padding:'20px 18px 28px', width:'100%', maxWidth:400 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>Registar intervenção</div>
              <button onClick={()=>setRegistarOpen(false)} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'#999' }}>✕</button>
            </div>

            {/* Tipo */}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:9, color:'#999', textTransform:'uppercase', letterSpacing:0.3, marginBottom:6 }}>Tipo</div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {[['revisao','🔍 Revisão'],['reparacao','🔧 Reparação'],['substituicao','🔄 Substituição'],['inspecao','📋 Inspecção'],['instalacao','🏗️ Instalação']].map(([v,l]) => {
                  const on = rForm.tipo === v
                  return <button key={v} onClick={()=>setRForm(p=>({...p, tipo:v}))} style={{ padding:'5px 10px', borderRadius:9, fontSize:10.5, fontWeight:600, cursor:'pointer', border:`2px solid ${on?CASA.greenLt:CASA.border}`, background:on?CASA.greenLt:CASA.bg, color:on?'#fff':'#555' }}>{l}</button>
                })}
              </div>
            </div>

            {/* Descrição */}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:9, color:'#999', textTransform:'uppercase', letterSpacing:0.3, marginBottom:4 }}>Descrição *</div>
              <textarea value={rForm.descricao} onChange={e=>setRForm(p=>({...p, descricao:e.target.value}))} rows={3} placeholder="O que foi feito…"
                style={{ width:'100%', boxSizing:'border-box', padding:'8px 11px', borderRadius:9, border:`1px solid ${rForm.descricao.trim()?CASA.border:'#EF4444'}`, fontSize:12, background:'#fafafa', outline:'none', fontFamily:'inherit', resize:'none' }}/>
            </div>

            {/* Data + Duração + Custo */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
              {[['Data','data','date',rForm.data],['Duração (min)','duracao_min','number',rForm.duracao_min],['Custo (€)','custo_total','number',rForm.custo_total]].map(([l,k,t,v]) => (
                <div key={k}>
                  <div style={{ fontSize:9, color:'#999', textTransform:'uppercase', letterSpacing:0.3, marginBottom:4 }}>{l}</div>
                  <input type={t} value={v} onChange={e=>setRForm(p=>({...p,[k]:e.target.value}))} min={t==='number'?0:undefined}
                    style={{ width:'100%', boxSizing:'border-box', padding:'7px 9px', borderRadius:9, border:`1px solid ${CASA.border}`, fontSize:11, background:'#fafafa', outline:'none' }}/>
                </div>
              ))}
            </div>

            {/* Notas técnico */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:9, color:'#999', textTransform:'uppercase', letterSpacing:0.3, marginBottom:4 }}>Notas técnico (opcional)</div>
              <input type="text" value={rForm.notas_tecnico} onChange={e=>setRForm(p=>({...p,notas_tecnico:e.target.value}))} placeholder="Observações internas…"
                style={{ width:'100%', boxSizing:'border-box', padding:'7px 11px', borderRadius:9, border:`1px solid ${CASA.border}`, fontSize:12, background:'#fafafa', outline:'none' }}/>
            </div>

            <button onClick={registarIntervencao} disabled={rSaving || !rForm.descricao.trim()} style={{
              width:'100%', padding:13, borderRadius:11, border:'none',
              background: rSuccess ? '#22C55E' : (rSaving || !rForm.descricao.trim()) ? '#ccc' : CASA.greenLt,
              color:'#fff', fontSize:13, fontWeight:700, cursor: (rSaving || !rForm.descricao.trim()) ? 'default' : 'pointer',
            }}>
              {rSuccess ? '✓ Registado  +50 pts' : rSaving ? 'A registar…' : 'Registar intervenção'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL UPLOAD DOCUMENTO */}
      {uploadDocOpen && (
        <div onClick={()=>!uploading && setUploadDocOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', width:'100%', maxWidth:430, borderRadius:'18px 18px 0 0', padding:'18px 18px 28px', maxHeight:'90vh', overflowY:'auto', animation:'popIn 0.18s ease-out' }}>
            <div style={{ width:38, height:4, borderRadius:2, background:'#e5e7eb', margin:'0 auto 14px' }}/>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div style={{ fontSize:15, fontWeight:700 }}>Novo documento</div>
              <button onClick={()=>setUploadDocOpen(false)} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'#999' }}>✕</button>
            </div>

            <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Tipo</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:14 }}>
              {DOC_TIPOS.filter(t=>t.id!=='todos').map(t => {
                const on = uForm.tipo === t.id
                return (
                  <button key={t.id} onClick={()=>setUForm(p=>({...p, tipo:t.id}))} style={{
                    padding:'7px 4px', borderRadius:9, cursor:'pointer',
                    border:`1.5px solid ${on?CASA.greenLt:CASA.border}`,
                    background: on?CASA.greenXl:'#fff',
                    fontSize:10, color:'#111', fontWeight:600, textAlign:'center',
                  }}>
                    <div style={{ fontSize:16, marginBottom:2 }}>{t.ic}</div>
                    {t.label}
                  </button>
                )
              })}
            </div>

            <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>Ficheiro *</div>
            <input ref={fileDocRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={e=>{
                const f = e.target.files?.[0] || null
                setUForm(p=>({ ...p, file:f, nome: p.nome || (f ? f.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ') : '') }))
              }}
              style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px', borderRadius:8, border:`1px solid ${CASA.border}`, fontSize:12, background:'#fff', marginBottom:10 }}/>

            <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>Nome *</div>
            <input value={uForm.nome} onChange={e=>setUForm(p=>({...p, nome:e.target.value}))}
              style={{ width:'100%', boxSizing:'border-box', padding:'9px 12px', borderRadius:8, border:`1px solid ${CASA.border}`, fontSize:13, outline:'none', marginBottom:10 }}
              placeholder="Ex: Fatura revisão caldeira jan 2026"/>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
              <div>
                <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>Data doc.</div>
                <input type="date" value={uForm.data_documento} onChange={e=>setUForm(p=>({...p, data_documento:e.target.value}))}
                  style={{ width:'100%', boxSizing:'border-box', padding:'8px 8px', borderRadius:8, border:`1px solid ${CASA.border}`, fontSize:12, outline:'none' }}/>
              </div>
              <div>
                <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>Válido até</div>
                <input type="date" value={uForm.valido_ate} onChange={e=>setUForm(p=>({...p, valido_ate:e.target.value}))}
                  style={{ width:'100%', boxSizing:'border-box', padding:'8px 8px', borderRadius:8, border:`1px solid ${CASA.border}`, fontSize:12, outline:'none' }}/>
              </div>
              <div>
                <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>Valor (€)</div>
                <input type="number" min="0" step="0.01" value={uForm.valor} onChange={e=>setUForm(p=>({...p, valor:e.target.value}))}
                  style={{ width:'100%', boxSizing:'border-box', padding:'8px 8px', borderRadius:8, border:`1px solid ${CASA.border}`, fontSize:12, outline:'none' }}
                  placeholder="0.00"/>
              </div>
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setUploadDocOpen(false)} disabled={uploading} style={{ flex:1, padding:'11px 14px', borderRadius:10, border:`1px solid ${CASA.border}`, background:'#fff', color:'#555', fontWeight:600, fontSize:13, cursor:uploading?'default':'pointer' }}>Cancelar</button>
              <button onClick={uploadDoc} disabled={uploading || !uForm.file || !uForm.nome.trim()} style={{
                flex:2, padding:'11px 14px', borderRadius:10, border:'none',
                background: uploading||!uForm.file||!uForm.nome.trim() ? CASA.border : CASA.greenLt,
                color:'#fff', fontWeight:700, fontSize:13, cursor: uploading||!uForm.file||!uForm.nome.trim() ? 'default':'pointer',
              }}>
                {uploading ? 'A enviar…' : 'Enviar  +30 pts'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO ABATER / APAGAR */}
      {confirmAction && (
        <div onClick={()=>setConfirmAction(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:'18px 18px 0 0', padding:'22px 18px 28px', width:'100%', maxWidth:400, animation:'popIn 0.18s ease-out' }}>
            <div style={{ fontSize:28, textAlign:'center', marginBottom:8 }}>{confirmAction==='apagar'?'🗑️':'📦'}</div>
            <div style={{ fontSize:15, fontWeight:700, textAlign:'center', marginBottom:6 }}>
              {confirmAction==='apagar' ? 'Apagar equipamento?' : 'Abater equipamento?'}
            </div>
            <div style={{ fontSize:12, color:'#555', textAlign:'center', lineHeight:1.6, marginBottom:18 }}>
              {confirmAction==='apagar'
                ? 'Remove permanentemente. Não pode ser revertido.'
                : 'Fica inativo mas mantém histórico e documentos.'}
            </div>
            <div style={{ display:'flex', gap:9 }}>
              <button onClick={()=>setConfirmAction(null)} style={{ flex:1, padding:12, borderRadius:11, border:`1px solid ${CASA.border}`, background:CASA.bg, fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
              <button onClick={confirmAction==='apagar' ? doApagar : doAbater} style={{ flex:1, padding:12, borderRadius:11, border:'none', background: confirmAction==='apagar' ? '#EF4444' : '#F59E0B', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                {confirmAction==='apagar' ? 'Apagar' : 'Abater'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FornecedorCard({ icon, title, rows, cta }){
  return (
    <div style={{ background:'#fff', border:`1px solid ${CASA.border}`, borderRadius:12, padding:'12px 14px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        {icon && <span style={{ fontSize:15 }}>{icon}</span>}
        <span style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:0.3, fontWeight:600 }}>{title}</span>
      </div>
      {rows.map(([l,v],i) => (
        <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom: i<rows.length-1 ? `1px solid ${CASA.border}` : 'none', gap:10 }}>
          <span style={{ fontSize:11, color:'#555', flexShrink:0 }}>{l}</span>
          <span style={{ fontSize:11, fontWeight:600, color:'#111', textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</span>
        </div>
      ))}
      {cta && (
        <button onClick={cta.onClick} style={{ marginTop:10, width:'100%', padding:'8px 12px', borderRadius:9, border:`1px solid ${CASA.border}`, background:CASA.bg, fontSize:11, color:CASA.green, fontWeight:600, cursor:'pointer' }}>
          {cta.label}
        </button>
      )}
    </div>
  )
}

// Catálogo estático de peças compatíveis por marca (Fase 3.3 — mock até pecas_catalogo existir)
const PECAS_COMPAT = {
  junkers: [['Válvula segurança','ref. JK-8871'], ['Ânodo magnésio','ref. JK-4421'], ['Kit juntas','ref. JK-9901']],
  daikin:  [['Filtro HEPA','ref. DK-FT-025'], ['Condensador','ref. DK-CD-220'], ['Controlo remoto','ref. DK-RM-FTXC']],
  vulcano: [['Electrová­lvula','ref. VL-EV-14'], ['Permutador','ref. VL-PRM-14L'], ['Kit ignição','ref. VL-IG-A1']],
  bosch:   [['Sensor caudal','ref. BS-SC-09'], ['Termopar','ref. BS-TP-34']],
}

/* ══════════════════════════════════
   IPMA — Previsão + alertas de manutenção (Fase 3.5)
══════════════════════════════════ */
const IPMA_LOCALS = {
  'Coimbra':1060300, 'Lisboa':1110600, 'Porto':1131200, 'Braga':1030300, 'Aveiro':1010500,
  'Faro':1080500, 'Leiria':1100900, 'Setúbal':1151200, 'Évora':1070500, 'Viseu':1182300,
  'Caldas da Rainha':1101000, 'Cascais':1110700, 'Sintra':1111400, 'Almada':1151500,
  'Vila Nova de Gaia':1131700,
}
async function fetchPrevisaoIPMA(concelho){
  const id = IPMA_LOCALS[concelho]
  if(!id) return null
  try {
    const r = await fetch(`https://api.ipma.pt/open-data/forecast/meteorology/cities/daily/${id}.json`)
    if(!r.ok) return null
    const j = await r.json()
    return Array.isArray(j?.data) ? j.data : null
  } catch { return null }
}
function gerarAlertasMeteoManutencao(previsao){
  if(!Array.isArray(previsao)) return []
  const out = []
  previsao.slice(0,3).forEach((d, i) => {
    const t = d.tMax != null ? Number(d.tMax) : null
    const tMin = d.tMin != null ? Number(d.tMin) : null
    const vento = Number(d.classWindSpeed || 0)
    const chuva = Number(d.classPrecInt || 0)  // 0=nenhuma,1=fraca,2=moderada,3=forte
    const ref = i===0 ? 'hoje' : i===1 ? 'amanhã' : `em ${i+1} dias`
    if(chuva >= 2) out.push({ nivel: chuva>=3?'laranja':'amarelo', tipo:'chuva_intensa',
      ic:'🌧️', titulo:`Chuva ${chuva>=3?'forte':'moderada'} ${ref}`, desc:'Verificar caleiras, terraço e escoamento.' })
    if(t != null && t >= 33) out.push({ nivel: t>=35?'laranja':'amarelo', tipo:'calor',
      ic:'☀️', titulo:`Calor ${t>=35?'extremo':'intenso'} ${ref} (${t.toFixed(0)}°C)`, desc:'Verificar AC, filtros e isolamento de cobertura.' })
    if(tMin != null && tMin <= 3) out.push({ nivel: tMin<=0?'laranja':'amarelo', tipo:'frio',
      ic:'❄️', titulo:`Frio intenso ${ref} (mín ${tMin.toFixed(0)}°C)`, desc:'Verificar caldeira e canalização exterior.' })
    if(vento >= 3) out.push({ nivel:'amarelo', tipo:'vento',
      ic:'💨', titulo:`Vento forte ${ref}`, desc:'Fixar antenas, toldos e elementos exteriores soltos.' })
  })
  return out.slice(0,3)
}

/* ══════════════════════════════════
   Claude API helpers (Fase 3.5)
══════════════════════════════════ */
const ANTHROPIC_KEY = import.meta.env?.VITE_ANTHROPIC_API_KEY || ''
const ANTHROPIC_MODEL = 'claude-sonnet-4-5-20250929'

async function callClaudeText(prompt, { system, images } = {}){
  if(!ANTHROPIC_KEY) return { error:'Sem chave API. Adicione VITE_ANTHROPIC_API_KEY ao .env.local e reinicie o Vite.' }
  try {
    const content = [{ type:'text', text: prompt }]
    ;(images || []).forEach(img => content.unshift({
      type:'image',
      source:{ type:'base64', media_type: img.mime || 'image/jpeg', data: img.data },
    }))
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{
        'content-type':'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL, max_tokens: 1024,
        ...(system ? { system } : {}),
        messages: [{ role:'user', content }],
      }),
    })
    const j = await r.json()
    if(!r.ok) return { error: j?.error?.message || `HTTP ${r.status}` }
    const text = (j.content || []).map(c => c.type==='text' ? c.text : '').join('').trim()
    return { text }
  } catch (e) { return { error: e.message } }
}

const DOC_TIPOS = [
  { id:'todos',     label:'Todos',     ic:'📂', bg:'#F3F3F3' },
  { id:'fatura',    label:'Faturas',   ic:'🧾', bg:'#E6F1FB' },
  { id:'garantia',  label:'Garantias', ic:'🛡️', bg:CASA.greenXl },
  { id:'contrato',  label:'Contratos', ic:'📄', bg:CASA.amberLt },
  { id:'relatorio', label:'Relatórios',ic:'📋', bg:'#FAECE7' },
  { id:'manual',    label:'Manuais',   ic:'📘', bg:'#EEEDFE' },
  { id:'foto',      label:'Fotos',     ic:'🖼️', bg:'#F3F3F3' },
  { id:'planta',    label:'Plantas',   ic:'🗺️', bg:'#F3F3F3' },
  { id:'outro',     label:'Outros',    ic:'📎', bg:'#F3F3F3' },
]
const DOC_TIPO_META = DOC_TIPOS.reduce((a,t)=>{ a[t.id]=t; return a }, {})

/* DocsScreen — cofre de documentos por localização (Fase 3.4) */
function DocsScreen({ localizacao, authUser, onBack }){
  const [docs, setDocs] = useState(null)
  const [filtro, setFiltro] = useState('todos')
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState({ tipo:'fatura', nome:'', valor:'', valido_ate:'', file:null })
  const fileRef = useRef(null)

  const refetch = async () => {
    if(!localizacao?.id) return
    const rows = await sbGetV5('documentos', `?localizacao_id=eq.${localizacao.id}&order=created_at.desc`, authUser?.token)
    setDocs(rows || [])
  }
  useEffect(() => { refetch() /* eslint-disable-next-line */ }, [localizacao?.id])

  const startUpload = async () => {
    if(!uploadForm.file){ alert('Escolha um ficheiro primeiro.'); return }
    if(!uploadForm.nome.trim()){ alert('Dê um nome ao documento.'); return }
    setUploading(true)
    const ext = (uploadForm.file.name.split('.').pop() || 'bin').toLowerCase()
    const safeName = uploadForm.nome.trim().replace(/[^a-zA-Z0-9._-]+/g,'-').slice(0,60)
    const path = `${localizacao.pessoa_id || 'anon'}/${localizacao.id}/${uploadForm.tipo}/${Date.now()}-${safeName}.${ext}`
    const url = await sbUpload('v5-casa-docs', path, uploadForm.file, authUser?.token)
    if(!url){ alert('Upload falhou. Ver consola.'); setUploading(false); return }
    const payload = {
      localizacao_id: localizacao.id,
      tipo:           uploadForm.tipo,
      nome:           uploadForm.nome.trim(),
      url,
      storage_path:   path,
      mime_type:      uploadForm.file.type || null,
      tamanho_bytes:  uploadForm.file.size,
      valor_euros:    uploadForm.valor === '' ? null : Number(uploadForm.valor),
      valido_ate:     uploadForm.valido_ate || null,
    }
    const r = await sbSaveV5('documentos', payload, authUser?.token)
    setUploading(false)
    if(!r){ alert('Upload OK mas falha a registar metadados.'); return }
    setUploadOpen(false)
    setUploadForm({ tipo:'fatura', nome:'', valor:'', valido_ate:'', file:null })
    await refetch()
  }

  const filtered = (docs || [])
    .filter(d => filtro==='todos' || d.tipo === filtro)
    .filter(d => !search || (d.nome||'').toLowerCase().includes(search.toLowerCase()))
  const countsByTipo = (docs || []).reduce((a,d) => { a[d.tipo] = (a[d.tipo]||0)+1; return a }, {})
  const total = docs?.length || 0

  return (
    <div style={{ minHeight:'100vh', background:CASA.bg, paddingBottom:88 }}>
      <div style={{ background:CASA.green, padding:'11px 14px 14px', color:'#fff' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', padding:0, fontSize:10, color:'rgba(255,255,255,0.7)', cursor:'pointer', marginBottom:4 }}>← A minha casa</button>
        <div style={{ fontSize:15, fontWeight:700 }}>Documentos</div>
        <div style={{ fontSize:11, opacity:0.75, marginTop:2 }}>{localizacao?.nome || '—'} · {total} ficheiro{total===1?'':'s'}</div>
      </div>

      {/* Search + filtros */}
      <div style={{ padding:'10px 12px 0' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Procurar por nome…"
          style={{ width:'100%', boxSizing:'border-box', padding:'9px 12px', borderRadius:9, border:`1px solid ${CASA.border}`, background:'#fff', fontSize:12, outline:'none', marginBottom:8 }}/>
      </div>
      <div className="cc-no-scrollbar" style={{ display:'flex', gap:6, overflowX:'auto', padding:'0 12px 10px', borderBottom:`1px solid ${CASA.border}` }}>
        {DOC_TIPOS.map(t => {
          const n = t.id === 'todos' ? total : (countsByTipo[t.id] || 0)
          const on = filtro === t.id
          return (
            <button key={t.id} onClick={()=>setFiltro(t.id)} style={{
              flexShrink:0, padding:'5px 11px', borderRadius:14, fontSize:10, cursor:'pointer',
              border:`1px solid ${on?CASA.greenLt:CASA.border}`,
              background: on?CASA.greenXl:'#fff',
              color: on?CASA.green:'#555', fontWeight: on?700:400,
              whiteSpace:'nowrap',
            }}>{t.label} {n>0 && `(${n})`}</button>
          )
        })}
      </div>

      {/* Lista */}
      <div>
        {docs === null && <div className="sk" style={{ height:60, margin:12 }}/>}
        {docs && filtered.length === 0 && (
          <div style={{ padding:'32px 20px', textAlign:'center', color:'#666', fontSize:12, lineHeight:1.55 }}>
            {docs.length === 0 ? 'Sem documentos guardados. Adicione faturas, garantias, relatórios ou manuais.' : 'Sem resultados para este filtro.'}
          </div>
        )}
        {filtered.map(d => {
          const m = DOC_TIPO_META[d.tipo] || DOC_TIPO_META.outro
          return (
            <a key={d.id} href={d.url} target="_blank" rel="noreferrer" style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderBottom:`1px solid ${CASA.border}`, textDecoration:'none', color:'inherit' }}>
              <div style={{ width:36, height:36, borderRadius:9, background:m.bg, display:'grid', placeItems:'center', fontSize:18, flexShrink:0 }}>{m.ic}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.nome}</div>
                <div style={{ fontSize:10, color:'#999', marginTop:1 }}>
                  {m.label}{d.valor_euros != null ? ` · €${Number(d.valor_euros).toFixed(2)}` : ''}{d.valido_ate ? ` · válido até ${new Date(d.valido_ate).toLocaleDateString('pt-PT')}` : ''}
                </div>
              </div>
              <span style={{ fontSize:10, color:'#999' }}>›</span>
            </a>
          )
        })}
      </div>

      {/* Upload CTA fixo */}
      <button onClick={()=>setUploadOpen(true)} style={{
        position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)',
        zIndex:50, background:CASA.greenLt, color:'#fff', border:'none',
        borderRadius:999, padding:'12px 22px', fontSize:13, fontWeight:700,
        boxShadow:'0 6px 18px -6px rgba(82,183,136,0.6)', cursor:'pointer',
      }}>+ Adicionar documento</button>

      {/* Modal upload */}
      {uploadOpen && (
        <div onClick={()=>!uploading && setUploadOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:100, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', width:'100%', maxWidth:430, borderRadius:'18px 18px 0 0', padding:'18px 18px 22px', maxHeight:'86vh', overflowY:'auto', animation:'popIn 0.18s ease-out' }}>
            <div style={{ width:38, height:4, borderRadius:2, background:'#e5e7eb', margin:'0 auto 14px' }}/>
            <h2 style={{ margin:'0 0 14px', fontSize:17, fontWeight:700, color:'#0A1620' }}>Adicionar documento</h2>

            <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Tipo</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:14 }}>
              {DOC_TIPOS.filter(t=>t.id!=='todos').map(t => {
                const on = uploadForm.tipo === t.id
                return (
                  <button key={t.id} onClick={()=>setUploadForm(p=>({...p, tipo:t.id}))} style={{
                    padding:'7px 4px', borderRadius:9, cursor:'pointer',
                    border:`1.5px solid ${on?CASA.greenLt:CASA.border}`,
                    background: on?CASA.greenXl:'#fff',
                    fontSize:10, color:'#111', fontWeight:600, textAlign:'center',
                  }}>
                    <div style={{ fontSize:16, marginBottom:2 }}>{t.ic}</div>
                    {t.label}
                  </button>
                )
              })}
            </div>

            <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>Nome</div>
            <input value={uploadForm.nome} onChange={e=>setUploadForm(p=>({...p, nome:e.target.value}))}
              style={{ width:'100%', boxSizing:'border-box', padding:'9px 12px', borderRadius:8, border:`1px solid ${CASA.border}`, fontSize:13, outline:'none', marginBottom:10 }}
              placeholder="Ex: Fatura revisão caldeira"/>

            <div style={{ display:'flex', gap:8, marginBottom:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>Valor (€)</div>
                <input type="number" value={uploadForm.valor} onChange={e=>setUploadForm(p=>({...p, valor:e.target.value}))}
                  style={{ width:'100%', boxSizing:'border-box', padding:'9px 12px', borderRadius:8, border:`1px solid ${CASA.border}`, fontSize:13, outline:'none' }}
                  placeholder="Opcional"/>
              </div>
              <div style={{ flex:1.3 }}>
                <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>Válido até</div>
                <input type="date" value={uploadForm.valido_ate} onChange={e=>setUploadForm(p=>({...p, valido_ate:e.target.value}))}
                  style={{ width:'100%', boxSizing:'border-box', padding:'9px 12px', borderRadius:8, border:`1px solid ${CASA.border}`, fontSize:13, outline:'none' }}/>
              </div>
            </div>

            <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>Ficheiro</div>
            <input ref={fileRef} type="file" onChange={e=>setUploadForm(p=>({...p, file:e.target.files?.[0] || null}))}
              style={{ width:'100%', boxSizing:'border-box', padding:'9px 12px', borderRadius:8, border:`1px solid ${CASA.border}`, fontSize:12, background:'#fff', marginBottom:14 }}/>

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setUploadOpen(false)} disabled={uploading} style={{ flex:1, padding:'11px 14px', borderRadius:10, border:`1px solid ${CASA.border}`, background:'#fff', color:'#555', fontWeight:600, fontSize:13, cursor:uploading?'default':'pointer' }}>Cancelar</button>
              <button onClick={startUpload} disabled={uploading} style={{ flex:2, padding:'11px 14px', borderRadius:10, border:'none', background:uploading?CASA.border:CASA.greenLt, color:'#fff', fontWeight:700, fontSize:13, cursor:uploading?'default':'pointer' }}>
                {uploading ? 'A enviar…' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* EnergiaScreen — consumo mensal + poupança estimada + fatura OCR (Fase 3.4/3.5) */
function EnergiaScreen({ localizacao, equipamentos, authUser, onBack }){
  const eqs = (equipamentos || []).filter(e => !localizacao || e.localizacao_id === localizacao.id)
  const [consumos, setConsumos] = useState(null)
  const [fatura, setFatura] = useState(null)           // última fatura com dados_ocr
  const [faturaLoading, setFaturaLoading] = useState(false)
  const faturaFileRef = useRef(null)

  useEffect(() => {
    if(!eqs.length){ setConsumos([]); return }
    let active = true
    const ids = eqs.map(e => `"${e.id}"`).join(',')
    sbGetV5('consumos_energia', `?equipamento_id=in.(${ids})&order=ano.desc,mes.desc`, authUser?.token).then(rows => {
      if(active) setConsumos(rows || [])
    })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eqs.length, authUser?.token])

  // Fetch última fatura de eletricidade com dados_ocr para a localização
  useEffect(() => {
    if(!localizacao?.id) return
    let active = true
    sbGetV5('documentos',
      `?localizacao_id=eq.${localizacao.id}&tipo=eq.fatura&dados_ocr=not.is.null&order=created_at.desc&limit=1`,
      authUser?.token).then(rows => {
      if(active) setFatura(Array.isArray(rows) ? rows[0] || null : null)
    })
    return () => { active = false }
  }, [localizacao?.id, authUser?.token])

  const uploadFatura = async (file) => {
    if(!file || !localizacao) return
    setFaturaLoading(true)

    // 1. Upload do ficheiro ao bucket
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${localizacao.pessoa_id || 'anon'}/${localizacao.id}/fatura/${Date.now()}-fatura-eletricidade.${ext}`
    const url = await sbUpload('v5-casa-docs', path, file, authUser?.token)
    if(!url){ alert('Upload falhou.'); setFaturaLoading(false); return }

    // 2. INSERT documento com dados_ocr=null (pendente)
    const docPayload = {
      localizacao_id: localizacao.id,
      tipo: 'fatura',
      nome: file.name || 'Fatura eletricidade',
      url, storage_path: path,
      mime_type: file.type || null, tamanho_bytes: file.size,
    }
    const docRes = await sbSaveV5('documentos', docPayload, authUser?.token)
    const docRow = Array.isArray(docRes) ? docRes[0] : docRes
    if(!docRow){ alert('Metadados não guardados.'); setFaturaLoading(false); return }

    // 3. Claude Vision para extracção
    if(ANTHROPIC_KEY && /^image\//.test(file.type || '')){
      const reader = new FileReader()
      const b64 = await new Promise(res => { reader.onload = () => res(String(reader.result).split(',')[1]); reader.readAsDataURL(file) })
      const prompt = `Analisa esta fatura de eletricidade portuguesa. Extrai os campos abaixo. Se um campo não estiver visível, retorna null.

Responde APENAS com o JSON (sem markdown, sem comentários):
{
  "fornecedor": "EDP|Galp|Iberdrola|Endesa|Repsol|... ou nome exacto",
  "periodo_inicio": "YYYY-MM-DD ou null",
  "periodo_fim": "YYYY-MM-DD ou null",
  "consumo_kwh": número ou null,
  "custo_total_eur": número (com IVA) ou null,
  "custo_energia_eur": número (sem IVA nem taxas fixas) ou null,
  "potencia_contratada_kva": número ou null,
  "tarifa_tipo": "simples|bi-horário|tri-horário ou null",
  "tarifa_kwh_vazio": número ou null,
  "tarifa_kwh_cheias": número ou null,
  "tarifa_kwh_ponta": número ou null,
  "tarifa_kwh_simples": número ou null,
  "codigo_cpe": "string ou null",
  "numero_fatura": "string ou null",
  "data_emissao": "YYYY-MM-DD ou null",
  "confianca": 0-100
}`
      const res = await callClaudeText(prompt, { images:[{ mime: file.type, data: b64 }] })
      if(res.text){
        let parsed = null
        try {
          const m = res.text.match(/\{[\s\S]*\}/)
          parsed = m ? JSON.parse(m[0]) : null
        } catch {}
        if(parsed){
          const upd = await sbUpdateV5('documentos', `?id=eq.${docRow.id}`,
            { dados_ocr: parsed, valor_euros: parsed.custo_total_eur || null }, authUser?.token)
          const updRow = Array.isArray(upd) ? upd[0] : upd
          setFatura(updRow || { ...docRow, dados_ocr: parsed })
          setFaturaLoading(false)
          return
        }
      }
    }
    // Fallback: doc guardado sem OCR
    setFatura(docRow)
    setFaturaLoading(false)
    if(!ANTHROPIC_KEY) alert('Fatura guardada. Para leitura automática, configure VITE_ANTHROPIC_API_KEY.')
    else alert('Fatura guardada mas não foi possível extrair dados.')
  }

  // Preço kWh: usa a tarifa real extraída da última fatura se disponível, caso contrário 0.18€/kWh.
  const tarifaOCR = (() => {
    const o = fatura?.dados_ocr
    if(!o) return null
    if(o.tarifa_kwh_simples) return Number(o.tarifa_kwh_simples)
    if(o.custo_energia_eur && o.consumo_kwh) return Number(o.custo_energia_eur) / Number(o.consumo_kwh)
    return null
  })()
  const PRECO_KWH = tarifaOCR || 0.18

  // Para cada equipamento: consumo estimado + custo + poupança se A-rated
  const rows = eqs.map(eq => {
    const cons = Number(eq.consumo_estimado_kwh_mes || 0)
    const custo = cons * PRECO_KWH
    const atual = eq.classe_energetica || null
    const jaArated = ['A+++','A++','A+','A'].includes(atual)
    const poupancaPct = jaArated ? 0 : 0.30
    const poupanca = custo * poupancaPct
    return { eq, cons, custo, poupanca, jaArated }
  })
  const totalKwh = rows.reduce((s,r)=>s+r.cons,0)
  const totalCusto = rows.reduce((s,r)=>s+r.custo,0)
  const totalPoupanca = rows.reduce((s,r)=>s+r.poupanca,0)

  // Cor de barra por consumo relativo
  const barColor = pct => pct >= 60 ? '#EF4444' : pct >= 30 ? '#F59E0B' : CASA.greenLt

  return (
    <div style={{ minHeight:'100vh', background:CASA.bg, paddingBottom:88 }}>
      <div style={{ background:CASA.green, padding:'11px 14px 14px', color:'#fff' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', padding:0, fontSize:10, color:'rgba(255,255,255,0.7)', cursor:'pointer', marginBottom:4 }}>← A minha casa</button>
        <div style={{ fontSize:15, fontWeight:700 }}>Energia</div>
        <div style={{ fontSize:11, opacity:0.75, marginTop:2 }}>{localizacao?.nome || '—'}</div>
        <div style={{ display:'flex', gap:14, marginTop:12, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.65)', textTransform:'uppercase', letterSpacing:0.5 }}>Consumo mensal</div>
            <div style={{ fontSize:22, fontWeight:700, marginTop:2 }}>{totalKwh.toFixed(0)} kWh</div>
          </div>
          <div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.65)', textTransform:'uppercase', letterSpacing:0.5 }}>Custo / mês</div>
            <div style={{ fontSize:22, fontWeight:700, marginTop:2 }}>€{totalCusto.toFixed(2).replace('.',',')}</div>
          </div>
          <div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.65)', textTransform:'uppercase', letterSpacing:0.5 }}>Potencial poupança</div>
            <div style={{ fontSize:22, fontWeight:700, marginTop:2, color:'#86efac' }}>€{totalPoupanca.toFixed(2).replace('.',',')}</div>
          </div>
        </div>
      </div>

      {/* BLOCO FATURA DE ELETRICIDADE */}
      <div style={{ padding:'12px 12px 0' }}>
        <div style={{ fontSize:10, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>Fatura de eletricidade</div>

        {!fatura && !faturaLoading && (
          <div style={{ background:'#fff', border:`1px dashed ${CASA.border}`, borderRadius:11, padding:'14px 16px', display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ fontSize:28 }}>⚡</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12.5, fontWeight:700, color:'#111', marginBottom:3 }}>Carregue a sua última fatura</div>
              <div style={{ fontSize:11, color:'#555', lineHeight:1.5, marginBottom:10 }}>
                Lemos automaticamente fornecedor, consumo, tarifa e potência contratada. Pode depois simular poupança mudando para outro comercializador.
              </div>
              <input ref={faturaFileRef} type="file" accept="image/*,application/pdf" onChange={e=>{ const f = e.target.files?.[0]; if(f) uploadFatura(f) }} style={{ display:'none' }}/>
              <button onClick={()=>faturaFileRef.current?.click()} style={{ background:CASA.greenLt, color:'#fff', border:'none', borderRadius:9, padding:'8px 14px', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                📤 Carregar fatura
              </button>
            </div>
          </div>
        )}

        {faturaLoading && (
          <div style={{ background:'#fff', border:`1px solid ${CASA.border}`, borderRadius:11, padding:'14px 16px', display:'flex', gap:10, alignItems:'center' }}>
            <div className="sk" style={{ width:34, height:34, borderRadius:8 }}/>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#111' }}>A analisar fatura…</div>
              <div style={{ fontSize:10, color:'#999', marginTop:2 }}>A extrair dados com IA.</div>
            </div>
          </div>
        )}

        {fatura && (() => {
          const o = fatura.dados_ocr || {}
          const tarifa = o.tarifa_kwh_simples ?? (o.custo_energia_eur && o.consumo_kwh ? (Number(o.custo_energia_eur)/Number(o.consumo_kwh)) : null)
          const v4Url = 'http://127.0.0.1:5174'  // v4-energia (ajustar quando deploy)
          return (
            <div style={{ background:'#fff', border:`1px solid ${CASA.greenLt}`, borderRadius:11, padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:0.5 }}>Fornecedor actual</div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#111', marginTop:2 }}>{o.fornecedor || 'Fornecedor não identificado'}</div>
                  {(o.periodo_inicio || o.periodo_fim) && (
                    <div style={{ fontSize:10, color:'#999', marginTop:2 }}>
                      {o.periodo_inicio ? new Date(o.periodo_inicio).toLocaleDateString('pt-PT') : '—'}
                      {' → '}
                      {o.periodo_fim ? new Date(o.periodo_fim).toLocaleDateString('pt-PT') : '—'}
                    </div>
                  )}
                </div>
                <a href={fatura.url} target="_blank" rel="noreferrer" style={{ fontSize:11, color:CASA.greenLt, textDecoration:'none', fontWeight:600 }}>Ver PDF ›</a>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:0, border:`1px solid ${CASA.border}`, borderRadius:8, overflow:'hidden' }}>
                {[
                  ['Consumo',   o.consumo_kwh != null ? `${o.consumo_kwh} kWh` : '—'],
                  ['Total',     o.custo_total_eur != null ? `€${Number(o.custo_total_eur).toFixed(2).replace('.',',')}` : '—'],
                  ['Potência',  o.potencia_contratada_kva ? `${o.potencia_contratada_kva} kVA` : '—'],
                ].map(([l,v],i) => (
                  <div key={l} style={{ padding:'8px 10px', borderRight: i<2 ? `1px solid ${CASA.border}` : 'none' }}>
                    <div style={{ fontSize:8.5, color:'#999', textTransform:'uppercase', letterSpacing:0.3 }}>{l}</div>
                    <div style={{ fontSize:12, fontWeight:700, marginTop:2 }}>{v}</div>
                  </div>
                ))}
              </div>

              {tarifa != null && (
                <div style={{ marginTop:10, fontSize:11, color:'#555' }}>
                  Tarifa efectiva: <b style={{ color:'#111' }}>{Number(tarifa).toFixed(3).replace('.',',')} €/kWh</b>
                  {o.tarifa_tipo && <> · {o.tarifa_tipo}</>}
                </div>
              )}

              <div style={{ display:'flex', gap:8, marginTop:12 }}>
                <button onClick={()=>faturaFileRef.current?.click()} style={{ flex:1, padding:'9px', borderRadius:8, border:`1px solid ${CASA.border}`, background:'#fff', fontSize:11, fontWeight:600, color:'#555', cursor:'pointer' }}>📤 Nova fatura</button>
                <button onClick={()=>window.open(v4Url, '_blank')} style={{ flex:2, padding:'9px', borderRadius:8, border:'none', background:CASA.greenLt, color:'#fff', fontSize:11.5, fontWeight:700, cursor:'pointer' }}>
                  Simular outros fornecedores →
                </button>
              </div>
              <input ref={faturaFileRef} type="file" accept="image/*,application/pdf" onChange={e=>{ const f = e.target.files?.[0]; if(f) uploadFatura(f) }} style={{ display:'none' }}/>
            </div>
          )
        })()}
      </div>

      <div style={{ padding:'12px 12px 0' }}>
        <div style={{ fontSize:11, color:'#555', marginBottom:10, lineHeight:1.5, background:'#fff', border:`1px solid ${CASA.border}`, borderRadius:10, padding:'10px 12px' }}>
          💡 Estimativas baseadas em <b>{PRECO_KWH.toFixed(3).replace('.',',')}€/kWh</b>
          {tarifaOCR ? ' (tarifa lida da sua fatura)' : ' (tarifa simples default)'}. Poupança calculada como −30% ao substituir por equivalente A-rated; equipamentos já A-rated não têm ganho.
        </div>

        {consumos === null && <div className="sk" style={{ height:72 }}/>}
        {rows.length === 0 && (
          <div style={{ padding:'28px 14px', textAlign:'center', color:'#666', fontSize:12, lineHeight:1.55, background:'#fff', border:`1px dashed ${CASA.border}`, borderRadius:11 }}>
            Ainda sem equipamentos para calcular consumo.
          </div>
        )}

        {rows.map(r => {
          const pct = totalCusto > 0 ? (r.custo/totalCusto)*100 : 0
          return (
            <div key={r.eq.id} style={{ background:'#fff', border:`1px solid ${CASA.border}`, borderRadius:11, padding:'12px 14px', marginBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#111' }}>{r.eq.nome}</div>
                <div style={{ fontSize:12, fontWeight:700, color:'#111' }}>€{r.custo.toFixed(2).replace('.',',')}</div>
              </div>
              <div style={{ fontSize:10, color:'#999', marginBottom:6 }}>
                {CASA_CAT_LABELS[r.eq.categoria] || r.eq.categoria}
                {r.eq.classe_energetica ? ` · Classe ${r.eq.classe_energetica}` : ''}
                {` · ${r.cons.toFixed(0)} kWh/mês`}
                {pct > 0 && ` · ${pct.toFixed(0)}% do total`}
              </div>
              <div style={{ height:6, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
                <div style={{ width:`${Math.min(100,pct)}%`, height:6, background:barColor(pct), borderRadius:3 }}/>
              </div>
              {!r.jaArated && r.poupanca > 0 && (
                <div style={{ marginTop:8, display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                  <div style={{ fontSize:11, color:CASA.green, lineHeight:1.45 }}>
                    <b>-€{r.poupanca.toFixed(2).replace('.',',')}/mês</b> se substituir por A-rated
                  </div>
                  <button onClick={()=>alert('Orçamento de substituição — liga ao fluxo V2 na Fase 3.5')} style={{
                    background:CASA.greenLt, border:'none', color:'#fff', borderRadius:8,
                    padding:'5px 10px', fontSize:10, fontWeight:700, cursor:'pointer', flexShrink:0,
                  }}>Pedir orçamento</button>
                </div>
              )}
              {r.jaArated && (
                <div style={{ marginTop:8, fontSize:11, color:CASA.green, fontStyle:'italic' }}>✓ Já em classe óptima</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* CameraScreen — captura foto + Claude API identifica equipamento (Fase 3.5) */
function CameraScreen({ localizacao, authUser, onBack, onCreated }){
  const [stream, setStream] = useState(null)
  const [useFileFallback, setUseFileFallback] = useState(false)
  const [captureB64, setCaptureB64] = useState(null) // { mime, data }
  const [analysing, setAnalysing] = useState(false)
  const [ai, setAi] = useState(null) // resultado parsed
  const [saving, setSaving] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' }, audio:false })
      setStream(s)
      if(videoRef.current){ videoRef.current.srcObject = s; videoRef.current.play() }
    } catch {
      setUseFileFallback(true)
    }
  }
  useEffect(() => {
    startCamera()
    return () => {
      if(stream) stream.getTracks().forEach(t => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const capture = () => {
    const v = videoRef.current, c = canvasRef.current
    if(!v || !c) return
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d').drawImage(v, 0, 0)
    const dataUrl = c.toDataURL('image/jpeg', 0.85)
    const b64 = dataUrl.split(',')[1]
    setCaptureB64({ mime:'image/jpeg', data: b64 })
    if(stream){ stream.getTracks().forEach(t => t.stop()); setStream(null) }
  }
  const pickFile = async e => {
    const f = e.target.files?.[0]; if(!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const b64 = result.split(',')[1]
      setCaptureB64({ mime: f.type || 'image/jpeg', data: b64 })
    }
    reader.readAsDataURL(f)
  }

  const analyse = async () => {
    if(!captureB64) return
    setAnalysing(true)
    const prompt = `Analisa esta imagem de um equipamento doméstico (caldeira, AC, esquentador, painel solar, elevador, etc.). Extrai os dados técnicos visíveis.

Responde APENAS com um objecto JSON neste formato, sem markdown nem texto extra:
{
  "categoria": "aquecimento|climatizacao|aguas_quentes|canalizacao|eletrica|cobertura|estrutura|piscina|solar|elevador|gerador|outros",
  "nome": "string curta com marca+modelo",
  "marca": "string ou null",
  "modelo": "string ou null",
  "numero_serie": "string ou null",
  "classe_energetica": "A+++|A++|A+|A|B|C|D|E|F|G ou null",
  "ano_estimado": número ou null,
  "potencia_kw": número ou null,
  "eficiencia_estimada": número 0-100 ou null,
  "confianca": número 0-100,
  "notas_tecnicas": "string curta em português"
}`
    const res = await callClaudeText(prompt, { images:[captureB64] })
    setAnalysing(false)
    if(res.error){ alert(`Análise falhou: ${res.error}`); return }
    // Parse resposta (pode estar envolvida em ```json)
    let parsed = null
    try {
      const m = res.text.match(/\{[\s\S]*\}/)
      parsed = m ? JSON.parse(m[0]) : JSON.parse(res.text)
    } catch {
      alert('Não consegui interpretar a resposta da IA. Tenta de novo.'); return
    }
    setAi(parsed)
  }

  const guardar = async () => {
    if(!ai || !localizacao) return
    setSaving(true)
    const payload = {
      localizacao_id:       localizacao.id,
      categoria:            ai.categoria || 'outros',
      nome:                 ai.nome || 'Equipamento',
      marca:                ai.marca || null,
      modelo:               ai.modelo || null,
      numero_serie:         ai.numero_serie || null,
      classe_energetica:    ai.classe_energetica || null,
      potencia_kw:          ai.potencia_kw || null,
      eficiencia_estimada:  ai.eficiencia_estimada || null,
      health_score:         ai.eficiencia_estimada || 50,
      dados_ia:             ai,
    }
    const r = await sbSaveV5('equipamentos', payload, authUser?.token)
    setSaving(false)
    if(!r){ alert('Erro ao guardar.'); return }
    onCreated?.(Array.isArray(r) ? r[0] : r)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#000', color:'#fff', paddingBottom:88 }}>
      <div style={{ background:CASA.green, padding:'11px 14px', display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:'#fff', fontSize:20, cursor:'pointer' }}>←</button>
        <div style={{ fontSize:14, fontWeight:700 }}>Câmara IA</div>
      </div>

      {!ANTHROPIC_KEY && (
        <div style={{ padding:'14px 16px', background:'#7f1d1d', color:'#fff', fontSize:12, lineHeight:1.55 }}>
          ⚠️ Falta a chave <b>VITE_ANTHROPIC_API_KEY</b> em <code>.env.local</code>. Reinicia o Vite após adicionar para a análise funcionar. Nota: expor a chave no browser é aceitável em DEV, <b>não</b> em produção — em prod encaminhar por edge function.
        </div>
      )}

      {/* Captura */}
      {!captureB64 && (
        <div style={{ padding:14 }}>
          {!useFileFallback ? (
            <>
              <video ref={videoRef} playsInline muted style={{ width:'100%', borderRadius:12, background:'#111' }}/>
              <canvas ref={canvasRef} style={{ display:'none' }}/>
              <button onClick={capture} disabled={!stream} style={{ width:'100%', marginTop:12, padding:14, borderRadius:12, border:'none', background:stream?CASA.greenLt:'#333', color:'#fff', fontWeight:700, fontSize:14, cursor:stream?'pointer':'default' }}>
                {stream ? '📸 Capturar' : 'A obter câmara…'}
              </button>
              <button onClick={()=>{ if(stream) stream.getTracks().forEach(t=>t.stop()); setUseFileFallback(true) }} style={{ width:'100%', marginTop:8, padding:10, borderRadius:10, border:`1px solid #444`, background:'transparent', color:'#ccc', fontSize:12, cursor:'pointer' }}>
                Usar foto do dispositivo
              </button>
            </>
          ) : (
            <div style={{ background:'#111', borderRadius:12, padding:40, textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:10 }}>🖼️</div>
              <input type="file" accept="image/*" onChange={pickFile} style={{ color:'#ccc' }}/>
              <div style={{ fontSize:11, color:'#888', marginTop:12 }}>Seleccione uma foto do equipamento.</div>
            </div>
          )}
        </div>
      )}

      {/* Preview + análise */}
      {captureB64 && !ai && (
        <div style={{ padding:14 }}>
          <img src={`data:${captureB64.mime};base64,${captureB64.data}`} alt="" style={{ width:'100%', borderRadius:12 }}/>
          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button onClick={()=>{ setCaptureB64(null); startCamera() }} style={{ flex:1, padding:12, borderRadius:10, border:'1px solid #444', background:'transparent', color:'#ccc', fontSize:13, cursor:'pointer' }}>Nova foto</button>
            <button onClick={analyse} disabled={analysing || !ANTHROPIC_KEY} style={{ flex:2, padding:12, borderRadius:10, border:'none', background: (analysing||!ANTHROPIC_KEY)?'#333':CASA.greenLt, color:'#fff', fontWeight:700, fontSize:13, cursor:(analysing||!ANTHROPIC_KEY)?'default':'pointer' }}>
              {analysing ? 'A analisar…' : '✨ Analisar com IA'}
            </button>
          </div>
        </div>
      )}

      {/* Resultado */}
      {ai && (
        <div style={{ padding:14, color:'#111', background:'#fff', minHeight:'calc(100vh - 48px)' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#999', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Identificado (confiança {ai.confianca ?? '—'}%)</div>
          <div style={{ fontSize:16, fontWeight:700 }}>{ai.nome || 'Equipamento'}</div>
          <div style={{ fontSize:12, color:'#555', marginTop:2 }}>{CASA_CAT_LABELS[ai.categoria] || ai.categoria || '—'}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0, marginTop:14, border:`1px solid ${CASA.border}`, borderRadius:10, overflow:'hidden' }}>
            {[
              ['Marca',    ai.marca],
              ['Modelo',   ai.modelo],
              ['Nº Série', ai.numero_serie],
              ['Classe',   ai.classe_energetica],
              ['Ano',      ai.ano_estimado],
              ['Potência', ai.potencia_kw != null ? `${ai.potencia_kw} kW` : null],
              ['Eficiência', ai.eficiencia_estimada != null ? `${ai.eficiencia_estimada}%` : null],
            ].map(([l,v],i) => (
              <div key={l} style={{ padding:'9px 12px', borderRight:i%2===0?`1px solid ${CASA.border}`:'none', borderBottom:`1px solid ${CASA.border}` }}>
                <div style={{ fontSize:9, color:'#999', textTransform:'uppercase', letterSpacing:0.3, marginBottom:2 }}>{l}</div>
                <div style={{ fontSize:12, fontWeight:600 }}>{v ?? '—'}</div>
              </div>
            ))}
          </div>
          {ai.notas_tecnicas && (
            <div style={{ marginTop:12, padding:'10px 12px', background:CASA.amberLt, border:'1px solid #EF9F27', borderRadius:10, fontSize:11, color:CASA.amber, lineHeight:1.55 }}>
              ✨ {ai.notas_tecnicas}
            </div>
          )}
          <div style={{ display:'flex', gap:8, marginTop:16 }}>
            <button onClick={()=>{ setAi(null); setCaptureB64(null); startCamera() }} style={{ flex:1, padding:12, borderRadius:10, border:`1px solid ${CASA.border}`, background:'#fff', fontSize:13, cursor:'pointer' }}>Nova análise</button>
            <button onClick={guardar} disabled={saving} style={{ flex:2, padding:12, borderRadius:10, border:'none', background:saving?'#ccc':CASA.greenLt, color:'#fff', fontWeight:700, fontSize:13, cursor:saving?'default':'pointer' }}>{saving ? 'A guardar…' : '+ Guardar equipamento'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* AIExpertScreen — chat com contexto completo da casa (Fase 3.5) */
/* CasaLocais — CRUD das localizações + selecção da activa (Fase 3.5) */
function CasaLocais({ localizacoes, activeLocId, authUser, onBack, onRefresh, onPickActive }){
  const [editing, setEditing] = useState(null)   // 'new' | row | null
  const [form, setForm] = useState({ nome:'', tipo:'habitacao', morada:'', localidade:'', concelho:'', codigo_postal:'', ano_construcao:'', tipologia:'', area_m2:'' })
  const [saving, setSaving] = useState(false)

  const openNew = () => { setForm({ nome:'', tipo:'habitacao', morada:'', localidade:'', concelho:'', codigo_postal:'', ano_construcao:'', tipologia:'', area_m2:'' }); setEditing('new') }
  const openEdit = (l) => {
    setForm({
      nome:           l.nome || '',
      tipo:           l.tipo || 'habitacao',
      morada:         l.morada || '',
      localidade:     l.localidade || '',
      concelho:       l.concelho || '',
      codigo_postal:  l.codigo_postal || '',
      ano_construcao: l.ano_construcao || '',
      tipologia:      l.tipologia || '',
      area_m2:        l.area_m2 || '',
    })
    setEditing(l)
  }

  const save = async () => {
    if(!form.nome.trim()){ alert('Nome é obrigatório.'); return }
    setSaving(true)
    const payload = {
      nome: form.nome.trim(),
      tipo: form.tipo || 'habitacao',
      morada: form.morada.trim() || null,
      localidade: form.localidade.trim() || null,
      concelho: form.concelho.trim() || null,
      codigo_postal: form.codigo_postal.trim() || null,
      ano_construcao: form.ano_construcao === '' ? null : Number(form.ano_construcao),
      tipologia: form.tipologia.trim() || null,
      area_m2: form.area_m2 === '' ? null : Number(form.area_m2),
    }
    let result
    if(editing === 'new'){
      result = await sbSaveV5('localizacoes', payload, authUser?.token)
    } else {
      result = await sbUpdateV5('localizacoes', `?id=eq.${editing.id}`, payload, authUser?.token)
    }
    setSaving(false)
    if(!result){ alert('Erro ao guardar.'); return }
    setEditing(null)
    onRefresh?.()
  }

  const remove = async (l) => {
    if(!window.confirm(`Eliminar "${l.nome}"? Os equipamentos associados também serão apagados.`)) return
    const ok = await sbDeleteV5('localizacoes', `?id=eq.${l.id}`, authUser?.token)
    if(!ok){ alert('Erro ao eliminar.'); return }
    onRefresh?.()
  }

  const TIPOS = [
    { id:'habitacao',         l:'Habitação',         ic:'🏠' },
    { id:'segunda_habitacao', l:'Segunda habitação', ic:'🏡' },
    { id:'condominio',        l:'Condomínio',        ic:'🏢' },
    { id:'empresa',           l:'Empresa',           ic:'🏭' },
  ]
  const TIPO_META = TIPOS.reduce((a,t)=>{ a[t.id]=t; return a }, {})

  return (
    <div style={{ minHeight:'100vh', background:CASA.bg, paddingBottom:88 }}>
      <div style={{ background:CASA.green, padding:'11px 14px', color:'#fff', display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:'#fff', fontSize:20, cursor:'pointer' }}>←</button>
        <div style={{ flex:1, fontSize:14, fontWeight:700 }}>Os meus locais</div>
        <button onClick={openNew} style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:8, padding:'5px 11px', fontSize:11, color:'#fff', cursor:'pointer', fontWeight:600 }}>+ Novo</button>
      </div>

      <div style={{ padding:14 }}>
        {localizacoes === null && <div className="sk" style={{ height:80 }}/>}
        {localizacoes && localizacoes.length === 0 && (
          <div style={{ padding:'32px 20px', textAlign:'center', background:'#fff', borderRadius:11, border:`1px dashed ${CASA.border}` }}>
            <div style={{ fontSize:32, marginBottom:10 }}>🏡</div>
            <div style={{ fontSize:14, fontWeight:700, color:'#111', marginBottom:4 }}>Sem locais registados</div>
            <div style={{ fontSize:12, color:'#555', lineHeight:1.5, maxWidth:280, margin:'0 auto 14px' }}>Adicione a sua casa principal, segunda habitação, escritório ou condomínio.</div>
            <button onClick={openNew} style={{ background:CASA.greenLt, color:'#fff', border:'none', borderRadius:10, padding:'9px 18px', fontSize:13, fontWeight:700, cursor:'pointer' }}>+ Adicionar local</button>
          </div>
        )}
        {localizacoes && localizacoes.map(l => {
          const tm = TIPO_META[l.tipo] || TIPO_META.habitacao
          const active = l.id === activeLocId
          return (
            <div key={l.id} style={{ background:'#fff', border:`1.5px solid ${active?CASA.greenLt:CASA.border}`, borderRadius:11, padding:'12px 14px', marginBottom:8 }}>
              <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                <div style={{ width:40, height:40, borderRadius:10, background: active ? CASA.greenXl : '#f1f5f9', display:'grid', placeItems:'center', fontSize:20, flexShrink:0 }}>{tm.ic}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                    <span style={{ fontSize:13.5, fontWeight:700, color:'#111' }}>{l.nome}</span>
                    {active && <span style={{ fontSize:9, fontWeight:700, color:CASA.green, background:CASA.greenXl, padding:'2px 6px', borderRadius:4, textTransform:'uppercase', letterSpacing:0.4 }}>Activa</span>}
                  </div>
                  <div style={{ fontSize:11, color:'#999', marginBottom:2 }}>{tm.l}{l.tipologia ? ` · ${l.tipologia}` : ''}{l.area_m2 ? ` · ${l.area_m2} m²` : ''}</div>
                  {(l.morada || l.localidade) && <div style={{ fontSize:12, color:'#555', lineHeight:1.4 }}>{l.morada}{l.localidade ? `, ${l.localidade}` : ''}</div>}
                  <div style={{ fontSize:11, color:'#999', marginTop:4 }}>Home Score: <b style={{ color:'#111' }}>{l.home_score ?? '—'}</b>/100</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:6, marginTop:10 }}>
                {!active && <button onClick={()=>onPickActive?.(l.id)} style={{ flex:1, padding:'7px', borderRadius:8, border:`1px solid ${CASA.greenLt}`, background:'#fff', color:CASA.green, fontSize:11, fontWeight:700, cursor:'pointer' }}>✓ Activar</button>}
                <button onClick={()=>openEdit(l)} style={{ flex:1, padding:'7px', borderRadius:8, border:`1px solid ${CASA.border}`, background:'#fff', color:'#555', fontSize:11, fontWeight:600, cursor:'pointer' }}>✏️ Editar</button>
                <button onClick={()=>remove(l)} style={{ padding:'7px 12px', borderRadius:8, border:'1px solid #fecaca', background:'#fff', color:'#ef4444', fontSize:11, fontWeight:600, cursor:'pointer' }}>🗑</button>
              </div>
            </div>
          )
        })}
      </div>

      {editing && (
        <div onClick={()=>!saving && setEditing(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:100, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', width:'100%', maxWidth:430, borderRadius:'18px 18px 0 0', padding:'18px 18px 22px', maxHeight:'88vh', overflowY:'auto', animation:'popIn 0.18s ease-out' }}>
            <div style={{ width:38, height:4, borderRadius:2, background:'#e5e7eb', margin:'0 auto 14px' }}/>
            <h2 style={{ margin:'0 0 14px', fontSize:17, fontWeight:700, color:'#0A1620' }}>{editing==='new' ? 'Novo local' : 'Editar local'}</h2>

            <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Tipo</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:14 }}>
              {TIPOS.map(t => {
                const on = form.tipo === t.id
                return (
                  <button key={t.id} onClick={()=>setForm(p=>({...p, tipo:t.id}))} style={{ padding:'9px 10px', borderRadius:9, border:`1.5px solid ${on?CASA.greenLt:CASA.border}`, background: on?CASA.greenXl:'#fff', fontSize:11.5, fontWeight:600, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:15 }}>{t.ic}</span> {t.l}
                  </button>
                )
              })}
            </div>

            <LocLine label="Nome"           value={form.nome}           onChange={v=>setForm(p=>({...p, nome:v}))}           placeholder="Ex: Casa Principal"/>
            <LocLine label="Morada"         value={form.morada}         onChange={v=>setForm(p=>({...p, morada:v}))}/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:10 }}>
              <LocLine label="CP"            value={form.codigo_postal}  onChange={v=>setForm(p=>({...p, codigo_postal:v}))}/>
              <LocLine label="Localidade"    value={form.localidade}     onChange={v=>setForm(p=>({...p, localidade:v}))}/>
            </div>
            <LocLine label="Concelho (p/ alertas meteo IPMA)" value={form.concelho} onChange={v=>setForm(p=>({...p, concelho:v}))} placeholder="Ex: Coimbra"/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              <LocLine label="Ano"           value={form.ano_construcao} onChange={v=>setForm(p=>({...p, ano_construcao:v}))} type="number"/>
              <LocLine label="Tipologia"     value={form.tipologia}      onChange={v=>setForm(p=>({...p, tipologia:v}))}      placeholder="T2"/>
              <LocLine label="Área (m²)"     value={form.area_m2}        onChange={v=>setForm(p=>({...p, area_m2:v}))}        type="number"/>
            </div>

            <div style={{ display:'flex', gap:8, marginTop:14 }}>
              <button onClick={()=>setEditing(null)} disabled={saving} style={{ flex:1, padding:'11px 14px', borderRadius:10, border:`1px solid ${CASA.border}`, background:'#fff', color:'#555', fontWeight:600, fontSize:13, cursor:saving?'default':'pointer' }}>Cancelar</button>
              <button onClick={save} disabled={saving} style={{ flex:2, padding:'11px 14px', borderRadius:10, border:'none', background:saving?CASA.border:CASA.greenLt, color:'#fff', fontWeight:700, fontSize:13, cursor:saving?'default':'pointer', opacity:saving?0.6:1 }}>{saving?'A guardar…':'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LocLine({ label, value, onChange, placeholder, type='text' }){
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{label}</div>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ width:'100%', boxSizing:'border-box', padding:'9px 12px', borderRadius:8, border:`1px solid ${CASA.border}`, fontSize:13, outline:'none', background:'#fff' }}/>
    </div>
  )
}

function AIExpertScreen({ localizacao, equipamentos, authUser, onBack, initialContext }){
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const eqs = (equipamentos || []).filter(e => !localizacao || e.localizacao_id === localizacao.id)

  const systemPrompt = `És o AI Expert de manutenção doméstica do utilizador. Tens o contexto real da casa abaixo.

Localização: ${localizacao?.nome || '—'} (${localizacao?.concelho || '—'}, construção ${localizacao?.ano_construcao || '—'}, ${localizacao?.tipologia || '—'})
Home Score: ${localizacao?.home_score ?? '—'}/100

Equipamentos activos:
${eqs.map(e => `- ${e.nome} (${e.categoria}, classe ${e.classe_energetica || '—'}, ${e.potencia_kw ? e.potencia_kw+'kW' : '—'}, health ${e.health_score ?? '—'})`).join('\n') || '(sem equipamentos)'}

Responde em português de Portugal, conciso, com dados concretos. Quando sugeres acções, referencia os modelos/equipamentos específicos acima. Se não tens dados suficientes, indica explicitamente.`

  const quickChips = [
    'Qual caldeira devo trocar primeiro?',
    'Como reduzo consumo do AC?',
    'Quais revisões estão atrasadas?',
    'Vale a pena painel solar?',
  ]

  // Se entrou com contexto inicial (ex: alerta IPMA), pré-preenche primeira mensagem
  useEffect(() => {
    if(initialContext?.context){
      const c = initialContext.context
      setInput(`${c.titulo}. ${c.desc} — o que recomendas verificar nos equipamentos?`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ask = async (text) => {
    const q = (text || input).trim()
    if(!q) return
    setInput('')
    const history = [...msgs, { role:'user', text:q }]
    setMsgs(history)
    setLoading(true)
    const res = await callClaudeText(q, { system: systemPrompt })
    setLoading(false)
    if(res.error){
      setMsgs(p => [...p, { role:'assistant', text:`Erro: ${res.error}`, error:true }])
      return
    }
    setMsgs(p => [...p, { role:'assistant', text: res.text }])
  }

  return (
    <div style={{ minHeight:'100vh', background:CASA.bg, display:'flex', flexDirection:'column', paddingBottom:88 }}>
      <div style={{ background:CASA.green, padding:'11px 14px', color:'#fff', display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:'#fff', fontSize:20, cursor:'pointer' }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700 }}>AI Expert</div>
          <div style={{ fontSize:10, opacity:0.75 }}>{eqs.length} equipamento{eqs.length===1?'':'s'} no contexto</div>
        </div>
      </div>

      {!ANTHROPIC_KEY && (
        <div style={{ padding:'12px 16px', background:'#7f1d1d', color:'#fff', fontSize:11.5, lineHeight:1.5 }}>
          ⚠️ Falta <b>VITE_ANTHROPIC_API_KEY</b> em <code>.env.local</code>. O AI Expert só responde após configurar a chave e reiniciar o Vite.
        </div>
      )}

      <div style={{ flex:1, padding:'14px 14px 0', overflowY:'auto' }}>
        {msgs.length === 0 && (
          <div style={{ marginBottom:10 }}>
            <div style={{ background:'#fff', border:`1px solid ${CASA.border}`, borderRadius:12, padding:'12px 14px', fontSize:12.5, color:'#333', lineHeight:1.5 }}>
              👋 Sou o AI Expert da sua casa. Posso ajudar com manutenção, substituições, consumos e prioridades. Experimente uma das sugestões abaixo ou escreva uma pergunta.
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10 }}>
              {quickChips.map(q => (
                <button key={q} onClick={()=>ask(q)} disabled={loading || !ANTHROPIC_KEY} style={{
                  background:'#fff', border:`1px solid ${CASA.border}`, borderRadius:14,
                  padding:'6px 12px', fontSize:11, cursor:(loading||!ANTHROPIC_KEY)?'default':'pointer', color:'#555',
                  opacity:(loading||!ANTHROPIC_KEY)?0.5:1,
                }}>{q}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m,i) => (
          <div key={i} style={{
            display:'flex', justifyContent: m.role==='user' ? 'flex-end' : 'flex-start',
            marginBottom:8,
          }}>
            <div style={{
              maxWidth:'82%', padding:'9px 12px', borderRadius:12,
              background: m.role==='user' ? CASA.greenLt : (m.error ? '#FEE2E2' : '#fff'),
              color: m.role==='user' ? '#fff' : (m.error ? '#991b1b' : '#111'),
              border: m.role==='user' ? 'none' : `1px solid ${CASA.border}`,
              fontSize:12.5, lineHeight:1.5, whiteSpace:'pre-wrap',
            }}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display:'flex', justifyContent:'flex-start', marginBottom:8 }}>
            <div style={{ padding:'9px 12px', borderRadius:12, background:'#fff', border:`1px solid ${CASA.border}`, fontSize:12, color:'#999' }}>A pensar…</div>
          </div>
        )}
      </div>

      <div style={{ padding:'10px 14px', borderTop:`1px solid ${CASA.border}`, background:'#fff', display:'flex', gap:8 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); ask() } }}
          placeholder="Escreva a sua pergunta…"
          style={{ flex:1, padding:'10px 12px', borderRadius:9, border:`1px solid ${CASA.border}`, fontSize:13, outline:'none' }}/>
        <button onClick={()=>ask()} disabled={loading || !input.trim() || !ANTHROPIC_KEY} style={{
          background: (loading||!input.trim()||!ANTHROPIC_KEY)?'#ccc':CASA.greenLt, color:'#fff',
          border:'none', borderRadius:9, padding:'10px 16px', fontSize:13, fontWeight:700,
          cursor:(loading||!input.trim()||!ANTHROPIC_KEY)?'default':'pointer',
        }}>Enviar</button>
      </div>
    </div>
  )
}


function CNovaOrdem({ svcI, onBack, onOk, moradas=[], setMoradas }) {
  const defMor = moradas.find(m=>m.def) || moradas[0] || null
  const [step,setStep] = useState(1)
  const [sid,setSid]   = useState(svcI?.id||null)
  const [tid,setTid]   = useState(null)
  const [data,setData] = useState(null)
  const [hora,setHora] = useState(null)
  const [morada,setMorada] = useState(defMor?.morada || '')
  const [cp,    setCp]     = useState(defMor?.cp || '')
  const [moradaId, setMoradaId] = useState(defMor?.id || null)
  const [guardar, setGuardar] = useState(false)
  const [notas,setNotas]   = useState('')
  const [fotos,setFotos]   = useState([])
  const addFotos = async files => {
    const lidas = await Promise.all(Array.from(files).slice(0,8-fotos.length).map(f => new Promise(res => {
      const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f)
    })))
    setFotos(p => [...p, ...lidas].slice(0,8))
  }
  const s    = svcById(sid)
  const tecs = s ? TECNICOS.filter(t=>t.cats.includes(s.cat)) : []
  const hoje = new Date()
  const datas = Array.from({length:7},(_,i)=>{ const d=new Date(hoje); d.setDate(hoje.getDate()+i+1); return d })
  const DN=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'], MN=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const HORAS=['08:00','09:00','10:00','11:00','14:00','15:00','16:00','17:00']
  const cpOk = /^\d{4}-\d{3}$/.test(cp.trim())
  const ok = step===1?!!sid : step===2?true : step===3?!!(data&&hora) : (morada.length>3 && cpOk)
  const LABS = ['Serviço','Equipa','Quando','Morada']
  return (
    <div style={{ minHeight:'100vh', background:C.mist }}>
      <div style={{ background:C.white, padding:'13px 16px', display:'flex', alignItems:'center', gap:10, borderBottom:`1px solid ${C.border}`, position:'sticky', top:0, zIndex:20 }}>
        <button onClick={() => step===1 ? onBack() : setStep(p=>p-1)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:C.navy }}>←</button>
        <div style={{ flex:1 }}><div style={{ fontSize:14, fontWeight:700, color:C.navy }}>Agendar Serviço</div><div style={{ fontSize:10, color:C.slate }}>Passo {step} de 4</div></div>
      </div>
      <div style={{ background:C.white, padding:'0 16px 12px', borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', gap:3, marginBottom:5 }}>{LABS.map((_,i) => <div key={i} style={{ flex:1, height:3, borderRadius:3, background: i+1<=step ? C.g : C.border }}/>)}</div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>{LABS.map((l,i) => <span key={i} style={{ fontSize:9, fontWeight:700, color: i+1<=step ? C.g : '#94a3b8' }}>{l}</span>)}</div>
      </div>
      <div style={{ padding:'14px 16px 100px' }}>
        {step===1 && SVCS.map(sv => (
          <Card key={sv.id} style={{ padding:13, marginBottom:7, border: sid===sv.id ? `2px solid ${C.g}` : undefined }} onClick={() => setSid(sv.id)}>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <span style={{ fontSize:22 }}>{sv.ic}</span>
              <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{sv.n}</div><div style={{ fontSize:11, color:C.slate }}>€{sv.p} {sv.u}</div></div>
              {sid===sv.id && <span style={{ color:C.g, fontSize:17 }}>✓</span>}
            </div>
          </Card>
        ))}
        {step===2 && <>
          <p style={{ fontSize:12, color:C.slate, margin:'0 0 12px', lineHeight:1.5 }}>Escolha o técnico. Todos verificados e com histórico na rede.</p>
          {tecs.map(t => (
            <Card key={t.id} style={{ padding:13, marginBottom:8, border: tid===t.id ? `2px solid ${C.g}` : undefined }} onClick={() => setTid(t.id)}>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <div style={{ position:'relative' }}><Av ini={t.ini} size={46}/>{t.st==='activo'&&<div style={{ position:'absolute', bottom:0, right:0, width:11, height:11, borderRadius:'50%', background:C.gm, border:'2px solid #fff' }}/>}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{t.n}</div>
                  <div style={{ fontSize:10, color:C.slate }}>📍 {t.loc} · {t.anos} anos</div>
                  <div style={{ display:'flex', gap:4, marginTop:2 }}><Stars v={t.r} s={10}/><span style={{ fontSize:10, color:C.slate }}>{t.r} · {t.jobs} serviços</span></div>
                </div>
                {tid===t.id ? <span style={{ color:C.g, fontSize:16 }}>✓</span> : <span style={{ color:C.border, fontSize:15 }}>›</span>}
              </div>
            </Card>
          ))}
          <button onClick={() => setStep(3)} style={{ width:'100%', background:'none', border:`1.5px dashed ${C.border}`, borderRadius:11, padding:11, fontSize:12, color:C.slate, cursor:'pointer', marginTop:4 }}>Sem preferência — atribuir automaticamente</button>
        </>}
        {step===3 && <>
          <h3 style={{ fontSize:13, fontWeight:700, color:C.navy, margin:'0 0 10px' }}>Data preferencial</h3>
          <div style={{ display:'flex', gap:7, overflowX:'auto', paddingBottom:4, marginBottom:18 }}>
            {datas.map((d,i) => (
              <button key={i} onClick={() => setData(d)} style={{ flexShrink:0, width:58, padding:'9px 0', borderRadius:12, border:'none', background: data?.toDateString()===d.toDateString() ? C.navy : C.white, boxShadow:'0 1px 3px rgba(0,0,0,0.07)', display:'flex', flexDirection:'column', alignItems:'center', gap:2, cursor:'pointer' }}>
                <span style={{ fontSize:9, fontWeight:700, color: data?.toDateString()===d.toDateString() ? '#86efac' : C.slate }}>{DN[d.getDay()]}</span>
                <span style={{ fontSize:18, fontWeight:800, color: data?.toDateString()===d.toDateString() ? '#fff' : C.navy }}>{d.getDate()}</span>
                <span style={{ fontSize:9, color: data?.toDateString()===d.toDateString() ? '#86efac' : C.slate }}>{MN[d.getMonth()]}</span>
              </button>
            ))}
          </div>
          <h3 style={{ fontSize:13, fontWeight:700, color:C.navy, margin:'0 0 10px' }}>Hora preferencial</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7 }}>
            {HORAS.map(h => <button key={h} onClick={() => setHora(h)} style={{ padding:'11px 0', borderRadius:10, border:'none', background: hora===h ? C.g : C.white, color: hora===h ? '#fff' : C.navy, fontWeight:700, fontSize:12, cursor:'pointer', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>{h}</button>)}
          </div>
        </>}
        {step===4 && <>
          <Card style={{ padding:16, marginBottom:12 }}>
            {moradas.length>0 && (
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:700, color:C.slate, display:'block', marginBottom:6 }}>Moradas guardadas</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {moradas.map(m => (
                    <button key={m.id} onClick={()=>{ setMoradaId(m.id); setMorada(m.morada); setCp(m.cp); setGuardar(false) }}
                      style={{ padding:'7px 11px', borderRadius:9, border:`1.5px solid ${moradaId===m.id?C.g:C.border}`, background:moradaId===m.id?C.gl:'#fff', color:moradaId===m.id?C.gd:C.navy, fontSize:11, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5, maxWidth:'100%' }}>
                      {m.def && <span style={{ fontSize:9 }}>★</span>}
                      <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:180 }}>{m.label || m.morada}</span>
                    </button>
                  ))}
                  <button onClick={()=>{ setMoradaId(null); setMorada(''); setCp(''); setGuardar(true) }}
                    style={{ padding:'7px 11px', borderRadius:9, border:`1.5px dashed ${C.border}`, background:'transparent', color:C.slate, fontSize:11, fontWeight:600, cursor:'pointer' }}>+ Nova</button>
                </div>
              </div>
            )}
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.slate, display:'block', marginBottom:4 }}>Morada completa</label>
              <input value={morada} onChange={e=>{setMorada(e.target.value);setMoradaId(null)}} placeholder="Rua das Flores, 23" style={{ width:'100%', border:`1.5px solid ${C.border}`, borderRadius:9, padding:'10px 13px', fontSize:13, outline:'none', boxSizing:'border-box', color:C.navy }}/>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.slate, display:'block', marginBottom:4 }}>Código postal</label>
              <input value={cp} onChange={e=>{setCp(e.target.value);setMoradaId(null)}} placeholder="2500-123" maxLength={8}
                style={{ width:'100%', border:`1.5px solid ${cp && !cpOk ? C.red||'#ef4444' : C.border}`, borderRadius:9, padding:'10px 13px', fontSize:13, outline:'none', boxSizing:'border-box', color:C.navy, fontFamily:'ui-monospace,monospace' }}/>
              {cp && !cpOk && <div style={{ fontSize:10, color:'#ef4444', marginTop:4 }}>Formato esperado: 0000-000</div>}
            </div>
            {setMoradas && !moradaId && morada.length>3 && cpOk && (
              <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:C.slate, cursor:'pointer', marginBottom:10 }}>
                <input type="checkbox" checked={guardar} onChange={e=>setGuardar(e.target.checked)}/>
                Guardar esta morada para futuros pedidos
              </label>
            )}
            <label style={{ fontSize:11, fontWeight:700, color:C.slate, display:'block', marginBottom:4 }}>Notas (opcional)</label>
            <textarea value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Ex: 3.º andar sem elevador..." style={{ width:'100%', border:`1.5px solid ${C.border}`, borderRadius:9, padding:'9px 13px', fontSize:13, resize:'none', height:64, outline:'none', boxSizing:'border-box', color:C.navy, marginBottom:12 }}/>
            <label style={{ fontSize:11, fontWeight:700, color:C.slate, display:'block', marginBottom:6 }}>Fotos (opcional · até 8) <span style={{ color:C.slate, fontWeight:500 }}>— ajuda o prestador a preparar-se</span></label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
              {fotos.map((src,i) => (
                <div key={i} style={{ position:'relative', paddingTop:'100%', borderRadius:9, overflow:'hidden', border:`1px solid ${C.border}`, background:'#f1f5f9' }}>
                  <img src={src} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}/>
                  <button onClick={()=>setFotos(p=>p.filter((_,k)=>k!==i))} style={{ position:'absolute', top:3, right:3, width:20, height:20, borderRadius:'50%', background:'rgba(0,0,0,0.65)', color:'#fff', border:'none', fontSize:13, lineHeight:1, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                </div>
              ))}
              {fotos.length<8 && (
                <label style={{ paddingTop:'100%', position:'relative', borderRadius:9, border:`1.5px dashed ${C.border}`, background:'#f8fafc', cursor:'pointer' }}>
                  <input type="file" accept="image/*" multiple capture="environment" onChange={e=>{addFotos(e.target.files); e.target.value=''}} style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer' }}/>
                  <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:C.slate, fontSize:10, fontWeight:700, gap:2 }}>
                    <span style={{ fontSize:20 }}>📷</span>
                    <span>Adicionar</span>
                  </div>
                </label>
              )}
            </div>
          </Card>
          {s && <Card style={{ padding:15 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Resumo</div>
            {[['Serviço',s.n],['Valor',`€${s.p} ${s.u}`],['Técnico',tecById(tid)?.n||'A atribuir'],['Data',data?`${DN[data.getDay()]} ${data.getDate()} ${MN[data.getMonth()]} – ${hora}`:'—']].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #f1f5f9' }}><span style={{ fontSize:11, color:C.slate }}>{l}</span><span style={{ fontSize:11, fontWeight:700, color:C.navy, maxWidth:190, textAlign:'right' }}>{v}</span></div>
            ))}
          </Card>}
        </>}
      </div>
      <FixedBottom>
        <Btn v='green' full dis={!ok} onClick={() => {
          if (step<4) { setStep(p=>p+1); return }
          if (guardar && setMoradas && !moradaId) {
            const nova = { id:`m${Date.now()}`, label:morada.split(',')[0].trim(), morada, cp, def: moradas.length===0 }
            setMoradas(p => [...p, nova])
          }
          onOk({ sid, tid, data, hora, morada, cp, notas, fotos })
        }}>
          {step===4 ? '✓ Confirmar pedido' : 'Continuar →'}
        </Btn>
      </FixedBottom>
    </div>
  )
}

function COrdem({ o, onBack, onChat }) {
  const [aval, setAval] = useState(o.aval)
  const s = svcById(o.sid); const t = tecById(o.tid)
  // V2 fallbacks — ordens V2 não têm s.n/s.p/s.u (sid é null), leem servico_nome/valor_cobrado
  const titulo = s?.n || o.servico_nome || (o.is_personalizado ? 'Serviço personalizado' : 'Serviço')
  const valorText = o.valor_cobrado != null
    ? `€${Number(o.valor_cobrado).toFixed(2).replace('.',',')}`
    : (s?.p != null ? `€${s.p}${s.u ? ' ' + s.u : ''}` : null)
  // ordemLocal.morada tem fallback literal 'Morada por definir' — esconder se não houver morada real
  const moradaText = (o.morada && o.morada !== 'Morada por definir') ? o.morada : null
  return (
    <div style={{ minHeight:'100vh', background:C.mist }}>
      <div style={{ background:C.white, padding:'13px 16px', display:'flex', alignItems:'center', gap:10, borderBottom:`1px solid ${C.border}`, position:'sticky', top:0, zIndex:20 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:C.navy }}>←</button>
        <div style={{ flex:1 }}><div style={{ fontSize:14, fontWeight:700, color:C.navy }}>{titulo}</div><div style={{ fontSize:10, color:C.slate }}>{o.data}</div></div>
        <EstBadge st={o.st}/>
      </div>
      <div style={{ padding:'14px 16px 40px' }}>
        {t && <Card style={{ padding:15, marginBottom:10 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:9 }}>Técnico atribuído</div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <Av ini={t.ini} size={46}/>
            <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{t.n}</div><Stars v={t.r}/><div style={{ fontSize:10, color:C.slate, marginTop:1 }}>📍 {t.loc}</div></div>
            <div style={{ display:'flex', gap:6 }}>
              <button style={{ background:C.gl, border:'none', borderRadius:8, width:34, height:34, fontSize:14, cursor:'pointer' }}>📞</button>
              <button onClick={onChat} style={{ background:C.gl, border:'none', borderRadius:8, width:34, height:34, fontSize:14, cursor:'pointer', position:'relative' }}>
                💬
                {(CHAT_INIT[o.id]||[]).filter(m=>m.tipo==='user_provider').length>0&&<span style={{position:'absolute',top:-2,right:-2,width:10,height:10,background:C.g,borderRadius:'50%',border:'1.5px solid #fff'}}/>}
              </button>
            </div>
          </div>
        </Card>}
        <Card style={{ padding:15, marginBottom:10 }}>
          {[
            o.descricao_personalizada && ['Descrição', o.descricao_personalizada],
            moradaText && ['Morada', moradaText],
            o.cp && ['Cód. postal', o.cp],
            valorText && ['Valor', valorText],
            o.dt_pedido && ['Pedido em', o.dt_pedido],
            o.inicio_ts && ['Início', new Date(o.inicio_ts).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})],
            o.fim_ts    && ['Fim',    new Date(o.fim_ts).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})],
            o.duracao_min && ['Duração', o.duracao_min<60 ? `${o.duracao_min} min` : `${Math.floor(o.duracao_min/60)}h${String(o.duracao_min%60).padStart(2,'0')}`],
            o.notas && ['Notas', o.notas],
          ].filter(Boolean).map(([l,v]) => (
            <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #f1f5f9' }}><span style={{ fontSize:11, color:C.slate }}>{l}</span><span style={{ fontSize:11, fontWeight:700, color:C.navy, maxWidth:200, textAlign:'right' }}>{v}</span></div>
          ))}
        </Card>
        {o.fotos.length>0 && <Card style={{ padding:15, marginBottom:10 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:9 }}>Relatório fotográfico</div>
          <div style={{ display:'flex', gap:7, marginBottom:8, flexWrap:'wrap' }}>{o.fotos.map((f,i) => <FotoThumb key={i} src={f} size={68} radius={10}/>)}</div>
          {o.ass && <div style={{ fontSize:11, color:C.g, fontWeight:600, background:C.gl, padding:'6px 10px', borderRadius:7 }}>✅ Assinado digitalmente</div>}
        </Card>}
        {o.st==='concluida' && <Card style={{ padding:15 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:9 }}>A sua avaliação</div>
          <div style={{ display:'flex', gap:5, justifyContent:'center' }}>{[1,2,3,4,5].map(i => <button key={i} onClick={() => setAval(i)} style={{ fontSize:26, background:'none', border:'none', cursor:'pointer', filter: i<=(aval||0) ? 'none' : 'grayscale(1)' }}>⭐</button>)}</div>
          {aval && <p style={{ textAlign:'center', fontSize:11, color:C.g, marginTop:6, fontWeight:600 }}>Obrigado pela avaliação!</p>}
        </Card>}
      </div>
    </div>
  )
}

/* ══════════════════════════════════
   PRESTADOR
══════════════════════════════════ */
function PDash({ ordens, onOrdem, onCarteira, onChat, onNavMenu }) {
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [menuActivo,  setMenuActivo]  = useState(null)
  const eu      = TECNICOS[0]
  const nc      = NIVEIS[eu.nivel]
  const minhas  = ordens.filter(o => o.tid===eu.id)
  const abertas = minhas.filter(o => o.st!=='concluida')
  const feitas  = minhas.filter(o => o.st==='concluida')

  const handleMenu = id => {
    setMenuActivo(id)
    if (id==='carteira')     { onCarteira?.(); return }
    if (id==='mensagens')    { onChat?.(); return }
    onNavMenu?.(id)
  }

  return (
    <div style={{ minHeight:'100vh', background:C.mist }}>
      <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} onNavigate={handleMenu} user={{ n:eu.n, ini:eu.ini, id_num:'301612811', nivel:eu.nivel }} activeItem={menuActivo}/>
      <div style={{ background:`linear-gradient(145deg,${C.navy},${C.gd})`, padding:'22px 20px 18px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {/* Hamburguer ☰ */}
            <button onClick={() => setDrawerOpen(true)} style={{ background:'none', border:'none', cursor:'pointer', padding:6, display:'flex', flexDirection:'column', gap:5 }}>
              {[0,1,2].map(i => <div key={i} style={{ width:22, height:2, background:'#fff', borderRadius:2 }}/>)}
            </button>
            <div>
              <div style={{ color:'#94a3b8', fontSize:10, marginBottom:2 }}>Bem-vindo,</div>
              <h1 style={{ color:'#fff', fontSize:18, fontWeight:800, margin:'0 0 3px' }}>{eu.n}</h1>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:C.gm, display:'inline-block' }}/>
                <span style={{ color:'#86efac', fontSize:10, fontWeight:600 }}>Disponível</span>
              </div>
            </div>
          </div>
          <Av ini={eu.ini} size={50}/>
        </div>
        <div onClick={onCarteira} style={{ background:'rgba(255,255,255,0.09)', borderRadius:13, padding:'12px 14px', cursor:'pointer', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <span style={{ fontSize:24 }}>💰</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10, color:'#94a3b8', marginBottom:1 }}>A minha carteira</div>
            <div style={{ fontSize:20, fontWeight:800, color:'#fff' }}>€105,00</div>
            <div style={{ fontSize:9, color:'#94a3b8' }}>+€57,00 pendente · toque para gerir</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:9, color:'#86efac', fontWeight:700, background:'rgba(34,197,94,0.15)', padding:'3px 7px', borderRadius:7 }}>{nc.ic} {nc.l}</div>
            <div style={{ fontSize:9, color:'#94a3b8', marginTop:3 }}>{nc.taxa}% taxa</div>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:7 }}>
          {[['📋',abertas.length,'Em aberto'],['✅',feitas.length,'Concluídas'],['⭐',eu.r,'Avaliação']].map(([ic,v,l]) => (
            <div key={l} style={{ background:'rgba(255,255,255,0.07)', borderRadius:10, padding:'10px 7px', textAlign:'center' }}>
              <div style={{ fontSize:14 }}>{ic}</div><div style={{ color:'#fff', fontSize:16, fontWeight:800 }}>{v}</div><div style={{ color:'#94a3b8', fontSize:8 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding:'14px 16px 20px' }}>
        <h2 style={{ fontSize:14, fontWeight:700, color:C.navy, margin:'0 0 10px' }}>Ordens atribuídas</h2>
        {abertas.length===0 && <div style={{ textAlign:'center', padding:24, color:C.slate, fontSize:13 }}>Sem ordens activas</div>}
        {abertas.map(o => { const s=svcById(o.sid); return (
          <Card key={o.id} style={{ padding:13, marginBottom:7 }} onClick={() => onOrdem(o)}>
            <div style={{ display:'flex', gap:9, alignItems:'center' }}>
              <span style={{ fontSize:22 }}>{s?.ic||'🔧'}</span>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ fontSize:12, fontWeight:700, color:C.navy }}>{s?.n}</span><EstBadge st={o.st}/></div>
                <div style={{ fontSize:10, color:C.slate, marginTop:1 }}>📍 {o.morada}</div>
                <div style={{ fontSize:10, color:C.g, fontWeight:600, marginTop:1 }}>🕐 {o.data}</div>
              </div>
            </div>
          </Card>
        )})}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:10 }}>
          <button onClick={onCarteira} style={{ background:C.navy, color:'#fff', border:'none', borderRadius:11, padding:'12px', fontSize:12, fontWeight:700, cursor:'pointer' }}>💰 Carteira</button>
          <button onClick={onChat}     style={{ background:C.white, color:C.navy, border:`1.5px solid ${C.border}`, borderRadius:11, padding:'12px', fontSize:12, fontWeight:700, cursor:'pointer' }}>💬 Mensagens</button>
        </div>
      </div>
    </div>
  )
}

function PExec({ o, onBack, onUpdate, onChat }) {
  const s = svcById(o.sid)
  const [fase,    setFase]    = useState(o.st==='em_curso'?'exec':o.st==='concluida'?'done':'aceitar')
  const [fotos,   setFotos]   = useState(o.fotos||[])
  const [novaHora,setNovaHora]= useState(false)   // sheet de propor hora
  const [horaProp,setHoraProp]= useState(o.hora||'')
  const [motivo,  setMotivo]  = useState('')
  const [propEnviada,setPropEnviada] = useState(false)
  const [geoBusy, setGeoBusy] = useState(false)
  const [geoErr,  setGeoErr]  = useState(null)

  const pedirGeo = () => new Promise(res => {
    if (!navigator.geolocation) { res(null); return }
    navigator.geolocation.getCurrentPosition(
      p => res({ lat:p.coords.latitude, lng:p.coords.longitude, acc:Math.round(p.coords.accuracy), ts:Date.now() }),
      ()=>res(null),
      { enableHighAccuracy:true, timeout:12000, maximumAge:0 }
    )
  })

  const iniciarServico = async () => {
    setGeoBusy(true); setGeoErr(null)
    const loc = await pedirGeo()
    setGeoBusy(false)
    if (!loc) { setGeoErr('Não foi possível obter a localização. Ative o GPS e tente novamente.'); return }
    const inicio_ts = Date.now()
    setFase('exec')
    onUpdate && onUpdate({ ...o, st:'em_curso', inicio_ts, inicio_loc: loc })
  }

  const concluirServico = async () => {
    setGeoBusy(true); setGeoErr(null)
    const loc = await pedirGeo()
    setGeoBusy(false)
    const fim_ts = Date.now()
    const duracao_min = o.inicio_ts ? Math.max(1, Math.round((fim_ts - o.inicio_ts) / 60000)) : null
    const upd = { ...o, st:'concluida', fotos, ass:true, fim_ts, fim_loc: loc, duracao_min }
    onUpdate && onUpdate(upd); setFase('done')
  }

  const fmtDur = m => m==null ? '—' : m<60 ? `${m} min` : `${Math.floor(m/60)}h${String(m%60).padStart(2,'0')}`

  const FL = ['Aceitar','Executar','Fotos','Assinar','Concluído']
  const fi = ['aceitar','exec','fotos','assinar','done'].indexOf(fase)

  const abrirMapa = () => {
    const q = encodeURIComponent(`${o.morada}, Portugal`)
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank')
  }

  const DIAS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
  const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  // Formata data + hora: "Sáb, 15 Abr · 11:00h"
  const dataFormatada = (() => {
    if (!o.data) return '—'
    if (o.data==='Hoje')   { const d=new Date(); return `${DIAS_PT[d.getDay()]}, ${d.getDate()} ${MESES_PT[d.getMonth()]} · ${o.hora||''}` }
    if (o.data==='Amanhã') { const d=new Date(); d.setDate(d.getDate()+1); return `${DIAS_PT[d.getDay()]}, ${d.getDate()} ${MESES_PT[d.getMonth()]} · ${o.hora||''}` }
    return `${o.data} · ${o.hora||''}`.trim().replace(/ ·\s*$/, '')
  })()

  // Gerar slots de hora disponíveis (08:00 → 19:00)
  const SLOTS_HORA = Array.from({length:24},(_,i)=>{
    const h = 8 + Math.floor(i/2), m = i%2===0?'00':'30'
    return `${String(h).padStart(2,'0')}:${m}`
  }).filter(h=>h<='19:00')

  return (
    <div style={{ minHeight:'100vh', background:C.mist }}>
      <Header title={s?.n||'Ordem'} sub={o.morada} onBack={onBack} right={
        <button onClick={onChat} style={{background:'rgba(255,255,255,0.1)',border:'none',borderRadius:8,padding:'6px 10px',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
          💬 Chat {(CHAT_INIT[o.id]||[]).filter(m=>m.tipo!=='system_auto').length>0?<span style={{background:C.g,borderRadius:'50%',width:14,height:14,fontSize:8,display:'flex',alignItems:'center',justifyContent:'center'}}>{(CHAT_INIT[o.id]||[]).filter(m=>m.tipo!=='system_auto').length}</span>:null}
        </button>
      }/>

      {/* Stepper */}
      <div style={{ background:C.navy, padding:'0 16px 12px' }}>
        <div style={{ display:'flex', alignItems:'center' }}>
          {FL.map((l,i) => (
            <React.Fragment key={i}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                <div style={{ width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, background: i<=fi ? C.g : 'rgba(255,255,255,0.1)', color: i<=fi ? '#fff' : '#4A5C6A' }}>{i+1}</div>
                <span style={{ fontSize:8, color: i<=fi ? '#86efac' : '#4A5C6A', fontWeight:700, whiteSpace:'nowrap' }}>{l}</span>
              </div>
              {i<4 && <div style={{ flex:1, height:2, background: i<fi ? C.g : 'rgba(255,255,255,0.1)', margin:'0 3px', marginBottom:12 }}/>}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div style={{ padding:'14px 16px 110px' }}>
        {/* Ficha da ordem */}
        <Card style={{ padding:14, marginBottom:12 }}>
          {[
            ['Cliente',  o.cli],
            ['Morada',   o.morada],
            o.cp && ['Cód. postal', o.cp],
            ['Data/Hora',dataFormatada],
            o.dt_pedido && ['Pedido em', o.dt_pedido],
            o.km && ['Distância', `📏 ${o.km} km`],
            o.inicio_ts && ['Início', new Date(o.inicio_ts).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})],
            o.fim_ts    && ['Fim',    new Date(o.fim_ts).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})],
            o.duracao_min && ['Duração', fmtDur(o.duracao_min)],
            o.notas && ['Notas', o.notas],
          ].filter(Boolean).map(([l,v]) => (
            <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'7px 0', borderBottom:'1px solid #f1f5f9' }}>
              <span style={{ fontSize:11, color:C.slate, flexShrink:0, marginRight:8 }}>{l}</span>
              <span style={{ fontSize:12, fontWeight:700, color: l==='Distância'?C.g:C.navy, textAlign:'right', maxWidth:220 }}>{v}</span>
            </div>
          ))}
          {/* Botão Ver no Mapa */}
          <button onClick={abrirMapa} style={{ width:'100%', marginTop:10, padding:'9px', border:`1.5px solid ${C.g}`, borderRadius:10, background:C.gl, color:C.gd, fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            🗺️ Ver no Google Maps
          </button>
        </Card>

        {/* FASE: Aceitar */}
        {fase==='aceitar' && <>
          {propEnviada
            ? <div style={{ background:C.gl, borderRadius:12, padding:'14px 16px', marginBottom:12, border:'1px solid rgba(22,163,74,0.2)', textAlign:'center' }}>
                <div style={{ fontSize:20, marginBottom:6 }}>✅</div>
                <div style={{ fontSize:13, fontWeight:700, color:C.gd }}>Proposta enviada ao cliente</div>
                <div style={{ fontSize:11, color:C.slate, marginTop:3 }}>Nova hora sugerida: <strong>{horaProp}</strong></div>
                <button onClick={()=>setPropEnviada(false)} style={{ marginTop:8, fontSize:11, color:C.slate, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Cancelar proposta</button>
              </div>
            : <Card style={{ padding:14, marginBottom:10, border:`2px solid ${C.g}` }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:5 }}>Aceitar esta ordem?</div>
                <div style={{ fontSize:11, color:C.slate, lineHeight:1.5, marginBottom:0 }}>
                  Confirme disponibilidade para <strong style={{ color:C.navy }}>{dataFormatada}</strong>
                </div>
              </Card>
          }
          {!propEnviada && <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {geoErr && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#b91c1c', borderRadius:10, padding:'8px 12px', fontSize:11 }}>📍 {geoErr}</div>}
            <div style={{ display:'flex', gap:8 }}>
              <Btn full v='ghost' onClick={onBack} dis={geoBusy}>Recusar</Btn>
              <Btn full onClick={iniciarServico} dis={geoBusy}>{geoBusy?'📍 A localizar…':'📍 Iniciar serviço'}</Btn>
            </div>
            <div style={{ fontSize:10, color:C.slate, textAlign:'center', marginTop:-2 }}>Ao iniciar, é registada a localização e a hora para contabilizar o tempo.</div>
            <button onClick={()=>setNovaHora(true)} style={{ width:'100%', padding:'11px', border:`1.5px solid ${C.border}`, borderRadius:12, background:C.white, color:C.slate, fontSize:12, fontWeight:600, cursor:'pointer' }}>
              🕐 Propor nova hora
            </button>
          </div>}
        </>}

        {/* FASE: Em execução */}
        {fase==='exec' && <>
          <div style={{ background:C.gl, borderRadius:11, padding:12, border:'1px solid rgba(22,163,74,0.2)', marginBottom:12 }}>
            <p style={{ fontSize:12, color:C.g, fontWeight:600, margin:0 }}>✅ Em execução — avance quando terminar</p>
          </div>
          <Btn full onClick={() => setFase('fotos')}>📸 Relatório fotográfico →</Btn>
        </>}

        {/* FASE: Fotos */}
        {fase==='fotos' && <>
          <Card style={{ padding:14, marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:9 }}>Relatório fotográfico</div>
            <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:8 }}>
              {fotos.map((f,i) => <FotoThumb key={i} src={f} size={66} radius={9}/>)}
              <button onClick={() => setFotos(f=>[...f,'📷'])} style={{ width:66, height:66, borderRadius:9, border:`2px dashed ${C.g}`, background:'transparent', fontSize:18, cursor:'pointer', color:C.g }}>+</button>
            </div>
            <p style={{ fontSize:10, color:C.slate, margin:0 }}>Mínimo 2 fotos — antes e depois.</p>
          </Card>
          <Btn full dis={fotos.length<2} onClick={() => setFase('assinar')}>Enviar ao cliente para assinar →</Btn>
        </>}

        {/* FASE: Assinar */}
        {fase==='assinar' && <>
          <Card style={{ padding:14, marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:9 }}>Assinatura digital do cliente</div>
            <div style={{ background:'#f8fafc', borderRadius:10, padding:14, textAlign:'center', border:`1px dashed ${C.border}` }}>
              <div style={{ fontSize:26, marginBottom:5 }}>✍️</div>
              <div style={{ fontSize:12, color:C.slate }}>A aguardar assinatura de<br/><strong style={{ color:C.navy }}>{o.cli}</strong></div>
            </div>
          </Card>
          {geoErr && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#b91c1c', borderRadius:10, padding:'8px 12px', fontSize:11, marginBottom:8 }}>📍 {geoErr}</div>}
          <Btn v='green' full onClick={concluirServico} dis={geoBusy}>{geoBusy?'📍 A localizar…':'📍 Fechar serviço (regista localização)'}</Btn>
        </>}

        {/* FASE: Concluído */}
        {fase==='done' && <>
          <div style={{ textAlign:'center', padding:'16px 0' }}>
            <div style={{ width:72, height:72, borderRadius:'50%', background:C.gl, display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto 12px' }}>✅</div>
            <h2 style={{ fontSize:17, fontWeight:800, color:C.navy, marginBottom:5 }}>Serviço Concluído!</h2>
            <p style={{ fontSize:12, color:C.slate, lineHeight:1.5 }}>Relatório entregue e assinado.<br/>Pagamento em processamento.</p>
          </div>
          <Card style={{ padding:14, marginTop:12 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Resumo de pagamento</div>
            {[
              ['Serviço',     s?.n||'—'],
              ['Data',        dataFormatada],
              ['Valor total', `€${s?.p||'—'}`],
              ['Taxa Gold 18%',`€${((s?.p||0)*0.18).toFixed(2)}`],
              ['Recebido',    `€${((s?.p||0)*0.82).toFixed(2)}`],
              ['Via',         'Swan.io SEPA CT'],
              ['Prazo',       'Disponível em 24h'],
            ].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #f1f5f9' }}>
                <span style={{ fontSize:11, color:C.slate }}>{l}</span>
                <span style={{ fontSize:11, fontWeight:700, color: l==='Recebido'?C.g:C.navy }}>{v}</span>
              </div>
            ))}
          </Card>
        </>}
      </div>

      {/* Bottom sheet — Propor nova hora */}
      {novaHora && <>
        <div onClick={()=>setNovaHora(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:50 }}/>
        <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, background:C.white, borderRadius:'22px 22px 0 0', zIndex:51, padding:'20px 20px 32px' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'#e2e8f0', margin:'0 auto 16px' }}/>
          <h3 style={{ fontSize:15, fontWeight:800, color:C.navy, marginBottom:4 }}>Propor nova hora</h3>
          <p style={{ fontSize:12, color:C.slate, marginBottom:16 }}>Seleciona o horário que preferes para <strong>{o.data}</strong>. O cliente irá receber a proposta.</p>

          {/* Selector de hora em grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7, marginBottom:14, maxHeight:200, overflowY:'auto' }}>
            {SLOTS_HORA.map(h => (
              <button key={h} onClick={()=>setHoraProp(h)} style={{ padding:'9px 0', borderRadius:10, border:`1.5px solid ${horaProp===h?C.g:C.border}`, background:horaProp===h?C.gl:'#fff', color:horaProp===h?C.gd:C.navy, fontSize:13, fontWeight:horaProp===h?700:500, cursor:'pointer' }}>
                {h}
              </button>
            ))}
          </div>

          {/* Motivo (opcional) */}
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:10, fontWeight:700, color:C.slate, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.04em' }}>Motivo (opcional)</label>
            <input value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder='Ex: Tenho outro serviço ao mesmo tempo' style={{ width:'100%', border:`1.5px solid ${C.border}`, borderRadius:10, padding:'9px 12px', fontSize:13, outline:'none', color:C.navy, boxSizing:'border-box' }}/>
          </div>

          <div style={{ display:'flex', gap:9 }}>
            <button onClick={()=>setNovaHora(false)} style={{ flex:1, padding:'12px', border:`1.5px solid ${C.border}`, borderRadius:12, background:C.white, color:C.navy, fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
            <button onClick={()=>{ setNovaHora(false); setPropEnviada(true) }} disabled={!horaProp} style={{ flex:2, padding:'12px', border:'none', borderRadius:12, background:horaProp?C.g:'#cbd5e1', color:'#fff', fontSize:13, fontWeight:800, cursor:horaProp?'pointer':'default' }}>
              📤 Enviar proposta ({horaProp||'—'})
            </button>
          </div>
        </div>
      </>}
    </div>
  )
}

function PCarteira({ onBack, ordens=[], onOrdem }) {
  const [tab,setTab]         = useState('visao')
  const [showLev,setShowLev] = useState(false)
  const [valor,setValor]     = useState('')
  const [ok,setOk]           = useState(false)
  const [periodoTrans, setPeriodoTrans] = useState(15)  // ← estado do filtro de período
  const nivel='gold'; const nc=NIVEIS[nivel]
  const nKeys=Object.keys(NIVEIS); const prox=nKeys[nKeys.indexOf(nivel)+1]; const pc=prox?NIVEIS[prox]:null
  const saldo=105.00; const pend=57.00
  const icMov = { credito:{ic:'✅',bg:C.gl,cor:C.g}, levantar:{ic:'💸',bg:'#eff6ff',cor:'#1d4ed8'}, bonus:{ic:'⭐',bg:'#fef3c7',cor:C.amber}, seguro:{ic:'🛡️',bg:C.mist,cor:C.slate} }

  // Dados completos de transações
  const TODAS_TRANS = [
    {id:'p1', tipo:'credito', v:57.00,  d:'Limpeza Mensal — Rua das Flores', mes:'Abr 2026', dt:'Hoje 14:32',  st:'pendente'},
    {id:'p2', tipo:'credito', v:91.00,  d:'Limpeza Pós-Obra — Ed. Roma',     mes:'Abr 2026', dt:'20 Abr',      st:'disponivel'},
    {id:'p3', tipo:'credito', v:57.00,  d:'Limpeza Mensal — Av. Brasil',     mes:'Abr 2026', dt:'18 Abr',      st:'disponivel'},
    {id:'p4', tipo:'levantar',v:-145.00,d:'Levantamento IBAN pessoal',       mes:'Abr 2026', dt:'10 Abr',      st:'processado'},
    {id:'p5', tipo:'bonus',   v:10.00,  d:'Bónus avaliação perfeita',        mes:'Abr 2026', dt:'1 Abr',       st:'disponivel'},
    {id:'p6', tipo:'credito', v:75.00,  d:'Limpeza Mensal — Cond. Sol',      mes:'Mar 2026', dt:'28 Mar',      st:'disponivel'},
    {id:'p7', tipo:'levantar',v:-200.00,d:'Levantamento IBAN pessoal',       mes:'Mar 2026', dt:'10 Mar',      st:'processado'},
    {id:'p8', tipo:'credito', v:45.00,  d:'Manutenção Jardim — Sra. Alves', mes:'Mar 2026', dt:'5 Mar',       st:'disponivel'},
    {id:'p9', tipo:'seguro',  v:-8.50,  d:'Seguro RC Grupo — Mar',          mes:'Mar 2026', dt:'1 Mar',       st:'processado'},
    {id:'p10',tipo:'credito', v:80.00,  d:'Instalação Elétrica — Ed. ABC',  mes:'Fev 2026', dt:'22 Fev',      st:'disponivel'},
    {id:'p11',tipo:'credito', v:57.00,  d:'Limpeza Mensal — Sr. Ferreira',  mes:'Fev 2026', dt:'15 Fev',      st:'disponivel'},
    {id:'p12',tipo:'levantar',v:-180.00,d:'Levantamento IBAN pessoal',      mes:'Fev 2026', dt:'10 Fev',      st:'processado'},
    {id:'p13',tipo:'bonus',   v:15.00,  d:'Bónus nível Gold desbloqueado',  mes:'Jan 2026', dt:'31 Jan',      st:'disponivel'},
    {id:'p14',tipo:'credito', v:57.00,  d:'Limpeza Mensal — Cond. Verde',   mes:'Jan 2026', dt:'20 Jan',      st:'disponivel'},
    {id:'p15',tipo:'levantar',v:-120.00,d:'Levantamento IBAN pessoal',      mes:'Jan 2026', dt:'10 Jan',      st:'processado'},
  ]
  // Transações filtradas pelo período (pendentes sempre incluídas)
  const MESES_PERIODO = { 15:['Abr 2026'], 30:['Abr 2026','Mar 2026'], 90:['Abr 2026','Mar 2026','Fev 2026'], 365:['Abr 2026','Mar 2026','Fev 2026','Jan 2026'] }
  const mesesActivos = MESES_PERIODO[periodoTrans] || MESES_PERIODO[15]
  const transFiltradas = TODAS_TRANS.filter(t => t.st==='pendente' || mesesActivos.includes(t.mes))
  const totalPeriodo = transFiltradas.filter(t=>t.st!=='pendente').reduce((a,t)=>a+t.v,0)
  const porMes = transFiltradas.reduce((acc,t) => { const k=t.st==='pendente'?'⏳ Pendentes':t.mes; (acc[k]=acc[k]||[]).push(t); return acc }, {})
  const ordenaMeses = Object.keys(porMes).sort((a,b)=>a==='⏳ Pendentes'?-1:b==='⏳ Pendentes'?1:0)

  if (ok) return (
    <div style={{ minHeight:'100vh', background:C.mist, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', padding:'30px 20px' }}>
        <div style={{ width:80, height:80, borderRadius:'50%', background:C.gl, display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, margin:'0 auto 16px' }}>✅</div>
        <h2 style={{ fontSize:19, fontWeight:800, color:C.navy, marginBottom:6 }}>Levantamento solicitado!</h2>
        <p style={{ fontSize:13, color:C.slate, lineHeight:1.5, marginBottom:4 }}>€{valor} será transferido para o seu IBAN</p>
        <p style={{ fontSize:11, color:C.slate, marginBottom:22 }}>Swan.io · SEPA CT · D+1 útil</p>
        <Btn v='green' full onClick={() => { setOk(false); setShowLev(false); setValor('') }}>Voltar à carteira</Btn>
      </div>
    </div>
  )

  if (showLev) return (
    <div style={{ minHeight:'100vh', background:C.mist }}>
      <Header title='Levantar Saldo' onBack={() => setShowLev(false)}/>
      <div style={{ padding:'18px 16px 40px' }}>
        <Card style={{ padding:20, marginBottom:14, background:`linear-gradient(135deg,${C.navy},${C.gd})` }}>
          <div style={{ fontSize:11, color:'#86efac', fontWeight:600, marginBottom:3 }}>Saldo disponível</div>
          <div style={{ fontSize:36, fontWeight:800, color:'#fff' }}>€{saldo.toFixed(2)}</div>
          <div style={{ fontSize:10, color:'#94a3b8', marginTop:3 }}>Transferência D+1 via Swan SEPA CT</div>
        </Card>
        <Card style={{ padding:14, marginBottom:12 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>IBAN de Destino</div>
          <div style={{ background:C.mist, borderRadius:9, padding:'9px 12px', fontFamily:'monospace', fontSize:12, color:C.navy, marginBottom:5 }}>PT50 0035 …</div>
          <div style={{ fontSize:10, color:C.slate }}>António Ferreira · Conta pessoal</div>
        </Card>
        <Card style={{ padding:14, marginBottom:12 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Valor a levantar</div>
          <div style={{ display:'flex', alignItems:'center', background:C.mist, borderRadius:11, padding:'11px 14px', border:`2px solid ${valor?C.g:C.border}`, marginBottom:10 }}>
            <span style={{ fontSize:20, fontWeight:800, color:C.slate, marginRight:4 }}>€</span>
            <input type='number' value={valor} onChange={e=>setValor(e.target.value)} placeholder='0.00' style={{ flex:1, background:'transparent', border:'none', outline:'none', fontSize:20, fontWeight:800, color:C.navy }}/>
          </div>
          <div style={{ display:'flex', gap:7 }}>
            {[25,50,100,'Tudo'].map(v => <button key={v} onClick={() => setValor(v==='Tudo'?saldo.toFixed(2):String(Math.min(v,saldo)))} style={{ flex:1, padding:'7px 0', borderRadius:9, border:`1.5px solid ${C.border}`, background:C.white, fontSize:11, fontWeight:700, color:C.navy, cursor:'pointer' }}>{v==='Tudo'?'Tudo':`€${v}`}</button>)}
          </div>
        </Card>
        <Btn full v='green' dis={!valor||parseFloat(valor)<=0||parseFloat(valor)>saldo} onClick={() => setOk(true)}>Confirmar levantamento →</Btn>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:C.mist }}>
      <div style={{ background:C.navy, padding:'13px 16px 0', position:'sticky', top:0, zIndex:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <button onClick={onBack} style={{ background:'none', border:'none', color:'#fff', fontSize:22, cursor:'pointer', padding:0 }}>←</button>
          <div style={{ flex:1, fontSize:15, fontWeight:700, color:'#fff' }}>A minha Carteira</div>
          <span style={{ fontSize:10, background:nc.bg, color:nc.cor, padding:'3px 9px', borderRadius:10, fontWeight:700 }}>{nc.ic} {nc.l}</span>
        </div>
        <div style={{ display:'flex' }}>
          {[{id:'visao',l:'Resumo'},{id:'movimentos',l:'Transações'},{id:'beneficios',l:'Benefícios'},{id:'niveis',l:'Níveis'}].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, padding:'8px 0', background:'none', border:'none', borderBottom: tab===t.id ? `2px solid ${C.gm}` : '2px solid transparent', color: tab===t.id ? '#86efac' : '#94a3b8', fontSize:10, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>{t.l}</button>
          ))}
        </div>
      </div>
      <div style={{ padding:'14px 16px 40px' }}>
        {tab==='visao' && <>
          <div style={{ background:`linear-gradient(135deg,${C.navy},${C.gd})`, borderRadius:18, padding:20, marginBottom:12 }}>
            <div style={{ fontSize:11, color:'#86efac', fontWeight:600, marginBottom:3 }}>Saldo disponível</div>
            <div style={{ fontSize:38, fontWeight:800, color:'#fff', marginBottom:14 }}>€{saldo.toFixed(2)}</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9, marginBottom:18 }}>
              {[['⏳ Pendente',`€${pend.toFixed(2)}`,'Aguarda 24h'],['📊 Total ganho','€892,00','Desde o início']].map(([l,v,s]) => (
                <div key={l} style={{ background:'rgba(255,255,255,0.08)', borderRadius:10, padding:'9px 10px' }}>
                  <div style={{ fontSize:10, color:'#94a3b8', marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:15, fontWeight:800, color:'#fff' }}>{v}</div>
                  <div style={{ fontSize:8, color:'#64748b', marginTop:1 }}>{s}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowLev(true)} style={{ width:'100%', background:C.g, color:'#fff', border:'none', borderRadius:11, padding:'12px', fontSize:13, fontWeight:800, cursor:'pointer' }}>💸 Levantar saldo agora</button>
          </div>
          {pend>0 && <Card style={{ padding:13, marginBottom:12, border:'1px solid #fcd34d' }}>
            <div style={{ display:'flex', gap:9, alignItems:'center' }}>
              <span style={{ fontSize:20 }}>⏳</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.navy }}>€{pend.toFixed(2)} em processamento</div>
                <div style={{ fontSize:10, color:C.slate }}>Limpeza Mensal — Hoje 14:32 · Confirmação em 24h</div>
              </div>
            </div>
          </Card>}
          <Card style={{ padding:14, marginBottom:12 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>ESTE MÊS</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:9 }}>
              {[['6','Serviços','concluídos'],['€342','Ganhos','brutos'],['€205','Levantado','transferido']].map(([v,l,s]) => (
                <div key={l} style={{ textAlign:'center', background:C.mist, borderRadius:10, padding:'10px 6px' }}>
                  <div style={{ fontSize:18, fontWeight:800, color:C.navy }}>{v}</div>
                  <div style={{ fontSize:10, fontWeight:700, color:C.slate }}>{l}</div>
                  <div style={{ fontSize:8, color:'#94a3b8' }}>{s}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card style={{ padding:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:'0.05em' }}>ÚLTIMOS MOVIMENTOS</div>
              <button onClick={() => setTab('movimentos')} style={{ fontSize:10, color:C.g, fontWeight:600, background:'none', border:'none', cursor:'pointer' }}>Ver tudo →</button>
            </div>
            {MOVS.slice(0,4).map(m => { const s=icMov[m.tipo]||icMov.credito;
              const ordemM = m.oid ? ordens.find(o=>o.id===m.oid) : null
              return (
              <div key={m.id} onClick={()=>ordemM&&onOrdem&&onOrdem(ordemM)}
                style={{ display:'flex', gap:9, alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f1f5f9', cursor:ordemM&&onOrdem?'pointer':'default' }}>
                <div style={{ width:32, height:32, borderRadius:9, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>{s.ic}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:C.navy, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.d}</div>
                  <div style={{ fontSize:9, color:C.slate }}>{m.dt}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                  <div style={{ fontSize:13, fontWeight:800, color: m.v>0 ? C.g : C.slate }}>{m.v>0?'+':''}{m.v.toFixed(2)}€</div>
                  {ordemM && onOrdem && <span style={{ color:C.border, fontSize:13 }}>›</span>}
                </div>
              </div>
            )})}
          </Card>
        </>}
        {tab==='movimentos' && <>
          {/* Filtro de período — menor primeiro */}
          <div style={{ display:'flex', gap:6, marginBottom:14 }}>
            {[{v:15,l:'15 dias'},{v:30,l:'30 dias'},{v:90,l:'90 dias'},{v:365,l:'Último ano'}].map(p=>(
              <button key={p.v} onClick={()=>setPeriodoTrans(p.v)} style={{ flex:1, padding:'8px 3px', borderRadius:20, border:`1.5px solid ${periodoTrans===p.v?C.g:C.border}`, background: periodoTrans===p.v?C.gl:C.white, color: periodoTrans===p.v?C.gd:C.slate, fontWeight:700, fontSize:10, cursor:'pointer' }}>{p.l}</button>
            ))}
          </div>
          {/* Total do período */}
          <div style={{ background:`linear-gradient(135deg,${C.navy},${C.gd})`, borderRadius:14, padding:'14px 16px', marginBottom:14 }}>
            <div style={{ fontSize:10, color:'#86efac', fontWeight:600, marginBottom:2 }}>Total — últimos {periodoTrans===365?'ano':periodoTrans+' dias'}</div>
            <div style={{ fontSize:26, fontWeight:800, color:'#fff' }}>{totalPeriodo>=0?'+':''}{totalPeriodo.toFixed(2)}€</div>
            <div style={{ fontSize:9, color:'#64748b', marginTop:2 }}>{transFiltradas.filter(t=>t.st!=='pendente').length} movimentos</div>
          </div>
          {/* Agrupado por mês, pendentes primeiro */}
          {ordenaMeses.map(mes=>(
            <div key={mes} style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:800, color:mes==='⏳ Pendentes'?C.amber:C.slate, textTransform:'uppercase', letterSpacing:'0.06em', margin:'4px 0 8px', display:'flex', alignItems:'center', gap:5 }}>
                {mes}
              </div>
              {porMes[mes].map(m => { const s=icMov[m.tipo]||icMov.credito;
                const ordemM = m.oid ? ordens.find(o=>o.id===m.oid) : null
                return (
                <div key={m.id} onClick={()=>ordemM&&onOrdem&&onOrdem(ordemM)}
                  style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 0', borderBottom:`1px solid ${C.border}`, cursor:ordemM&&onOrdem?'pointer':'default' }}
                  onMouseEnter={e=>{ if(ordemM&&onOrdem) e.currentTarget.style.background='#f8fafc' }}
                  onMouseLeave={e=>{ e.currentTarget.style.background='transparent' }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{s.ic}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:C.navy, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.d}</div>
                    <div style={{ fontSize:9, color:C.slate, marginTop:1 }}>{m.dt}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0, display:'flex', alignItems:'center', gap:5 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:800, color: m.v>0?C.g:'#64748b' }}>{m.v>0?'+':''}{m.v.toFixed(2)}€</div>
                      <div style={{ fontSize:8, fontWeight:700, color: m.st==='pendente'?C.amber:m.st==='processado'?C.slate:C.g, background: m.st==='pendente'?'#fef3c7':m.st==='processado'?C.mist:C.gl, padding:'1px 5px', borderRadius:5, marginTop:1 }}>
                        {m.st==='pendente'?'Pendente':m.st==='processado'?'Processado':'Disponível'}
                      </div>
                    </div>
                    {ordemM && onOrdem && <span style={{ color:C.border, fontSize:15 }}>›</span>}
                  </div>
                </div>
              )})}
            </div>
          ))}
        </>}
        {tab==='beneficios' && <>
          <p style={{ fontSize:12, color:C.slate, margin:'0 0 14px', lineHeight:1.5 }}>Como membro <strong>{nc.l}</strong>, tem acesso aos seguintes benefícios exclusivos da rede.</p>
          {BENEFICIOS.map(b => { const bc=NIVEIS[b.nivel]; const bi=nKeys.indexOf(nivel); const bni=nKeys.indexOf(b.nivel); const tem=bi>=bni; return (
            <Card key={b.id} style={{ padding:14, marginBottom:8, opacity: tem ? 1 : 0.5 }}>
              <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                <span style={{ fontSize:26 }}>{b.ic}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:3 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{b.n}</div>
                    <span style={{ fontSize:9, background:bc.bg, color:bc.cor, padding:'2px 7px', borderRadius:8, fontWeight:700 }}>{bc.ic} {bc.l}+</span>
                  </div>
                  <p style={{ fontSize:11, color:C.slate, margin:'0 0 8px', lineHeight:1.5 }}>{b.d}</p>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:11, fontWeight:700, color:C.navy }}>{b.preco}</span>
                    {tem ? <Btn sm v='green' onClick={() => {}}>Activar</Btn> : <span style={{ fontSize:10, color:C.slate }}>Requer {bc.l}</span>}
                  </div>
                </div>
              </div>
            </Card>
          )})}
        </>}
        {tab==='niveis' && <>
          <p style={{ fontSize:12, color:C.slate, margin:'0 0 14px', lineHeight:1.5 }}>O nível determina a taxa e os benefícios. Sobe concluindo mais serviços com boa avaliação.</p>
          <Card style={{ padding:16, marginBottom:14, border:`2px solid ${nc.cor}`, background:nc.bg }}>
            <div style={{ fontSize:10, fontWeight:700, color:nc.cor, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:7 }}>Nível actual</div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: pc ? 10 : 0 }}>
              <span style={{ fontSize:32 }}>{nc.ic}</span>
              <div><div style={{ fontSize:18, fontWeight:800, color:nc.cor }}>{nc.l}</div><div style={{ fontSize:12, color:nc.cor }}>Taxa: <strong>{nc.taxa}%</strong></div></div>
            </div>
            {pc && <div style={{ background:'rgba(255,255,255,0.5)', borderRadius:9, padding:9 }}>
              <div style={{ fontSize:10, color:nc.cor, fontWeight:600 }}>Para {pc.l}:</div>
              <div style={{ fontSize:10, color:C.slate, marginTop:3 }}>✓ {pc.min}+ serviços (tem 340) ✓ · Avaliação ≥{pc.mr} (tem 4.9) ✓</div>
              <div style={{ fontSize:10, color:C.g, fontWeight:700, marginTop:3 }}>Elegível! Revisão em 1 Mai.</div>
            </div>}
          </Card>
          {Object.entries(NIVEIS).map(([id,n]) => { const act=id===nivel; return (
            <Card key={id} style={{ padding:13, marginBottom:7, border: act ? `2px solid ${n.cor}` : undefined }}>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <span style={{ fontSize:24 }}>{n.ic}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{n.l}</div>
                    <span style={{ fontSize:13, fontWeight:800, color:n.cor }}>{n.taxa}%</span>
                  </div>
                  <div style={{ fontSize:10, color:C.slate, marginTop:1 }}>{n.min}+ serviços · avaliação ≥{n.mr||'—'}</div>
                  {act && <span style={{ fontSize:9, background:n.bg, color:n.cor, padding:'1px 7px', borderRadius:7, fontWeight:700, marginTop:3, display:'inline-block' }}>★ Actual</span>}
                </div>
              </div>
            </Card>
          )})}
        </>}
      </div>
    </div>
  )
}

/* ══════════════════════════════════
   GESTOR
══════════════════════════════════ */
/* ══════════════════════════════════
   PRESTADOR — ECRÃS ADICIONAIS
   (baseados nas imagens de referência)
══════════════════════════════════ */

// ── Dados de Tarefas por categoria ──
const TAREFAS_CATS = [
  { id:'limpeza',    l:'Limpeza',    ic:'🧹' },
  { id:'jardim',     l:'Jardim',     ic:'🌿' },
  { id:'piscina',    l:'Piscina',    ic:'🏊' },
  { id:'pintura',    l:'Pintura',    ic:'🎨' },
  { id:'eletrica',   l:'Elétrica',   ic:'⚡' },
  { id:'canalizacao',l:'Canalização',ic:'🚿' },
  { id:'manutencao', l:'Montagem',   ic:'🔧' },
  { id:'obra',       l:'Obras',      ic:'🏗️' },
]
const TAREFAS_DATA = {
  limpeza:    ['Limpeza geral','Limpeza de cozinha','Limpeza de casa de banho','Limpeza pós-obra','Limpeza de vidros','Limpeza de tapetes','Limpeza de escritório','Limpeza industrial'],
  jardim:     ['Corte de relva','Poda de arbustos','Limpeza de folhas','Plantação','Rega automática','Tratamento de pragas','Desenho de jardins'],
  piscina:    ['Limpeza de piscina','Tratamento de água','Verificação de equipamentos','Reparação de fugas','Manutenção de bomba'],
  pintura:    ['Pintura interior','Pintura exterior','Pintura de móveis','Stucco decorativo','Isolamento térmico','Acabamentos finos'],
  eletrica:   ['Instalação de tomadas','Candeeiros e iluminação','Quadros eléctricos','Intercomunicadores','Sistemas de alarme','Fotovoltaico básico'],
  canalizacao:['Reparação de fugas','Desentupimento','Instalação de torneiras','Caldeiras e esquentadores','Reparação urgente','Instalação de sanitas'],
  manutencao: ['Montagem de móveis','Fixar prateleiras','Montagem de cama','Montagem de roupeiro','Instalação de stores','Reparação geral'],
  obra:       ['Demolição','Alvenaria','Revestimentos','Pavimentos','Saneamento','Impermeabilização'],
}

// ── Disponibilidade semanal ──
const DIAS_SEMANA_FULL = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']
const DIAS_INI = ['S','T','Q','Q','S','S','D']

function PDisponibilidade({ onBack, bloqueados=[], setBloqueados=()=>{} }) {
  const [diasSel, setDiasSel]   = useState([0,1,2,3,4])
  const [horarios, setHorarios] = useState({0:'todo',1:'todo',2:'todo',3:'todo',4:'manha'})
  const [sheet, setSheet]       = useState(null)
  const [modalEvento, setModalEvento] = useState(false)
  const [saved, setSaved]       = useState(false)
  // Form de novo evento
  const hoje = new Date().toISOString().split('T')[0]
  const [evTipo, setEvTipo]     = useState('ferias')
  const [evInicio, setEvInicio] = useState(hoje)
  const [evFim, setEvFim]       = useState('')
  const [evDesc, setEvDesc]     = useState('')

  const TIPOS_EV = [
    {id:'ferias',  ic:'🏖️', l:'Férias',    cor:C.g,     bg:C.gl},
    {id:'doenca',  ic:'🤒', l:'Doença',    cor:'#ef4444',bg:'#fee2e2'},
    {id:'formacao',ic:'📚', l:'Formação',  cor:'#3b82f6',bg:'#eff6ff'},
    {id:'outro',   ic:'📌', l:'Outro',     cor:C.slate,  bg:C.mist},
  ]

  const toggleDia = d => {
    setDiasSel(p => p.includes(d) ? p.filter(x=>x!==d) : [...p,d])
    if (!diasSel.includes(d)) setHorarios(h=>({...h,[d]:'todo'}))
  }
  const setHorario = (d, h) => { setHorarios(p=>({...p,[d]:h})); setSheet(null) }

  const addEvento = () => {
    if (!evInicio) return
    const tipo = TIPOS_EV.find(t=>t.id===evTipo)
    const fmtDate = s => new Date(s).toLocaleDateString('pt-PT',{day:'2-digit',month:'short',year:'numeric'})
    const range = evFim && evFim > evInicio ? `${fmtDate(evInicio)} → ${fmtDate(evFim)}` : fmtDate(evInicio)
    const diasCount = evFim && evFim > evInicio ? Math.ceil((new Date(evFim)-new Date(evInicio))/(1000*60*60*24))+1 : 1
    setBloqueados(p=>[...p,{id:Date.now(), tipo:evTipo, ic:tipo.ic, cor:tipo.cor, bg:tipo.bg, desc:evDesc||tipo.l, range, dias:diasCount}])
    setModalEvento(false)
    setEvTipo('ferias'); setEvInicio(hoje); setEvFim(''); setEvDesc('')
  }

  const HMAP = { todo:'Todo o dia', manha:'Manhã', tarde:'Tarde' }

  return (
    <div style={{ minHeight:'100vh', background:C.mist }}>
      <Header title='A tua disponibilidade' onBack={onBack}/>
      <div style={{ padding:'16px 16px 100px' }}>

        {/* Círculos dos dias — cores da app */}
        <p style={{ fontSize:13, color:C.slate, marginBottom:14, lineHeight:1.5 }}>
          Seleciona os dias em que estás disponível para receber propostas.
        </p>
        <div style={{ background:C.white, borderRadius:14, padding:'16px', marginBottom:14, border:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', gap:6, marginBottom:16, justifyContent:'space-between' }}>
            {DIAS_INI.map((ini,i) => (
              <button key={i} onClick={() => toggleDia(i)} style={{
                width:40, height:40, borderRadius:'50%', border:'none', cursor:'pointer', flexShrink:0,
                background: diasSel.includes(i) ? C.g : '#f1f5f9',
                color: diasSel.includes(i) ? '#fff' : C.slate,
                fontSize:13, fontWeight:700,
                boxShadow: diasSel.includes(i) ? '0 2px 8px rgba(22,163,74,0.3)' : 'none',
                transition:'all 0.15s'
              }}>{ini}</button>
            ))}
          </div>

          {/* Lista de dias com horário */}
          {DIAS_SEMANA_FULL.map((dia, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 0', borderTop:`1px solid ${C.border}` }}>
              <span style={{ fontSize:13, color: diasSel.includes(i) ? C.navy : '#94a3b8', fontWeight: diasSel.includes(i)?600:400 }}>{dia}</span>
              {diasSel.includes(i) ? (
                <button onClick={() => setSheet(i)} style={{ padding:'6px 12px', border:`1.5px solid ${horarios[i]?C.g:C.border}`, borderRadius:20, background: horarios[i]?C.gl:C.white, cursor:'pointer', fontSize:12, color:horarios[i]?C.gd:C.slate, fontWeight:600 }}>
                  {horarios[i] ? `✓ ${HMAP[horarios[i]]}` : '+ Definir horário'}
                </button>
              ) : (
                <span style={{ fontSize:11, color:'#cbd5e1', fontStyle:'italic' }}>Indisponível</span>
              )}
            </div>
          ))}
        </div>

        {/* Períodos bloqueados */}
        <div style={{ background:C.white, borderRadius:14, padding:'16px', border:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div>
              <h2 style={{ fontSize:15, fontWeight:800, color:C.navy, margin:'0 0 2px' }}>Períodos bloqueados</h2>
              <p style={{ fontSize:11, color:C.slate, margin:0 }}>Férias, formações ou indisponibilidades</p>
            </div>
            <button onClick={()=>setModalEvento(true)} style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 12px', border:'none', borderRadius:10, background:C.g, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
              + Adicionar
            </button>
          </div>

          {/* Info box */}
          <div style={{ background:'#fef9ec', borderRadius:10, padding:'10px 12px', marginBottom:12, border:'1px solid rgba(245,158,11,0.2)' }}>
            <p style={{ fontSize:11, color:'#92400e', margin:0, lineHeight:1.5 }}>
              ⚠️ Durante os períodos bloqueados não receberás propostas de serviços.
            </p>
          </div>

          {bloqueados.length === 0
            ? <div style={{ textAlign:'center', padding:'24px 0', color:'#94a3b8' }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🗓️</div>
                <p style={{ fontSize:13, fontWeight:600, marginBottom:3 }}>Sem períodos bloqueados</p>
                <p style={{ fontSize:11 }}>Clica em "+ Adicionar" para bloquear férias ou indisponibilidades</p>
              </div>
            : bloqueados.map(b => (
                <div key={b.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 12px', background:b.bg||C.mist, borderRadius:10, marginBottom:7, border:`1.5px solid ${b.cor}22` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:22 }}>{b.ic}</span>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{b.desc}</div>
                      <div style={{ fontSize:11, color:b.cor, fontWeight:600 }}>{b.range}</div>
                      <div style={{ fontSize:10, color:C.slate }}>{b.dias} dia{b.dias>1?'s':''} bloqueado{b.dias>1?'s':''}</div>
                    </div>
                  </div>
                  <button onClick={()=>setBloqueados(p=>p.filter(x=>x.id!==b.id))} style={{ background:'rgba(239,68,68,0.1)', border:'none', borderRadius:'50%', width:28, height:28, cursor:'pointer', color:'#ef4444', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                </div>
              ))
          }
        </div>
      </div>

      {/* CTA */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, padding:'12px 16px 20px', background:C.white, borderTop:`1px solid ${C.border}`, zIndex:30 }}>
        {saved && <div style={{ textAlign:'center', color:C.g, fontSize:12, fontWeight:600, marginBottom:8 }}>✅ Disponibilidade actualizada!</div>}
        <button onClick={()=>setSaved(true)} style={{ width:'100%', background:C.g, color:'#fff', border:'none', borderRadius:14, padding:'15px', fontSize:14, fontWeight:800, cursor:'pointer', letterSpacing:'0.03em', boxShadow:'0 4px 14px rgba(22,163,74,0.35)' }}>
          ATUALIZAR DISPONIBILIDADE
        </button>
      </div>

      {/* Bottom sheet — escolha de horário do dia */}
      {sheet !== null && (
        <>
          <div onClick={()=>setSheet(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:50 }}/>
          <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, background:C.white, borderRadius:'20px 20px 0 0', zIndex:51, padding:'20px 20px 32px' }}>
            <div style={{ width:36, height:4, borderRadius:2, background:'#e2e8f0', margin:'0 auto 18px' }}/>
            <h3 style={{ textAlign:'center', fontSize:15, fontWeight:800, color:C.navy, marginBottom:20 }}>
              {DIAS_SEMANA_FULL[sheet]}-feira — escolhe o horário
            </h3>
            {[['todo','Todo o dia','☀️'],['manha','Manhã (08:00–13:00)','🌅'],['tarde','Tarde (14:00–19:00)','🌇']].map(([k,l,ic])=>(
              <button key={k} onClick={()=>setHorario(sheet,k)} style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px', marginBottom:8, border:`1.5px solid ${horarios[sheet]===k?C.g:C.border}`, borderRadius:12, background:horarios[sheet]===k?C.gl:'#fff', cursor:'pointer' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:20 }}>{ic}</span>
                  <span style={{ fontSize:14, color:horarios[sheet]===k?C.gd:C.navy, fontWeight:horarios[sheet]===k?700:500 }}>{l}</span>
                </div>
                <div style={{ width:20, height:20, borderRadius:'50%', border:`2px solid ${horarios[sheet]===k?C.g:C.border}`, background:horarios[sheet]===k?C.g:'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {horarios[sheet]===k && <div style={{ width:8, height:8, borderRadius:'50%', background:'#fff' }}/>}
                </div>
              </button>
            ))}
            <button onClick={()=>setSheet(null)} style={{ width:'100%', marginTop:8, padding:'13px', border:`1.5px solid ${C.border}`, borderRadius:12, background:C.white, fontSize:13, fontWeight:700, cursor:'pointer', color:C.navy }}>Fechar</button>
          </div>
        </>
      )}

      {/* Modal — Adicionar período bloqueado */}
      {modalEvento && (
        <>
          <div onClick={()=>setModalEvento(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:60 }}/>
          <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, background:C.white, borderRadius:'24px 24px 0 0', zIndex:61, padding:'22px 20px 36px', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ width:36, height:4, borderRadius:2, background:'#e2e8f0', margin:'0 auto 18px' }}/>
            <h2 style={{ fontSize:16, fontWeight:800, color:C.navy, marginBottom:4 }}>Adicionar período bloqueado</h2>
            <p style={{ fontSize:12, color:C.slate, marginBottom:18 }}>Bloqueia a tua agenda para férias, formação ou outro motivo.</p>

            {/* Tipo de evento */}
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.slate, display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.04em' }}>Tipo de período</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {TIPOS_EV.map(t=>(
                  <button key={t.id} onClick={()=>setEvTipo(t.id)} style={{ padding:'10px 12px', border:`2px solid ${evTipo===t.id?t.cor:C.border}`, borderRadius:12, background:evTipo===t.id?t.bg:'#fff', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:20 }}>{t.ic}</span>
                    <span style={{ fontSize:13, fontWeight:evTipo===t.id?700:500, color:evTipo===t.id?t.cor:C.navy }}>{t.l}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Descrição */}
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.slate, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>Descrição (opcional)</label>
              <input value={evDesc} onChange={e=>setEvDesc(e.target.value)} placeholder={`Ex: ${TIPOS_EV.find(t=>t.id===evTipo)?.l} de Verão`} style={{ width:'100%', border:`1.5px solid ${C.border}`, borderRadius:10, padding:'10px 12px', fontSize:13, outline:'none', color:C.navy, background:'#f8fafc', boxSizing:'border-box' }}/>
            </div>

            {/* Datas */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:C.slate, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>Data de início</label>
                <input type='date' value={evInicio} min={hoje} onChange={e=>{setEvInicio(e.target.value); if(evFim&&evFim<e.target.value) setEvFim('')}} style={{ width:'100%', border:`1.5px solid ${C.g}`, borderRadius:10, padding:'10px 10px', fontSize:13, outline:'none', color:C.navy, background:'#f0fdf4', boxSizing:'border-box', cursor:'pointer' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:C.slate, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>Data de fim</label>
                <input type='date' value={evFim} min={evInicio||hoje} onChange={e=>setEvFim(e.target.value)} style={{ width:'100%', border:`1.5px solid ${evFim?C.g:C.border}`, borderRadius:10, padding:'10px 10px', fontSize:13, outline:'none', color:C.navy, background:evFim?'#f0fdf4':'#f8fafc', boxSizing:'border-box', cursor:'pointer' }}/>
              </div>
            </div>

            {/* Preview do período */}
            {evInicio && (
              <div style={{ background:C.gl, borderRadius:10, padding:'10px 14px', marginBottom:16, border:'1px solid rgba(22,163,74,0.2)' }}>
                <span style={{ fontSize:12, color:C.gd, fontWeight:600 }}>
                  {evFim && evFim > evInicio
                    ? `📅 ${Math.ceil((new Date(evFim)-new Date(evInicio))/(1000*60*60*24))+1} dias bloqueados`
                    : '📅 1 dia bloqueado'}
                  {evFim && evFim > evInicio
                    ? ` · de ${new Date(evInicio).toLocaleDateString('pt-PT',{day:'2-digit',month:'short'})} a ${new Date(evFim).toLocaleDateString('pt-PT',{day:'2-digit',month:'short'})}`
                    : evInicio ? ` · ${new Date(evInicio).toLocaleDateString('pt-PT',{day:'2-digit',month:'short',year:'numeric'})}` : ''}
                </span>
              </div>
            )}

            <div style={{ display:'flex', gap:9 }}>
              <button onClick={()=>setModalEvento(false)} style={{ flex:1, padding:'13px', border:`1.5px solid ${C.border}`, borderRadius:12, background:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', color:C.navy }}>Cancelar</button>
              <button onClick={addEvento} disabled={!evInicio} style={{ flex:2, padding:'13px', border:'none', borderRadius:12, background:evInicio?C.g:'#cbd5e1', color:'#fff', fontSize:13, fontWeight:800, cursor:evInicio?'pointer':'default' }}>
                ✅ Bloquear período
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Tarefas / Serviços que o prestador quer fazer ──
function PTarefas({ onBack }) {
  const [catAtiva, setCatAtiva] = useState('limpeza')
  const [ativas, setAtivas] = useState(() => {
    const init = {}
    Object.entries(TAREFAS_DATA).forEach(([cat,tasks]) => { tasks.forEach(t => { init[`${cat}:${t}`] = Math.random()>0.4 }) })
    return init
  })
  const [saved, setSaved] = useState(false)
  const toggle = (cat, t) => { setAtivas(p=>({...p,[`${cat}:${t}`]:!p[`${cat}:${t}`]})); setSaved(false) }
  const toggleAll = cat => {
    const tasks = TAREFAS_DATA[cat]
    const allOn = tasks.every(t=>ativas[`${cat}:${t}`])
    setAtivas(p=>{ const n={...p}; tasks.forEach(t=>{n[`${cat}:${t}`]=!allOn}); return n })
  }
  const tarefasAtivas = Object.values(ativas).filter(Boolean).length

  return (
    <div style={{ minHeight:'100vh', background:'#fff' }}>
      <Header title='Tarefas' onBack={onBack}/>
      {/* Tabs de categorias */}
      <div style={{ display:'flex', overflowX:'auto', borderBottom:`1px solid ${C.border}`, background:C.white, position:'sticky', top:56, zIndex:10 }}>
        {TAREFAS_CATS.map(c=>(
          <button key={c.id} onClick={()=>setCatAtiva(c.id)} style={{ flexShrink:0, padding:'12px 16px', border:'none', background:'none', cursor:'pointer', borderBottom: catAtiva===c.id ? `2px solid ${C.navy}` : '2px solid transparent', color: catAtiva===c.id ? C.navy : C.slate, fontSize:13, fontWeight: catAtiva===c.id ? 700 : 500, whiteSpace:'nowrap' }}>
            {c.ic} {c.l}
          </button>
        ))}
      </div>
      <div style={{ padding:'14px 16px 100px' }}>
        <p style={{ fontSize:12, color:C.slate, marginBottom:16, lineHeight:1.6 }}>
          Seleciona as tarefas que pretendes realizar. Ao estares disponível para todo o tipo de tarefas, aumentas o número de propostas recebidas.
        </p>
        {/* Header da categoria */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <h2 style={{ fontSize:18, fontWeight:800, color:C.navy }}>{TAREFAS_CATS.find(c=>c.id===catAtiva)?.l}</h2>
          <button onClick={()=>toggleAll(catAtiva)} style={{ fontSize:13, color:C.g, fontWeight:600, background:'none', border:'none', cursor:'pointer' }}>Alternar todos</button>
        </div>
        {/* Lista de tarefas */}
        {TAREFAS_DATA[catAtiva]?.map((t,i)=>(
          <div key={t} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px 0', borderBottom:`1px solid ${C.border}` }}>
            <span style={{ fontSize:15, color:C.navy }}>{t}</span>
            {/* Toggle switch */}
            <div onClick={()=>toggle(catAtiva,t)} style={{ width:48, height:28, borderRadius:14, background: ativas[`${catAtiva}:${t}`] ? C.g : '#cbd5e1', cursor:'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
              <div style={{ position:'absolute', top:3, left: ativas[`${catAtiva}:${t}`] ? 22 : 2, width:22, height:22, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 4px rgba(0,0,0,0.2)', transition:'left 0.2s' }}/>
            </div>
          </div>
        ))}
      </div>
      {/* CTA */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, padding:'12px 16px 20px', background:C.white, borderTop:`1px solid ${C.border}`, zIndex:30 }}>
        {saved&&<div style={{ textAlign:'center', fontSize:11, color:C.g, fontWeight:600, marginBottom:6 }}>✅ {tarefasAtivas} tarefas guardadas!</div>}
        <button onClick={()=>setSaved(true)} style={{ width:'100%', background:'#0891b2', color:'#fff', border:'none', borderRadius:14, padding:'15px', fontSize:14, fontWeight:800, cursor:'pointer', letterSpacing:'0.03em' }}>
          GUARDAR
        </button>
      </div>
    </div>
  )
}

// ── Estatísticas / Rating ──
/* ══ Perfil editável do Prestador ══ */
function PPrestadorPerfil({ onBack }) {
  const eu = TECNICOS[0]
  const nc = NIVEIS[eu.nivel]
  const [edit,     setEdit]     = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [catModal, setCatModal] = useState(false)
  const [saving,   setSaving]   = useState(false)

  // Dados do prestador (em produção viriam do Supabase)
  const [nome,      setNome]      = useState(eu.n)
  const [morada,    setMorada]    = useState('Rua das Flores, 23')
  const [codPostal, setCodPostal] = useState('2500-123')
  const [localidade,setLocalidade]= useState(eu.loc)
  const [nif,       setNif]       = useState('123 456 789')
  const [telInd,    setTelInd]    = useState('+351')
  const [telNum,    setTelNum]    = useState('914 000 001')
  const [email,     setEmail]     = useState('antonio.ferreira@email.com')
  const [iban,      setIban]      = useState(eu.iban||'PT50 0035 0000 1111 0001 0')
  const [bio,       setBio]       = useState('Especialista em limpeza residencial e pós-obra com 8 anos de experiência em Caldas da Rainha e arredores.')
  const [ini,       setIni]       = useState(eu.ini)
  const [cats,      setCats]      = useState([...eu.cats])
  const [foto,      setFoto]      = useState(null)    // URL ou base64
  const [ibanComp,  setIbanComp]  = useState(null)    // URL do comprovativo
  const [ibanCompNome, setIbanCompNome] = useState(null)

  const fotoRef = useState(null)[0]
  const ibanRef = useState(null)[0]

  const handleFoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setFoto(ev.target.result)
    reader.readAsDataURL(file)
    // Em produção: uploadFotoPerfil(eu.id, file).then(({url}) => setFoto(url))
  }

  const handleIbanComp = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIbanCompNome(file.name)
    // Em produção: uploadIbanComprovativo(eu.id, file).then(({url}) => setIbanComp(url))
    setIbanComp('pendente') // simulado
  }

  const guardar = async () => {
    setSaving(true)
    // Em produção: await updatePrestador(eu.id, { nome, morada, cod_postal, localidade, nif, tel_indicativo: telInd, tel_numero: telNum, email, iban, bio, iniciais: ini, categorias: cats, foto_url: foto })
    await new Promise(r => setTimeout(r, 600)) // simula latência
    setSaved(true); setEdit(false); setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  const Campo = ({label, value, onEdit, type='text', mono=false, half=false}) => (
    <div style={{ padding:'11px 0', borderBottom:`1px solid ${C.border}`, gridColumn: half ? '1' : '1 / -1' }}>
      <div style={{ fontSize:10, color: edit ? C.g : C.slate, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom: edit?5:3, transition:'color 0.2s' }}>{label}</div>
      {edit
        ? <input type={type} value={value} onChange={e=>onEdit(e.target.value)}
            style={{ width:'100%', border:'none', borderBottom:`2px solid ${C.g}`, padding:'4px 0', fontSize:14, fontWeight:500, color:C.navy, outline:'none', background:'transparent', fontFamily: mono ? 'monospace' : 'inherit', boxSizing:'border-box' }}/>
        : <div style={{ fontSize:14, fontWeight:500, color:C.navy, fontFamily: mono ? 'monospace' : 'inherit' }}>{value||'—'}</div>
      }
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:C.mist }}>
      <Header title='O meu perfil' sub='Dados pessoais e profissionais' onBack={onBack}/>
      <div style={{ padding:'16px 16px 110px' }}>

        {/* Avatar / Foto de perfil */}
        <div style={{ background:`linear-gradient(145deg,${C.navy},${C.gd})`, borderRadius:16, padding:'18px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ position:'relative', flexShrink:0 }}>
            {foto
              ? <img src={foto} alt='Foto' style={{ width:70, height:70, borderRadius:'50%', objectFit:'cover', border:'3px solid rgba(255,255,255,0.3)' }}/>
              : <div style={{ width:70, height:70, borderRadius:'50%', background:`linear-gradient(135deg,${C.g},${C.gm})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, color:'#fff', fontWeight:800, border:'3px solid rgba(255,255,255,0.25)' }}>
                  {edit ? <input value={ini} onChange={e=>setIni(e.target.value.toUpperCase().substring(0,2))} maxLength={2} style={{ width:42, background:'transparent', border:'none', outline:'none', textAlign:'center', fontSize:22, color:'#fff', fontWeight:800 }}/> : ini}
                </div>
            }
            {edit && (
              <label htmlFor='foto-input' style={{ position:'absolute', bottom:-2, right:-2, width:24, height:24, borderRadius:'50%', background:C.g, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, border:'2px solid #fff', cursor:'pointer' }}>
                📷
                <input id='foto-input' type='file' accept='image/*' onChange={handleFoto} style={{ display:'none' }}/>
              </label>
            )}
          </div>
          <div style={{ flex:1 }}>
            {edit
              ? <input value={nome} onChange={e=>setNome(e.target.value)} style={{ background:'transparent', border:'none', borderBottom:'1.5px solid rgba(255,255,255,0.4)', outline:'none', color:'#fff', fontSize:17, fontWeight:800, width:'100%', paddingBottom:2, marginBottom:4 }}/>
              : <div style={{ color:'#fff', fontSize:17, fontWeight:800, marginBottom:3 }}>{nome}</div>
            }
            <div style={{ color:'#94a3b8', fontSize:11, marginBottom:6 }}>{eu.id_num||'301612811'}</div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.1)', borderRadius:20, padding:'4px 10px' }}>
              <span style={{ fontSize:11, color:'#bbf7d0', fontWeight:600 }}>{nc.ic} {nc.l} · {nc.taxa}% taxa</span>
            </div>
          </div>
        </div>

        {/* Categorias */}
        <Card style={{ padding:14, marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:'0.05em' }}>Categorias de serviço</div>
            <button onClick={()=>setCatModal(true)} style={{ fontSize:11, color:C.g, fontWeight:600, background:C.gl, border:'none', borderRadius:9, padding:'4px 10px', cursor:'pointer' }}>✏️ Editar</button>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
            {cats.map(c=><span key={c} style={{ padding:'5px 12px', border:`1.5px solid ${C.g}`, borderRadius:20, fontSize:12, color:C.g, fontWeight:600, background:C.gl }}>{catById(c)?.ic} {catById(c)?.l}</span>)}
            {cats.length===0&&<span style={{ fontSize:12, color:C.slate, fontStyle:'italic' }}>Sem categorias definidas</span>}
          </div>
        </Card>

        {/* Dados pessoais */}
        <Card style={{ padding:'2px 16px', marginBottom:12 }}>
          <Campo label="NIF" value={nif} onEdit={setNif}/>
          {/* Telefone — indicativo + número */}
          <div style={{ padding:'11px 0', borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:10, color: edit ? C.g : C.slate, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom: edit?5:3 }}>Telefone</div>
            {edit
              ? <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <input value={telInd} onChange={e=>setTelInd(e.target.value)} style={{ width:62, border:'none', borderBottom:`2px solid ${C.g}`, padding:'4px 0', fontSize:14, fontWeight:500, color:C.slate, outline:'none', background:'transparent', textAlign:'center' }}/>
                  <input value={telNum} onChange={e=>setTelNum(e.target.value)} style={{ flex:1, border:'none', borderBottom:`2px solid ${C.g}`, padding:'4px 0', fontSize:14, fontWeight:500, color:C.navy, outline:'none', background:'transparent' }}/>
                </div>
              : <div style={{ fontSize:14, fontWeight:500, color:C.navy }}>{telInd} {telNum}</div>
            }
          </div>
          <Campo label="Email" value={email} onEdit={setEmail} type='email'/>
          <Campo label="Morada" value={morada} onEdit={setMorada}/>
          {/* Código Postal + Localidade na mesma linha */}
          <div style={{ padding:'11px 0', borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:10, color: edit ? C.g : C.slate, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom: edit?5:3 }}>Localidade</div>
            {edit
              ? <div style={{ display:'flex', gap:8 }}>
                  <input value={codPostal} onChange={e=>setCodPostal(e.target.value)} placeholder='0000-000' style={{ width:90, border:'none', borderBottom:`2px solid ${C.g}`, padding:'4px 0', fontSize:14, color:C.slate, outline:'none', background:'transparent' }}/>
                  <input value={localidade} onChange={e=>setLocalidade(e.target.value)} style={{ flex:1, border:'none', borderBottom:`2px solid ${C.g}`, padding:'4px 0', fontSize:14, color:C.navy, outline:'none', background:'transparent' }}/>
                </div>
              : <div style={{ fontSize:14, fontWeight:500, color:C.navy }}>{codPostal} {localidade}</div>
            }
          </div>
          <div style={{ padding:'11px 0', borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:10, color: edit ? C.g : C.slate, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom: edit?5:4 }}>Sobre mim</div>
            {edit
              ? <textarea value={bio} onChange={e=>setBio(e.target.value)} rows={3} style={{ width:'100%', border:'none', borderBottom:`2px solid ${C.g}`, padding:'4px 0', fontSize:13, color:C.navy, outline:'none', resize:'none', background:'transparent', fontFamily:'inherit', boxSizing:'border-box' }}/>
              : <div style={{ fontSize:13, color:C.navy, lineHeight:1.7 }}>{bio}</div>
            }
          </div>
        </Card>

        {/* Dados bancários */}
        <Card style={{ padding:'2px 16px', marginBottom:12 }}>
          <Campo label="IBAN (Swan SEPA CT)" value={iban} onEdit={setIban} mono={true}/>
          {/* Comprovativo de IBAN */}
          <div style={{ padding:'12px 0', borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:10, color: edit ? C.g : C.slate, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:6 }}>Comprovativo de IBAN</div>
            {ibanComp
              ? <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:22 }}>📄</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:C.navy }}>{ibanCompNome||'Comprovativo.pdf'}</div>
                    <div style={{ fontSize:10, color:C.g, fontWeight:600 }}>✓ Documento carregado</div>
                  </div>
                  {edit&&<button onClick={()=>{setIbanComp(null);setIbanCompNome(null)}} style={{ background:'none', border:'none', color:'#94a3b8', fontSize:14, cursor:'pointer' }}>×</button>}
                </div>
              : edit
                ? <label htmlFor='iban-input' style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', border:`1.5px dashed ${C.g}`, borderRadius:10, cursor:'pointer', background:C.gl }}>
                    <span style={{ fontSize:18 }}>📎</span>
                    <span style={{ fontSize:12, color:C.gd, fontWeight:600 }}>Anexar comprovativo (PDF ou imagem)</span>
                    <input id='iban-input' type='file' accept='.pdf,image/*' onChange={handleIbanComp} style={{ display:'none' }}/>
                  </label>
                : <div style={{ fontSize:12, color:'#94a3b8', fontStyle:'italic' }}>Sem comprovativo anexado</div>
            }
          </div>
          <div style={{ padding:'12px 0' }}>
            <div style={{ fontSize:10, color:C.slate, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:3 }}>Anos de experiência</div>
            <div style={{ fontSize:14, fontWeight:500, color:C.navy }}>{eu.anos} anos</div>
          </div>
        </Card>

        {/* Rating */}
        <Card style={{ padding:14, marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:5 }}>Pontuação de satisfação</div>
              <div style={{ fontSize:26, fontWeight:800, color:C.navy }}>{eu.r} <span style={{ color:C.amber }}>★</span></div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:24, fontWeight:800, color:C.navy }}>{eu.jobs}</div>
              <div style={{ fontSize:10, color:C.slate }}>serviços totais</div>
            </div>
          </div>
        </Card>

        {saved && <div style={{ background:C.gl, borderRadius:10, padding:'11px 14px', marginBottom:12, border:'1px solid rgba(22,163,74,0.2)', textAlign:'center' }}>
          <span style={{ fontSize:13, color:C.gd, fontWeight:700 }}>✅ Perfil guardado no Supabase!</span>
        </div>}
      </div>

      {/* CTA fixo */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, padding:'12px 16px 20px', background:C.white, borderTop:`1px solid ${C.border}`, zIndex:30 }}>
        {edit
          ? <div style={{ display:'flex', gap:9 }}>
              <button onClick={()=>setEdit(false)} style={{ flex:1, padding:'13px', border:`1.5px solid ${C.border}`, borderRadius:12, background:C.white, fontSize:13, fontWeight:600, cursor:'pointer', color:C.slate }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} style={{ flex:2, padding:'13px', border:'none', borderRadius:12, background:saving?C.border:C.g, color:'#fff', fontSize:13, fontWeight:800, cursor:saving?'default':'pointer', boxShadow:saving?'none':'0 4px 14px rgba(22,163,74,0.35)' }}>
                {saving?'A guardar...':'💾 Guardar alterações'}
              </button>
            </div>
          : <button onClick={()=>setEdit(true)} style={{ width:'100%', padding:'13px', border:`1.5px solid ${C.border}`, borderRadius:12, background:C.white, fontSize:13, fontWeight:700, cursor:'pointer', color:C.navy, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              ✏️ Editar perfil
            </button>
        }
      </div>

      {/* Modal de categorias */}
      {catModal && <>
        <div onClick={()=>setCatModal(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:60 }}/>
        <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, background:C.white, borderRadius:'22px 22px 0 0', zIndex:61, padding:'20px 18px 32px' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'#e2e8f0', margin:'0 auto 16px' }}/>
          <h3 style={{ fontSize:15, fontWeight:800, color:C.navy, marginBottom:4 }}>Categorias de serviço</h3>
          <p style={{ fontSize:12, color:C.slate, marginBottom:16 }}>Seleciona as categorias em que prestas serviços.</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9, marginBottom:18 }}>
            {CATS.map(c => {
              const sel = cats.includes(c.id)
              return (
                <button key={c.id} onClick={()=>setCats(p=>sel?p.filter(x=>x!==c.id):[...p,c.id])}
                  style={{ padding:'12px', border:`2px solid ${sel?c.cor:C.border}`, borderRadius:12, background:sel?c.cor+'15':'#fff', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:20 }}>{c.ic}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:sel?700:500, color:sel?c.cor:C.navy }}>{c.l}</div>
                    {sel&&<div style={{ fontSize:9, color:c.cor, fontWeight:700 }}>✓ Activa</div>}
                  </div>
                </button>
              )
            })}
          </div>
          <button onClick={()=>setCatModal(false)} style={{ width:'100%', padding:'13px', border:'none', borderRadius:12, background:C.g, color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer' }}>
            Guardar ({cats.length} categorias)
          </button>
        </div>
      </>}
    </div>
  )
}
function PEstatisticas({ onBack }) {
  const eu = TECNICOS[0]
  const stats30 = [
    {v:'6',l:'Número de Serviços'},
    {v:'€342,00',l:'Ganhos'},
    {v:'0',l:'Cancelamentos do mesmo/dia seguinte'},
    {v:'0%',l:'Taxa de Cancelamento'},
    {v:'2',l:'Clientes repetidos'},
    {v:'83%',l:'Chegada Pontual'},
  ]
  return (
    <div style={{ minHeight:'100vh', background:C.mist }}>
      <Header title='Estatísticas' sub={eu.n} onBack={onBack}/>
      <div style={{ padding:'18px 16px 40px' }}>
        {/* Perfil */}
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ width:80, height:80, borderRadius:'50%', background:`linear-gradient(135deg,${C.g},${C.gm})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, color:'#fff', fontWeight:800, margin:'0 auto 12px' }}>{eu.ini}</div>
          <h2 style={{ fontSize:18, fontWeight:800, color:C.navy, marginBottom:3 }}>{eu.n}</h2>
          <p style={{ fontSize:12, color:C.slate, marginBottom:8 }}>na rede desde Jan 2024</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:7, justifyContent:'center', marginBottom:14 }}>
            {eu.cats.map(c=>(
              <span key={c} style={{ padding:'5px 12px', border:`1.5px solid ${C.border}`, borderRadius:20, fontSize:12, color:C.navy }}>{catById(c)?.ic} {catById(c)?.l}</span>
            ))}
            <span style={{ padding:'5px 12px', border:`1.5px solid ${C.border}`, borderRadius:20, fontSize:12, color:C.navy }}>🏅 Gold</span>
          </div>
        </div>
        {/* Avaliação */}
        <Card style={{ padding:20, textAlign:'center', marginBottom:16 }}>
          <div style={{ fontSize:36, fontWeight:800, color:C.navy }}>{eu.r} <span style={{ color:C.amber }}>★</span></div>
          <div style={{ fontSize:13, color:C.slate, marginTop:4 }}>Pontuação de satisfação</div>
          <div style={{ display:'flex', justifyContent:'center', marginTop:8 }}>
            {[1,2,3,4,5].map(i=><span key={i} style={{ fontSize:22, color: i<=Math.round(eu.r) ? C.amber : '#e2e8f0' }}>★</span>)}
          </div>
        </Card>
        {/* Últimos 30 dias */}
        <h2 style={{ fontSize:17, fontWeight:800, color:C.navy, margin:'0 0 12px' }}>Últimos 30 dias</h2>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {stats30.map(s=>(
            <Card key={s.l} style={{ padding:'18px 16px', textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:800, color:C.navy, marginBottom:6 }}>{s.v}</div>
              <div style={{ fontSize:11, color:C.slate, lineHeight:1.4 }}>{s.l}</div>
            </Card>
          ))}
        </div>
        {/* Total histórico */}
        <h2 style={{ fontSize:17, fontWeight:800, color:C.navy, margin:'20px 0 12px' }}>Histórico total</h2>
        <Card style={{ padding:16 }}>
          {[['Total de serviços',eu.jobs],['Anos de experiência',eu.anos],['Avaliação média',`${eu.r}/5`],['Taxa de cancelamento','2%']].map(([l,v])=>(
            <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid #f1f5f9' }}>
              <span style={{ fontSize:13, color:C.slate }}>{l}</span>
              <span style={{ fontSize:13, fontWeight:700, color:C.navy }}>{v}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// ── Pagamentos do prestador ──
function PPagamentos({ onBack }) {
  const [periodo, setPeriodo] = useState(30)
  const [filtro, setFiltro] = useState('todos') // todos | pagos
  const PERIODOS = [15, 30, 90]
  const TRANSACOES = [
    { id:'t1', data:'Disponível em breve', n:1, val:57.00, st:'pendente', via:null },
    { id:'t2', data:'20 abril 2026',       n:2, val:75.00, st:'pago',     via:'Transferência bancária' },
    { id:'t3', data:'18 abril 2026',       n:1, val:91.00, st:'pago',     via:'Transferência bancária' },
    { id:'t4', data:'12 abril 2026',       n:1, val:45.00, st:'pago',     via:'Transferência bancária' },
    { id:'t5', data:'10 abril 2026',       n:3, val:180.00,st:'pago',     via:'Pagamento em numerário' },
  ]
  const filtradas = TRANSACOES.filter(t=>filtro==='pagos'?t.st==='pago':true)
  const total = filtradas.reduce((a,t)=>a+t.val,0)

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc' }}>
      <Header title='Pagamentos' onBack={onBack}/>
      <div style={{ padding:'14px 16px 40px' }}>
        {/* Filtro de período */}
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {PERIODOS.map(p=>(
            <button key={p} onClick={()=>setPeriodo(p)} style={{ flex:1, padding:'9px', borderRadius:22, border:`1.5px solid ${C.border}`, background: periodo===p ? C.navy : C.white, color: periodo===p ? '#fff' : C.slate, fontWeight:700, fontSize:12, cursor:'pointer' }}>
              Últimos {p} dias
            </button>
          ))}
        </div>
        {/* Card total */}
        <div style={{ background:C.navy, borderRadius:16, padding:'20px 20px', marginBottom:16 }}>
          {/* Toggle Todos/Pagos */}
          <div style={{ display:'inline-flex', background:'rgba(255,255,255,0.15)', borderRadius:20, padding:3, marginBottom:16 }}>
            {['todos','pagos'].map(f=>(
              <button key={f} onClick={()=>setFiltro(f)} style={{ padding:'6px 18px', borderRadius:17, border:'none', cursor:'pointer', background: filtro===f ? C.white : 'transparent', color: filtro===f ? C.navy : '#94a3b8', fontWeight:700, fontSize:13, textTransform:'capitalize' }}>
                {f==='todos'?'Todos':'Pagos'}
              </button>
            ))}
          </div>
          <div style={{ fontSize:38, fontWeight:800, color:'#fff', marginBottom:12 }}>€{total.toFixed(2)}</div>
          <div style={{ fontSize:12, color:'#64748b' }}>
            {periodo===30 ? `${new Date(Date.now()-30*86400000).toLocaleDateString('pt-PT',{day:'2-digit',month:'short',year:'numeric'})} — Hoje` : `Últimos ${periodo} dias`}
          </div>
        </div>
        {/* Lista de transacções */}
        <h2 style={{ fontSize:17, fontWeight:800, color:C.navy, margin:'4px 0 14px' }}>Transações</h2>
        {filtradas.map(t=>(
          <div key={t.id} style={{ borderBottom:`1px solid ${C.border}`, paddingBottom:14, marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color: t.st==='pendente' ? C.slate : C.navy }}>{t.data}</div>
                <div style={{ fontSize:12, color:C.slate, marginTop:2 }}>Total de {t.n} Serviço{t.n>1?'s':''}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ fontSize:16, fontWeight:800, color:C.navy }}>€{t.val.toFixed(2)}</span>
                <span style={{ fontSize:14, color:C.slate }}>›</span>
              </div>
            </div>
            {t.st==='pago' && <div style={{ display:'flex', gap:7, marginTop:6 }}>
              <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#16a34a', fontWeight:600 }}>
                <span style={{ width:16, height:16, borderRadius:'50%', border:'1.5px solid #16a34a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8 }}>✓</span>
                Pago
              </span>
              <span style={{ fontSize:11, color:C.slate }}>🏦 {t.via}</span>
            </div>}
            {t.st==='pendente' && <span style={{ fontSize:11, color:C.amber, fontWeight:600 }}>⏳ Disponível em breve</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Serviços ativos (contratos recorrentes) ──
function PServicosAtivos({ onBack }) {
  const CONTRATOS = [
    // vazio para mostrar o estado empty (como na imagem)
    // Em prod, viria do Supabase
  ]
  return (
    <div style={{ minHeight:'100vh', background:'#fff' }}>
      <Header title='Serviços ativos' onBack={onBack}/>
      <div style={{ padding:'20px 16px' }}>
        {CONTRATOS.length===0
          ? <div style={{ textAlign:'center', padding:'80px 0', color:'#94a3b8' }}>
              <div style={{ fontSize:48, marginBottom:14 }}>📋</div>
              <div style={{ fontSize:16, fontWeight:600, marginBottom:6 }}>Sem serviços</div>
              <div style={{ fontSize:12, lineHeight:1.5 }}>Os teus contratos recorrentes activos aparecem aqui</div>
            </div>
          : CONTRATOS.map(c=>(
              <Card key={c.id} style={{ padding:14, marginBottom:8 }}>
                <div>{c.n}</div>
              </Card>
            ))
        }
      </div>
    </div>
  )
}

// ── Escalões — ficha do prestador (Rating nível) ──
function PNivel({ onBack }) {
  const eu = TECNICOS[0]
  const nivel = eu.nivel
  const nc = NIVEIS[nivel]
  const nKeys = Object.keys(NIVEIS)
  const idx = nKeys.indexOf(nivel)
  const prox = nKeys[idx+1]
  const pc = prox ? NIVEIS[prox] : null
  const faltam = pc ? Math.max(0, pc.min - eu.jobs) : 0
  const progressoPct = pc ? Math.min(100, ((eu.jobs - NIVEIS[nKeys[idx-1]||nivel]?.min||0) / (pc.min - (NIVEIS[nKeys[idx-1]||nivel]?.min||0))) * 100) : 100

  return (
    <div style={{ minHeight:'100vh', background:C.mist }}>
      <Header title={`Parceiro ${nc.l}`} sub='Progressão e escalões' onBack={onBack}/>
      <div style={{ padding:'20px 16px 40px', textAlign:'center' }}>
        <div style={{ fontSize:56, marginBottom:8 }}>{nc.ic}</div>
        <h1 style={{ fontSize:20, fontWeight:800, color:C.navy, marginBottom:4 }}>Parceiro {nc.l}</h1>
        <div style={{ fontSize:13, color:C.slate, marginBottom:4 }}>
          <strong>{eu.jobs}</strong> serviços · ⭐ {eu.r}
        </div>
      </div>{/* fecha div padding 20px */}
      {/* Progressão */}
      {pc && <div style={{ margin:'16px', background:C.navy, borderRadius:16, padding:'16px 18px' }}>
        <p style={{ color:'#86efac', fontSize:14, fontWeight:700, textAlign:'center', marginBottom:16 }}>Estás a subir de nível!</p>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <span style={{ fontSize:26 }}>{nc.ic}</span>
          <div style={{ flex:1, height:8, background:'rgba(255,255,255,0.15)', borderRadius:4, margin:'0 8px', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${progressoPct}%`, background:'linear-gradient(90deg,#22c55e,#86efac)', borderRadius:4 }}/>
          </div>
          <span style={{ fontSize:26 }}>{pc.ic}</span>
        </div>
        <p style={{ color:'#94a3b8', fontSize:12, textAlign:'center', lineHeight:1.5 }}>
          Faltam apenas <strong style={{ color:'#fff' }}>{faltam} serviços</strong> para desbloqueares o estatuto de <strong style={{ color:'#86efac' }}>Parceiro {pc.l}</strong>
        </p>
      </div>}
      {/* Lista de níveis */}
      <div style={{ padding:'8px 16px 40px' }}>
        {Object.entries(NIVEIS).map(([id,n],i)=>{
          const isAtual=id===nivel; const atingido=nKeys.indexOf(id)<=idx
          return(
            <div key={id} style={{ display:'flex', gap:14, padding:'16px 0', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ width:52, height:52, borderRadius:'50%', background: atingido?n.bg:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0, opacity:atingido?1:0.5 }}>{n.ic}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ fontSize:15, fontWeight:800, color: atingido?C.navy:'#94a3b8' }}>Parceiro {n.l}</div>
                  {isAtual && <span style={{ fontSize:10, background:n.bg, color:n.cor, padding:'2px 8px', borderRadius:9, fontWeight:700 }}>★ Actual</span>}
                </div>
                <div style={{ fontSize:12, color:C.slate, marginTop:3, lineHeight:1.6 }}>
                  {n.min===0?'Nível de entrada':n.min+' serviços com avaliação ≥'+n.mr}
                </div>
                <div style={{ fontSize:11, color:n.cor, fontWeight:600, marginTop:4 }}>
                  Taxa: {n.taxa}% · {n.taxa===22?'Carteira + levantamento livre':n.taxa===20?'+ Seguro RC em grupo':n.taxa===18?'+ Fundo de equipamento':'+ Prioridade total em novas ordens'}
                </div>
                {isAtual && n.min<eu.jobs && pc && (
                  <div style={{ fontSize:11, color:C.g, marginTop:3 }}>
                    ✓ {eu.jobs} serviços (mínimo {n.min}) · Avaliação {eu.r} ✓
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {/* Dicas */}
        <div style={{ background:'#fef9ec', borderRadius:12, padding:16, marginTop:12, border:'1px solid rgba(245,158,11,0.2)' }}>
          <p style={{ fontSize:13, fontWeight:700, color:'#92400e', marginBottom:8 }}>✨ Dicas para manteres o teu estatuto</p>
          {['Avaliação igual ou superior a 4,5','Sem atrasos nem faltas','Responde às propostas de serviço'].map(t=>(
            <div key={t} style={{ display:'flex', gap:7, marginBottom:5 }}>
              <span style={{ color:C.slate }}>•</span>
              <span style={{ fontSize:12, color:C.slate }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Dashboard actualizado com Online toggle + level banner ──
function PDashV2({ ordens, onOrdem, onCarteira, onChat, onNavMenu }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuActivo, setMenuActivo] = useState(null)
  const [online, setOnline]         = useState(true)
  const [filtroKpi, setFiltroKpi]   = useState(null) // 'aceites'|'propostas'|'concluidas'|null

  const eu = TECNICOS[0]; const nc = NIVEIS[eu.nivel]
  const minhas  = ordens.filter(o => o.tid===eu.id)
  const abertas = minhas.filter(o => o.st!=='concluida')
  const feitas  = minhas.filter(o => o.st==='concluida')
  const pendentes = ordens.filter(o => o.st==='pendente')
  const nKeys   = Object.keys(NIVEIS)
  const idx     = nKeys.indexOf(eu.nivel)
  const prox    = nKeys[idx+1]
  const pc      = prox ? NIVEIS[prox] : null
  const faltam  = pc ? Math.max(0, pc.min - eu.jobs) : 0

  // Lista de ordens conforme KPI activo — calculada FORA do JSX para evitar IIFE
  const ordensFiltradas = filtroKpi==='aceites'   ? abertas
    : filtroKpi==='propostas'  ? pendentes
    : filtroKpi==='concluidas' ? feitas
    : abertas

  const tituloLista = filtroKpi==='propostas'?'Propostas pendentes'
    : filtroKpi==='concluidas'?'Serviços concluídos'
    : 'Ordens atribuídas'

  const handleMenu = id => {
    setMenuActivo(id)
    if (id==='carteira')  { onCarteira?.(); return }
    if (id==='mensagens') { onChat?.(); return }
    onNavMenu?.(id)
  }

  const NAV_ITEMS = []

  return (
    <div style={{ minHeight:'100vh', background:C.mist }}>
      <DrawerMenu open={drawerOpen} onClose={()=>setDrawerOpen(false)} onNavigate={handleMenu} user={{ n:eu.n, ini:eu.ini, id_num:'301612811', nivel:eu.nivel }} activeItem={menuActivo}/>

      {/* Top bar */}
      <div style={{ background:`linear-gradient(145deg,${C.navy},#0e4a2e)`, padding:'14px 16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={()=>setDrawerOpen(true)} style={{ background:'none', border:'none', cursor:'pointer', padding:4, display:'flex', flexDirection:'column', gap:4 }}>
              {[0,1,2].map(i=><div key={i} style={{ width:20, height:2, background:'#fff', borderRadius:2 }}/>)}
            </button>
            <button onClick={()=>setOnline(o=>!o)} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', border:'none', borderRadius:20, cursor:'pointer', background: online ? C.g : '#475569' }}>
              <span style={{ fontSize:12, color:'#fff', fontWeight:700 }}>{online?'Online':'Offline'}</span>
              <div style={{ width:18, height:18, borderRadius:'50%', background:'#fff' }}/>
            </button>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={()=>onNavMenu?.('nivel_p')} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer' }}>
              <span style={{ color:C.amber, fontSize:13 }}>★</span>
              <span style={{ color:'#fff', fontSize:13, fontWeight:700 }}>{eu.r}</span>
            </button>
            {/* Avatar → Perfil/Ficha do prestador */}
            <button onClick={()=>onNavMenu?.('perfil')} style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}>
              <div style={{ width:38, height:38, borderRadius:'50%', background:`linear-gradient(135deg,${C.g},${C.gm})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:'#fff', fontWeight:800, border:'2px solid rgba(255,255,255,0.3)' }}>{eu.ini}</div>
            </button>
          </div>
        </div>
      </div>

      {/* Banner nível */}
      {pc && (
        <button onClick={()=>onNavMenu?.('rating')} style={{ width:'100%', background:`linear-gradient(135deg,${C.navyM},#1a4035)`, padding:'14px 18px', border:'none', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', textAlign:'left' }}>
          <div>
            <div style={{ color:'#fff', fontSize:14, fontWeight:700 }}>Parceiro {nc.l}</div>
            <div style={{ color:'#86efac', fontSize:12, marginTop:2, fontWeight:500 }}>{faltam} serviços para {pc.l}!</div>
          </div>
          <span style={{ fontSize:34 }}>{nc.ic}</span>
        </button>
      )}

      {/* Conteúdo principal */}
      <div style={{ padding:'14px 16px 100px' }}>
        {/* Carteira */}
        <div onClick={onCarteira} style={{ background:`linear-gradient(135deg,${C.navy},${C.gd})`, borderRadius:14, padding:'16px', marginBottom:14, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ color:'#94a3b8', fontSize:11, marginBottom:3 }}>A minha carteira</div>
            <div style={{ color:'#fff', fontSize:22, fontWeight:800 }}>€105,00</div>
            <div style={{ color:'#94a3b8', fontSize:11, marginTop:2 }}>+€57,00 pendente</div>
          </div>
          <span style={{ fontSize:9, color:'#86efac', fontWeight:700, background:'rgba(34,197,94,0.15)', padding:'4px 9px', borderRadius:9 }}>{nc.ic} {nc.l} · {nc.taxa}%</span>
        </div>

        {/* KPIs clicáveis */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
          {[
            {id:'aceites',   ic:'📋', v:abertas.length,   l:'Aceites'},
            {id:'propostas', ic:'📩', v:pendentes.length, l:'Propostas'},
            {id:'concluidas',ic:'✅', v:feitas.length,    l:'Concluídas'},
          ].map(kpi => (
            <div key={kpi.id} onClick={()=>setFiltroKpi(f=>f===kpi.id?null:kpi.id)}
              style={{ background: filtroKpi===kpi.id ? C.navy : C.white, borderRadius:12, padding:'12px 8px', textAlign:'center', border:`2px solid ${filtroKpi===kpi.id?C.g:C.border}`, cursor:'pointer', transition:'all 0.15s' }}>
              <div style={{ fontSize:16 }}>{kpi.ic}</div>
              <div style={{ fontSize:17, fontWeight:800, color:filtroKpi===kpi.id?'#fff':C.navy, marginTop:3 }}>{kpi.v}</div>
              <div style={{ fontSize:9, color:filtroKpi===kpi.id?'#86efac':C.slate, marginTop:2 }}>{kpi.l}</div>
            </div>
          ))}
        </div>

        {/* Lista de ordens — sem IIFE */}
        {ordensFiltradas.length > 0 && <>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <h2 style={{ fontSize:14, fontWeight:700, color:C.navy }}>{tituloLista}</h2>
            {filtroKpi && <button onClick={()=>setFiltroKpi(null)} style={{ fontSize:10, color:C.slate, background:'none', border:'none', cursor:'pointer' }}>Limpar ×</button>}
          </div>
          {ordensFiltradas.map(ord => {
            const sv = svcById(ord.sid)
            return (
              <Card key={ord.id} style={{ padding:13, marginBottom:8 }} onClick={() => onOrdem(ord)}>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <span style={{ fontSize:20 }}>{sv?.ic||'🔧'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ fontSize:13, fontWeight:700, color:C.navy }}>{sv?.n}</span>
                      <EstBadge st={ord.st}/>
                    </div>
                    <div style={{ fontSize:11, color:C.slate, marginTop:2 }}>📍 {ord.morada}</div>
                    <div style={{ display:'flex', gap:8, marginTop:3, alignItems:'center' }}>
                      <span style={{ fontSize:11, color:C.g, fontWeight:600 }}>🕐 {ord.data}{ord.hora?' '+ord.hora:''}</span>
                      {ord.km && <span style={{ fontSize:10, background:C.gl, color:C.gd, padding:'1px 6px', borderRadius:8, fontWeight:700 }}>📏 {ord.km} km</span>}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </>}

        {ordensFiltradas.length === 0 && (
          <div style={{ textAlign:'center', padding:'32px 0', color:C.slate }}>
            <div style={{ fontSize:40, marginBottom:10 }}>📋</div>
            <div style={{ fontSize:14, fontWeight:600, color:C.navy, marginBottom:4 }}>
              {filtroKpi==='concluidas'?'Sem serviços concluídos':filtroKpi==='propostas'?'Sem propostas pendentes':'Sem ordens activas'}
            </div>
            <div style={{ fontSize:12 }}>Aguarda novas propostas de serviço</div>
          </div>
        )}
      </div>
    </div>
  )
}

function GDash({ ordens, onOrdem, onRede, onPag }) {
  const c = { pendente:ordens.filter(o=>o.st==='pendente').length, em_curso:ordens.filter(o=>o.st==='em_curso').length, concluida:ordens.filter(o=>o.st==='concluida').length }
  return (
    <div style={{ minHeight:'100vh', background:C.mist }}>
      <div style={{ background:C.navy, padding:'22px 20px 18px' }}>
        <h1 style={{ color:'#fff', fontSize:17, fontWeight:800, margin:'0 0 2px' }}>Painel de Gestão</h1>
        <p style={{ color:'#94a3b8', fontSize:10, margin:'0 0 14px' }}>Operação em tempo real · {new Date().toLocaleDateString('pt-PT')}</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          {[['🟡',c.pendente,'Pendentes','#fef3c7','#92400e'],['🔵',c.em_curso,'Em curso','#eff6ff','#1d4ed8'],['✅',c.concluida,'Concluídas',C.gl,C.gd]].map(([ic,n,l,bg,col]) => (
            <div key={l} style={{ background:bg, borderRadius:11, padding:'11px 7px', textAlign:'center' }}>
              <div style={{ fontSize:13 }}>{ic}</div><div style={{ fontSize:20, fontWeight:800, color:col }}>{n}</div><div style={{ fontSize:8, color:col, fontWeight:600 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding:'14px 16px 20px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9, marginBottom:16 }}>
          {[['👥','Rede de parceiros',onRede],['💳','Pagamentos SEPA',onPag]].map(([ic,l,fn]) => (
            <button key={l} onClick={fn} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:13, padding:'14px 11px', cursor:'pointer', textAlign:'left' }}>
              <div style={{ fontSize:20, marginBottom:4 }}>{ic}</div><div style={{ fontSize:12, fontWeight:700, color:C.navy, lineHeight:1.3 }}>{l}</div>
            </button>
          ))}
        </div>
        <h2 style={{ fontSize:14, fontWeight:700, color:C.navy, margin:'0 0 10px' }}>Todas as ordens</h2>
        {ordens.map(o => { const s=svcById(o.sid); const t=tecById(o.tid); return (
          <Card key={o.id} style={{ padding:13, marginBottom:7 }} onClick={() => onOrdem(o)}>
            <div style={{ display:'flex', gap:9, alignItems:'flex-start' }}>
              <span style={{ fontSize:20, marginTop:1 }}>{s?.ic||'🔧'}</span>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}><span style={{ fontSize:12, fontWeight:700, color:C.navy }}>{s?.n}</span><EstBadge st={o.st}/></div>
                <div style={{ fontSize:10, color:C.slate }}>👤 {o.cli} · 📍 {o.morada}</div>
                {t ? <div style={{ fontSize:10, color:C.g, fontWeight:600, marginTop:1 }}>👷 {t.n}</div> : <div style={{ fontSize:10, color:C.amber, fontWeight:600, marginTop:1 }}>⚠️ Por atribuir</div>}
              </div>
            </div>
          </Card>
        )})}
      </div>
    </div>
  )
}

function GOrdem({ o, onBack, onUpdate }) {
  const [tid, setTid] = useState(o.tid)
  const s = svcById(o.sid)
  const cands = TECNICOS.filter(t => t.cats.includes(s?.cat))
  return (
    <div style={{ minHeight:'100vh', background:C.mist }}>
      <Header title='Gerir Ordem' sub={o.id} onBack={onBack}/>
      <div style={{ padding:'14px 16px 110px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}><EstBadge st={o.st}/><span style={{ fontSize:12, fontWeight:700, color:C.navy }}>€{s?.p} {s?.u}</span></div>
        <Card style={{ padding:14, marginBottom:10 }}>
          {[['Serviço',s?.n],['Cliente',o.cli],['Data',o.data],['Morada',o.morada],o.notas&&['Notas',o.notas]].filter(Boolean).map(([l,v]) => (
            <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #f1f5f9' }}><span style={{ fontSize:11, color:C.slate }}>{l}</span><span style={{ fontSize:11, fontWeight:700, color:C.navy, maxWidth:200, textAlign:'right' }}>{v}</span></div>
          ))}
        </Card>
        {o.st==='pendente' && <Card style={{ padding:14, marginBottom:10 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>Atribuir técnico</div>
          {cands.map(t => (
            <button key={t.id} onClick={() => setTid(t.id)} style={{ width:'100%', background:'none', borderRadius:11, padding:'10px', border: tid===t.id ? `2px solid ${C.g}` : `1.5px solid ${C.border}`, display:'flex', alignItems:'center', gap:9, cursor:'pointer', marginBottom:6, textAlign:'left' }}>
              <div style={{ position:'relative' }}><Av ini={t.ini} size={36}/>
                <div style={{ position:'absolute', bottom:0, right:0, width:9, height:9, borderRadius:'50%', background: t.st==='activo' ? C.gm : C.amber, border:'2px solid #fff' }}/>
              </div>
              <div style={{ flex:1 }}><div style={{ fontSize:12, fontWeight:700, color:C.navy }}>{t.n}</div><Stars v={t.r} s={10}/></div>
              {tid===t.id && <span style={{ color:C.g, fontSize:15 }}>✓</span>}
            </button>
          ))}
        </Card>}
      </div>
      {o.st==='pendente' && <FixedBottom><Btn full dis={!tid} onClick={() => { onUpdate({...o,tid,st:'atribuida'}); onBack() }}>Confirmar atribuição ✓</Btn></FixedBottom>}
    </div>
  )
}

function GRede({ onBack }) {
  const [cat, setCat] = useState(null)
  const [pSel, setPSel] = useState(null)
  const [tabP, setTabP] = useState('perfil')
  if (pSel) return (
    <div style={{ minHeight:'100vh', background:C.mist }}>
      <div style={{ background:C.navy, padding:'13px 16px 0' }}>
        <button onClick={() => setPSel(null)} style={{ background:'none', border:'none', color:'#8FA8BB', fontSize:11, cursor:'pointer', fontWeight:700, padding:'0 0 10px' }}>← Rede</button>
        <div style={{ display:'flex', gap:12, alignItems:'center', paddingBottom:14 }}>
          <Av ini={pSel.ini} size={54}/>
          <div>
            <h2 style={{ color:'#fff', fontSize:16, fontWeight:800, margin:'0 0 4px' }}>{pSel.n}</h2>
            <div style={{ display:'flex', gap:6 }}><Stars v={pSel.r} s={11}/><span style={{ fontSize:10, background: pSel.ok ? C.gl : '#fef3c7', color: pSel.ok ? C.gd : '#92400e', padding:'2px 7px', borderRadius:8, fontWeight:700 }}>{pSel.ok?'✓ Verificado':'Pendente'}</span></div>
          </div>
        </div>
        <div style={{ display:'flex' }}>{['perfil','historico','pagamentos'].map(t => <button key={t} onClick={() => setTabP(t)} style={{ flex:1, padding:'8px 0', background:'none', border:'none', borderBottom: tabP===t ? `2px solid ${C.gm}` : '2px solid transparent', color: tabP===t ? '#86efac' : '#94a3b8', fontSize:10, fontWeight:700, cursor:'pointer', textTransform:'capitalize' }}>{t}</button>)}</div>
      </div>
      <div style={{ padding:'14px 16px 40px' }}>
        {tabP==='perfil' && <>
          <Card style={{ padding:14, marginBottom:10 }}>
            {[['IBAN',pSel.iban],['Nível',NIVEIS[pSel.nivel]?.l||'—'],['Localidade',pSel.loc],['Áreas',pSel.cats.map(c=>catById(c)?.l).join(', ')],['Serviços',pSel.jobs],['Avaliação',pSel.r]].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #f1f5f9' }}><span style={{ fontSize:11, color:C.slate }}>{l}</span><span style={{ fontSize:11, fontWeight:700, color:C.navy }}>{v}</span></div>
            ))}
          </Card>
          <div style={{ display:'flex', gap:8 }}><Btn full>💬 Mensagem</Btn><Btn v='ghost' full>📋 Atribuir ordem</Btn></div>
        </>}
        {tabP==='historico' && ['Limpeza Mensal — Rua das Flores','Manutenção Preventiva — Ed. Roma','Limpeza Pós-Obra'].map((sv,i) => (
          <Card key={i} style={{ padding:12, marginBottom:7 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div><div style={{ fontSize:12, fontWeight:600, color:C.navy }}>{sv}</div><div style={{ fontSize:10, color:C.slate }}>{['Hoje','Ontem','12 Abr'][i]}</div></div>
              <span style={{ fontSize:9, fontWeight:700, background:C.gl, color:C.gd, padding:'2px 8px', borderRadius:8 }}>Concluído</span>
            </div>
          </Card>
        ))}
        {tabP==='pagamentos' && <>
          <Card style={{ padding:14, marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:7 }}>IBAN · Swan SEPA CT</div>
            <div style={{ background:C.mist, borderRadius:8, padding:'8px 12px', fontFamily:'monospace', fontSize:12, color:C.navy, marginBottom:5 }}>{pSel.iban}</div>
            <div style={{ fontSize:10, color:C.slate }}>D+1 · Swan.io</div>
          </Card>
          {[['PAG-041','€ 145,00','10 Abr'],['PAG-032','€ 210,00','10 Mar']].map(([r,v,d]) => (
            <Card key={r} style={{ padding:12, marginBottom:7 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div><div style={{ fontSize:12, fontWeight:700, color:C.navy }}>{r}</div><div style={{ fontSize:9, color:C.slate }}>{d}</div></div>
                <div style={{ textAlign:'right' }}><div style={{ fontSize:13, fontWeight:800, color:C.navy }}>{v}</div><span style={{ fontSize:9, color:C.g, fontWeight:700 }}>✓ SEPA</span></div>
              </div>
            </Card>
          ))}
        </>}
      </div>
    </div>
  )
  return (
    <div style={{ minHeight:'100vh', background:C.mist }}>
      <div style={{ background:C.navy, padding:'13px 16px 0', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div>
            <button onClick={onBack} style={{ background:'none', border:'none', color:'#8FA8BB', fontSize:10, cursor:'pointer', fontWeight:700, padding:'0 0 3px', display:'block' }}>← Voltar</button>
            <h1 style={{ color:'#fff', fontSize:16, fontWeight:800, margin:0 }}>Rede de Parceiros</h1>
          </div>
          <button style={{ background:C.g, color:'#fff', border:'none', borderRadius:9, padding:'7px 11px', fontSize:11, fontWeight:700, cursor:'pointer' }}>+ Convidar</button>
        </div>
        <div style={{ display:'flex', gap:7, overflowX:'auto', paddingBottom:10 }}>
          {[{id:null,l:'Todos'},...CATS.map(c=>({id:c.id,l:c.l}))].map(f => (
            <button key={f.id||'t'} onClick={() => setCat(f.id)} style={{ flexShrink:0, padding:'5px 11px', borderRadius:16, border:'none', cursor:'pointer', background: cat===f.id ? C.g : 'rgba(255,255,255,0.1)', color: cat===f.id ? '#fff' : '#94a3b8', fontSize:10, fontWeight:600 }}>{f.l}</button>
          ))}
        </div>
      </div>
      <div style={{ padding:'12px 14px 20px' }}>
        {TECNICOS.filter(t => cat ? t.cats.includes(cat) : true).map(t => (
          <Card key={t.id} style={{ padding:13, marginBottom:7 }} onClick={() => setPSel(t)}>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <div style={{ position:'relative' }}><Av ini={t.ini} size={46}/>{t.st==='activo'&&<div style={{ position:'absolute', bottom:0, right:0, width:10, height:10, borderRadius:'50%', background:C.gm, border:'2px solid #fff' }}/>}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{t.n}</div>
                  <span style={{ fontSize:9, background: t.ok ? C.gl : '#fef3c7', color: t.ok ? C.gd : '#92400e', padding:'2px 6px', borderRadius:7, fontWeight:700 }}>{t.ok?'✓':'⏳'}</span>
                </div>
                <div style={{ fontSize:10, color:C.slate, marginTop:1 }}>📍 {t.loc} · {t.cats.map(c=>catById(c)?.ic).join(' ')}</div>
                <Stars v={t.r} s={10}/>
              </div>
              <span style={{ color:C.border, fontSize:15 }}>›</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function GPag({ onBack }) {
  const pp = ORDENS_INIT.filter(o => o.st==='concluida')
  return (
    <div style={{ minHeight:'100vh', background:C.mist }}>
      <Header title='Pagamentos SEPA CT' sub='Via Swan.io' onBack={onBack}/>
      <div style={{ padding:'14px 16px 40px' }}>
        {pp.length>0 && <div style={{ background:'#fef3c7', borderRadius:10, padding:11, marginBottom:12, border:'1px solid rgba(180,83,9,0.2)' }}><p style={{ margin:0, fontSize:12, color:'#92400e', fontWeight:600 }}>{pp.length} pagamento(s) pendente(s)</p></div>}
        {pp.map(o => { const s=svcById(o.sid); const t=tecById(o.tid); return (
          <Card key={o.id} style={{ padding:14, marginBottom:9 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:9 }}>
              <div><div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{s?.n}</div><div style={{ fontSize:10, color:C.slate }}>{o.cli}</div></div>
              <div style={{ fontSize:16, fontWeight:800, color:C.navy }}>€{s?.p}</div>
            </div>
            {t && <div style={{ display:'flex', alignItems:'center', gap:9, borderTop:'1px solid #f1f5f9', paddingTop:9 }}>
              <Av ini={t.ini} size={34}/>
              <div style={{ flex:1 }}><div style={{ fontSize:12, fontWeight:700, color:C.navy }}>{t.n}</div><div style={{ fontSize:9, fontFamily:'monospace', color:C.slate }}>{t.iban}</div></div>
              <button style={{ background:C.navy, color:'#fff', border:'none', borderRadius:7, padding:'7px 11px', fontSize:11, fontWeight:700, cursor:'pointer' }}>Pagar →</button>
            </div>}
          </Card>
        )})}
        <Card style={{ padding:14, marginTop:8 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:9 }}>Histórico</div>
          {[['PAG-041','António Ferreira','€ 145,00','10 Abr'],['PAG-032','Ricardo Gomes','€ 210,00','10 Mar']].map(([r,n,v,d]) => (
            <div key={r} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f1f5f9' }}>
              <div><div style={{ fontSize:11, fontWeight:600, color:C.navy }}>{n}</div><div style={{ fontSize:9, color:C.slate }}>{r} · {d}</div></div>
              <div style={{ textAlign:'right' }}><div style={{ fontSize:12, fontWeight:800, color:C.navy }}>{v}</div><span style={{ fontSize:9, color:C.g, fontWeight:700 }}>✓ SEPA</span></div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

/* ══════════════════════════════════
   ADMIN DESKTOP — Sidebar + Tabelas
══════════════════════════════════ */
const ADMIN_PIN = 'admin2026'
const CLIENTES_INIT = [
  {id:'cl1',n:'Sr. Ferreira',   email:'ferreira@email.com',  tel:'912 000 001',morada:'Rua das Flores, 23, Caldas',   pedidos:4, gasto:300,  ativo:true, desde:'Jan 2024'},
  {id:'cl2',n:'Cond. Verde',    email:'cond.verde@email.com', tel:'912 000 002',morada:'Av. da Liberdade, 10, Caldas', pedidos:2, gasto:130,  ativo:true, desde:'Mar 2024'},
  {id:'cl3',n:'Sra. Alves',     email:'alves@email.com',      tel:'912 000 003',morada:'Quinta Rosas, Óbidos',         pedidos:7, gasto:585,  ativo:true, desde:'Nov 2023'},
  {id:'cl4',n:'Cond. Sol',      email:'sol@email.com',         tel:'912 000 004',morada:'Rua do Sol, 5, Caldas',       pedidos:1, gasto:75,   ativo:true, desde:'Abr 2024'},
  {id:'cl5',n:'Sr. Martins',    email:'martins@email.com',     tel:'912 000 005',morada:'Ed. Atlântico, Caldas',       pedidos:3, gasto:195,  ativo:false,desde:'Fev 2024'},
  {id:'cl6',n:'Ed. Atlântico',  email:'atlantico@email.com',   tel:'912 000 006',morada:'Rua do Porto, 1, Caldas',    pedidos:12,gasto:960,  ativo:true, desde:'Jun 2023'},
]
// Paleta admin (separada de C mobile)
const A = {
  sidebar:'#0f172a', bg:'#f1f5f9', white:'#fff', border:'#e2e8f0',
  accent:'#16a34a', accentL:'#dcfce7', accentD:'#14532d',
  navy:'#0f172a', text:'#1e293b', slate:'#64748b', muted:'#94a3b8',
  amber:'#f59e0b', amberL:'#fef3c7',
  red:'#ef4444',   redL:'#fee2e2',
  blue:'#3b82f6',  blueL:'#eff6ff',
  purple:'#8b5cf6',purpleL:'#f5f3ff',
}
const ADMIN_NAV = [
  {id:'dashboard',   ic:'📊', l:'Dashboard'},
  {id:'pipeline',    ic:'🔄', l:'Pipeline'},
  {id:'servicos',    ic:'🔧', l:'Serviços'},
  {id:'clientes',    ic:'👥', l:'Clientes'},
  {id:'prestadores', ic:'👷', l:'Prestadores'},
  {id:'escaloes',    ic:'🏅', l:'Escalões'},
  {id:'pagamentos',  ic:'💳', l:'Pagamentos'},
  {id:'config',      ic:'⚙️', l:'Configurações'},
]
// ── helpers UI desktop ──────────────
const ATh = ({ch}) => <th style={{textAlign:'left',fontSize:11,fontWeight:700,color:A.slate,textTransform:'uppercase',letterSpacing:'0.05em',padding:'10px 14px',background:A.bg,borderBottom:`2px solid ${A.border}`,whiteSpace:'nowrap'}}>{ch}</th>
const ATd = ({children,right,mono}) => <td style={{padding:'11px 14px',fontSize:13,color:A.text,borderBottom:`1px solid ${A.border}`,textAlign:right?'right':'left',fontFamily:mono?'monospace':'inherit'}}>{children}</td>
function ABadge({t,col='gray'}) {
  const m={green:{bg:A.accentL,c:A.accentD},amber:{bg:A.amberL,c:'#92400e'},red:{bg:A.redL,c:A.red},blue:{bg:A.blueL,c:'#1d4ed8'},purple:{bg:A.purpleL,c:A.purple},gray:{bg:'#f1f5f9',c:A.slate}}
  const p=m[col]||m.gray
  return <span style={{fontSize:11,fontWeight:700,background:p.bg,color:p.c,padding:'3px 9px',borderRadius:20,whiteSpace:'nowrap'}}>{t}</span>
}
function AKpi({ic,label,value,sub,col='accent'}) {
  const bg={accent:A.accentL,blue:A.blueL,amber:A.amberL,purple:A.purpleL}[col]||A.accentL
  const ci={accent:A.accent,blue:A.blue,amber:A.amber,purple:A.purple}[col]||A.accent
  return (
    <div style={{flex:'1 1 180px',minWidth:0,background:A.white,borderRadius:12,padding:'16px 18px',border:`1px solid ${A.border}`,display:'flex',gap:12,alignItems:'flex-start'}}>
      <div style={{width:44,height:44,borderRadius:11,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{ic}</div>
      <div style={{minWidth:0}}>
        <div style={{fontSize:11,color:A.slate,fontWeight:600,marginBottom:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{label}</div>
        <div style={{fontSize:22,fontWeight:800,color:A.navy,lineHeight:1}}>{value}</div>
        {sub&&<div style={{fontSize:10,color:A.slate,marginTop:3}}>{sub}</div>}
      </div>
    </div>
  )
}
function AModal({title,onClose,children,wide}) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:24}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{background:A.white,borderRadius:16,boxShadow:'0 24px 70px rgba(0,0,0,0.25)',width:'100%',maxWidth:wide?800:520,maxHeight:'88vh',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'16px 22px',borderBottom:`1px solid ${A.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:800,color:A.navy,margin:0}}>{title}</h2>
          <button onClick={onClose} style={{background:'#f1f5f9',border:'none',borderRadius:7,width:30,height:30,cursor:'pointer',fontSize:16,color:A.slate,lineHeight:1}}>✕</button>
        </div>
        <div style={{padding:22,overflowY:'auto',flex:1}}>{children}</div>
      </div>
    </div>
  )
}
function ATopBar({title,sub,children}) {
  return (
    <div style={{background:A.white,borderBottom:`1px solid ${A.border}`,padding:'14px 26px',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,zIndex:10}}>
      <div>
        <h1 style={{fontSize:17,fontWeight:800,color:A.navy,margin:0}}>{title}</h1>
        {sub&&<p style={{fontSize:11,color:A.slate,margin:'3px 0 0'}}>{sub}</p>}
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>{children}</div>
    </div>
  )
}
function AFRow({label,children,half}){return<div style={{marginBottom:12,gridColumn:half?'auto':'1/-1'}}><label style={{display:'block',fontSize:10,fontWeight:700,color:A.slate,marginBottom:5,textTransform:'uppercase',letterSpacing:'0.04em'}}>{label}</label>{children}</div>}
const ainp=(val,set,type='text',ph='',mono=false)=><input type={type} value={val??''} onChange={e=>set(e.target.value)} placeholder={ph} style={{width:'100%',border:`1.5px solid ${A.border}`,borderRadius:8,padding:'8px 11px',fontSize:13,outline:'none',color:A.navy,background:A.white,boxSizing:'border-box',fontFamily:mono?'monospace':'inherit'}}/>
const asel=(val,set,opts)=><select value={val??''} onChange={e=>set(e.target.value)} style={{width:'100%',border:`1.5px solid ${A.border}`,borderRadius:8,padding:'8px 11px',fontSize:13,outline:'none',color:A.navy,background:A.white,boxSizing:'border-box'}}>{opts.map(o=><option key={Array.isArray(o)?o[0]:o} value={Array.isArray(o)?o[0]:o}>{Array.isArray(o)?o[1]:o}</option>)}</select>
function APrimBtn({ch,onClick,disabled}){return<button onClick={onClick} disabled={disabled} style={{background:disabled?A.border:A.accent,color:'#fff',border:'none',borderRadius:9,padding:'9px 18px',fontSize:13,fontWeight:700,cursor:disabled?'default':'pointer',whiteSpace:'nowrap'}}>{ch}</button>}
function ASecBtn({ch,onClick}){return<button onClick={onClick} style={{background:A.white,color:A.text,border:`1.5px solid ${A.border}`,borderRadius:9,padding:'8px 16px',fontSize:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>{ch}</button>}
function ATBtn({ch,onClick,col='default'}){
  const p={default:{bg:'#f1f5f9',c:A.text},green:{bg:A.accentL,c:A.accentD},red:{bg:A.redL,c:A.red},amber:{bg:A.amberL,c:'#92400e'}}[col]||{bg:'#f1f5f9',c:A.text}
  return<button onClick={onClick} style={{padding:'5px 11px',borderRadius:7,border:'none',background:p.bg,color:p.c,fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>{ch}</button>
}

// ══ AdminLogin ═══════════════════════
function AdminLogin({onLogin}){
  const [pw,setPw]=useState(''), [err,setErr]=useState(false)
  const go=()=>{if(pw===ADMIN_PIN){onLogin()}else{setErr(true);setPw('')}}
  return(
    <div style={{minHeight:'100vh',background:`linear-gradient(135deg,#0f172a 0%,#14532d 100%)`,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:A.white,borderRadius:18,padding:40,width:380,boxShadow:'0 30px 80px rgba(0,0,0,0.35)'}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{width:62,height:62,borderRadius:15,background:A.navy,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 14px'}}>⚙️</div>
          <h1 style={{fontSize:20,fontWeight:800,color:A.navy,margin:'0 0 4px'}}>Painel de Administração</h1>
          <p style={{fontSize:11,color:A.slate,margin:0}}>ServiçoPRO · v5-manutenção</p>
        </div>
        <label style={{display:'block',fontSize:10,fontWeight:700,color:A.slate,marginBottom:5,textTransform:'uppercase',letterSpacing:'0.04em'}}>Password</label>
        <input type='password' value={pw} onChange={e=>{setPw(e.target.value);setErr(false)}} onKeyDown={e=>e.key==='Enter'&&go()} placeholder='••••••••'
          style={{width:'100%',border:`2px solid ${err?A.red:A.border}`,borderRadius:10,padding:'12px 14px',fontSize:15,outline:'none',color:A.navy,letterSpacing:'0.12em',boxSizing:'border-box',marginBottom:err?4:16}}/>
        {err&&<p style={{color:A.red,fontSize:11,margin:'0 0 12px'}}>Password incorrecta. Tente novamente.</p>}
        <button onClick={go} style={{width:'100%',background:A.accent,color:'#fff',border:'none',borderRadius:11,padding:'13px',fontSize:14,fontWeight:800,cursor:'pointer'}}>Entrar →</button>
        <p style={{textAlign:'center',color:A.muted,fontSize:10,marginTop:14}}>Demo: <code style={{background:'#f1f5f9',padding:'2px 6px',borderRadius:4,letterSpacing:'0.05em'}}>admin2026</code></p>
      </div>
    </div>
  )
}

// ══ AdminSidebar ══════════════════════
function AdminSidebar({active,set,onLogout}){
  return(
    <div style={{width:240,background:A.sidebar,height:'100vh',position:'fixed',left:0,top:0,display:'flex',flexDirection:'column',zIndex:20,boxShadow:'4px 0 20px rgba(0,0,0,0.25)'}}>
      <div style={{padding:'20px 18px 14px',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,borderRadius:10,background:A.accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🏠</div>
          <div><div style={{color:'#fff',fontSize:14,fontWeight:800,letterSpacing:'-0.01em'}}>ServiçoPRO</div><div style={{color:A.muted,fontSize:9,fontWeight:700,letterSpacing:'0.08em',marginTop:1}}>ADMIN v5</div></div>
        </div>
      </div>
      <nav style={{flex:1,padding:'8px 10px',overflowY:'auto'}}>
        {ADMIN_NAV.map(n=>(
          <button key={n.id} onClick={()=>set(n.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:9,border:'none',cursor:'pointer',marginBottom:1,fontFamily:'inherit',background:active===n.id?'rgba(34,197,94,0.15)':'transparent',borderLeft:active===n.id?`3px solid ${A.accent}`:'3px solid transparent',color:active===n.id?'#86efac':A.muted,fontSize:13,fontWeight:active===n.id?700:400,textAlign:'left',transition:'all 0.15s'}}
            onMouseEnter={e=>{if(active!==n.id)e.currentTarget.style.background='rgba(255,255,255,0.04)'}}
            onMouseLeave={e=>{if(active!==n.id)e.currentTarget.style.background='transparent'}}>
            <span style={{fontSize:16,width:22,textAlign:'center',flexShrink:0}}>{n.ic}</span>
            <span>{n.l}</span>
          </button>
        ))}
      </nav>
      <div style={{padding:'12px 12px 18px',borderTop:'1px solid rgba(255,255,255,0.07)'}}>
        <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:10,padding:'8px 10px',borderRadius:9,background:'rgba(255,255,255,0.04)'}}>
          <div style={{width:32,height:32,borderRadius:'50%',background:A.accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'#fff',fontWeight:800,flexShrink:0}}>A</div>
          <div><div style={{color:'#fff',fontSize:12,fontWeight:700}}>Administrador</div><div style={{color:A.muted,fontSize:10}}>admin@servicopro.pt</div></div>
        </div>
        <button onClick={onLogout} style={{width:'100%',padding:'8px 12px',border:'none',borderRadius:8,background:'rgba(239,68,68,0.1)',color:'#fca5a5',fontSize:12,fontWeight:600,cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}>🚪 Terminar sessão</button>
      </div>
    </div>
  )
}

// ══ AdminDashboard ═════════════════════
function AdminDashboard({svcs,prest,clientes}){
  const ORDENS_D=[
    {svc:'Limpeza Mensal',       cli:'Sr. Ferreira',  ini:'AF', pNome:'António F.',  dt:'Hoje · 14:00', val:75, st:'em_curso'},
    {svc:'Urgência Canalização', cli:'Cond. Verde',   ini:null, pNome:'Por atribuir',dt:'Amanhã · 10:00',val:65, st:'pendente'},
    {svc:'Manutenção Jardim',    cli:'Sra. Alves',    ini:'MC', pNome:'Manuel C.',   dt:'12 Abr',        val:45, st:'concluida'},
    {svc:'Plano Anual',          cli:'Sr. Martins',   ini:'SM', pNome:'Sandra M.',   dt:'Hoje · 16:00',  val:49, st:'em_curso'},
    {svc:'Limpeza Pós-Obra',     cli:'Cond. Sol',     ini:null, pNome:'Por atribuir',dt:'22 Abr',        val:120,st:'pendente'},
  ]
  const stLabel={pendente:'Pendente',em_curso:'Em curso',concluida:'Concluída'}
  const stCol  ={pendente:'amber',  em_curso:'blue',    concluida:'green'}
  const pending=ORDENS_D.filter(o=>o.st==='pendente').length
  const prestAtivos=prest.filter(p=>p.st==='activo').length
  const prestPend  =prest.filter(p=>!p.ok).length

  return(
    <div style={{padding:'28px 30px'}}>
      {/* Cabeçalho */}
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:800,color:A.navy,margin:'0 0 4px'}}>Dashboard</h1>
        <p style={{fontSize:12,color:A.slate,margin:0}}>Visão geral da plataforma · Abril 2026</p>
      </div>
      {/* KPIs — grid 4 colunas sempre */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24}}>
        {[
          {ic:'💰',label:'Receita este mês',   value:'€ 1.890',sub:'+12% vs mês anterior',           col:'accent'},
          {ic:'📋',label:'Ordens pendentes',    value:String(pending),  sub:`${ORDENS_D.length} total`, col:'amber'},
          {ic:'👷',label:'Prestadores activos', value:String(prestAtivos),sub:`${prestPend} por verificar`,col:'blue'},
          {ic:'💳',label:'SEPA a processar',    value:'€ 439',  sub:'Swan.io · D+1',                  col:'purple'},
        ].map(k=>{
          const bg={accent:A.accentL,amber:A.amberL,blue:A.blueL,purple:A.purpleL}[k.col]
          return(
            <div key={k.label} style={{background:A.white,borderRadius:14,padding:'20px',border:`1px solid ${A.border}`,boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
                <p style={{fontSize:11,fontWeight:700,color:A.slate,textTransform:'uppercase',letterSpacing:'0.05em',margin:0,lineHeight:1.4}}>{k.label}</p>
                <div style={{width:40,height:40,borderRadius:11,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{k.ic}</div>
              </div>
              <div style={{fontSize:30,fontWeight:900,color:A.navy,letterSpacing:'-0.02em',lineHeight:1}}>{k.value}</div>
              <div style={{fontSize:11,color:A.slate,marginTop:7}}>{k.sub}</div>
            </div>
          )
        })}
      </div>
      {/* Grid principal */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:18}}>
        {/* Tabela ordens */}
        <div style={{background:A.white,borderRadius:14,border:`1px solid ${A.border}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
          <div style={{padding:'16px 20px',borderBottom:`1px solid ${A.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <span style={{fontSize:14,fontWeight:800,color:A.navy}}>Ordens recentes</span>
              <span style={{marginLeft:8,fontSize:11,color:A.slate}}>{ORDENS_D.length} registos</span>
            </div>
            <span style={{fontSize:11,color:A.accent,fontWeight:700,cursor:'pointer'}}>Ver todas →</span>
          </div>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#f8fafc'}}><ATh ch='Serviço'/><ATh ch='Cliente'/><ATh ch='Prestador'/><ATh ch='Data'/><ATh ch='Valor'/><ATh ch='Estado'/></tr></thead>
            <tbody>{ORDENS_D.map((o,i)=>(
              <tr key={i} style={{cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <ATd><span style={{fontWeight:700}}>{o.svc}</span></ATd>
                <ATd><span style={{fontSize:12}}>{o.cli}</span></ATd>
                <ATd>{o.ini?<div style={{display:'flex',alignItems:'center',gap:7}}><div style={{width:24,height:24,borderRadius:'50%',background:'linear-gradient(135deg,#16a34a,#22c55e)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,color:'#fff',fontWeight:800}}>{o.ini}</div><span style={{fontSize:12}}>{o.pNome}</span></div>:<span style={{fontSize:12,color:A.muted,fontStyle:'italic'}}>{o.pNome}</span>}</ATd>
                <ATd><span style={{fontSize:11,color:A.slate}}>{o.dt}</span></ATd>
                <ATd><span style={{fontWeight:700,color:A.accent}}>€{o.val}</span></ATd>
                <ATd><ABadge t={stLabel[o.st]} col={stCol[o.st]}/></ATd>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {/* Lateral */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{background:A.white,borderRadius:14,border:`1px solid ${A.border}`,padding:20,boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
            <div style={{fontSize:13,fontWeight:800,color:A.navy,marginBottom:14}}>Margem por serviço</div>
            {svcs.slice(0,5).map(s=>{const m=s.margem||Math.round(s.p*0.18);return(
              <div key={s.id} style={{marginBottom:11}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><span style={{fontSize:11,color:A.text}}>{s.ic} {s.n}</span><span style={{fontSize:11,fontWeight:700,color:A.accent}}>€{m}</span></div>
                <div style={{height:5,background:'#f1f5f9',borderRadius:99}}><div style={{height:'100%',width:`${Math.min(100,m/25*100)}%`,background:`linear-gradient(90deg,${A.accent},#22c55e)`,borderRadius:99}}/></div>
              </div>
            )})}
          </div>
          <div style={{background:A.white,borderRadius:14,border:`1px solid ${A.border}`,padding:20,boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
            <div style={{fontSize:13,fontWeight:800,color:A.navy,marginBottom:14}}>Top prestadores</div>
            {prest.slice(0,4).map((p,i)=>{const nc=NIVEIS[p.nivel];return(
              <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,paddingBottom:i<3?10:0,marginBottom:i<3?10:0,borderBottom:i<3?`1px solid ${A.border}`:'none'}}>
                {p.foto?<img src={p.foto} alt='' style={{width:36,height:36,borderRadius:'50%',objectFit:'cover',flexShrink:0}}/>:<div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#16a34a,#22c55e)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#fff',fontWeight:800,flexShrink:0}}>{p.ini}</div>}
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:700,color:A.navy,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.n}</div><div style={{fontSize:10,color:A.slate}}>⭐ {p.r} · {p.jobs} serviços</div></div>
                <span style={{fontSize:10,fontWeight:700,background:nc?.bg,color:nc?.cor,padding:'3px 8px',borderRadius:8,flexShrink:0}}>{nc?.ic}</span>
              </div>
            )})}
          </div>
          <div style={{background:`linear-gradient(135deg,${A.navy},#1a3a5c)`,borderRadius:14,padding:20}}>
            <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',marginBottom:14,textTransform:'uppercase',letterSpacing:'0.06em'}}>Este mês</div>
            {[['Serviços concluídos','18'],['Taxa média','18%'],['Clientes activos',String(clientes.filter(c=>c.ativo).length)],['NPS estimado','87']].map(([l,v])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                <span style={{fontSize:11,color:'rgba(255,255,255,0.55)'}}>{l}</span>
                <span style={{fontSize:14,fontWeight:800,color:'#fff'}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
// ══ AdminPipeline — Kanban de estados de ordens ════
const PIPELINE_STAGES = [
  {id:'pendente_pagamento', l:'Aguarda Pagamento', ic:'💳', col:'#64748b', bg:'#f1f5f9'},
  {id:'pendente',           l:'Pendente',          ic:'📬', col:'#f59e0b', bg:'#fef3c7'},
  {id:'proposta_hora',      l:'Proposta de Hora',  ic:'🕐', col:'#8b5cf6', bg:'#f5f3ff'},
  {id:'agendado',           l:'Agendado',          ic:'📅', col:'#3b82f6', bg:'#eff6ff'},
  {id:'em_curso',           l:'Em Execução',       ic:'🔧', col:'#0ea5e9', bg:'#e0f2fe'},
  {id:'aguarda_validacao',  l:'Aguarda Validação', ic:'📋', col:'#f97316', bg:'#fff7ed'},
  {id:'concluida',          l:'Concluído',         ic:'✅', col:'#16a34a', bg:'#dcfce7'},
  {id:'faturada',           l:'Faturado',          ic:'🧾', col:'#10b981', bg:'#d1fae5'},
  {id:'paga',               l:'Pago',              ic:'💰', col:'#059669', bg:'#a7f3d0'},
  {id:'cancelada',          l:'Cancelado',         ic:'❌', col:'#ef4444', bg:'#fee2e2'},
]

function AdminPipeline({ordens, setOrdens, prest}){
  const [selOrd, setSelOrd] = useState(null)
  const [filtro, setFiltro] = useState('todas')

  const svcById = id => SVCS.find(s=>s.id===id)
  const prestById = id => prest.find(p=>p.id===id)

  // agrupa ordens por estado
  const byStage = {}
  PIPELINE_STAGES.forEach(s=>{ byStage[s.id]=[] })
  ordens.forEach(o=>{ if(byStage[o.st]) byStage[o.st].push(o) })

  const total = ordens.length
  const pendentes = ordens.filter(o=>o.st==='pendente').length
  const ativas   = ordens.filter(o=>['agendado','em_curso','aguarda_validacao'].includes(o.st)).length
  const receita  = ordens.filter(o=>['concluida','faturada','paga'].includes(o.st)).reduce((a,o)=>a+o.val,0)

  const moverEstado = (ord, novoEst) => {
    setOrdens(p=>p.map(o=>o.id===ord.id?{...o,st:novoEst}:o))
    if(selOrd?.id===ord.id) setSelOrd({...ord,st:novoEst})
  }

  const PROXIMOS = {
    pendente_pagamento:['pendente','cancelada'],
    pendente:['agendado','cancelada'],
    proposta_hora:['agendado','pendente','cancelada'],
    agendado:['em_curso','cancelada'],
    em_curso:['aguarda_validacao'],
    aguarda_validacao:['concluida'],
    concluida:['faturada'],
    faturada:['paga'],
    paga:[],cancelada:[],
  }

  const stage = s => PIPELINE_STAGES.find(p=>p.id===s)||PIPELINE_STAGES[0]

  return(
    <>
      <ATopBar title='🔄 Pipeline de Ordens' sub='Gestão do ciclo de vida completo de cada serviço'>
        <select onChange={e=>setFiltro(e.target.value)} style={{border:`1.5px solid ${A.border}`,borderRadius:8,padding:'7px 11px',fontSize:12,outline:'none',background:A.white}}>
          <option value='todas'>Todas as ordens</option>
          <option value='ativas'>Em curso</option>
          <option value='pendentes'>Pendentes</option>
        </select>
      </ATopBar>
      <div style={{padding:'20px 24px'}}>
        {/* KPIs rápidos */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[
            {l:'Total ordens',v:total,ic:'📋',col:'accent'},
            {l:'Pendentes',   v:pendentes,ic:'⏳',col:'amber'},
            {l:'Em curso',    v:ativas,   ic:'🔧',col:'blue'},
            {l:'Receita (concluídas)',v:`€${receita}`,ic:'💰',col:'accent'},
          ].map(k=>{
            const bg={accent:A.accentL,amber:A.amberL,blue:A.blueL}[k.col]||A.accentL
            return(
              <div key={k.l} style={{background:A.white,borderRadius:11,padding:'14px 16px',border:`1px solid ${A.border}`,display:'flex',gap:12,alignItems:'center'}}>
                <div style={{width:38,height:38,borderRadius:9,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{k.ic}</div>
                <div><div style={{fontSize:20,fontWeight:800,color:A.navy}}>{k.v}</div><div style={{fontSize:10,color:A.slate}}>{k.l}</div></div>
              </div>
            )
          })}
        </div>

        {/* Kanban scroll horizontal */}
        <div style={{display:'flex',gap:12,overflowX:'auto',paddingBottom:16}}>
          {PIPELINE_STAGES.map(stage=>{
            const cards=byStage[stage.id]||[]
            return(
              <div key={stage.id} style={{minWidth:220,flexShrink:0,background:'#f8fafc',borderRadius:12,border:`1px solid ${A.border}`,overflow:'hidden'}}>
                {/* Header coluna */}
                <div style={{padding:'10px 14px',background:stage.bg,borderBottom:`2px solid ${stage.col}33`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontSize:12,fontWeight:700,color:stage.col}}>{stage.ic} {stage.l}</div>
                  <div style={{width:22,height:22,borderRadius:'50%',background:stage.col,color:'#fff',fontSize:11,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center'}}>{cards.length}</div>
                </div>
                {/* Cards */}
                <div style={{padding:'8px',maxHeight:540,overflowY:'auto',display:'flex',flexDirection:'column',gap:7}}>
                  {cards.length===0&&<div style={{padding:'16px 8px',textAlign:'center',fontSize:11,color:A.muted}}>—</div>}
                  {cards.map(o=>{
                    const s=svcById(o.sid)
                    const p=prestById(o.tid)
                    return(
                      <div key={o.id} onClick={()=>setSelOrd(o)}
                        style={{background:A.white,borderRadius:9,padding:12,border:`1px solid ${A.border}`,cursor:'pointer',boxShadow:'0 1px 3px rgba(0,0,0,0.04)',transition:'all 0.15s'}}
                        onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';e.currentTarget.style.borderColor=stage.col}}
                        onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)';e.currentTarget.style.borderColor=A.border}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                          <span style={{fontSize:12,fontWeight:700,color:A.navy,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:130}}>{s?.n}</span>
                          <span style={{fontSize:11,fontWeight:700,color:A.accent}}>€{o.val}</span>
                        </div>
                        <div style={{fontSize:10,color:A.slate,marginBottom:3}}>👤 {o.cli}</div>
                        <div style={{fontSize:10,color:A.slate,marginBottom:5}}>📍 {o.morada?.split(',')[0]}</div>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <span style={{fontSize:9,color:A.slate}}>🕐 {o.data} {o.hora}</span>
                          {p
                            ?<div style={{width:20,height:20,borderRadius:'50%',background:'linear-gradient(135deg,#16a34a,#22c55e)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,color:'#fff',fontWeight:800}}>{p.ini}</div>
                            :<span style={{fontSize:9,color:A.muted,background:'#f1f5f9',padding:'1px 5px',borderRadius:4}}>Sem prestador</span>
                          }
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Drawer detalhe de ordem */}
      {selOrd&&<>
        <div onClick={()=>setSelOrd(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.3)',zIndex:100}}/>
        <div style={{position:'fixed',right:0,top:0,bottom:0,width:420,background:A.white,boxShadow:'-8px 0 30px rgba(0,0,0,0.15)',zIndex:101,overflowY:'auto',display:'flex',flexDirection:'column'}}>
          {/* Header */}
          <div style={{padding:'18px 22px',borderBottom:`1px solid ${A.border}`,background:`${stage(selOrd.st).bg}`,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:stage(selOrd.st).col,marginBottom:4}}>{stage(selOrd.st).ic} {stage(selOrd.st).l}</div>
              <div style={{fontSize:16,fontWeight:800,color:A.navy}}>{svcById(selOrd.sid)?.n}</div>
              <div style={{fontSize:11,color:A.slate,marginTop:2}}>#{selOrd.id} · {selOrd.dt_pedido}</div>
            </div>
            <button onClick={()=>setSelOrd(null)} style={{background:'rgba(0,0,0,0.08)',border:'none',borderRadius:7,width:28,height:28,cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>
          <div style={{flex:1,padding:22,display:'flex',flexDirection:'column',gap:16}}>
            {/* Detalhes */}
            <div style={{background:'#f8fafc',borderRadius:11,padding:16}}>
              {[
                ['Cliente',selOrd.cli],
                ['Morada',selOrd.morada],
                ['Data/Hora',`${selOrd.data} · ${selOrd.hora}`],
                ['Valor cobrado',`€${selOrd.val}`],
                ['Taxa plataforma',`${selOrd.taxa}% = €${(selOrd.val*selOrd.taxa/100).toFixed(2)}`],
                ['Valor ao prestador',`€${(selOrd.val*(1-selOrd.taxa/100)).toFixed(2)}`],
                ['Notas',selOrd.notas||'—'],
              ].map(([l,v])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:`1px solid ${A.border}`}}>
                  <span style={{fontSize:11,color:A.slate}}>{l}</span>
                  <span style={{fontSize:11,fontWeight:600,color:A.navy,textAlign:'right',maxWidth:240}}>{v}</span>
                </div>
              ))}
            </div>
            {/* Prestador */}
            {selOrd.tid&&(()=>{const p=prestById(selOrd.tid);return p?(<div style={{background:'#f0fdf4',borderRadius:11,padding:14,border:'1px solid #bbf7d0',display:'flex',gap:12,alignItems:'center'}}>
              <div style={{width:42,height:42,borderRadius:'50%',background:'linear-gradient(135deg,#16a34a,#22c55e)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'#fff',fontWeight:800,flexShrink:0}}>{p.ini}</div>
              <div><div style={{fontWeight:700,color:A.navy}}>{p.n}</div><div style={{fontSize:11,color:A.slate}}>{p.indicativo} {p.tel} · {p.email}</div><div style={{fontSize:10,color:A.accent,fontWeight:600,marginTop:2}}>{NIVEIS[p.nivel]?.ic} {NIVEIS[p.nivel]?.l} · ⭐ {p.r}</div></div>
            </div>):null})()}
            {!selOrd.tid&&<div style={{background:A.amberL,borderRadius:10,padding:14,border:'1px solid rgba(245,158,11,0.3)',fontSize:12,color:'#92400e',fontWeight:600}}>⚠️ Sem prestador atribuído — ordem em aberto</div>}

            {/* Fotos */}
            {selOrd.fotos?.length>0&&<div>
              <div style={{fontSize:11,fontWeight:700,color:A.slate,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>Relatório fotográfico</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{selOrd.fotos.map((f,i)=><FotoThumb key={i} src={f} size={70} radius={9}/>)}</div>
            </div>}

            {/* Chat da ordem no admin */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:A.slate,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>Chat da ordem</div>
              <div style={{background:'#f8fafc',borderRadius:10,padding:12,maxHeight:200,overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>
                {(CHAT_INIT[selOrd.id]||[]).map(m=>{
                  const isSys=m.tipo==='system_auto'||m.tipo==='system_alert'
                  return(
                    <div key={m.id} style={{display:'flex',flexDirection:'column',alignItems:isSys?'center':m.tipo==='user_client'?'flex-end':'flex-start'}}>
                      {!isSys&&<div style={{fontSize:9,color:A.slate,marginBottom:2}}>{m.autor}</div>}
                      <div style={{maxWidth:'85%',padding:isSys?'3px 10px':'8px 11px',borderRadius:isSys?12:10,background:isSys?'rgba(0,0,0,0.05)':m.tipo==='user_client'?A.navy:A.white,color:isSys?A.slate:m.tipo==='user_client'?'#fff':A.navy,fontSize:11,border:isSys?'none':`1px solid ${A.border}`}}>{m.texto}</div>
                      <div style={{fontSize:9,color:A.muted,marginTop:1}}>{m.dt}</div>
                    </div>
                  )
                })}
                {!(CHAT_INIT[selOrd.id]?.length)&&<div style={{textAlign:'center',fontSize:11,color:A.muted}}>Sem mensagens</div>}
              </div>
            </div>

            {/* Avançar estado */}
            {PROXIMOS[selOrd.st]?.length>0&&<div>
              <div style={{fontSize:11,fontWeight:700,color:A.slate,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>Avançar estado</div>
              <div style={{display:'flex',flexDirection:'column',gap:7}}>
                {PROXIMOS[selOrd.st].map(est=>{const sg=stage(est);return(
                  <button key={est} onClick={()=>moverEstado(selOrd,est)}
                    style={{padding:'11px 16px',border:`2px solid ${sg.col}44`,borderRadius:10,background:sg.bg,color:sg.col,fontSize:13,fontWeight:700,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:8}}>
                    <span>{sg.ic}</span><span>→ {sg.l}</span>
                  </button>
                )})}
              </div>
            </div>}

            {selOrd.st==='concluida'&&<div style={{background:A.accentL,borderRadius:10,padding:14,border:'1px solid rgba(22,163,74,0.2)'}}>
              <div style={{fontSize:12,fontWeight:700,color:A.accentD,marginBottom:6}}>🧾 Emitir Fatura de Comissão</div>
              <div style={{fontSize:11,color:A.slate,marginBottom:10}}>Valor da comissão: <strong>€{(selOrd.val*selOrd.taxa/100).toFixed(2)}</strong> ({selOrd.taxa}%)</div>
              <button onClick={()=>moverEstado(selOrd,'faturada')} style={{width:'100%',padding:'10px',border:'none',borderRadius:8,background:A.accent,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>🧾 Emitir fatura e notificar prestador</button>
            </div>}
          </div>
        </div>
      </>}
    </>
  )
}

// ══ AdminServicos ══════════════════════
// Nota: o state local `svcs` continua a usar o shape curto {id,n,p,u,d,cat,ic,badge,r,rv}
// vindo do SVCS hardcoded. Ao persistir na BD, mapeamos para o schema real
// {id,nome,preco,unidade,duracao_tipica,categoria_id,icon,popular,urgent,tipo,activo}
// para evitar o 400 silencioso que existia pre-2e.
function toDbServico(s){
  return {
    id:             s.id,
    categoria_id:   s.cat || null,
    nome:           s.n || '',
    preco:          Number(s.p) || 0,
    tipo:           s.tipo || 'fixo',
    unidade:        s.u || null,
    duracao_tipica: s.d || null,
    icon:           s.ic || null,
    popular:        s.badge === 'Popular',
    urgent:         s.badge === 'Urgente',
    activo:         true,
  }
}

// Inverso de toDbServico: converte a row BD (schema longo) para a shape curta
// usada pelo state local do admin e pelos componentes UI do AdminServicos.
function fromDbServico(row){
  return {
    id:     row.id,
    cat:    row.categoria_id || '',
    n:      row.nome || '',
    p:      row.preco != null ? Number(row.preco) : 0,
    u:      row.unidade || '',
    d:      row.duracao_tipica || '',
    ic:     row.icon || '🔧',
    tipo:   row.tipo || 'fixo',
    badge:  row.urgent ? 'Urgente' : (row.popular ? 'Popular' : ''),
    r:      5.0,    // rating/reviews não existem na BD; mantemos defaults para UI
    rv:     0,
  }
}

// Mapeia v5_manutencao.catalogo_servicos → formato SVCS usado pela UI admin
function fromCatalogServico(row){
  return {
    id:    row.codigo || String(row.id),
    cat:   row.categoria || '',
    n:     row.nome || '',
    p:     row.preco_base != null ? Number(row.preco_base) : 0,
    u:     row.unidade || '/visita',
    d:     row.duracao_tipica || '',
    ic:    row.icon_emoji || '🔧',
    tipo:  'fixo',
    badge: row.badge || '',
    r:     5.0,
    rv:    0,
  }
}

function AdminServicos({svcs,setSvcs,authUser,loading,error,onRetry}){
  const [q,setQ]=useState(''), [cat,setCat]=useState('all'), [modal,setModal]=useState(null), [form,setForm]=useState({})
  const [syncing,setSyncing]=useState(false)
  const filtered=svcs.filter(s=>(cat==='all'||s.cat===cat)&&(s.n||'').toLowerCase().includes(q.toLowerCase()))
  const openNew=()=>{setForm({id:`s${Date.now()}`,cat:'limpeza',n:'',p:0,u:'/visita',d:'60min',ic:'🔧',badge:''});setModal('new')}
  const save=async()=>{
    setSyncing(true)
    const updated=modal==='new'?{...form,r:5.0,rv:0}:{...form}
    const dbRow = toDbServico(updated)
    // TODO(mario): writes ainda vão para public.servicos — migrar para catalogo_servicos em Tarefa D
    const result = await sbSave('servicos', dbRow, authUser?.token)
    setSyncing(false)
    if(!result){
      alert('Erro ao guardar o serviço na base de dados. Ver consola (F12) para detalhes.')
      return
    }
    // Sucesso: actualizar estado local
    if(modal==='new') setSvcs(p=>[...p,updated])
    else setSvcs(p=>p.map(s=>s.id===form.id?{...s,...form}:s))
    setModal(null)
  }
  const del=async(id)=>{
    if(!window.confirm('Eliminar este serviço?')) return
    const ok = await sbDelete('servicos', `?id=eq.${id}`, authUser?.token)
    if(!ok){ alert('Erro ao eliminar na BD. Ver consola.'); return }
    setSvcs(p=>p.filter(s=>s.id!==id))
  }
  return(
    <>
      <ATopBar title='🔧 Serviços' sub={loading ? 'A carregar…' : `${svcs.length} serviços do catálogo`}>
        <APrimBtn ch='+ Novo serviço' onClick={openNew}/>
      </ATopBar>
      {/* Banner discreto — altura fixa 40px para evitar layout jump */}
      <div style={{height:40,display:'flex',alignItems:'center',padding:'0 24px',background:error?'#fef2f2':loading?'#f0f9ff':'transparent',borderBottom:error||loading?`1px solid ${error?'#fecaca':'#bae6fd'}`:'none',transition:'background 0.15s'}}>
        {error && <><span style={{fontSize:12,color:'#b91c1c',flex:1}}>{error}</span><button onClick={onRetry} style={{fontSize:11,color:'#1d4ed8',background:'none',border:'1px solid #93c5fd',borderRadius:6,padding:'3px 10px',cursor:'pointer',flexShrink:0}}>Tentar novamente</button></>}
        {loading && !error && <span style={{fontSize:12,color:'#0369a1'}}>A carregar catálogo da base de dados…</span>}
      </div>
      <div style={{padding:24}}>
        <div style={{display:'flex',gap:10,marginBottom:16,background:A.white,padding:'12px 16px',borderRadius:11,border:`1px solid ${A.border}`}}>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder='Pesquisar serviço…' style={{flex:1,border:`1.5px solid ${A.border}`,borderRadius:7,padding:'7px 11px',fontSize:13,outline:'none',color:A.navy}}/>
          <select value={cat} onChange={e=>setCat(e.target.value)} style={{border:`1.5px solid ${A.border}`,borderRadius:7,padding:'7px 11px',fontSize:13,outline:'none',color:A.navy,background:A.white}}>
            <option value='all'>Todas as categorias</option>
            {CATS.map(c=><option key={c.id} value={c.id}>{c.ic} {c.l}</option>)}
          </select>
        </div>
        <div style={{background:A.white,borderRadius:12,border:`1px solid ${A.border}`,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr><ATh ch='Serviço'/><ATh ch='Categoria'/><ATh ch='Preço'/><ATh ch='Duração'/><ATh ch='Badge'/><ATh ch='Ações'/></tr></thead>
            <tbody>{filtered.map(s=>(
              <tr key={s.id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <ATd><div style={{display:'flex',alignItems:'center',gap:9}}><span style={{fontSize:20}}>{s.ic}</span><span style={{fontWeight:700}}>{s.n}</span></div></ATd>
                <ATd><ABadge t={CATS.find(c=>c.id===s.cat)?.l||s.cat}/></ATd>
                <ATd><span style={{fontWeight:700,color:A.accent}}>€{s.p}</span><span style={{color:A.slate,fontSize:11}}> {s.u}</span></ATd>
                <ATd><span style={{color:A.slate}}>{s.d}</span></ATd>
                <ATd>{s.badge?<ABadge t={s.badge} col={s.badge==='Urgente'?'red':s.badge==='Destaque'?'amber':'green'}/>:<span style={{color:A.muted}}>—</span>}</ATd>
                <ATd><div style={{display:'flex',gap:6}}><ATBtn ch='✏️ Editar' onClick={()=>{setForm({...s});setModal(s)}}/><ATBtn ch='🗑' onClick={()=>del(s.id)} col='red'/></div></ATd>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      {modal&&<AModal title={modal==='new'?'Novo Serviço':`Editar — ${form.n}`} onClose={()=>setModal(null)}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <AFRow label='Nome do serviço'><input value={form.n||''} onChange={e=>setForm(f=>({...f,n:e.target.value}))} style={{width:'100%',border:`1.5px solid ${A.border}`,borderRadius:8,padding:'8px 11px',fontSize:13,outline:'none',color:A.navy,boxSizing:'border-box'}}/></AFRow>
          <AFRow label='Ícone'>{ainp(form.ic,v=>setForm(f=>({...f,ic:v})))}</AFRow>
          <AFRow label='Preço (€)'>{ainp(form.p,v=>setForm(f=>({...f,p:parseFloat(v)||0})),'number')}</AFRow>
          <AFRow label='Unidade'>{asel(form.u,v=>setForm(f=>({...f,u:v})),['/mês','/visita','fixo','/hora'])}</AFRow>
          <AFRow label='Categoria'>{asel(form.cat,v=>setForm(f=>({...f,cat:v})),CATS.map(c=>[c.id,`${c.ic} ${c.l}`]))}</AFRow>
          <AFRow label='Duração'>{ainp(form.d,v=>setForm(f=>({...f,d:v})),'text','ex: 60min')}</AFRow>
          <AFRow label='Badge (opcional)'>{asel(form.badge||'',v=>setForm(f=>({...f,badge:v})),['','Destaque','Popular','Urgente','Novo'].map(b=>[b,b||'Sem badge']))}</AFRow>
        </div>
        <div style={{display:'flex',gap:8,marginTop:14,justifyContent:'flex-end'}}><ASecBtn ch='Cancelar' onClick={()=>setModal(null)}/><APrimBtn ch={syncing?'A guardar…':'💾 Guardar'} onClick={save} disabled={syncing}/></div>
      </AModal>}
    </>
  )
}

// ══ AdminClientes ══════════════════════
function AdminClientes({clientes,setClientes}){
  const [q,setQ]=useState(''), [filt,setFilt]=useState('all'), [sel,setSel]=useState(null), [form,setForm]=useState({})
  const filtered=clientes.filter(c=>(filt==='all'||(filt==='ativo'&&c.ativo)||(filt==='inativo'&&!c.ativo))&&(c.n+c.email).toLowerCase().includes(q.toLowerCase()))
  const save=async()=>{setClientes(p=>p.map(c=>c.id===form.id?{...c,...form}:c));await sbSave('clientes',form);setSel(null)}
  const toggle=c=>{const u={...c,ativo:!c.ativo};setClientes(p=>p.map(x=>x.id===c.id?u:x));sbSave('clientes',u)}
  return(
    <>
      <ATopBar title='👥 Clientes' sub={`${clientes.length} clientes · ${clientes.filter(c=>c.ativo).length} activos`}>
        <APrimBtn ch='+ Novo cliente'/>
      </ATopBar>
      <div style={{padding:24}}>
        <div style={{display:'flex',gap:8,marginBottom:16,background:A.white,padding:'12px 16px',borderRadius:11,border:`1px solid ${A.border}`}}>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder='Pesquisar nome ou email…' style={{flex:1,border:`1.5px solid ${A.border}`,borderRadius:7,padding:'7px 11px',fontSize:13,outline:'none',color:A.navy}}/>
          {['all','ativo','inativo'].map(f=><button key={f} onClick={()=>setFilt(f)} style={{padding:'7px 14px',border:`1.5px solid ${filt===f?A.accent:A.border}`,borderRadius:8,cursor:'pointer',background:filt===f?A.accent:A.white,color:filt===f?'#fff':A.slate,fontWeight:600,fontSize:12}}>{f==='all'?'Todos':f==='ativo'?'Activos':'Inactivos'}</button>)}
        </div>
        <div style={{background:A.white,borderRadius:12,border:`1px solid ${A.border}`,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr><ATh ch='Cliente'/><ATh ch='Contacto'/><ATh ch='Morada'/><ATh ch='Pedidos'/><ATh ch='Gasto'/><ATh ch='Estado'/><ATh ch='Ações'/></tr></thead>
            <tbody>{filtered.map(c=>(
              <tr key={c.id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <ATd><div><div style={{fontWeight:700}}>{c.n}</div><div style={{fontSize:10,color:A.slate}}>{c.desde}</div></div></ATd>
                <ATd><div style={{fontSize:12,color:A.slate}}>{c.email}</div><div style={{fontSize:11,color:A.muted}}>{c.tel}</div></ATd>
                <ATd><span style={{fontSize:12,color:A.slate}}>{c.morada}</span></ATd>
                <ATd><span style={{fontWeight:600}}>{c.pedidos}</span></ATd>
                <ATd><span style={{fontWeight:700,color:A.accent}}>€{c.gasto}</span></ATd>
                <ATd><ABadge t={c.ativo?'Activo':'Inactivo'} col={c.ativo?'green':'gray'}/></ATd>
                <ATd><div style={{display:'flex',gap:6}}><ATBtn ch='✏️' onClick={()=>{setForm({...c});setSel(c)}}/><ATBtn ch={c.ativo?'Desactivar':'Activar'} onClick={()=>toggle(c)} col={c.ativo?'red':'green'}/></div></ATd>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      {sel&&<AModal title={`Editar — ${form.n}`} onClose={()=>setSel(null)}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <AFRow label='Nome completo'><input value={form.n||''} onChange={e=>setForm(f=>({...f,n:e.target.value}))} style={{width:'100%',border:`1.5px solid ${A.border}`,borderRadius:8,padding:'8px 11px',fontSize:13,outline:'none',color:A.navy,boxSizing:'border-box'}}/></AFRow>
          <AFRow label='Email'>{ainp(form.email,v=>setForm(f=>({...f,email:v})),'email')}</AFRow>
          <AFRow label='Telefone'>{ainp(form.tel,v=>setForm(f=>({...f,tel:v})))}</AFRow>
          <AFRow label=''><div/></AFRow>
          <div style={{gridColumn:'1/-1'}}><AFRow label='Morada'>{ainp(form.morada,v=>setForm(f=>({...f,morada:v})))}</AFRow></div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:14,justifyContent:'flex-end'}}><ASecBtn ch='Cancelar' onClick={()=>setSel(null)}/><APrimBtn ch='💾 Guardar' onClick={save}/></div>
      </AModal>}
    </>
  )
}

// ══ AdminPrestadores — com todos os campos ═══
const INDICATIVOS=['+351 🇵🇹','+34 🇪🇸','+33 🇫🇷','+44 🇬🇧','+49 🇩🇪','+55 🇧🇷','+244 🇦🇴','+1 🇺🇸']
function AdminPrestadores({prest,setPrest,niveis}){
  const [q,setQ]=useState(''), [fNivel,setFNivel]=useState('all'), [sel,setSel]=useState(null), [form,setForm]=useState({}), [tabF,setTabF]=useState('perfil')
  const [ibanDoc,setIbanDoc]=useState(null), [ibanDocNome,setIbanDocNome]=useState('')
  const [syncing,setSyncing]=useState(false)
  const filtered=prest.filter(p=>(fNivel==='all'||p.nivel===fNivel)&&(p.n+' '+(p.cidade||p.loc||'')).toLowerCase().includes(q.toLowerCase()))
  const save=async()=>{
    setSyncing(true)
    const updated={...form}
    setPrest(p=>p.map(x=>x.id===updated.id?{...x,...updated}:x))
    await sbSave('prestadores',updated)
    setSyncing(false); setSel(null)
  }
  const handleIbanDoc=e=>{const f=e.target.files?.[0];if(!f)return;setIbanDocNome(f.name);setIbanDoc('pendente');setForm(ff=>({...ff,comprovativo_iban:'pendente'}))}
  const handleFoto=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>setForm(ff=>({...ff,foto:ev.target.result}));r.readAsDataURL(f)}
  const TABS=['perfil','morada','nivel','pagamento']
  return(
    <>
      <ATopBar title='👷 Prestadores' sub={`${prest.length} prestadores · ${prest.filter(p=>!p.ok).length} por verificar`}>
        <APrimBtn ch='+ Convidar prestador'/>
      </ATopBar>
      <div style={{padding:24}}>
        <div style={{display:'flex',gap:10,marginBottom:16,background:A.white,padding:'12px 16px',borderRadius:11,border:`1px solid ${A.border}`}}>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder='Nome, localidade ou email…' style={{flex:1,border:`1.5px solid ${A.border}`,borderRadius:7,padding:'7px 11px',fontSize:13,outline:'none',color:A.navy}}/>
          <select value={fNivel} onChange={e=>setFNivel(e.target.value)} style={{border:`1.5px solid ${A.border}`,borderRadius:7,padding:'7px 11px',fontSize:13,outline:'none',color:A.navy,background:A.white}}>
            <option value='all'>Todos os níveis</option>
            {Object.entries(niveis).map(([k,n])=><option key={k} value={k}>{n.ic} {n.l}</option>)}
          </select>
        </div>
        <div style={{background:A.white,borderRadius:12,border:`1px solid ${A.border}`,overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
              <thead><tr><ATh ch='Prestador'/><ATh ch='NIF'/><ATh ch='Telefone'/><ATh ch='Morada / CP'/><ATh ch='Nível'/><ATh ch='IBAN'/><ATh ch='Docs'/><ATh ch='Estado'/><ATh ch='Ações'/></tr></thead>
              <tbody>{filtered.map(p=>{const nc=niveis[p.nivel];return(
                <tr key={p.id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <ATd>
                    <div style={{display:'flex',alignItems:'center',gap:9}}>
                      {p.foto
                        ?<img src={p.foto} alt='' style={{width:34,height:34,borderRadius:'50%',objectFit:'cover',flexShrink:0,border:`2px solid ${A.border}`}}/>
                        :<div style={{width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,#16a34a,#22c55e)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#fff',fontWeight:800,flexShrink:0}}>{p.ini}</div>
                      }
                      <div style={{minWidth:0}}><div style={{fontWeight:700,fontSize:13,whiteSpace:'nowrap'}}>{p.n}</div><div style={{fontSize:10,color:A.slate,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.email}</div></div>
                    </div>
                  </ATd>
                  <ATd><span style={{fontFamily:'monospace',fontSize:12}}>{p.nif||<span style={{color:A.muted}}>—</span>}</span></ATd>
                  <ATd><span style={{fontSize:12}}>{p.indicativo||'+351'} {p.tel}</span></ATd>
                  <ATd><div style={{fontSize:12}}>{p.morada||'—'}</div><div style={{fontSize:10,color:A.slate}}>{p.cp||''} {p.cidade||p.loc}</div></ATd>
                  <ATd><span style={{fontSize:10,fontWeight:700,background:nc?.bg,color:nc?.cor,padding:'2px 8px',borderRadius:8,whiteSpace:'nowrap'}}>{nc?.ic} {nc?.l} · {nc?.taxa}%</span></ATd>
                  <ATd><span style={{fontFamily:'monospace',fontSize:11,color:p.iban?A.text:A.muted}}>{p.iban?p.iban.substring(0,12)+'…':' — '}</span></ATd>
                  <ATd>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                      {p.foto?<ABadge t='📷 Foto' col='green'/>:<ABadge t='Sem foto' col='gray'/>}
                      {p.comprovativo_iban?<ABadge t='📄 IBAN' col='green'/>:<ABadge t='Sem doc.' col='amber'/>}
                    </div>
                  </ATd>
                  <ATd><ABadge t={p.ok?'✓ Verif.':'Pendente'} col={p.ok?'green':'amber'}/></ATd>
                  <ATd><ATBtn ch='✏️ Gerir' onClick={()=>{setForm({...p});setSel(p);setTabF('perfil');setIbanDoc(p.comprovativo_iban||null);setIbanDocNome('')}}/></ATd>
                </tr>
              )})}</tbody>
            </table>
          </div>
        </div>
      </div>
      {sel&&<AModal title={`Gerir — ${form.n}`} onClose={()=>setSel(null)} wide>
        {/* Tabs */}
        <div style={{display:'flex',gap:0,borderBottom:`1px solid ${A.border}`,marginBottom:18}}>
          {TABS.map(t=><button key={t} onClick={()=>setTabF(t)} style={{padding:'9px 18px',border:'none',borderBottom:tabF===t?`2.5px solid ${A.accent}`:'2.5px solid transparent',background:'none',cursor:'pointer',color:tabF===t?A.accent:A.slate,fontWeight:tabF===t?700:400,fontSize:13,fontFamily:'inherit',textTransform:'capitalize'}}>{t}</button>)}
        </div>

        {tabF==='perfil'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <div style={{gridColumn:'1/-1'}}>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:A.slate,marginBottom:8,textTransform:'uppercase',letterSpacing:'0.04em'}}>Foto de perfil</label>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              {form.foto
                ?<img src={form.foto} alt='' style={{width:58,height:58,borderRadius:'50%',objectFit:'cover',border:`3px solid ${A.border}`}}/>
                :<div style={{width:58,height:58,borderRadius:'50%',background:'linear-gradient(135deg,#16a34a,#22c55e)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,color:'#fff',fontWeight:800}}>{form.ini}</div>
              }
              <div>
                <label style={{display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',border:`1.5px dashed ${A.border}`,borderRadius:9,cursor:'pointer',fontSize:12,color:A.slate,fontWeight:600}}>
                  📷 Carregar foto<input type='file' accept='image/*' style={{display:'none'}} onChange={handleFoto}/>
                </label>
                {form.foto&&<button onClick={()=>setForm(f=>({...f,foto:null}))} style={{marginLeft:8,fontSize:11,color:A.red,background:'none',border:'none',cursor:'pointer'}}>Remover</button>}
                <p style={{fontSize:10,color:A.muted,margin:'4px 0 0'}}>Visível para clientes na app · JPEG/PNG</p>
              </div>
            </div>
          </div>
          <div style={{gridColumn:'1/-1',borderTop:`1px solid ${A.border}`,paddingTop:14}}/>
          <AFRow label='Nome completo' half>{ainp(form.n,v=>setForm(f=>({...f,n:v})))}</AFRow>
          <AFRow label='NIF' half>{ainp(form.nif||'',v=>setForm(f=>({...f,nif:v})),'text','123 456 789')}</AFRow>
          <AFRow label='Email'>{ainp(form.email||'',v=>setForm(f=>({...f,email:v})),'email')}</AFRow>
          <AFRow label='Verificado' half>{asel(form.ok?'sim':'nao',v=>setForm(f=>({...f,ok:v==='sim'})),[['sim','✓ Verificado'],['nao','Não verificado']])}</AFRow>
          <AFRow label='Estado' half>{asel(form.st||'activo',v=>setForm(f=>({...f,st:v})),[['activo','Activo'],['ocupado','Ocupado'],['inactivo','Suspenso']])}</AFRow>
        </div>}

        {tabF==='morada'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <div style={{gridColumn:'1/-1'}}><AFRow label='Morada'>{ainp(form.morada||'',v=>setForm(f=>({...f,morada:v})),'text','Rua das Flores, 23')}</AFRow></div>
          <AFRow label='Código Postal' half>{ainp(form.cp||'',v=>setForm(f=>({...f,cp:v})),'text','2500-123')}</AFRow>
          <AFRow label='Cidade' half>{ainp(form.cidade||form.loc||'',v=>setForm(f=>({...f,cidade:v,loc:v})))}</AFRow>
          <AFRow label='Indicativo de país' half>
            <select value={form.indicativo||'+351 🇵🇹'} onChange={e=>setForm(f=>({...f,indicativo:e.target.value.split(' ')[0]}))} style={{width:'100%',border:`1.5px solid ${A.border}`,borderRadius:8,padding:'8px 11px',fontSize:13,outline:'none',color:A.navy,background:A.white,boxSizing:'border-box'}}>
              {INDICATIVOS.map(i=><option key={i}>{i}</option>)}
            </select>
          </AFRow>
          <AFRow label='Número de telefone' half>{ainp(form.tel||'',v=>setForm(f=>({...f,tel:v})),'tel','914 000 000')}</AFRow>
        </div>}

        {tabF==='nivel'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {Object.entries(niveis).map(([id,n])=>(
            <button key={id} onClick={()=>setForm(f=>({...f,nivel:id}))} style={{padding:'14px',border:`2px solid ${form.nivel===id?n.cor:A.border}`,borderRadius:12,background:form.nivel===id?n.bg:A.white,cursor:'pointer',textAlign:'left',transition:'all 0.15s'}}>
              <div style={{fontSize:24,marginBottom:5}}>{n.ic}</div>
              <div style={{fontWeight:700,color:n.cor,fontSize:14}}>{n.l}</div>
              <div style={{fontSize:12,color:A.slate,marginTop:2}}>Taxa {n.taxa}% · {n.min===0?'Entrada':n.min+'+ serviços'}</div>
              {form.nivel===id&&<div style={{fontSize:10,color:n.cor,fontWeight:700,marginTop:4}}>✓ Nível seleccionado</div>}
            </button>
          ))}
        </div>}

        {tabF==='pagamento'&&<div style={{display:'flex',flexDirection:'column',gap:16}}>
          <AFRow label='IBAN (Swan SEPA CT)'>{ainp(form.iban||'',v=>setForm(f=>({...f,iban:v})),'text','PT50 0000 0000 0000 0000 0')}</AFRow>
          <div>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:A.slate,marginBottom:8,textTransform:'uppercase',letterSpacing:'0.04em'}}>Comprovativo de IBAN</label>
            {ibanDoc
              ?<div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:A.accentL,borderRadius:11,border:`1px solid rgba(22,163,74,0.2)`}}>
                  <span style={{fontSize:26}}>📄</span>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:A.accentD}}>{ibanDocNome||'Comprovativo IBAN'}</div><div style={{fontSize:11,color:A.accent}}>✓ Documento carregado</div></div>
                  <button onClick={()=>{setIbanDoc(null);setIbanDocNome('');setForm(f=>({...f,comprovativo_iban:null}))}} style={{background:'none',border:'none',color:A.slate,cursor:'pointer',fontSize:18,lineHeight:1}}>×</button>
                </div>
              :<label style={{display:'flex',alignItems:'center',gap:12,padding:'16px 20px',border:`2px dashed ${A.border}`,borderRadius:11,cursor:'pointer',background:A.bg}}>
                  <span style={{fontSize:28}}>📎</span>
                  <div><div style={{fontSize:13,fontWeight:600,color:A.text}}>Clique para anexar comprovativo</div><div style={{fontSize:11,color:A.muted,marginTop:2}}>PDF, JPG ou PNG · máx. 5MB</div></div>
                  <input type='file' accept='.pdf,image/*' style={{display:'none'}} onChange={handleIbanDoc}/>
                </label>
            }
          </div>
          <div style={{background:A.bg,borderRadius:10,padding:'12px 14px',border:`1px solid ${A.border}`}}>
            <div style={{fontSize:12,fontWeight:700,color:A.navy,marginBottom:4}}>Como funciona o pagamento</div>
            <div style={{fontSize:11,color:A.slate,lineHeight:1.7}}>Os pagamentos são efectuados via Swan.io SEPA Credit Transfer, no dia útil seguinte (D+1) à conclusão do serviço. O valor liquido já desconta a taxa de plataforma do escalão activo do prestador.</div>
          </div>
        </div>}

        <div style={{display:'flex',gap:8,marginTop:18,justifyContent:'space-between',borderTop:`1px solid ${A.border}`,paddingTop:16}}>
          <SyncBadge synced={false} loading={syncing}/>
          <div style={{display:'flex',gap:8}}><ASecBtn ch='Cancelar' onClick={()=>setSel(null)}/><APrimBtn ch={syncing?'A guardar…':'💾 Guardar no Supabase'} onClick={save} disabled={syncing}/></div>
        </div>
      </AModal>}
    </>
  )
}

// ══ AdminEscaloes ══════════════════════
function AdminEscaloes({niveis,setNiveis}){
  const [edit,setEdit]=useState(null), [form,setForm]=useState({})
  const save=()=>{setNiveis(p=>({...p,[form.id]:{...p[form.id],taxa:parseFloat(form.taxa)||0,min:parseInt(form.min)||0,mr:parseFloat(form.mr)||0}}));setEdit(null)}
  const ex=75
  return(
    <>
      <ATopBar title='🏅 Escalões & Taxas' sub='Configura taxa de plataforma e critérios de progressão dos prestadores'/>
      <div style={{padding:24}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:22}}>
          {Object.entries(niveis).map(([id,n])=>(
            <div key={id} style={{background:A.white,borderRadius:14,border:`2px solid ${n.cor}33`,padding:20,display:'flex',flexDirection:'column',gap:8}}>
              <div style={{fontSize:36}}>{n.ic}</div>
              <div style={{fontSize:16,fontWeight:800,color:n.cor}}>{n.l}</div>
              <div style={{fontSize:32,fontWeight:900,color:A.navy,lineHeight:1}}>{n.taxa}<span style={{fontSize:14,color:A.slate}}> %</span></div>
              <div style={{background:'#f8fafc',borderRadius:9,padding:'10px 12px',fontSize:11,color:A.slate}}>
                <div>{n.min===0?'▸ Nível de entrada':`▸ Min. ${n.min} serviços`}</div>
                {n.mr>0&&<div>▸ Avaliação ≥ {n.mr}★</div>}
              </div>
              <div style={{background:n.bg,borderRadius:9,padding:'10px 12px'}}>
                <div style={{fontSize:11,color:n.cor,fontWeight:600}}>Serviço €{ex} →</div>
                <div style={{fontSize:14,fontWeight:800,color:n.cor}}>Prestador €{(ex*(1-n.taxa/100)).toFixed(2)}</div>
                <div style={{fontSize:10,color:n.cor}}>Plataforma €{(ex*n.taxa/100).toFixed(2)}</div>
              </div>
              <button onClick={()=>{setForm({id,...n});setEdit(id)}} style={{padding:'8px',border:`1.5px solid ${n.cor}55`,borderRadius:9,background:A.white,color:n.cor,fontWeight:700,fontSize:12,cursor:'pointer'}}>✏️ Editar escalão</button>
            </div>
          ))}
        </div>
        <div style={{background:A.white,borderRadius:13,border:`1px solid ${A.border}`,overflow:'hidden'}}>
          <div style={{padding:'13px 20px',borderBottom:`1px solid ${A.border}`}}><span style={{fontSize:13,fontWeight:800,color:A.navy}}>Impacto anual — 500 serviços × €75</span></div>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr><ATh ch='Escalão'/><ATh ch='Taxa'/><ATh ch='Prestador / serviço'/><ATh ch='Plataforma / serviço'/><ATh ch='Total anual prestador'/><ATh ch='Total anual plataforma'/></tr></thead>
            <tbody>{Object.entries(niveis).map(([id,n])=>(
              <tr key={id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <ATd><span style={{fontWeight:700}}>{n.ic} {n.l}</span></ATd>
                <ATd><span style={{fontWeight:700,color:n.cor}}>{n.taxa}%</span></ATd>
                <ATd>€{(ex*(1-n.taxa/100)).toFixed(2)}</ATd>
                <ATd>€{(ex*n.taxa/100).toFixed(2)}</ATd>
                <ATd><span style={{fontWeight:700,color:A.accent}}>€{(500*ex*(1-n.taxa/100)).toLocaleString('pt-PT')}</span></ATd>
                <ATd>€{(500*ex*n.taxa/100).toLocaleString('pt-PT')}</ATd>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      {edit&&<AModal title={`Editar — ${form.ic} ${form.l}`} onClose={()=>setEdit(null)}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:14}}>
          <AFRow label='Taxa plataforma (%)'>{ainp(form.taxa,v=>setForm(f=>({...f,taxa:v})),'number')}</AFRow>
          <AFRow label='Mínimo de serviços'>{ainp(form.min,v=>setForm(f=>({...f,min:v})),'number')}</AFRow>
          <AFRow label='Avaliação mínima'>{ainp(form.mr,v=>setForm(f=>({...f,mr:v})),'number')}</AFRow>
        </div>
        {form.taxa&&<div style={{background:'#f8fafc',borderRadius:10,padding:'12px 16px',marginBottom:14,border:`1px solid ${A.border}`}}>
          <div style={{fontSize:11,color:A.slate,marginBottom:6}}>Preview — serviço de €75:</div>
          <div style={{display:'flex',gap:24}}>
            <div><div style={{fontSize:20,fontWeight:800,color:A.accent}}>€{(75*(1-parseFloat(form.taxa)/100)).toFixed(2)}</div><div style={{fontSize:10,color:A.slate}}>Prestador</div></div>
            <div><div style={{fontSize:20,fontWeight:800,color:A.navy}}>€{(75*parseFloat(form.taxa)/100).toFixed(2)}</div><div style={{fontSize:10,color:A.slate}}>Plataforma</div></div>
          </div>
        </div>}
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><ASecBtn ch='Cancelar' onClick={()=>setEdit(null)}/><APrimBtn ch='💾 Guardar' onClick={save}/></div>
      </AModal>}
    </>
  )
}

// ══ AdminPagamentos ═════════════════════
function AdminPagamentos({prest}){
  const [proc,setProc]=useState({})
  const total=prest.reduce((a,p)=>a+(p.saldo||Math.round(p.jobs*0.12)),0)
  const allDone=prest.every(p=>proc[p.id])
  const processarTodos=()=>prest.forEach(p=>p.iban&&setProc(pr=>({...pr,[p.id]:true})))
  return(
    <>
      <ATopBar title='💳 Pagamentos SEPA CT' sub='Swan.io · Transferências D+1 para prestadores'>
        <APrimBtn ch={allDone?'✓ Todos processados':'💸 Processar todos'} onClick={processarTodos} disabled={allDone}/>
      </ATopBar>
      <div style={{padding:24}}>
        <div style={{display:'flex',gap:14,marginBottom:20,flexWrap:'wrap'}}>
          <AKpi ic='💶' label='Total a transferir'   value={`€ ${total}`}   sub={`${prest.length} prestadores`}  col='accent'/>
          <AKpi ic='✅' label='Processado este mês'   value='€ 1.234'        sub='12 transferências'              col='blue'/>
          <AKpi ic='⏳' label='Em processamento'      value='€ 91'           sub='Aguarda confirmação D+1'        col='amber'/>
        </div>
        <div style={{background:A.white,borderRadius:13,border:`1px solid ${A.border}`,overflow:'hidden'}}>
          {!allDone&&<div style={{padding:'12px 20px',background:A.amberL,borderBottom:`1px solid ${A.border}`}}><span style={{fontSize:13,fontWeight:700,color:'#92400e'}}>⚠️ {prest.filter(p=>!proc[p.id]).length} prestadores com pagamentos pendentes</span></div>}
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr><ATh ch='Prestador'/><ATh ch='Nível'/><ATh ch='IBAN'/><ATh ch='Saldo'/><ATh ch='Docs'/><ATh ch='Estado'/><ATh ch='Ação'/></tr></thead>
            <tbody>{prest.map(p=>{const nc=NIVEIS[p.nivel];const saldo=p.saldo||Math.round(p.jobs*0.12);return(
              <tr key={p.id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <ATd>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    {p.foto?<img src={p.foto} alt='' style={{width:30,height:30,borderRadius:'50%',objectFit:'cover'}}/>:<div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#16a34a,#22c55e)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#fff',fontWeight:800}}>{p.ini}</div>}
                    <div><div style={{fontWeight:700,fontSize:13}}>{p.n}</div><div style={{fontSize:10,color:A.slate}}>{p.cidade||p.loc}</div></div>
                  </div>
                </ATd>
                <ATd><span style={{fontSize:10,fontWeight:700,background:nc?.bg,color:nc?.cor,padding:'2px 7px',borderRadius:7}}>{nc?.ic} {nc?.l}</span></ATd>
                <ATd><span style={{fontFamily:'monospace',fontSize:11,color:p.iban?A.text:A.red}}>{p.iban?p.iban.substring(0,16)+'…':<span style={{color:A.red,fontStyle:'italic'}}>IBAN em falta</span>}</span></ATd>
                <ATd><span style={{fontSize:14,fontWeight:800,color:A.accent}}>€{saldo}</span></ATd>
                <ATd>{p.comprovativo_iban?<ABadge t='✓ Doc.' col='green'/>:<ABadge t='Sem doc.' col='amber'/>}</ATd>
                <ATd>{proc[p.id]?<ABadge t='✓ Processado' col='green'/>:<ABadge t='Pendente' col='amber'/>}</ATd>
                <ATd>{proc[p.id]
                  ?<span style={{fontSize:11,color:A.muted}}>Swan · D+1</span>
                  :<ATBtn ch={p.iban?'💸 Pagar':'Falta IBAN'} onClick={()=>p.iban&&setProc(pr=>({...pr,[p.id]:true}))} col={p.iban?'green':'red'}/>
                }</ATd>
              </tr>
            )})}</tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ══ AdminConfig ════════════════════════
function AdminConfig(){
  const [f,setF]=useState({empresa:'ServiçoPRO',nif:'502 000 000',email:'admin@servicopro.pt',tel:'+351 262 000 000',morada:'Caldas da Rainha, 2500',iban:'PT50 0035 0000 0000 0000 0000 0',swan:'https://api.servicopro.pt/swan/webhook',supabaseUrl:'https://hkmvszkpxjbxmnixzqbl.supabase.co',fotos:'2',prazo:'24',comissao:'22'})
  const [saved,setSaved]=useState(false), [saving,setSaving]=useState(false)
  const upd=(k,v)=>{setF(x=>({...x,[k]:v}));setSaved(false)}
  const saveAll=async()=>{setSaving(true);await new Promise(r=>setTimeout(r,600));setSaved(true);setSaving(false)}
  const FInp=({label,k,type='text'})=><AFRow label={label}>{ainp(f[k],v=>upd(k,v),type)}</AFRow>
  const Sect=({t,ch})=><><div style={{fontSize:10,fontWeight:800,color:A.slate,textTransform:'uppercase',letterSpacing:'0.06em',margin:'20px 0 10px',paddingBottom:7,borderBottom:`1px solid ${A.border}`}}>{t}</div>{ch}</>
  return(
    <>
      <ATopBar title='⚙️ Configurações' sub='Dados da empresa, financeiro e integrações'>
        <SyncBadge synced={saved} loading={saving}/>
        <APrimBtn ch={saving?'A guardar…':'💾 Guardar tudo'} onClick={saveAll} disabled={saving}/>
      </ATopBar>
      <div style={{padding:24}}>
        {saved&&<div style={{background:A.accentL,border:`1px solid rgba(22,163,74,0.25)`,borderRadius:10,padding:'11px 18px',marginBottom:18,display:'flex',alignItems:'center',gap:8}}><span>✅</span><span style={{fontSize:13,color:A.accentD,fontWeight:700}}>Configurações guardadas com sucesso.</span></div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:22}}>
          <div style={{background:A.white,borderRadius:13,border:`1px solid ${A.border}`,padding:22}}>
            <Sect t='Empresa' ch={<><FInp label='Nome' k='empresa'/><FInp label='NIF' k='nif'/><FInp label='Email' k='email'/><FInp label='Telefone' k='tel'/><FInp label='Morada' k='morada'/></>}/>
            <Sect t='Financeiro' ch={<><FInp label='IBAN para receber margens' k='iban'/><FInp label='Comissão base (%)' k='comissao' type='number'/><FInp label='Prazo para pagamento pendente (h)' k='prazo' type='number'/></>}/>
          </div>
          <div style={{background:A.white,borderRadius:13,border:`1px solid ${A.border}`,padding:22}}>
            <Sect t='Integrações' ch={<><FInp label='Supabase URL' k='supabaseUrl'/><FInp label='Swan.io Webhook URL' k='swan'/></>}/>
            <Sect t='Estado dos serviços' ch={
              <div style={{marginBottom:12}}>
                {[['Supabase','Conectado','green'],['Swan.io','Conectado','green'],['Swan SEPA CT','Activo','green'],['Storage (bucket documentos)','Ok','green']].map(([s,st,c])=>(
                  <div key={s} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:`1px solid ${A.border}`}}>
                    <span style={{fontSize:12,color:A.text,fontWeight:600}}>{s}</span>
                    <ABadge t={`● ${st}`} col={c}/>
                  </div>
                ))}
              </div>
            }/>
            <Sect t='Segurança' ch={<>
              <AFRow label='Password de acesso admin'><input type='password' defaultValue='admin2026' style={{width:'100%',border:`1.5px solid ${A.border}`,borderRadius:8,padding:'8px 11px',fontSize:13,outline:'none',color:A.navy,boxSizing:'border-box'}}/></AFRow>
              <div style={{background:A.amberL,borderRadius:9,padding:'10px 14px',border:`1px solid rgba(245,158,11,0.3)`,marginTop:4}}><div style={{fontSize:11,color:'#92400e',fontWeight:600,lineHeight:1.6}}>⚠️ Em produção, utilizar autenticação via Supabase Auth com roles por tabela (clientes / prestadores / admin).</div></div>
            </>}/>
          </div>
        </div>
      </div>
    </>
  )
}

// ══ AdminDash — contentor principal ════
function AdminDash({svcs,setSvcs,prestadores,setPrestadores,niveis,setNiveis,clientes,setClientes,ordens,setOrdens,onLogout,authUser,svcsLoading,svcsError,onSvcsRetry}){
  const [page,setPage]=useState('dashboard')
  return(
    <div style={{position:'fixed',inset:0,display:'flex',background:A.bg,fontFamily:'system-ui,-apple-system,sans-serif',overflow:'hidden'}}>
      <style>{`body{background:${A.bg}!important;margin:0;padding:0;overflow:hidden}`}</style>
      <AdminSidebar active={page} set={setPage} onLogout={onLogout}/>
      <div style={{marginLeft:240,flex:1,height:'100vh',overflowY:'auto',overflowX:'hidden',background:A.bg}}>
        {page==='dashboard'   &&<AdminDashboard svcs={svcs} prest={prestadores} clientes={clientes}/>}
        {page==='pipeline'    &&<AdminPipeline  ordens={ordens} setOrdens={setOrdens} prest={prestadores}/>}
        {page==='servicos'    &&<AdminServicos   svcs={svcs} setSvcs={setSvcs} authUser={authUser} loading={svcsLoading} error={svcsError} onRetry={onSvcsRetry}/>}
        {page==='clientes'    &&<AdminClientes   clientes={clientes} setClientes={setClientes}/>}
        {page==='prestadores' &&<AdminPrestadores prest={prestadores} setPrest={setPrestadores} niveis={niveis}/>}
        {page==='escaloes'    &&<AdminEscaloes   niveis={niveis} setNiveis={setNiveis}/>}
        {page==='pagamentos'  &&<AdminPagamentos  prest={prestadores}/>}
        {page==='config'      &&<AdminConfig/>}
      </div>
    </div>
  )
}


/* ══════════════════════════════════
   ASSISTENTE AI — Botão flutuante
══════════════════════════════════ */
const AI_RESPOSTAS = {
  default: 'Olá! Sou o assistente do ServiçoPRO. Posso ajudar com ordens de trabalho, dúvidas sobre pagamentos, escalões ou disponibilidade. Em que posso ajudar?',
  carteira: 'A tua carteira tem saldo disponível para levantamento imediato. Podes levantar para o teu IBAN via Swan SEPA CT em D+1. Queres ajuda com isso?',
  nivel: 'Estás no nível Gold (18% taxa). Para atingir Elite precisas de mais 160 serviços e manter avaliação ≥ 4.8. Cada serviço conta!',
  ordem: 'Para concluir uma ordem: 1) Aceita, 2) Executa, 3) Tira mínimo 2 fotos, 4) Aguarda assinatura do cliente. O pagamento é creditado em 24h.',
  disponibilidade: 'Podes gerir a tua disponibilidade em Menu → A tua disponibilidade. Define os dias e horários (manhã/tarde/dia todo) e bloqueia datas específicas.',
  pagamento: 'Os pagamentos são processados via Swan.io SEPA CT, no dia a seguir ao serviço ser confirmado. Podes levantar em qualquer momento via Carteira.',
}
const SUGESTOES = ['Como funciona a minha carteira?','Qual é o meu nível?','Como concluir uma ordem?','Gerir disponibilidade']

function AIChat() {
  const [aberto, setAberto] = useState(false)
  const [msgs, setMsgs] = useState([{ de:'ai', t: AI_RESPOSTAS.default }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  // FAB constrangido ao container de 430px
  const fabRight = 'max(14px, calc(50vw - 201px))'

  const getResp = (txt) => {
    const t = txt.toLowerCase()
    if (t.includes('carteira')||t.includes('saldo')||t.includes('levant')) return AI_RESPOSTAS.carteira
    if (t.includes('nível')||t.includes('nivel')||t.includes('gold')||t.includes('elite')) return AI_RESPOSTAS.nivel
    if (t.includes('ordem')||t.includes('serviço')||t.includes('foto')||t.includes('assinar')) return AI_RESPOSTAS.ordem
    if (t.includes('disponib')||t.includes('horário')||t.includes('bloqueio')) return AI_RESPOSTAS.disponibilidade
    if (t.includes('pagam')||t.includes('sepa')||t.includes('swan')||t.includes('transferê')) return AI_RESPOSTAS.pagamento
    return 'Obrigado pela tua pergunta! Para situações mais específicas, podes contactar a equipa via Chat de suporte. Posso ajudar com carteira, ordens, níveis ou disponibilidade.'
  }

  const enviar = (txt) => {
    if (!txt.trim() || loading) return
    setMsgs(m => [...m, { de:'user', t:txt }])
    setInput('')
    setLoading(true)
    setTimeout(() => {
      setMsgs(m => [...m, { de:'ai', t:getResp(txt) }])
      setLoading(false)
    }, 800)
  }

  if (!aberto) return (
    <button
      onClick={() => setAberto(true)}
      style={{
        position:'fixed', bottom:90, right:fabRight,
        width:52, height:52, borderRadius:'50%', border:'none', cursor:'pointer',
        background:`linear-gradient(135deg,${C.g},#065f46)`,
        boxShadow:'0 4px 20px rgba(22,163,74,0.5)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:22, zIndex:45,
        animation:'pulse-ai 2s infinite',
      }}
      title='Assistente AI'>
      ✨
      <style>{`@keyframes pulse-ai{0%,100%{box-shadow:0 4px 20px rgba(22,163,74,0.5)}50%{box-shadow:0 4px 28px rgba(22,163,74,0.8)}}`}</style>
    </button>
  )

  return (
    <div style={{
      position:'fixed', bottom:0, right:0, left:0,
      zIndex:55, display:'flex', flexDirection:'column', alignItems:'flex-end',
      maxWidth:430, margin:'0 auto',
      left:'50%', transform:'translateX(-50%)',
    }}>
      {/* Painel de chat */}
      <div style={{
        width:'100%', height:480,
        background:C.white, borderRadius:'20px 20px 0 0',
        boxShadow:'0 -8px 40px rgba(0,0,0,0.2)',
        display:'flex', flexDirection:'column', overflow:'hidden',
      }}>
        {/* Header do chat */}
        <div style={{ background:`linear-gradient(135deg,${C.navy},${C.gd})`, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>✨</div>
            <div>
              <div style={{ color:'#fff', fontSize:13, fontWeight:700 }}>Assistente ServiçoPRO</div>
              <div style={{ color:'#86efac', fontSize:10 }}>● Online · Resposta imediata</div>
            </div>
          </div>
          <button onClick={() => setAberto(false)} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:8, width:30, height:30, cursor:'pointer', color:'#fff', fontSize:16 }}>×</button>
        </div>

        {/* Mensagens */}
        <div style={{ flex:1, overflowY:'auto', padding:'14px 14px 8px', display:'flex', flexDirection:'column', gap:8 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display:'flex', justifyContent: m.de==='user'?'flex-end':'flex-start' }}>
              {m.de==='ai' && <div style={{ width:26, height:26, borderRadius:'50%', background:`linear-gradient(135deg,${C.g},#065f46)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, marginRight:7, flexShrink:0, alignSelf:'flex-end' }}>✨</div>}
              <div style={{
                maxWidth:'76%', padding:'9px 12px', borderRadius: m.de==='user'?'16px 4px 16px 16px':'4px 16px 16px 16px',
                background: m.de==='user' ? C.navy : '#f1f5f9',
                color: m.de==='user' ? '#fff' : C.navy,
                fontSize:13, lineHeight:1.5,
              }}>{m.t}</div>
            </div>
          ))}
          {loading && (
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <div style={{ width:26, height:26, borderRadius:'50%', background:`linear-gradient(135deg,${C.g},#065f46)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>✨</div>
              <div style={{ background:'#f1f5f9', padding:'10px 14px', borderRadius:'4px 16px 16px 16px', display:'flex', gap:4 }}>
                {[0,1,2].map(i=><div key={i} style={{ width:6, height:6, borderRadius:'50%', background:C.slate, animation:`dot${i} 1s ${i*0.2}s infinite` }}/>)}
                <style>{`@keyframes dot0,@keyframes dot1,@keyframes dot2{0%,100%{opacity:0.3}50%{opacity:1}}`}</style>
              </div>
            </div>
          )}
        </div>

        {/* Sugestões */}
        {msgs.length <= 2 && (
          <div style={{ padding:'0 12px 8px', display:'flex', gap:6, overflowX:'auto', flexShrink:0 }}>
            {SUGESTOES.map(s => (
              <button key={s} onClick={() => enviar(s)} style={{ flexShrink:0, padding:'6px 12px', border:`1px solid ${C.g}`, borderRadius:16, background:C.gl, color:C.gd, fontSize:11, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>{s}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding:'8px 12px 16px', borderTop:`1px solid ${C.border}`, display:'flex', gap:8, flexShrink:0 }}>
          <input
            value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&enviar(input)}
            placeholder='Escreve a tua pergunta...'
            style={{ flex:1, border:`1.5px solid ${C.border}`, borderRadius:22, padding:'10px 14px', fontSize:13, outline:'none', color:C.navy, background:'#f8fafc' }}
          />
          <button onClick={() => enviar(input)} disabled={!input.trim()||loading} style={{ width:40, height:40, borderRadius:'50%', border:'none', background: input.trim()&&!loading ? C.g : C.border, cursor: input.trim()&&!loading ?'pointer':'default', color:'#fff', fontSize:16, flexShrink:0 }}>➤</button>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   ══ FASE 2b-A — ecrãs data-driven (Supabase) ══
   Prefixo V2 distingue dos ecrãs antigos da canalização (mantidos até 2c)
   ════════════════════════════════════════════════════════════════════ */

/* Design tokens por categoria (cor + hero copy — decisões de design, não BD) */
const CATEGORY_META = {
  limpeza:     { color:'#10B981', hero:'Precisa de algo fora do catálogo? Combine connosco e enviamos a técnica certa.' },
  manutencao:  { color:'#F59E0B', hero:'Várias pequenas reparações? Combine tudo numa única visita e poupe tempo.' },
  jardim:      { color:'#22C55E', hero:'Jardim à medida — qualquer tarefa específica que não esteja no catálogo.' },
  piscina:     { color:'#06B6D4', hero:'Problema específico na sua piscina ou emergência? Enviamos o técnico certo.' },
  pintura:     { color:'#F97316', hero:'Projecto de pintura especial ou acabamento à medida? Combine connosco.' },
  eletrica:    { color:'#EAB308', hero:'Intervenção eléctrica específica com técnico certificado CTI.' },
  canalizacao: { color:'#8B5CF6', hero:'Algo fora do comum? Descreva o trabalho e enviamos o técnico certo.' },
  pos_obra:    { color:'#78716C', hero:'Acabamento pós-obra à medida — limpeza + retoques + entulho conforme precisar.' },
}

/* Fetch completo de uma categoria (subcategorias + serviços-top + variantes + personalizado).
   `baseCategoryRow` vem do cache de categorias carregado no root App (ver categoriesCache).
   CATEGORY_META é só para design tokens (color + hero copy). Se a cat não estiver em
   CATEGORY_META, cai em defaults — permite futuras categorias dinâmicas sem bloquear.
   Retorna null apenas se a categoria não existir no cache. */
async function fetchCategoryFull(categoryId, token, baseCategoryRow){
  if(!baseCategoryRow) return null
  const meta = CATEGORY_META[categoryId] || { color:'#10B981', hero:'Serviço à medida — descreva o trabalho e enviamos o técnico certo.' }

  const [subRows, personalizadoRows, topServicos, allVariants] = await Promise.all([
    sbGet('subcategorias', `?categoria_id=eq.${categoryId}&order=ordem`, token),
    sbGet('servicos',      `?id=eq.${getPersonalizadoId(categoryId)}&select=preco,preco_original`, token),
    sbGet('servicos',      `?categoria_id=eq.${categoryId}&activo=eq.true&servico_pai_id=is.null&tipo=neq.personalizado&order=ordem`, token),
    sbGet('servicos',      `?categoria_id=eq.${categoryId}&activo=eq.true&servico_pai_id=not.is.null&order=ordem`, token),
  ])

  console.log('[V2 catalog] fetchCategoryFull', categoryId,
    '→ subs:', Array.isArray(subRows)?subRows.length:subRows,
    '· top:', Array.isArray(topServicos)?topServicos.length:topServicos,
    '· variants:', Array.isArray(allVariants)?allVariants.length:allVariants,
    '· personalizado:', personalizadoRows?.[0]?.preco ?? null)

  const personalizado = personalizadoRows?.[0]

  const variantsByParent = {}
  for(const v of (allVariants || [])){
    const pid = v.servico_pai_id
    if(!variantsByParent[pid]) variantsByParent[pid] = []
    variantsByParent[pid].push(v)
  }

  const subcategorias = (subRows || []).map(sub => ({
    id: sub.id, nome: sub.nome, icon: sub.icon,
    services: (topServicos || [])
      .filter(s => s.subcategoria_id === sub.id)
      .map(s => s.tipo === 'grupo'
        ? { ...s, variants: variantsByParent[s.id] || [] }
        : s
      ),
  })).filter(sub => sub.services.length > 0)

  return {
    id:    baseCategoryRow.id,
    nome:  baseCategoryRow.nome,
    emoji: baseCategoryRow.icon,
    color: meta.color,
    hero:  meta.hero,
    subcategorias,
    personalizadoRate:         Number(personalizado?.preco) || 49.90,
    personalizadoRateOriginal: Number(personalizado?.preco_original) || 54.90,
  }
}

/* Fetch de variantes de um grupo-pai */
async function fetchGroupVariants(parentId, token){
  const rows = await sbGet('servicos', `?servico_pai_id=eq.${parentId}&activo=eq.true&order=ordem`, token)
  return rows || []
}

/* Fetch de um serviço + pai + extras (todos os servico_extras do pai ou do serviço).
   Extras de produto têm id com prefixo "ext-prod-" (ver seed em sec 17 do SQL). */
async function fetchServiceWithParent(serviceId, token){
  const rows = await sbGet('servicos', `?id=eq.${serviceId}&limit=1`, token)
  if(!rows || rows.length === 0) return { service:null, parent:null, extras:[] }
  const service = rows[0]
  let parent = null
  if(service.servico_pai_id){
    const parentRows = await sbGet('servicos', `?id=eq.${service.servico_pai_id}&limit=1`, token)
    parent = parentRows?.[0] || null
  }
  const extrasSource = parent?.id || service.id
  const extrasRows = await sbGet('servico_extras', `?servico_id=eq.${extrasSource}&order=ordem`, token)
  return { service, parent, extras: extrasRows || [] }
}

/* Extrai do array de extras o "extra de produtos" (id começa por ext-prod-).
   Retorna { hasProductsOption: bool, productsExtraPrice: number, productsExtra: row|null } */
function pickProductsExtra(extras){
  const row = (extras || []).find(e => typeof e.id === 'string' && e.id.startsWith('ext-prod-'))
  return {
    hasProductsOption:  !!row,
    productsExtraPrice: row ? Number(row.preco) : 0,
    productsExtra:      row || null,
  }
}

/* ── ServiceCardV2 — distingue grupo ("desde €X · N tipologias") vs fixo ── */
function ServiceCardV2({ service, categoryColor, onClick }){
  const isGrupo = service.tipo === 'grupo'
  const nome = service.nome || service.name
  const preco = Number(service.preco ?? service.price ?? 0)
  const precoOriginal = service.preco_original != null ? Number(service.preco_original) : (service.priceOriginal || null)
  const hasDiscount = precoOriginal && precoOriginal > preco
  const pct = hasDiscount ? Math.round(((precoOriginal - preco) / precoOriginal) * 100) : 0
  const variantCount = service.variants?.length || 0
  const minVariantPrice = isGrupo && variantCount > 0
    ? Math.min(...service.variants.map(v => Number(v.preco ?? v.price)))
    : preco

  return (
    <button onClick={onClick} style={{
      background:CC.paper, border:`1px solid ${CC.line}`,
      borderRadius:14, padding:12,
      display:"flex", gap:12, alignItems:"center",
      cursor:"pointer", textAlign:"left", width:"100%",
    }}>
      <div style={{
        width:56, height:56, flexShrink:0, borderRadius:12,
        background: service.eco ? "#E8F5EE" : `${categoryColor || CC.emerald}15`,
        color: service.eco ? "#2D7A5F" : (categoryColor || CC.emerald),
        display:"grid", placeItems:"center", position:"relative",
      }}>
        {service.eco ? <Leaf size={24}/> : <Wrench size={22}/>}
        {service.popular && (
          <div style={{
            position:"absolute", top:-6, right:-6,
            background:CC.emerald, color:CC.paper,
            width:22, height:22, borderRadius:999,
            display:"grid", placeItems:"center",
            boxShadow:`0 2px 6px -1px ${CC.emeraldDark}`,
          }}><Star size={11} fill={CC.paper} color={CC.paper}/></div>
        )}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13.5, fontWeight:600, color:CC.ink, lineHeight:1.25 }}>{nome}</div>
        <div style={{ display:"flex", gap:6, alignItems:"center", marginTop:6, flexWrap:"wrap" }}>
          {service.eco && <CCChip tone="eco" icon={Leaf}>Eco</CCChip>}
          {service.popular && <CCChip tone="emerald" icon={Star}>Popular</CCChip>}
          {!isGrupo && hasDiscount && pct >= 10 && <CCChip tone="discount">−{pct}%</CCChip>}
        </div>
        <div style={{ marginTop:6, display:"flex", alignItems:"baseline", gap:8, flexWrap:"wrap" }}>
          {isGrupo ? (
            <>
              <span style={{ fontSize:11, color:CC.stone, fontWeight:500 }}>desde</span>
              <span style={{ fontSize:15, fontWeight:700, color:CC.ink }}>{eur(minVariantPrice)}</span>
              {variantCount > 0 && (
                <span style={{ fontSize:11, color:CC.stone }}>· {variantCount} tipologia{variantCount>1?'s':''}</span>
              )}
            </>
          ) : (
            <CCPriceTag price={preco} priceOriginal={precoOriginal} size="sm"/>
          )}
        </div>
      </div>
      <ChevronRight size={18} color={CC.stone} style={{ flexShrink:0 }}/>
    </button>
  )
}

/* ── ServiceListScreenV2 — lista data-driven por categoria ──
   Props:
   - categoryId: string (ex: 'limpeza')
   - categoriesCache: array vindo do root App (null = a carregar, [] = erro de fetch)
   - authUser, onBack, onSelectService, onSelectPersonalizado: standard */
function ServiceListScreenV2({ categoryId, categoriesCache, authUser, onBack, onSelectService, onSelectPersonalizado }){
  const [category, setCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeSub, setActiveSub] = useState('todos')
  const [search, setSearch] = useState('')
  const sectionRefs = useRef({})
  const pillBarRef = useRef(null)
  // Quando true, bloqueia o scroll-spy durante scroll programático (click numa pill)
  const suppressSpyRef = useRef(false)

  useEffect(() => {
    // Esperar pelo cache de categorias (null = ainda a carregar)
    if(categoriesCache === null) return
    // Cache vazio = fetch inicial falhou
    if(categoriesCache.length === 0){
      setError('Sem categorias disponíveis (verifique ligação à base de dados).')
      setLoading(false)
      return
    }
    const baseRow = categoriesCache.find(c => c.id === categoryId)
    if(!baseRow){
      setError(`Categoria "${categoryId}" não existe no catálogo (${categoriesCache.length} disponíveis).`)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true); setError(null)
    fetchCategoryFull(categoryId, authUser?.token, baseRow)
      .then(data => {
        if(!active) return
        if(!data) setError(`Não foi possível carregar o catálogo de "${baseRow.nome}".`)
        else setCategory(data)
        setLoading(false)
      })
      .catch(e => { if(active){ setError(e.message || 'Erro ao carregar categoria'); setLoading(false) } })
    return () => { active = false }
  }, [categoryId, authUser?.token, categoriesCache])

  // Scroll-spy — IntersectionObserver detecta qual subcategoria está visível
  // e actualiza a pill activa. Rootmargin negativo no topo compensa o
  // scrollMarginTop das secções (140). No fundo ignoramos os últimos 45%
  // para que a primeira secção com topo visível ganhe prioridade.
  useEffect(() => {
    if(!category || search) return
    const obs = new IntersectionObserver(entries => {
      if(suppressSpyRef.current) return
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if(visible.length > 0){
        const id = visible[0].target.dataset.subId
        if(id) setActiveSub(id)
      }
    }, { rootMargin:'-170px 0px -45% 0px', threshold:0 })
    Object.entries(sectionRefs.current).forEach(([, el]) => {
      if(el) obs.observe(el)
    })
    const onScroll = () => {
      if(suppressSpyRef.current) return
      if(window.scrollY < 80) setActiveSub('todos')
    }
    window.addEventListener('scroll', onScroll, { passive:true })
    return () => { obs.disconnect(); window.removeEventListener('scroll', onScroll) }
  }, [category, search])

  // Auto-scroll da pill bar para centrar a pill activa
  useEffect(() => {
    const bar = pillBarRef.current
    if(!bar) return
    const pill = bar.querySelector(`[data-sub-id="${activeSub}"]`)
    if(!pill) return
    const barRect = bar.getBoundingClientRect()
    const pillRect = pill.getBoundingClientRect()
    const offset = (pillRect.left + pillRect.width/2) - (barRect.left + barRect.width/2)
    if(Math.abs(offset) > 4) bar.scrollBy({ left:offset, behavior:'smooth' })
  }, [activeSub])

  if(loading || categoriesCache === null) return (
    <CCShell>
      <CCTopBar onBack={onBack} title="A carregar..."/>
      {/* Skeleton: search + pills + personalizado hero + 3 cards */}
      <div style={{ padding:"10px 18px 0" }}>
        <div className="sk" style={{ height:40, borderRadius:12 }}/>
      </div>
      <div style={{ display:"flex", gap:6, padding:"10px 18px 10px", overflow:"hidden" }}>
        {[44,96,76,104,82].map((w,i) => (
          <div key={i} className="sk" style={{ width:w, height:30, borderRadius:999, flexShrink:0 }}/>
        ))}
      </div>
      <div style={{ padding:"4px 18px 0" }}>
        <div className="sk" style={{ height:120, borderRadius:20, marginTop:12 }}/>
        <div style={{ marginTop:28 }}>
          <div className="sk" style={{ width:180, height:18, marginBottom:14 }}/>
          {[0,1,2].map(i => (
            <div key={i} style={{
              display:"flex", gap:12, alignItems:"center",
              background:CC.paper, border:`1px solid ${CC.line}`, borderRadius:14,
              padding:12, marginBottom:8,
            }}>
              <div className="sk" style={{ width:44, height:44, borderRadius:10, flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div className="sk" style={{ width:'72%', height:14, marginBottom:6 }}/>
                <div className="sk" style={{ width:'45%', height:11 }}/>
              </div>
              <div className="sk" style={{ width:58, height:20, flexShrink:0 }}/>
            </div>
          ))}
        </div>
      </div>
    </CCShell>
  )
  if(error || !category) return (
    <CCShell>
      <CCTopBar onBack={onBack} title="Erro" />
      <div style={{ padding:40, textAlign:"center", color:CC.stone, fontSize:13, lineHeight:1.5 }}>{error || 'Categoria indisponível.'}</div>
    </CCShell>
  )

  const filtered = search
    ? category.subcategorias.map(sub => ({
        ...sub,
        services: sub.services.filter(s => (s.nome || s.name || '').toLowerCase().includes(search.toLowerCase())),
      })).filter(sub => sub.services.length > 0)
    : category.subcategorias

  const scrollToSub = (id) => {
    // Click numa pill: marca activa imediatamente e suspende o scroll-spy
    // durante o scroll suave para evitar piscar enquanto passa por secções.
    setActiveSub(id)
    suppressSpyRef.current = true
    setTimeout(()=>{ suppressSpyRef.current = false }, 700)
    if(id === 'todos'){
      window.scrollTo({ top:0, behavior:'smooth' })
    } else {
      sectionRefs.current[id]?.scrollIntoView({ behavior:'smooth', block:'start' })
    }
  }

  const totalServicos = category.subcategorias.reduce((n,s)=>n+s.services.length, 0)

  return (
    <CCShell>
      <CCTopBar onBack={onBack} title={category.nome} subtitle={`${totalServicos} serviços · Caldas da Rainha`}/>

      {/* Sticky wrapper: search + (quando !search) pill bar */}
      <div style={{
        position:"sticky", top:62, zIndex:15,
        background:CC.cream, borderBottom:`1px solid ${CC.line}`,
      }}>
        <div style={{ padding:"10px 18px 0" }}>
          <div style={{
            display:"flex", alignItems:"center", gap:10,
            background:CC.paper, border:`1px solid ${CC.line}`,
            borderRadius:12, padding:"10px 14px",
          }}>
            <Search size={16} color={CC.stone}/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder={`Procurar em ${category.nome}...`}
              style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:14, fontFamily:"inherit", color:CC.ink }}/>
            {search && (
              <button onClick={()=>setSearch('')} style={{
                background:"transparent", border:"none", cursor:"pointer", color:CC.stone,
                display:"grid", placeItems:"center",
              }}><X size={14}/></button>
            )}
          </div>
        </div>

        {!search && (
          <div ref={pillBarRef} className="cc-no-scrollbar" style={{
            display:"flex", gap:6, overflowX:"auto", overflowY:"hidden",
            padding:"10px 18px 10px", scrollSnapType:"x proximity",
            scrollBehavior:"smooth", WebkitOverflowScrolling:"touch",
            maskImage:"linear-gradient(to right, black calc(100% - 24px), transparent)",
            WebkitMaskImage:"linear-gradient(to right, black calc(100% - 24px), transparent)",
          }}
            onWheel={e => {
              // Converter scroll vertical do rato em horizontal (desktop sem touchpad horizontal)
              if(e.deltaY !== 0 && e.deltaX === 0){
                e.currentTarget.scrollLeft += e.deltaY
              }
            }}>
            <CCSubPill subId="todos" active={activeSub==='todos'} onClick={()=>scrollToSub('todos')}>Todos</CCSubPill>
            {category.subcategorias.map(sub => (
              <CCSubPill key={sub.id} subId={sub.id} active={activeSub===sub.id} onClick={()=>scrollToSub(sub.id)}>{sub.icon} {sub.nome}</CCSubPill>
            ))}
          </div>
        )}

        {/* Spacer para que o border do sticky alinhe bem quando só search está visível */}
        {search && <div style={{ height:10 }}/>}
      </div>

      <div style={{ padding:"4px 18px 140px" }}>
        {!search && (
          <button onClick={onSelectPersonalizado} style={{
            width:"100%", textAlign:"left", cursor:"pointer",
            background:`linear-gradient(135deg,${CC.forest} 0%,${CC.forestSoft} 100%)`,
            color:CC.paper, border:"none",
            borderRadius:20, padding:20, marginTop:12,
            position:"relative", overflow:"hidden",
            boxShadow:`0 16px 40px -18px ${CC.forestDeep}`,
          }}>
            <div style={{ position:"absolute", right:-24, top:-24, fontSize:140, opacity:0.08, pointerEvents:"none" }}>{category.emoji}</div>
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:10, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:CC.emeraldBright }}>
              <Sparkles size={11}/> À medida em {category.nome}
            </div>
            <div className="serif" style={{ fontSize:22, fontWeight:500, marginTop:8, lineHeight:1.2 }}>Serviço personalizado</div>
            <div style={{ fontSize:13, opacity:0.85, marginTop:6, maxWidth:320, lineHeight:1.4 }}>{category.hero}</div>
            <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid rgba(255,255,255,0.15)", display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
              <div>
                <div style={{ fontSize:11, opacity:0.7 }}>Por hora</div>
                <div style={{ display:"flex", alignItems:"baseline", gap:6, marginTop:2 }}>
                  <span style={{ fontSize:12, opacity:0.6, textDecoration:"line-through" }}>{eur(category.personalizadoRateOriginal)}</span>
                  <span className="serif" style={{ fontSize:22, fontWeight:600, color:CC.emeraldBright }}>{eur(category.personalizadoRate)}</span>
                </div>
              </div>
              <div style={{ background:CC.emerald, color:CC.paper, padding:"8px 14px", borderRadius:999, fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
                Personalizar <ChevronRight size={14}/>
              </div>
            </div>
          </button>
        )}

        {filtered.map(sub => (
          <div key={sub.id} ref={el => (sectionRefs.current[sub.id] = el)} data-sub-id={sub.id} style={{ marginTop:28, scrollMarginTop:170 }}>
            <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:10 }}>
              <div className="serif" style={{ fontSize:17, fontWeight:600, letterSpacing:-0.15 }}>{sub.icon} {sub.nome}</div>
              <div style={{ fontSize:11, color:CC.stone, fontWeight:500 }}>{sub.services.length}</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {sub.services.map(s => (
                <ServiceCardV2 key={s.id} service={s} categoryColor={category.color} onClick={()=>onSelectService(s, category)}/>
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:40, color:CC.stone, fontSize:14 }}>
            Nenhum serviço encontrado para "{search}".
          </div>
        )}
      </div>
    </CCShell>
  )
}

/* ── VariantPickerScreenV2 — selector de tipologia/tamanho para grupos ── */
function VariantPickerScreenV2({ parent, category, authUser, onBack, onContinue }){
  const [variants, setVariants] = useState(parent.variants || null)
  const [loading, setLoading] = useState(!parent.variants)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    if(parent.variants && parent.variants.length > 0){
      const pop = parent.variants.find(v => v.popular)
      setSelectedId((pop || parent.variants[0]).id)
      return
    }
    let active = true
    setLoading(true)
    fetchGroupVariants(parent.id, authUser?.token).then(vs => {
      if(!active) return
      setVariants(vs); setLoading(false)
      const pop = vs.find(v => v.popular)
      if(vs.length > 0) setSelectedId((pop || vs[0]).id)
    })
    return () => { active = false }
  }, [parent.id, authUser?.token])

  if(loading || !variants) return (
    <CCShell>
      <CCTopBar onBack={onBack} title={parent.nome || parent.name}/>
      <div style={{ padding:40, textAlign:"center", color:CC.stone, fontSize:13 }}>A carregar tipologias…</div>
    </CCShell>
  )

  const selected = variants.find(v => v.id === selectedId) || variants[0]

  return (
    <CCShell>
      <CCTopBar onBack={onBack} title={parent.nome || parent.name} subtitle="Escolha a tipologia"/>
      <div style={{ padding:"16px 18px 140px" }}>
        <div style={{
          background:`${category.color}15`, borderRadius:20,
          padding:"24px 20px", textAlign:"center",
        }}>
          <div style={{ fontSize:48 }}>{category.emoji}</div>
          <div className="serif" style={{ fontSize:19, fontWeight:500, marginTop:10 }}>{parent.nome || parent.name}</div>
          {parent.tagline && (
            <div style={{ fontSize:12.5, color:CC.stone, marginTop:8, lineHeight:1.4, fontStyle:"italic" }}>{parent.tagline}</div>
          )}
        </div>

        <div style={{ marginTop:22, fontSize:13, fontWeight:600, color:CC.ink, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span>Qual a tipologia da sua casa?</span>
          <span style={{ fontSize:11, color:CC.stone, fontWeight:500 }}>{variants.length} opções</span>
        </div>

        <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:8 }}>
          {variants.map(v => {
            const isSel = v.id === selectedId
            const preco = Number(v.preco ?? v.price ?? 0)
            const precoOri = v.preco_original != null ? Number(v.preco_original) : (v.priceOriginal || null)
            const hasDiscount = precoOri && precoOri > preco
            const label = v.nome || v.name || v.label
            return (
              <button key={v.id} onClick={()=>setSelectedId(v.id)} style={{
                background: isSel ? `${category.color}08` : CC.paper,
                border:`2px solid ${isSel ? category.color : CC.line}`,
                borderRadius:12, padding:"14px",
                display:"flex", alignItems:"center", gap:12,
                cursor:"pointer", textAlign:"left", width:"100%",
                transition:"all 0.15s",
              }}>
                <div style={{
                  width:20, height:20, borderRadius:999,
                  border:`2px solid ${isSel ? category.color : CC.stoneLight}`,
                  background: isSel ? category.color : "transparent",
                  display:"grid", placeItems:"center", flexShrink:0,
                }}>{isSel && <Check size={12} color={CC.paper} strokeWidth={3}/>}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"baseline", gap:8, flexWrap:"wrap" }}>
                    <span style={{ fontSize:14.5, fontWeight:600, color:CC.ink }}>{label}</span>
                    {v.popular && <CCChip tone="emerald" icon={Star}>Popular</CCChip>}
                  </div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:CC.ink }}>{eur(preco)}</div>
                  {hasDiscount && (
                    <div style={{ fontSize:11, color:CC.stone, textDecoration:"line-through" }}>{eur(precoOri)}</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {(parent.duracao_tipica || parent.duracao) && (
          <div style={{
            marginTop:18, padding:"12px 14px",
            background:CC.cream, borderRadius:10,
            fontSize:12, color:CC.stone,
            display:"flex", alignItems:"center", gap:8,
          }}>
            <Clock size={14} color={CC.emerald}/>
            Duração: <strong style={{ color:CC.ink }}>{parent.duracao_tipica || parent.duracao}</strong>
          </div>
        )}
      </div>

      <CCStickyCTA>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10, padding:"0 4px" }}>
          <span style={{ fontSize:12, color:CC.stone }}>{selected.nome || selected.name} · Preço</span>
          <CCPriceTag price={Number(selected.preco ?? selected.price)} priceOriginal={selected.preco_original ?? selected.priceOriginal} size="lg"/>
        </div>
        <CCPrimaryBtn onClick={()=>onContinue(selected, parent)}>Continuar</CCPrimaryBtn>
      </CCStickyCTA>
    </CCShell>
  )
}

/* ── ServiceDetailScreenV2 — detalhe rico data-driven, com opções dinâmicas ── */
function ServiceDetailScreenV2({ serviceId, category, authUser, onBack, onContinue }){
  const [service, setService] = useState(null)
  const [parent, setParent] = useState(null)
  const [extras, setExtras] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true); setError(null)
    fetchServiceWithParent(serviceId, authUser?.token).then(({ service, parent, extras }) => {
      if(!active) return
      if(!service) setError('Serviço indisponível.')
      else { setService(service); setParent(parent); setExtras(extras) }
      setLoading(false)
    }).catch(e => { if(active){ setError(e.message); setLoading(false) } })
    return () => { active = false }
  }, [serviceId, authUser?.token])

  const optionSource = parent || service
  const { hasProductsOption, productsExtraPrice } = pickProductsExtra(extras)
  const frequencyOptions = service ? getFrequencyOptions(
    { frequencyTemplate: service.frequency_template },
    parent ? { frequencyTemplate: parent.frequency_template } : null
  ) : null
  const hasFrequency = !!frequencyOptions
  const hasAnyOption = !!(hasProductsOption || hasFrequency)
  const defaultFrequencyId = hasFrequency ? frequencyOptions[0].id : 'pontual'

  const [productsId, setProductsId]   = useState('cliente')
  const [frequencyId, setFrequencyId] = useState(defaultFrequencyId)
  useEffect(() => { setFrequencyId(defaultFrequencyId) }, [defaultFrequencyId])

  if(loading) return (
    <CCShell><CCTopBar onBack={onBack} title="A carregar..."/>
      <div style={{ padding:40, textAlign:"center", color:CC.stone, fontSize:13 }}>A obter detalhe…</div>
    </CCShell>
  )
  if(error || !service) return (
    <CCShell><CCTopBar onBack={onBack} title="Erro"/>
      <div style={{ padding:40, textAlign:"center", color:CC.stone, fontSize:13 }}>{error || 'Serviço indisponível.'}</div>
    </CCShell>
  )

  const nome = service.nome
  const basePrice = Number(service.preco)
  const basePriceOriginal = service.preco_original != null ? Number(service.preco_original) : null
  // Deep price (para mensal+profunda trimestral, cln_home): hardcoded → refinamento 2c
  const deepPriceForBundle = null
  const effectivePrice = hasAnyOption
    ? calcDynamicPrice(basePrice, productsId, frequencyId, productsExtraPrice, deepPriceForBundle, frequencyOptions)
    : basePrice
  const currentFreq = hasFrequency ? frequencyOptions.find(f => f.id === frequencyId) : null
  const priceSuffix = currentFreq ? currentFreq.suffix : ''

  // Shim: OptionsSection espera camelCase. Adaptamos.
  const optionSourceShim = {
    hasProductsOption:  hasProductsOption,
    productsExtraPrice: productsExtraPrice,
    frequencyTemplate:  optionSource?.frequency_template,
  }
  const serviceShim = {
    frequencyTemplate: service.frequency_template,
  }

  const incluiArr    = Array.isArray(service.inclui)     ? service.inclui     : []
  const naoIncluiArr = Array.isArray(service.nao_inclui) ? service.nao_inclui : []
  const faqArr       = Array.isArray(service.faq)        ? service.faq        : []

  return (
    <CCShell>
      <CCTopBar onBack={onBack} title={nome}/>
      <div style={{ padding:"16px 18px 140px" }}>
        <div style={{ background:`${category.color}15`, borderRadius:20, padding:"32px 20px", textAlign:"center", overflow:"hidden" }}>
          <div style={{ fontSize:60 }}>{category.emoji}</div>
          <div className="serif" style={{ fontSize:22, fontWeight:500, marginTop:12 }}>{nome}</div>
          <div style={{ display:"flex", justifyContent:"center", gap:6, marginTop:12, flexWrap:"wrap" }}>
            <CCChip icon={Shield} tone="emerald">{service.garantia_dias || 90} dias garantia</CCChip>
            {service.eco && <CCChip icon={Leaf} tone="eco">Eco</CCChip>}
            {service.popular && <CCChip icon={Star} tone="emerald">Popular</CCChip>}
          </div>
        </div>

        <div style={{ marginTop:20, padding:"14px 0", borderTop:`1px solid ${CC.line}`, borderBottom:`1px solid ${CC.line}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:12, color:CC.stone, marginBottom:4 }}>
                {priceSuffix ? 'Preço do plano' : 'Preço fixo do serviço'}
              </div>
              <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                <span style={{ fontSize:22, fontWeight:700, color:CC.ink }}>{eur(effectivePrice)}</span>
                {priceSuffix && <span style={{ fontSize:12, color:CC.stone, fontWeight:500 }}>{priceSuffix}</span>}
                {basePriceOriginal && basePriceOriginal > basePrice && !priceSuffix && (
                  <span style={{ fontSize:13, color:CC.stone, textDecoration:"line-through" }}>{eur(basePriceOriginal)}</span>
                )}
              </div>
            </div>
            <CCChip tone="emerald" icon={Lock}>Sem surpresas</CCChip>
          </div>
        </div>

        {service.tagline && (
          <div style={{
            marginTop:18, padding:"14px 16px", background:`${category.color}08`,
            border:`1px solid ${category.color}20`, borderRadius:12,
          }}>
            <div style={{ fontSize:13, color:CC.ink, lineHeight:1.5, fontStyle:"italic" }}>{service.tagline}</div>
            {service.duracao_tipica && (
              <div style={{ fontSize:11.5, color:CC.stone, marginTop:8, display:"flex", alignItems:"center", gap:6 }}>
                <Clock size={12}/> Duração típica: <strong style={{ color:CC.ink }}>{service.duracao_tipica}</strong>
              </div>
            )}
          </div>
        )}

        <OptionsSection
          service={serviceShim} parent={optionSourceShim}
          productsId={productsId} setProductsId={setProductsId}
          frequencyId={frequencyId} setFrequencyId={setFrequencyId}
          accent={category.color}/>

        {incluiArr.length > 0 && (
          <DetailSection title="O que está incluído" icon={Check} iconColor={CC.emerald}>
            {incluiArr.map((item, i) => <DetailItem key={i} icon={Check} iconColor={CC.emerald}>{item}</DetailItem>)}
          </DetailSection>
        )}
        {naoIncluiArr.length > 0 && (
          <DetailSection title="O que não está incluído" icon={X} iconColor={CC.stone}>
            {naoIncluiArr.map((item, i) => <DetailItem key={i} icon={X} iconColor={CC.stone}>{item}</DetailItem>)}
          </DetailSection>
        )}
        {faqArr.length > 0 && (
          <DetailSection title="Perguntas frequentes" icon={MessageSquare} iconColor={CC.forest}>
            {faqArr.map((item, i) => <FaqItem key={i} q={item.q} a={item.a}/>)}
          </DetailSection>
        )}

        {incluiArr.length === 0 && (
          <div style={{ marginTop:20, display:"flex", flexDirection:"column", gap:16 }}>
            <CCValueRow icon={Lock}          title="Técnico fixo, escolhido por si"       desc="Sempre o mesmo profissional da nossa rede de confiança."/>
            <CCValueRow icon={Shield}        title={`${service.garantia_dias || 90} dias de garantia`} desc="Se o problema voltar, regressamos sem custos adicionais."/>
            <CCValueRow icon={MessageSquare} title="Chat directo e relatório fotográfico" desc="Fala com o técnico e recebe relatório no fim."/>
          </div>
        )}
      </div>

      <CCStickyCTA>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10, padding:"0 4px" }}>
          <span style={{ fontSize:12, color:CC.stone }}>{priceSuffix ? 'Preço do plano' : 'Preço'}</span>
          <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
            <span style={{ fontSize:20, fontWeight:700, color:CC.ink }}>{eur(effectivePrice)}</span>
            {priceSuffix && <span style={{ fontSize:12, color:CC.stone, fontWeight:500 }}>{priceSuffix}</span>}
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={async ()=>{
            const uid = authUser?.user?.id
            if(!uid){ alert('Tem de iniciar sessão para guardar na lista.'); return }
            const lista = await sbGetOrCreateListaAberta(uid, authUser?.token)
            if(!lista){ alert('Erro ao criar lista.'); return }
            const nomeSnap = service.nome || service.name || 'Serviço'
            const r = await sbSave('lista_items', {
              lista_id: lista.id,
              tipo: 'fixo',
              servico_id: service.id,
              descricao: nomeSnap,  // snapshot legível do nome
              categoria_id: category.id,
              preco_estimado: effectivePrice,
            }, authUser?.token)
            if(!r){ alert('Erro ao adicionar à lista.'); return }
            alert(`✓ "${nomeSnap}" adicionado à sua lista.`)
          }} style={{
            flexShrink:0, padding:"14px 16px", borderRadius:12,
            background:CC.paper, border:`1px solid ${CC.line}`,
            color:CC.ink, fontSize:13, fontWeight:700, cursor:"pointer",
          }}>+ Lista</button>
          <div style={{ flex:1 }}>
            <CCPrimaryBtn onClick={()=>onContinue({ service, parent, extras, productsId, frequencyId, productsExtraPrice, effectivePrice, priceSuffix })}>Continuar</CCPrimaryBtn>
          </div>
        </div>
      </CCStickyCTA>
    </CCShell>
  )
}

/* ── PersonalizadoLandingV2 — landing do personalizado por categoria ── */
function PersonalizadoLandingV2({ category, onBack, onContinue }){
  const discountPct = Math.round((1 - category.personalizadoRate / category.personalizadoRateOriginal) * 100)
  return (
    <CCShell>
      <CCTopBar onBack={onBack} title=""/>
      <div style={{ padding:"8px 18px 140px" }}>
        <div style={{
          background:CC.emeraldPale, borderRadius:24,
          padding:"36px 20px 28px", textAlign:"center", overflow:"hidden",
        }}>
          <div style={{ fontSize:76, lineHeight:1 }}>{category.emoji}</div>
          <div style={{
            display:"inline-flex", gap:5, alignItems:"center",
            background:CC.paper, color:CC.emerald,
            padding:"5px 12px", borderRadius:999,
            fontSize:10, fontWeight:700, letterSpacing:1.3, textTransform:"uppercase",
            marginTop:16, border:`1px solid ${CC.emeraldSoft}`,
          }}><Sparkles size={11}/> {category.nome} · Personalizado</div>
          <div className="serif" style={{
            fontSize:26, fontWeight:500, marginTop:12, lineHeight:1.15,
            letterSpacing:-0.4, color:CC.ink,
          }}>
            Procura um serviço <em style={{ color:CC.emerald, fontStyle:"italic" }}>à medida</em>?
          </div>
          <div style={{ fontSize:13.5, color:CC.stone, marginTop:10, lineHeight:1.5, maxWidth:320, margin:"10px auto 0" }}>
            {category.hero}
          </div>
        </div>

        <div style={{
          marginTop:16, background:CC.paper,
          border:`1.5px solid ${CC.emeraldSoft}`, borderRadius:16, padding:"16px 18px",
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <div>
            <div style={{ fontSize:11, color:CC.stone, fontWeight:600, letterSpacing:0.5, textTransform:"uppercase" }}>Preço por hora</div>
            <div style={{ display:"flex", alignItems:"baseline", gap:8, marginTop:4 }}>
              <span style={{ fontSize:13, color:CC.stone, textDecoration:"line-through" }}>{eur(category.personalizadoRateOriginal)}</span>
              <span className="serif" style={{ fontSize:26, fontWeight:600, color:CC.forest }}>{eur(category.personalizadoRate)}</span>
            </div>
          </div>
          <div style={{
            background:CC.emeraldSoft, color:CC.emeraldDark,
            padding:"6px 10px", borderRadius:999,
            fontSize:11, fontWeight:700, letterSpacing:0.3,
          }}>−{discountPct}%</div>
        </div>

        <div style={{ marginTop:28 }}>
          <div style={{ textAlign:"center" }}>
            <div className="serif" style={{ fontSize:20, fontWeight:600, letterSpacing:-0.2 }}>Ideal para</div>
            <div style={{ width:36, height:2, background:CC.emerald, margin:"8px auto 20px", borderRadius:2 }}/>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
            <CCValueRow icon={Wrench}    title="Trabalho à medida, sem complicações"                desc="Pelo seu técnico de confiança, que já conhece a sua casa."/>
            <CCValueRow icon={Sparkles}  title="Tarefas únicas ou difíceis de explicar"             desc={`Ideal para quando o trabalho não está no catálogo de ${category.nome}.`}/>
            <CCValueRow icon={RefreshCw} title="Várias pequenas tarefas numa só visita"             desc="Agrupa e resolve tudo numa deslocação — poupa tempo e taxa."/>
            <CCValueRow icon={Check}     title="Podemos já ter o que procura"                       desc={`Antes de pedir à medida, consulte os serviços fixos de ${category.nome}.`}/>
          </div>
        </div>
      </div>
      <CCStickyCTA>
        <CCPrimaryBtn onClick={onContinue}>Continuar</CCPrimaryBtn>
      </CCStickyCTA>
    </CCShell>
  )
}

/* ── PersonalizadoFormV2 — descrição + horas estimadas ── */
function PersonalizadoFormV2({ category, authUser, onBack, onContinue, state, setState }){
  const hoursEstimate = (state.horas || 1) * category.personalizadoRate
  const canContinue = (state.description || "").length >= 30
  // Reset scroll ao entrar — evita herdar offset do ecrã anterior (Landing)
  useEffect(() => { window.scrollTo(0, 0) }, [])
  return (
    <CCShell>
      <CCTopBar onBack={onBack} title={`${category.nome} · Personalizado`}/>
      <div style={{ padding:"8px 18px 140px" }}>
        <div style={{
          background:CC.emeraldPale, border:`1px solid ${CC.emeraldSoft}`,
          borderRadius:12, padding:"12px 16px",
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <div style={{ fontSize:12, color:CC.stone, fontWeight:500 }}>Por hora</div>
          <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
            <span style={{ fontSize:11.5, color:CC.stone, textDecoration:"line-through" }}>{eur(category.personalizadoRateOriginal)}</span>
            <span className="serif" style={{ fontSize:16, fontWeight:600, color:CC.forest }}>{eur(category.personalizadoRate)}</span>
          </div>
        </div>

        <div style={{ marginTop:24 }}>
          <div className="serif" style={{ fontSize:17, fontWeight:600 }}>Em que podemos ajudar?</div>
          <div style={{ fontSize:12.5, color:CC.stone, marginTop:4, lineHeight:1.4 }}>
            Quanto mais detalhe, mais fácil será encontrar o profissional certo para si.
          </div>
          <textarea value={state.description || ""} onChange={e=>setState(p=>({...p, description:e.target.value}))}
            placeholder={`Descreva o trabalho de ${category.nome.toLowerCase()}...`}
            maxLength={500}
            style={{
              marginTop:12, width:"100%", minHeight:130,
              background:CC.paper, border:`1px solid ${CC.line}`,
              borderRadius:12, padding:14, fontSize:13.5,
              fontFamily:"inherit", color:CC.ink, resize:"vertical", outline:"none",
            }}/>
          <div style={{ fontSize:11, color:CC.stone, marginTop:4, textAlign:"right" }}>{(state.description || "").length}/500</div>
        </div>

        <div style={{ marginTop:20 }}>
          <div className="serif" style={{ fontSize:17, fontWeight:600 }}>Fotografias</div>
          <div style={{ fontSize:12.5, color:CC.stone, marginTop:4, lineHeight:1.4 }}>
            Opcional. Adicione imagens para ajudar o técnico a preparar-se.
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6, marginTop:12 }}>
            {(state.photos || []).map(p => (
              <div key={p.id} style={{
                aspectRatio:"1", borderRadius:10, background:CC.emeraldPale,
                border:`1px solid ${CC.emeraldSoft}`, display:"grid", placeItems:"center", position:"relative",
              }}>
                <FileImage size={18} color={CC.emerald}/>
                <button onClick={()=>setState(p2=>({...p2, photos:(p2.photos || []).filter(x=>x.id!==p.id)}))} style={{
                  position:"absolute", top:2, right:2, width:18, height:18, borderRadius:999,
                  background:"rgba(0,0,0,0.6)", color:CC.paper, border:"none", cursor:"pointer",
                  display:"grid", placeItems:"center",
                }}><X size={10}/></button>
              </div>
            ))}
            {(state.photos || []).length < 5 && (
              <button onClick={()=>setState(p=>({...p, photos:[...(p.photos || []), { id:Date.now(), placeholder:true }]}))} style={{
                aspectRatio:"1", borderRadius:10, background:CC.paper,
                border:`1.5px dashed ${CC.stoneLight}`,
                display:"grid", placeItems:"center", cursor:"pointer", color:CC.stone,
              }}><Plus size={18}/></button>
            )}
          </div>
          <div style={{ fontSize:11, color:CC.stone, marginTop:4, textAlign:"right" }}>{(state.photos || []).length}/5 fotografias</div>
        </div>

        <div style={{ marginTop:20 }}>
          <div className="serif" style={{ fontSize:17, fontWeight:600 }}>Notas adicionais</div>
          <div style={{ fontSize:12.5, color:CC.stone, marginTop:4, lineHeight:1.4 }}>
            Opcional. Instruções de acesso, marca e modelo do aparelho, ou áreas específicas.
          </div>
          <textarea value={state.notes || ""} onChange={e=>setState(p=>({...p, notes:e.target.value}))} maxLength={200}
            placeholder="Ex: porteiro no R/C, código 1234. Cozinha no 2.º piso."
            style={{
              marginTop:12, width:"100%", minHeight:90,
              background:CC.paper, border:`1px solid ${CC.line}`,
              borderRadius:12, padding:14, fontSize:13.5,
              fontFamily:"inherit", color:CC.ink, resize:"vertical", outline:"none",
            }}/>
          <div style={{ fontSize:11, color:CC.stone, marginTop:4, textAlign:"right" }}>{(state.notes || "").length}/200</div>
        </div>

        <div style={{ marginTop:20 }}>
          <div className="serif" style={{ fontSize:17, fontWeight:600 }}>Horas estimadas</div>
          <div style={{ fontSize:12.5, color:CC.stone, marginTop:4, lineHeight:1.4 }}>
            O valor final é ajustado ao tempo real (mínimo 1h, arredondado a 30 min).
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginTop:12 }}>
            {[1,2,3,4].map(h => {
              const sel = (state.horas || 1) === h
              return (
                <button key={h} onClick={()=>setState(p=>({...p, horas:h}))} style={{
                  background: sel?CC.forest:CC.paper, color: sel?CC.paper:CC.ink,
                  border:`2px solid ${sel?CC.forest:CC.line}`,
                  borderRadius:12, padding:"14px 0",
                  fontSize:15, fontWeight:600, cursor:"pointer",
                }}>{h===4 ? "+3h" : `${h}h`}</button>
              )
            })}
          </div>
        </div>
      </div>
      <CCStickyCTA>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10, padding:"0 4px" }}>
          <span style={{ fontSize:12, color:CC.stone }}>Estimativa para {state.horas || 1}h</span>
          <span className="serif" style={{ fontSize:20, fontWeight:600, color:CC.forest }}>{eur(hoursEstimate)}</span>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button disabled={!canContinue} onClick={async ()=>{
            const uid = authUser?.user?.id
            if(!uid){ alert('Tem de iniciar sessão para guardar na lista.'); return }
            const lista = await sbGetOrCreateListaAberta(uid, authUser?.token)
            if(!lista){ alert('Erro ao criar lista.'); return }
            const r = await sbSave('lista_items', {
              lista_id: lista.id,
              tipo: 'personalizado',
              descricao: state.description || null,
              categoria_id: category.id,
              preco_estimado: hoursEstimate,
              horas_estimadas: state.horas || 1,
              fotos: state.photos || [],
              notas: state.notes || null,
            }, authUser?.token)
            if(!r){ alert('Erro ao adicionar à lista.'); return }
            alert('✓ Serviço personalizado adicionado à sua lista.')
          }} style={{
            flexShrink:0, padding:"14px 16px", borderRadius:12,
            background:canContinue?CC.paper:CC.stoneLight,
            border:`1px solid ${CC.line}`,
            color:canContinue?CC.ink:CC.stone,
            fontSize:13, fontWeight:700,
            cursor:canContinue?"pointer":"default",
            opacity:canContinue?1:0.6,
          }}>+ Lista</button>
          <div style={{ flex:1 }}>
            <CCPrimaryBtn onClick={onContinue} disabled={!canContinue}>
              {canContinue ? "Continuar" : "Descreva o trabalho (mín. 30 carac.)"}
            </CCPrimaryBtn>
          </div>
        </div>
      </CCStickyCTA>
    </CCShell>
  )
}

/* ── FinalizarPedidoV2 — checkout unificado (personalizado + fixo) com categoria ── */
function FinalizarPedidoV2({ selected, category, isPersonalizado, authUser, onManageMoradas, onBack, onConfirm, state, setState }){
  const [modal, setModal] = useState(null)
  const [lightbox, setLightbox] = useState(null) // index da foto ou null
  const [moradas, setMoradas] = useState(null)

  // Fetch das moradas do cliente (Fase 2f.4) + auto-seleccionar default
  useEffect(() => {
    const uid = authUser?.user?.id
    if(!uid || !SB_KEY) return
    let active = true
    sbGet('cliente_moradas', `?cliente_id=eq.${uid}&order=is_default.desc,created_at.asc`, authUser?.token).then(rows => {
      if(!active) return
      const list = rows || []
      setMoradas(list)
      // Pre-seleccionar default se o utilizador ainda não escolheu
      if(list.length > 0 && !state.billing?.morada){
        const def = list.find(m => m.is_default) || list[0]
        setState(p => ({
          ...p,
          billing: {
            ...(p.billing || {}),
            morada_id:  def.id,
            morada:     def.morada,
            cp:         def.cp || '',
            localidade: def.cidade || '',
          },
        }))
      }
    })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.user?.id])

  // Se o cliente configurou opções no detalhe (produtos/frequência), usa o preço efectivo
  const serviceOptions = state.serviceOptions
  const selectedPrice          = selected ? Number(selected.preco ?? selected.price ?? 0) : 0
  const selectedPriceOriginal  = selected?.preco_original != null
    ? Number(selected.preco_original)
    : (selected?.priceOriginal != null ? Number(selected.priceOriginal) : null)
  const selectedNome           = selected?.nome || selected?.name || ''

  const servicePrice = isPersonalizado
    ? (state.horas || 1) * category.personalizadoRate
    : (serviceOptions?.effectivePrice ?? selectedPrice)
  const servicePriceOriginal = isPersonalizado
    ? (state.horas || 1) * category.personalizadoRateOriginal
    : (serviceOptions?.effectivePrice ? null : selectedPriceOriginal)
  const priceSuffix = serviceOptions?.priceSuffix || ""

  let scheduleSurcharge = 0
  let scheduleSurchargeLabel = null
  if(state.scheduleMode === "imediato"){
    scheduleSurcharge = IMEDIATO_FEE
    scheduleSurchargeLabel = "Serviço imediato"
  } else if(state.scheduleMode === "agendar" &&
            (state.selectedSlots || []).length > 0 &&
            (state.selectedSlots || []).every(s => s.day === "hoje")){
    scheduleSurcharge = HOJE_FEE
    scheduleSurchargeLabel = "Agendado para hoje"
  }

  const total = servicePrice + TRAVEL_FEE + PROTECTION_FEE_NOW + scheduleSurcharge
  const scheduleOk = state.scheduleMode === "imediato" ||
    (state.scheduleMode === "agendar" && (state.selectedSlots || []).length > 0)
  const hasMorada = !!state.billing?.morada
  const canBook = state.paymentMethod !== null && scheduleOk && hasMorada
  const slots = state.selectedSlots || []
  const hasBilling = state.billing?.nif

  return (
    <CCShell>
      <CCTopBar onBack={onBack} title="Finalizar pedido"/>

      <div style={{ padding:"0 0 200px" }}>
        {/* Mapa (decorativo — geolocalização fica para tarefa futura) */}
        <div style={{
          height:160, background:CC.emeraldPale,
          position:"relative", overflow:"hidden",
          borderBottom:`1px solid ${CC.line}`,
        }}>
          <div style={{
            position:"absolute", inset:0,
            background:`repeating-linear-gradient(45deg,${CC.emeraldSoft} 0,${CC.emeraldSoft} 1px,transparent 1px,transparent 12px)`,
            opacity:0.6,
          }}/>
          <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%, -60%)" }}>
            <div style={{
              width:32, height:32, borderRadius:999,
              background:CC.forest, color:CC.paper,
              display:"grid", placeItems:"center",
              boxShadow:`0 8px 20px -4px ${CC.forestDeep}`,
            }}><MapPin size={16} fill={CC.paper}/></div>
          </div>
          <button onClick={()=>setModal("morada")} style={{
            position:"absolute", bottom:14, left:"50%", transform:"translateX(-50%)",
            background:CC.paper, color:CC.ink,
            border:`1px solid ${CC.line}`, borderRadius:999,
            padding:"6px 14px", fontSize:12, fontWeight:600,
            cursor:"pointer", boxShadow:"0 4px 12px -4px rgba(0,0,0,0.1)",
          }}>{state.billing?.morada ? "Editar localização" : "Adicionar localização"}</button>
        </div>

        <div style={{ padding:"16px 18px 0" }}>
          <button onClick={()=>setModal("morada")} style={{
            display:"flex", alignItems:"center", gap:12, width:"100%",
            padding:"12px 0", borderBottom:`1px solid ${CC.line}`,
            background:"transparent", border:"none", cursor:"pointer", textAlign:"left",
          }}>
            <div style={{
              width:36, height:36, borderRadius:10,
              background:state.billing?.morada ? CC.emeraldPale : CC.stoneLight,
              color:state.billing?.morada ? CC.emerald : CC.stone,
              display:"grid", placeItems:"center", flexShrink:0,
            }}><MapPin size={18}/></div>
            <div style={{ flex:1, minWidth:0 }}>
              {state.billing?.morada ? (
                <>
                  <div style={{ fontSize:14, fontWeight:600, color:CC.ink }}>{state.billing.morada}</div>
                  <div style={{ fontSize:12, color:CC.stone }}>{[state.billing.cp, state.billing.localidade].filter(Boolean).join(' ') || '—'}</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize:14, fontWeight:600, color:CC.ink }}>Adicionar morada de serviço</div>
                  <div style={{ fontSize:12, color:CC.stone }}>Necessária para agendar — toque para preencher</div>
                </>
              )}
            </div>
            <ChevronRight size={18} color={CC.stone}/>
          </button>

          <div style={{ marginTop:16, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <button onClick={()=>{ setState(p=>({...p, scheduleMode:"agendar"})); setModal("schedule") }}
              style={{
                background: state.scheduleMode==="agendar"?CC.emeraldPale:CC.paper,
                border:`2px solid ${state.scheduleMode==="agendar"?CC.emerald:CC.line}`,
                borderRadius:14, padding:14, textAlign:"left", cursor:"pointer",
              }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <Calendar size={16} color={state.scheduleMode==="agendar"?CC.emerald:CC.stone}/>
                <span style={{ fontSize:14, fontWeight:600 }}>Agendar</span>
              </div>
              <div style={{ fontSize:11.5, color:CC.stone, marginTop:4, lineHeight:1.3 }}>
                {state.scheduleMode==="agendar" && slots.length>0
                  ? (slots.length===1 ? `${slots[0].dayLabel}, ${slots[0].time}` : `${slots.length} horários flexíveis`)
                  : "Selecione dia e hora"}
              </div>
            </button>
            <button onClick={()=>setState(p=>({...p, scheduleMode:"imediato", selectedSlots:[]}))}
              style={{
                background: state.scheduleMode==="imediato"?CC.emeraldPale:CC.paper,
                border:`2px solid ${state.scheduleMode==="imediato"?CC.emerald:CC.line}`,
                borderRadius:14, padding:14, textAlign:"left", cursor:"pointer",
              }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <Zap size={16} color={state.scheduleMode==="imediato"?CC.emerald:CC.stone}/>
                <span style={{ fontSize:14, fontWeight:600 }}>Imediato</span>
                <span style={{
                  marginLeft:"auto", fontSize:10, color:"#92400E", fontWeight:700,
                  background:CC.amberSoft, padding:"1px 5px", borderRadius:4,
                }}>+{eur(IMEDIATO_FEE)}</span>
              </div>
              <div style={{ fontSize:11.5, color:CC.stone, marginTop:4, lineHeight:1.3 }}>30-40 minutos</div>
            </button>
          </div>
        </div>

        <CCDivisor/>

        <div style={{ padding:"0 18px" }}>
          <div className="serif" style={{ fontSize:18, fontWeight:600 }}>O seu serviço</div>

          <div style={{
            marginTop:12, background:CC.paper,
            border:`1px solid ${CC.line}`, borderRadius:14,
            overflow:"hidden",
          }}>
            {/* A. Header — icon + nome + subtítulo + botão delete */}
            <div style={{ display:"flex", gap:12, alignItems:"flex-start", padding:14 }}>
              <div style={{
                width:48, height:48, flexShrink:0, borderRadius:10,
                background:`${category.color}15`, color:category.color,
                display:"grid", placeItems:"center", fontSize:22,
              }}>{category.emoji}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:600 }}>
                  {isPersonalizado ? `${category.nome} · Personalizado` : selectedNome}
                </div>
                <div style={{ fontSize:11.5, color:CC.stone, marginTop:2 }}>
                  {isPersonalizado
                    ? `${state.horas || 1}h × ${eur(category.personalizadoRate)}/h`
                    : category.nome}
                </div>
              </div>
              <button style={{
                background:CC.paper, border:`1px solid ${CC.line}`,
                borderRadius:999, width:32, height:32,
                display:"grid", placeItems:"center", cursor:"pointer", color:CC.stone,
                flexShrink:0,
              }}><Trash2 size={14}/></button>
            </div>

            {/* B. Conteúdo do pedido (só personalizado; omitido para serviços fixos) */}
            {isPersonalizado && (state.description || (state.photos || []).length > 0 || state.notes?.trim()) && (
              <>
                <div style={{ height:1, background:CC.line }}/>
                <div style={{ padding:"14px", display:"flex", flexDirection:"column", gap:14 }}>
                  {state.description && (
                    <div>
                      <div style={{
                        fontSize:10, fontWeight:700, color:CC.stone,
                        textTransform:"uppercase", letterSpacing:0.5, marginBottom:6,
                      }}>Descrição</div>
                      <div style={{ fontSize:13, color:CC.ink, lineHeight:1.5, whiteSpace:"pre-wrap" }}>
                        {state.description}
                      </div>
                    </div>
                  )}
                  {(state.photos || []).length > 0 && (() => {
                    const photos = state.photos || []
                    const showAll = photos.length <= 5
                    const visibleCount = showAll ? photos.length : 4
                    const hiddenCount = photos.length - visibleCount
                    return (
                      <div>
                        <div style={{
                          fontSize:10, fontWeight:700, color:CC.stone,
                          textTransform:"uppercase", letterSpacing:0.5, marginBottom:6,
                        }}>Fotografias ({photos.length})</div>
                        <div style={{ display:"flex", gap:4 }}>
                          {photos.slice(0, visibleCount).map((p, i) => (
                            <button key={p.id}
                              onClick={()=>setLightbox(i)}
                              style={{
                                width:40, height:40, borderRadius:6, flexShrink:0,
                                background:CC.emeraldPale,
                                border:`1px solid ${CC.emeraldSoft}`,
                                display:"grid", placeItems:"center", cursor:"pointer", padding:0,
                              }}><FileImage size={14} color={CC.emerald}/></button>
                          ))}
                          {hiddenCount > 0 && (
                            <button onClick={()=>setLightbox(visibleCount)} style={{
                              width:40, height:40, borderRadius:6, flexShrink:0,
                              background:CC.stoneLight, color:CC.stone,
                              display:"grid", placeItems:"center",
                              fontSize:11, fontWeight:700, cursor:"pointer", padding:0,
                              border:"none",
                            }}>+{hiddenCount}</button>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                  {state.notes?.trim() && (
                    <div>
                      <div style={{
                        fontSize:10, fontWeight:700, color:CC.stone,
                        textTransform:"uppercase", letterSpacing:0.5, marginBottom:6,
                      }}>Notas</div>
                      <div style={{ fontSize:13, color:CC.ink, lineHeight:1.5, whiteSpace:"pre-wrap" }}>
                        {state.notes}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* C. Localização (placeholder do Fase 2d — morada do billing por agora) */}
            <div style={{ height:1, background:CC.line }}/>
            <div style={{ padding:"12px 14px", display:"flex", gap:10, alignItems:"flex-start" }}>
              <div style={{
                width:32, height:32, flexShrink:0, borderRadius:8,
                background:CC.emeraldPale, color:CC.emerald,
                display:"grid", placeItems:"center",
              }}><MapPin size={16}/></div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{
                  fontSize:10, fontWeight:700, color:CC.stone,
                  textTransform:"uppercase", letterSpacing:0.5, marginBottom:3,
                }}>Localização</div>
                {state.billing?.morada ? (
                  <>
                    <div style={{ fontSize:13, color:CC.ink, fontWeight:500 }}>{state.billing.morada}</div>
                    <div style={{ fontSize:12, color:CC.stone, marginTop:1 }}>
                      {[state.billing.cp, state.billing.localidade].filter(Boolean).join(' ') || '—'}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize:13, color:CC.stone, fontStyle:"italic" }}>
                    Morada por adicionar
                  </div>
                )}
              </div>
            </div>

            {/* D. Preço do serviço (header-level; os extras ficam na secção "Detalhes do pagamento") */}
            <div style={{ height:1, background:CC.line }}/>
            <div style={{
              padding:"12px 14px",
              display:"flex", justifyContent:"space-between", alignItems:"baseline",
            }}>
              <span style={{ fontSize:12, color:CC.stone, fontWeight:500 }}>Preço do serviço</span>
              <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                {servicePriceOriginal && servicePriceOriginal>servicePrice && (
                  <span style={{ fontSize:12, color:CC.stone, textDecoration:"line-through" }}>{eur(servicePriceOriginal)}</span>
                )}
                <span className="serif" style={{ fontSize:18, fontWeight:600, color:CC.forest }}>{eur(servicePrice)}</span>
                {priceSuffix && <span style={{ fontSize:11.5, color:CC.stone }}>{priceSuffix}</span>}
              </div>
            </div>
          </div>
        </div>

        <CCDivisor/>

        <div style={{ padding:"0 18px" }}>
          <div className="serif" style={{ fontSize:18, fontWeight:600 }}>Detalhes do pagamento</div>
          <div style={{
            marginTop:12, padding:16, background:CC.paper,
            border:`1px solid ${CC.line}`, borderRadius:14,
          }}>
            <CCLineRow label="Subtotal" value={servicePrice} valueOriginal={servicePriceOriginal}/>
            <CCLineRow label="Taxa de deslocação" value={TRAVEL_FEE}/>
            <CCLineRow label="Taxa de proteção" value={PROTECTION_FEE_NOW} valueOriginal={PROTECTION_FEE} strike/>
            {scheduleSurcharge>0 && <CCLineRow label={scheduleSurchargeLabel} value={scheduleSurcharge}/>}
            <div style={{
              marginTop:10, paddingTop:12, borderTop:`1px solid ${CC.line}`,
              display:"flex", justifyContent:"space-between", alignItems:"baseline",
            }}>
              <span style={{ fontSize:15, fontWeight:700 }}>Total a pagar</span>
              <span className="serif" style={{ fontSize:22, fontWeight:600, color:CC.forest }}>{eur(total)}</span>
            </div>
          </div>
        </div>

        <div style={{ padding:"20px 18px 0" }}><CCJaFaltaPouco/></div>

        <div style={{ padding:"24px 18px 0" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div className="serif" style={{ fontSize:18, fontWeight:600 }}>Concluir pedido</div>
            <CCChip tone="amber">Obrigatório</CCChip>
          </div>
          <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <button onClick={()=>setState(p=>({...p, paymentMethod:"dinheiro"}))} style={{
              background:CC.paper,
              border:`2px solid ${state.paymentMethod==="dinheiro"?CC.emerald:CC.line}`,
              borderRadius:12, padding:"14px 16px",
              display:"flex", alignItems:"center", gap:8, cursor:"pointer",
            }}>
              <Banknote size={18} color={state.paymentMethod==="dinheiro"?CC.emerald:CC.stone}/>
              <span style={{ fontSize:14, fontWeight:600 }}>Dinheiro</span>
            </button>
            <button onClick={()=>setState(p=>({...p, paymentMethod:"cartao"}))} style={{
              background:CC.paper,
              border:`2px solid ${state.paymentMethod==="cartao"?CC.emerald:CC.line}`,
              borderRadius:12, padding:"14px 16px",
              display:"flex", alignItems:"center", gap:8, cursor:"pointer",
            }}>
              <CreditCard size={18} color={state.paymentMethod==="cartao"?CC.emerald:CC.stone}/>
              <span style={{ fontSize:14, fontWeight:600 }}>Cartão</span>
            </button>
          </div>

          <button style={{
            marginTop:12, width:"100%",
            background:CC.emeraldPale, border:`1px solid ${CC.emeraldSoft}`,
            borderRadius:12, padding:"12px 14px",
            display:"flex", alignItems:"center", gap:10, cursor:"pointer", textAlign:"left",
          }}>
            <Tag size={16} color={CC.emerald}/>
            <span style={{ fontSize:13, color:CC.emeraldDark, fontWeight:600, flex:1 }}>Promo {PROMO_CODE} aplicado</span>
            <span style={{
              fontSize:11, color:CC.emeraldDark, fontWeight:700,
              background:CC.paper, padding:"3px 8px", borderRadius:999,
            }}>−{eur(PROMO_SAVINGS)}</span>
          </button>

          <button onClick={()=>setModal("billing")} style={{
            marginTop:8, width:"100%",
            background: hasBilling?CC.emeraldPale:CC.paper,
            border:`1px solid ${hasBilling?CC.emeraldSoft:CC.line}`,
            borderRadius:12, padding:"12px 14px",
            display:"flex", alignItems:"center", gap:10, cursor:"pointer", textAlign:"left",
          }}>
            <Receipt size={16} color={hasBilling?CC.emerald:CC.stone}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, color:CC.ink, fontWeight:600 }}>
                {hasBilling ? "Dados de faturação" : "Adicionar dados de faturação"}
              </div>
              {hasBilling && (
                <div style={{ fontSize:11.5, color:CC.stone, marginTop:2 }}>{state.billing.nome} · NIF {state.billing.nif}</div>
              )}
            </div>
            <ChevronRight size={16} color={CC.stone}/>
          </button>
        </div>

        <CCDivisor/>

        <div style={{ padding:"0 18px" }}>
          <div className="serif" style={{ fontSize:18, fontWeight:600 }}>O que inclui sempre</div>
          <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:18 }}>
            <CCValueRow icon={Lock}          title="Técnico fixo, escolhido por si"         desc="Sempre o mesmo profissional da nossa rede de confiança — nunca anónimo."/>
            <CCValueRow icon={Shield}        title="90 dias de garantia"                    desc="Se o mesmo problema voltar, regressamos sem custos adicionais."/>
            <CCValueRow icon={RefreshCw}     title="Cancelamento livre"                     desc="Cancele ou reagende gratuitamente até 15 min ou antes de ser atribuído."/>
            <CCValueRow icon={Wrench}        title="Materiais aprovados por si"             desc="Qualquer custo extra precisa da sua confirmação antes de ser cobrado."/>
            <CCValueRow icon={MessageSquare} title="Chat directo e relatório fotográfico"   desc="Fala com o técnico a qualquer momento e recebe relatório no fim."/>
          </div>
        </div>
      </div>

      <CCStickyCTA banner={`Reserve agora e poupe ${eur(PROMO_SAVINGS)} em descontos`}>
        <CCPrimaryBtn onClick={()=>onConfirm({ total, scheduleSurcharge, servicePrice })} disabled={!canBook}>
          {!hasMorada
            ? "Adicione morada de serviço"
            : !state.paymentMethod
              ? "Escolha método de pagamento"
              : !scheduleOk
                ? "Escolha Agendar ou Imediato"
                : "Agendar serviço"}
        </CCPrimaryBtn>
      </CCStickyCTA>

      {modal==="schedule" && (
        <CCScheduleModal slots={state.selectedSlots} onClose={()=>setModal(null)}
          onConfirm={(slots)=>{ setState(p=>({...p, selectedSlots:slots, scheduleMode:"agendar"})); setModal(null) }}/>
      )}
      {modal==="billing" && (
        <CCBillingModal billing={state.billing} onClose={()=>setModal(null)}
          onConfirm={(billing)=>{ setState(p=>({...p, billing})); setModal(null) }}/>
      )}
      {modal==="morada" && (
        <MoradaPickerModal
          moradas={moradas}
          selectedMoradaId={state.billing?.morada_id}
          onClose={()=>setModal(null)}
          onSelect={(m)=>{
            setState(p => ({
              ...p,
              billing: {
                ...(p.billing || {}),
                morada_id:  m.id,
                morada:     m.morada,
                cp:         m.cp || '',
                localidade: m.cidade || '',
              },
            }))
            setModal(null)
          }}
          onManage={onManageMoradas}
        />
      )}
      {lightbox !== null && (state.photos || [])[lightbox] && (
        <div onClick={()=>setLightbox(null)} style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.92)",
          zIndex:100, display:"grid", placeItems:"center", padding:20,
          cursor:"pointer",
        }}>
          <button onClick={(e)=>{ e.stopPropagation(); setLightbox(null) }} style={{
            position:"absolute", top:16, right:16,
            width:40, height:40, borderRadius:999,
            background:"rgba(255,255,255,0.15)", color:CC.paper,
            border:"none", cursor:"pointer",
            display:"grid", placeItems:"center",
          }}><X size={20}/></button>
          <div style={{
            width:"min(90vw, 380px)", aspectRatio:"3/4",
            background:CC.emeraldPale, border:`1px solid ${CC.emeraldSoft}`,
            borderRadius:16, display:"grid", placeItems:"center",
          }}><FileImage size={80} color={CC.emerald}/></div>
          {(state.photos || []).length > 1 && (
            <div style={{
              position:"absolute", bottom:32, left:"50%", transform:"translateX(-50%)",
              color:CC.paper, fontSize:13, fontWeight:600,
              background:"rgba(0,0,0,0.5)", padding:"6px 14px", borderRadius:999,
            }}>{lightbox + 1} / {(state.photos || []).length}</div>
          )}
        </div>
      )}
    </CCShell>
  )
}

/* ── ConfirmadoScreenV2 — ecrã final de sucesso com detalhe da ordem ── */
function ConfirmadoScreenV2({ ordem, servicoNome, categoriaNome, onRestart }){
  // Formato do agendamento: "Imediato · 30-40 min" | "Sáb, 25 abr · 14:00" | "3 horários flexíveis"
  const agendamento = (() => {
    if(!ordem) return null
    if(ordem.schedule_mode === 'imediato') return 'Imediato · 30-40 min'
    const slots = Array.isArray(ordem.slots_flexiveis) ? ordem.slots_flexiveis : []
    if(slots.length === 0) return ordem.data_agendada ? `${ordem.data_agendada} · ${ordem.hora_agendada || ''}`.trim() : null
    if(slots.length === 1) return `${slots[0].dayLabel || ''} ${slots[0].dayDate || ''} · ${slots[0].time || ''}`.trim()
    return `${slots.length} horários flexíveis`
  })()
  const valor = ordem?.valor_cobrado != null ? Number(ordem.valor_cobrado) : null
  const moradaLinha = ordem?.morada ? `${ordem.morada}${ordem.cidade ? `, ${ordem.cidade}` : ''}` : null

  return (
    <CCShell>
      <div style={{
        minHeight:"100vh", display:"flex", flexDirection:"column",
        alignItems:"center", padding:"48px 24px 32px", textAlign:"center",
      }}>
        {/* Ícone de sucesso */}
        <div style={{
          width:80, height:80, borderRadius:999,
          background:CC.emeraldSoft, color:CC.emerald,
          display:"grid", placeItems:"center",
          boxShadow:`0 12px 40px -12px ${CC.emerald}`,
          animation:"checkIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}><Check size={36} strokeWidth={3}/></div>

        <div className="serif" style={{ fontSize:28, fontWeight:500, marginTop:24, letterSpacing:-0.4 }}>
          Pedido confirmado
        </div>

        {/* Numero sequencial em destaque (fallback se não houver row da BD) */}
        {ordem?.numero_sequencial && (
          <div className="serif" style={{
            fontSize:32, fontWeight:600, color:CC.forest, marginTop:6,
            letterSpacing:-0.3, fontVariantNumeric:"tabular-nums",
          }}>
            {ordem.numero_sequencial}
          </div>
        )}

        <div style={{ fontSize:14, color:CC.stone, marginTop:14, maxWidth:300, lineHeight:1.5 }}>
          Estamos a atribuir o seu técnico de confiança. Receberá notificação em instantes.
        </div>

        {/* Card de resumo */}
        {ordem && (
          <div style={{
            marginTop:28, width:"100%", maxWidth:340,
            background:CC.paper, border:`1px solid ${CC.line}`, borderRadius:14,
            padding:"16px 18px", textAlign:"left",
          }}>
            {servicoNome && (
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:10, fontWeight:700, color:CC.stone, letterSpacing:0.5, textTransform:"uppercase" }}>Serviço</div>
                <div style={{ fontSize:14, fontWeight:600, color:CC.ink, marginTop:3 }}>{servicoNome}</div>
                {categoriaNome && (
                  <div style={{ fontSize:11.5, color:CC.stone, marginTop:2 }}>{categoriaNome}</div>
                )}
              </div>
            )}
            {valor != null && (
              <div style={{
                display:"flex", justifyContent:"space-between", alignItems:"baseline",
                padding:"10px 0", borderTop:`1px solid ${CC.line}`,
              }}>
                <span style={{ fontSize:12, color:CC.stone }}>Valor total</span>
                <span className="serif" style={{ fontSize:18, fontWeight:600, color:CC.forest }}>{eur(valor)}</span>
              </div>
            )}
            {agendamento && (
              <div style={{
                display:"flex", justifyContent:"space-between", alignItems:"baseline",
                padding:"10px 0", borderTop:`1px solid ${CC.line}`, gap:10,
              }}>
                <span style={{ fontSize:12, color:CC.stone, flexShrink:0 }}>Agendamento</span>
                <span style={{ fontSize:12.5, fontWeight:600, color:CC.ink, textAlign:"right" }}>{agendamento}</span>
              </div>
            )}
            {moradaLinha && (
              <div style={{
                display:"flex", justifyContent:"space-between", alignItems:"baseline",
                padding:"10px 0", borderTop:`1px solid ${CC.line}`, gap:10,
              }}>
                <span style={{ fontSize:12, color:CC.stone, flexShrink:0 }}>Morada</span>
                <span style={{ fontSize:12.5, fontWeight:600, color:CC.ink, textAlign:"right" }}>{moradaLinha}</span>
              </div>
            )}
            {ordem.metodo_pagamento && (
              <div style={{
                display:"flex", justifyContent:"space-between", alignItems:"baseline",
                padding:"10px 0", borderTop:`1px solid ${CC.line}`,
              }}>
                <span style={{ fontSize:12, color:CC.stone }}>Pagamento</span>
                <span style={{ fontSize:12.5, fontWeight:600, color:CC.ink }}>
                  {ordem.metodo_pagamento === 'dinheiro' ? 'Dinheiro' : 'Cartão'}
                </span>
              </div>
            )}
          </div>
        )}

        <button onClick={onRestart} style={{
          marginTop:32, background:"transparent",
          color:CC.emerald, border:`1px solid ${CC.emerald}`,
          borderRadius:12, padding:"10px 20px",
          fontSize:13, fontWeight:600, cursor:"pointer",
        }}>← Voltar ao início</button>
      </div>
    </CCShell>
  )
}

/* ════════════════════════════════════════════════════════════════════
   ══ V1_LEGACY — 6 ecrãs do fluxo original da canalização (iter 1) ══
   ════════════════════════════════════════════════════════════════════
   Substituídos pelos V2 data-driven na Fase 2c-A (commit dbde537).
   Mantidos comentados como safety-net para rollback rápido em produção.
   Remover na Fase 3 depois do V2 estar estável nas 8 categorias.
   Para restaurar: apagar este header e o marcador de fecho antes do bloco ROOT.

function ServiceListScreen({ onBack, onSelectService, onSelectPersonalizado }){
  const [activeSub, setActiveSub] = useState("todos")
  const [search, setSearch] = useState("")
  const sectionRefs = useRef({})

  const filtered = search
    ? SUBCATEGORIES.map(sub => ({
        ...sub, services: sub.services.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
      })).filter(sub => sub.services.length>0)
    : activeSub==="todos" ? SUBCATEGORIES : SUBCATEGORIES.filter(s => s.id===activeSub)

  const scrollToSub = (id) => {
    setActiveSub(id)
    setTimeout(()=>sectionRefs.current[id]?.scrollIntoView({ behavior:"smooth", block:"start" }), 50)
  }
  const totalServicos = SUBCATEGORIES.reduce((n,s)=>n+s.services.length, 0)

  return (
    <CCShell>
      <CCTopBar onBack={onBack} title="Canalização" subtitle={`${totalServicos} serviços · Caldas da Rainha`}/>

      <div style={{ padding:"14px 18px 0" }}>
        <div style={{
          display:"flex", alignItems:"center", gap:10,
          background:CC.paper, border:`1px solid ${CC.line}`,
          borderRadius:12, padding:"10px 14px",
        }}>
          <Search size={16} color={CC.stone}/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Procurar serviço..."
            style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:14, fontFamily:"inherit", color:CC.ink }}/>
          {search && (
            <button onClick={()=>setSearch("")} style={{
              background:"transparent", border:"none", cursor:"pointer", color:CC.stone,
              display:"grid", placeItems:"center",
            }}><X size={14}/></button>
          )}
        </div>
      </div>

      {!search && (
        <div className="cc-no-scrollbar" style={{
          display:"flex", gap:6, overflowX:"auto",
          padding:"14px 18px 6px", scrollSnapType:"x proximity",
        }}>
          <CCSubPill active={activeSub==="todos"} onClick={()=>scrollToSub("todos")}>Todos</CCSubPill>
          {SUBCATEGORIES.map(sub => (
            <CCSubPill key={sub.id} active={activeSub===sub.id} onClick={()=>scrollToSub(sub.id)}>{sub.icon} {sub.name}</CCSubPill>
          ))}
        </div>
      )}

      <div style={{ padding:"4px 18px 140px" }}>
        {!search && (
          <button onClick={onSelectPersonalizado} style={{
            width:"100%", textAlign:"left", cursor:"pointer",
            background:`linear-gradient(135deg,${CC.forest} 0%,${CC.forestSoft} 100%)`,
            color:CC.paper, border:"none",
            borderRadius:20, padding:20, marginTop:12,
            position:"relative", overflow:"hidden",
            boxShadow:`0 16px 40px -18px ${CC.forestDeep}`,
          }}>
            <div style={{ position:"absolute", right:-24, top:-24, fontSize:140, opacity:0.08, pointerEvents:"none" }}>✨</div>
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:10, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", opacity:0.8, color:CC.emeraldBright }}>
              <Sparkles size={11}/> À medida
            </div>
            <div className="serif" style={{ fontSize:22, fontWeight:500, marginTop:8, lineHeight:1.2 }}>Serviço personalizado</div>
            <div style={{ fontSize:13, opacity:0.85, marginTop:6, maxWidth:320, lineHeight:1.4 }}>
              Algo fora do comum? Descreva o trabalho e enviamos o técnico certo.
            </div>
            <div style={{
              marginTop:14, paddingTop:14, borderTop:"1px solid rgba(255,255,255,0.15)",
              display:"flex", justifyContent:"space-between", alignItems:"flex-end",
            }}>
              <div>
                <div style={{ fontSize:11, opacity:0.7 }}>Por hora</div>
                <div style={{ display:"flex", alignItems:"baseline", gap:6, marginTop:2 }}>
                  <span style={{ fontSize:12, opacity:0.6, textDecoration:"line-through" }}>{eur(PERSONALIZADO.pricePerHourOriginal)}</span>
                  <span className="serif" style={{ fontSize:22, fontWeight:600, color:CC.emeraldBright }}>{eur(PERSONALIZADO.pricePerHour)}</span>
                </div>
              </div>
              <div style={{
                background:CC.emerald, color:CC.paper, padding:"8px 14px",
                borderRadius:999, fontSize:12, fontWeight:600,
                display:"flex", alignItems:"center", gap:4,
              }}>Personalizar <ChevronRight size={14}/></div>
            </div>
          </button>
        )}

        {filtered.map(sub => (
          <div key={sub.id} ref={el => (sectionRefs.current[sub.id] = el)} style={{ marginTop:28, scrollMarginTop:140 }}>
            <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:10 }}>
              <div className="serif" style={{ fontSize:17, fontWeight:600, letterSpacing:-0.15 }}>{sub.icon} {sub.name}</div>
              <div style={{ fontSize:11, color:CC.stone, fontWeight:500 }}>{sub.services.length}</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {sub.services.map(s => (
                <CCServiceCard key={s.id} service={s} onClick={()=>onSelectService(s)}/>
              ))}
            </div>
          </div>
        ))}

        {filtered.length===0 && (
          <div style={{ textAlign:"center", padding:40, color:CC.stone, fontSize:14 }}>Nenhum serviço encontrado para "{search}".</div>
        )}
      </div>
    </CCShell>
  )
}

function PersonalizadoLanding({ onBack, onContinue }){
  return (
    <CCShell>
      <CCTopBar onBack={onBack} title=""/>
      <div style={{ padding:"8px 18px 140px" }}>
        <div style={{
          background:CC.emeraldPale, borderRadius:24,
          padding:"36px 20px 28px", textAlign:"center",
          position:"relative", overflow:"hidden",
        }}>
          <div style={{ fontSize:76, lineHeight:1, position:"relative" }}>✨</div>
          <div style={{
            display:"inline-flex", gap:5, alignItems:"center",
            background:CC.paper, color:CC.emerald,
            padding:"5px 12px", borderRadius:999,
            fontSize:10, fontWeight:700, letterSpacing:1.3, textTransform:"uppercase",
            marginTop:16, position:"relative", border:`1px solid ${CC.emeraldSoft}`,
          }}><Sparkles size={11}/> Serviço personalizado</div>
          <div className="serif" style={{
            fontSize:26, fontWeight:500, marginTop:12, lineHeight:1.15,
            letterSpacing:-0.4, color:CC.ink, position:"relative",
          }}>
            Procura um serviço <em style={{ color:CC.emerald, fontStyle:"italic" }}>à medida</em>?
          </div>
          <div style={{
            fontSize:13.5, color:CC.stone, marginTop:10, lineHeight:1.5,
            maxWidth:320, margin:"10px auto 0", position:"relative",
          }}>
            Descreva o trabalho e o seu técnico de confiança aparece para resolver — à hora, sem surpresas.
          </div>
        </div>

        <div style={{
          marginTop:16, background:CC.paper,
          border:`1.5px solid ${CC.emeraldSoft}`, borderRadius:16, padding:"16px 18px",
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <div>
            <div style={{ fontSize:11, color:CC.stone, fontWeight:600, letterSpacing:0.5, textTransform:"uppercase" }}>Preço por hora</div>
            <div style={{ display:"flex", alignItems:"baseline", gap:8, marginTop:4 }}>
              <span style={{ fontSize:13, color:CC.stone, textDecoration:"line-through" }}>{eur(PERSONALIZADO.pricePerHourOriginal)}</span>
              <span className="serif" style={{ fontSize:26, fontWeight:600, color:CC.forest }}>{eur(PERSONALIZADO.pricePerHour)}</span>
            </div>
          </div>
          <div style={{
            background:CC.emeraldSoft, color:CC.emeraldDark,
            padding:"6px 10px", borderRadius:999,
            fontSize:11, fontWeight:700, letterSpacing:0.3,
          }}>−10%</div>
        </div>

        <div style={{ marginTop:28 }}>
          <div style={{ textAlign:"center" }}>
            <div className="serif" style={{ fontSize:20, fontWeight:600, letterSpacing:-0.2 }}>Ideal para</div>
            <div style={{ width:36, height:2, background:CC.emerald, margin:"8px auto 20px", borderRadius:2 }}/>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
            <CCValueRow icon={Wrench}    title="Trabalho à medida, sem complicações"    desc="Pelo seu técnico de confiança, que já conhece a sua casa."/>
            <CCValueRow icon={Sparkles}  title="Tarefas únicas ou difíceis de explicar" desc="Ideal para quando o trabalho não está no catálogo standard."/>
            <CCValueRow icon={RefreshCw} title="Várias pequenas tarefas numa só visita" desc="Agrupa e resolve tudo numa deslocação — poupa tempo e taxa."/>
            <CCValueRow icon={Check}     title="Podemos já ter o que procura"            desc="Antes de pedir à medida, consulte os +500 serviços do catálogo."/>
          </div>
        </div>
      </div>
      <CCStickyCTA>
        <CCPrimaryBtn onClick={onContinue}>Continuar</CCPrimaryBtn>
      </CCStickyCTA>
    </CCShell>
  )
}

function PersonalizadoForm({ onBack, onContinue, state, setState }){
  const hoursEstimate = (state.horas || 1) * PERSONALIZADO.pricePerHour
  const canContinue = (state.description || "").length >= 30
  return (
    <CCShell>
      <CCTopBar onBack={onBack} title="Serviço personalizado"/>
      <div style={{ padding:"8px 18px 140px" }}>
        <div style={{
          background:CC.emeraldPale, border:`1px solid ${CC.emeraldSoft}`,
          borderRadius:12, padding:"12px 16px",
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <div style={{ fontSize:12, color:CC.stone, fontWeight:500 }}>Por hora</div>
          <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
            <span style={{ fontSize:11.5, color:CC.stone, textDecoration:"line-through" }}>{eur(PERSONALIZADO.pricePerHourOriginal)}</span>
            <span className="serif" style={{ fontSize:16, fontWeight:600, color:CC.forest }}>{eur(PERSONALIZADO.pricePerHour)}</span>
          </div>
        </div>

        <div style={{ marginTop:24 }}>
          <div className="serif" style={{ fontSize:17, fontWeight:600 }}>Em que podemos ajudar?</div>
          <div style={{ fontSize:12.5, color:CC.stone, marginTop:4, lineHeight:1.4 }}>
            Quanto mais detalhe, mais fácil será encontrar o profissional certo para si.
          </div>
          <textarea value={state.description || ""} onChange={e=>setState(p=>({...p, description:e.target.value}))}
            placeholder="Descreva o problema ou tarefa..." maxLength={500}
            style={{
              marginTop:12, width:"100%", minHeight:130,
              background:CC.paper, border:`1px solid ${CC.line}`,
              borderRadius:12, padding:14, fontSize:13.5,
              fontFamily:"inherit", color:CC.ink, resize:"vertical", outline:"none",
            }}/>
          <div style={{ fontSize:11, color:CC.stone, marginTop:4, textAlign:"right" }}>{(state.description || "").length}/500</div>
        </div>

        <div style={{ marginTop:20 }}>
          <div className="serif" style={{ fontSize:17, fontWeight:600 }}>Horas estimadas</div>
          <div style={{ fontSize:12.5, color:CC.stone, marginTop:4, lineHeight:1.4 }}>
            O valor final é ajustado ao tempo real (mínimo 1h, arredondado a 30 min).
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginTop:12 }}>
            {[1,2,3,4].map(h => {
              const sel = (state.horas || 1) === h
              return (
                <button key={h} onClick={()=>setState(p=>({...p, horas:h}))} style={{
                  background: sel?CC.forest:CC.paper, color: sel?CC.paper:CC.ink,
                  border:`2px solid ${sel?CC.forest:CC.line}`,
                  borderRadius:12, padding:"14px 0",
                  fontSize:15, fontWeight:600, cursor:"pointer",
                }}>{h===4 ? "+3h" : `${h}h`}</button>
              )
            })}
          </div>
        </div>
      </div>
      <CCStickyCTA>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10, padding:"0 4px" }}>
          <span style={{ fontSize:12, color:CC.stone }}>Estimativa para {state.horas || 1}h</span>
          <span className="serif" style={{ fontSize:20, fontWeight:600, color:CC.forest }}>{eur(hoursEstimate)}</span>
        </div>
        <CCPrimaryBtn onClick={onContinue} disabled={!canContinue}>
          {canContinue ? "Continuar" : "Descreva o trabalho (mín. 30 carac.)"}
        </CCPrimaryBtn>
      </CCStickyCTA>
    </CCShell>
  )
}

function ServiceDetailScreen({ service, onBack, onContinue }){
  return (
    <CCShell>
      <CCTopBar onBack={onBack} title={service.name}/>
      <div style={{ padding:"16px 18px 140px" }}>
        <div style={{
          background:CC.emeraldPale, borderRadius:20,
          padding:"32px 20px", textAlign:"center", overflow:"hidden",
        }}>
          <div style={{ fontSize:60 }}>🔧</div>
          <div className="serif" style={{ fontSize:22, fontWeight:500, marginTop:12 }}>{service.name}</div>
          <div style={{ display:"flex", justifyContent:"center", gap:6, marginTop:12, flexWrap:"wrap" }}>
            <CCChip icon={Shield} tone="emerald">90 dias garantia</CCChip>
            {service.eco && <CCChip icon={Leaf} tone="eco">Eco</CCChip>}
            {service.popular && <CCChip icon={Star} tone="emerald">Popular</CCChip>}
          </div>
        </div>

        <div style={{ marginTop:20, padding:"14px 0", borderTop:`1px solid ${CC.line}`, borderBottom:`1px solid ${CC.line}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:12, color:CC.stone, marginBottom:4 }}>Preço fixo do serviço</div>
              <CCPriceTag price={service.price} priceOriginal={service.priceOriginal} size="lg"/>
            </div>
            <CCChip tone="emerald" icon={Lock}>Sem surpresas</CCChip>
          </div>
        </div>

        <div style={{
          marginTop:20, padding:16, background:CC.paper,
          border:`1px solid ${CC.line}`, borderRadius:14,
          display:"flex", gap:12, alignItems:"flex-start",
        }}>
          <Info size={18} color={CC.emerald} style={{ flexShrink:0, marginTop:2 }}/>
          <div style={{ fontSize:13, color:CC.ink, lineHeight:1.5 }}>
            Este serviço tem preço fixo. O detalhe do que está incluído, não incluído, variações e FAQ está a ser enriquecido — pode avançar com a reserva mesmo assim.
          </div>
        </div>

        <div style={{ marginTop:20, display:"flex", flexDirection:"column", gap:16 }}>
          <CCValueRow icon={Lock}           title="Técnico fixo, escolhido por si"    desc="Sempre o mesmo profissional da nossa rede de confiança."/>
          <CCValueRow icon={Shield}         title="90 dias de garantia"               desc="Se o problema voltar, regressamos sem custos adicionais."/>
          <CCValueRow icon={MessageSquare}  title="Chat directo e relatório fotográfico" desc="Fala com o técnico e recebe relatório no fim."/>
        </div>
      </div>
      <CCStickyCTA>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10, padding:"0 4px" }}>
          <span style={{ fontSize:12, color:CC.stone }}>Preço</span>
          <CCPriceTag price={service.price} priceOriginal={service.priceOriginal} size="lg"/>
        </div>
        <CCPrimaryBtn onClick={onContinue}>Continuar</CCPrimaryBtn>
      </CCStickyCTA>
    </CCShell>
  )
}

function FinalizarPedido({ selected, isPersonalizado, onBack, onConfirm, state, setState }){
  const [modal, setModal] = useState(null)

  const servicePrice = isPersonalizado
    ? (state.horas || 1) * PERSONALIZADO.pricePerHour
    : selected.price
  const servicePriceOriginal = isPersonalizado
    ? (state.horas || 1) * PERSONALIZADO.pricePerHourOriginal
    : selected.priceOriginal

  let scheduleSurcharge = 0
  let scheduleSurchargeLabel = null
  if(state.scheduleMode === "imediato"){
    scheduleSurcharge = IMEDIATO_FEE
    scheduleSurchargeLabel = "Serviço imediato"
  } else if(state.scheduleMode === "agendar" &&
            (state.selectedSlots || []).length > 0 &&
            (state.selectedSlots || []).every(s => s.day === "hoje")){
    scheduleSurcharge = HOJE_FEE
    scheduleSurchargeLabel = "Agendado para hoje"
  }
  const total = servicePrice + TRAVEL_FEE + PROTECTION_FEE_NOW + scheduleSurcharge

  const scheduleOk =
    state.scheduleMode === "imediato" ||
    (state.scheduleMode === "agendar" && (state.selectedSlots || []).length > 0)
  const canBook = state.paymentMethod !== null && scheduleOk
  const slots = state.selectedSlots || []
  const hasBilling = state.billing?.nif

  return (
    <CCShell>
      <CCTopBar onBack={onBack} title="Finalizar pedido"/>

      <div style={{ padding:"0 0 200px" }}>
        <div style={{
          height:160, background:CC.emeraldPale,
          position:"relative", overflow:"hidden",
          borderBottom:`1px solid ${CC.line}`,
        }}>
          <div style={{
            position:"absolute", inset:0,
            background:`repeating-linear-gradient(45deg,${CC.emeraldSoft} 0,${CC.emeraldSoft} 1px,transparent 1px,transparent 12px)`,
            opacity:0.6,
          }}/>
          <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%, -60%)" }}>
            <div style={{
              width:32, height:32, borderRadius:999,
              background:CC.forest, color:CC.paper,
              display:"grid", placeItems:"center",
              boxShadow:`0 8px 20px -4px ${CC.forestDeep}`,
            }}><MapPin size={16} fill={CC.paper}/></div>
          </div>
          <button style={{
            position:"absolute", bottom:14, left:"50%", transform:"translateX(-50%)",
            background:CC.paper, color:CC.ink,
            border:`1px solid ${CC.line}`, borderRadius:999,
            padding:"6px 14px", fontSize:12, fontWeight:600,
            cursor:"pointer", boxShadow:"0 4px 12px -4px rgba(0,0,0,0.1)",
          }}>Editar localização</button>
        </div>

        <div style={{ padding:"16px 18px 0" }}>
          <div style={{
            display:"flex", alignItems:"center", gap:12,
            padding:"12px 0", borderBottom:`1px solid ${CC.line}`,
          }}>
            <div style={{
              width:36, height:36, borderRadius:10,
              background:CC.emeraldPale, color:CC.emerald,
              display:"grid", placeItems:"center", flexShrink:0,
            }}><MapPin size={18}/></div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600 }}>{state.morada || "Rua Palmira Bastos, 4"}</div>
              <div style={{ fontSize:12, color:CC.stone }}>{state.cidade || "Caldas da Rainha"}</div>
            </div>
            <ChevronRight size={18} color={CC.stone}/>
          </div>

          <div style={{ marginTop:16, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <button onClick={()=>{ setState(p=>({...p, scheduleMode:"agendar"})); setModal("schedule") }}
              style={{
                background: state.scheduleMode==="agendar"?CC.emeraldPale:CC.paper,
                border:`2px solid ${state.scheduleMode==="agendar"?CC.emerald:CC.line}`,
                borderRadius:14, padding:14, textAlign:"left", cursor:"pointer", position:"relative",
              }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <Calendar size={16} color={state.scheduleMode==="agendar"?CC.emerald:CC.stone}/>
                <span style={{ fontSize:14, fontWeight:600 }}>Agendar</span>
              </div>
              <div style={{ fontSize:11.5, color:CC.stone, marginTop:4, lineHeight:1.3 }}>
                {state.scheduleMode==="agendar" && slots.length>0
                  ? (slots.length===1 ? `${slots[0].dayLabel}, ${slots[0].time}` : `${slots.length} horários flexíveis`)
                  : "Selecione dia e hora"}
              </div>
            </button>

            <button onClick={()=>setState(p=>({...p, scheduleMode:"imediato", selectedSlots:[]}))}
              style={{
                background: state.scheduleMode==="imediato"?CC.emeraldPale:CC.paper,
                border:`2px solid ${state.scheduleMode==="imediato"?CC.emerald:CC.line}`,
                borderRadius:14, padding:14, textAlign:"left", cursor:"pointer", position:"relative",
              }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <Zap size={16} color={state.scheduleMode==="imediato"?CC.emerald:CC.stone}/>
                <span style={{ fontSize:14, fontWeight:600 }}>Imediato</span>
                <span style={{
                  marginLeft:"auto", fontSize:10, color:"#92400E", fontWeight:700,
                  background:CC.amberSoft, padding:"1px 5px", borderRadius:4,
                }}>+{eur(IMEDIATO_FEE)}</span>
              </div>
              <div style={{ fontSize:11.5, color:CC.stone, marginTop:4, lineHeight:1.3 }}>30-40 minutos</div>
            </button>
          </div>
        </div>

        <CCDivisor/>

        <div style={{ padding:"0 18px" }}>
          <div className="serif" style={{ fontSize:18, fontWeight:600 }}>O seu serviço</div>
          <div style={{
            marginTop:12, display:"flex", gap:12, alignItems:"flex-start",
            padding:14, background:CC.paper,
            border:`1px solid ${CC.line}`, borderRadius:14,
          }}>
            <div style={{
              width:48, height:48, flexShrink:0, borderRadius:10,
              background:CC.emeraldPale, color:CC.emerald,
              display:"grid", placeItems:"center", fontSize:22,
            }}>{isPersonalizado ? "✨" : <Wrench size={22}/>}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600 }}>
                {isPersonalizado ? "Serviço personalizado" : selected.name}
              </div>
              <div style={{ fontSize:11.5, color:CC.stone, marginTop:2 }}>
                {isPersonalizado ? `${state.horas || 1}h × ${eur(PERSONALIZADO.pricePerHour)}/h` : "Preço fixo do serviço"}
              </div>
              <div style={{ display:"flex", alignItems:"baseline", gap:6, marginTop:6 }}>
                {servicePriceOriginal && servicePriceOriginal>servicePrice && (
                  <span style={{ fontSize:11.5, color:CC.stone, textDecoration:"line-through" }}>{eur(servicePriceOriginal)}</span>
                )}
                <span className="serif" style={{ fontSize:16, fontWeight:600, color:CC.forest }}>{eur(servicePrice)}</span>
              </div>
            </div>
            <button style={{
              background:CC.paper, border:`1px solid ${CC.line}`,
              borderRadius:999, width:32, height:32,
              display:"grid", placeItems:"center", cursor:"pointer", color:CC.stone,
            }}><Trash2 size={14}/></button>
          </div>

          <button onClick={()=>setModal("photos")} style={{
            marginTop:10, width:"100%",
            background:CC.paper, border:`1px solid ${CC.line}`,
            borderRadius:14, padding:14,
            display:"flex", alignItems:"center", gap:12,
            cursor:"pointer", textAlign:"left",
          }}>
            <div style={{
              width:36, height:36, flexShrink:0, borderRadius:10,
              background: state.notes || (state.photos || []).length ? CC.emeraldPale : CC.stoneLight,
              color: state.notes || (state.photos || []).length ? CC.emerald : CC.stone,
              display:"grid", placeItems:"center",
            }}><FileImage size={18}/></div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13.5, fontWeight:600 }}>Fotografias e notas</div>
              <div style={{ fontSize:12, color:CC.stone, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {state.notes
                  ? state.notes.slice(0,48) + (state.notes.length>48 ? "..." : "")
                  : (state.photos || []).length>0
                    ? `${(state.photos || []).length} fotografia${(state.photos || []).length>1 ? "s" : ""}`
                    : "Adicionar detalhes e imagens"}
              </div>
            </div>
            <ChevronRight size={18} color={CC.stone}/>
          </button>
        </div>

        <CCDivisor/>

        <div style={{ padding:"0 18px" }}>
          <div className="serif" style={{ fontSize:18, fontWeight:600 }}>Detalhes do pagamento</div>
          <div style={{
            marginTop:12, padding:16, background:CC.paper,
            border:`1px solid ${CC.line}`, borderRadius:14,
          }}>
            <CCLineRow label="Subtotal" value={servicePrice} valueOriginal={servicePriceOriginal}/>
            <CCLineRow label="Taxa de deslocação" value={TRAVEL_FEE}/>
            <CCLineRow label="Taxa de proteção" value={PROTECTION_FEE_NOW} valueOriginal={PROTECTION_FEE} strike/>
            {scheduleSurcharge>0 && <CCLineRow label={scheduleSurchargeLabel} value={scheduleSurcharge}/>}
            <div style={{
              marginTop:10, paddingTop:12, borderTop:`1px solid ${CC.line}`,
              display:"flex", justifyContent:"space-between", alignItems:"baseline",
            }}>
              <span style={{ fontSize:15, fontWeight:700 }}>Total a pagar</span>
              <span className="serif" style={{ fontSize:22, fontWeight:600, color:CC.forest }}>{eur(total)}</span>
            </div>
          </div>
        </div>

        <div style={{ padding:"20px 18px 0" }}>
          <CCJaFaltaPouco/>
        </div>

        <div style={{ padding:"24px 18px 0" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div className="serif" style={{ fontSize:18, fontWeight:600 }}>Concluir pedido</div>
            <CCChip tone="amber">Obrigatório</CCChip>
          </div>
          <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <button onClick={()=>setState(p=>({...p, paymentMethod:"dinheiro"}))} style={{
              background:CC.paper,
              border:`2px solid ${state.paymentMethod==="dinheiro"?CC.emerald:CC.line}`,
              borderRadius:12, padding:"14px 16px",
              display:"flex", alignItems:"center", gap:8, cursor:"pointer",
            }}>
              <Banknote size={18} color={state.paymentMethod==="dinheiro"?CC.emerald:CC.stone}/>
              <span style={{ fontSize:14, fontWeight:600 }}>Dinheiro</span>
            </button>
            <button onClick={()=>setState(p=>({...p, paymentMethod:"cartao"}))} style={{
              background:CC.paper,
              border:`2px solid ${state.paymentMethod==="cartao"?CC.emerald:CC.line}`,
              borderRadius:12, padding:"14px 16px",
              display:"flex", alignItems:"center", gap:8, cursor:"pointer",
            }}>
              <CreditCard size={18} color={state.paymentMethod==="cartao"?CC.emerald:CC.stone}/>
              <span style={{ fontSize:14, fontWeight:600 }}>Cartão</span>
            </button>
          </div>

          <button style={{
            marginTop:12, width:"100%",
            background:CC.emeraldPale, border:`1px solid ${CC.emeraldSoft}`,
            borderRadius:12, padding:"12px 14px",
            display:"flex", alignItems:"center", gap:10, cursor:"pointer", textAlign:"left",
          }}>
            <Tag size={16} color={CC.emerald}/>
            <span style={{ fontSize:13, color:CC.emeraldDark, fontWeight:600, flex:1 }}>Promo {PROMO_CODE} aplicado</span>
            <span style={{
              fontSize:11, color:CC.emeraldDark, fontWeight:700,
              background:CC.paper, padding:"3px 8px", borderRadius:999,
            }}>−{eur(PROMO_SAVINGS)}</span>
          </button>

          <button onClick={()=>setModal("billing")} style={{
            marginTop:8, width:"100%",
            background: hasBilling?CC.emeraldPale:CC.paper,
            border:`1px solid ${hasBilling?CC.emeraldSoft:CC.line}`,
            borderRadius:12, padding:"12px 14px",
            display:"flex", alignItems:"center", gap:10, cursor:"pointer", textAlign:"left",
          }}>
            <Receipt size={16} color={hasBilling?CC.emerald:CC.stone}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, color:CC.ink, fontWeight:600 }}>
                {hasBilling ? "Dados de faturação" : "Adicionar dados de faturação"}
              </div>
              {hasBilling && (
                <div style={{ fontSize:11.5, color:CC.stone, marginTop:2 }}>
                  {state.billing.nome} · NIF {state.billing.nif}
                </div>
              )}
            </div>
            <ChevronRight size={16} color={CC.stone}/>
          </button>
        </div>

        <CCDivisor/>

        <div style={{ padding:"0 18px" }}>
          <div className="serif" style={{ fontSize:18, fontWeight:600 }}>O que inclui sempre</div>
          <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:18 }}>
            <CCValueRow icon={Lock}          title="Técnico fixo, escolhido por si"         desc="Sempre o mesmo profissional da nossa rede de confiança — nunca anónimo."/>
            <CCValueRow icon={Shield}        title="90 dias de garantia"                    desc="Se o mesmo problema voltar, regressamos sem custos adicionais."/>
            <CCValueRow icon={RefreshCw}     title="Cancelamento livre"                     desc="Cancele ou reagende gratuitamente até 15 min ou antes de ser atribuído."/>
            <CCValueRow icon={Wrench}        title="Materiais aprovados por si"             desc="Qualquer custo extra precisa da sua confirmação antes de ser cobrado."/>
            <CCValueRow icon={MessageSquare} title="Chat directo e relatório fotográfico"   desc="Fala com o técnico a qualquer momento e recebe relatório no fim."/>
          </div>
        </div>
      </div>

      <CCStickyCTA banner={`Reserve agora e poupe ${eur(PROMO_SAVINGS)} em descontos`}>
        <CCPrimaryBtn onClick={()=>onConfirm({ total, scheduleSurcharge })} disabled={!canBook}>
          {!state.paymentMethod
            ? "Escolha método de pagamento"
            : !scheduleOk
              ? "Escolha Agendar ou Imediato"
              : "Agendar serviço"}
        </CCPrimaryBtn>
      </CCStickyCTA>

      {modal==="schedule" && (
        <CCScheduleModal slots={state.selectedSlots} onClose={()=>setModal(null)}
          onConfirm={(slots)=>{ setState(p=>({...p, selectedSlots:slots, scheduleMode:"agendar"})); setModal(null) }}/>
      )}
      {modal==="photos" && (
        <CCPhotosNotesModal notes={state.notes} photos={state.photos} onClose={()=>setModal(null)}
          onConfirm={({ notes, photos })=>{ setState(p=>({...p, notes, photos})); setModal(null) }}/>
      )}
      {modal==="billing" && (
        <CCBillingModal billing={state.billing} onClose={()=>setModal(null)}
          onConfirm={(billing)=>{ setState(p=>({...p, billing})); setModal(null) }}/>
      )}
    </CCShell>
  )
}

function ConfirmadoScreen({ onRestart }){
  return (
    <CCShell>
      <div style={{
        minHeight:"100vh", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", padding:32, textAlign:"center",
      }}>
        <div style={{
          width:80, height:80, borderRadius:999,
          background:CC.emeraldSoft, color:CC.emerald,
          display:"grid", placeItems:"center",
          boxShadow:`0 12px 40px -12px ${CC.emerald}`,
        }}><Check size={36} strokeWidth={3}/></div>
        <div className="serif" style={{ fontSize:28, fontWeight:500, marginTop:24, letterSpacing:-0.4 }}>Pedido confirmado</div>
        <div style={{ fontSize:14, color:CC.stone, marginTop:10, maxWidth:300, lineHeight:1.5 }}>
          Estamos a atribuir o seu técnico de confiança. Receberá notificação em instantes.
        </div>
        <button onClick={onRestart} style={{
          marginTop:32, background:"transparent",
          color:CC.emerald, border:`1px solid ${CC.emerald}`,
          borderRadius:12, padding:"10px 20px",
          fontSize:13, fontWeight:600, cursor:"pointer",
        }}>← Voltar à Home</button>
      </div>
    </CCShell>
  )
}
*/ /* ── fim V1_LEGACY ── */

/* ══════════════════════════════════
   ROOT
══════════════════════════════════ */
export default function App() {
  // ── Auth ──────────────────────────────────
  const [authUser,  setAuthUser]  = useState(null) // {user, token, role, nome, perfil}
  const [role,      setRole]      = useState('prestador')

  const [tab,    setTab]    = useState('inicio')
  const [ecra,   setEcra]   = useState('home')
  const [ordens, setOrdens] = useState(ORDENS_INIT)
  const [sel,      setSel]      = useState(null)
  const [selAlerta,setSelAlerta]= useState(null)
  const [svcNova,  setSvcNova]  = useState(null)

  // 3.2D: PerfilSheet + SubscricaoScreen
  const [showPerfilSheet,  setShowPerfilSheet]  = useState(false)
  const [showSubscricao,   setShowSubscricao]   = useState(false)

  // ── Cache de categorias (lido 1× da BD no arranque, partilhado pelos ecrãs V2) ──
  const [categoriesCache, setCategoriesCache] = useState(null)
  useEffect(() => {
    let active = true
    sbGet('categorias', '?activo=eq.true&order=ordem', authUser?.token)
      .then(data => {
        if(!active) return
        console.log('[V2 catalog] categorias fetch →', Array.isArray(data) ? `${data.length} rows` : data)
        setCategoriesCache(data || [])
      })
      .catch(e => {
        if(!active) return
        console.warn('[V2 catalog] erro ao carregar categorias:', e)
        setCategoriesCache([])
      })
    return () => { active = false }
  }, [authUser?.token])

  // ── Estado do novo fluxo de catálogo V2 (multi-categoria, preparado para 2c) ──
  // catScreen adiciona 'variant' para o VariantPickerScreenV2 de grupos.
  const [catScreen, setCatScreen] = useState(null) // null | 'list' | 'landing' | 'form' | 'variant' | 'detail' | 'checkout' | 'done'
  const [catCategoryId, setCatCategoryId] = useState(null) // string (ex: 'canalizacao')
  const [catSelected, setCatSelected] = useState(null)     // row de servicos (V2: preco/nome) ou PERSONALIZADO const (V1 antigo)
  const [catParent,   setCatParent]   = useState(null)     // row do grupo-pai quando catScreen='variant' ou detalhe de variante
  const [catIsPersonalizado, setCatIsPersonalizado] = useState(false)
  const [catState, setCatState] = useState({
    description:"", horas:1,
    scheduleMode:null, selectedSlots:[],
    notes:"", photos:[], billing:null, paymentMethod:null,
    serviceOptions:null, // {productsId, frequencyId, effectivePrice, priceSuffix} — vem do ServiceDetailScreenV2
  })
  // Row real da ordem acabada de inserir (vinda do sbSave com numero_sequencial, valor, etc.)
  // Consumida pelo ConfirmadoScreenV2 para mostrar número + preço efectivos da BD.
  const [catLastOrdem, setCatLastOrdem] = useState(null)

  // FAB central — abre picker de categorias + descrição livre (Fase 2e)
  const [fabOpen, setFabOpen] = useState(false)
  // Drawer do cliente — menu lateral invocado pelo hamburger da CHome
  const [clienteDrawerOpen, setClienteDrawerOpen] = useState(false)

  // ── Módulo Casa (Fase 3) ──
  const [casaLocalizacoes, setCasaLocalizacoes] = useState(null)
  const [casaEquipamentos, setCasaEquipamentos] = useState(null)
  const [casaActiveEq,     setCasaActiveEq]     = useState(null)
  const [casaSub,          setCasaSub]          = useState(null) // 'docs' | 'energia' | 'camera' | 'aiexpert' | 'locais'
  const [casaSubPayload,   setCasaSubPayload]   = useState(null) // contexto inicial p/ sub-ecrã (ex: alerta IPMA)
  const [casaActiveLocId,  setCasaActiveLocId]  = useState(() => {
    try { return localStorage.getItem('v5_casa_active_loc') || null } catch { return null }
  })
  useEffect(() => {
    try {
      if(casaActiveLocId) localStorage.setItem('v5_casa_active_loc', casaActiveLocId)
      else localStorage.removeItem('v5_casa_active_loc')
    } catch {}
  }, [casaActiveLocId])

  const refetchCasa = async () => {
    if(!authUser) return
    const [locs, eqs] = await Promise.all([
      sbGetV5('localizacoes', '?select=*&ativo=eq.true&order=created_at.asc', authUser?.token),
      sbGetV5('equipamentos', '?select=*&estado=eq.ativo&order=categoria.asc', authUser?.token),
    ])
    setCasaLocalizacoes(locs || [])
    setCasaEquipamentos(eqs || [])
    // Auto-selecciona primeira se a activa não existe
    if((locs || []).length > 0 && !(locs || []).some(l => l.id === casaActiveLocId)){
      setCasaActiveLocId(locs[0].id)
    }
  }
  useEffect(() => { refetchCasa() /* eslint-disable-next-line */ }, [authUser?.token])

  const casaActiveLoc = (casaLocalizacoes || []).find(l => l.id === casaActiveLocId) || (casaLocalizacoes || [])[0] || null
  // Meta da categoria activa, combinada a partir de BD (categoriesCache) + design tokens (CATEGORY_META).
  // null enquanto categoriesCache carrega ou categoria não resolvida.
  const catCategoryMeta = (() => {
    if(!catCategoryId || !categoriesCache) return null
    const row = categoriesCache.find(c => c.id === catCategoryId)
    if(!row) return null
    const meta = CATEGORY_META[catCategoryId] || { color:'#10B981', hero:'Serviço à medida — descreva o trabalho e enviamos o técnico certo.' }
    return {
      id:    row.id,
      nome:  row.nome,
      emoji: row.icon,
      color: meta.color,
      hero:  meta.hero,
      // personalizadoRate / personalizadoRateOriginal são carregados pelo ServiceListScreenV2
      // via fetchCategoryFull e guardados em catState.serviceOptions quando relevante. Aqui
      // deixamos defaults sensatos para os ecrãs Personalizado usarem enquanto a BD não responde.
      personalizadoRate:         49.90,
      personalizadoRateOriginal: 54.90,
    }
  })()
  const catReset = () => {
    setCatCategoryId(null); setCatSelected(null); setCatParent(null); setCatIsPersonalizado(false)
    setCatState({
      description:"", horas:1,
      scheduleMode:null, selectedSlots:[],
      notes:"", photos:[], billing:null, paymentMethod:null,
      serviceOptions:null,
    })
    setCatLastOrdem(null)
    setCatScreen(null)
  }
  const [moradasCli, setMoradasCli] = useState(() => {
    try { return JSON.parse(localStorage.getItem('v5_moradas_cli')||'null') || [] } catch { return [] }
  })
  useEffect(() => {
    try { localStorage.setItem('v5_moradas_cli', JSON.stringify(moradasCli)) } catch {}
  }, [moradasCli])

  // ── Estado Admin ──────────────────────────
  const [adminAuth,        setAdminAuth]        = useState(false)
  const [adminSvcs,        setAdminSvcs]        = useState([])
  const [adminSvcsLoading, setAdminSvcsLoading] = useState(false)
  const [adminSvcsError,   setAdminSvcsError]   = useState(null)
  const [adminPrest,    setAdminPrest]   = useState([...TECNICOS])
  const [adminNiveis,   setAdminNiveis]  = useState({...NIVEIS})
  const [adminClientes, setAdminClientes]= useState([...CLIENTES_INIT])

  // Carrega public.servicos (177 rows) quando o admin faz login.
  // Nota: v5_manutencao.catalogo_servicos só tem 8 rows (seed inicial do schema.sql).
  // A unificação dos dois catálogos está prevista para a Fase 3.1.
  // Retry manual via botão no banner de erro.
  const fetchAdminSvcs = () => {
    if(role !== 'admin' || !adminAuth) return
    setAdminSvcsLoading(true)
    setAdminSvcsError(null)
    sbGet('servicos', '?select=*&order=categoria_id.asc,ordem.asc', authUser?.token)
      .then(rows => {
        setAdminSvcsLoading(false)
        if(Array.isArray(rows)) setAdminSvcs(rows.map(fromDbServico))
        else setAdminSvcsError('Não foi possível carregar o catálogo. Verifica a ligação à base de dados.')
      })
      .catch(() => {
        setAdminSvcsLoading(false)
        setAdminSvcsError('Erro de ligação ao carregar o catálogo.')
      })
  }
  useEffect(() => {
    if(role !== 'admin' || !adminAuth) return
    let active = true
    setAdminSvcsLoading(true)
    setAdminSvcsError(null)
    sbGet('servicos', '?select=*&order=categoria_id.asc,ordem.asc', authUser?.token)
      .then(rows => {
        if(!active) return
        setAdminSvcsLoading(false)
        if(Array.isArray(rows)) setAdminSvcs(rows.map(fromDbServico))
        else setAdminSvcsError('Não foi possível carregar o catálogo. Verifica a ligação à base de dados.')
      })
      .catch(() => {
        if(!active) return
        setAdminSvcsLoading(false)
        setAdminSvcsError('Erro de ligação ao carregar o catálogo.')
      })
    return () => { active = false }
  }, [role, adminAuth])

  // ── Disponibilidade partilhada (reflecte no calendário) ──
  const [bloqueados, setBloqueados] = useState([])
  const [diasDisponib, setDiasDisponib] = useState({0:'todo',1:'todo',2:'todo',3:'todo',4:'manha'})

  const upd = o => setOrdens(p => p.map(x => x.id===o.id ? o : x))
  const add = async d => {
    const MN=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    const DN=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
    const dataStr = d.data
      ? `${DN[d.data.getDay()]} ${d.data.getDate()} ${MN[d.data.getMonth()]}`
      : 'Em breve'
    const svc = SVCS.find(s=>s.id===d.sid)
    const n = {
      id:       `ot${Date.now()}`,
      sid:      d.sid,
      cli:      authUser?.nome || 'Cliente',
      cliId:    authUser?.user?.id || null,
      morada:   d.morada,
      cp:       d.cp || '',
      data:     dataStr,
      hora:     d.hora || '09:00',
      tid:      d.tid || null,
      st:       'pendente',
      fotos:    d.fotos || [],
      ass:      false,
      aval:     null,
      notas:    d.notas || '',
      val:      svc?.p || 0,
      taxa:     18,
      dt_pedido:     new Date().toLocaleString('pt-PT', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}),
      dt_pedido_iso: new Date().toISOString(),
      pago:     true,
    }
    // Guarda localmente primeiro (UI imediata)
    setOrdens(p => [n, ...p])
    setEcra('home')
    setTab('pedidos')
    // Guarda no Supabase em background
    if (SB_KEY) {
      await sbSave('ordens', {
        // ids do SVCS legacy (s1..s63) não existem em public.servicos (schema TEXT);
        // o fluxo V2 usa addCatalogOrder e envia servico_id correcto. Aqui null.
        servico_id:    null,
        cliente_id:    authUser?.user?.id || null,
        prestador_id:  d.tid || null,
        estado:        'pendente',
        morada:        d.morada,
        codigo_postal: d.cp || null,
        hora_agendada: d.hora || '09:00',
        data_agendada: d.data ? d.data.toISOString().split('T')[0] : null,
        valor_cobrado: svc?.p || 0,
        taxa_pct:      18,
        valor_plataforma: ((svc?.p||0) * 0.18).toFixed(2),
        valor_prestador:  ((svc?.p||0) * 0.82).toFixed(2),
        notas:         d.notas || '',
      }, authUser?.token)
      .then(r => r && console.log('[Supabase] Ordem guardada:', r[0]?.id))
      .catch(e => console.warn('[Supabase] Erro ao guardar ordem:', e))
    }
  }

  // ── Criar ordem a partir do novo fluxo V2 (catálogo + personalizado) ──
  // servico_id é o id TEXT do catálogo (ex: 'auto-repair' ou 'personalizado-can').
  // A tabela public.servicos usa TEXT PRIMARY KEY — não há lookup intermédio.
  const addCatalogOrder = async ({ selected, isPersonalizado, categoryId, state, total, scheduleSurcharge, servicePrice }) => {
    // Resolver id do serviço e nome para apresentação
    const servicoId = isPersonalizado
      ? getPersonalizadoId(categoryId)                              // 'personalizado-cln', 'personalizado-can', etc.
      : (selected?.id || null)                                      // 'auto-repair', 'cln-home-t2', etc.
    const nome = isPersonalizado
      ? 'Serviço personalizado'
      : (selected?.nome || selected?.name || 'Serviço')

    // Preço base do serviço (pode ser o servicePrice calculado no checkout ou fallback a preco/price do row)
    const precoBase = Number(servicePrice ?? selected?.preco ?? selected?.price ?? 0)

    const firstSlot = (state.selectedSlots || [])[0]
    const dataAgendada = firstSlot?.dayDate
      ? (() => {
          // dayDate format: "DD mmm YYYY" — converter para ISO
          try {
            const [d, m, y] = firstSlot.dayDate.split(' ')
            const MM = {jan:'01',fev:'02',mar:'03',abr:'04',mai:'05',jun:'06',jul:'07',ago:'08',set:'09',out:'10',nov:'11',dez:'12'}
            return `${y}-${MM[m.toLowerCase()]}-${String(d).padStart(2,'0')}`
          } catch { return null }
        })()
      : null
    const horaAgendada = firstSlot?.time || null

    const totalNumber = Number(total?.toFixed?.(2) ?? precoBase)

    // Reflexo local para UI imediata (usa o mesmo formato que o fluxo antigo espera,
    // + campos V2 em snake_case para que CPedidos/COrdem possam renderizar o novo catálogo)
    const ordemLocal = {
      id:       `ot${Date.now()}`,
      sid:      null, // SVCS legacy não tem estes ids; deixamos null
      cli:      authUser?.nome || 'Cliente',
      cliId:    authUser?.user?.id || null,
      morada:   state.billing?.morada || authUser?.perfil?.morada || 'Morada por definir',
      cp:       state.billing?.cp || '',
      data:     state.scheduleMode === 'imediato' ? 'Imediato' : (firstSlot ? `${firstSlot.dayLabel} ${firstSlot.time}` : 'Em breve'),
      hora:     horaAgendada || '—',
      tid:      null,
      st:       'pendente',
      fotos:    (state.photos || []).map(()=>'📷'),
      ass:      false,
      aval:     null,
      notas:    state.notes || null,
      val:      totalNumber,
      taxa:     18,
      dt_pedido:     new Date().toLocaleString('pt-PT', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}),
      dt_pedido_iso: new Date().toISOString(),
      pago:     true,
      nome:     nome, // permite apresentação mesmo sem sid legacy
      // Campos V2 (espelham o payload Supabase) — numero_sequencial é preenchido após sbSave
      servico_id:              servicoId,
      servico_nome:            nome,
      categoria_id:            categoryId,
      is_personalizado:        !!isPersonalizado,
      descricao_personalizada: isPersonalizado ? (state.description || null) : null,
      valor_cobrado:           totalNumber,
      schedule_mode:           state.scheduleMode || null,
      data_agendada:           dataAgendada,
      hora_agendada:           horaAgendada,
      slots_flexiveis:         state.selectedSlots || [],
      created_at:              new Date().toISOString(),
    }
    setOrdens(p => [ordemLocal, ...p])

    // Persistir na Supabase
    if (SB_KEY) {
      // Fase 2d.2: auth real activa — authUser.user.id é sempre um UUID
      // válido (seja das 3 contas demo ou de user real). Ver CLAUDE.md
      // "Auth dos botões demo — Fase 2d". O fallback para null cobre
      // apenas o modo dev sem SB_KEY (demoLogin local), que nem chega aqui.
      const clienteIdFinal = authUser?.user?.id || null
      const payload = {
        servico_id:          servicoId,                    // TEXT PK em public.servicos
        cliente_id:          clienteIdFinal,
        prestador_id:        null,
        estado:              'pendente',
        morada:              state.billing?.morada || null,
        cod_postal:          state.billing?.cp || null,
        cidade:              state.billing?.localidade || null,
        data_agendada:       dataAgendada,
        hora_agendada:       horaAgendada,
        valor_cobrado:       totalNumber,
        taxa_pct:            18,
        valor_plataforma:    (totalNumber * 0.18).toFixed(2),
        valor_prestador:     (totalNumber * 0.82).toFixed(2),
        notas:               state.notes || null,
        // Campos novos da migração 20260422
        is_personalizado:    !!isPersonalizado,
        horas_estimadas:     isPersonalizado ? (state.horas || 1) : null,
        descricao_personalizada: isPersonalizado ? (state.description || null) : null,
        slots_flexiveis:     state.selectedSlots || [],
        schedule_mode:       state.scheduleMode || null,
        travel_fee:          TRAVEL_FEE,
        schedule_surcharge:  scheduleSurcharge || 0,
        metodo_pagamento:    state.paymentMethod || null,
        promo_code:          PROMO_CODE,
        promo_desconto:      PROMO_SAVINGS,
        faturacao_nome:      state.billing?.nome || null,
        faturacao_nif:       state.billing?.nif || null,
        faturacao_morada:    state.billing?.morada || null,
        faturacao_cp:        state.billing?.cp || null,
        faturacao_localidade:state.billing?.localidade || null,
      }
      try {
        const r = await sbSave('ordens', payload, authUser?.token)
        if (!r) {
          console.error('[sbSave] INSERT ordens retornou null — ver [sbSave ordens] HTTP XXX anterior')
          alert('Erro ao criar pedido: não foi possível gravar no servidor. Ver consola (F12) para detalhes.')
        } else {
          // PostgREST retorna array (com Prefer: return=representation). Guarda 1ª row.
          const row = Array.isArray(r) ? r[0] : r
          setCatLastOrdem(row)
          // Enriquecer a ordem local com numero_sequencial + id da BD para que
          // CPedidos/COrdem possam mostrar o número e deep-link para o detalhe.
          if(row){
            setOrdens(p => p.map(x => x.id === ordemLocal.id
              ? { ...x, numero_sequencial: row.numero_sequencial, bd_id: row.id }
              : x))
          }
        }
      } catch (e) {
        console.error('[sbSave] EXCEPTION →', e)
        alert('Exceção ao criar pedido: ' + (e?.message || e))
      }
    }

    setCatScreen('done')
  }

  const mudar = async r => {
    if (r==='admin') {
      // Para admin escrever na BD precisa de auth.uid() de admin@demov5.pt.
      // Se a sessão actual é outro user (cliente/prestador), fazemos sign-out
      // + sign-in na conta admin demo. Se já for admin, só muda o role local.
      const currentEmail = authUser?.user?.email
      if (currentEmail !== 'admin@demov5.pt' && SB_KEY) {
        if (authUser?.token) await sbSignOut(authUser.token)
        const res = await sbSignIn('admin@demov5.pt', 'Demo2026!')
        if (res.error) {
          alert(`Falha ao entrar como admin: ${res.error}`)
          return
        }
        setAuthUser({ user:res.user, token:res.token, role:'admin', nome:'Admin', demo:true })
      }
      setRole('admin'); setAdminAuth(true)
      return
    }
    setRole(r); setTab('inicio'); setEcra('home'); setSel(null)
  }

  // Callback de auth — pode vir do AuthScreen ou do botão admin
  const onAuth = (auth) => {
    setAuthUser(auth)
    if (auth.role === 'admin') { setRole('admin'); setAdminAuth(true) }
    else setRole(auth.role)
  }

  const onLogout = async () => {
    if (authUser?.token) await sbSignOut(authUser.token)
    setAuthUser(null); setRole('prestador'); setAdminAuth(false)
  }

  // ── Mostrar AuthScreen se não autenticado ──
  if (!authUser) return <AuthScreen onAuth={onAuth}/>

  const hideRole = ecra==='carteira' || role==='admin' || (role==='cliente' && catScreen !== null)
  const cliOver  = ['nova','ordem','chat_c','chat_ordem_c'].includes(ecra) || (role==='cliente' && catScreen !== null)

  return (
    <>
      <style>{`
        body { background: #0f172a; margin: 0; }
        @media (max-width: 430px) { body { background: #f8fafc; } }
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .sk { background: linear-gradient(90deg, #ECE9E2 0%, #F5F2EC 50%, #ECE9E2 100%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 8px; }
        @keyframes screenIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes checkIn { 0% { transform: scale(0.3); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>

      {/* ── ADMIN DESKTOP (full-width, fora do container de 430px) ── */}
      {role==='admin' && (
        adminAuth
          ? <AdminDash
              svcs={adminSvcs}           setSvcs={setAdminSvcs}
              svcsLoading={adminSvcsLoading}
              svcsError={adminSvcsError}
              onSvcsRetry={fetchAdminSvcs}
              prestadores={adminPrest}   setPrestadores={setAdminPrest}
              niveis={adminNiveis}       setNiveis={setAdminNiveis}
              clientes={adminClientes}   setClientes={setAdminClientes}
              ordens={ordens}            setOrdens={setOrdens}
              authUser={authUser}
              onLogout={onLogout}
            />
          : <AdminLogin onLogin={() => setAdminAuth(true)}/>
      )}

      {/* ── APP MOBILE (container 430px) ── */}
      {role!=='admin' && <div style={{ maxWidth:430, margin:'0 auto', minHeight:'100vh', background:'#f8fafc', position:'relative', boxShadow:'0 0 80px rgba(0,0,0,0.5)' }}>

        {/* RoleBar removido — Sair e configurações em PerfilSheet/PerfilDrawer */}

        {/* ── CLIENTE ── */}
        {role==='cliente' && <>
          {/* Novo fluxo catálogo V2 — data-driven por categoria (só canalização na 2c-A) */}
          {catScreen==='list' && catCategoryId && (
            <ServiceListScreenV2
              categoryId={catCategoryId}
              categoriesCache={categoriesCache}
              authUser={authUser}
              onBack={catReset}
              onSelectService={(service, category)=>{
                if(service.tipo === 'grupo'){
                  setCatParent(service); setCatSelected(service); setCatIsPersonalizado(false)
                  setCatScreen('variant')
                } else {
                  setCatParent(null); setCatSelected(service); setCatIsPersonalizado(false)
                  setCatScreen('detail')
                }
              }}
              onSelectPersonalizado={()=>{
                setCatParent(null); setCatSelected(null); setCatIsPersonalizado(true)
                setCatScreen('landing')
              }}
            />
          )}
          {catScreen==='variant' && catParent && catCategoryMeta && (
            <VariantPickerScreenV2
              parent={catParent} category={catCategoryMeta} authUser={authUser}
              onBack={()=>setCatScreen('list')}
              onContinue={(variant, parent)=>{
                setCatSelected(variant); setCatParent(parent)
                setCatScreen('detail')
              }}
            />
          )}
          {catScreen==='landing' && catCategoryMeta && (
            <PersonalizadoLandingV2
              category={catCategoryMeta}
              onBack={()=>setCatScreen('list')}
              onContinue={()=>setCatScreen('form')}
            />
          )}
          {catScreen==='form' && catCategoryMeta && (
            <PersonalizadoFormV2
              category={catCategoryMeta}
              authUser={authUser}
              onBack={()=>setCatScreen('landing')}
              onContinue={()=>setCatScreen('checkout')}
              state={catState} setState={setCatState}
            />
          )}
          {catScreen==='detail' && catSelected && catCategoryMeta && (
            <ServiceDetailScreenV2
              serviceId={catSelected.id}
              category={catCategoryMeta}
              authUser={authUser}
              onBack={()=>setCatScreen(catParent ? 'variant' : 'list')}
              onContinue={(opts)=>{
                // Guarda opções dinâmicas e serviço enriquecido para o checkout usar
                setCatState(p => ({...p, serviceOptions:{
                  productsId:     opts.productsId,
                  frequencyId:    opts.frequencyId,
                  effectivePrice: opts.effectivePrice,
                  priceSuffix:    opts.priceSuffix,
                }}))
                if(opts.service) setCatSelected(opts.service)
                if(opts.parent)  setCatParent(opts.parent)
                setCatScreen('checkout')
              }}
            />
          )}
          {catScreen==='checkout' && (catSelected || catIsPersonalizado) && catCategoryMeta && (
            <FinalizarPedidoV2
              selected={catSelected}
              category={catCategoryMeta}
              isPersonalizado={catIsPersonalizado}
              authUser={authUser}
              onManageMoradas={()=>{ setCatScreen(null); setTab('perfil'); setEcra('moradas') }}
              onBack={()=>setCatScreen(catIsPersonalizado ? 'form' : 'detail')}
              onConfirm={({ total, scheduleSurcharge, servicePrice })=>addCatalogOrder({
                selected:catSelected,
                isPersonalizado:catIsPersonalizado,
                categoryId:catCategoryId,
                state:catState, total, scheduleSurcharge, servicePrice,
              })}
              state={catState} setState={setCatState}
            />
          )}
          {catScreen==='done' && (
            <ConfirmadoScreenV2
              ordem={catLastOrdem}
              servicoNome={catIsPersonalizado ? 'Serviço personalizado' : (catSelected?.nome || catSelected?.name || null)}
              categoriaNome={catCategoryMeta?.nome || null}
              onRestart={()=>{ catReset(); setTab('pedidos') }}
            />
          )}

          {/* Ecrãs full-screen 3.3.6D (sobrepõem qualquer tab) */}
          {ecra==='score_detail'   && <ScoreDetailScreen onBack={()=>setEcra('home')} />}
          {ecra==='alerta_detail'  && <AlertaDetailScreen alerta={selAlerta} onBack={()=>setEcra('home')} onPedirTecnico={()=>{ setEcra('home'); setTab('servicos') }} />}
          {ecra==='owners_club'    && <OwnersClubScreen authUser={authUser} onBack={()=>setEcra('home')} onNavigate={(t)=>{ if(t==='subscricao'){setEcra('home');setShowSubscricao(true)} else setEcra('home') }} />}
          {ecra==='chat_prestador' && <ChatPedidoScreen ordem={sel} onBack={()=>setEcra('home')} />}

          {/* Fluxo antigo (activo apenas quando catScreen === null) */}
          {catScreen===null && <>
            {ecra==='nova'        && <CNovaOrdem svcI={svcNova} onBack={()=>setEcra('home')} onOk={add} moradas={moradasCli} setMoradas={setMoradasCli}/>}
            {ecra==='ordem'       && sel && <COrdem o={sel} onBack={()=>setEcra('home')} onChat={()=>setEcra('chat_prestador')}/>}
            {ecra==='chat_c'      && <Chat titulo='Suporte' msgs={CHAT_C} lado='cliente' onBack={()=>setEcra('home')}/>}
            {ecra==='chat_ordem_c'&& sel && <OrderChat ordem={sel} role='cliente' prest={TECNICOS.find(t=>t.id===sel.tid)} onBack={()=>setEcra('ordem')} onUpdate={o=>{upd(o);setSel(o)}}/>}
            {!cliOver && <>
              <PerfilSheet
                open={showPerfilSheet}
                onClose={()=>setShowPerfilSheet(false)}
                authUser={authUser}
                onNavigate={(target)=>{
                  if(target==='subscricao'){ setShowPerfilSheet(false); setShowSubscricao(true) }
                  if(target==='wishlist'){ setShowPerfilSheet(false); setTab('perfil'); setEcra('wishlist') }
                  if(target==='moradas'){ setShowPerfilSheet(false); setTab('perfil'); setEcra('moradas') }
                  if(target==='perfil'){ setShowPerfilSheet(false); setTab('perfil'); setEcra('home') }
                  if(target==='ownersclub'){ setShowPerfilSheet(false); setEcra('owners_club') }
                }}
                onLogout={()=>{ setShowPerfilSheet(false); onLogout() }}
              />
              <SubscricaoScreen
                open={showSubscricao}
                onClose={()=>{ setShowSubscricao(false); setShowPerfilSheet(true) }}
                authUser={authUser}
              />
              {tab==='servicos' && <ServicosScreen authUser={authUser} onHamburguer={()=>setClienteDrawerOpen(true)} onAvatarClick={()=>setShowPerfilSheet(true)} />}
              {tab==='inicio'   && <IniciaScreen authUser={authUser} localizacoes={casaLocalizacoes} localizacaoAtiva={casaActiveLoc} onNavigateCasa={()=>{ setTab('casa'); setEcra('home') }} onNavigateServicos={()=>setTab('servicos')} onHamburguer={()=>setClienteDrawerOpen(true)} onAvatarClick={()=>setShowPerfilSheet(true)} onNavigateScore={()=>setEcra('score_detail')} onNavigateAlerta={(a)=>{ setSelAlerta(a); setEcra('alerta_detail') }} onNavigateOwnersClub={()=>setEcra('owners_club')} />}
              {tab==='casa' && !casaActiveEq && !casaSub && <CasaScreen
                localizacoes={casaLocalizacoes}
                localizacao={casaActiveLoc}
                equipamentos={casaEquipamentos}
                authUser={authUser}
                onHamburguer={()=>setClienteDrawerOpen(true)}
                onAvatarClick={()=>setShowPerfilSheet(true)}
                onNavigateScore={()=>setEcra('score_detail')}
                onNavigate={(target, payload)=>{
                  if(target==='ficha' && payload){ setCasaActiveEq(payload); return }
                  if(target==='docs')    { setCasaSub('docs');    setCasaSubPayload(null); return }
                  if(target==='energia') { setCasaSub('energia'); setCasaSubPayload(null); return }
                  if(target==='camera')  { setCasaSub('camera');  setCasaSubPayload(null); return }
                  if(target==='aiexpert'){ setCasaSub('aiexpert'); setCasaSubPayload(payload || null); return }
                  if(target==='locais')  { setCasaSub('locais');  setCasaSubPayload(null); return }
                }}
              />}
              {tab==='casa' && casaActiveEq && <EquipamentoFicha
                equipamento={casaActiveEq}
                authUser={authUser}
                onBack={()=>setCasaActiveEq(null)}
                onUpdated={(updated)=>{
                  setCasaEquipamentos(prev => (prev || []).map(e => e.id === updated.id ? updated : e))
                  setCasaActiveEq(updated)
                }}
                onDeleted={(id)=>{
                  setCasaEquipamentos(prev => (prev || []).filter(e => e.id !== id))
                  setCasaActiveEq(null)
                }}
                onAskAI={(payload)=>{ setCasaActiveEq(null); setCasaSub('aiexpert'); setCasaSubPayload(payload) }}
              />}
              {tab==='casa' && casaSub==='docs' && <DocsScreen
                localizacao={casaActiveLoc}
                authUser={authUser}
                onBack={()=>setCasaSub(null)}
              />}
              {tab==='casa' && casaSub==='energia' && <EnergiaScreen
                localizacao={casaActiveLoc}
                equipamentos={casaEquipamentos}
                authUser={authUser}
                onBack={()=>setCasaSub(null)}
              />}
              {tab==='casa' && casaSub==='camera' && <CameraScreen
                localizacao={casaActiveLoc}
                authUser={authUser}
                onBack={()=>setCasaSub(null)}
                onCreated={(eq)=>{
                  setCasaEquipamentos(prev => [...(prev || []), eq])
                  setCasaSub(null)
                  setCasaActiveEq(eq)
                }}
              />}
              {tab==='casa' && casaSub==='aiexpert' && <AIExpertScreen
                localizacao={casaActiveLoc}
                equipamentos={casaEquipamentos}
                authUser={authUser}
                initialContext={casaSubPayload}
                onBack={()=>{ setCasaSub(null); setCasaSubPayload(null) }}
              />}
              {tab==='casa' && casaSub==='locais' && <CasaLocais
                localizacoes={casaLocalizacoes}
                activeLocId={casaActiveLocId}
                authUser={authUser}
                onBack={()=>setCasaSub(null)}
                onRefresh={refetchCasa}
                onPickActive={(id)=>setCasaActiveLocId(id)}
              />}
              {tab==='pedidos'  && <PedidosScreen ordens={ordens} authUser={authUser} onOrdem={o=>{setSel(o);setEcra('ordem')}} onHamburguer={()=>setClienteDrawerOpen(true)} onAvatarClick={()=>setShowPerfilSheet(true)} />}
              {tab==='perfil'   && ecra!=='moradas' && ecra!=='wishlist' && (
                <CPerfil
                  authUser={authUser}
                  onMoradas={()=>setEcra('moradas')}
                  onLogout={onLogout}
                  onPlaceholder={(l)=>alert(`"${l}" fica disponível numa fase seguinte.`)}
                />
              )}
              {tab==='perfil'   && ecra==='moradas' && (
                <CMoradas authUser={authUser} onBack={()=>setEcra('home')}/>
              )}
              {tab==='perfil'   && ecra==='wishlist' && (
                <CWishlist
                  authUser={authUser}
                  onBack={()=>setEcra('home')}
                  onCreateNew={()=>{ setTab('inicio'); setEcra('home') }}
                  onSubmitted={()=>{ setTab('pedidos'); setEcra('home') }}
                  setOrdens={setOrdens}
                  ScheduleModal={CCScheduleModal}
                />
              )}
              <BNav tab={tab} set={t=>{setTab(t);setEcra('home')}} onFabClick={()=>setFabOpen(true)}/>
              {fabOpen && (
                <FabPickerModal
                  onClose={()=>setFabOpen(false)}
                  onPickCategory={(id)=>{ setCatCategoryId(id); setCatScreen('list') }}
                  onPickPersonalizado={(desc)=>{
                    // Entra no form personalizado da Manutenção com a descrição pré-preenchida
                    setCatCategoryId('manutencao')
                    setCatIsPersonalizado(true)
                    setCatState(p=>({...p, description:desc}))
                    setCatScreen('form')
                  }}
                />
              )}
              <PerfilDrawer
                open={clienteDrawerOpen}
                onClose={()=>setClienteDrawerOpen(false)}
                authUser={authUser}
                onNavigate={(target)=>{
                  if(target==='subscricao'){ setClienteDrawerOpen(false); setShowSubscricao(true) }
                  if(target==='wishlist'){ setClienteDrawerOpen(false); setTab('perfil'); setEcra('wishlist') }
                  if(target==='moradas'){ setClienteDrawerOpen(false); setTab('perfil'); setEcra('moradas') }
                  if(target==='perfil'){ setClienteDrawerOpen(false); setTab('perfil'); setEcra('home') }
                  if(target==='ownersclub'){ setClienteDrawerOpen(false); setEcra('owners_club') }
                }}
                onLogout={()=>{ setClienteDrawerOpen(false); onLogout() }}
              />
            </>}
          </>}
        </>}

        {/* ── PRESTADOR ── */}
        {role==='prestador' && <>
          {ecra==='home'           && <PDashV2 ordens={ordens} onOrdem={o=>{setSel(o);setEcra('exec')}} onCarteira={()=>setEcra('carteira')} onChat={()=>setEcra('chat_p')}
            onNavMenu={id=>{
              const map={'meus_servicos':'meus_servicos','carteira':'carteira','pagamentos':'carteira','mensagens':'chat_p','disponibilidade':'disponibilidade','tarefas':'tarefas','estatisticas':'estatisticas','rating':'nivel_p','servicos_ativos':'servicos_ativos','perfil':'perfil_p','ajuda':'home'}
              setEcra(map[id]||'home')
            }}/>}
          {ecra==='exec'           && sel && <PExec o={sel} onBack={()=>setEcra('home')} onUpdate={o=>{upd(o);setSel(o)}} onChat={()=>setEcra('chat_ordem_p')}/>}
          {ecra==='chat_ordem_p'   && sel && <OrderChat ordem={sel} role='prestador' prest={TECNICOS[0]} onBack={()=>setEcra('exec')} onUpdate={o=>{upd(o);setSel(o)}}/>}
          {ecra==='carteira'       && <PCarteira onBack={()=>setEcra('home')} ordens={ordens} onOrdem={o=>{setSel(o);setEcra('exec')}}/>}
          {ecra==='meus_servicos'  && <MeusServicos servicos={SERVICOS_CAL} bloqueados={bloqueados} onBack={()=>setEcra('home')}/>}
          {ecra==='disponibilidade'&& <PDisponibilidade bloqueados={bloqueados} setBloqueados={setBloqueados} onBack={()=>setEcra('home')}/>}
          {ecra==='tarefas'        && <PTarefas onBack={()=>setEcra('home')}/>}
          {ecra==='estatisticas'   && <PEstatisticas onBack={()=>setEcra('home')}/>}
          {ecra==='servicos_ativos'&& <PServicosAtivos onBack={()=>setEcra('home')}/>}
          {ecra==='perfil_p'       && <PPrestadorPerfil onBack={()=>setEcra('home')}/>}
          {ecra==='nivel_p'        && <PNivel onBack={()=>setEcra('home')}/>}
          {ecra==='chat_p'         && <Chat titulo='Plataforma' msgs={CHAT_P} lado='prestador' onBack={()=>setEcra('home')}/>}
          <AIChat/>
        </>}

        {/* ── GESTOR ── */}
        {role==='gestor' && <>
          {ecra==='home'    && <GDash    ordens={ordens} onOrdem={o=>{setSel(o);setEcra('ordem_g')}} onRede={()=>setEcra('rede')} onPag={()=>setEcra('pag')}/>}
          {ecra==='ordem_g' && sel && <GOrdem o={sel} onBack={()=>setEcra('home')} onUpdate={o=>upd(o)}/>}
          {ecra==='rede'    && <GRede    onBack={()=>setEcra('home')}/>}
          {ecra==='pag'     && <GPag     onBack={()=>setEcra('home')}/>}
        </>}
      </div>}{/* fim do container mobile */}
    </>
  )
}
