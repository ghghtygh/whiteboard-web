import { create } from 'zustand'

// 월드 좌표 사각형 — 팬 제한의 기준이 되는 콘텐츠 바운딩 박스
export interface PanLimit {
  x: number
  y: number
  width: number
  height: number
}

interface ViewportState {
  scale: number
  x: number
  y: number
  canvasWidth: number
  canvasHeight: number
  // null 이면 팬 제한 없음 (빈 보드 등)
  panLimit: PanLimit | null
  setScale: (scale: number) => void
  setPosition: (x: number, y: number) => void
  setCanvasSize: (w: number, h: number) => void
  setPanLimit: (limit: PanLimit | null) => void
  reset: () => void
}

export const MIN_SCALE = 0.25
export const MAX_SCALE = 4

// 콘텐츠 가장자리가 화면 밖으로 완전히 사라지지 않도록, 뷰포트 중심이 콘텐츠 박스에서
// 화면 크기의 이 비율까지만 벗어날 수 있다. 0.4 → 콘텐츠가 화면 가장자리 10% 안쪽엔 항상 남는다.
const PAN_SLACK = 0.4

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

// 한 축에 대한 제한. 이미 범위 밖에 있으면(콘텐츠가 삭제/이동돼 범위가 줄어든 경우)
// 갑자기 튀지 않도록 "현재보다 더 멀어지는 방향"만 막는다.
function clampAxis(next: number, cur: number, lo: number, hi: number): number {
  return Math.min(Math.max(next, Math.min(lo, cur)), Math.max(hi, cur))
}

// 스테이지 위치(x, y)를 panLimit 기준으로 보정. 위치 값은 "월드 원점의 화면 좌표"이므로
// 뷰포트 중심(월드) = (화면 크기/2 - 위치) / scale.
function clampPan(
  limit: PanLimit | null,
  cw: number,
  ch: number,
  scale: number,
  x: number,
  y: number,
  curScale: number,
  curX: number,
  curY: number,
): { x: number; y: number } {
  if (!limit || cw <= 0 || ch <= 0 || scale <= 0 || curScale <= 0) return { x, y }
  const viewW = cw / scale
  const viewH = ch / scale
  const cx = (cw / 2 - x) / scale
  const cy = (ch / 2 - y) / scale
  const curCx = (cw / 2 - curX) / curScale
  const curCy = (ch / 2 - curY) / curScale
  const ncx = clampAxis(cx, curCx, limit.x - viewW * PAN_SLACK, limit.x + limit.width + viewW * PAN_SLACK)
  const ncy = clampAxis(cy, curCy, limit.y - viewH * PAN_SLACK, limit.y + limit.height + viewH * PAN_SLACK)
  if (ncx === cx && ncy === cy) return { x, y }
  return { x: cw / 2 - ncx * scale, y: ch / 2 - ncy * scale }
}

export const useViewportStore = create<ViewportState>((set) => ({
  scale: 1,
  x: 0,
  y: 0,
  canvasWidth: 0,
  canvasHeight: 0,
  panLimit: null,
  setScale: (scale) =>
    set((s) => {
      const next = clampScale(scale)
      const p = clampPan(s.panLimit, s.canvasWidth, s.canvasHeight, next, s.x, s.y, s.scale, s.x, s.y)
      return { scale: next, x: p.x, y: p.y }
    }),
  setPosition: (x, y) =>
    set((s) => clampPan(s.panLimit, s.canvasWidth, s.canvasHeight, s.scale, x, y, s.scale, s.x, s.y)),
  setCanvasSize: (canvasWidth, canvasHeight) => set({ canvasWidth, canvasHeight }),
  setPanLimit: (panLimit) => set({ panLimit }),
  reset: () =>
    set((s) => {
      const p = clampPan(s.panLimit, s.canvasWidth, s.canvasHeight, 1, 0, 0, s.scale, s.x, s.y)
      return { scale: 1, x: p.x, y: p.y }
    }),
}))
