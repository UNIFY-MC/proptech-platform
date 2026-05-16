// IntegrationDetailModal — modal unificado por integration
// Quando connected: mostra dados ligação + configs + disconnect
// Quando not_connected: mostra setup steps + connect button
// Sprint Q5b — unified integrations UX

import { useState } from 'react'
import { X, ExternalLink, Check, Loader2, Settings, BookOpen, Link as LinkIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'

// Setup steps por integration slug (markdown). Adiciona aqui à medida que vamos
// implementando flows. Para slugs não listados → mensagem genérica.
const SETUP_STEPS = {
  'discord': `### Setup Discord Webhook
1. Cria (ou usa) um **server Discord** com o channel onde queres receber updates
2. Click direito no channel → **Edit Channel** → **Integrations** → **Webhooks** → **Create Webhook**
3. Dá-lhe um nome (ex: \`Bia\`) e copia o **Webhook URL**
4. Vai a **[/connections/discord](/connections/discord)** e cola URL na linha do agent
5. Click **Save** → **Test send** para confirmar`,

  'gmail': `### Setup Gmail
1. Property007 usa **Gmail Push API** (notifications via webhook) — não OAuth tradicional
2. No console GCP: **Cloud Console → Pub/Sub → Create topic** \`property007-gmail\`
3. Conectar Pub/Sub à mailbox: \`POST /gmail/v1/users/me/watch\` (TODO automatizado em Sprint X)
4. Por agora: pedir ao Mário para te dar email property007-pipe@gmail.com e configurar manualmente`,

  'gmail-inbound': `### Gmail Inbound
1. Configurar **forwarding** do email empresa para \`xxx@inbound.property007.pt\`
2. Endpoint \`gmail-inbound\` edge fn já recebe e classifica via Claude Haiku
3. Cria task com kind=email_reply + needs_human para revisão antes de enviar`,

  'toconline': `### Setup Toconline
1. Login em [toconline.pt](https://toconline.pt) → **Definições → API**
2. Gerar API key + copiar **Account ID**
3. Adicionar como Supabase secret: \`TOCONLINE_API_KEY=xxx\`
4. (TODO) Implementar OAuth flow + edge fn \`toconline-sync\``,

  'whatsapp': `### Setup WhatsApp Business (via Unipile/Evolution)
**Opção A — Unipile (recomendado):**
1. Conta em [unipile.com](https://unipile.com) (free trial 7 dias)
2. Connect WhatsApp via QR code
3. API key → Supabase secret \`UNIPILE_API_KEY\`

**Opção B — Evolution API (self-hosted):**
1. VPS Hostinger 4€/mês + Docker
2. Deploy Evolution API + QR code login`,

  'stripe': `### Setup Stripe
1. Conta em [stripe.com](https://stripe.com) → Test mode primeiro
2. **API keys** → publishable + secret
3. Adicionar como Supabase secrets: \`STRIPE_PUBLISHABLE_KEY\` + \`STRIPE_SECRET_KEY\`
4. (TODO) webhook \`stripe-inbound\` para events`,

  'resend': `### Setup Resend (transactional email)
1. Conta em [resend.com](https://resend.com) (3k emails/mês free)
2. Verificar domínio \`property007.pt\` (DNS SPF/DKIM/DMARC)
3. API key → Supabase secret \`RESEND_API_KEY\`
4. Edge fn \`gmail-send\` usa-a quando presente; senão fallback mailto`,

  'browserbase': `### Setup Browserbase (Playwright cloud)
1. Conta em [browserbase.com](https://browserbase.com) — 60 sessions/mês free
2. **Settings → API Keys** → criar key
3. Adicionar como Supabase secret: \`BROWSERBASE_API_KEY\`
4. Agents passam a usar Browserbase em \`web_browse\` para sites JS-heavy (dre.pt)`,

  'replicate': `### Setup Replicate (hosted AI models)
1. Conta em [replicate.com](https://replicate.com)
2. **Account → API tokens** → criar token
3. Adicionar como Supabase secret: \`REPLICATE_API_TOKEN\`
4. Útil para Whisper transcrição, FLUX images, fallback LLMs`,
}

function getSetupSteps(integ) {
  if (!integ?.slug) return null
  const slug = integ.slug.toLowerCase()
  if (SETUP_STEPS[slug]) return SETUP_STEPS[slug]
  for (const key of Object.keys(SETUP_STEPS)) {
    if (slug.includes(key)) return SETUP_STEPS[key]
  }
  return null
}

// Map de configs management URLs (para connected state, link para gerir dados)
const MANAGE_URLS = {
  'discord': '/connections/discord',
}
function getManageUrl(integ) {
  if (!integ?.slug) return null
  const slug = integ.slug.toLowerCase()
  if (MANAGE_URLS[slug]) return MANAGE_URLS[slug]
  for (const key of Object.keys(MANAGE_URLS)) {
    if (slug.includes(key)) return MANAGE_URLS[key]
  }
  return null
}

export default function IntegrationDetailModal({ integ, busy, onToggle, onClose }) {
  if (!integ) return null
  const status = integ.status || 'not_connected'
  const isConnected = status === 'connected'
  const isComing = status === 'coming_soon'
  const setupSteps = getSetupSteps(integ)
  const manageUrl = getManageUrl(integ)

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', justifyContent: 'flex-end', zIndex: 1100,
    }}>
      <aside onClick={(e) => e.stopPropagation()} style={{
        width: 520, maxWidth: '94vw', height: '100vh',
        background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {integ.brand_color && (
              <div style={{
                width: 42, height: 42, borderRadius: 8,
                background: integ.brand_color + '22',
                border: `1px solid ${integ.brand_color}66`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: integ.brand_color, fontSize: 18, fontWeight: 700,
              }}>
                {integ.name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div>
              <strong style={{ fontSize: '1.05rem' }}>{integ.name}</strong>
              <div style={{ fontSize: '0.62rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)' }}>
                {integ.slug}
                {integ.category && <> · {integ.category}</>}
                {integ.kind && <> · {integ.kind}</>}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={18} /></button>
        </div>

        {/* Status badge */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 9px', borderRadius: 99,
            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em',
            fontFamily: 'JetBrains Mono, monospace',
            background: isConnected ? 'rgba(45,106,79,0.15)' : isComing ? 'rgba(245,158,11,0.15)' : 'var(--bg-elevated)',
            color: isConnected ? 'var(--success)' : isComing ? 'var(--warning)' : 'var(--text-dim)',
            border: `1px solid ${isConnected ? 'var(--success)' : isComing ? 'var(--warning)' : 'var(--border)'}`,
            textTransform: 'uppercase',
          }}>
            {isConnected ? <><Check size={9} /> Connected</> : isComing ? 'Coming Soon' : 'Not Connected'}
          </span>
          {integ.url && (
            <a href={integ.url} target="_blank" rel="noreferrer" style={{
              marginLeft: 8, fontSize: '0.65rem', color: 'var(--text-dim)',
              display: 'inline-flex', alignItems: 'center', gap: 3, textDecoration: 'none',
            }}>
              <ExternalLink size={10} /> {integ.url.replace(/^https?:\/\//, '').slice(0, 30)}
            </a>
          )}
        </div>

        {/* Connection Info (só quando connected) */}
        {isConnected && (
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(45,106,79,0.04)' }}>
            <div style={{
              fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-dim)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 5,
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <LinkIcon size={11} /> Ligação
              </span>
              {integ.docs_url && (
                <a
                  href={integ.docs_url} target="_blank" rel="noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', borderRadius: 4,
                    background: 'var(--primary)', color: '#fff',
                    fontSize: '0.65rem', fontWeight: 600,
                    textDecoration: 'none', letterSpacing: 0, textTransform: 'none',
                  }}
                >
                  <ExternalLink size={11} /> Abrir página oficial
                </a>
              )}
            </div>
            <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
              <tbody>
                {integ.config.connected_email && (
                  <tr>
                    <td style={{ padding: '4px 0', color: 'var(--text-dim)', width: 110 }}>Conta</td>
                    <td style={{ padding: '4px 0', color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {integ.config.connected_email}
                    </td>
                  </tr>
                )}
                {integ.config.oauth_provider && (
                  <tr>
                    <td style={{ padding: '4px 0', color: 'var(--text-dim)' }}>Auth</td>
                    <td style={{ padding: '4px 0', color: 'var(--text)' }}>OAuth 2.0 ({integ.config.oauth_provider})</td>
                  </tr>
                )}
                {integ.config.auth_type === 'api_key' && (
                  <tr>
                    <td style={{ padding: '4px 0', color: 'var(--text-dim)' }}>Auth</td>
                    <td style={{ padding: '4px 0', color: 'var(--text)' }}>API key</td>
                  </tr>
                )}
                {integ.config.connected_via && (
                  <tr>
                    <td style={{ padding: '4px 0', color: 'var(--text-dim)' }}>Via</td>
                    <td style={{ padding: '4px 0', color: 'var(--text)', fontSize: '0.72rem' }}>{integ.config.connected_via}</td>
                  </tr>
                )}
                {integ.config.workspace && (
                  <tr>
                    <td style={{ padding: '4px 0', color: 'var(--text-dim)' }}>Workspace</td>
                    <td style={{ padding: '4px 0', color: 'var(--text)' }}>{integ.config.workspace}</td>
                  </tr>
                )}
                {integ.config.server_name && (
                  <tr>
                    <td style={{ padding: '4px 0', color: 'var(--text-dim)' }}>Server</td>
                    <td style={{ padding: '4px 0', color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>
                      #{integ.config.server_name}
                    </td>
                  </tr>
                )}
                {integ.config.active_count != null && (
                  <tr>
                    <td style={{ padding: '4px 0', color: 'var(--text-dim)' }}>Webhooks</td>
                    <td style={{ padding: '4px 0', color: 'var(--text)' }}>
                      <strong style={{ color: 'var(--success)' }}>{integ.config.active_count}</strong>
                      {' '}activos / {integ.config.total_count} configurados
                    </td>
                  </tr>
                )}
                {integ.config.channel_type && (
                  <tr>
                    <td style={{ padding: '4px 0', color: 'var(--text-dim)' }}>Tipo</td>
                    <td style={{ padding: '4px 0', color: 'var(--text)' }}>{integ.config.channel_type}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Description */}
        {integ.description && (
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.55 }}>
              {integ.description}
            </div>
          </div>
        )}

        {/* Setup instructions (always shown — útil mesmo quando connected) */}
        {setupSteps && (
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{
              fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-dim)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <BookOpen size={11} /> Setup
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.6 }}>
              <ReactMarkdown
                components={{
                  h3: ({ ...p }) => <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginTop: 10, marginBottom: 6 }} {...p} />,
                  p: ({ ...p }) => <p style={{ margin: '5px 0' }} {...p} />,
                  ol: ({ ...p }) => <ol style={{ margin: '6px 0 6px 20px' }} {...p} />,
                  ul: ({ ...p }) => <ul style={{ margin: '6px 0 6px 20px' }} {...p} />,
                  li: ({ ...p }) => <li style={{ margin: '3px 0' }} {...p} />,
                  a: ({ ...p }) => <a style={{ color: 'var(--primary)' }} target="_blank" rel="noreferrer" {...p} />,
                  code: ({ inline, ...p }) => inline
                    ? <code style={{ background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 3, fontSize: '0.82em', fontFamily: 'JetBrains Mono, monospace' }} {...p} />
                    : <code style={{ display: 'block', background: 'var(--bg)', padding: 8, borderRadius: 5, fontSize: '0.78em', fontFamily: 'JetBrains Mono, monospace', overflow: 'auto' }} {...p} />,
                  strong: ({ ...p }) => <strong style={{ fontWeight: 700, color: 'var(--text)' }} {...p} />,
                }}
              >{setupSteps}</ReactMarkdown>
            </div>
          </div>
        )}

        {!setupSteps && !isConnected && (
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.55 }}>
              <BookOpen size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
              Setup instructions ainda não documentadas para esta integração.
              {integ.url && (
                <> Visita <a href={integ.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>
                  {integ.url.replace(/^https?:\/\//, '')}
                </a> para criar conta e obter credenciais.</>
              )}
            </div>
          </div>
        )}

        {/* Management link quando connected */}
        {isConnected && manageUrl && (
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <Link to={manageUrl} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 5,
              background: 'var(--primary)', color: '#fff',
              textDecoration: 'none', fontSize: '0.78rem', fontWeight: 600,
            }}>
              <Settings size={13} /> Gerir configurações
            </Link>
            <div style={{ marginTop: 6, fontSize: '0.65rem', color: 'var(--text-dim)' }}>
              Ver/editar credenciais, webhooks, tokens — específico desta integração.
            </div>
          </div>
        )}

        {/* Actions footer */}
        <div style={{
          padding: '14px 20px', marginTop: 'auto',
          borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8,
        }}>
          {!isConnected && !isComing && (
            <button
              onClick={() => onToggle && onToggle(integ, 'connected')}
              disabled={busy}
              style={{
                background: 'var(--text)', color: 'var(--bg)', border: 'none',
                borderRadius: 5, padding: '8px 16px', cursor: busy ? 'wait' : 'pointer',
                fontSize: '0.78rem', fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}
            >
              {busy ? <Loader2 size={12} className="spin" /> : <Check size={12} />}
              Marcar como conectada
            </button>
          )}
          {isConnected && (
            <button
              onClick={() => onToggle && onToggle(integ, 'not_connected')}
              disabled={busy}
              style={{
                background: 'transparent', color: 'var(--danger)',
                border: '1px solid var(--danger)',
                borderRadius: 5, padding: '8px 16px', cursor: busy ? 'wait' : 'pointer',
                fontSize: '0.78rem', fontWeight: 600,
              }}
            >Desconectar</button>
          )}
          <button onClick={onClose} style={{
            background: 'transparent', color: 'var(--text-dim)',
            border: '1px solid var(--border)',
            borderRadius: 5, padding: '8px 14px', cursor: 'pointer',
            fontSize: '0.78rem',
          }}>Fechar</button>
        </div>
      </aside>
    </div>
  )
}
