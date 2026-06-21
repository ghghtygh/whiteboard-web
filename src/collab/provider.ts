import { WebsocketProvider } from 'y-websocket'
import type { BoardDoc } from './doc'
import { useAuthStore } from '@/store/auth'
import { SYNC_WS_URL } from '@/local/mode'

function defaultWsBase(): string {
  if (SYNC_WS_URL) return SYNC_WS_URL
  const envUrl = import.meta.env.VITE_WS_URL as string | undefined
  if (envUrl) return envUrl.replace(/\/$/, '')
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}`
}

// 같은 URL + 같은 boardId(room) 으로 접속한 모든 클라이언트는 자동으로 동기화된다.
// SYNC_WS_URL 이 설정돼 있으면 그쪽으로, 아니면 VITE_WS_URL / origin 으로 fallback.
export function connectBoard(boardId: string, doc: BoardDoc): WebsocketProvider {
  const url = SYNC_WS_URL ?? `${defaultWsBase()}/ws/boards`
  const provider = new WebsocketProvider(url, boardId, doc.ydoc, {
    // 토큰은 항상 store 의 최신값을 읽는다 — 게스트 토큰 갱신 후 재연결돼도
    // 옛 토큰으로 인증 실패하지 않게.
    params: { get token() { return useAuthStore.getState().token ?? '' } },
    connect: true,
    // 주의: resyncInterval(주기적 SyncStep1 재요청)은 쓰지 않는다.
    // 이 백엔드는 SyncStep1 마다 문서 전체를 다시 내려주고, 역방향 SyncStep1 로
    // 클라이언트 전체 상태를 받아 서버 스냅샷을 통째로 덮어쓴다. 주기적으로 돌리면
    // 전체 재전송 폭주 + 스냅샷 덮어쓰기 경쟁으로 오히려 동기화가 불안정해진다.
    // 끊겼다 붙을 때 y-websocket 이 이미 풀 SyncStep1 로 재동기화하므로 불필요하다.
  })

  // 연결 문제를 콘솔로 드러낸다 — 조용한 끊김 디버깅용.
  provider.on('connection-error', (event: Event) => {
    console.warn('[collab] WS 연결 오류', boardId, event)
  })
  provider.on('connection-close', (event: CloseEvent | null) => {
    if (event && event.code !== 1000) {
      console.warn('[collab] WS 비정상 종료', boardId, event.code, event.reason)
    }
  })

  return provider
}
