import { WebsocketProvider } from 'y-websocket'
import type { BoardDoc } from './doc'
import { useAuthStore } from '@/store/auth'

function wsBase(): string {
  const envUrl = import.meta.env.VITE_WS_URL as string | undefined
  if (envUrl) return envUrl.replace(/\/$/, '')
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}`
}

export function connectBoard(boardId: string, doc: BoardDoc): WebsocketProvider {
  const token = useAuthStore.getState().token ?? ''
  const url = `${wsBase()}/ws/boards`
  const provider = new WebsocketProvider(url, boardId, doc.ydoc, {
    params: { token },
    connect: true,
  })
  return provider
}
