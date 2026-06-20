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
        <Link to="/" className="brand-mark" title="홈으로">
          <span className="brand-dot" />
          Whiteboard
        </Link>
        <div className="brand-pitch">
          <p className="eyebrow">SOFTWARE ARCHITECTURE, TOGETHER</p>
          <h2>아키텍처를<br />그릴 준비 되셨나요?</h2>
          <p className="brand-sub">
            계정을 만들고 첫 다이어그램을 시작해 보세요. 팀 초대도 한 번의 링크로.
          </p>
        </div>
        <span className="brand-foot">wb.gpglab.site</span>
      </aside>

      <div className="auth-pane">
        <form className="auth-card" onSubmit={onSubmit}>
          <h1>회원가입</h1>
          <p className="sub">몇 가지 정보만 입력하면 바로 시작할 수 있어요.</p>
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
            {loading ? '처리 중…' : '계정 만들기'}
          </button>
          <SocialLoginButtons />
          <p className="muted">
            이미 계정이 있으신가요? <Link to="/login">로그인</Link>
          </p>
        </form>
      </div>
      <style>{authStyles}</style>
    </div>
  )
}
