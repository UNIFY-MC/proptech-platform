/**
 * Configuração central de branding.
 * Quando o produto for rebranded, alterar APENAS este ficheiro.
 * Codename de trabalho: "Zelo" (decisão pendente confirmação Mario).
 */
export const BRAND = {
  // Nome público
  name: 'V5 Manutenção',           // → futuro "Zelo" ou outro
  shortName: 'V5',                  // → futuro "Zelo"
  tagline: 'A tua casa cuidada',    // → futuro tagline definitivo

  // Identidade visual
  emoji: '🏠',                      // → futuro SVG component
  primaryColor: '#0B3D2E',          // verde escuro V5
  accentColor: '#10B981',           // verde claro V5
  goldColor: '#F59E0B',             // gamificação

  // Comunicação
  supportEmail: 'info@prataowners.pt',
  noReplyEmail: 'noreply@prataowners.pt',
  domain: 'prataowners.pt',
  publicUrl: 'https://prataowners.pt', // → futuro domínio dedicado V5

  // Meta SEO
  metaDescription: 'Manutenção e limpeza profissional para a tua casa em Portugal',
  metaKeywords: 'manutenção casa, limpeza, serviços domésticos, portugal',

  // Legal
  companyName: 'Property7 Lda', // → confirmar nome legal real com Mario

  // Versão — actualizar a cada sprint
  version: '0.5.3',
  buildEnv: typeof import.meta !== 'undefined' ? import.meta.env?.MODE ?? 'dev' : 'dev',
};

export default BRAND;
