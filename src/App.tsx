import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { IS_LOCAL_MODE } from '@/local/mode'

export function RequireAuth() {
  // 정식 토큰이 아니라 user 유무로 가드한다 — 비회원(게스트 user)도 통과해 로컬로 사용한다.
  // 공유 링크(/boards/:boardId)는 이 가드를 써서 비회원도 협업에 참여할 수 있다.
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

// 회원 전용 경로(보드 목록) 가드. 원격(백엔드) 모드에서 비회원(게스트)은 로그인 페이지로 보낸다.
// 로컬 모드는 모두가 게스트라 회원 개념이 없으므로 그대로 통과시킨다.
export function RequireMember() {
  const user = useAuthStore((s) => s.user)
  const isGuest = useAuthStore((s) => s.isGuest)
  if (!user) return <Navigate to="/login" replace />
  if (!IS_LOCAL_MODE && isGuest) return <Navigate to="/login" replace />
  return <Outlet />
}
