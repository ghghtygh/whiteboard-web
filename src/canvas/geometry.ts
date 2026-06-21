import Konva from 'konva'
import type { Anchor, Node } from '@/types/domain'

// 스펙 §7.2 그리드 스냅 8px
export const GRID = 8
// 격자 스냅 모드 — 정렬 활성화 시 노드 좌상단을 이 단위로 맞춤.
// 노드 박스 폭(NODE_W=80)의 절반 — 박스 하나가 2 셀을 차지하는 바둑판 그리드.
export const COARSE_GRID = 40
export const NODE_W = 80
export const NODE_H = 80
export const ANCHOR_R = 6

export const LABEL_GAP = 2 // 아이콘과 라벨 사이 — 박스가 답답하지 않게 좁게
export const LABEL_LINE_H = 14
export const LABEL_BOTTOM_PAD = 4 // 라벨 아래 약간의 여유
export const LABEL_MAX_LINES = 2 // 길면 wrap, 그 이상이면 ellipsis
export const LABEL_FONT_SIZE = 12
// 라벨 폰트를 명시 고정 — 미지정 시 OS 기본 폰트에 따라 글자 폭이 달라져
// 박스 높이(줄 수)가 환경마다 달라진다. NodeShape 의 <Text> 와 반드시 동일하게 유지.
export const LABEL_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

export function snap(v: number): number {
  return Math.round(v / GRID) * GRID
}

export function coarseSnap(v: number): number {
  return Math.round(v / COARSE_GRID) * COARSE_GRID
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

// NodeShape 라벨과 동일한 폰트·폭·wrap 설정의 오프스크린 Text 로 실제 줄 수를 측정한다.
// (추정이 아니라 실측이라 같은 기기에서 박스 높이가 실제 렌더와 항상 일치한다.)
let labelMeasurer: Konva.Text | null = null
function countLabelLines(text: string): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 1
  if (!labelMeasurer) {
    labelMeasurer = new Konva.Text({
      fontSize: LABEL_FONT_SIZE,
      fontFamily: LABEL_FONT,
      lineHeight: LABEL_LINE_H / LABEL_FONT_SIZE,
      wrap: 'word',
      width: NODE_W,
    })
  }
  labelMeasurer.text(text)
  // Konva 가 wrap 계산해 채운 줄 배열의 길이 = 실제 줄 수.
  const arr = (labelMeasurer as unknown as { textArr?: unknown[] }).textArr
  const lines = arr?.length ?? 1
  return Math.min(LABEL_MAX_LINES, Math.max(1, lines))
}

export function computeBoxDims(displayText: string): BoxDims {
  const text = (displayText || '').trim() || ' '
  const lines = countLabelLines(text)
  return {
    width: NODE_W,
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
