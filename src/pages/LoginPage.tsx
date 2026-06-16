import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import { SocialLoginButtons } from '@/components/SocialLoginButtons'

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { tokens, user } = await login(email, password)
      setAuth(tokens, user)
      navigate('/boards', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Sign in</h1>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <SocialLoginButtons />
        <p className="muted">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </form>
      <style>{`
        .auth-shell { min-height: 100%; display: grid; place-items: center; padding: 24px; }
        .auth-card {
          background: var(--color-panel); border: 1px solid var(--color-border);
          border-radius: var(--radius-md); box-shadow: var(--shadow-md);
          padding: 32px; width: 100%; max-width: 360px;
          display: flex; flex-direction: column; gap: 16px;
        }
        .auth-card h1 { margin: 0 0 8px; font-size: 20px; }
        .auth-card label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--color-muted); }
        .auth-card .error { color: var(--color-danger); margin: 0; font-size: 13px; }
        .auth-card .muted { color: var(--color-muted); font-size: 13px; margin: 4px 0 0; }

        @media (max-width: 480px) {
          .auth-shell { padding: 16px; }
          .auth-card { padding: 24px 20px; }
        }
      `}</style>
    </div>
  )
}
