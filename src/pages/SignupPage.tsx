import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signup } from '@/api/auth'
import { SocialLoginButtons } from '@/components/SocialLoginButtons'
import { authStyles } from './authStyles'

export function SignupPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signup({ email, name, password })
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
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
          <h2>Ready to start<br />mapping your architecture?</h2>
          <p className="brand-sub">
            Create an account and start your first diagram. Invite your team with a single link.
          </p>
        </div>
        <span className="brand-foot">wb.gpglab.site</span>
      </aside>

      <div className="auth-pane">
        <form className="auth-card" onSubmit={onSubmit}>
          <h1>Sign up</h1>
          <p className="sub">Just a few details and you’re ready to go.</p>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </label>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="primary" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
          <SocialLoginButtons />
          <p className="muted">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </form>
      </div>
      <style>{authStyles}</style>
    </div>
  )
}
