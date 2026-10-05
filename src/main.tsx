import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useAuthStore } from '@/store/auth'
import { ToastHost } from '@/components/ToastHost'
import { bindDocumentLocale } from '@/i18n'
import './styles/global.css'

// 부트 시 표시용 게스트 유저를 시드 — 비회원도 로그인 없이 바로 사용한다(RequireAuth 통과).
// 정식 로그인/게스트 토큰이 이미 있으면 ensureGuest 는 아무것도 하지 않는다.
useAuthStore.getState().ensureGuest()

// <html lang> / 문서 제목을 현재 로케일과 동기화한다(언어 전환 시 자동 갱신).
bindDocumentLocale()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
    <ToastHost />
  </StrictMode>,
)
