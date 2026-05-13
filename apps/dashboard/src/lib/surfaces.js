// Catálogo de surfaces (form-factor × role) + viewport presets
// Usado pelo MultiView, SurfaceSwitcher, ComingSoonSurface

export const SURFACES = [
  { id: 'desktop_web', label: 'Desktop',   icon: 'Monitor',      color: '#3b82f6' },
  { id: 'mobile_web',  label: 'Mobile',    icon: 'Smartphone',   color: '#10b981' },
  { id: 'tablet_web',  label: 'Tablet',    icon: 'Tablet',       color: '#f59e0b' },
  { id: 'mobile_native_ios',     label: 'iOS',     icon: 'Apple',   color: '#6b7280' },
  { id: 'mobile_native_android', label: 'Android', icon: 'Bot',     color: '#84cc16' },
]

export const ROLES = [
  { id: 'staff',     label: 'Staff',     icon: 'Briefcase',   color: '#8b5cf6' },
  { id: 'cliente',   label: 'Cliente',   icon: 'User',        color: '#10b981' },
  { id: 'prestador', label: 'Prestador', icon: 'HardHat',     color: '#f59e0b' },
  { id: 'owner',     label: 'Owner',     icon: 'Crown',       color: '#ec4899' },
  { id: 'guest',     label: 'Guest',     icon: 'UserX',       color: '#6b7280' },
]

// Viewport presets para MultiView frames
export const VIEWPORTS = {
  phone_portrait:  { id: 'phone_portrait',  label: 'Phone portrait',  width: 375,  height: 812, icon: 'Smartphone' },
  phone_landscape: { id: 'phone_landscape', label: 'Phone landscape', width: 812,  height: 375, icon: 'Smartphone' },
  tablet_portrait: { id: 'tablet_portrait', label: 'Tablet',          width: 768,  height: 1024, icon: 'Tablet' },
  desktop:         { id: 'desktop',         label: 'Desktop',         width: 1280, height: 800, icon: 'Monitor' },
  desktop_wide:    { id: 'desktop_wide',    label: 'Desktop wide',    width: 1440, height: 900, icon: 'Monitor' },
}

export function surfaceFor(id)  { return SURFACES.find(s => s.id === id) }
export function roleFor(id)     { return ROLES.find(r => r.id === id) }
export function viewportFor(id) { return VIEWPORTS[id] || VIEWPORTS.desktop }

// Sugere o viewport default para uma surface
export function defaultViewportFor(surface) {
  if (surface === 'desktop_web')          return 'desktop'
  if (surface === 'tablet_web')           return 'tablet_portrait'
  if (surface === 'mobile_web' ||
      surface === 'mobile_native_ios' ||
      surface === 'mobile_native_android') return 'phone_portrait'
  return 'desktop'
}
