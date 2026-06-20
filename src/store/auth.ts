import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import type { AuthTokens, User } from '@/types/domain'
import { IS_LOCAL_MODE } from '@/local/mode'

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: User | null
  setAuth: (tokens: AuthTokens, user: User) => void
  setTokens: (tokens: AuthTokens) => void
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
      setAuth: (tokens, user) =>
        set({ token: tokens.accessToken, refreshToken: tokens.refreshToken, user }),
      // 소셜 로그인 콜백: 토큰만 먼저 저장해 인증 헤더가 붙도록 한 뒤 me() 로 유저를 채운다.
      setTokens: (tokens) =>
        set({ token: tokens.accessToken, refreshToken: tokens.refreshToken }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, refreshToken: null, user: null }),
      ensureGuest: () => {
        if (!IS_LOCAL_MODE) return
        const cur = get()
        if (cur.token && cur.user) return
        const user: User = {
          id: nanoid(8),
          email: 'guest@local',
          name: 'Guest',
        }
        set({ token: 'local-guest', refreshToken: 'local-guest', user })
      },
    }),
    { name: 'whiteboard-auth' },
  ),
)
