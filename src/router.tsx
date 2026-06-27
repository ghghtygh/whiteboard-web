import { createBrowserRouter } from 'react-router-dom'
import { RequireAuth, RequireMember } from '@/App'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { OAuthCallbackPage } from '@/pages/OAuthCallbackPage'
import { BoardListPage } from '@/pages/BoardListPage'
import { BoardEditPage } from '@/pages/BoardEditPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { LandingRedirect } from '@/pages/LandingRedirect'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/oauth/callback', element: <OAuthCallbackPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <LandingRedirect /> },
      // 공유 링크 — 비회원(게스트)도 협업 참여 가능.
      { path: '/boards/:boardId', element: <BoardEditPage /> },
    ],
  },
  {
    // 보드 목록은 회원 전용 — 원격 모드의 비회원은 로그인 페이지로 이동.
    element: <RequireMember />,
    children: [{ path: '/boards', element: <BoardListPage /> }],
  },
  { path: '*', element: <NotFoundPage /> },
])
