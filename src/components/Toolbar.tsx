import { useEffect, useState } from 'react'
import { useToolStore } from '@/canvas/tool'
import { useCanvasContext } from '@/canvas/useCanvasContext'
import { useGridStore } from '@/canvas/gridStore'
import { useSnapStore } from '@/canvas/snapStore'

export function Toolbar() {
  const tool = useToolStore((s) => s.tool)
  const toggleGroup = useToolStore((s) => s.toggleGroup)
  const gridVisible = useGridStore((s) => s.visible)
  const toggleGrid = useGridStore((s) => s.toggle)
  const snapEnabled = useSnapStore((s) => s.enabled)
  const toggleSnap = useSnapStore((s) => s.toggle)
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
      <button
        className="ico txt"
        title="격자 정렬 — 신규 드롭/드래그를 40px 격자에 자동 스냅 (Alt 누르면 일시 반전)"
        data-active={snapEnabled}
        onClick={toggleSnap}
      >
        정렬
      </button>

      <style>{`
        .toolbar { display: inline-flex; align-items: center; gap: 2px; flex-wrap: wrap; }
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
        .toolbar .sep { width: 1px; height: 16px; background: var(--color-border); margin: 0 4px; }

        /* 모바일 — 터치 영역 확대 + 텍스트 라벨 압축 */
        @media (max-width: 768px) {
          .toolbar .ico { width: 36px; height: 36px; font-size: 17px; }
          .toolbar .ico.txt { padding: 0 8px; min-height: 36px; }
        }
      `}</style>
    </div>
  )
}
