import type { Anchor } from '@/types/domain'

// 스펙 §7.2 그리드 스냅 8px
export const GRID = 8
export const NODE_W = 80
export const NODE_H = 80
export const ANCHOR_R = 6

export function snap(v: number): number {
  return Math.round(v / GRID) * GRID
}

// 스펙 §7.2 동시 드롭 충돌 회피 ±10px jitter
export function dropJitter(): number {
  return Math.round((Math.random() - 0.5) * 20)
}

export interface Point {
  x: number
  y: number
}

export function anchorPoint(
  x: number,
  y: number,
  w: number,
  h: number,
  anchor: Anchor,
): Point {
  switch (anchor) {
    case 'top':
      return { x: x + w / 2, y }
    case 'right':
      return { x: x + w, y: y + h / 2 }
    case 'bottom':
      return { x: x + w / 2, y: y + h }
    case 'left':
      return { x, y: y + h / 2 }
  }
}

// from→to 가 어느 면으로 빠져나가야 자연스러운지 추정
export function nearestAnchor(
  fromX: number,
  fromY: number,
  fromW: number,
  fromH: number,
  toX: number,
  toY: number,
): Anchor {
  const cx = fromX + fromW / 2
  const cy = fromY + fromH / 2
  const dx = toX - cx
  const dy = toY - cy
  if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? 'right' : 'left'
  return dy >= 0 ? 'bottom' : 'top'
}
