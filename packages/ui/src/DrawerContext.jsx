import { createContext, useContext, useState, useEffect } from 'react'
import Drawer from './Drawer.jsx'

const DrawerCtx = createContext(null)

export function DrawerProvider({ children }) {
  const [drawer, setDrawer] = useState(null)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setDrawer(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function openDrawer(title, subtitle, content) {
    setDrawer({ title, subtitle, content })
  }

  function closeDrawer() {
    setDrawer(null)
  }

  return (
    <DrawerCtx.Provider value={{ drawer, openDrawer, closeDrawer }}>
      {children}
      {drawer && <Drawer {...drawer} onClose={closeDrawer} />}
    </DrawerCtx.Provider>
  )
}

export function useDrawer() {
  return useContext(DrawerCtx)
}
