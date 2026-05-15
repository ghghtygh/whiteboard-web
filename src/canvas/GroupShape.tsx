import { Group as KGroup, Rect, Text } from 'react-konva'
import type Konva from 'konva'
import type { Group } from '@/types/domain'

interface Props {
  group: Group
  selected: boolean
  onSelect: (additive: boolean) => void
  onDragEnd: (dx: number, dy: number) => void
  onLabelEdit: () => void
}

export function GroupShape({ group, selected, onSelect, onDragEnd, onLabelEdit }: Props) {
  return (
    <KGroup
      x={group.x}
      y={group.y}
      draggable
      onClick={(e) => onSelect(e.evt.shiftKey)}
      onTap={() => onSelect(false)}
      onDblClick={onLabelEdit}
      onDblTap={onLabelEdit}
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
        const newX = e.target.x()
        const newY = e.target.y()
        onDragEnd(newX - group.x, newY - group.y)
        // 자식 노드 이동은 Y 트랜잭션에서 처리 — 화면에선 그룹 좌표를 원위치시킨 뒤
        // 새 데이터로 다시 렌더하도록 컨테이너 좌표 리셋
        e.target.position({ x: group.x, y: group.y })
      }}
      onMouseEnter={(e) => {
        const stage = e.target.getStage()
        if (stage) stage.container().style.cursor = 'move'
      }}
      onMouseLeave={(e) => {
        const stage = e.target.getStage()
        if (stage) stage.container().style.cursor = ''
      }}
    >
      <Rect
        width={group.width}
        height={group.height}
        fill={group.color ?? 'rgba(255,255,255,0.4)'}
        stroke={selected ? '#2563eb' : '#22c5a0'}
        strokeWidth={selected ? 3 : 2}
        cornerRadius={4}
      />
      {group.label && (
        <Text
          x={10}
          y={8}
          text={group.label}
          fontSize={13}
          fontStyle="bold"
          fill="#1f2328"
        />
      )}
    </KGroup>
  )
}
