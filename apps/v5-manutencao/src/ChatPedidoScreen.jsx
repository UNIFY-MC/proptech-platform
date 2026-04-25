import { useState } from 'react'

const V = {
  green:    '#1B4332',
  greenMid: '#2D6A4F',
  greenLt:  '#52B788',
  greenXl:  '#D8F3DC',
  border:   '#e5e5e3',
  bg:       '#f5f5f3',
  text:     '#111',
  slate:    '#555',
  muted:    '#999',
  amber:    '#854F0B',
  amberLt:  '#FAEEDA',
}

function horaAgora() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function ChatPedidoScreen({ ordem, onBack }) {
  const nomePrest = ordem?.prestador_nome || 'João Ferreira'
  const iniciais  = nomePrest.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const etaMin    = 18 // TODO(mario): real ETA from ordens_trabalho

  const [texto, setTexto] = useState('')
  const [msgs, setMsgs]   = useState([
    { lado: 'prest', texto: 'Olá Mário! Já saí. Chego em ~20 min ✌️',                                         hora: '14:12' },
    { lado: 'user',  texto: 'Perfeito. Vou-lhe abrir o portão. É preciso trazer alguma ferramenta específica?', hora: '14:13' },
    { lado: 'prest', texto: 'Trago tudo. Já fiz a revisão desta caldeira há 2 anos, conheço o sistema 👍',      hora: '14:13' },
  ])

  function enviarMensagem() {
    const t = texto.trim()
    if (!t) return
    setMsgs(prev => [...prev, { lado: 'user', texto: t, hora: horaAgora() }])
    setTexto('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: V.bg }}>

      {/* Section 1 — Header prestador */}
      <div style={{
        background: '#fff',
        padding: '10px 14px',
        borderBottom: `1px solid ${V.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 11,
      }}>
        <div
          style={{ fontSize: 18, color: V.slate, cursor: 'pointer' }}
          onClick={onBack}
        >
          ←
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: V.greenLt, color: '#fff', fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13,
        }}>
          {iniciais}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{nomePrest}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: V.greenLt }} />
            <span style={{ fontSize: 10, color: V.slate }}>A caminho · chega em {etaMin} min</span>
          </div>
        </div>
        <button style={{
          width: 34, height: 34, borderRadius: '50%',
          background: V.green, color: '#fff', fontSize: 16,
          border: 'none', cursor: 'pointer',
        }}>
          📞
        </button>
      </div>

      {/* Conteúdo condicional — empty state se ordem é null */}
      {!ordem ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 24, gap: 12,
        }}>
          <div style={{ fontSize: 48 }}>⏳</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: V.text }}>A aguardar atribuição</div>
          <div style={{ fontSize: 12, color: V.slate, textAlign: 'center' }}>
            O técnico ainda não foi atribuído a este pedido.
          </div>
        </div>
      ) : (
        <>
          {/* Section 2 — Badge verificação */}
          <div style={{
            margin: '10px 12px 0',
            background: V.greenXl,
            border: `1px solid ${V.greenLt}`,
            borderRadius: 11,
            padding: '9px 12px',
            display: 'flex',
            gap: 9,
            alignItems: 'center',
          }}>
            <div style={{ fontSize: 18 }}>✅</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: V.green }}>Técnico verificado OSCAR</div>
              <div style={{ fontSize: 10, color: V.greenMid, marginTop: 1 }}>
                NIF validado · Seguro RC · 87 visitas · 4.9★
              </div>
            </div>
          </div>

          {/* Section 3 — Localização live */}
          <div style={{
            margin: '8px 12px 0',
            background: '#fff',
            border: `1px solid ${V.border}`,
            borderRadius: 11,
            padding: '10px 12px',
            position: 'relative',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 7,
            }}>
              <div style={{
                fontSize: 10, color: V.muted, fontWeight: 700,
                letterSpacing: 0.4, textTransform: 'uppercase',
              }}>
                🗺️ Localização em tempo real
              </div>
              <div style={{ fontSize: 10, color: V.greenLt, fontWeight: 700 }}>
                ao vivo · {etaMin} min
              </div>
            </div>

            {/* Mock mapa */}
            <div style={{
              background: '#E0E8D5', height: 100,
              borderRadius: 8, position: 'relative', overflow: 'hidden',
            }}>
              <svg width="100%" height={100} style={{ position: 'absolute' }}>
                <path
                  d="M 20 90 Q 80 40, 150 60 T 280 30"
                  stroke={V.greenLt}
                  strokeWidth="2.5"
                  fill="none"
                  strokeDasharray="4 3"
                />
              </svg>
              <div style={{ position: 'absolute', bottom: 8, left: 15, fontSize: 20 }}>🚐</div>
              <div style={{ position: 'absolute', top: 15, right: 20, fontSize: 20 }}>🏠</div>
              <div style={{
                position: 'absolute', bottom: 8, right: 8,
                background: 'rgba(255,255,255,.9)', padding: '3px 8px',
                borderRadius: 6, fontSize: 9, fontWeight: 700, color: V.slate,
              }}>
                ~{etaMin} min
              </div>
            </div>
          </div>

          {/* Section 4 — Chat mensagens */}
          <div style={{
            flex: 1, padding: '10px 12px',
            display: 'flex', flexDirection: 'column', gap: 8,
            background: V.bg, minHeight: 180,
          }}>
            <div style={{ fontSize: 9, color: V.muted, textAlign: 'center', marginBottom: 4 }}>
              Hoje, 14:12
            </div>

            {msgs.map((msg, i) =>
              msg.lado === 'prest' ? (
                <div key={i} style={{ display: 'flex', gap: 7, maxWidth: '85%' }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: V.greenLt, color: '#fff', fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 3,
                  }}>
                    {iniciais.slice(0, 2)}
                  </div>
                  <div>
                    <div style={{
                      background: '#fff',
                      borderRadius: '3px 12px 12px 12px',
                      padding: '8px 11px',
                      fontSize: 12,
                      color: V.text,
                      border: `1px solid ${V.border}`,
                    }}>
                      {msg.texto}
                    </div>
                    <div style={{ fontSize: 9, color: V.muted, marginTop: 3, marginLeft: 4 }}>
                      {msg.hora}
                    </div>
                  </div>
                </div>
              ) : (
                <div key={i} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ maxWidth: '85%' }}>
                    <div style={{
                      background: V.green,
                      color: '#fff',
                      borderRadius: '12px 3px 12px 12px',
                      padding: '8px 11px',
                      fontSize: 12,
                    }}>
                      {msg.texto}
                    </div>
                    <div style={{ fontSize: 9, color: V.muted, marginTop: 3, textAlign: 'right' }}>
                      {msg.hora} ✓✓
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Section 5 — Chips ações rápidas */}
          <div style={{
            display: 'flex', gap: 6, overflowX: 'auto',
            padding: '8px 12px', background: '#fff',
            borderTop: `1px solid ${V.border}`,
          }}>
            {['📸 Enviar foto', '📄 Ver orçamento acordado', '🚨 Reportar problema', '⭐ Avaliar no fim'].map(c => (
              <div
                key={c}
                onClick={() => alert(c)}
                style={{
                  flexShrink: 0, fontSize: 10, padding: '5px 10px',
                  borderRadius: 14, border: `1px solid ${V.border}`,
                  background: V.bg, color: V.slate, cursor: 'pointer',
                  whiteSpace: 'nowrap', fontWeight: 600,
                }}
              >
                {c}
              </div>
            ))}
          </div>

          {/* Section 6 — Input row */}
          <div style={{ display: 'flex', gap: 7, padding: '8px 12px 12px', background: '#fff' }}>
            <button style={{
              width: 34, height: 34, borderRadius: '50%',
              background: V.bg, color: V.slate, fontSize: 18,
              border: 'none', cursor: 'pointer',
            }}>
              📎
            </button>
            <input
              placeholder="Escrever mensagem..."
              value={texto}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') enviarMensagem() }}
              style={{
                flex: 1, padding: '9px 12px', borderRadius: 20,
                border: `1px solid ${V.border}`, fontSize: 12,
                background: V.bg, outline: 'none',
              }}
            />
            <button
              onClick={enviarMensagem}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: V.green, color: '#fff', fontSize: 14,
                border: 'none', cursor: 'pointer',
              }}
            >
              →
            </button>
          </div>
        </>
      )}

      {/* Section 7 — Anti-fraude footer (sempre visível) */}
      <div style={{
        padding: '8px 12px',
        background: V.amberLt,
        borderTop: '1px solid #F0CC5A',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}>
        <div style={{ fontSize: 14 }}>🔒</div>
        <div style={{ fontSize: 9.5, color: V.amber, lineHeight: 1.4 }}>
          <b>Nunca pagues fora da app.</b> Todos os pagamentos são garantidos e registados aqui.
        </div>
      </div>

    </div>
  )
}
