import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Vertical activa — persiste em localStorage para sobreviver a reload
const useVerticalStore = create(
  persist(
    (set) => ({
      activeVertical: 'v5',
      setVertical: (v) => set({ activeVertical: v }),
    }),
    { name: 'cc:vertical' }
  )
)

// Toasts/notificações efémeros — não persistidos
const useNotificationsStore = create((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((s) => ({ toasts: [...s.toasts, { id: Date.now(), ...toast }] })),
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

// App Shell — qual app está activa no sidebar (Sprint App Shell)
// Persiste para o user voltar à mesma app após reload
const useAppShellStore = create(
  persist(
    (set) => ({
      activeAppSlug: 'dashboard',     // 'dashboard' | 'v2' | 'v4' | 'v5'
      activePath:    '/',             // path interno da app embebida
      sidebarCollapsed: false,        // colapsar sidebar primário para dar mais espaço
      setActiveApp:  (slug) => set({ activeAppSlug: slug, activePath: '/' }),
      setActivePath: (path) => set({ activePath: path }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: 'cc:app-shell' }
  )
)

export { useVerticalStore, useNotificationsStore, useAppShellStore }
