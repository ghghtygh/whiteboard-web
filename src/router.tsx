import { createBrowserRouter } from 'react-router-dom'
import { RequireAuth } from '@/App'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { BoardListPage } from '@/pages/BoardListPage'
import { BoardEditPage } from '@/pages/BoardEditPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { LandingRedirect } from '@/pages/LandingRedirect'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <LandingRedirect /> },
      { path: '/boards', element: <BoardListPage /> },
      { path: '/boards/:boardId', element: <BoardEditPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
