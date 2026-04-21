import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS === 'true'

const roles = [
  { id: 'cliente', label: 'Cliente', path: '/cliente' },
  { id: 'prestador', label: 'Prestador', path: '/prestador' },
  { id: 'gestor', label: 'Gestor', path: '/gestor' },
]

export default function Login() {
  const navigate = useNavigate()
  const [activeRole, setActiveRole] = useState('cliente')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function handleDevBypass(path, role) {
    localStorage.setItem('role', role)
    navigate(path)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      localStorage.setItem('role', activeRole)
      const role = roles.find(r => r.id === activeRole)
      navigate(role.path)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">V5 Manutenção</h1>
          <p className="text-gray-500 text-sm mt-1">Plataforma de gestão de manutenção</p>
        </div>

        {DEV_BYPASS ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-center text-amber-600 font-medium uppercase tracking-wide mb-2">
              Modo desenvolvimento — acesso directo
            </p>
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => handleDevBypass(role.path, role.id)}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
              >
                Entrar como {role.label}
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
              {roles.map(role => (
                <button
                  key={role.id}
                  onClick={() => setActiveRole(role.id)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeRole === role.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Palavra-passe</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors mt-2"
              >
                {loading ? 'A entrar…' : 'Entrar'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
