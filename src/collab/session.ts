import { useAuthStore } from '@/store/auth'
import { useSyncStore, SYNC_AVAILABLE } from '@/store/sync'
import { guestLogin } from '@/api/auth'

/**
 * "공유하기" 시 호출 — 실시간 협업 세션을 보장한다.
 * 1) 토큰이 없으면(비회원) 서버에서 게스트 토큰을 발급받아 저장 (WS 인증용).
 * 2) 실시간 동기화(WebSocketProvider)를 켠다.
 *
 * 정식 회원은 이미 토큰이 있으므로 동기화만 켠다.
 * 동기화 릴레이 URL(VITE_SYNC_WS_URL)이 없으면 게스트 토큰만 발급하고 무동작.
 */
export async function ensureCollabSession(): Promise<void> {
  const { token } = useAuthStore.getState()
  if (!token) {
    const { tokens, user } = await guestLogin()
    useAuthStore.getState().setGuestAuth(tokens, user)
  }
  if (SYNC_AVAILABLE) {
    useSyncStore.getState().set(true)
  }
}
