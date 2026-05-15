import { Arrow, Group, Line, Text } from 'react-konva'
import type { Edge, Node } from '@/types/domain'
import { NODE_H, NODE_W, anchorPoint, nearestAnchor } from './geometry'

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
  const fromAnchor =
    edge.fromAnchor ?? nearestAnchor(from.x, from.y, NODE_W, NODE_H, to.x + NODE_W / 2, to.y + NODE_H / 2)
  const toAnchor =
    edge.toAnchor ?? nearestAnchor(to.x, to.y, NODE_W, NODE_H, from.x + NODE_W / 2, from.y + NODE_H / 2)
  const a = anchorPoint(from.x, from.y, NODE_W, NODE_H, fromAnchor)
  const b = anchorPoint(to.x, to.y, NODE_W, NODE_H, toAnchor)

  const stroke = selected ? '#2563eb' : '#6b7280'
  const strokeWidth = selected ? 2.5 : 1.5

  const arrowForward = edge.direction === 'forward' || edge.direction === 'both'
  const arrowBackward = edge.direction === 'backward' || edge.direction === 'both'

  const midX = (a.x + b.x) / 2
  const midY = (a.y + b.y) / 2

  // 보이지 않는 굵은 hit-line으로 클릭 영역 확장
  return (
    <Group onClick={(e) => onSelect(e.evt.shiftKey)} onTap={() => onSelect(false)}>
      <Line
        points={[a.x, a.y, b.x, b.y]}
        stroke="transparent"
        strokeWidth={12}
        listening
      />
      {edge.direction === 'none' ? (
        <Line
          points={[a.x, a.y, b.x, b.y]}
          stroke={stroke}
          strokeWidth={strokeWidth}
          dash={dash(edge.style)}
        />
      ) : (
        <>
          {arrowForward && (
            <Arrow
              points={[a.x, a.y, b.x, b.y]}
              stroke={stroke}
              strokeWidth={strokeWidth}
              fill={stroke}
              dash={dash(edge.style)}
              pointerLength={10}
              pointerWidth={10}
            />
          )}
          {arrowBackward && (
            <Arrow
              points={[b.x, b.y, a.x, a.y]}
              stroke={stroke}
              strokeWidth={strokeWidth}
              fill={stroke}
              dash={dash(edge.style)}
              pointerLength={10}
              pointerWidth={10}
            />
          )}
        </>
      )}
      {edge.label && (
        <Group onDblClick={onLabelEdit} onDblTap={onLabelEdit}>
          <Text
            x={midX - 60}
            y={midY - 9}
            width={120}
            text={edge.label}
            align="center"
            fontSize={11}
            fill="#1f2328"
            padding={2}
          />
        </Group>
      )}
    </Group>
  )
}
