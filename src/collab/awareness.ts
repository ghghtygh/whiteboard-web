import type { WebsocketProvider } from 'y-websocket'
import type { User } from '@/types/domain'

export interface CursorState {
  x: number
  y: number
}

export interface AwarenessUser {
  name: string
  color: string
}

export interface AwarenessState {
  user: AwarenessUser
  cursor: CursorState | null
  selection: string[]
}

const PALETTE = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#0891b2', '#e11d48']

export function pickColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length] ?? PALETTE[0]!
}

export function bootstrapAwareness(provider: WebsocketProvider, user: User | null): void {
  if (!user) return
  const state: AwarenessState = {
    user: { name: user.name || user.email, color: pickColor(user.id) },
    cursor: null,
    selection: [],
  }
  provider.awareness.setLocalState(state)
}

export function updateCursor(provider: WebsocketProvider, cursor: CursorState | null): void {
  const local = (provider.awareness.getLocalState() ?? {}) as Partial<AwarenessState>
  provider.awareness.setLocalStateField('cursor', cursor)
  void local
}
