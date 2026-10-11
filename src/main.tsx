import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useAuthStore } from '@/store/auth'
import { ToastHost } from '@/components/ToastHost'
import { bindDocumentLocale } from '@/i18n'
import { pageOf, trackPageView } from '@/metrics/track'
import './styles/global.css'

// 부트 시 표시용 게스트 유저를 시드 — 비회원도 로그인 없이 바로 사용한다(RequireAuth 통과).
// 정식 로그인/게스트 토큰이 이미 있으면 ensureGuest 는 아무것도 하지 않는다.
useAuthStore.getState().ensureGuest()

// <html lang> / 문서 제목을 현재 로케일과 동기화한다(언어 전환 시 자동 갱신).
bindDocumentLocale()

// 페이지뷰 — 최초 진입 + 라우트 경로가 바뀔 때마다 (쿼리/해시만 바뀌면 제외).
let lastPath = router.state.location.pathname
trackPageView(pageOf(lastPath))
router.subscribe((state) => {
  if (state.location.pathname === lastPath) return
  lastPath = state.location.pathname
  trackPageView(pageOf(lastPath))
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
    <ToastHost />
  </StrictMode>,
)
