import { useEffect, useRef } from 'react'
import { Group, Rect, Text, Circle, Image as KImage } from 'react-konva'
import useImage from 'use-image'
import Konva from 'konva'
import type { Anchor, Node } from '@/types/domain'
import {
  ANCHOR_R,
  LABEL_FONT,
  LABEL_GAP,
  LABEL_LINE_H,
  NODE_H,
  NODE_W,
  computeBoxDims,
  nodeDisplayText,
  type BoxDims,
  type Point,
} from './geometry'
import { catalogColor } from '@/local/catalogSeed'
import { iconDataUrl, hasIcon } from './icons'

interface Props {
  node: Node
  selected: boolean
  hovered: boolean
  // pendingEdge 드래그 중 이 노드가 연결 대상일 때 연결될 앵커 방향
  pendingEdgeAnchor?: Anchor
  // 드래그 중인 위치를 격자로 보정. Canvas 가 정렬 모드/Alt 상태에 따라 다른 함수 전달.
  snapPos: (x: number, y: number) => Point
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

function anchorXY(anchor: Anchor, dims: BoxDims): { x: number; y: number } {
  switch (anchor) {
    case 'top':
      return { x: NODE_W / 2, y: 0 }
    case 'right':
      return { x: dims.xOffset + dims.width, y: dims.height / 2 }
    case 'bottom':
      return { x: NODE_W / 2, y: dims.height }
    case 'left':
      return { x: dims.xOffset, y: dims.height / 2 }
  }
}

function initials(text: string, type: string): string {
  const s = text.trim() || type
  const words = s.split(/[\s-_]/).filter(Boolean)
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase()
  return s.slice(0, 2).toUpperCase()
}

export function NodeShape(props: Props) {
  const { node, selected, hovered, pendingEdgeAnchor } = props
  const url = iconDataUrl(node.type)
  const [iconImg] = useImage(url ?? '', 'anonymous')
  const showIcon = hasIcon(node.type) && !!iconImg
  const fallbackColor = catalogColor(node.type)

  const text = nodeDisplayText(node)
  const dims = computeBoxDims(text)
  const labelH = dims.height - NODE_H - LABEL_GAP

  // Excalidraw 식 협업: 자기 드래그는 로컬 즉시(낙관적), 다른 peer 가 옮긴 위치는
  // Tween 으로 부드럽게 따라간다. 위치 prop 은 초기값만 고정(매번 주면 점프해 보간이 무효).
  const groupRef = useRef<Konva.Group>(null)
  const draggingRef = useRef(false)
  const initRef = useRef({ x: node.x, y: node.y })
  useEffect(() => {
    if (draggingRef.current) return // 드래그 중인 내 노드는 원격 업데이트로 덮어쓰지 않는다
    groupRef.current?.to({ x: node.x, y: node.y, duration: 0.1, easing: Konva.Easings.EaseOut })
  }, [node.x, node.y])

  return (
    <Group
      ref={groupRef}
      x={initRef.current.x}
      y={initRef.current.y}
      draggable
      onDragStart={() => {
        draggingRef.current = true
      }}
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
      onTouchEnd={props.onAnchorUp}
      onDragMove={(e: Konva.KonvaEventObject<DragEvent>) => {
        const x = e.target.x()
        const y = e.target.y()
        const sp = props.snapPos(x, y)
        // Konva 가 마우스 위치로 옮긴 직후, 시각 위치를 격자에 잡아 lock
        if (sp.x !== x || sp.y !== y) {
          e.target.position({ x: sp.x, y: sp.y })
        }
        props.onDragMove(sp.x, sp.y)
      }}
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
        draggingRef.current = false
        const x = e.target.x()
        const y = e.target.y()
        const sp = props.snapPos(x, y)
        if (sp.x !== x || sp.y !== y) {
          e.target.position({ x: sp.x, y: sp.y })
        }
        props.onDragEnd(sp.x, sp.y)
      }}
    >
      {/* 히트 영역 — 박스 전체 */}
      <Rect
        x={dims.xOffset}
        y={0}
        width={dims.width}
        height={dims.height}
        fill="transparent"
      />

      {/* 선택/호버 outline — 박스 전체 둘러쌈 */}
      {(selected || hovered || pendingEdgeAnchor) && (
        <Rect
          x={dims.xOffset + 2}
          y={2}
          width={dims.width - 4}
          height={dims.height - 4}
          stroke={pendingEdgeAnchor ? '#16a34a' : selected ? '#5d5bef' : '#c6cedb'}
          strokeWidth={pendingEdgeAnchor ? 2.5 : selected ? 2 : 1}
          cornerRadius={8}
          dash={selected || pendingEdgeAnchor ? undefined : [4, 4]}
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

      {/* 라벨 (1–2 줄, 박스 가로에 맞춰 wrap) */}
      <Text
        x={dims.xOffset}
        y={NODE_H + LABEL_GAP}
        width={dims.width}
        height={labelH}
        text={text}
        fontSize={12}
        fontFamily={LABEL_FONT}
        lineHeight={LABEL_LINE_H / 12}
        fill={node.label ? '#1f2328' : '#6b7280'}
        align="center"
        verticalAlign="top"
        wrap="word"
        ellipsis
        listening={false}
      />

      {/* 호버 또는 선택 시 4방향 앵커. 터치 기기에서는 hover 가 없으므로 selected 가 핸들 노출 트리거. */}
      {(hovered || selected) &&
        ANCHORS.map((a) => {
          const p = anchorXY(a, dims)
          return (
            <Group key={a}>
              {/* 터치 친화적 투명 히트박스 — 시각적 점은 작게 두고 잡히는 영역만 키움 */}
              <Circle
                x={p.x}
                y={p.y}
                radius={ANCHOR_R * 3}
                fill="transparent"
                onMouseDown={(e) => {
                  e.cancelBubble = true
                  props.onAnchorDown(a)
                }}
                onTouchStart={(e) => {
                  e.cancelBubble = true
                  e.evt.preventDefault?.()
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
              <Circle
                x={p.x}
                y={p.y}
                radius={ANCHOR_R}
                fill="#5d5bef"
                stroke="white"
                strokeWidth={2}
                listening={false}
              />
            </Group>
          )
        })}

      {/* pendingEdge 드래그 중 연결될 앵커만 녹색 강조 */}
      {pendingEdgeAnchor && (() => {
        const p = anchorXY(pendingEdgeAnchor, dims)
        return (
          <Group>
            <Circle
              x={p.x}
              y={p.y}
              radius={ANCHOR_R * 2.2}
              fill="rgba(22, 163, 74, 0.15)"
              listening={false}
            />
            <Circle
              x={p.x}
              y={p.y}
              radius={ANCHOR_R * 1.4}
              fill="#16a34a"
              stroke="white"
              strokeWidth={2}
              listening={false}
            />
          </Group>
        )
      })()}
    </Group>
  )
}
