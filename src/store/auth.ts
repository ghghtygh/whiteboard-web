import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import type { AuthTokens, User } from '@/types/domain'
import { IS_LOCAL_MODE } from '@/local/mode'

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: User | null
  /** 게스트(공유 시 발급한 임시 토큰)면 true. 정식 로그인이면 false. */
  isGuest: boolean
  setAuth: (tokens: AuthTokens, user: User) => void
  setTokens: (tokens: AuthTokens) => void
  /** 공유하기 등에서 발급한 게스트 토큰 저장 — 백엔드 보드 CRUD 는 트리거하지 않는다(WS 협업 전용). */
  setGuestAuth: (tokens: AuthTokens, user: User) => void
  setUser: (user: User) => void
  logout: () => void
  ensureGuest: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      isGuest: false,
      setAuth: (tokens, user) =>
        set({ token: tokens.accessToken, refreshToken: tokens.refreshToken, user, isGuest: false }),
      // 소셜 로그인 콜백: 토큰만 먼저 저장해 인증 헤더가 붙도록 한 뒤 me() 로 유저를 채운다.
      setTokens: (tokens) =>
        set({ token: tokens.accessToken, refreshToken: tokens.refreshToken, isGuest: false }),
      setGuestAuth: (tokens, user) =>
        set({ token: tokens.accessToken, refreshToken: tokens.refreshToken, user, isGuest: true }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, refreshToken: null, user: null, isGuest: false }),
      // 비회원: 토큰 없이 표시용 게스트 유저만 시드한다(백엔드 미사용 → 로컬로 동작).
      ensureGuest: () => {
        const cur = get()
        if (cur.user) return
        set({ user: { id: nanoid(8), email: 'guest@local', name: 'Guest' }, isGuest: true })
      },
    }),
    { name: 'whiteboard-auth' },
  ),
)

/**
 * 백엔드(원격 REST)를 쓸 조건 = 원격 모드로 빌드됐고 + 정식 로그인 상태(게스트 토큰 제외).
 * 비회원·게스트는 로컬(localStorage/IndexedDB)로 동작한다. 게스트 토큰은 WS 협업 인증 전용.
 */
export function isBackendActive(): boolean {
  if (IS_LOCAL_MODE) return false
  const s = useAuthStore.getState()
  return !!s.token && !s.isGuest
}
