import { Group, Line, Rect, Text } from 'react-konva'
import type { Edge, Node } from '@/types/domain'
import { arrowHeadPoints, edgePoints } from './geometry'

interface Props {
  edge: Edge
  from: Node
  to: Node
  selected: boolean
  onSelect: (additive: boolean) => void
  onLabelEdit: () => void
}

function dash(style: Edge['style']): number[] | undefined {
  if (style === 'dashed') return [10, 6]
  if (style === 'dotted') return [2, 6]
  return undefined
}

export function EdgeShape({ edge, from, to, selected, onSelect, onLabelEdit }: Props) {
  const points = edgePoints(from, to)
  const [ax, ay, bx, by] = points
  const midX = (ax + bx) / 2
  const midY = (ay + by) / 2

  const stroke = selected ? '#5d5bef' : '#6a7689'
  const strokeWidth = selected ? 2.5 : 1.5

  // 보이지 않는 굵은 hit-line으로 클릭 영역 확장
  return (
    <Group onClick={(e) => onSelect(e.evt.shiftKey)} onTap={() => onSelect(false)}>
      <Line points={points} stroke="transparent" strokeWidth={12} listening />
      <Line
        points={points}
        stroke={stroke}
        strokeWidth={strokeWidth}
        dash={dash(edge.style)}
        lineCap="round"
      />
      {/* Excalidraw 식 열린 화살촉 — 점선 스타일이어도 화살촉은 실선 */}
      {(edge.direction === 'forward' || edge.direction === 'both') && (
        <Line
          points={arrowHeadPoints(ax, ay, bx, by)}
          stroke={stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
        />
      )}
      {(edge.direction === 'backward' || edge.direction === 'both') && (
        <Line
          points={arrowHeadPoints(bx, by, ax, ay)}
          stroke={stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
        />
      )}
      {edge.label && (
        <Group onDblClick={onLabelEdit} onDblTap={onLabelEdit}>
          <Rect
            x={midX - 50}
            y={midY - 11}
            width={100}
            height={22}
            fill="transparent"
            cornerRadius={4}
          />
          <Text
            x={midX - 50}
            y={midY - 8}
            width={100}
            text={edge.label}
            align="center"
            fontSize={11}
            fill="#1f2328"
          />
        </Group>
      )}
    </Group>
  )
}
