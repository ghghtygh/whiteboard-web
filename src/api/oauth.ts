import { IS_LOCAL_MODE } from '@/local/mode'

export type OAuthProvider = 'google' | 'github' | 'kakao' | 'naver'

export interface OAuthProviderInfo {
  id: OAuthProvider
  label: string
  bg: string
  fg: string
  border?: string
}

export const OAUTH_PROVIDERS: OAuthProviderInfo[] = [
  { id: 'google', label: 'Google', bg: '#ffffff', fg: '#1f1f1f', border: '#dadce0' },
  { id: 'github', label: 'GitHub', bg: '#181717', fg: '#ffffff' },
  { id: 'kakao', label: 'Kakao', bg: '#fee500', fg: '#191600' },
  { id: 'naver', label: 'Naver', bg: '#03c75a', fg: '#ffffff' },
]

// 백엔드 오리진. REST 는 Vite 프록시로 /api 를 상대 경로 호출하지만,
// OAuth2 는 인가요청과 콜백이 같은 오리진의 세션(JSESSIONID)을 공유해야 하므로
// 프록시를 거치지 않고 백엔드로 '직접' 이동해야 한다 (전체 페이지 네비게이션이라 CORS 무관).
// 운영에서 프론트와 백엔드가 동일 오리진이면 VITE_API_ORIGIN='' 로 두면 상대 경로가 된다.
const API_ORIGIN = (
  (import.meta.env.VITE_API_ORIGIN as string | undefined) ?? 'http://localhost:8080'
).replace(/\/$/, '')

export function oauthLoginUrl(provider: OAuthProvider): string {
  return `${API_ORIGIN}/oauth2/authorization/${provider}`
}

// 로컬(백엔드 없는) 모드에서는 소셜 로그인을 노출하지 않는다.
export const SOCIAL_LOGIN_ENABLED = !IS_LOCAL_MODE
