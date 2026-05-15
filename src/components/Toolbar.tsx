import { useEffect, useState } from 'react'
import { useViewportStore } from '@/store/viewport'
import { useToolStore } from '@/canvas/tool'
import { useCanvasContext } from '@/canvas/useCanvasContext'

export function Toolbar() {
  const scale = useViewportStore((s) => s.scale)
  const setScale = useViewportStore((s) => s.setScale)
  const reset = useViewportStore((s) => s.reset)
  const tool = useToolStore((s) => s.tool)
  const toggleGroup = useToolStore((s) => s.toggleGroup)
  const { undoManager } = useCanvasContext()

  // undoManager의 stack 상태를 가볍게 추적 (재렌더 트리거 용도)
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!undoManager) return
    const refresh = () => setTick((t) => t + 1)
    undoManager.on('stack-item-added', refresh)
    undoManager.on('stack-item-popped', refresh)
    return () => {
      undoManager.off('stack-item-added', refresh)
      undoManager.off('stack-item-popped', refresh)
    }
  }, [undoManager])

  const canUndo = !!undoManager && undoManager.undoStack.length > 0
  const canRedo = !!undoManager && undoManager.redoStack.length > 0

  return (
    <div className="toolbar">
      <div className="group">
        <button title="줌 아웃" onClick={() => setScale(scale * 0.9)}>−</button>
        <span className="zoom">{Math.round(scale * 100)}%</span>
        <button title="줌 인" onClick={() => setScale(scale * 1.1)}>+</button>
        <button title="초기화" onClick={reset}>리셋</button>
      </div>
      <div className="group">
        <button title="실행 취소 (⌘Z)" disabled={!canUndo} onClick={() => undoManager?.undo()}>
          ↶
        </button>
        <button title="다시 실행 (⌘⇧Z)" disabled={!canRedo} onClick={() => undoManager?.redo()}>
          ↷
        </button>
      </div>
      <div className="group">
        <button
          title="그룹 만들기 — 활성화 후 빈 영역 드래그"
          onClick={toggleGroup}
          data-active={tool === 'group'}
        >
          그룹
        </button>
        <button disabled title="Export (M5)">Export</button>
        <button disabled title="Import (M5)">Import</button>
      </div>
      <div className="group hint">
        <span>엣지 선택 시: 1 실선 · 2 점선 · 3 점점선 · D 방향 토글 · Delete 삭제</span>
      </div>

      <style>{`
        .toolbar { display: flex; gap: 12px; padding: 8px 12px;
                   background: var(--color-panel);
                   border-bottom: 1px solid var(--color-border); align-items: center; }
        .toolbar .group { display: flex; gap: 4px; align-items: center; }
        .toolbar .zoom { font-size: 12px; color: var(--color-muted); min-width: 42px; text-align: center; }
        .toolbar .hint { margin-left: auto; font-size: 11px; color: var(--color-muted); }
        button[data-active="true"] { background: var(--color-accent); color: white; border-color: var(--color-accent); }
      `}</style>
    </div>
  )
}
