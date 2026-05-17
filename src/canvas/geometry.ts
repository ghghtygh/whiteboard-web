import type { Anchor, Node } from '@/types/domain'

// 스펙 §7.2 그리드 스냅 8px
export const GRID = 8
export const NODE_W = 80
export const NODE_H = 80
export const ANCHOR_R = 6

export const LABEL_GAP = 2 // 아이콘과 라벨 사이 — 박스가 답답하지 않게 좁게
export const LABEL_LINE_H = 14
export const LABEL_BOTTOM_PAD = 4 // 라벨 아래 약간의 여유
export const LABEL_MAX_LINES = 2 // 길면 wrap, 그 이상이면 ellipsis

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

// 노드의 통합 박스 (아이콘 + 라벨). 가로는 아이콘 폭으로 고정해서 일관된 폭 유지.
// 라벨이 길면 가로로 늘리지 않고 wrap. 라벨 줄 수만큼 세로만 가변.
export interface BoxDims {
  width: number
  height: number
  xOffset: number // 박스 좌측이 노드 origin 기준 얼마나 좌측 (가로 고정이라 항상 0)
}

function estimateTextWidth(text: string): number {
  // 한글/CJK 는 라틴보다 폭이 큼
  let total = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code >= 0xac00 && code <= 0xd7a3) total += 12 // 한글
    else if (code > 0x2e80) total += 11 // 기타 CJK
    else total += 7 // ASCII
  }
  return total
}

export function computeBoxDims(displayText: string): BoxDims {
  const text = (displayText || '').trim() || ' '
  const width = NODE_W
  const rawW = estimateTextWidth(text) + 8
  const lines = Math.min(LABEL_MAX_LINES, Math.max(1, Math.ceil(rawW / width)))
  return {
    width,
    height: NODE_H + LABEL_GAP + lines * LABEL_LINE_H + LABEL_BOTTOM_PAD,
    xOffset: 0,
  }
}

export function nodeDisplayText(node: Pick<Node, 'label' | 'type'>): string {
  return node.label || node.type
}

export function getNodeBox(node: Pick<Node, 'label' | 'type'>): BoxDims {
  return computeBoxDims(nodeDisplayText(node))
}

export function boxCenter(nx: number, ny: number, dims: BoxDims): Point {
  return { x: nx + NODE_W / 2, y: ny + dims.height / 2 }
}

// 박스 외곽 중점에 위치한 앵커.
export function anchorPoint(nx: number, ny: number, anchor: Anchor, dims: BoxDims): Point {
  const left = nx + dims.xOffset
  const right = left + dims.width
  const top = ny
  const bottom = top + dims.height
  const cx = nx + NODE_W / 2
  const cy = ny + dims.height / 2
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
export function nearestAnchor(
  fromX: number,
  fromY: number,
  fromDims: BoxDims,
  toX: number,
  toY: number,
): Anchor {
  const c = boxCenter(fromX, fromY, fromDims)
  const dx = toX - c.x
  const dy = toY - c.y
  if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? 'right' : 'left'
  return dy >= 0 ? 'bottom' : 'top'
}
