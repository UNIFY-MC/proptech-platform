/**
 * SNAPSHOT PRÉ-3.4A — AuthScreen original (visual mock, Google/Apple/OTP)
 * Preservado como referência. NÃO importar nem usar directamente.
 * Substituído pelas screens em src/screens/auth/ na Fase 3.4A.
 * Google OAuth → 3.4D · Apple → Fase 5 · OTP/Magic Link → 3.4D
 *
 * Dependências internas (App.jsx): SB_URL, SB_KEY, sbSignIn, demoLogin
 * Props: onAuth({ user, token, role, nome, demo })
 */

// eslint-disable-next-line
export default function AuthScreen_SNAPSHOT_PRE_3_4A({ onAuth }) {
  // step: 'welcome' | 'otp_input' | 'otp_code' | 'role' | 'categories' | 'pending' | 'success'
  // Fluxo: welcome → otp_input → otp_code → role → (cli_morada → cli_servicos) | (categories → prest_docs → pending)
  // Demo bypass: botões Cliente / Prestador / Admin chamam demoLogin() directamente
  //
  // Extracto completo abaixo para referência visual.
  // Ver git log para histórico de alterações.
  return null
}
