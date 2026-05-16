// 백엔드/카탈로그/보드 API를 로컬(localStorage)로 처리하는지 여부.
// 기본은 로컬 모드. VITE_REMOTE_MODE=true 이면 백엔드 호출.
const explicitRemote = import.meta.env.VITE_REMOTE_MODE === 'true'
export const IS_LOCAL_MODE = !explicitRemote

// 실시간 동기화용 Yjs WebSocket 릴레이 URL.
// 로컬/원격 모드와 독립적으로 설정 가능 — 값이 있으면 같은 boardId 가진 사용자끼리 P2P-like 동기화.
// 예시:
//   VITE_SYNC_WS_URL=wss://demos.yjs.dev/ws        (공개 데모 릴레이, 테스트용)
//   VITE_SYNC_WS_URL=ws://localhost:1234           (자체 호스팅 y-websocket)
// 미설정이면 로컬 IDB 영속화만 사용 (단독 편집).
export const SYNC_WS_URL: string | null =
  (import.meta.env.VITE_SYNC_WS_URL as string | undefined)?.replace(/\/$/, '') || null

export const SYNC_ENABLED = SYNC_WS_URL !== null
