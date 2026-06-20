import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SYNC_WS_URL } from '@/local/mode'

/**
 * 실시간 동기화를 "사용할 수 있는가" — WebSocket 릴레이 URL 이 설정돼 있어야 한다.
 * (빌드 타임 env 로 결정. 미설정이면 동기화 자체가 불가능.)
 */
export const SYNC_AVAILABLE = SYNC_WS_URL !== null

interface SyncState {
  /** 사용자가 실시간 동기화를 켰는지 (SYNC_AVAILABLE 일 때만 의미 있음). */
  enabled: boolean
  toggle: () => void
  set: (v: boolean) => void
}

/**
 * 동기화 on/off 를 런타임에 토글하고 localStorage 에 보존한다.
 * 기본값은 URL 이 설정돼 있으면 ON. useBoardCollab 이 이 값을 구독해
 * 켜고 끌 때마다 WebSocketProvider 를 붙였다 뗐다 한다.
 */
export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      enabled: SYNC_AVAILABLE,
      toggle: () => set({ enabled: !get().enabled }),
      set: (v) => set({ enabled: v }),
    }),
    { name: 'whiteboard-sync' },
  ),
)
