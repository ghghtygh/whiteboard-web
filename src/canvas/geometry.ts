import Konva from 'konva'
import type { Anchor, Edge, Node } from '@/types/domain'

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

// 엣지가 앵커에서 처음 꺾이기 전까지 직진하는 최소 길이.
const EDGE_STUB = 20

function isHorizontal(anchor: Anchor): boolean {
  return anchor === 'left' || anchor === 'right'
}

// 앵커 면의 바깥 방향 (+1 / -1).
function outward(anchor: Anchor): number {
  return anchor === 'right' || anchor === 'bottom' ? 1 : -1
}

// 두 앵커를 잇는 직각(orthogonal) 경로 [x0,y0, x1,y1, ...].
// 모든 구간이 수평/수직이고, 앵커 면에 수직으로 나가고 수직으로 들어온다.
// → 대각선 배치에서도 사선 없이 ㄱ/ㄹ 자로 꺾여 연결되고 화살촉은 면을 정면으로 가리킨다.
export function orthogonalRoute(a: Point, aAnchor: Anchor, b: Point, bAnchor: Anchor): number[] {
  const da = outward(aAnchor)
  const db = outward(bAnchor)
  const aH = isHorizontal(aAnchor)
  const bH = isHorizontal(bAnchor)
  // 앵커에서 EDGE_STUB 만큼 빠져나온 지점
  const p1 = aH ? { x: a.x + da * EDGE_STUB, y: a.y } : { x: a.x, y: a.y + da * EDGE_STUB }
  const p2 = bH ? { x: b.x + db * EDGE_STUB, y: b.y } : { x: b.x, y: b.y + db * EDGE_STUB }

  let pts: Point[]
  if (aH && bH) {
    if ((b.x - a.x) * da > 0 && (a.x - b.x) * db > 0) {
      // 서로 마주보는 면 → 가운데에서 한 번 세로로 꺾는 ㄹ 자
      const mx = (a.x + b.x) / 2
      pts = [a, { x: mx, y: a.y }, { x: mx, y: b.y }, b]
    } else if (da === db) {
      // 같은 쪽 면 → 바깥쪽으로 돌아 나가는 ㄷ 자
      const x = da > 0 ? Math.max(p1.x, p2.x) : Math.min(p1.x, p2.x)
      pts = [a, { x, y: a.y }, { x, y: b.y }, b]
    } else {
      // 서로 등진 면 → 빠져나온 뒤 세로 중간에서 가로지름
      const my = (a.y + b.y) / 2
      pts = [a, p1, { x: p1.x, y: my }, { x: p2.x, y: my }, p2, b]
    }
  } else if (!aH && !bH) {
    if ((b.y - a.y) * da > 0 && (a.y - b.y) * db > 0) {
      const my = (a.y + b.y) / 2
      pts = [a, { x: a.x, y: my }, { x: b.x, y: my }, b]
    } else if (da === db) {
      const y = da > 0 ? Math.max(p1.y, p2.y) : Math.min(p1.y, p2.y)
      pts = [a, { x: a.x, y }, { x: b.x, y }, b]
    } else {
      const mx = (a.x + b.x) / 2
      pts = [a, p1, { x: mx, y: p1.y }, { x: mx, y: p2.y }, p2, b]
    }
  } else if (aH) {
    // 가로로 나가서 세로로 들어옴 → 꺾임 하나인 ㄱ 자가 가능하면 그걸로
    const c = { x: b.x, y: a.y }
    pts =
      (c.x - a.x) * da > 0 && (c.y - b.y) * db > 0
        ? [a, c, b]
        : [a, p1, { x: p1.x, y: p2.y }, p2, b]
  } else {
    const c = { x: a.x, y: b.y }
    pts =
      (c.y - a.y) * da > 0 && (c.x - b.x) * db > 0
        ? [a, c, b]
        : [a, p1, { x: p2.x, y: p1.y }, p2, b]
  }
  return flatten(simplify(pts))
}

// 중복점·일직선 위의 중간점 제거 (예: 마주보는 두 노드가 같은 높이면 직선 하나로).
function simplify(pts: Point[]): Point[] {
  const out: Point[] = []
  for (const p of pts) {
    const last = out[out.length - 1]
    if (last && last.x === p.x && last.y === p.y) continue
    const prev = out[out.length - 2]
    if (prev && last && ((prev.x === last.x && last.x === p.x) || (prev.y === last.y && last.y === p.y))) {
      out[out.length - 1] = p
      continue
    }
    out.push(p)
  }
  return out
}

function flatten(pts: Point[]): number[] {
  return pts.flatMap((p) => [p.x, p.y])
}

// 폴리라인 전체 길이의 절반 지점 — 엣지 라벨 위치.
export function polylineMid(pts: number[]): Point {
  let total = 0
  for (let i = 2; i < pts.length; i += 2) total += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1])
  let half = total / 2
  for (let i = 2; i < pts.length; i += 2) {
    const len = Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1])
    if (half <= len && len > 0) {
      const t = half / len
      return { x: pts[i - 2] + (pts[i] - pts[i - 2]) * t, y: pts[i - 1] + (pts[i + 1] - pts[i - 1]) * t }
    }
    half -= len
  }
  return { x: pts[0], y: pts[1] }
}

// 엣지의 실제 렌더 경로. 앵커가 지정되지 않았으면 상대 노드 방향으로 자동 선택.
export function edgePoints(
  edge: Pick<Edge, 'fromAnchor' | 'toAnchor'>,
  from: Pick<Node, 'x' | 'y' | 'label' | 'type'>,
  to: Pick<Node, 'x' | 'y' | 'label' | 'type'>,
): number[] {
  const fromDims = getNodeBox(from)
  const toDims = getNodeBox(to)
  const toC = boxCenter(to.x, to.y, toDims)
  const fromC = boxCenter(from.x, from.y, fromDims)
  const fromAnchor = edge.fromAnchor ?? nearestAnchor(from.x, from.y, fromDims, toC.x, toC.y)
  const toAnchor = edge.toAnchor ?? nearestAnchor(to.x, to.y, toDims, fromC.x, fromC.y)
  const a = anchorPoint(from.x, from.y, fromAnchor, fromDims)
  const b = anchorPoint(to.x, to.y, toAnchor, toDims)
  return orthogonalRoute(a, fromAnchor, b, toAnchor)
}
