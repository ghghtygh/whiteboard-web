import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Rect, Text, Arrow, Line } from 'react-konva'
import type Konva from 'konva'
import { useViewportStore } from '@/store/viewport'
import type { BoardDoc } from '@/collab/doc'
import type { Anchor, Node as DomainNode } from '@/types/domain'
import { useEdgesSnapshot, useGroupsSnapshot, useNodesSnapshot } from './hooks'
import { useCanvasContext } from './useCanvasContext'
import { useGridStore } from './gridStore'
import { setLocalCursor, setLocalSelection, useRemoteAwareness } from '@/collab/awareness'
import { RemoteAwareness } from './RemoteAwareness'
import { useSelection } from './selection'
import { useToolStore } from './tool'
import { NodeShape } from './NodeShape'
import { EdgeShape } from './EdgeShape'
import { GroupShape } from './GroupShape'
import { LabelEditor } from './LabelEditor'
import {
  NODE_H,
  NODE_W,
  anchorPoint,
  dropJitter,
  nearestAnchor,
  snap,
} from './geometry'
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

  const tool = useToolStore((s) => s.tool)
  const setTool = useToolStore((s) => s.set)
  const gridVisible = useGridStore((s) => s.visible)

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

  // 사이즈 추적
  useEffect(() => {
    if (!hostRef.current) return
    const el = hostRef.current
    const ro = new ResizeObserver(() => setSize({ width: el.clientWidth, height: el.clientHeight }))
    ro.observe(el)
    setSize({ width: el.clientWidth, height: el.clientHeight })
    return () => ro.disconnect()
  }, [])

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

  // 휠 줌
  const onWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()
      const stage = e.target.getStage()
      if (!stage) return
      const pointer = stage.getPointerPosition()
      if (!pointer) return
      const direction = e.evt.deltaY > 0 ? -1 : 1
      const next = direction > 0 ? scale * 1.05 : scale / 1.05
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

  // 빈 영역 클릭 → 선택 해제 (도구가 select일 때만)
  const onStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
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

    if (pendingEdge) setPendingEdge({ ...pendingEdge, x: p.x, y: p.y })
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

  // 사이드바 드롭
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/x-whiteboard-component')
    if (!type || !doc) return
    const stage = stageRef.current
    if (!stage) return
    const rect = stage.container().getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const x = (sx - vx) / scale + dropJitter()
    const y = (sy - vy) / scale + dropJitter()
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
      // 라벨 영역: 노드 아래 가로 140px (LABEL_X = -30)
      return {
        x: rect.left + (n.x - 30) * scale + vx,
        y: rect.top + (n.y + NODE_H + 4) * scale + vy,
        w: 140 * scale,
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
      >
        <Layer>
          <Rect
            name="bg"
            x={-5000}
            y={-5000}
            width={10000}
            height={10000}
            fill="#fafbfc"
          />
          {/* 그리드 가이드 — 약하게. 툴바에서 토글 */}
          {gridVisible && <GridLines />}

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
              const a = anchorPoint(from.x, from.y, NODE_W, NODE_H, pendingEdge.fromAnchor)
              return (
                <Arrow
                  points={[a.x, a.y, pendingEdge.x, pendingEdge.y]}
                  stroke="#2563eb"
                  fill="#2563eb"
                  strokeWidth={2}
                  dash={[6, 4]}
                  pointerLength={8}
                  pointerWidth={8}
                  listening={false}
                />
              )
            })()}

          {/* 노드 */}
          {nodes.map((n) => (
            <NodeShape
              key={n.id}
              node={n}
              selected={selNodes.has(n.id)}
              hovered={hoveredNode === n.id}
              onSelect={(additive) => toggleSel('node', n.id, additive)}
              onHover={(h) => setHoveredNode(h ? n.id : (cur) => (cur === n.id ? null : cur))}
              onDragMove={(x, y) => doc && moveNode(doc, n.id, snap(x), snap(y))}
              onDragEnd={(x, y) => doc && moveNode(doc, n.id, snap(x), snap(y))}
              onAnchorDown={(anchor) => {
                const a = anchorPoint(n.x, n.y, NODE_W, NODE_H, anchor)
                setPendingEdge({ fromId: n.id, fromAnchor: anchor, x: a.x, y: a.y })
              }}
              onAnchorUp={() => {
                if (pendingEdge && pendingEdge.fromId !== n.id && doc) {
                  const toCenter = { x: n.x + NODE_W / 2, y: n.y + NODE_H / 2 }
                  const from = nodesById.get(pendingEdge.fromId)
                  const guessTo =
                    from && nearestAnchor(n.x, n.y, NODE_W, NODE_H, from.x + NODE_W / 2, from.y + NODE_H / 2)
                  void toCenter
                  createEdge(doc, pendingEdge.fromId, n.id, pendingEdge.fromAnchor, guessTo ?? null)
                  setPendingEdge(null)
                }
              }}
              onLabelEdit={() => setEditing({ kind: 'node', id: n.id })}
            />
          ))}

          {/* pendingGroup */}
          {pendingGroup && (
            <Rect
              x={pendingGroup.x}
              y={pendingGroup.y}
              width={pendingGroup.width}
              height={pendingGroup.height}
              stroke="#2563eb"
              strokeWidth={1.5}
              dash={[6, 4]}
              fill="rgba(37, 99, 235, 0.05)"
              listening={false}
            />
          )}

          {/* 빈 보드 안내 */}
          {nodes.length === 0 && groups.length === 0 && !pendingEdge && !pendingGroup && (
            <Text
              x={20}
              y={20}
              text="좌측에서 컴포넌트를 드래그해 보드에 놓아 보세요."
              fontSize={14}
              fill="#9ca3af"
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
        .canvas-root { position: absolute; inset: 0; overflow: hidden; }
        .canvas-root[data-tool="group"] { cursor: crosshair; }
      `}</style>
    </div>
  )
}

// 간단한 그리드 라인 — 1000x1000 영역에 200px 간격 보조선
function GridLines() {
  const lines: number[][] = []
  for (let x = -2000; x <= 2000; x += 200) lines.push([x, -2000, x, 2000])
  for (let y = -2000; y <= 2000; y += 200) lines.push([-2000, y, 2000, y])
  return (
    <>
      {lines.map((pts, i) => (
        <Line key={i} points={pts} stroke="#eef0f3" strokeWidth={1} listening={false} />
      ))}
    </>
  )
}
