// Calcula completude (0–100%) de um imóvel baseado nos campos preenchidos

const CAMPOS = [
  { id: 'nome',       label: 'Nome do imóvel',  peso: 10, check: im => !!im.nome },
  { id: 'tipo',       label: 'Tipo',             peso: 10, check: im => !!im.tipo },
  { id: 'morada',     label: 'Morada',           peso: 15, check: im => !!(im.morada || im.rua) },
  { id: 'area',       label: 'Área (m²)',        peso: 10, check: im => !!im.area_m2 },
  { id: 'tipologia',  label: 'Tipologia',        peso: 10, check: im => !!im.tipologia },
  { id: 'quartos',    label: 'Nº quartos',       peso: 5,  check: im => im.num_quartos != null },
  { id: 'wcs',        label: 'Nº casas de banho',peso: 5,  check: im => im.num_wcs != null },
  { id: 'coords',     label: 'Localização GPS',  peso: 10, check: im => !!im.coords },
  { id: 'foto',       label: 'Foto principal',   peso: 10, check: im => !!im.foto_principal_url },
  { id: 'fiscal',     label: 'Perfil fiscal',    peso: 15, check: im => !!im.perfil_fiscal_id },
]

export function calcularCompletude(imovel) {
  if (!imovel) return { pct: 0, faltam: [] }
  const faltam = CAMPOS.filter(c => !c.check(imovel))
  const pesoTotal   = CAMPOS.reduce((s, c) => s + c.peso, 0)
  const pesoCumprido = CAMPOS.filter(c => c.check(imovel)).reduce((s, c) => s + c.peso, 0)
  const pct = Math.round((pesoCumprido / pesoTotal) * 100)
  return { pct, faltam }
}

export function corCompletude(pct) {
  if (pct >= 80) return '#1B4332'  // verde escuro
  if (pct >= 50) return '#F59E0B'  // âmbar
  return '#DC2626'                 // vermelho
}
