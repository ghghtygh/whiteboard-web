import { useMemo, useRef, useState } from 'react'
import { useViewportStore } from '@/store/viewport'
import { useCanvasContext } from '@/canvas/useCanvasContext'
import { useNodesSnapshot, useGroupsSnapshot, useEdgesSnapshot } from '@/canvas/hooks'
import { NODE_H, NODE_W } from '@/canvas/geometry'
import { catalogColor } from '@/local/catalogSeed'
import { MOBILE_BP } from '@/styles/breakpoints'
import { useT } from '@/i18n'

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
  const t = useT()
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

  // 드래그 중엔 미니맵 축척/원점을 고정한다. bounds 가 뷰포트를 포함하도록 매번 다시 계산되기 때문에,
  // 고정하지 않으면 뷰포트가 움직일 때마다 좌표계도 같이 밀려 포인터보다 훨씬 빠르게 달아난다.
  const [frozenBounds, setFrozenBounds] = useState<Bounds | null>(null)
  const b = frozenBounds ?? bounds

  // 월드 좌표 → 미니맵 픽셀 좌표
  function toMmX(x: number) {
    return (x - b.xMin) * b.scale
  }
  function toMmY(y: number) {
    return (y - b.yMin) * b.scale
  }

  // 드래그 시작 시점의 포인터(미니맵 px)와 스테이지 위치. 이동량만큼만 상대적으로 팬한다.
  const dragRef = useRef<{ mx: number; my: number; vx: number; vy: number; bounds: Bounds } | null>(null)

  function pointerInSvg(clientX: number, clientY: number) {
    const rect = svgRef.current!.getBoundingClientRect()
    return { mx: clientX - rect.left, my: clientY - rect.top }
  }

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (!svgRef.current || cw === 0 || ch === 0) return
    svgRef.current.setPointerCapture(e.pointerId)
    const { mx, my } = pointerInSvg(e.clientX, e.clientY)
    const frozen = bounds
    const vp = useViewportStore.getState()
    // 뷰포트 사각형 밖을 누르면 그 지점을 화면 중앙으로 한 번 점프, 안을 누르면 그대로 잡고 끈다.
    const insideVp =
      mx >= toMmX(vpX) && mx <= toMmX(vpX + vpW) && my >= toMmY(vpY) && my <= toMmY(vpY + vpH)
    if (!insideVp) {
      const worldX = frozen.xMin + mx / frozen.scale
      const worldY = frozen.yMin + my / frozen.scale
      setPosition(cw / 2 - worldX * vp.scale, ch / 2 - worldY * vp.scale)
    }
    const after = useViewportStore.getState()
    dragRef.current = { mx, my, vx: after.x, vy: after.y, bounds: frozen }
    setFrozenBounds(frozen)
  }
  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current
    if (!drag || !svgRef.current) return
    const { mx, my } = pointerInSvg(e.clientX, e.clientY)
    // 미니맵 px 이동량 → 월드 이동량 → 스테이지 px 이동량 (뷰포트 사각형이 포인터를 1:1 로 따라감)
    const s = useViewportStore.getState().scale
    const dxWorld = (mx - drag.mx) / drag.bounds.scale
    const dyWorld = (my - drag.my) / drag.bounds.scale
    setPosition(drag.vx - dxWorld * s, drag.vy - dyWorld * s)
  }
  function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    dragRef.current = null
    setFrozenBounds(null)
    if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId)
  }

  return (
    <div className="minimap" data-tour="minimap">
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
        aria-label={t('minimap.label')}
      >
        {/* 배경 */}
        <rect x={0} y={0} width={MM_W} height={MM_H} fill="#f6f8fb" />

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
              stroke="#6a7689"
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
            width={g.width * b.scale}
            height={g.height * b.scale}
            fill="rgba(93, 91, 239, 0.06)"
            stroke="#a3a7ff"
            strokeWidth={1}
          />
        ))}

        {/* 노드 — 작은 컬러 사각형 */}
        {nodes.map((n) => (
          <rect
            key={`n-${n.id}`}
            x={toMmX(n.x)}
            y={toMmY(n.y)}
            width={Math.max(2, NODE_W * b.scale)}
            height={Math.max(2, NODE_H * b.scale)}
            fill={catalogColor(n.type)}
            rx={1}
          />
        ))}

        {/* 현재 뷰포트 사각형 */}
        <rect
          x={toMmX(vpX)}
          y={toMmY(vpY)}
          width={vpW * b.scale}
          height={vpH * b.scale}
          fill="rgba(93, 91, 239, 0.10)"
          stroke="#5d5bef"
          strokeWidth={1.5}
        />
      </svg>

      <style>{`
        .minimap {
          position: absolute; right: 16px; bottom: 16px;
          background: var(--surface-raised);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-float);
          padding: 5px;
          z-index: 5;
          user-select: none;
          line-height: 0;
        }
        .minimap svg { display: block; cursor: grab; border-radius: var(--radius-md); touch-action: none; }
        .minimap svg:active { cursor: grabbing; }

        /* 모바일 — 화면 차지가 커서 미니맵은 숨김 */
        @media (max-width: ${MOBILE_BP}px) {
          .minimap { display: none; }
        }
      `}</style>
    </div>
  )
}
