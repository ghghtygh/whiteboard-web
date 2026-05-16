import { useEffect, useState } from 'react'
import type { Awareness } from 'y-protocols/awareness'
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

// selection 은 ["node:abc", "edge:xyz", "group:g1"] 형식의 키 리스트
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

export function setLocalCursor(awareness: Awareness | null, cursor: CursorState | null): void {
  if (!awareness) return
  awareness.setLocalStateField('cursor', cursor)
}

export function setLocalSelection(awareness: Awareness | null, selection: string[]): void {
  if (!awareness) return
  awareness.setLocalStateField('selection', selection)
}

// 다른 peer의 awareness state. 로컬 자기 자신은 제외.
export function useRemoteAwareness(awareness: Awareness | null): Map<number, AwarenessState> {
  const [states, setStates] = useState<Map<number, AwarenessState>>(() => new Map())
  useEffect(() => {
    if (!awareness) {
      setStates(new Map())
      return
    }
    const refresh = () => {
      const local = awareness.clientID
      const all = awareness.getStates() as Map<number, AwarenessState>
      const remote = new Map<number, AwarenessState>()
      all.forEach((s, id) => {
        if (id !== local && s && s.user) remote.set(id, s)
      })
      setStates(remote)
    }
    refresh()
    awareness.on('change', refresh)
    return () => awareness.off('change', refresh)
  }, [awareness])
  return states
}
