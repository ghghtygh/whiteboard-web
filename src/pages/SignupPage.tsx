import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signup } from '@/api/auth'

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
      setError(err instanceof Error ? err.message : '가입 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>회원가입</h1>
        <label>
          이메일
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label>
          이름
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          비밀번호
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
          {loading ? '확인 중…' : '가입하기'}
        </button>
        <p className="muted">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
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
