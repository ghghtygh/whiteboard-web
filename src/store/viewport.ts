import { create } from 'zustand'

interface ViewportState {
  scale: number
  x: number
  y: number
  canvasWidth: number
  canvasHeight: number
  setScale: (scale: number) => void
  setPosition: (x: number, y: number) => void
  setCanvasSize: (w: number, h: number) => void
  reset: () => void
}

export const MIN_SCALE = 0.25
export const MAX_SCALE = 4

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

export const useViewportStore = create<ViewportState>((set) => ({
  scale: 1,
  x: 0,
  y: 0,
  canvasWidth: 0,
  canvasHeight: 0,
  setScale: (scale) => set({ scale: clampScale(scale) }),
  setPosition: (x, y) => set({ x, y }),
  setCanvasSize: (canvasWidth, canvasHeight) => set({ canvasWidth, canvasHeight }),
  reset: () => set({ scale: 1, x: 0, y: 0 }),
}))
