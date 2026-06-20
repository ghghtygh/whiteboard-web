import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import { IS_LOCAL_MODE } from '@/local/mode'
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
    // 로컬 모드: 게스트 사용자를 시드하고 바로 보드로 진입.
    ensureGuest()
    navigate('/boards', { replace: true })
  }

  return (
    <div className="auth-split">
      <aside className="auth-brand">
        <Link to="/boards" className="brand-mark" title="내 보드로">
          <span className="brand-dot" />
          Whiteboard
        </Link>
        <div className="brand-pitch">
          <p className="eyebrow">SOFTWARE ARCHITECTURE, TOGETHER</p>
          <h2>팀과 함께 그리는<br />소프트웨어 아키텍처</h2>
          <p className="brand-sub">
            기술 스택을 끌어다 놓고, 엣지로 잇고, 실시간으로 함께 편집하세요.
          </p>
        </div>
        <span className="brand-foot">wb.gpglab.site</span>
      </aside>

      <div className="auth-pane">
        <form className="auth-card" onSubmit={onSubmit}>
          <h1>로그인</h1>
          <p className="sub">계정에 로그인하고 보드를 이어서 작업하세요.</p>
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
            {loading ? '로그인 중…' : '로그인'}
          </button>
          <SocialLoginButtons />
          {IS_LOCAL_MODE && (
            <button type="button" className="guest-btn" onClick={onGuest}>
              게스트로 시작하기
            </button>
          )}
          <p className="muted">
            계정이 없으신가요? <Link to="/signup">회원가입</Link>
          </p>
        </form>
      </div>
      <style>{authStyles}</style>
    </div>
  )
}
