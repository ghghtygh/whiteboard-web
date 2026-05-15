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
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, refreshToken: null, user: null }),
      ensureGuest: () => {
        if (!IS_LOCAL_MODE) return
        const cur = get()
        if (cur.token && cur.user) return
        const user: User = {
          id: nanoid(8),
          email: 'guest@local',
          name: '게스트',
        }
        set({ token: 'local-guest', refreshToken: 'local-guest', user })
      },
    }),
    { name: 'whiteboard-auth' },
  ),
)
