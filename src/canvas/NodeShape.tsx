import { Group, Rect, Text, Circle, Image as KImage } from 'react-konva'
import useImage from 'use-image'
import type Konva from 'konva'
import type { Anchor, Node } from '@/types/domain'
import { ANCHOR_R, NODE_H, NODE_W } from './geometry'
import { catalogColor } from '@/local/catalogSeed'
import { iconDataUrl, hasIcon } from './icons'

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
const ICON_INSET = 8
const ICON_SIZE = NODE_W - ICON_INSET * 2 // 64

// 라벨 영역 — 아이콘 아래에 노출. 가로는 노드 폭보다 살짝 넓게.
const LABEL_W = 140
const LABEL_X = (NODE_W - LABEL_W) / 2 // 음수 → 노드 외부로 확장
const LABEL_GAP = 4
const LABEL_LINE_H = 16
const LABEL_MAX_LINES = 3
const LABEL_H = LABEL_LINE_H * LABEL_MAX_LINES

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
  const url = iconDataUrl(node.type)
  const [iconImg] = useImage(url ?? '', 'anonymous')
  const showIcon = hasIcon(node.type) && !!iconImg
  const fallbackColor = catalogColor(node.type)

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
      {/* 히트 영역 — 아이콘 + 라벨 전체를 클릭 가능하게 */}
      <Rect
        x={LABEL_X}
        y={0}
        width={LABEL_W}
        height={NODE_H + LABEL_GAP + LABEL_H}
        fill="transparent"
      />

      {/* 선택/호버 outline — 아이콘 영역만 감싸는 둥근 사각 */}
      {(selected || hovered) && (
        <Rect
          x={2}
          y={2}
          width={NODE_W - 4}
          height={NODE_H - 4}
          stroke={selected ? '#2563eb' : '#9ca3af'}
          strokeWidth={selected ? 2 : 1}
          cornerRadius={10}
          dash={selected ? undefined : [4, 4]}
          listening={false}
        />
      )}

      {/* 아이콘 */}
      {showIcon ? (
        <KImage
          image={iconImg}
          x={ICON_INSET}
          y={ICON_INSET}
          width={ICON_SIZE}
          height={ICON_SIZE}
          listening={false}
        />
      ) : (
        <>
          <Rect
            x={ICON_INSET}
            y={ICON_INSET}
            width={ICON_SIZE}
            height={ICON_SIZE}
            fill={fallbackColor}
            cornerRadius={12}
            listening={false}
          />
          <Text
            x={ICON_INSET}
            y={ICON_INSET}
            width={ICON_SIZE}
            height={ICON_SIZE}
            text={initials(node.label, node.type)}
            align="center"
            verticalAlign="middle"
            fill="white"
            fontStyle="bold"
            fontSize={20}
            listening={false}
          />
        </>
      )}

      {/* 라벨 (멀티라인) */}
      <Text
        x={LABEL_X}
        y={NODE_H + LABEL_GAP}
        width={LABEL_W}
        height={LABEL_H}
        text={node.label || node.type}
        fontSize={12}
        lineHeight={LABEL_LINE_H / 12}
        fill={node.label ? '#1f2328' : '#6b7280'}
        align="center"
        verticalAlign="top"
        wrap="word"
        ellipsis
        listening={false}
      />

      {/* 호버 시 4방향 앵커 */}
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
