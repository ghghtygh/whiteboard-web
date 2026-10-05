import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signup } from '@/api/auth'
import { SocialLoginButtons } from '@/components/SocialLoginButtons'
import { LanguageSelect } from '@/components/LanguageSelect'
import { useT } from '@/i18n'
import { authStyles } from './authStyles'

export function SignupPage() {
  const t = useT()
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
      setError(err instanceof Error ? err.message : t('auth.signup.failed'))
    } finally {
      setLoading(false)
    }
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
          <h2>{t('auth.signup.pitchTitleLine1')}<br />{t('auth.signup.pitchTitleLine2')}</h2>
          <p className="brand-sub">
            {t('auth.signup.pitchBody')}
          </p>
        </div>
        <span className="brand-foot">wb.gpglab.site</span>
      </aside>

      <div className="auth-pane">
        <LanguageSelect />
        <form className="auth-card" onSubmit={onSubmit}>
          <h1>{t('auth.signup.title')}</h1>
          <p className="sub">{t('auth.signup.subtitle')}</p>
          <label>
            {t('auth.email')}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </label>
          <label>
            {t('auth.name')}
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            {t('auth.password')}
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
            {loading ? t('auth.signup.submitting') : t('auth.signup.submit')}
          </button>
          <SocialLoginButtons />
          <p className="muted">
            {t('auth.signup.haveAccount')} <Link to="/login">{t('auth.signup.loginLink')}</Link>
          </p>
        </form>
      </div>
      <style>{authStyles}</style>
    </div>
  )
}
