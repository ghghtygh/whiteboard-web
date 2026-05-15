import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getBoard, renameBoard } from '@/api/boards'
import { Sidebar } from '@/components/Sidebar'
import { Toolbar } from '@/components/Toolbar'
import { Canvas } from '@/canvas/Canvas'
import { useBoardCollab } from '@/collab/useBoardCollab'
import { useUndoManager } from '@/canvas/hooks'
import { CanvasContextProvider } from '@/canvas/CanvasContext'
import { useSelection } from '@/canvas/selection'
import type { Board } from '@/types/domain'

export function BoardEditPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const [board, setBoard] = useState<Board | null>(null)
  const [error, setError] = useState<string | null>(null)
  const collab = useBoardCollab(boardId ?? null)
  const undoManager = useUndoManager(collab.doc)
  const clearSel = useSelection((s) => s.clear)

  useEffect(() => {
    if (!boardId) return
    getBoard(boardId)
      .then(setBoard)
      .catch((err) => setError(err instanceof Error ? err.message : '보드 로드 실패'))
    return () => clearSel()
  }, [boardId, clearSel])

  async function onRename() {
    if (!board) return
    const next = window.prompt('보드 제목', board.title)
    if (!next || next === board.title) return
    const updated = await renameBoard(board.id, next)
    setBoard(updated)
  }

  return (
    <CanvasContextProvider value={{ doc: collab.doc, undoManager }}>
      <div className="board-shell">
        <header className="board-topbar">
          <Link to="/boards" className="back">← 보드 목록</Link>
          <button className="title-btn" onClick={onRename}>
            {board?.title ?? '…'}
          </button>
          <div className="spacer" />
          <span className="status" data-online={collab.ready}>
            {collab.ready ? '로컬 영속화됨' : '초기화 중…'}
          </span>
        </header>

        <div className="board-body">
          <Sidebar />
          <main className="board-main">
            <Toolbar />
            <div className="canvas-host">
              {error ? <p className="error">{error}</p> : <Canvas boardId={boardId ?? ''} doc={collab.doc} />}
            </div>
          </main>
        </div>

        <style>{`
          .board-shell { display: flex; flex-direction: column; height: 100%; }
          .board-topbar { display: flex; align-items: center; gap: 12px;
                          padding: 8px 16px; border-bottom: 1px solid var(--color-border);
                          background: var(--color-panel); }
          .back { font-size: 13px; }
          .title-btn { background: none; border: none; font-size: 16px; font-weight: 600; padding: 4px 6px; cursor: pointer; }
          .title-btn:hover { background: #f1f3f5; border-radius: 4px; }
          .spacer { flex: 1; }
          .status { font-size: 12px; color: var(--color-muted); }
          .status[data-online="true"] { color: #16a34a; }
          .board-body { flex: 1; display: grid; grid-template-columns: 240px 1fr; min-height: 0; }
          .board-main { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
          .canvas-host { flex: 1; position: relative; background: #fafbfc; min-height: 0; }
          .error { color: var(--color-danger); padding: 16px; }
        `}</style>
      </div>
    </CanvasContextProvider>
  )
}
