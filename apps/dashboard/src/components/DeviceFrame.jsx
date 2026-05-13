// DeviceFrame — chrome opcional à volta de um iframe
// Phone (mobile_web/mobile_native): notch + bordas pretas + cantos arredondados
// Desktop (desktop_web): browser bar fake com botões macOS-style
// Tablet (tablet_web): bordas finas com chunky bezels

export default function DeviceFrame({ kind, width, height, children }) {
  if (kind === 'phone') {
    return (
      <div style={{
        width: width + 16,
        height: height + 32,
        background: '#0a0a0a',
        borderRadius: 24,
        padding: 8,
        paddingTop: 24,
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        position: 'relative',
      }}>
        {/* Notch fake */}
        <div style={{
          position: 'absolute',
          top: 6,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 80,
          height: 14,
          background: '#0a0a0a',
          borderRadius: 7,
          zIndex: 1,
        }} />
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: 16,
          overflow: 'hidden',
          background: '#fff',
        }}>
          {children}
        </div>
      </div>
    )
  }
  if (kind === 'tablet') {
    return (
      <div style={{
        width: width + 24,
        height: height + 24,
        background: '#1a1a1a',
        borderRadius: 16,
        padding: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: 6,
          overflow: 'hidden',
          background: '#fff',
        }}>
          {children}
        </div>
      </div>
    )
  }
  // desktop browser chrome
  return (
    <div style={{
      width: width + 4,
      height: height + 28,
      background: '#2a2a2a',
      borderRadius: 8,
      boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      overflow: 'hidden',
    }}>
      <div style={{
        height: 24,
        background: '#3a3a3a',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 10px',
      }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
      </div>
      <div style={{ width: '100%', height: height, background: '#fff' }}>
        {children}
      </div>
    </div>
  )
}

export function deviceKindFor(surface) {
  if (!surface) return 'desktop'
  if (surface === 'desktop_web') return 'desktop'
  if (surface === 'tablet_web')  return 'tablet'
  return 'phone'  // mobile_web, mobile_native_*
}
