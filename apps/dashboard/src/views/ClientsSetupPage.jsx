// ClientsSetupPage — /clients/setup · Portal Branding & Configuration
//
// Replica trycook.ai/clients/settings: form de branding à esquerda + live preview à direita.

import { useState } from 'react'
import { Upload, Edit2, Plus, Globe } from 'lucide-react'
import { ClientsTabs } from './ClientsPage.jsx'

const FONTS = ['Inter', 'Syne', 'JetBrains Mono', 'Roboto', 'Open Sans', 'Manrope', 'Geist']
const FONT_SIZES = [
  { id: 'small',  label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large',  label: 'Large' },
  { id: 'xl',     label: 'XL' },
]

export default function ClientsSetupPage() {
  const [branding, setBranding] = useState({
    portal_name: 'Intego Media',
    website: '',
    niche: '',
    offer_name: '',
    description: '',
    custom_domain: '',
    primary_color: '#0066FF',
    accent_color: '#F4B400',
    background_color: '#ffffff',
    button_text_color: '#000000',
    secondary_color: '#000000',
    foreground_color: '#000000',
    theme: 'light',
    font_size: 'medium',
    heading_font: 'Inter',
    body_font: 'Inter',
    custom_css: '',
  })

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '4px 0 40px' }}>
      <ClientsTabs />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 480px', gap: 16, padding: '0 8px' }}>
        {/* Left: form */}
        <div>
          <div style={{ marginBottom: 16 }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>Setup</h1>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '4px 0 0', fontFamily: 'JetBrains Mono, monospace' }}>
              Portal Branding and Configuration
            </p>
          </div>

          {/* Portal Domain + Workspace Email */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            <Card>
              <Label small>Portal Domain</Label>
              <h3 style={{ fontSize: 14, margin: '4px 0 4px', color: 'var(--text)' }}>Custom domain</h3>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '0 0 10px' }}>
                Conecta o teu domínio para o portal cliente branded.
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={branding.custom_domain}
                  onChange={(e) => setBranding({ ...branding, custom_domain: e.target.value })}
                  placeholder="connect.youragency.com"
                  style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}
                />
                <button style={btnSecondary}>Connect</button>
                <button style={btnSecondary}>Verify</button>
              </div>
            </Card>

            <Card>
              <Label small>Workspace Email</Label>
              <h3 style={{ fontSize: 14, margin: '4px 0 4px', color: 'var(--text)' }}>AgentMail sender setup</h3>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '0 0 10px' }}>
                Configura domínios, inboxes e mailboxes usados para onboarding emails.
              </p>
              <a href="/clients/email" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 5,
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: 12, textDecoration: 'none',
              }}>
                <Globe size={12} /> Open Email
              </a>
            </Card>
          </div>

          {/* General */}
          <SectionTitle>General</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 24 }}>
            <SettingRow icon="Building" label="Portal name" value={branding.portal_name} onEdit={(v) => setBranding({ ...branding, portal_name: v })} />
            <SettingRow icon="Globe" label="Website" placeholder="Your agency homepage" value={branding.website} onEdit={(v) => setBranding({ ...branding, website: v })} />
            <SettingRow icon="Briefcase" label="Niche" placeholder="Industry or vertical" value={branding.niche} onEdit={(v) => setBranding({ ...branding, niche: v })} />
            <SettingRow icon="Star" label="Offer name" placeholder="Your core offer" value={branding.offer_name} onEdit={(v) => setBranding({ ...branding, offer_name: v })} />
            <SettingRow icon="FileText" label="Description" placeholder="Used in landing pages and onboarding" value={branding.description} onEdit={(v) => setBranding({ ...branding, description: v })} />
          </div>

          {/* Appearance & Branding */}
          <SectionTitle>Appearance & Branding</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            <UploadRow icon="Image" label="Logo" hint="PNG, JPG, SVG, or WebP. Max 5MB. Shown in sidebar, emails, portal." />
            <UploadRow icon="Image" label="Favicon" hint="ICO, PNG, or SVG. Max 1MB. Browser tab icon (32×32 ideal)." />
            <UploadRow icon="Image" label="Social preview image" hint="1200×630 OG image — shown when links are shared. PNG/JPG/WebP, max 8MB." />

            <ColorRow label="Primary color"     value={branding.primary_color}     onChange={(v) => setBranding({ ...branding, primary_color: v })} />
            <ColorRow label="Button text color" value={branding.button_text_color} onChange={(v) => setBranding({ ...branding, button_text_color: v })} />
            <ColorRow label="Accent color"      value={branding.accent_color}      onChange={(v) => setBranding({ ...branding, accent_color: v })} />
            <ColorRow label="Secondary color"   value={branding.secondary_color}   onChange={(v) => setBranding({ ...branding, secondary_color: v })} />
            <ColorRow label="Background color"  value={branding.background_color}  onChange={(v) => setBranding({ ...branding, background_color: v })} />
            <ColorRow label="Foreground (text) color" value={branding.foreground_color} onChange={(v) => setBranding({ ...branding, foreground_color: v })} />

            <ToggleRow label="Theme" options={['light', 'dark', 'system']} value={branding.theme} onChange={(v) => setBranding({ ...branding, theme: v })} />
            <ToggleRow label="Font size" options={FONT_SIZES.map(f => f.id)} optionsLabels={FONT_SIZES.map(f => f.label)} value={branding.font_size} onChange={(v) => setBranding({ ...branding, font_size: v })} />
          </div>

          {/* Typography */}
          <SectionTitle>Typography</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            <SelectRow icon="Type" label="Heading font" options={FONTS} value={branding.heading_font} onChange={(v) => setBranding({ ...branding, heading_font: v })} />
            <SelectRow icon="Type" label="Body font" options={FONTS} value={branding.body_font} onChange={(v) => setBranding({ ...branding, body_font: v })} />
          </div>

          {/* Advanced */}
          <SectionTitle>Advanced</SectionTitle>
          <SettingRow icon="FileCode" label="Custom CSS" placeholder="Inject custom styles into the portal. Sanitized server-side." />

          {/* Sidebar Links */}
          <SectionTitle>Sidebar Links</SectionTitle>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 8px' }}>
            Adiciona links ao client portal sidebar — community, booking, offers, etc. Max 10.
          </p>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 5,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: 12, cursor: 'pointer', marginBottom: 24,
          }}>
            <Plus size={12} /> Add link
          </button>

          {/* Landing Integrations */}
          <SectionTitle>Landing Integrations</SectionTitle>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 10px', lineHeight: 1.5 }}>
            Escolhe que logos aparecem na landing. A lista não deve over-promise — só mostra plataformas que a tua agência realmente entrega. (Live OAuth currently limited to Meta and GoHighLevel.)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
            <label style={checkboxRow}><input type="checkbox" /> Meta Ads</label>
            <label style={checkboxRow}><input type="checkbox" /> GoHighLevel</label>
          </div>
          <button style={btnPrimary}>Save integrations</button>

          {/* Onboarding Flows */}
          <SectionTitle>Onboarding Flows</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            <FlowRow name="Client Intake" updated="30/04/2026" />
            <FlowRow name="Implementation Kickoff" updated="29/04/2026" />
            <FlowRow name="HVAC Client Intake" updated="29/04/2026" />
          </div>
          <button style={btnPrimary}>Create flow</button>
        </div>

        {/* Right: Live Preview */}
        <div style={{ position: 'sticky', top: 16, alignSelf: 'flex-start' }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono, monospace' }}>Live Preview</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>{branding.portal_name}</div>
              </div>
              <select style={{ ...inputStyle, fontSize: 11, width: 'auto' }}>
                <option>Client Intake</option>
                <option>Implementation Kickoff</option>
                <option>HVAC Client Intake</option>
              </select>
            </div>

            {/* Mock preview window */}
            <div style={{
              background: branding.background_color,
              color: branding.foreground_color,
              borderRadius: 8, padding: 32, minHeight: 360,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--border)',
              fontFamily: `'${branding.body_font}', sans-serif`,
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16,
                fontWeight: 700, fontSize: 14, color: branding.foreground_color,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 4,
                  background: branding.primary_color,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 11, fontWeight: 700,
                }}>{branding.portal_name?.[0] || 'I'}</div>
                {branding.portal_name}
              </div>
              <div style={{
                fontSize: 18, fontWeight: 600, color: branding.foreground_color,
                fontFamily: `'${branding.heading_font}', sans-serif`,
                marginTop: 32,
              }}>Client Intake</div>
              <div style={{ fontSize: 12, color: branding.foreground_color, opacity: 0.6, marginTop: 6 }}>
                This flow doesn't have any steps yet.
              </div>
              <button style={{
                marginTop: 24, padding: '8px 20px', borderRadius: 6,
                background: branding.primary_color,
                color: branding.button_text_color || '#fff',
                border: 'none', fontWeight: 600, cursor: 'pointer',
                fontFamily: `'${branding.body_font}', sans-serif`,
              }}>Continue</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────
function Card({ children }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: 14,
    }}>{children}</div>
  )
}

function Label({ children, small }) {
  return (
    <div style={{
      fontSize: small ? 9 : 10, fontWeight: 700, color: 'var(--text-dim)',
      textTransform: 'uppercase', letterSpacing: '0.1em',
      fontFamily: 'JetBrains Mono, monospace',
    }}>{children}</div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, color: 'var(--text-dim)',
      textTransform: 'uppercase', letterSpacing: '0.1em',
      fontFamily: 'JetBrains Mono, monospace', margin: '0 0 8px',
    }}>{children}</div>
  )
}

function SettingRow({ icon, label, value, placeholder, onEdit }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 6, gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 6,
          background: 'var(--bg-elevated)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-dim)', fontSize: 11,
        }}>≡</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{label}</div>
          {placeholder && !value && (
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{placeholder}</div>
          )}
        </div>
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{value || '—'}</span>
      <button style={miniBtn}><Edit2 size={11} /></button>
    </div>
  )
}

function UploadRow({ icon, label, hint }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 6, gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 6,
          background: 'var(--bg-elevated)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-dim)',
        }}>≡</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{label}</div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>{hint}</div>
        </div>
      </div>
      <button style={btnSecondary}><Upload size={11} /> Upload</button>
    </div>
  )
}

function ColorRow({ label, value, onChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 6, gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        <span style={{
          width: 26, height: 26, borderRadius: 6, background: 'var(--bg-elevated)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)',
        }}>◉</span>
        <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 32, height: 28, padding: 0, border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}
        />
        <span style={{
          fontSize: 11, color: 'var(--text)',
          fontFamily: 'JetBrains Mono, monospace',
          padding: '4px 8px', background: 'var(--bg-elevated)', borderRadius: 4,
        }}>{value || '—'}</span>
      </div>
    </div>
  )
}

function ToggleRow({ label, options, optionsLabels, value, onChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 6,
    }}>
      <span style={{ fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--bg-elevated)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>◉</span>
        {label}
      </span>
      <div style={{ display: 'inline-flex', gap: 2 }}>
        {options.map((opt, i) => {
          const lbl = optionsLabels ? optionsLabels[i] : opt
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              style={{
                padding: '4px 10px', borderRadius: 4,
                background: value === opt ? 'var(--bg-elevated)' : 'transparent',
                border: `1px solid ${value === opt ? 'var(--primary)' : 'var(--border)'}`,
                color: value === opt ? 'var(--text)' : 'var(--text-dim)',
                fontSize: 11, cursor: 'pointer', textTransform: 'capitalize',
              }}
            >{lbl}</button>
          )
        })}
      </div>
    </div>
  )
}

function SelectRow({ label, options, value, onChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 6,
    }}>
      <span style={{ fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--bg-elevated)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>T</span>
        {label}
      </span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, width: 'auto', fontSize: 12 }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function FlowRow({ name, updated }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto auto auto auto',
      gap: 10, alignItems: 'center',
      padding: '10px 14px',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 6,
    }}>
      <div>
        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{name}</div>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
          draft · updated {updated}
        </div>
      </div>
      <button style={btnSecondary}>Edit</button>
      <button style={btnSecondary}>Preview</button>
      <button style={btnSecondary}>Copy link</button>
      <button style={miniBtn}>🗑</button>
    </div>
  )
}

const inputStyle = {
  padding: '7px 10px', background: 'var(--bg-elevated)',
  border: '1px solid var(--border)', borderRadius: 5,
  color: 'var(--text)', fontSize: 13, outline: 'none',
  width: '100%', boxSizing: 'border-box',
}
const btnSecondary = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '5px 10px', borderRadius: 4,
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
}
const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '7px 12px', borderRadius: 5,
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text)', fontSize: 12, cursor: 'pointer',
}
const miniBtn = {
  background: 'transparent', border: '1px solid var(--border)',
  cursor: 'pointer', color: 'var(--text-dim)', padding: '4px 7px', borderRadius: 4,
}
const checkboxRow = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '8px 12px', background: 'var(--bg-card)',
  border: '1px solid var(--border)', borderRadius: 5,
  fontSize: 12, color: 'var(--text)', cursor: 'pointer',
}
