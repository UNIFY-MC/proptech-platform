// Validadores partilhados — Sprint 1D Receipt Trojan Horse
// Usados em PrestadorOnboardingFlow (prestador anónimo) e OnboardingWizardScreen (owner)

export function validarNIF(nif) {
  if (!/^[0-9]{9}$/.test(nif)) return false
  const first = parseInt(nif[0])
  if (first === 0) return false
  const weights = [9, 8, 7, 6, 5, 4, 3, 2]
  let sum = 0
  for (let i = 0; i < 8; i++) sum += parseInt(nif[i]) * weights[i]
  const remainder = sum % 11
  const expected = remainder < 2 ? 0 : 11 - remainder
  return expected === parseInt(nif[8])
}

export function validarTelefonePT(t) {
  if (!t || t.trim() === '') return false
  return /^(\+351)?[\s]?[0-9]{9}$/.test(t.replace(/\s/g, ''))
}

export function validarEmail(e) {
  if (!e || e.trim() === '') return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())
}
