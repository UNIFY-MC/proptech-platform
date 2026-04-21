// src/components/MeusServicos.jsx — v5-manutencao 2026.0420 2141
import { useState, useMemo } from 'react'
import { C } from '../constants'

const ESTADO = {
  pendente:    { l:'Pendente',                cor:'#ef4444', bg:'#fee2e2' },
  concluido:   { l:'Concluído',               cor:'#16a34a', bg:'#dcfce7' },
  agendado:    { l:'Agendado',                cor:'#3b82f6', bg:'#eff6ff' },
  a_confirmar: { l:'A aguardar confirmação',  cor:'#8b5cf6', bg:'#f5f3ff' },
  bloqueado:   { l:'Bloqueado',               cor:'#94a3b8', bg:'#f1f5f9' },
  em_curso:    { l:'Em curso',                cor:'#16a34a', bg:'#dcfce7' },
}

const DN   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MESES= ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
              'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const p2 = n => String(n).padStart(2,'0')
const toStr = (y,m,d) => `${y}-${p2(m+1)}-${p2(d)}`

export default function MeusServicos({ servicos = [], onServico, onBack }) {
  const hoje = new Date()
  const [ano,  setAno]  = useState(hoje.getFullYear())
  const [mes,  setMes]  = useState(hoje.getMonth())
  const [dia,  setDia]  = useState(hoje.getDate())
  const [open, setOpen] = useState(true)   // calendário expandido/colapsado

  // Agrupa serviços por data
  const porData = useMemo(() => {
    const m = {}
    servicos.forEach(s => { (m[s.data] = m[s.data] || []).push(s) })
    return m
  }, [servicos])

  const primeiroDia = new Date(ano, mes, 1).getDay()
  const totalDias   = new Date(ano, mes+1, 0).getDate()
  const linhas      = Math.ceil((primeiroDia + totalDias) / 7)

  const prevMes = () => mes === 0 ? (setAno(a=>a-1), setMes(11)) : setMes(m=>m-1)
  const nextMes = () => mes===11 ? (setAno(a=>a+1), setMes(0))  : setMes(m=>m+1)

  const dataSel = toStr(ano, mes, dia)
  const servicosDia = (porData[dataSel] || []).sort((a,b)=>a.hora.localeCompare(b.hora))

  return (
    <div style={{ minHeight:'100vh', background:'#fff', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{
        background:`linear-gradient(145deg,${C.navy},${C.gd})`,
        padding:'14px 16px', display:'flex', alignItems:'center', gap:12,
        position:'sticky', top:0, zIndex:10,
      }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:'#fff', fontSize:22, cursor:'pointer', padding:0 }}>←</button>
        <h1 style={{ color:'#fff', fontSize:16, fontWeight:700, margin:0 }}>Os meus serviços</h1>
      </div>

      {/* Navegação de mês */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px 6px' }}>
        <button onClick={prevMes} style={btnNav}>‹</button>
        <span style={{ fontSize:16, fontWeight:600, color:'#0f172a' }}>{MESES[mes]} {ano}</span>
        <button onClick={nextMes} style={btnNav}>›</button>
      </div>

      {/* Calendário */}
      {open && (
        <div style={{ padding:'0 10px' }}>
          {/* Cabeçalho dias */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:2 }}>
            {DN.map(d => (
              <div key={d} style={{ textAlign:'center', fontSize:11, color:'#94a3b8', fontWeight:600, padding:'3px 0' }}>{d}</div>
            ))}
          </div>
          {/* Grelha */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'1px 0' }}>
            {Array.from({ length: linhas*7 }).map((_, i) => {
              const d = i - primeiroDia + 1
              const estesMes = d>=1 && d<=totalDias
              const dStr = estesMes ? toStr(ano,mes,d) : null
              const svcs = dStr ? (porData[dStr]||[]) : []
              const ests = [...new Set(svcs.map(s=>s.estado))]
              const isHj = estesMes && d===hoje.getDate() && mes===hoje.getMonth() && ano===hoje.getFullYear()
              const isSel= estesMes && d===dia

              // Dias do mês anterior/seguinte em cinza
              let show = d
              if (d<1) show = new Date(ano,mes,0).getDate()+d
              else if (d>totalDias) show = d-totalDias

              return (
                <div key={i}
                  onClick={() => estesMes && setDia(d)}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'3px 1px', cursor: estesMes?'pointer':'default' }}
                >
                  <div style={{
                    width:30, height:30, borderRadius:'50%',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:13, fontWeight: isSel||isHj ? 700 : 400,
                    background: isSel ? '#3b82f6' : 'transparent',
                    color: isSel ? '#fff' : !estesMes ? '#cbd5e1' : isHj ? C.g : '#0f172a',
                    border: isHj && !isSel ? `2px solid ${C.g}` : 'none',
                  }}>
                    {Math.abs(show)||show}
                  </div>
                  {/* Dots de estado */}
                  <div style={{ display:'flex', gap:2, marginTop:2, height:7 }}>
                    {estesMes && ests.slice(0,3).map(e => (
                      <div key={e} style={{ width:5, height:5, borderRadius:'50%', background: ESTADO[e]?.cor||'#94a3b8' }}/>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Toggle abrir/fechar calendário */}
      <div style={{ display:'flex', justifyContent:'center', padding:'4px 0' }}>
        <button onClick={() => setOpen(o=>!o)} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:16, padding:'4px 14px' }}>
          {open ? '︿' : '﹀'}
        </button>
      </div>

      {/* Legenda */}
      <div style={{ padding:'6px 16px 12px', borderBottom:`1px solid ${C.border}`, display:'flex', flexWrap:'wrap', gap:'5px 14px' }}>
        {Object.entries(ESTADO).filter(([k])=>k!=='em_curso').map(([id,cfg])=>(
          <div key={id} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:cfg.cor }}/>
            <span style={{ fontSize:10, color:'#64748b' }}>{cfg.l}</span>
          </div>
        ))}
      </div>

      {/* Serviços do dia */}
      <div style={{ paddingBottom:80 }}>
        <div style={{ padding:'12px 16px 6px', fontSize:10, fontWeight:800, color:'#64748b', letterSpacing:'0.06em', textTransform:'uppercase' }}>
          {DN[new Date(ano,mes,dia).getDay()]}-FEIRA, {MESES[mes].substring(0,3).toUpperCase()} {p2(dia)}
        </div>

        {servicosDia.length === 0 ? (
          <div style={{ padding:'24px 16px', textAlign:'center', color:'#94a3b8', fontSize:13 }}>
            Sem serviços neste dia
          </div>
        ) : servicosDia.map((s, i) => {
          const cfg = ESTADO[s.estado] || ESTADO.agendado
          return (
            <div
              key={s.id}
              onClick={() => onServico?.(s)}
              style={{
                display:'flex', alignItems:'center', gap:14, padding:'14px 16px',
                borderBottom: i<servicosDia.length-1 ? `1px solid ${C.mist}` : 'none',
                cursor:'pointer',
              }}
            >
              <div style={{ width:50, textAlign:'right', flexShrink:0 }}>
                <span style={{ fontSize:13, color:'#64748b', fontWeight:500 }}>{s.hora}h</span>
              </div>
              <div style={{ width:10, height:10, borderRadius:'50%', background:cfg.cor, flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:700, color:'#0f172a' }}>{s.nome}</div>
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{cfg.l}</div>
                {s.local && <div style={{ fontSize:10, color:'#94a3b8', marginTop:1 }}>📍 {s.local}</div>}
              </div>
              <span style={{ color:C.border, fontSize:18 }}>›</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const btnNav = {
  background:'none', border:'none', cursor:'pointer',
  fontSize:22, color:'#0f172a', padding:'4px 12px',
  borderRadius:8, fontWeight:700,
}
