import { useEffect, useState } from 'react'
import type { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import { createBoardDoc, type BoardDoc } from './doc'
import { connectBoard } from './provider'
import { bootstrapAwareness } from './awareness'
import { useAuthStore } from '@/store/auth'
import { IS_LOCAL_MODE } from '@/local/mode'

export interface BoardCollab {
  doc: BoardDoc | null
  provider: WebsocketProvider | null
  connected: boolean
  // 로컬 모드: indexeddb 초기 로드 완료 여부. remote 모드에선 WebSocket 'synced' 신호.
  ready: boolean
}

export function useBoardCollab(boardId: string | null): BoardCollab {
  const user = useAuthStore((s) => s.user)
  const [doc, setDoc] = useState<BoardDoc | null>(null)
  const [provider, setProvider] = useState<WebsocketProvider | null>(null)
  const [connected, setConnected] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!boardId) return
    const next = createBoardDoc()

    // 로컬 모드: IndexedDB 영속화만 사용
    if (IS_LOCAL_MODE) {
      const persistence = new IndexeddbPersistence(`whiteboard.board.${boardId}`, next.ydoc)
      persistence.once('synced', () => setReady(true))
      setDoc(next)
      setConnected(true)
      return () => {
        void persistence.destroy()
        next.ydoc.destroy()
        setDoc(null)
        setReady(false)
        setConnected(false)
      }
    }

    // remote 모드: WebSocket
    const prov = connectBoard(boardId, next)
    bootstrapAwareness(prov, user)
    setDoc(next)
    setProvider(prov)
    setConnected(false)

    const onStatus = (event: { status: string }) => setConnected(event.status === 'connected')
    const onSync = (synced: boolean) => synced && setReady(true)
    prov.on('status', onStatus)
    prov.on('sync', onSync)

    return () => {
      prov.off('status', onStatus)
      prov.off('sync', onSync)
      prov.destroy()
      next.ydoc.destroy()
      setDoc(null)
      setProvider(null)
      setConnected(false)
      setReady(false)
    }
  }, [boardId, user])

  return { doc, provider, connected, ready }
}
