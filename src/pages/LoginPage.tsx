import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '@/api/auth'
import { useAuthStore } from '@/store/auth'

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
      setError(err instanceof Error ? err.message : '로그인 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>로그인</h1>
        <label>
          이메일
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label>
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary" disabled={loading}>
          {loading ? '확인 중…' : '로그인'}
        </button>
        <p className="muted">
          계정이 없으신가요? <Link to="/signup">회원가입</Link>
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
      `}</style>
    </div>
  )
}
