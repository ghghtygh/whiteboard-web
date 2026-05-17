import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SnapState {
  enabled: boolean
  toggle: () => void
}

// 격자 스냅 — 활성화 시 노드 좌상단이 COARSE_GRID(120) 단위로 정렬됨.
export const useSnapStore = create<SnapState>()(
  persist(
    (set, get) => ({
      enabled: false,
      toggle: () => set({ enabled: !get().enabled }),
    }),
    { name: 'whiteboard-snap-align' },
  ),
)
