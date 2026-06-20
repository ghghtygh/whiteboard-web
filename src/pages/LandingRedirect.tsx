import { useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { localBoards } from '@/local/boardsStore'
import { isBackendActive } from '@/store/auth'

// `/` 진입 시 — 정식 로그인 회원은 백엔드 보드 목록으로, 비회원은 로컬에서
// 마지막에 열었던 보드로 곧장 점프 (Excalidraw 스타일). 없으면 무제 보드 자동 생성.
export function LandingRedirect() {
  const target = useMemo(() => {
    if (isBackendActive()) return '/boards'
    return `/boards/${localBoards.lastOpenedOrDefault()}`
  }, [])
  return <Navigate to={target} replace />
}
