/**
 * Centraliza a lógica de labels do Home Score.
 * Utilizador sem dados (null) → estado neutro, nunca alarmista.
 */
export function scoreLabel(score) {
  if (score == null || score === 0) return { text: 'Por avaliar', tone: 'neutral', emoji: '🏠' }
  if (score >= 80) return { text: 'Excelente',          tone: 'good',    emoji: '🌟' }
  if (score >= 60) return { text: 'Saudável',           tone: 'good',    emoji: '🌱' }
  if (score >= 40) return { text: 'A melhorar',         tone: 'warn',    emoji: '⚠️' }
  return               { text: 'Atenção necessária', tone: 'alert',   emoji: '🔧' }
}

/** Formato curto para labels inline (emoji + text) */
export function scoreLabelShort(score) {
  const { emoji, text } = scoreLabel(score)
  return `${emoji} ${text}`
}

/** Formato para IniciaScreen ("Casa Saudável 🌱") */
export function casaScoreLabel(score) {
  if (score == null || score === 0) return 'Casa por avaliar 🏠'
  if (score >= 80) return 'Casa Excelente 🌟'
  if (score >= 60) return 'Casa Saudável 🌱'
  if (score >= 40) return 'Casa a Melhorar ⚠️'
  return 'Casa com Atenção 🔧'
}
