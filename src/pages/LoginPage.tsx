import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import { SocialLoginButtons } from '@/components/SocialLoginButtons'
import { authStyles } from './authStyles'

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const ensureGuest = useAuthStore((s) => s.ensureGuest)
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

  function onGuest() {
    // 비회원: 게스트 사용자를 시드하고 로컬 보드로 바로 진입.
    ensureGuest()
    navigate('/', { replace: true })
  }

  return (
    <div className="auth-split">
      <aside className="auth-brand">
        <Link to="/boards" className="brand-mark" title="Go to my boards">
          <span className="brand-dot" />
          Whiteboard
        </Link>
        <div className="brand-pitch">
          <p className="eyebrow">SOFTWARE ARCHITECTURE, TOGETHER</p>
          <h2>Software architecture,<br />drawn together</h2>
          <p className="brand-sub">
            Drag in your stack, connect it with edges, and edit together in real time.
          </p>
        </div>
        <span className="brand-foot">wb.gpglab.site</span>
      </aside>

      <div className="auth-pane">
        <form className="auth-card" onSubmit={onSubmit}>
          <h1>Log in</h1>
          <p className="sub">Log in to your account and pick up where you left off.</p>
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
            {loading ? 'Logging in…' : 'Log in'}
          </button>
          <SocialLoginButtons />
          <button type="button" className="guest-btn" onClick={onGuest}>
            Continue as guest
          </button>
          <p className="muted">
            Don’t have an account? <Link to="/signup">Sign up</Link>
          </p>
        </form>
      </div>
      <style>{authStyles}</style>
    </div>
  )
}
