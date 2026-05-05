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

// Auth — NÃO persiste (Supabase gere sessão via localStorage interno)
const useAuthStore = create((set) => ({
  session: null,
  user: null,
  loading: true,
  setSession: (session) =>
    set({ session, user: session?.user || null, loading: false }),
  clear: () => set({ session: null, user: null, loading: false }),
}))

export { useVerticalStore, useNotificationsStore, useAuthStore }
