// Motor de comparação tarifária — TAR 2026 ERSE
// Fórmula: (TAR_fixo_kVA + (TAR_energia + spread) × kWh + CAV + IEC) × 1.23 IVA

export const TAR_FIXED_MENSAL = {
  1.15: 1.22, 2.3: 2.44, 3.45: 3.65, 4.6: 4.87, 5.75: 6.09,
  6.9: 7.31, 10.35: 10.96, 13.8: 14.62, 17.25: 18.27,
  20.7: 21.93, 27.6: 29.24, 34.5: 36.55, 41.4: 43.86,
};
export const TAR_ENERGIA = 0.0689;
export const CAV = 2.85;
export const IEC_KWH = 0.001;
export const IVA = 1.23;
export const KVA_LIST = [3.45, 6.9, 10.35, 13.8, 20.7, 27.6, 41.4];

// segmento === 'condominio' aplica desconto de grupo 5%
export function calcMensal(kwh, kva, comerz, segmento) {
  const spread = Number(comerz.spread_kwh ?? comerz.spread ?? 0);
  const fixed = TAR_FIXED_MENSAL[kva] || 7.31;
  const energy = (TAR_ENERGIA + spread) * kwh;
  const taxes = CAV + IEC_KWH * kwh;
  const net = (fixed + energy + taxes) * (segmento === 'condominio' ? 0.95 : 1);
  return +(net * IVA).toFixed(2);
}

export function runMotor(kwh, kva, currentPrice, segmento, comerzList) {
  return comerzList
    .map((c) => {
      const mensal = calcMensal(kwh, kva, c, segmento);
      const saving = +(currentPrice - mensal).toFixed(2);
      return {
        ...c,
        mensal,
        saving,
        annual: +((currentPrice - mensal) * 12).toFixed(0),
      };
    })
    .sort((a, b) => a.mensal - b.mensal);
}
