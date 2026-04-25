const V = {
  green: '#1B4332', greenMid: '#2D6A4F', greenLt: '#52B788', greenXl: '#D8F3DC',
  amber: '#854F0B', amberLt: '#FAEEDA', border: '#e5e5e3', bg: '#f5f5f3',
  text: '#111', slate: '#555', muted: '#999',
  purpleDk: '#26215C', purple: '#534AB7', purpleLt: '#EEEDFE',
}

// TODO: replace with dynamic data from profile + subscriptions
const PILARES = [
  { ic: '🔧', t: 'Manutenção',          sub: 'A tua equipa fixa · 22 dias no streak', st: 'ativo',        cor: V.green,  corBg: V.greenXl, prog: 'Ativo desde Jan 2025',       botao: 'Gerir',    nav: 'subscricao' },
  { ic: '⚡', t: 'Energia',             sub: 'Atualmente com EDP · 51€/mês',           st: 'oportunidade', cor: V.amber,  corBg: V.amberLt, prog: 'Poupas 12€/mês se mudares',  botao: 'Simular',  nav: 'energia'    },
  { ic: '🛡️', t: 'Seguro Multirriscos', sub: 'Score 74 dá-te -15% nas ofertas',        st: 'novo',         cor: V.purple, corBg: V.purpleLt, prog: '3 seguradoras à tua espera', botao: 'Descobrir',nav: 'seguros'    },
]

const BENEFICIOS = [
  { ic: '📊', t: 'Painel único',    sub: 'Tudo num lugar'       },
  { ic: '💰', t: 'Preços melhores', sub: 'Descontos acumulados' },
  { ic: '🎯', t: 'IA proativa',     sub: 'Antecipa problemas'   },
  { ic: '🏆', t: '+ Pontos',        sub: 'Cada ação soma'       },
]

export default function OwnersClubScreen({ authUser, onBack, onNavigate }) {
  return (
    <div style={{ minHeight: '100vh', background: V.bg, paddingBottom: 40, overflowY: 'auto' }}>

      {/* ── Section 1: Header gradient roxo ── */}
      <div style={{
        background: `linear-gradient(145deg,${V.purpleDk},${V.purple})`,
        padding: '14px 16px 22px',
        color: '#fff',
      }}>
        {/* Back row */}
        <div
          style={{ fontSize: 10, opacity: .7, cursor: 'pointer', marginBottom: 10 }}
          onClick={onBack}
        >
          ← Início
        </div>

        {/* Label */}
        <div style={{
          fontSize: 10, color: 'rgba(255,255,255,.7)', fontWeight: 700,
          letterSpacing: 1, marginBottom: 6,
        }}>
          🏡 OWNERS CLUB
        </div>

        {/* Title */}
        <div style={{
          fontSize: 24, fontWeight: 700, fontFamily: 'Georgia, serif', marginBottom: 6,
        }}>
          Uma casa. Um painel.
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', marginBottom: 14 }}>
          Manutenção, energia e seguro na mesma app. Poupa até{' '}
          <b style={{ color: '#FFD166' }}>180€/ano</b>.
        </div>

        {/* Savings card */}
        <div style={{ background: 'rgba(0,0,0,.25)', borderRadius: 12, padding: '12px 13px' }}>
          <div style={{
            fontSize: 10, color: 'rgba(255,255,255,.6)', fontWeight: 700,
            letterSpacing: .4, marginBottom: 6,
          }}>
            A TUA POUPANÇA ESTIMADA
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            {/* TODO: calculate dynamically from user profile + active services */}
            <div style={{
              fontSize: 32, fontWeight: 700, color: '#FFD166', fontFamily: 'Georgia, serif',
            }}>
              184€
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>/ ano</div>
          </div>

          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', marginTop: 3 }}>
            Baseado no teu perfil · Simulação
          </div>
        </div>
      </div>

      {/* ── Section 2: Os 3 pilares ── */}
      <div style={{
        padding: '12px 12px 4px', fontSize: 9, color: V.muted,
        textTransform: 'uppercase', letterSpacing: .4, fontWeight: 700,
      }}>
        Os 3 pilares da tua casa
      </div>

      <div style={{ padding: '0 12px' }}>
        {PILARES.map((p, i) => (
          <div
            key={i}
            style={{
              background: '#fff',
              border: `1px solid ${V.border}`,
              borderRadius: 14,
              padding: '13px 14px',
              marginBottom: 9,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Left colour stripe */}
            <div style={{
              position: 'absolute', top: 0, left: 0, bottom: 0,
              width: 4, background: p.cor,
            }} />

            {/* Top row: icon + title + badge */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', marginBottom: 8, paddingLeft: 8,
            }}>
              {/* Left: icon + text */}
              <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 11, background: p.corBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                }}>
                  {p.ic}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: V.text }}>{p.t}</div>
                  {/* TODO: streak count + energy bill from live data */}
                  <div style={{ fontSize: 11, color: V.slate, marginTop: 1 }}>{p.sub}</div>
                </div>
              </div>

              {/* Badge */}
              <div style={{
                fontSize: 9, padding: '3px 8px', borderRadius: 6, fontWeight: 700,
                background: p.corBg, color: p.cor,
                textTransform: 'uppercase', letterSpacing: .3,
              }}>
                {p.st === 'ativo' ? 'Ativo' : p.st === 'oportunidade' ? 'Poupa' : 'Novo'}
              </div>
            </div>

            {/* Bottom row: progress text + CTA */}
            <div style={{
              paddingLeft: 8, display: 'flex',
              justifyContent: 'space-between', alignItems: 'center', marginTop: 6,
            }}>
              {/* TODO: dynamic progress text per service */}
              <div style={{ fontSize: 10, color: V.muted }}>{p.prog}</div>
              <button
                style={{
                  background: p.cor, color: '#fff', padding: '6px 12px',
                  borderRadius: 8, fontSize: 11, fontWeight: 700,
                  border: 'none', cursor: 'pointer',
                }}
                onClick={() => onNavigate?.(p.nav)}
              >
                {p.botao} →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Section 3: Porquê juntar tudo? ── */}
      <div style={{
        padding: '14px 12px 4px', fontSize: 9, color: V.muted,
        textTransform: 'uppercase', letterSpacing: .4, fontWeight: 700,
      }}>
        Porquê juntar tudo num sítio?
      </div>

      <div style={{
        padding: '0 12px 14px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
      }}>
        {BENEFICIOS.map((b, i) => (
          <div
            key={i}
            style={{
              background: '#fff',
              border: `1px solid ${V.border}`,
              borderRadius: 11,
              padding: '10px 11px',
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 5 }}>{b.ic}</div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>{b.t}</div>
            <div style={{ fontSize: 10, color: V.slate, marginTop: 1 }}>{b.sub}</div>
          </div>
        ))}
      </div>

    </div>
  )
}
