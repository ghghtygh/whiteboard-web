import { Group, Rect, Text, Circle } from 'react-konva'
import type Konva from 'konva'
import type { Anchor, Node } from '@/types/domain'
import { ANCHOR_R, NODE_H, NODE_W } from './geometry'
import { catalogColor } from '@/local/catalogSeed'

interface Props {
  node: Node
  selected: boolean
  hovered: boolean
  onSelect: (additive: boolean) => void
  onDragMove: (x: number, y: number) => void
  onDragEnd: (x: number, y: number) => void
  onHover: (hovered: boolean) => void
  onAnchorDown: (anchor: Anchor) => void
  onAnchorUp: () => void
  onLabelEdit: () => void
}

const ANCHORS: Anchor[] = ['top', 'right', 'bottom', 'left']

function anchorXY(anchor: Anchor): { x: number; y: number } {
  switch (anchor) {
    case 'top':
      return { x: NODE_W / 2, y: 0 }
    case 'right':
      return { x: NODE_W, y: NODE_H / 2 }
    case 'bottom':
      return { x: NODE_W / 2, y: NODE_H }
    case 'left':
      return { x: 0, y: NODE_H / 2 }
  }
}

function initials(text: string, type: string): string {
  const s = text.trim() || type
  const words = s.split(/[\s-_]/).filter(Boolean)
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase()
  return s.slice(0, 2).toUpperCase()
}

export function NodeShape(props: Props) {
  const { node, selected, hovered } = props
  const color = catalogColor(node.type)

  return (
    <Group
      x={node.x}
      y={node.y}
      draggable
      onClick={(e) => props.onSelect(e.evt.shiftKey)}
      onTap={() => props.onSelect(false)}
      onDblClick={props.onLabelEdit}
      onDblTap={props.onLabelEdit}
      onMouseEnter={(e) => {
        props.onHover(true)
        const stage = e.target.getStage()
        if (stage) stage.container().style.cursor = 'move'
      }}
      onMouseLeave={(e) => {
        props.onHover(false)
        const stage = e.target.getStage()
        if (stage) stage.container().style.cursor = ''
      }}
      onMouseUp={props.onAnchorUp}
      onDragMove={(e: Konva.KonvaEventObject<DragEvent>) =>
        props.onDragMove(e.target.x(), e.target.y())
      }
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) =>
        props.onDragEnd(e.target.x(), e.target.y())
      }
    >
      <Rect
        width={NODE_W}
        height={NODE_H}
        fill="white"
        stroke={selected ? '#2563eb' : '#d1d5db'}
        strokeWidth={selected ? 2 : 1}
        cornerRadius={6}
        shadowBlur={selected ? 8 : 0}
        shadowColor={selected ? 'rgba(37, 99, 235, 0.35)' : 'transparent'}
      />
      <Rect x={6} y={6} width={28} height={28} cornerRadius={4} fill={color} />
      <Text
        x={6}
        y={6}
        width={28}
        height={28}
        text={initials(node.label, node.type)}
        align="center"
        verticalAlign="middle"
        fill="white"
        fontStyle="bold"
        fontSize={12}
      />
      <Text
        x={40}
        y={10}
        width={NODE_W - 46}
        text={node.type}
        fontSize={10}
        fill="#6b7280"
        ellipsis
        wrap="none"
      />
      <Text
        x={6}
        y={42}
        width={NODE_W - 12}
        height={NODE_H - 50}
        text={node.label || '(라벨 없음)'}
        fontSize={12}
        fill={node.label ? '#1f2328' : '#9ca3af'}
        align="center"
        verticalAlign="top"
        wrap="word"
      />

      {hovered &&
        ANCHORS.map((a) => {
          const p = anchorXY(a)
          return (
            <Circle
              key={a}
              x={p.x}
              y={p.y}
              radius={ANCHOR_R}
              fill="#2563eb"
              stroke="white"
              strokeWidth={2}
              onMouseDown={(e) => {
                e.cancelBubble = true
                props.onAnchorDown(a)
              }}
              onMouseEnter={(e) => {
                const stage = e.target.getStage()
                if (stage) stage.container().style.cursor = 'crosshair'
              }}
              onMouseLeave={(e) => {
                const stage = e.target.getStage()
                if (stage) stage.container().style.cursor = ''
              }}
            />
          )
        })}
    </Group>
  )
}
