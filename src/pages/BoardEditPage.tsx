import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getBoard, renameBoard } from '@/api/boards'
import { localBoards } from '@/local/boardsStore'
import { IS_LOCAL_MODE } from '@/local/mode'
import { Sidebar } from '@/components/Sidebar'
import { Toolbar } from '@/components/Toolbar'
import { ShareModal } from '@/components/ShareModal'
import { PresenceBadges } from '@/components/PresenceBadges'
import { ZoomOverlay } from '@/components/ZoomOverlay'
import { Minimap } from '@/components/Minimap'
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
  const [shareOpen, setShareOpen] = useState(false)
  // 모바일에서 사이드바 drawer. 데스크탑에선 항상 보이므로 무시됨.
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const collab = useBoardCollab(boardId ?? null)
  const undoManager = useUndoManager(collab.doc)
  const clearSel = useSelection((s) => s.clear)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    ;(window as unknown as { __wbDebug?: unknown }).__wbDebug = {
      boardId,
      doc: collab.doc,
      syncEnabled: collab.syncEnabled,
      syncConnected: collab.syncConnected,
    }
  }, [boardId, collab.doc, collab.syncEnabled, collab.syncConnected])

  useEffect(() => {
    if (!boardId) return
    if (IS_LOCAL_MODE) localBoards.markOpened(boardId)
    getBoard(boardId)
      .then(setBoard)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load board'))
    return () => clearSel()
  }, [boardId, clearSel])

  async function onRename() {
    if (!board) return
    const next = window.prompt('Board title', board.title)
    if (!next || next === board.title) return
    const updated = await renameBoard(board.id, next)
    setBoard(updated)
  }

  return (
    <CanvasContextProvider
      value={{ doc: collab.doc, undoManager, awareness: collab.provider?.awareness ?? null }}
    >
      <div className="board-shell">
        <header className="board-topbar">
          <button
            className="menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open components menu"
            title="Components"
          >
            ☰
          </button>
          <Link to="/boards" className="back" title="Board list">←</Link>
          <button className="title-btn" onClick={onRename}>
            {board?.title ?? '…'}
          </button>
          <span className="vsep" />
          <Toolbar />
          <div className="spacer" />
          <PresenceBadges awareness={collab.provider?.awareness ?? null} />
          <button className="share-btn" onClick={() => setShareOpen(true)}>Share</button>
          <span className="status" data-online={collab.syncEnabled ? collab.syncConnected : collab.ready}>
            {collab.syncEnabled
              ? collab.syncConnected
                ? 'Syncing'
                : 'Connecting…'
              : collab.ready
                ? 'Local'
                : '…'}
          </span>
        </header>

        {shareOpen && boardId && (
          <ShareModal
            boardId={boardId}
            syncConnected={collab.syncConnected}
            onClose={() => setShareOpen(false)}
          />
        )}

        <div className="board-body">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="board-main">
            <div className="canvas-host">
              {error ? <p className="error">{error}</p> : <Canvas boardId={boardId ?? ''} doc={collab.doc} />}
              {!error && (
                <>
                  <Minimap />
                  <ZoomOverlay />
                </>
              )}
            </div>
          </main>
        </div>

        <style>{`
          .board-shell { display: flex; flex-direction: column; height: 100%; }
          .board-topbar { display: flex; align-items: center; gap: 8px;
                          padding: 4px 12px; border-bottom: 1px solid var(--color-border);
                          background: var(--color-panel); min-height: 38px;
                          flex-wrap: wrap; }
          .menu-btn { display: none; background: none; border: 1px solid var(--color-border);
                      border-radius: 4px; padding: 4px 8px; font-size: 16px; line-height: 1; }
          .back { font-size: 16px; color: var(--color-text); text-decoration: none; padding: 0 4px; }
          .back:hover { color: var(--color-accent); }
          .title-btn { background: none; border: none; font-size: 14px; font-weight: 600;
                       padding: 4px 6px; cursor: pointer; max-width: 200px;
                       white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .title-btn:hover { background: #f1f3f5; border-radius: 4px; }
          .vsep { width: 1px; height: 18px; background: var(--color-border); margin: 0 4px; }
          .spacer { flex: 1; }
          .share-btn { font-size: 12px; padding: 4px 12px;
                       background: var(--color-accent); color: white;
                       border-color: var(--color-accent); border-radius: 4px; }
          .share-btn:hover { background: var(--color-accent-hover); }
          .status { font-size: 11px; color: var(--color-muted); padding: 0 4px; }
          .status[data-online="true"] { color: #16a34a; }
          .board-body { flex: 1; display: grid; grid-template-columns: 220px 1fr; min-height: 0; }
          .board-main { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
          .canvas-host { flex: 1; position: relative; background: #fafbfc; min-height: 0; }
          .error { color: var(--color-danger); padding: 16px; }

          /* 모바일: 사이드바를 drawer 로 떼고, 햄버거 노출, 상단바 압축 */
          @media (max-width: 768px) {
            .board-topbar { padding: 6px 8px; gap: 6px; min-height: 44px; }
            .menu-btn { display: inline-flex; align-items: center; justify-content: center;
                        width: 32px; height: 32px; padding: 0; }
            .vsep { display: none; }
            .title-btn { font-size: 13px; max-width: 120px; }
            .share-btn { padding: 4px 8px; }
            .status { font-size: 10px; padding: 0 2px; }
            .board-body { grid-template-columns: 1fr; }
          }
        `}</style>
      </div>
    </CanvasContextProvider>
  )
}
