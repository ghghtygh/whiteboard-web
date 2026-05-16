import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface GridState {
  visible: boolean
  toggle: () => void
  set: (visible: boolean) => void
}

export const useGridStore = create<GridState>()(
  persist(
    (set, get) => ({
      visible: true,
      toggle: () => set({ visible: !get().visible }),
      set: (visible) => set({ visible }),
    }),
    { name: 'whiteboard-grid' },
  ),
)
