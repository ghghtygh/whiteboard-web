import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Rect, Text, Arrow, Line } from 'react-konva'
import Konva from 'konva'
import { useViewportStore, clampScale } from '@/store/viewport'

// 마우스 드래그로 도형/스테이지를 옮기는 버튼을 좌클릭(0)으로 제한한다.
// 기본값 [0, 1] 이면 휠(가운데, 1) 드래그가 노드를 옮겨버려 "휠클릭=화면 이동"과 충돌한다.
Konva.dragButtons = [0]
import type { BoardDoc } from '@/collab/doc'
import type { Anchor, Node as DomainNode } from '@/types/domain'
import { useEdgesSnapshot, useGroupsSnapshot, useNodesSnapshot } from './hooks'
import { useCanvasContext } from './useCanvasContext'
import { useGridStore } from './gridStore'
import { useSnapStore } from './snapStore'
import { setLocalCursor, setLocalSelection, useRemoteAwareness } from '@/collab/awareness'
import { useStableAwareness } from '@/collab/useStableAwareness'
import { RemoteAwareness } from './RemoteAwareness'
import { useSelection, type Selectable } from './selection'
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
  moveNodes,
  pasteElements,
  type ClipboardData,
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

// 드래그 러버밴드(마퀴) 다중 선택. group 박스와 좌표 형식은 같고 additive(Shift) 여부만 더 든다.
interface PendingSelect {
  startX: number
  startY: number
  x: number
  y: number
  width: number
  height: number
  additive: boolean
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
  // 잠깐 끊겨도 4초간 유지해 원격 커서/이름 깜빡임을 막는다.
  const remoteAwareness = useStableAwareness(useRemoteAwareness(awareness))

  const selNodes = useSelection((s) => s.nodes)
  const selEdges = useSelection((s) => s.edges)
  const selGroups = useSelection((s) => s.groups)
  const toggleSel = useSelection((s) => s.toggle)
  const setSel = useSelection((s) => s.set)
  const clearSel = useSelection((s) => s.clear)

  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [pendingEdge, setPendingEdge] = useState<PendingEdge | null>(null)
  const [pendingGroup, setPendingGroup] = useState<PendingGroup | null>(null)
  const [pendingSelect, setPendingSelect] = useState<PendingSelect | null>(null)
  const [editing, setEditing] = useState<EditingTarget>(null)

  // Space 누름 = 핸드(팬) 모드 — 누른 채 드래그하면 화면 이동. 트랙패드에서도 잘 동작.
  const [spaceDown, setSpaceDown] = useState(false)
  const spaceDownRef = useRef(false)
  // 마지막 포인터 위치(캔버스 좌표) — 붙여넣기 기준점.
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  // 터치 한 손가락 / Space 팬 진행 상태 (시작 시점의 화면 포인터 + 뷰포트 위치 스냅샷).
  const panRef = useRef<{ px: number; py: number; vx: number; vy: number } | null>(null)
  // 다중 선택 드래그: 시작 시 선택된 노드들의 원위치 스냅샷. anchor = 실제로 잡고 끄는 노드.
  const multiDragRef = useRef<
    { anchorId: string; startX: number; startY: number; others: { id: string; x: number; y: number }[] } | null
  >(null)

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
  // 노드 드래그 동기화 throttle — 매 프레임 Yjs update 를 보내면 WS 가 폭주해
  // 연결이 끊기고 동기화가 밀린다. 33ms(≈30fps)로 제한하고 끝에 최종 위치를 보낸다.
  const lastNodeMoveRef = useRef(0)
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

  // Space 키 트래킹 — 핸드(팬) 모드. 입력 중에는 무시, 페이지 스크롤 방지.
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.code !== 'Space') return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      e.preventDefault()
      if (!spaceDownRef.current) {
        spaceDownRef.current = true
        setSpaceDown(true)
      }
    }
    function up(e: KeyboardEvent) {
      if (e.code !== 'Space') return
      spaceDownRef.current = false
      setSpaceDown(false)
    }
    function blur() {
      spaceDownRef.current = false
      setSpaceDown(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
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

  // 키보드: Delete, ⌘Z/⌘⇧Z, ⌘A, 엣지 스타일/방향 토글.
  // (⌘C/⌘X/⌘V 는 시스템 클립보드 연동을 위해 별도의 copy/cut/paste 이벤트에서 처리한다 —
  //  여기서 preventDefault 하면 브라우저가 그 이벤트를 만들어주지 않으므로 건드리지 않는다.)
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

      // ⌘/Ctrl + A — 노드 전체 선택
      if (meta && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        if (nodes.length) setSel(nodes.map((n) => ({ kind: 'node' as const, id: n.id })))
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
  }, [doc, undoManager, selNodes, selEdges, selGroups, clearSel, nodes, setSel])

  // 시스템 클립보드 연동 — 탭 간/외부 붙여넣기.
  // 네이티브 copy/cut/paste 이벤트의 clipboardData 에 JSON 을 싣는다(권한 프롬프트 없이 동작).
  // 텍스트 입력(라벨 편집 등)에 포커스가 있으면 기본 동작에 양보한다.
  useEffect(() => {
    if (!doc) return
    const MARKER = 'whiteboard/clipboard@1'

    function inEditable(): boolean {
      const a = document.activeElement as HTMLElement | null
      return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)
    }

    // 선택된 노드(+그 사이 엣지)를 클립보드 페이로드로 만든다. 없으면 null.
    function buildClip(): ClipboardData | null {
      const picked = [...selNodes]
        .map((id) => nodesById.get(id))
        .filter((n): n is DomainNode => !!n)
      if (picked.length === 0) return null
      const minX = Math.min(...picked.map((n) => n.x))
      const minY = Math.min(...picked.map((n) => n.y))
      const maxX = Math.max(...picked.map((n) => n.x))
      const maxY = Math.max(...picked.map((n) => n.y))
      const sel = new Set(picked.map((n) => n.id))
      return {
        nodes: picked.map((n) => ({
          tmpId: n.id,
          type: n.type,
          label: n.label,
          x: n.x - minX,
          y: n.y - minY,
          catalogVersion: n.catalogVersion,
        })),
        edges: edges
          .filter((ed) => sel.has(ed.from) && sel.has(ed.to))
          .map((ed) => ({
            from: ed.from,
            to: ed.to,
            fromAnchor: ed.fromAnchor,
            toAnchor: ed.toAnchor,
            style: ed.style,
            direction: ed.direction,
            label: ed.label,
          })),
        width: maxX - minX + NODE_W,
        height: maxY - minY + NODE_H,
      }
    }

    function parseClip(text: string): ClipboardData | null {
      try {
        const obj = JSON.parse(text)
        if (obj && obj.__wb === MARKER && Array.isArray(obj.nodes)) {
          return { nodes: obj.nodes, edges: obj.edges ?? [], width: obj.width ?? 0, height: obj.height ?? 0 }
        }
      } catch {
        /* 우리 포맷 아님 */
      }
      return null
    }

    function writeClip(e: ClipboardEvent, clip: ClipboardData): void {
      e.clipboardData?.setData('text/plain', JSON.stringify({ __wb: MARKER, ...clip }))
    }

    function onCopy(e: ClipboardEvent) {
      if (inEditable()) return
      const clip = buildClip()
      if (!clip) return
      e.preventDefault()
      writeClip(e, clip)
    }

    function onCut(e: ClipboardEvent) {
      if (inEditable()) return
      const clip = buildClip()
      if (!clip) return
      e.preventDefault()
      writeClip(e, clip)
      const nIds = [...selNodes]
      const eIds = [...selEdges]
      const gIds = [...selGroups]
      if (nIds.length) deleteNodes(doc!, nIds)
      if (eIds.length) deleteEdges(doc!, eIds)
      if (gIds.length) deleteGroups(doc!, gIds)
      clearSel()
    }

    function onPaste(e: ClipboardEvent) {
      if (inEditable()) return
      const text = e.clipboardData?.getData('text/plain')
      if (!text) return
      const clip = parseClip(text)
      if (!clip || clip.nodes.length === 0) return
      e.preventDefault()
      // 포인터 위치에 묶음 중심을 맞춘다. 포인터 없으면(아직 캔버스 위로 안 옴) 살짝 어긋나게.
      const center = pointerRef.current
      const baseX = center ? center.x - clip.width / 2 : 24
      const baseY = center ? center.y - clip.height / 2 : 24
      const newIds = pasteElements(doc!, clip, baseX, baseY)
      if (newIds.length) setSel(newIds.map((id) => ({ kind: 'node' as const, id })))
    }

    window.addEventListener('copy', onCopy)
    window.addEventListener('cut', onCut)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('copy', onCopy)
      window.removeEventListener('cut', onCut)
      window.removeEventListener('paste', onPaste)
    }
  }, [doc, selNodes, selEdges, selGroups, nodesById, edges, clearSel, setSel])

  // 휠 동작 — Excalidraw 식.
  //  - 기본(트랙패드 두 손가락 스크롤/마우스 휠) → 화면 이동(팬)
  //  - Ctrl/Cmd + 휠 (트랙패드 핀치는 ctrlKey=true 로 들어옴) → 포인터 기준 줌
  const onWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()
      const stage = e.target.getStage()
      if (!stage) return
      // 연속 휠 이벤트에서 stale 값 누적을 막기 위해 최신 뷰포트를 store 에서 직접 읽는다.
      const vp = useViewportStore.getState()

      if (e.evt.ctrlKey || e.evt.metaKey) {
        const pointer = stage.getPointerPosition()
        if (!pointer) return
        // deltaY 크기에 비례한 부드러운 줌 (핀치도 자연스럽게)
        const next = clampScale(vp.scale * Math.exp(-e.evt.deltaY * 0.0015))
        if (next === vp.scale) return
        const mouseTo = { x: (pointer.x - vp.x) / vp.scale, y: (pointer.y - vp.y) / vp.scale }
        setScale(next)
        setPosition(pointer.x - mouseTo.x * next, pointer.y - mouseTo.y * next)
        return
      }

      // 팬 — 휠 델타만큼 뷰포트 이동 (Shift+휠은 브라우저가 deltaX 로 주거나, 그대로 적용)
      setPosition(vp.x - e.evt.deltaX, vp.y - e.evt.deltaY)
    },
    [setScale, setPosition],
  )

  // 휠클릭(가운데 버튼) 드래그 = 화면 이동(팬). 노드 위에서 시작해도 동작하도록
  // Konva 히트와 무관한 네이티브 리스너로 처리한다. 시작 시점의 뷰포트 위치를 store 에서
  // 직접 읽어(stale 클로저 방지) 화면 픽셀 델타만큼 이동한다.
  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    let active = false
    let startX = 0
    let startY = 0
    let startVx = 0
    let startVy = 0
    const onDown = (e: MouseEvent) => {
      // 휠클릭(가운데) 또는 Space+좌클릭 → 팬. 노드 위에서 시작해도 동작.
      const isPan = e.button === 1 || (e.button === 0 && spaceDownRef.current)
      if (!isPan) return
      e.preventDefault()
      active = true
      startX = e.clientX
      startY = e.clientY
      const vp = useViewportStore.getState()
      startVx = vp.x
      startVy = vp.y
      el.style.cursor = 'grabbing'
    }
    const onMove = (e: MouseEvent) => {
      if (!active) return
      setPosition(startVx + (e.clientX - startX), startVy + (e.clientY - startY))
    }
    const onUp = () => {
      if (!active) return
      active = false
      el.style.cursor = ''
    }
    // 가운데 버튼의 브라우저 기본 autoscroll 방지
    const onAux = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault()
    }
    el.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    el.addEventListener('auxclick', onAux)
    return () => {
      el.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      el.removeEventListener('auxclick', onAux)
    }
  }, [setPosition])

  // 빈 영역에서 포인터 누름 (도구가 select일 때):
  //  - 터치: 한 손가락 드래그 = 화면 이동(팬)
  //  - 마우스 좌클릭: 러버밴드(마퀴) 다중 선택 시작 (가운데 버튼 팬은 네이티브 리스너가 처리)
  const onStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage()
    if (!stage) return
    const isStageBg = e.target === stage || e.target.attrs.name === 'bg'
    if (!isStageBg) return

    if (tool === 'group') {
      const p = stage.getRelativePointerPosition()
      if (!p) return
      setPendingGroup({ startX: p.x, startY: p.y, x: p.x, y: p.y, width: 0, height: 0 })
      return
    }

    const isTouch = 'touches' in e.evt
    if (isTouch) {
      const sp = stage.getPointerPosition()
      if (!sp) return
      panRef.current = { px: sp.x, py: sp.y, vx, vy }
      return
    }
    // Space 팬 모드면 마퀴를 시작하지 않는다 (네이티브 리스너가 팬 처리).
    if (spaceDown) return
    // 마우스 — 좌클릭만 마퀴 시작 (가운데/오른쪽은 무시)
    if ((e.evt as MouseEvent).button === 0) {
      const p = stage.getRelativePointerPosition()
      if (!p) return
      setPendingSelect({
        startX: p.x,
        startY: p.y,
        x: p.x,
        y: p.y,
        width: 0,
        height: 0,
        additive: (e.evt as MouseEvent).shiftKey,
      })
    }
  }

  // 마우스 이동 — 팬 / 마퀴 / pendingEdge / pendingGroup 추적 + awareness 커서 송신
  const onStageMouseMove = () => {
    const stage = stageRef.current
    if (!stage) return

    // 터치 한 손가락 팬 — 화면 픽셀 델타만큼 뷰포트 이동
    if (panRef.current) {
      const sp = stage.getPointerPosition()
      if (sp) {
        setPosition(panRef.current.vx + (sp.x - panRef.current.px), panRef.current.vy + (sp.y - panRef.current.py))
      }
      return
    }

    const p = stage.getRelativePointerPosition()
    if (!p) return
    pointerRef.current = { x: p.x, y: p.y }

    if (pendingSelect) {
      setPendingSelect({
        ...pendingSelect,
        x: Math.min(pendingSelect.startX, p.x),
        y: Math.min(pendingSelect.startY, p.y),
        width: Math.abs(p.x - pendingSelect.startX),
        height: Math.abs(p.y - pendingSelect.startY),
      })
    }

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

  // 마우스 업 — 팬 종료 / 마퀴 선택 확정 / pendingEdge·pendingGroup 마감
  const onStageMouseUp = () => {
    if (panRef.current) {
      panRef.current = null
      return
    }
    if (pendingSelect) {
      const { x, y, width, height, additive } = pendingSelect
      // 거의 안 움직였으면 단순 클릭 → 선택 해제 (Shift 면 유지)
      if (width < 4 && height < 4) {
        if (!additive) clearSel()
      } else {
        const picked = nodes.filter((n) => {
          const box = getNodeBox(n)
          const nx1 = n.x + box.xOffset
          const ny1 = n.y
          const nx2 = nx1 + box.width
          const ny2 = ny1 + box.height
          // 박스가 마퀴와 겹치면 선택
          return nx1 <= x + width && nx2 >= x && ny1 <= y + height && ny2 >= y
        })
        const items: Selectable[] = []
        if (additive) {
          // 기존 선택 유지하고 노드만 합친다
          selEdges.forEach((id) => items.push({ kind: 'edge', id }))
          selGroups.forEach((id) => items.push({ kind: 'group', id }))
        }
        const nodeIds = new Set<string>(additive ? selNodes : [])
        picked.forEach((n) => nodeIds.add(n.id))
        nodeIds.forEach((id) => items.push({ kind: 'node', id }))
        setSel(items)
      }
      setPendingSelect(null)
      return
    }
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
      data-space={spaceDown}
    >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        scaleX={scale}
        scaleY={scale}
        x={vx}
        y={vy}
        onWheel={onWheel}
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
                draggable={!spaceDown}
                pendingEdgeAnchor={pendingEdgeAnchor}
                onSelect={(additive) => toggleSel('node', n.id, additive)}
                onHover={(h) => setHoveredNode(h ? n.id : (cur) => (cur === n.id ? null : cur))}
                snapPos={snapPos}
                onDragStart={() => {
                  // 선택된 노드를 2개 이상 든 채로 드래그하면 함께 옮긴다 — 시작 위치를 스냅샷.
                  if (selNodes.has(n.id) && selNodes.size > 1) {
                    const others = [...selNodes]
                      .filter((id) => id !== n.id)
                      .map((id) => {
                        const nn = nodesById.get(id)
                        return nn ? { id, x: nn.x, y: nn.y } : null
                      })
                      .filter((o): o is { id: string; x: number; y: number } => o !== null)
                    multiDragRef.current = { anchorId: n.id, startX: n.x, startY: n.y, others }
                  } else {
                    multiDragRef.current = null
                  }
                }}
                onDragMove={(x, y) => {
                  if (!doc) return
                  const now = performance.now()
                  if (now - lastNodeMoveRef.current < 16) return
                  lastNodeMoveRef.current = now
                  const md = multiDragRef.current
                  if (md && md.anchorId === n.id) {
                    const dx = x - md.startX
                    const dy = y - md.startY
                    moveNodes(doc, [
                      { id: n.id, x, y },
                      ...md.others.map((o) => ({ id: o.id, x: o.x + dx, y: o.y + dy })),
                    ])
                  } else {
                    moveNode(doc, n.id, x, y)
                  }
                }}
                onDragEnd={(x, y) => {
                  // 드래그 종료 시 최종 위치는 throttle 없이 반드시 반영.
                  lastNodeMoveRef.current = 0
                  if (doc) {
                    const md = multiDragRef.current
                    if (md && md.anchorId === n.id) {
                      const dx = x - md.startX
                      const dy = y - md.startY
                      moveNodes(doc, [
                        { id: n.id, x, y },
                        ...md.others.map((o) => ({ id: o.id, x: o.x + dx, y: o.y + dy })),
                      ])
                    } else {
                      moveNode(doc, n.id, x, y)
                    }
                  }
                  multiDragRef.current = null
                }}
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

          {/* 마퀴(러버밴드) 다중 선택 사각형 */}
          {pendingSelect && (pendingSelect.width > 1 || pendingSelect.height > 1) && (
            <Rect
              x={pendingSelect.x}
              y={pendingSelect.y}
              width={pendingSelect.width}
              height={pendingSelect.height}
              stroke="#5d5bef"
              strokeWidth={1}
              dash={[4, 4]}
              fill="rgba(93, 91, 239, 0.08)"
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
        /* Space 핸드(팬) 모드 — 잡을 수 있다는 grab 커서 (드래그 중 grabbing 은 JS 가 직접 지정) */
        .canvas-root[data-space="true"] { cursor: grab; }
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
