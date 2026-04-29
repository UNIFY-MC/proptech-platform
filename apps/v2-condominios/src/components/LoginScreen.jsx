import { useState } from 'react'

export default function LoginScreen({ mainClient }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await mainClient.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f4f3f0',
    }}>
      <div style={{
        background: '#fff', borderRadius: 10, padding: '40px 36px',
        width: 360, boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
      }}>
        <h2 style={{ margin: '0 0 24px', fontFamily: 'sans-serif', color: '#1a3a5c', fontSize: 20 }}>
          V2 Condomínios
        </h2>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: '#555', fontFamily: 'sans-serif', display: 'block', marginBottom: 4 }}>
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%', padding: '8px 10px', border: '1px solid #ddd',
                borderRadius: 4, fontSize: 14, boxSizing: 'border-box',
              }}
            />
          </label>

          <label style={{ display: 'block', marginBottom: 20 }}>
            <span style={{ fontSize: 12, color: '#555', fontFamily: 'sans-serif', display: 'block', marginBottom: 4 }}>
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '8px 10px', border: '1px solid #ddd',
                borderRadius: 4, fontSize: 14, boxSizing: 'border-box',
              }}
            />
          </label>

          {error && (
            <p style={{ color: '#8b1a1a', fontSize: 13, marginBottom: 12, fontFamily: 'sans-serif' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '10px', background: '#1a5296', color: '#fff',
              border: 'none', borderRadius: 4, fontSize: 14, cursor: 'pointer',
              fontFamily: 'sans-serif', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'A entrar…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
