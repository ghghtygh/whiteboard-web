import { useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { localBoards } from '@/local/boardsStore'
import { IS_LOCAL_MODE } from '@/local/mode'

// `/` 진입 시 — 로컬 모드에선 마지막에 열었던 보드로 곧장 점프 (Excalidraw 스타일).
// 보드가 없으면 무제 보드를 자동 생성.
export function LandingRedirect() {
  const target = useMemo(() => {
    if (!IS_LOCAL_MODE) return '/boards'
    return `/boards/${localBoards.lastOpenedOrDefault()}`
  }, [])
  return <Navigate to={target} replace />
}
