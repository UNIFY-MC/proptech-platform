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

export { useVerticalStore, useNotificationsStore }
