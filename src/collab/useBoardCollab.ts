import { useEffect, useState } from 'react'
import type { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import { createBoardDoc, type BoardDoc } from './doc'
import { connectBoard } from './provider'
import { bootstrapAwareness } from './awareness'
import { useAuthStore } from '@/store/auth'
import { SYNC_AVAILABLE, useSyncStore } from '@/store/sync'

export interface BoardCollab {
  doc: BoardDoc | null
  provider: WebsocketProvider | null
  // 실시간 동기화 연결 상태. SYNC_ENABLED 일 때만 의미 있음.
  syncConnected: boolean
  // 보드 초기 로드 완료 여부 (IDB synced 시점)
  ready: boolean
  // 다른 사용자와 동기화 가능한지 (환경 설정에 따라)
  syncEnabled: boolean
}

// 항상 IndexedDB로 로컬 영속화 + SYNC_WS_URL 이 있으면 같은 boardId로 WebSocket 동기화.
// 같은 URL을 들고 두 명이 접속하면 자동으로 실시간 협업이 동작한다.
export function useBoardCollab(boardId: string | null): BoardCollab {
  const user = useAuthStore((s) => s.user)
  // 사용자가 동기화를 켰는지 (URL 이 있을 때만 유효). 토글하면 effect 가 재실행돼
  // WebSocketProvider 가 붙거나 떨어진다.
  const syncOn = useSyncStore((s) => s.enabled)
  const syncEnabled = SYNC_AVAILABLE && syncOn
  const [doc, setDoc] = useState<BoardDoc | null>(null)
  const [provider, setProvider] = useState<WebsocketProvider | null>(null)
  const [syncConnected, setSyncConnected] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!boardId) return
    const next = createBoardDoc()

    // 1) 로컬 IDB 영속화 — 항상.
    const idb = new IndexeddbPersistence(`whiteboard.board.${boardId}`, next.ydoc)
    idb.once('synced', () => setReady(true))

    // 2) WebSocket 동기화 — URL 이 있고 사용자가 켰을 때만.
    let prov: WebsocketProvider | null = null
    let cleanup: (() => void) | null = null
    if (syncEnabled) {
      prov = connectBoard(boardId, next)
      bootstrapAwareness(prov, user)
      const onStatus = (e: { status: string }) => setSyncConnected(e.status === 'connected')
      prov.on('status', onStatus)
      cleanup = () => prov?.off('status', onStatus)
    }

    setDoc(next)
    setProvider(prov)

    return () => {
      cleanup?.()
      prov?.destroy()
      void idb.destroy()
      next.ydoc.destroy()
      setDoc(null)
      setProvider(null)
      setReady(false)
      setSyncConnected(false)
    }
  }, [boardId, user, syncEnabled])

  return { doc, provider, syncConnected, ready, syncEnabled }
}
