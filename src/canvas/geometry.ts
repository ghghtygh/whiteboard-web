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

// 엣지 끝과 노드 박스 사이 여백 — 선이 박스에 딱 붙지 않고 살짝 떠 있게 (Excalidraw 의 binding gap).
const EDGE_GAP = 6

// 박스 중심에서 target 방향으로 쏜 반직선이 박스 외곽(+gap)과 만나는 점.
export function boxBoundaryToward(nx: number, ny: number, dims: BoxDims, target: Point): Point {
  const c = boxCenter(nx, ny, dims)
  const dx = target.x - c.x
  const dy = target.y - c.y
  if (dx === 0 && dy === 0) return c
  const hw = dims.width / 2 + EDGE_GAP
  const hh = dims.height / 2 + EDGE_GAP
  const t = Math.min(dx === 0 ? Infinity : hw / Math.abs(dx), dy === 0 ? Infinity : hh / Math.abs(dy))
  return { x: c.x + dx * t, y: c.y + dy * t }
}

// 엣지의 실제 렌더 경로 [x0,y0, x1,y1].
// Excalidraw 식 — 두 박스 중심을 잇는 직선이 각 박스 외곽과 만나는 점을 끝점으로 쓴다.
// 노드를 어디로 옮겨도 선이 상대 노드를 정확히 겨누어 대각선에서도 방향이 자연스럽다.
// 저장된 fromAnchor/toAnchor(면 중점 고정)는 노드를 옮기면 꺾인 듯 어색해져 렌더에 쓰지 않는다.
export function edgePoints(
  from: Pick<Node, 'x' | 'y' | 'label' | 'type'>,
  to: Pick<Node, 'x' | 'y' | 'label' | 'type'>,
): number[] {
  const fromDims = getNodeBox(from)
  const toDims = getNodeBox(to)
  const a = boxBoundaryToward(from.x, from.y, fromDims, boxCenter(to.x, to.y, toDims))
  const b = boxBoundaryToward(to.x, to.y, toDims, boxCenter(from.x, from.y, fromDims))
  return [a.x, a.y, b.x, b.y]
}

// 선분 from→tip 끝에 붙는 열린(V자) 화살촉 [x0,y0, tipX,tipY, x1,y1].
export function arrowHeadPoints(fromX: number, fromY: number, tipX: number, tipY: number, size = 12): number[] {
  const angle = Math.atan2(tipY - fromY, tipX - fromX)
  const spread = Math.PI / 7 // 약 26°
  return [
    tipX - size * Math.cos(angle - spread), tipY - size * Math.sin(angle - spread),
    tipX, tipY,
    tipX - size * Math.cos(angle + spread), tipY - size * Math.sin(angle + spread),
  ]
}
