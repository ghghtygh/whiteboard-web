import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

export function RequireAuth() {
  // 정식 토큰이 아니라 user 유무로 가드한다 — 비회원(게스트 user)도 통과해 로컬로 사용한다.
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
