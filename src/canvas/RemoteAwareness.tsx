import { Fragment, useEffect, useRef } from 'react'
import Konva from 'konva'
import { Group, Line, Rect, Text } from 'react-konva'
import type { AwarenessState } from '@/collab/awareness'
import type { Edge, Group as DGroup, Node } from '@/types/domain'
import { anchorPoint, boxCenter, getNodeBox, nearestAnchor } from './geometry'

interface Props {
  states: Map<number, AwarenessState>
  nodesById: Map<string, Node>
  edgesById: Map<string, Edge>
  groupsById: Map<string, DGroup>
}

// 일반 OS 커서 화살표 모양 (포인터 좌상단을 (0,0) 기준)
const CURSOR_POINTS = [0, 0, 0, 16, 4, 12, 6.5, 18, 9.5, 17, 7, 11, 13, 11]

function RemoteCursor({ state }: { state: AwarenessState }) {
  const groupRef = useRef<Konva.Group>(null)
  const cursor = state.cursor
  const cx = cursor?.x
  const cy = cursor?.y
  // 초기 위치만 prop 으로 고정한다. 이후 좌표 변경은 Tween 으로만 이동시켜
  // 점프 없이 부드럽게 따라오게 한다. (x={cursor.x} 로 매번 주면 즉시 점프해 Tween 이 무효가 됨)
  const initRef = useRef<{ x: number; y: number } | null>(null)
  if (cursor && !initRef.current) initRef.current = { x: cursor.x, y: cursor.y }
  useEffect(() => {
    const node = groupRef.current
    if (!node || cx == null || cy == null) return
    node.to({ x: cx, y: cy, duration: 0.08, easing: Konva.Easings.Linear })
  }, [cx, cy])

  if (!cursor || !initRef.current) return null
  const name = state.user.name || 'Anonymous'
  const color = state.user.color
  // 라벨 폭 — 문자당 약 7px + padding
  const labelWidth = Math.min(160, Math.max(24, name.length * 7 + 12))

  return (
    <Group ref={groupRef} x={initRef.current.x} y={initRef.current.y} listening={false}>
      <Line points={CURSOR_POINTS} closed fill={color} stroke="white" strokeWidth={1} />
      <Rect
        x={12}
        y={14}
        width={labelWidth}
        height={18}
        fill={color}
        cornerRadius={3}
        shadowBlur={2}
        shadowColor="rgba(0,0,0,0.15)"
      />
      <Text
        x={12}
        y={14}
        width={labelWidth}
        height={18}
        text={name}
        fill="white"
        fontSize={11}
        align="center"
        verticalAlign="middle"
        ellipsis
        wrap="none"
      />
    </Group>
  )
}

function parseKey(key: string): { kind: 'node' | 'edge' | 'group'; id: string } | null {
  const i = key.indexOf(':')
  if (i < 0) return null
  const kind = key.slice(0, i)
  if (kind !== 'node' && kind !== 'edge' && kind !== 'group') return null
  return { kind, id: key.slice(i + 1) }
}

export function RemoteAwareness({ states, nodesById, edgesById, groupsById }: Props) {
  return (
    <>
      {/* 다른 peer 의 선택 outline */}
      {[...states.entries()].map(([clientId, st]) => {
        const color = st.user?.color ?? '#9ca3af'
        return (
          <Fragment key={`sel-${clientId}`}>
            {st.selection?.map((key) => {
              const parsed = parseKey(key)
              if (!parsed) return null
              if (parsed.kind === 'node') {
                const n = nodesById.get(parsed.id)
                if (!n) return null
                const d = getNodeBox(n)
                return (
                  <Rect
                    key={`s-${clientId}-${key}`}
                    x={n.x + d.xOffset - 2}
                    y={n.y - 2}
                    width={d.width + 4}
                    height={d.height + 4}
                    stroke={color}
                    strokeWidth={2}
                    cornerRadius={8}
                    dash={[5, 4]}
                    listening={false}
                  />
                )
              }
              if (parsed.kind === 'group') {
                const g = groupsById.get(parsed.id)
                if (!g) return null
                return (
                  <Rect
                    key={`s-${clientId}-${key}`}
                    x={g.x - 2}
                    y={g.y - 2}
                    width={g.width + 4}
                    height={g.height + 4}
                    stroke={color}
                    strokeWidth={2}
                    cornerRadius={6}
                    dash={[5, 4]}
                    listening={false}
                  />
                )
              }
              if (parsed.kind === 'edge') {
                const e = edgesById.get(parsed.id)
                if (!e) return null
                const from = nodesById.get(e.from)
                const to = nodesById.get(e.to)
                if (!from || !to) return null
                const fromDims = getNodeBox(from)
                const toDims = getNodeBox(to)
                const toC = boxCenter(to.x, to.y, toDims)
                const fromC = boxCenter(from.x, from.y, fromDims)
                const fa = e.fromAnchor ?? nearestAnchor(from.x, from.y, fromDims, toC.x, toC.y)
                const ta = e.toAnchor ?? nearestAnchor(to.x, to.y, toDims, fromC.x, fromC.y)
                const a = anchorPoint(from.x, from.y, fa, fromDims)
                const b = anchorPoint(to.x, to.y, ta, toDims)
                return (
                  <Line
                    key={`s-${clientId}-${key}`}
                    points={[a.x, a.y, b.x, b.y]}
                    stroke={color}
                    strokeWidth={4}
                    opacity={0.4}
                    listening={false}
                  />
                )
              }
              return null
            })}
          </Fragment>
        )
      })}

      {/* 다른 peer 의 커서 */}
      {[...states.entries()].map(([clientId, st]) => (
        <RemoteCursor key={`c-${clientId}`} state={st} />
      ))}
    </>
  )
}
