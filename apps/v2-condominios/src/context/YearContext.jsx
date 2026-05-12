import { createContext, useContext, useState, useCallback } from 'react'

// Anos suportados + valor especial "Global" (todos os exercícios)
export const YEAR_OPTIONS = ['2024', '2025', '2026', 'Global']
const DEFAULT_YEAR = String(new Date().getFullYear())
const STORAGE_KEY = 'v2_year'

const YearContext = createContext(null)

export function YearProvider({ children }) {
  const [year, setYearState] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_YEAR
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved && YEAR_OPTIONS.includes(saved) ? saved : DEFAULT_YEAR
  })

  const setYear = useCallback((y) => {
    setYearState(y)
    try { window.localStorage.setItem(STORAGE_KEY, y) } catch { /* ignore */ }
  }, [])

  return (
    <YearContext.Provider value={{ year, setYear, isGlobal: year === 'Global', anoNumero: year === 'Global' ? null : Number(year) }}>
      {children}
    </YearContext.Provider>
  )
}

export function useYear() {
  const ctx = useContext(YearContext)
  if (!ctx) throw new Error('useYear deve ser usado dentro de <YearProvider>')
  return ctx
}
