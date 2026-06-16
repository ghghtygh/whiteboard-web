import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { me } from '@/api/auth'
import { useAuthStore } from '@/store/auth'

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
      setError('로그인 정보를 받지 못했습니다. 다시 시도해 주세요.')
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
        setError('사용자 정보를 불러오지 못했습니다. 다시 로그인해 주세요.')
      })
  }, [navigate, setTokens, setUser, logout])

  return (
    <div className="auth-shell">
      <div className="auth-card">
        {error ? (
          <>
            <h1>로그인 실패</h1>
            <p className="error">{error}</p>
            <Link to="/login" className="primary back">로그인으로 돌아가기</Link>
          </>
        ) : (
          <>
            <h1>로그인 중…</h1>
            <p className="muted">소셜 계정 정보를 확인하고 있습니다.</p>
          </>
        )}
      </div>
      <style>{`
        .auth-shell { min-height: 100%; display: grid; place-items: center; padding: 24px; }
        .auth-card {
          background: var(--color-panel); border: 1px solid var(--color-border);
          border-radius: var(--radius-md); box-shadow: var(--shadow-md);
          padding: 32px; width: 100%; max-width: 360px;
          display: flex; flex-direction: column; gap: 16px;
        }
        .auth-card h1 { margin: 0 0 8px; font-size: 20px; }
        .auth-card .error { color: var(--color-danger); margin: 0; font-size: 13px; }
        .auth-card .muted { color: var(--color-muted); font-size: 13px; margin: 0; }
        .auth-card .back {
          display: inline-flex; align-items: center; justify-content: center;
          height: 40px; text-decoration: none; border-radius: var(--radius-md);
        }
      `}</style>
    </div>
  )
}
