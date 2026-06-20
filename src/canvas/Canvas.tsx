import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Rect, Text, Arrow, Line } from 'react-konva'
import type Konva from 'konva'
import { useViewportStore, clampScale } from '@/store/viewport'
import type { BoardDoc } from '@/collab/doc'
import type { Anchor, Node as DomainNode } from '@/types/domain'
import { useEdgesSnapshot, useGroupsSnapshot, useNodesSnapshot } from './hooks'
import { useCanvasContext } from './useCanvasContext'
import { useGridStore } from './gridStore'
import { useSnapStore } from './snapStore'
import { setLocalCursor, setLocalSelection, useRemoteAwareness } from '@/collab/awareness'
import { RemoteAwareness } from './RemoteAwareness'
import { useSelection } from './selection'
import { useToolStore } from './tool'
import { NodeShape } from './NodeShape'
import { EdgeShape } from './EdgeShape'
import { GroupShape } from './GroupShape'
import { LabelEditor } from './LabelEditor'
import {
  COARSE_GRID,
  NODE_H,
  NODE_W,
  anchorPoint,
  boxCenter,
  coarseSnap,
  dropJitter,
  getNodeBox,
  nearestAnchor,
  snap,
} from './geometry'

/** 디자인 시스템 시그니처 표면 — 22px 간격의 라디얼 도트 그리드 타일.
 *  Konva fillPatternImage 로 깔아 캔버스 팬/줌과 함께 움직인다. */
const DOT_TILE = 22
function makeDotTile(): HTMLCanvasElement | undefined {
  if (typeof document === 'undefined') return undefined
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1))
  const c = document.createElement('canvas')
  c.width = DOT_TILE * dpr
  c.height = DOT_TILE * dpr
  const ctx = c.getContext('2d')
  if (!ctx) return undefined
  ctx.scale(dpr, dpr)
  ctx.fillStyle = '#e4e9f0' // --canvas-grid
  ctx.beginPath()
  ctx.arc(1.2, 1.2, 1.2, 0, Math.PI * 2)
  ctx.fill()
  return c
}
import {
  createEdge,
  createGroup,
  createNode,
  deleteEdges,
  deleteGroups,
  deleteNodes,
  moveGroup,
  moveNode,
  setEdgeDirection,
  setEdgeLabel,
  setEdgeStyle,
  setGroupLabel,
  setNodeLabel,
} from './ops'
import { localRecents } from '@/local/recents'
import { LOCAL_CATALOG } from '@/local/catalogSeed'

interface Props {
  boardId: string
  doc: BoardDoc | null
}

interface PendingEdge {
  fromId: string
  fromAnchor: Anchor
  x: number
  y: number
}

interface PendingGroup {
  startX: number
  startY: number
  x: number
  y: number
  width: number
  height: number
}

type EditingTarget =
  | { kind: 'node'; id: string }
  | { kind: 'edge'; id: string }
  | { kind: 'group'; id: string }
  | null

export function Canvas({ doc }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  const scale = useViewportStore((s) => s.scale)
  const vx = useViewportStore((s) => s.x)
  const vy = useViewportStore((s) => s.y)
  const setScale = useViewportStore((s) => s.setScale)
  const setPosition = useViewportStore((s) => s.setPosition)
  const setCanvasSize = useViewportStore((s) => s.setCanvasSize)

  const tool = useToolStore((s) => s.tool)
  const setTool = useToolStore((s) => s.set)
  const gridVisible = useGridStore((s) => s.visible)
  const snapEnabled = useSnapStore((s) => s.enabled)
  const dotTile = useMemo(makeDotTile, [])
  const dotScale = useMemo(() => {
    const dpr = Math.max(1, Math.min(3, (typeof window !== 'undefined' && window.devicePixelRatio) || 1))
    return 1 / dpr
  }, [])
  // Alt 누르고 있는 동안 스냅 모드를 일시 반전 (ON↔OFF)
  const [altDown, setAltDown] = useState(false)
  const snapEffective = snapEnabled !== altDown

  const snapPos = useCallback(
    (x: number, y: number) => ({
      x: snapEffective ? coarseSnap(x) : snap(x),
      y: snapEffective ? coarseSnap(y) : snap(y),
    }),
    [snapEffective],
  )

  const nodes = useNodesSnapshot(doc)
  const edges = useEdgesSnapshot(doc)
  const groups = useGroupsSnapshot(doc)
  const { undoManager, awareness } = useCanvasContext()
  const remoteAwareness = useRemoteAwareness(awareness)

  const selNodes = useSelection((s) => s.nodes)
  const selEdges = useSelection((s) => s.edges)
  const selGroups = useSelection((s) => s.groups)
  const toggleSel = useSelection((s) => s.toggle)
  const setSel = useSelection((s) => s.set)
  const clearSel = useSelection((s) => s.clear)

  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [pendingEdge, setPendingEdge] = useState<PendingEdge | null>(null)
  const [pendingGroup, setPendingGroup] = useState<PendingGroup | null>(null)
  const [editing, setEditing] = useState<EditingTarget>(null)

  const nodesById = useMemo(() => {
    const m = new Map<string, DomainNode>()
    for (const n of nodes) m.set(n.id, n)
    return m
  }, [nodes])

  const edgesById = useMemo(() => new Map(edges.map((e) => [e.id, e])), [edges])
  const groupsById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups])

  // awareness: 로컬 selection 변경을 다른 peer 에 알림
  useEffect(() => {
    if (!awareness) return
    const keys = [
      ...[...selNodes].map((id) => `node:${id}`),
      ...[...selEdges].map((id) => `edge:${id}`),
      ...[...selGroups].map((id) => `group:${id}`),
    ]
    setLocalSelection(awareness, keys)
  }, [awareness, selNodes, selEdges, selGroups])

  // 커서 throttle (33ms ≈ 30fps)
  const lastCursorAtRef = useRef(0)
  // 컴포넌트 언마운트 시 awareness cursor 초기화
  useEffect(() => {
    return () => {
      if (awareness) setLocalCursor(awareness, null)
    }
  }, [awareness])

  // Alt 키 트래킹 (window 단위). 윈도우 포커스 잃으면 해제.
  useEffect(() => {
    function update(e: KeyboardEvent) {
      setAltDown(e.altKey)
    }
    function blur() {
      setAltDown(false)
    }
    window.addEventListener('keydown', update)
    window.addEventListener('keyup', update)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', update)
      window.removeEventListener('keyup', update)
      window.removeEventListener('blur', blur)
    }
  }, [])

  // 사이즈 추적 — 로컬 state + 미니맵용 store 동시 업데이트
  useEffect(() => {
    if (!hostRef.current) return
    const el = hostRef.current
    const update = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      setSize({ width: w, height: h })
      setCanvasSize(w, h)
    }
    const ro = new ResizeObserver(update)
    ro.observe(el)
    update()
    return () => ro.disconnect()
  }, [setCanvasSize])

  // 키보드: Delete, ⌘Z, ⌘⇧Z, 엣지 스타일/방향 토글
  useEffect(() => {
    if (!doc) return
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }
      const meta = e.metaKey || e.ctrlKey

      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (!undoManager) return
        if (e.shiftKey) undoManager.redo()
        else undoManager.undo()
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const nIds = [...selNodes]
        const eIds = [...selEdges]
        const gIds = [...selGroups]
        if (nIds.length === 0 && eIds.length === 0 && gIds.length === 0) return
        e.preventDefault()
        if (nIds.length) deleteNodes(doc!, nIds)
        if (eIds.length) deleteEdges(doc!, eIds)
        if (gIds.length) deleteGroups(doc!, gIds)
        clearSel()
        return
      }

      if (selEdges.size > 0) {
        const eIds = [...selEdges]
        if (e.key === '1') {
          eIds.forEach((id) => setEdgeStyle(doc!, id, 'solid'))
        } else if (e.key === '2') {
          eIds.forEach((id) => setEdgeStyle(doc!, id, 'dashed'))
        } else if (e.key === '3') {
          eIds.forEach((id) => setEdgeStyle(doc!, id, 'dotted'))
        } else if (e.key.toLowerCase() === 'd') {
          // forward → both → backward → none → forward
          const order = ['forward', 'both', 'backward', 'none'] as const
          eIds.forEach((id) => {
            const cur = doc!.edges.get(id)
            if (!cur) return
            const c = (cur.get('direction') as (typeof order)[number]) ?? 'forward'
            const next = order[(order.indexOf(c) + 1) % order.length]!
            setEdgeDirection(doc!, id, next)
          })
        }
      }

      if (e.key === 'Escape') {
        setPendingEdge(null)
        setPendingGroup(null)
        clearSel()
        setEditing(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doc, undoManager, selNodes, selEdges, selGroups, clearSel])

  // 휠 줌 — scale 클램프 후 position 도 같은 값으로 정렬해 한계에서 드리프트 방지
  const onWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()
      const stage = e.target.getStage()
      if (!stage) return
      const pointer = stage.getPointerPosition()
      if (!pointer) return
      const direction = e.evt.deltaY > 0 ? -1 : 1
      const rawNext = direction > 0 ? scale * 1.05 : scale / 1.05
      const next = clampScale(rawNext)
      // 한계 도달 시 setScale 만 noop 되고 position 만 움직이는 걸 방지
      if (next === scale) return
      const mouseTo = {
        x: (pointer.x - vx) / scale,
        y: (pointer.y - vy) / scale,
      }
      setScale(next)
      setPosition(pointer.x - mouseTo.x * next, pointer.y - mouseTo.y * next)
    },
    [scale, vx, vy, setScale, setPosition],
  )

  // 스테이지 드래그 = 팬
  const onStageDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (e.target !== e.target.getStage()) return
    setPosition(e.target.x(), e.target.y())
  }

  // 빈 영역 클릭/터치 → 선택 해제 (도구가 select일 때만)
  const onStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage()
    if (!stage) return
    const isStageBg = e.target === stage || e.target.attrs.name === 'bg'
    if (!isStageBg) return

    if (tool === 'group') {
      const p = stage.getRelativePointerPosition()
      if (!p) return
      setPendingGroup({ startX: p.x, startY: p.y, x: p.x, y: p.y, width: 0, height: 0 })
    } else {
      clearSel()
    }
  }

  // 마우스 이동 — pendingEdge / pendingGroup 추적 + awareness 커서 송신
  const onStageMouseMove = () => {
    const stage = stageRef.current
    if (!stage) return
    const p = stage.getRelativePointerPosition()
    if (!p) return

    // awareness 커서 (캔버스 좌표) — 33ms throttle
    if (awareness) {
      const now = performance.now()
      if (now - lastCursorAtRef.current >= 33) {
        lastCursorAtRef.current = now
        setLocalCursor(awareness, { x: p.x, y: p.y })
      }
    }

    if (pendingEdge) {
      setPendingEdge({ ...pendingEdge, x: p.x, y: p.y })
      // 터치는 onMouseEnter가 없으므로 pendingEdge 드래그 중 포인터 위치로 hoveredNode 직접 갱신
      const hit = nodes.find((n) => {
        const box = getNodeBox(n)
        return (
          p.x >= n.x + box.xOffset &&
          p.x <= n.x + box.xOffset + box.width &&
          p.y >= n.y &&
          p.y <= n.y + box.height
        )
      })
      setHoveredNode(hit?.id ?? null)
    }
    if (pendingGroup) {
      setPendingGroup({
        ...pendingGroup,
        x: Math.min(pendingGroup.startX, p.x),
        y: Math.min(pendingGroup.startY, p.y),
        width: Math.abs(p.x - pendingGroup.startX),
        height: Math.abs(p.y - pendingGroup.startY),
      })
    }
  }

  // 마우스 업 — pendingEdge가 빈 영역에서 끝나면 취소, pendingGroup이 충분히 크면 생성
  const onStageMouseUp = () => {
    if (pendingEdge) {
      // 노드 KGroup의 onMouseUp이 먼저 처리되므로, 여기 도달했다면 빈 영역에서 release
      setPendingEdge(null)
    }
    if (pendingGroup) {
      const { x, y, width, height } = pendingGroup
      if (width >= 60 && height >= 60 && doc) {
        createGroup(doc, x, y, width, height)
      }
      setPendingGroup(null)
      setTool('select')
    }
  }

  // 사이드바 드롭 — 정렬 모드면 좌상단을 COARSE_GRID 에 스냅하고 중앙 좌표로 환산해 전달
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/x-whiteboard-component')
    if (!type || !doc) return
    const stage = stageRef.current
    if (!stage) return
    const rect = stage.container().getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    let x = (sx - vx) / scale + dropJitter()
    let y = (sy - vy) / scale + dropJitter()
    if (snapEffective) {
      x = coarseSnap(x - NODE_W / 2) + NODE_W / 2
      y = coarseSnap(y - NODE_H / 2) + NODE_H / 2
    }
    const ct = LOCAL_CATALOG.find((c) => c.type === type)
    const id = createNode(doc, type, x, y, ct?.version ?? 1)
    localRecents.push(type)
    setSel([{ kind: 'node', id }])
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  // 라벨 편집 시작 시 화면 좌표 계산
  const editingScreen = useMemo(() => {
    if (!editing || !stageRef.current) return null
    const rect = stageRef.current.container().getBoundingClientRect()
    if (editing.kind === 'node') {
      const n = nodes.find((x) => x.id === editing.id)
      if (!n) return null
      const d = getNodeBox(n)
      return {
        x: rect.left + (n.x + d.xOffset) * scale + vx,
        y: rect.top + (n.y + NODE_H + 2) * scale + vy,
        w: d.width * scale,
      }
    }
    if (editing.kind === 'edge') {
      const e = edges.find((x) => x.id === editing.id)
      if (!e) return null
      const from = nodesById.get(e.from)
      const to = nodesById.get(e.to)
      if (!from || !to) return null
      const mx = (from.x + to.x + NODE_W) / 2
      const my = (from.y + to.y + NODE_H) / 2
      return {
        x: rect.left + (mx - 60) * scale + vx,
        y: rect.top + (my - 12) * scale + vy,
        w: 120 * scale,
      }
    }
    const g = groups.find((x) => x.id === editing.id)
    if (!g) return null
    return {
      x: rect.left + (g.x + 6) * scale + vx,
      y: rect.top + (g.y + 4) * scale + vy,
      w: Math.min(200, g.width - 12) * scale,
    }
  }, [editing, nodes, edges, groups, scale, vx, vy, nodesById])

  return (
    <div
      ref={hostRef}
      className="canvas-root"
      onDrop={onDrop}
      onDragOver={onDragOver}
      data-tool={tool}
    >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        scaleX={scale}
        scaleY={scale}
        x={vx}
        y={vy}
        draggable={tool === 'select' && !pendingEdge && !pendingGroup}
        onWheel={onWheel}
        onDragEnd={onStageDragEnd}
        onMouseDown={onStageMouseDown}
        onMouseMove={onStageMouseMove}
        onMouseUp={onStageMouseUp}
        onMouseLeave={() => awareness && setLocalCursor(awareness, null)}
        // 터치 — Konva 의 pointer position 이 마우스/터치를 통합해주므로 같은 핸들러 재사용.
        // pendingEdge / pendingGroup 좌표 갱신과 노드 위 release 처리는 mouse 핸들러와 동일.
        onTouchStart={onStageMouseDown}
        onTouchMove={onStageMouseMove}
        onTouchEnd={onStageMouseUp}
      >
        <Layer>
          <Rect
            name="bg"
            x={-5000}
            y={-5000}
            width={10000}
            height={10000}
            fill="#f6f8fb"
            fillPatternImage={dotTile as unknown as HTMLImageElement | undefined}
            fillPatternRepeat="repeat"
            fillPatternScale={{ x: dotScale, y: dotScale }}
            fillPriority={dotTile ? 'pattern' : 'color'}
          />
          {/* 그리드 가이드 — 약하게. 툴바에서 토글 */}
          {gridVisible && <GridLines step={snapEffective ? COARSE_GRID : 200} />}

          {/* 그룹 (가장 아래) */}
          {groups.map((g) => (
            <GroupShape
              key={g.id}
              group={g}
              selected={selGroups.has(g.id)}
              onSelect={(additive) => toggleSel('group', g.id, additive)}
              onDragEnd={(dx, dy) => doc && moveGroup(doc, g.id, dx, dy)}
              onLabelEdit={() => setEditing({ kind: 'group', id: g.id })}
            />
          ))}

          {/* 엣지 */}
          {edges.map((e) => {
            const from = nodesById.get(e.from)
            const to = nodesById.get(e.to)
            if (!from || !to) return null
            return (
              <EdgeShape
                key={e.id}
                edge={e}
                from={from}
                to={to}
                selected={selEdges.has(e.id)}
                onSelect={(additive) => toggleSel('edge', e.id, additive)}
                onLabelEdit={() => setEditing({ kind: 'edge', id: e.id })}
              />
            )
          })}

          {/* pendingEdge (러버밴드) */}
          {pendingEdge &&
            (() => {
              const from = nodesById.get(pendingEdge.fromId)
              if (!from) return null
              const a = anchorPoint(from.x, from.y, pendingEdge.fromAnchor, getNodeBox(from))
              return (
                <Arrow
                  points={[a.x, a.y, pendingEdge.x, pendingEdge.y]}
                  stroke="#5d5bef"
                  fill="#5d5bef"
                  strokeWidth={2}
                  dash={[6, 4]}
                  pointerLength={8}
                  pointerWidth={8}
                  listening={false}
                />
              )
            })()}

          {/* 노드 */}
          {nodes.map((n) => {
            const isPendingTarget = !!pendingEdge && hoveredNode === n.id && pendingEdge.fromId !== n.id
            const pendingEdgeAnchor = isPendingTarget
              ? nearestAnchor(n.x, n.y, getNodeBox(n), pendingEdge.x, pendingEdge.y)
              : undefined
            return (
              <NodeShape
                key={n.id}
                node={n}
                selected={selNodes.has(n.id)}
                hovered={hoveredNode === n.id}
                pendingEdgeAnchor={pendingEdgeAnchor}
                onSelect={(additive) => toggleSel('node', n.id, additive)}
                onHover={(h) => setHoveredNode(h ? n.id : (cur) => (cur === n.id ? null : cur))}
                snapPos={snapPos}
                onDragMove={(x, y) => doc && moveNode(doc, n.id, x, y)}
                onDragEnd={(x, y) => doc && moveNode(doc, n.id, x, y)}
                onAnchorDown={(anchor) => {
                  const a = anchorPoint(n.x, n.y, anchor, getNodeBox(n))
                  setPendingEdge({ fromId: n.id, fromAnchor: anchor, x: a.x, y: a.y })
                }}
                onAnchorUp={() => {
                  if (pendingEdge && pendingEdge.fromId !== n.id && doc) {
                    const from = nodesById.get(pendingEdge.fromId)
                    const fromC = from ? boxCenter(from.x, from.y, getNodeBox(from)) : null
                    const guessTo = fromC
                      ? nearestAnchor(n.x, n.y, getNodeBox(n), fromC.x, fromC.y)
                      : null
                    createEdge(doc, pendingEdge.fromId, n.id, pendingEdge.fromAnchor, guessTo ?? null)
                    setPendingEdge(null)
                  }
                }}
                onLabelEdit={() => setEditing({ kind: 'node', id: n.id })}
              />
            )
          })}

          {/* pendingGroup */}
          {pendingGroup && (
            <Rect
              x={pendingGroup.x}
              y={pendingGroup.y}
              width={pendingGroup.width}
              height={pendingGroup.height}
              stroke="#5d5bef"
              strokeWidth={1.5}
              dash={[6, 4]}
              fill="rgba(93, 91, 239, 0.05)"
              listening={false}
            />
          )}

          {/* 빈 보드 안내 */}
          {nodes.length === 0 && groups.length === 0 && !pendingEdge && !pendingGroup && (
            <Text
              x={20}
              y={20}
              text="왼쪽에서 컴포넌트를 끌어다 보드에 놓아 보세요."
              fontSize={14}
              fill="#98a3b5"
              listening={false}
            />
          )}

          {/* 원격 awareness — 다른 peer 의 selection outline + 커서 */}
          <RemoteAwareness
            states={remoteAwareness}
            nodesById={nodesById}
            edgesById={edgesById}
            groupsById={groupsById}
          />
        </Layer>
      </Stage>

      {/* 라벨 편집 오버레이 */}
      {editing && editingScreen && (
        <LabelEditor
          initial={
            editing.kind === 'node'
              ? nodes.find((n) => n.id === editing.id)?.label ?? ''
              : editing.kind === 'edge'
                ? edges.find((e) => e.id === editing.id)?.label ?? ''
                : groups.find((g) => g.id === editing.id)?.label ?? ''
          }
          maxLength={editing.kind === 'node' ? 50 : 30}
          multiline={editing.kind === 'node'}
          screenX={editingScreen.x - (hostRef.current?.getBoundingClientRect().left ?? 0)}
          screenY={editingScreen.y - (hostRef.current?.getBoundingClientRect().top ?? 0)}
          width={editingScreen.w}
          onCommit={(label) => {
            if (!doc) {
              setEditing(null)
              return
            }
            if (editing.kind === 'node') setNodeLabel(doc, editing.id, label)
            else if (editing.kind === 'edge') setEdgeLabel(doc, editing.id, label)
            else setGroupLabel(doc, editing.id, label)
            setEditing(null)
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      <style>{`
        .canvas-root { position: absolute; inset: 0; overflow: hidden; touch-action: none; }
        .canvas-root[data-tool="group"] { cursor: crosshair; }
      `}</style>
    </div>
  )
}

// 보조 격자 라인. step 만 받음 — 200 (기본) 또는 COARSE_GRID(120, 정렬 모드).
function GridLines({ step = 200 }: { step?: number }) {
  const lines: number[][] = []
  const range = 2400
  for (let x = -range; x <= range; x += step) lines.push([x, -range, x, range])
  for (let y = -range; y <= range; y += step) lines.push([-range, y, range, y])
  return (
    <>
      {lines.map((pts, i) => (
        <Line key={i} points={pts} stroke="#eef0f3" strokeWidth={1} listening={false} />
      ))}
    </>
  )
}
