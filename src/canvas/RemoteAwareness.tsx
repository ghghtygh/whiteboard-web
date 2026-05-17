import { Fragment } from 'react'
import { Group, Line, Rect, Text } from 'react-konva'
import type { AwarenessState } from '@/collab/awareness'
import type { Edge, Group as DGroup, Node } from '@/types/domain'
import {
  BOX_H,
  BOX_X_OFFSET,
  LABEL_W,
  anchorPoint,
  boxCenter,
  nearestAnchor,
} from './geometry'

interface Props {
  states: Map<number, AwarenessState>
  nodesById: Map<string, Node>
  edgesById: Map<string, Edge>
  groupsById: Map<string, DGroup>
}

// 일반 OS 커서 화살표 모양 (포인터 좌상단을 (0,0) 기준)
const CURSOR_POINTS = [0, 0, 0, 16, 4, 12, 6.5, 18, 9.5, 17, 7, 11, 13, 11]

function RemoteCursor({ state }: { state: AwarenessState }) {
  if (!state.cursor) return null
  const { x, y } = state.cursor
  const name = state.user.name || '익명'
  const color = state.user.color
  // 라벨 폭 — 문자당 약 7px + padding
  const labelWidth = Math.min(160, Math.max(24, name.length * 7 + 12))

  return (
    <Group x={x} y={y} listening={false}>
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
                return (
                  <Rect
                    key={`s-${clientId}-${key}`}
                    x={n.x + BOX_X_OFFSET - 2}
                    y={n.y - 2}
                    width={LABEL_W + 4}
                    height={BOX_H + 4}
                    stroke={color}
                    strokeWidth={2}
                    cornerRadius={10}
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
                const toC = boxCenter(to.x, to.y)
                const fromC = boxCenter(from.x, from.y)
                const fa = e.fromAnchor ?? nearestAnchor(from.x, from.y, toC.x, toC.y)
                const ta = e.toAnchor ?? nearestAnchor(to.x, to.y, fromC.x, fromC.y)
                const a = anchorPoint(from.x, from.y, fa)
                const b = anchorPoint(to.x, to.y, ta)
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
