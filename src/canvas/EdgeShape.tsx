import { Arrow, Group, Line, Rect, Text } from 'react-konva'
import type { Edge, Node } from '@/types/domain'
import { edgePoints, polylineMid } from './geometry'

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
  const points = edgePoints(edge, from, to)
  const { x: midX, y: midY } = polylineMid(points)

  const stroke = selected ? '#5d5bef' : '#6a7689'
  const strokeWidth = selected ? 2.5 : 1.5

  // 보이지 않는 굵은 hit-line으로 클릭 영역 확장
  return (
    <Group onClick={(e) => onSelect(e.evt.shiftKey)} onTap={() => onSelect(false)}>
      <Line points={points} stroke="transparent" strokeWidth={12} listening />
      {/* 마지막/첫 구간이 앵커 면에 수직이라 화살촉도 항상 면을 정면으로 가리킨다. */}
      <Arrow
        points={points}
        lineJoin="round"
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill={stroke}
        dash={dash(edge.style)}
        pointerLength={10}
        pointerWidth={10}
        pointerAtEnding={edge.direction === 'forward' || edge.direction === 'both'}
        pointerAtBeginning={edge.direction === 'backward' || edge.direction === 'both'}
      />
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
