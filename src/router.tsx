import { createBrowserRouter } from 'react-router-dom'
import { RequireAuth, RequireMember } from '@/App'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { OAuthCallbackPage } from '@/pages/OAuthCallbackPage'
import { BoardListPage } from '@/pages/BoardListPage'
import { BoardEditPage } from '@/pages/BoardEditPage'
import { TokensPage } from '@/pages/TokensPage'
import { ViewGraphPage } from '@/pages/ViewGraphPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { LandingRedirect } from '@/pages/LandingRedirect'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/oauth/callback', element: <OAuthCallbackPage /> },
  // 1회용 그래프 뷰어 — 로그인 여부와 무관하게 링크(토큰)만 있으면 누구나 연다.
  // 서버엔 아무것도 저장되지 않으므로 회원/게스트 구분 자체가 의미 없다.
  { path: '/view/:token', element: <ViewGraphPage /> },
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
    children: [
      { path: '/boards', element: <BoardListPage /> },
      { path: '/settings/tokens', element: <TokensPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
