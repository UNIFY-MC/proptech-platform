import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import DashboardCliente from './pages/DashboardCliente'
import DashboardPrestador from './pages/DashboardPrestador'
import DashboardGestor from './pages/DashboardGestor'
import { supabase } from './lib/supabase'
import { useEffect, useState } from 'react'

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS === 'true'

function AuthGuard({ children, requiredRole }) {
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    if (DEV_BYPASS) {
      setAllowed(true)
      setChecking(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const role = localStorage.getItem('role')
      if (session && role === requiredRole) {
        setAllowed(true)
      }
      setChecking(false)
    })
  }, [requiredRole])

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="text-gray-400 text-sm">A carregar…</span>
      </div>
    )
  }

  if (!allowed) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/cliente"
          element={
            <AuthGuard requiredRole="cliente">
              <DashboardCliente />
            </AuthGuard>
          }
        />
        <Route
          path="/prestador"
          element={
            <AuthGuard requiredRole="prestador">
              <DashboardPrestador />
            </AuthGuard>
          }
        />
        <Route
          path="/gestor"
          element={
            <AuthGuard requiredRole="gestor">
              <DashboardGestor />
            </AuthGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
