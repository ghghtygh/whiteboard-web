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
  const token = useAuthStore.getState().token ?? ''
  const url = SYNC_WS_URL ?? `${defaultWsBase()}/ws/boards`
  const provider = new WebsocketProvider(url, boardId, doc.ydoc, {
    params: { token },
    connect: true,
  })
  return provider
}
