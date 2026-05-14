// useMultiViewStore — estado dos slots no Multi-Surface Viewer
// Cada slot: { id, slug, viewport, deviceFrame }
// Persiste em localStorage para sobreviver a reload

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_SLOTS = [
  { id: 'slot-1', slug: 'v5',           viewport: 'phone_portrait', deviceFrame: true },
  { id: 'slot-2', slug: 'v5-staff',     viewport: 'desktop',         deviceFrame: false },
  { id: 'slot-3', slug: 'v5-prestador', viewport: 'phone_portrait', deviceFrame: true },
]

let _idCounter = Date.now()
function nextId() { return `slot-${++_idCounter}` }

export const useMultiViewStore = create(
  persist(
    (set, get) => ({
      slots: DEFAULT_SLOTS,
      filter: 'all',  // 'all' | 'phones' | 'desktops'
      reloadKeys: {},  // { slotId: number } — incrementa para forçar reload do iframe

      addSlot: (slot) => set(s => ({
        slots: [...s.slots, { id: nextId(), viewport: 'desktop', deviceFrame: false, ...slot }]
      })),
      removeSlot: (id) => set(s => ({ slots: s.slots.filter(x => x.id !== id) })),
      updateSlot: (id, patch) => set(s => ({
        slots: s.slots.map(x => x.id === id ? { ...x, ...patch } : x)
      })),
      reloadSlot: (id) => set(s => ({
        reloadKeys: { ...s.reloadKeys, [id]: (s.reloadKeys[id] || 0) + 1 }
      })),
      setFilter: (filter) => set({ filter }),
      reset: () => set({ slots: DEFAULT_SLOTS, filter: 'all', reloadKeys: {} }),
    }),
    {
      name: 'dashboard:multiview',
      partialize: (s) => ({ slots: s.slots, filter: s.filter }),  // não persiste reloadKeys
    }
  )
)
