import type { Anchor } from '@/types/domain'

// 스펙 §7.2 그리드 스냅 8px
export const GRID = 8
export const NODE_W = 80
export const NODE_H = 80
export const ANCHOR_R = 6

// 라벨 영역 — NodeShape 와 공유. 노드 박스(아이콘 + 라벨)는 이 값으로 계산.
export const LABEL_W = 140
export const LABEL_GAP = 4
export const LABEL_LINE_H = 16
export const LABEL_MAX_LINES = 3
export const LABEL_H = LABEL_LINE_H * LABEL_MAX_LINES // 48

// 노드 = 아이콘 + 라벨 통합 박스. 엣지 앵커/연결은 이 박스 외곽 기준이라
// 화살표가 라벨 위를 지나가지 않는다.
export const BOX_W = Math.max(NODE_W, LABEL_W) // 140
export const BOX_H = NODE_H + LABEL_GAP + LABEL_H // 132
export const BOX_X_OFFSET = (NODE_W - BOX_W) / 2 // -30 (라벨이 아이콘보다 넓으면 좌측으로 오프셋)

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

// 노드 (nx, ny) — 아이콘 좌상단. 통합 박스의 중심.
export function boxCenter(nx: number, ny: number): Point {
  return { x: nx + NODE_W / 2, y: ny + BOX_H / 2 }
}

// 박스 외곽 중점에 위치한 앵커. anchor 인자는 박스 어느 면인가.
export function anchorPoint(nx: number, ny: number, anchor: Anchor): Point {
  const left = nx + BOX_X_OFFSET
  const right = left + BOX_W
  const top = ny
  const bottom = top + BOX_H
  const cx = nx + NODE_W / 2
  const cy = ny + BOX_H / 2
  switch (anchor) {
    case 'top':
      return { x: cx, y: top }
    case 'right':
      return { x: right, y: cy }
    case 'bottom':
      return { x: cx, y: bottom }
    case 'left':
      return { x: left, y: cy }
  }
}

// from→to 가 어느 박스 면으로 빠져나가야 자연스러운지 추정.
export function nearestAnchor(fromX: number, fromY: number, toX: number, toY: number): Anchor {
  const c = boxCenter(fromX, fromY)
  const dx = toX - c.x
  const dy = toY - c.y
  if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? 'right' : 'left'
  return dy >= 0 ? 'bottom' : 'top'
}
