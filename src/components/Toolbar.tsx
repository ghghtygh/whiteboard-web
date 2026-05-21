import { useEffect, useState } from 'react'
import { useToolStore } from '@/canvas/tool'
import { useCanvasContext } from '@/canvas/useCanvasContext'
import { useGridStore } from '@/canvas/gridStore'
import { useSnapStore } from '@/canvas/snapStore'
import { useSelection } from '@/canvas/selection'
import { deleteNodes, deleteEdges, deleteGroups } from '@/canvas/ops'

export function Toolbar() {
  const tool = useToolStore((s) => s.tool)
  const toggleGroup = useToolStore((s) => s.toggleGroup)
  const gridVisible = useGridStore((s) => s.visible)
  const toggleGrid = useGridStore((s) => s.toggle)
  const snapEnabled = useSnapStore((s) => s.enabled)
  const toggleSnap = useSnapStore((s) => s.toggle)
  const { undoManager, doc } = useCanvasContext()

  const selNodes = useSelection((s) => s.nodes)
  const selEdges = useSelection((s) => s.edges)
  const selGroups = useSelection((s) => s.groups)
  const clearSel = useSelection((s) => s.clear)
  const hasSelection = selNodes.size > 0 || selEdges.size > 0 || selGroups.size > 0

  function handleDelete() {
    if (!doc) return
    if (selNodes.size) deleteNodes(doc, [...selNodes])
    if (selEdges.size) deleteEdges(doc, [...selEdges])
    if (selGroups.size) deleteGroups(doc, [...selGroups])
    clearSel()
  }

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
      <button className="ico" title="Undo (⌘Z)" disabled={!canUndo} onClick={() => undoManager?.undo()}>
        ↶
      </button>
      <button className="ico" title="Redo (⌘⇧Z)" disabled={!canRedo} onClick={() => undoManager?.redo()}>
        ↷
      </button>
      {hasSelection && (
        <>
          <span className="sep" />
          <button className="ico del" title="Delete selection (Delete)" onClick={handleDelete}>
            🗑
          </button>
        </>
      )}
      <span className="sep" />
      <button
        className="ico txt"
        title="Create group — drag on empty area"
        data-active={tool === 'group'}
        onClick={toggleGroup}
      >
        Group
      </button>
      <button className="ico txt" title="Show grid" data-active={gridVisible} onClick={toggleGrid}>
        Grid
      </button>
      <button
        className="ico txt"
        title="Snap to grid — auto-snap new drops/drags to a 40px grid (hold Alt to invert)"
        data-active={snapEnabled}
        onClick={toggleSnap}
      >
        Snap
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
        .toolbar .del:hover:not(:disabled) { background: #fee2e2; color: #dc2626; }

        /* 모바일 — 터치 영역 확대 + 텍스트 라벨 압축 */
        @media (max-width: 768px) {
          .toolbar .ico { width: 36px; height: 36px; font-size: 17px; }
          .toolbar .ico.txt { padding: 0 8px; min-height: 36px; }
        }
      `}</style>
    </div>
  )
}
