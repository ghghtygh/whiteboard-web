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
    // 주기적으로 서버에 상태(sync step1)를 재요청해, 업데이트 메시지가 한 번 유실돼도
    // (끊김/릴레이 누락/서버 다중 인스턴스) 이 주기 안에 문서가 다시 수렴하게 한다.
    // 주의: 이 백엔드는 SyncStep1 에 client state vector 를 무시하고 "문서 전체"를
    // 매번 다시 내려준다. 너무 짧으면 큰 보드에서 전체 재다운로드가 반복돼 오히려
    // 끊김을 유발하므로 20초로 둔다 (안전망 용도, 실시간 전달은 relay 가 담당).
    resyncInterval: 20000,
    // 재연결 backoff 상한을 낮춰 끊겼을 때 더 빨리 복구한다 (기본 2500ms).
    maxBackoffTime: 2500,
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
