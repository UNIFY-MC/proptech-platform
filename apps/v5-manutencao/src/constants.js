// src/constants.js — v5-manutencao 2026.0420 2141

export const C = {
  g:'#16a34a', gd:'#14532d', gl:'#dcfce7', gm:'#22c55e',
  navy:'#0f172a', navyM:'#1e293b', slate:'#64748b',
  border:'#e2e8f0', mist:'#f8fafc', white:'#fff',
  amber:'#f59e0b', red:'#ef4444',
  copper:'#C17E3A', copperL:'#E8A857',
}

export const CATS = [
  {id:'limpeza',    l:'Limpeza',     ic:'🧹', cor:'#16a34a'},
  {id:'manutencao', l:'Manutenção',  ic:'🔧', cor:'#0ea5e9'},
  {id:'jardim',     l:'Jardim',      ic:'🌿', cor:'#22c55e'},
  {id:'piscina',    l:'Piscina',     ic:'🏊', cor:'#06b6d4'},
  {id:'pintura',    l:'Pintura',     ic:'🎨', cor:'#f97316'},
  {id:'eletrica',   l:'Elétrica',    ic:'⚡', cor:'#eab308'},
  {id:'canalizacao',l:'Canalização', ic:'🚿', cor:'#8b5cf6'},
  {id:'obra',       l:'Pós-Obra',    ic:'🏗️', cor:'#78716c'},
]

export const SVCS = [
  {id:'s1',cat:'limpeza',    n:'Plano Anual Preventivo', p:49, u:'/mês',    d:'Recorrente',r:4.9,rv:312,badge:'Destaque',ic:'🛡️'},
  {id:'s2',cat:'limpeza',    n:'Limpeza Mensal',         p:75, u:'/visita', d:'3–5h',      r:4.8,rv:840,badge:null,      ic:'🧹'},
  {id:'s3',cat:'limpeza',    n:'Limpeza Pós-Obra',       p:120,u:'fixo',    d:'4–8h',      r:4.9,rv:220,badge:'Popular', ic:'🏗️'},
  {id:'s4',cat:'jardim',     n:'Manutenção de Jardim',   p:45, u:'/visita', d:'2–3h',      r:4.7,rv:190,badge:null,      ic:'🌿'},
  {id:'s5',cat:'piscina',    n:'Manutenção de Piscina',  p:55, u:'/visita', d:'1–2h',      r:4.8,rv:140,badge:null,      ic:'🏊'},
  {id:'s6',cat:'canalizacao',n:'Urgência Canalização',   p:65, u:'fixo',    d:'1–2h',      r:4.9,rv:390,badge:'Urgente', ic:'🚿'},
  {id:'s7',cat:'eletrica',   n:'Instalação Elétrica',    p:80, u:'fixo',    d:'2–4h',      r:4.8,rv:210,badge:null,      ic:'⚡'},
  {id:'s8',cat:'pintura',    n:'Pintura de Divisão',     p:90, u:'fixo',    d:'4–6h',      r:4.7,rv:160,badge:null,      ic:'🎨'},
]

export const TECNICOS = [
  {id:'p1',n:'António Ferreira',ini:'AF',cats:['limpeza','obra'],    r:4.9,jobs:340,anos:8, loc:'Caldas da Rainha',st:'activo', ok:true,iban:'PT50 0035…',nivel:'gold'},
  {id:'p2',n:'Ricardo Gomes',   ini:'RG',cats:['canalizacao','eletrica'],r:4.8,jobs:520,anos:12,loc:'Óbidos',        st:'activo', ok:true,iban:'PT50 0010…',nivel:'silver'},
  {id:'p3',n:'Sandra Matos',    ini:'SM',cats:['limpeza'],            r:5.0,jobs:190,anos:6, loc:'Caldas da Rainha',st:'activo', ok:true,iban:'PT50 0033…',nivel:'base'},
  {id:'p4',n:'Manuel Costa',    ini:'MC',cats:['jardim','piscina'],   r:4.7,jobs:210,anos:9, loc:'Alcobaça',        st:'ocupado',ok:true,iban:'PT50 0020…',nivel:'silver'},
]

export const REVIEWS = [
  {n:'Ana S.',    c:'Caldas da Rainha',t:'Serviço incrível! O técnico foi pontual e muito cuidadoso.',         r:5,svc:'Limpeza Mensal',      tec:'António F.'},
  {n:'Carlos M.', c:'Óbidos',          t:'Urgência de canalização resolvida em 1h. Muito profissional.',       r:5,svc:'Urgência Canalização', tec:'Ricardo G.'},
  {n:'Maria A.',  c:'Leiria',          t:'Já sou cliente há 2 anos. Sempre o mesmo técnico, sempre excelente.',r:5,svc:'Plano Anual',           tec:'Sandra M.'},
]

export const ORDENS_INIT = [
  {id:'ot1',sid:'s2',cli:'Sr. Ferreira',morada:'Rua das Flores, 23',  data:'Hoje 14:00',  tid:'p1',st:'em_curso', fotos:[],               ass:false,aval:null,notas:'3.º andar'},
  {id:'ot2',sid:'s6',cli:'Cond. Verde', morada:'Av. da Liberdade, 10',data:'Amanhã 10:00',tid:null,st:'pendente', fotos:[],               ass:false,aval:null,notas:'Fuga na cave'},
  {id:'ot3',sid:'s4',cli:'Sra. Alves', morada:'Quinta Rosas, Óbidos', data:'12 Abr',      tid:'p4',st:'concluida',fotos:['🌿','📷','📷'],ass:true, aval:5,   notas:''},
  {id:'ot4',sid:'s2',cli:'Cond. Sol',  morada:'Rua do Sol, 5',        data:'15 Abr',      tid:null,st:'pendente', fotos:[],               ass:false,aval:null,notas:''},
]

export const MOVS = [
  {id:'m1',tipo:'credito', v:57.00, d:'Limpeza Mensal — Rua das Flores', dt:'Hoje 14:32',  st:'disponivel',oid:'ot1'},
  {id:'m2',tipo:'credito', v:57.00, d:'Limpeza Mensal — Av. Brasil',     dt:'Ontem 11:15', st:'disponivel',oid:'ot2'},
  {id:'m3',tipo:'credito', v:91.00, d:'Limpeza Pós-Obra — Ed. Roma',     dt:'12 Abr',      st:'disponivel',oid:'ot3'},
  {id:'m4',tipo:'levantar',v:-145.00,d:'Levantamento IBAN pessoal',      dt:'10 Abr',      st:'processado', oid:null},
  {id:'m5',tipo:'bonus',   v:10.00, d:'Bónus avaliação perfeita — Março',dt:'1 Abr',       st:'disponivel',oid:null},
  {id:'m6',tipo:'seguro',  v:-8.50, d:'Seguro RC Grupo — Abril',         dt:'1 Abr',       st:'processado', oid:null},
  {id:'m7',tipo:'credito', v:34.00, d:'Manutenção Jardim — Sra. Alves',  dt:'28 Mar',      st:'disponivel',oid:'ot4'},
]

export const NIVEIS = {
  base:  {l:'Base',  ic:'🟤',cor:'#92400e',bg:'#fef3c7',taxa:22,min:0,   mr:0},
  silver:{l:'Silver',ic:'⚪',cor:'#64748b',bg:'#f1f5f9',taxa:20,min:50,  mr:4.5},
  gold:  {l:'Gold',  ic:'🟡',cor:'#b45309',bg:'#fef3c7',taxa:18,min:200, mr:4.7},
  elite: {l:'Elite', ic:'🟢',cor:'#14532d',bg:'#dcfce7',taxa:16,min:500, mr:4.8},
}

export const BENEFICIOS = [
  {id:'b1',n:'Seguro RC em Grupo',  ic:'🛡️',d:'Apólice negociada para a rede. Poupança de 35% face ao mercado.',                            nivel:'silver',preco:'€8,50/mês'},
  {id:'b2',n:'Fundo de Equipamento',ic:'🔧',d:'Adiantamento para ferramentas profissionais, sem juros. Desconto automático nas ordens.',     nivel:'gold',  preco:'Sem juros'},
  {id:'b3',n:'Formação Certificada',ic:'📜',d:'Certificações (gás, electricidade, AVAC) com desconto de 40%.',                               nivel:'base',  preco:'Desde €45'},
  {id:'b4',n:'Cartão Combustível',  ic:'⛽',d:'Desconto de 4% em combustível e portagens com parceiro da rede.',                             nivel:'silver',preco:'Sem custo'},
]

// Lookup helpers
export const svcById  = id => SVCS.find(s => s.id === id)
export const tecById  = id => TECNICOS.find(t => t.id === id)
export const catById  = id => CATS.find(c => c.id === id)

// Servicos do calendário (demo — substituir por Supabase)
export const SERVICOS_CAL = [
  {id:'c1',data:'2026-04-20',hora:'14:00',nome:'Limpeza Mensal',    estado:'em_curso',  local:'Rua das Flores, 23'},
  {id:'c2',data:'2026-04-22',hora:'09:00',nome:'Manutenção Jardim', estado:'agendado',  local:'Quinta Rosas, Óbidos'},
  {id:'c3',data:'2026-04-22',hora:'14:00',nome:'Limpeza Mensal',    estado:'a_confirmar',local:'Rua do Sol, 5'},
  {id:'c4',data:'2026-04-25',hora:'11:00',nome:'Manutenção Piscina',estado:'agendado',  local:'Av. Central, 45'},
  {id:'c5',data:'2026-04-27',hora:'09:00',nome:'Limpeza Mensal',    estado:'agendado',  local:'Rua Nova, 12'},
  {id:'c6',data:'2026-04-12',hora:'10:00',nome:'Manutenção Jardim', estado:'concluido', local:'Quinta Rosas, Óbidos'},
]
