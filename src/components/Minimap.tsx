import { useMemo, useRef } from 'react'
import { useViewportStore } from '@/store/viewport'
import { useCanvasContext } from '@/canvas/useCanvasContext'
import { useNodesSnapshot, useGroupsSnapshot, useEdgesSnapshot } from '@/canvas/hooks'
import { NODE_H, NODE_W } from '@/canvas/geometry'
import { catalogColor } from '@/local/catalogSeed'

const MM_W = 200
const MM_H = 140
const PADDING_WORLD = 200

interface Bounds {
  xMin: number
  yMin: number
  xMax: number
  yMax: number
  scale: number
}

export function Minimap() {
  const { doc } = useCanvasContext()
  const nodes = useNodesSnapshot(doc)
  const groups = useGroupsSnapshot(doc)
  const edges = useEdgesSnapshot(doc)
  const svgRef = useRef<SVGSVGElement>(null)

  // 엣지를 미니맵에서 그릴 때 노드 중심 좌표가 필요
  const nodesById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  const scale = useViewportStore((s) => s.scale)
  const vx = useViewportStore((s) => s.x)
  const vy = useViewportStore((s) => s.y)
  const cw = useViewportStore((s) => s.canvasWidth)
  const ch = useViewportStore((s) => s.canvasHeight)
  const setPosition = useViewportStore((s) => s.setPosition)

  // 현재 뷰포트의 월드 좌표 사각형
  const vpX = scale > 0 ? -vx / scale : 0
  const vpY = scale > 0 ? -vy / scale : 0
  const vpW = scale > 0 ? cw / scale : 0
  const vpH = scale > 0 ? ch / scale : 0

  const bounds = useMemo<Bounds>(() => {
    // 컨텐츠 bbox + 현재 뷰포트 + 패딩의 합집합
    let xMin = vpX - PADDING_WORLD
    let yMin = vpY - PADDING_WORLD
    let xMax = vpX + vpW + PADDING_WORLD
    let yMax = vpY + vpH + PADDING_WORLD
    for (const n of nodes) {
      xMin = Math.min(xMin, n.x)
      yMin = Math.min(yMin, n.y)
      xMax = Math.max(xMax, n.x + NODE_W)
      yMax = Math.max(yMax, n.y + NODE_H)
    }
    for (const g of groups) {
      xMin = Math.min(xMin, g.x)
      yMin = Math.min(yMin, g.y)
      xMax = Math.max(xMax, g.x + g.width)
      yMax = Math.max(yMax, g.y + g.height)
    }
    const worldW = Math.max(1, xMax - xMin)
    const worldH = Math.max(1, yMax - yMin)
    const s = Math.min(MM_W / worldW, MM_H / worldH)
    return { xMin, yMin, xMax, yMax, scale: s }
  }, [nodes, groups, vpX, vpY, vpW, vpH])

  // 월드 좌표 → 미니맵 픽셀 좌표
  function toMmX(x: number) {
    return (x - bounds.xMin) * bounds.scale
  }
  function toMmY(y: number) {
    return (y - bounds.yMin) * bounds.scale
  }

  // 포인터 위치를 캔버스 중앙으로 정렬
  function panToPointer(clientX: number, clientY: number) {
    if (!svgRef.current || cw === 0 || ch === 0) return
    const rect = svgRef.current.getBoundingClientRect()
    const mx = clientX - rect.left
    const my = clientY - rect.top
    const worldX = bounds.xMin + mx / bounds.scale
    const worldY = bounds.yMin + my / bounds.scale
    setPosition(cw / 2 - worldX * scale, ch / 2 - worldY * scale)
  }

  // 드래그 라이브 팬 — pointer capture 로 SVG 밖으로 나가도 계속 따라옴
  const draggingRef = useRef(false)
  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    draggingRef.current = true
    svgRef.current?.setPointerCapture(e.pointerId)
    panToPointer(e.clientX, e.clientY)
  }
  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!draggingRef.current) return
    panToPointer(e.clientX, e.clientY)
  }
  function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    draggingRef.current = false
    svgRef.current?.releasePointerCapture(e.pointerId)
  }

  return (
    <div className="minimap">
      <svg
        ref={svgRef}
        width={MM_W}
        height={MM_H}
        viewBox={`0 0 ${MM_W} ${MM_H}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="img"
        aria-label="Minimap — click or drag to pan"
      >
        {/* 배경 */}
        <rect x={0} y={0} width={MM_W} height={MM_H} fill="#fafbfc" />

        {/* 엣지 (노드 보다 아래) — 중심-중심 연결 */}
        {edges.map((e) => {
          const from = nodesById.get(e.from)
          const to = nodesById.get(e.to)
          if (!from || !to) return null
          return (
            <line
              key={`e-${e.id}`}
              x1={toMmX(from.x + NODE_W / 2)}
              y1={toMmY(from.y + NODE_H / 2)}
              x2={toMmX(to.x + NODE_W / 2)}
              y2={toMmY(to.y + NODE_H / 2)}
              stroke="#6b7280"
              strokeWidth={0.8}
              opacity={0.6}
            />
          )
        })}

        {/* 그룹 */}
        {groups.map((g) => (
          <rect
            key={`g-${g.id}`}
            x={toMmX(g.x)}
            y={toMmY(g.y)}
            width={g.width * bounds.scale}
            height={g.height * bounds.scale}
            fill="rgba(34, 197, 160, 0.08)"
            stroke="#22c5a0"
            strokeWidth={1}
          />
        ))}

        {/* 노드 — 작은 컬러 사각형 */}
        {nodes.map((n) => (
          <rect
            key={`n-${n.id}`}
            x={toMmX(n.x)}
            y={toMmY(n.y)}
            width={Math.max(2, NODE_W * bounds.scale)}
            height={Math.max(2, NODE_H * bounds.scale)}
            fill={catalogColor(n.type)}
            rx={1}
          />
        ))}

        {/* 현재 뷰포트 사각형 */}
        <rect
          x={toMmX(vpX)}
          y={toMmY(vpY)}
          width={vpW * bounds.scale}
          height={vpH * bounds.scale}
          fill="rgba(37, 99, 235, 0.10)"
          stroke="#2563eb"
          strokeWidth={1.5}
        />
      </svg>

      <style>{`
        .minimap {
          position: absolute; right: 16px; top: 16px;
          background: white;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          padding: 4px;
          z-index: 5;
          user-select: none;
          line-height: 0;
        }
        .minimap svg { display: block; cursor: grab; border-radius: 3px; touch-action: none; }
        .minimap svg:active { cursor: grabbing; }

        /* 모바일 — 화면 차지가 커서 미니맵은 숨김 */
        @media (max-width: 768px) {
          .minimap { display: none; }
        }
      `}</style>
    </div>
  )
}
