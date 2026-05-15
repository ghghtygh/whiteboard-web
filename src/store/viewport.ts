import { create } from 'zustand'

interface ViewportState {
  scale: number
  x: number
  y: number
  setScale: (scale: number) => void
  setPosition: (x: number, y: number) => void
  reset: () => void
}

const MIN = 0.25
const MAX = 4

export const useViewportStore = create<ViewportState>((set) => ({
  scale: 1,
  x: 0,
  y: 0,
  setScale: (scale) => set({ scale: Math.min(MAX, Math.max(MIN, scale)) }),
  setPosition: (x, y) => set({ x, y }),
  reset: () => set({ scale: 1, x: 0, y: 0 }),
}))
