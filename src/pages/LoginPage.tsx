import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import { SocialLoginButtons } from '@/components/SocialLoginButtons'
import { LanguageSelect } from '@/components/LanguageSelect'
import { useT } from '@/i18n'
import { authStyles } from './authStyles'

export function LoginPage() {
  const t = useT()
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
      setError(err instanceof Error ? err.message : t('auth.login.failed'))
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
        <Link to="/boards" className="brand-mark" title={t('auth.goToBoards')}>
          <span className="brand-dot" />
          {t('app.name')}
        </Link>
        <div className="brand-pitch">
          <p className="eyebrow">{t('auth.eyebrow')}</p>
          <h2>{t('auth.login.pitchTitleLine1')}<br />{t('auth.login.pitchTitleLine2')}</h2>
          <p className="brand-sub">
            {t('auth.login.pitchBody')}
          </p>
        </div>
        <span className="brand-foot">wb.gpglab.site</span>
      </aside>

      <div className="auth-pane">
        <LanguageSelect />
        <form className="auth-card" onSubmit={onSubmit}>
          <h1>{t('auth.login.title')}</h1>
          <p className="sub">{t('auth.login.subtitle')}</p>
          <label>
            {t('auth.email')}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label>
            {t('auth.password')}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="primary" disabled={loading}>
            {loading ? t('auth.login.submitting') : t('auth.login.submit')}
          </button>
          <SocialLoginButtons />
          <button type="button" className="guest-btn" onClick={onGuest}>
            {t('auth.login.continueAsGuest')}
          </button>
          <p className="muted">
            {t('auth.login.noAccount')} <Link to="/signup">{t('auth.login.signupLink')}</Link>
          </p>
        </form>
      </div>
      <style>{authStyles}</style>
    </div>
  )
}
