import { useEffect, useState } from 'react'
import { useViewportStore } from '@/store/viewport'
import { useToolStore } from '@/canvas/tool'
import { useCanvasContext } from '@/canvas/useCanvasContext'
import { useGridStore } from '@/canvas/gridStore'

export function Toolbar() {
  const scale = useViewportStore((s) => s.scale)
  const setScale = useViewportStore((s) => s.setScale)
  const reset = useViewportStore((s) => s.reset)
  const tool = useToolStore((s) => s.tool)
  const toggleGroup = useToolStore((s) => s.toggleGroup)
  const gridVisible = useGridStore((s) => s.visible)
  const toggleGrid = useGridStore((s) => s.toggle)
  const { undoManager } = useCanvasContext()

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
      <button className="ico" title="실행 취소 (⌘Z)" disabled={!canUndo} onClick={() => undoManager?.undo()}>
        ↶
      </button>
      <button className="ico" title="다시 실행 (⌘⇧Z)" disabled={!canRedo} onClick={() => undoManager?.redo()}>
        ↷
      </button>
      <span className="sep" />
      <button
        className="ico txt"
        title="그룹 만들기 — 빈 영역 드래그"
        data-active={tool === 'group'}
        onClick={toggleGroup}
      >
        그룹
      </button>
      <button className="ico txt" title="격자 표시" data-active={gridVisible} onClick={toggleGrid}>
        격자
      </button>
      <span className="sep" />
      <button className="ico" title="줌 아웃" onClick={() => setScale(scale * 0.9)}>
        −
      </button>
      <button className="zoom" title="기본 줌(100%)으로 리셋" onClick={reset}>
        {Math.round(scale * 100)}%
      </button>
      <button className="ico" title="줌 인" onClick={() => setScale(scale * 1.1)}>
        +
      </button>

      <style>{`
        .toolbar { display: inline-flex; align-items: center; gap: 2px; }
        .toolbar .ico {
          width: 28px; height: 28px; padding: 0; font-size: 15px; line-height: 1;
          display: inline-flex; align-items: center; justify-content: center;
          background: transparent; border: 1px solid transparent; border-radius: 4px;
          color: var(--color-text); cursor: pointer;
        }
        .toolbar .ico.txt { width: auto; padding: 0 10px; font-size: 12px; }
        .toolbar .ico:hover:not(:disabled) { background: #f1f3f5; }
        .toolbar .ico:disabled { opacity: 0.35; cursor: default; }
        .toolbar .ico[data-active="true"] {
          background: var(--color-accent); color: white;
        }
        .toolbar .zoom {
          min-width: 48px; height: 28px; padding: 0 6px;
          font-size: 12px; color: var(--color-muted);
          background: transparent; border: 1px solid transparent; border-radius: 4px;
          cursor: pointer;
        }
        .toolbar .zoom:hover { background: #f1f3f5; color: var(--color-text); }
        .toolbar .sep { width: 1px; height: 16px; background: var(--color-border); margin: 0 4px; }
      `}</style>
    </div>
  )
}
