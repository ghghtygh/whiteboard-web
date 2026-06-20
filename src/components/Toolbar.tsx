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
      <button className="ico" title="실행 취소 (⌘Z)" disabled={!canUndo} onClick={() => undoManager?.undo()}>
        ↶
      </button>
      <button className="ico" title="다시 실행 (⌘⇧Z)" disabled={!canRedo} onClick={() => undoManager?.redo()}>
        ↷
      </button>
      {hasSelection && (
        <>
          <span className="sep" />
          <button className="ico del" title="선택 삭제 (Delete)" onClick={handleDelete}>
            🗑
          </button>
        </>
      )}
      <span className="sep" />
      <button
        className="ico txt"
        title="그룹 만들기 — 빈 영역을 드래그"
        data-active={tool === 'group'}
        onClick={toggleGroup}
      >
        그룹
      </button>
      <button className="ico txt" title="격자 보기" data-active={gridVisible} onClick={toggleGrid}>
        격자
      </button>
      <button
        className="ico txt"
        title="격자 스냅 — 새 배치/드래그를 40px 격자에 맞춤 (Alt 누르면 반전)"
        data-active={snapEnabled}
        onClick={toggleSnap}
      >
        스냅
      </button>

      <style>{`
        .toolbar { display: inline-flex; align-items: center; gap: 2px; flex-wrap: wrap; }
        .toolbar .ico {
          width: 30px; height: 30px; padding: 0; font-size: 15px; line-height: 1;
          display: inline-flex; align-items: center; justify-content: center;
          background: transparent; border: 1px solid transparent; border-radius: var(--radius-sm);
          color: var(--text-body); cursor: pointer;
          transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
        }
        .toolbar .ico.txt { width: auto; padding: 0 11px; font: var(--font-label); }
        .toolbar .ico:hover:not(:disabled) { background: var(--surface-hover); }
        .toolbar .ico:active:not(:disabled) { transform: scale(0.92); }
        .toolbar .ico:disabled { opacity: 0.35; cursor: default; }
        .toolbar .ico[data-active="true"] {
          background: var(--primary-soft); color: var(--primary-soft-text);
          border-color: var(--indigo-200);
        }
        .toolbar .sep { width: 1px; height: 16px; background: var(--border-subtle); margin: 0 4px; }
        .toolbar .del:hover:not(:disabled) { background: var(--danger-soft); color: var(--danger); }

        /* 모바일 — 터치 영역 확대 + 텍스트 라벨 압축 */
        @media (max-width: 768px) {
          .toolbar .ico { width: 36px; height: 36px; font-size: 17px; }
          .toolbar .ico.txt { padding: 0 8px; min-height: 36px; }
        }
      `}</style>
    </div>
  )
}
