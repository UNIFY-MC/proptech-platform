// Motor de comparação tarifária — TAR 2026 ERSE
// Fórmula: (TAR_fixo_kVA + preco_kwh × kWh + CAV + IEC × kWh) × IVA
// Versão 2.0 — BD-driven (async). Fallback hardcoded para protecção produção.

import { fetchTarifasActivas } from './queries.js';

// ─────────────────────────────────────────────────────────────────────────
//  CONSTANTES ERSE 2026 (regulatório — não mudam com spreads de comercializador)
// ─────────────────────────────────────────────────────────────────────────
export const TAR_FIXED_MENSAL = {
  1.15: 1.22, 2.3: 2.44, 3.45: 3.65, 4.6: 4.87, 5.75: 6.09,
  6.9: 7.31, 10.35: 10.96, 13.8: 14.62, 17.25: 18.27,
  20.7: 21.93, 27.6: 29.24, 34.5: 36.55, 41.4: 43.86,
};
export const TAR_ENERGIA = 0.0689; // €/kWh base ERSE
export const CAV = 2.85;           // €/mês contribuição audiovisual
export const IEC_KWH = 0.001;      // €/kWh imposto especial consumo
export const IVA = 1.23;
export const DESCONTO_CONDOMINIO = 0.05; // 5% desconto grupo
export const KVA_LIST = [3.45, 6.9, 10.35, 13.8, 20.7, 27.6, 41.4];

// ─────────────────────────────────────────────────────────────────────────
//  FALLBACK HARDCODED — protecção para quando BD está vazia ou inacessível
//  preco_kwh = TAR_ENERGIA (0.0689) + spread de cada comercializador
// ─────────────────────────────────────────────────────────────────────────
const FALLBACK_TARIFAS = [
  { nome_plano: 'Eni Plenitude Simples BTN', preco_kwh: 0.1289, tipo_oferta: 'fixa',   comercializadores: { nome: 'Eni Plenitude' } },
  { nome_plano: 'Luzboa Simples BTN',        preco_kwh: 0.1319, tipo_oferta: 'fixa',   comercializadores: { nome: 'Luzboa' } },
  { nome_plano: 'Ibelectra Simples BTN',     preco_kwh: 0.1379, tipo_oferta: 'fixa',   comercializadores: { nome: 'Ibelectra' } },
  { nome_plano: 'Goldenergy Simples BTN',    preco_kwh: 0.1429, tipo_oferta: 'fixa',   comercializadores: { nome: 'Goldenergy' } },
  { nome_plano: 'Coopernico Simples BTN',    preco_kwh: 0.1399, tipo_oferta: 'verde',  comercializadores: { nome: 'Coopernico' } },
  { nome_plano: 'Endesa Simples BTN',        preco_kwh: 0.1509, tipo_oferta: 'fixa',   comercializadores: { nome: 'Endesa' } },
  { nome_plano: 'Galp Power Simples BTN',    preco_kwh: 0.1569, tipo_oferta: 'fixa',   comercializadores: { nome: 'Galp Power' } },
  { nome_plano: 'EDP Comercial Simples BTN', preco_kwh: 0.1751, tipo_oferta: 'fixa',   comercializadores: { nome: 'EDP Comercial' } },
];

// ─────────────────────────────────────────────────────────────────────────
//  calcularPropostas — função principal (async, BD-driven)
//  Recebe: kwh_mensal, kva, segmento ('particular' | 'empresa' | 'condominio')
//  Devolve: lista de propostas ordenadas por custo mensal crescente
// ─────────────────────────────────────────────────────────────────────────
export async function calcularPropostas({ kwh_mensal, kva = 6.9, segmento = 'particular' } = {}) {
  let tarifas = await fetchTarifasActivas({ kva, tipo_energia: 'electricidade', tensao: 'BTN' });

  // Fallback se BD vazia ou inacessível
  let usandoFallback = false;
  if (!tarifas || tarifas.length === 0) {
    console.warn('[motor] BD sem tarifas activas — a usar fallback hardcoded');
    tarifas = FALLBACK_TARIFAS;
    usandoFallback = true;
  }

  // Custo fixo mensal da rede para este kVA
  const tarFixo = TAR_FIXED_MENSAL[kva] ?? TAR_FIXED_MENSAL[6.9];

  const propostas = tarifas.map((t) => {
    const preco_kwh = Number(t.preco_kwh);
    const mensal_sem_iva = tarFixo + preco_kwh * kwh_mensal + CAV + IEC_KWH * kwh_mensal;
    let mensal_c_iva = mensal_sem_iva * IVA;
    if (segmento === 'condominio') mensal_c_iva *= (1 - DESCONTO_CONDOMINIO);

    return {
      id: t.id || null,
      comercializador: t.comercializadores?.nome || t.nome_plano,
      // campo 'nome' mantido por compatibilidade com componentes existentes
      nome: t.comercializadores?.nome || t.nome_plano,
      plano: t.nome_plano,
      tipo_oferta: t.tipo_oferta || 'fixa',
      preco_kwh,
      mensal: Math.round(mensal_c_iva * 100) / 100,
      anual: Math.round(mensal_c_iva * 12 * 100) / 100,
      // campo 'annual' mantido por compatibilidade com componentes existentes
      annual: Math.round(mensal_c_iva * 12 * 100) / 100,
      fonte: usandoFallback ? 'fallback' : (t.fonte_ingestao || 'manual'),
    };
  });

  // Ordenar por custo mensal crescente
  return propostas.sort((a, b) => a.mensal - b.mensal);
}

// ─────────────────────────────────────────────────────────────────────────
//  runMotor — wrapper legacy para compatibilidade com ClienteSimulator.jsx
//  Assinatura antiga: runMotor(kwh, kva, currentPrice, segmento, comerzList)
//  Nova: delega para calcularPropostas e adiciona campo 'saving' e 'annual'
//  NOTA: currentPrice e comerzList são ignorados — motor lê de BD agora.
//  @deprecated — usar calcularPropostas() directamente em código novo
// ─────────────────────────────────────────────────────────────────────────
export async function runMotor(kwh, kva, currentPrice, segmento) {
  const propostas = await calcularPropostas({ kwh_mensal: kwh, kva, segmento });
  // Adicionar campo saving relativo ao currentPrice fornecido
  return propostas.map((p) => ({
    ...p,
    saving: +(currentPrice - p.mensal).toFixed(2),
    annual: +((currentPrice - p.mensal) * 12).toFixed(0),
  }));
}
