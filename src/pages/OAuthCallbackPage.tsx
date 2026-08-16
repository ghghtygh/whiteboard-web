import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { me } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import { authStyles } from './authStyles'

/**
 * 소셜 로그인 콜백. 백엔드(OAuth2LoginSuccessHandler)가
 *   {redirect-uri}#accessToken=..&refreshToken=..
 * 형태로 리다이렉트해 준 토큰을 URL fragment 에서 파싱한다.
 * fragment 는 서버 로그/리퍼러에 남지 않으며, 파싱 직후 주소창에서도 제거한다.
 */
export function OAuthCallbackPage() {
  const navigate = useNavigate()
  const setTokens = useAuthStore((s) => s.setTokens)
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)
  const [error, setError] = useState<string | null>(null)
  const handled = useRef(false)

  useEffect(() => {
    // StrictMode 의 이펙트 2회 실행 방지.
    if (handled.current) return
    handled.current = true

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const accessToken = params.get('accessToken')
    const refreshToken = params.get('refreshToken')

    if (!accessToken || !refreshToken) {
      setError('We didn’t receive your login details. Please try again.')
      return
    }

    // 토큰을 먼저 저장해야 axios 인터셉터가 Authorization 헤더를 붙여 me() 를 호출할 수 있다.
    setTokens({ accessToken, refreshToken })
    // 주소창의 토큰 흔적 제거 (뒤로가기/공유 시 노출 방지).
    window.history.replaceState(null, '', window.location.pathname)

    me()
      .then((user) => {
        setUser(user)
        navigate('/boards', { replace: true })
      })
      .catch(() => {
        logout()
        setError('We couldn’t load your account. Please log in again.')
      })
  }, [navigate, setTokens, setUser, logout])

  return (
    <div className="auth-pane callback-pane">
      <div className="auth-card">
        {error ? (
          <>
            <h1>Login failed</h1>
            <p className="error">{error}</p>
            <Link to="/login" className="primary back">Back to login</Link>
          </>
        ) : (
          <>
            <h1>Logging in…</h1>
            <p className="muted">Checking your social account…</p>
          </>
        )}
      </div>
      <style>{authStyles}</style>
      <style>{`
        .callback-pane { min-height: 100%; }
        .callback-pane .auth-card .muted { text-align: left; }
      `}</style>
    </div>
  )
}
