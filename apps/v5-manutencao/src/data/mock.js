// DEPRECATED — usado apenas como referência de shape de dados.
// Fase 3.3.9: todas as screens foram migradas para Supabase. Remover na Fase 4 (auth real).
export const MOCK = {
  pessoa: {
    id: 'demo-maria',
    nome: 'Maria Santos',
    email: 'maria.santos+demo@example.pt',
    telefone: '+351 912 345 678',
    nif: '258741369',
    data_nascimento: '1985-03-12',
    idioma: 'pt-PT',
    foto_url: null,
    nivel: 'Prata', pontos_total: 1420, streak_dias: 14, recorde_streak: 31,
    membro_desde: '2024-08-15',
  },
  imoveis: [
    { id:'im-1', nome:'Casa Principal', tipo:'casa',
      morada:'R. Palmira Bastos, 2', cp:'3000-001', cidade:'Coimbra',
      home_score:74, principal:true, criado:'2024-08-15' },
    { id:'im-2', nome:'Apartamento Lisboa', tipo:'apartamento',
      morada:'Av. da Liberdade, 110, 4ºE', cp:'1250-145', cidade:'Lisboa',
      home_score:62, principal:false, criado:'2025-01-10' },
    { id:'im-3', nome:'Casa de Férias', tipo:'casa',
      morada:'R. do Mar, 5', cp:'8000-100', cidade:'Faro',
      home_score:55, principal:false, criado:'2025-04-20' },
  ],
  pontos_historico: [
    { id:'p1', motivo:'Completei missão Verificar caleiras', emoji:'🌧️', pontos:200, data:'2026-04-22' },
    { id:'p2', motivo:'Upload de garantia caldeira',         emoji:'📄', pontos:30,  data:'2026-04-20' },
    { id:'p3', motivo:'Avaliei João Ferreira',              emoji:'⭐', pontos:50,  data:'2026-04-18' },
    { id:'p4', motivo:'Subscrição Home+ activada',          emoji:'💎', pontos:500, data:'2026-04-01' },
    { id:'p5', motivo:'Streak 14 dias',                     emoji:'🔥', pontos:140, data:'2026-04-15' },
    { id:'p6', motivo:'Primeira avaliação dada',            emoji:'⭐', pontos:25,  data:'2026-03-25' },
    { id:'p7', motivo:'Home Assessment completo',           emoji:'🏠', pontos:300, data:'2026-03-10' },
    { id:'p8', motivo:'Referiu amigo activo',               emoji:'🎁', pontos:175, data:'2026-02-28' },
  ],
  avaliacoes_dadas: [
    { id:'av1', prestador:'João Ferreira',   servico:'Revisão caldeira',       rating:5, texto:'Profissional impecável, chegou a horas',          data:'2026-04-18' },
    { id:'av2', prestador:'Sandra Matos',    servico:'Limpeza profunda',        rating:4, texto:'Bom trabalho mas demorou mais do que combinado',   data:'2026-03-22' },
    { id:'av3', prestador:'Ricardo Gomes',   servico:'Pintura sala',            rating:5, texto:'Resultado excelente, muito cuidadoso',             data:'2026-02-10' },
    { id:'av4', prestador:'António Ferreira',servico:'Desentupimento WC',       rating:5, texto:'Rápido e eficiente, problema resolvido em 30 min', data:'2026-01-15' },
    { id:'av5', prestador:'Sandra Matos',    servico:'Limpeza janelas exteriores',rating:4,texto:'Bom resultado geral',                             data:'2025-12-20' },
  ],
  metodos_pagamento: [
    { id:'mp1', tipo:'cartao', marca:'Visa',  last4:'4242', validade:'12/27', principal:true  },
    { id:'mp2', tipo:'mbway',  telefone:'+351 912 ••• 678',                   principal:false },
  ],
  notificacoes: [
    { id:'n1', tipo:'urgente', titulo:'Chuva forte prevista',      sub:'IPMA · Coimbra · próximas 48h',             tempo:'há 2h',   lido:false, emoji:'🌧️' },
    { id:'n2', tipo:'info',    titulo:'Caldeira com 8 anos',       sub:'Eficiência reduzida · revisão recomendada', tempo:'há 1d',   lido:false, emoji:'⚠️' },
    { id:'n3', tipo:'sucesso', titulo:'Pedido concluído',          sub:'João Ferreira terminou a revisão',          tempo:'há 3d',   lido:true,  emoji:'✅' },
    { id:'n4', tipo:'info',    titulo:'Novo serviço disponível',   sub:'Pack Pré-Verão com 20% desconto',           tempo:'há 4d',   lido:true,  emoji:'🌞' },
    { id:'n5', tipo:'urgente', titulo:'Garantia a expirar',        sub:'Garantia da caldeira expira em 15 dias',    tempo:'há 5d',   lido:false, emoji:'📄' },
    { id:'n6', tipo:'sucesso', titulo:'Pontos ganhos',             sub:'+200 pts · Missão verificar caleiras',      tempo:'há 3d',   lido:true,  emoji:'⭐' },
    { id:'n7', tipo:'info',    titulo:'João Ferreira disponível',  sub:'O teu técnico preferido tem slots livres',  tempo:'há 6d',   lido:true,  emoji:'🔧' },
    { id:'n8', tipo:'sucesso', titulo:'Subscrição renovada',       sub:'Home+ · próxima renovação 1 Jun 2026',      tempo:'há 1sem', lido:true,  emoji:'💎' },
  ],
  referidos: [
    { id:'r1', nome:'João S.',  estado:'completou', credito:25, data:'2026-03-15' },
    { id:'r2', nome:'Ana M.',   estado:'pendente',  credito:0,  data:'2026-04-10' },
    { id:'r3', nome:'Pedro L.', estado:'completou', credito:25, data:'2026-02-28' },
  ],
  prestadores_favoritos: [
    { id:'pr1', iniciais:'JF', nome:'João Ferreira',    categorias:['Canalização','Eléctrica'], rating:4.9, total_visitas:12, principal:false },
    { id:'pr2', iniciais:'RG', nome:'Ricardo Gomes',    categorias:['Manutenção','Pintura'],    rating:5.0, total_visitas:8,  principal:false },
    { id:'pr3', iniciais:'SM', nome:'Sandra Matos',     categorias:['Limpeza','Obras'],         rating:4.9, total_visitas:15, principal:true  },
  ],
  faq: [
    { p:'Como cancelo um pedido?',           r:'Vai a Pedidos → toca no pedido → "Cancelar". Cancelamento gratuito até 24h antes.' },
    { p:'O que é o Home+?',                  r:'Subscrição mensal de 6,90€ que dá 5% de desconto em todos os serviços + 10% em crédito.' },
    { p:'Como funciona o Owners Club?',      r:'Programa de fidelização que junta manutenção, energia e seguro. Poupas até 180€/ano.' },
    { p:'Quanto tempo demora um pedido?',    r:'Serviços imediatos: 30-60 min. Serviços agendados: conforme disponibilidade do técnico.' },
    { p:'Os técnicos são verificados?',      r:'Sim, todos têm NIF validado, seguro de RC e avaliação mínima de 4.0 estrelas.' },
    { p:'Posso pagar com MB WAY?',           r:'Sim. Aceitamos MB WAY, cartão Visa/Mastercard e referência MB.' },
    { p:'O que é o Home Score?',             r:'Índice de 0-100 que mede a saúde da tua casa. Sobe com serviços concluídos e documentos subidos.' },
    { p:'Como ganho pontos?',                r:'Por cada serviço concluído, avaliação dada, missão cumprida e documento carregado.' },
  ],
}

export function codigoReferral(pessoa) {
  const primeiro = (pessoa.nome || '').split(' ')[0].toUpperCase()
  const sufixo   = (pessoa.id   || '').slice(-4).toUpperCase()
  return `${primeiro}-${sufixo}`
}
