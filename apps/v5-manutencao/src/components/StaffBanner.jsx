import React, { useState } from 'react'
import { useAuth } from '../lib/AuthContext.jsx'

const BANNER_H = 36

export const STAFF_BANNER_HEIGHT = BANNER_H // exportado para App.jsx usar como offset

export default function StaffBanner() {
  const { isStaff, staffRoles, session, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  if (!isStaff) return null

  const email = session?.user?.email ?? '—'
  const roles = staffRoles.join(', ') || 'admin'

  return (
    <>
      {/* Banner fixo no topo */}
      <div style={{
        position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430, zIndex: 9990,
        background: '#FEF3C7', borderBottom: '1.5px solid #F59E0B',
        boxShadow: '0 1px 4px rgba(245,158,11,0.18)',
      }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%', height: BANNER_H, padding: '0 14px',
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 13 }}>🛡️</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#92400E' }}>
            Modo staff ({roles})
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: '#B45309', fontWeight: 500 }}>
            Backoffice em Fase 4
          </span>
          <span style={{ fontSize: 12, color: '#B45309', marginLeft: 4 }}>
            {open ? '▲' : '▼'}
          </span>
        </button>

        {open && (
          <div style={{
            padding: '10px 14px 12px',
            borderTop: '1px solid #FDE68A',
            background: '#FFFBEB',
          }}>
            <div style={{ fontSize: 11, color: '#78350F', marginBottom: 4 }}>
              <strong>Email:</strong> {email}
            </div>
            <div style={{ fontSize: 11, color: '#78350F', marginBottom: 8 }}>
              <strong>Roles:</strong> {roles}
            </div>
            <div style={{
              fontSize: 10, color: '#92400E', background: '#FEF3C7',
              borderRadius: 6, padding: '6px 8px', marginBottom: 10, lineHeight: 1.5,
            }}>
              Para testar RPCs admin, usa o SQL Editor do Supabase com o JWT desta sessão.
              Backoffice formal vem na Fase 4.
            </div>
            <button
              onClick={signOut}
              style={{
                padding: '5px 12px', borderRadius: 7, border: '1.5px solid #F59E0B',
                background: 'none', color: '#B45309', fontSize: 11, fontWeight: 700,
                cursor: 'pointer',
              }}
            >Sign out staff</button>
          </div>
        )}
      </div>

      {/* Spacer para empurrar o conteúdo abaixo do banner */}
      <div style={{ height: BANNER_H }} />
    </>
  )
}
