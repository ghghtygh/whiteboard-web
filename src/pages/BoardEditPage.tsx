import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getBoard, renameBoard } from '@/api/boards'
import { localBoards } from '@/local/boardsStore'
import { isBackendActive } from '@/store/auth'
import { ensureCollabSession } from '@/collab/session'
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
import { SYNC_AVAILABLE, useSyncStore } from '@/store/sync'
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
  const syncOn = useSyncStore((s) => s.enabled)
  const toggleSync = useSyncStore((s) => s.toggle)

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
    if (!isBackendActive()) localBoards.markOpened(boardId)
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
          <Link to="/boards" className="back" title="보드 목록">←</Link>
          <button className="title-btn" onClick={onRename}>
            {board?.title ?? '…'}
          </button>
          <span className="vsep" />
          <Toolbar />
          <div className="spacer" />
          <PresenceBadges awareness={collab.provider?.awareness ?? null} />
          <button
            className="share-btn primary"
            onClick={async () => {
              // 공유 시 협업 세션 보장(비회원이면 게스트 토큰 발급 + 동기화 ON).
              // 실패해도 모달은 열어 로컬 안내를 보여준다.
              try {
                await ensureCollabSession()
              } catch {
                /* 게스트 토큰 발급 실패 — 모달은 그대로 연다 */
              }
              setShareOpen(true)
            }}
          >
            공유
          </button>
          {SYNC_AVAILABLE ? (
            <button
              type="button"
              className="status status-btn"
              data-online={syncOn && collab.syncConnected}
              data-on={syncOn}
              title={syncOn ? '실시간 동기화 켜짐 — 눌러서 끄기' : '실시간 동기화 꺼짐 — 눌러서 켜기'}
              onClick={toggleSync}
            >
              <span className="dot" />
              {syncOn ? (collab.syncConnected ? '동기화 중' : '연결 중…') : '동기화 꺼짐'}
            </button>
          ) : (
            <span className="status" data-online={collab.ready} title="동기화 서버가 설정되지 않아 로컬에만 저장됩니다">
              <span className="dot" />
              {collab.ready ? '로컬' : '…'}
            </span>
          )}
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
                          padding: 0 14px; border-bottom: 1px solid var(--border-subtle);
                          background: var(--surface-panel); min-height: var(--topbar-h);
                          flex-wrap: wrap; }
          .menu-btn { display: none; background: var(--surface-panel);
                      border: 1px solid var(--border-subtle);
                      border-radius: var(--radius-sm); padding: 4px 8px; font-size: 16px; line-height: 1; }
          .back { font-size: 17px; color: var(--text-muted); text-decoration: none; padding: 2px 6px;
                  border-radius: var(--radius-sm); }
          .back:hover { color: var(--primary); background: var(--surface-hover); text-decoration: none; }
          .title-btn { background: none; border: none; font: var(--font-body-strong);
                       padding: 5px 8px; cursor: pointer; max-width: 220px;
                       white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .title-btn:hover { background: var(--surface-hover); border-radius: var(--radius-sm); }
          .vsep { width: 1px; height: 18px; background: var(--border-subtle); margin: 0 4px; }
          .spacer { flex: 1; }
          .share-btn { font-size: var(--text-sm); padding: 6px 14px; border-radius: var(--radius-md); }
          .status { display: inline-flex; align-items: center; gap: 6px;
                    font: var(--font-mono-sm); color: var(--text-muted); padding: 4px 8px;
                    text-transform: none; }
          .status .dot { width: 7px; height: 7px; border-radius: 50%;
                         background: var(--text-faint); flex: none;
                         transition: background var(--dur-fast) var(--ease-out); }
          /* 토글 버튼 버전 — 버튼 기본 테두리/배경 제거 */
          .status-btn { background: transparent; border: 1px solid transparent;
                        border-radius: var(--radius-md); cursor: pointer; }
          .status-btn:hover { background: var(--surface-hover); border-color: var(--border-subtle); }
          /* 동기화 ON 이지만 아직 연결 안 됨 (연결 중…) → 앰버 */
          .status[data-on="true"] { color: var(--warning); }
          .status[data-on="true"] .dot { background: var(--warning); }
          /* 연결 완료 → 그린 펄스 */
          .status[data-online="true"] { color: var(--success); }
          .status[data-online="true"] .dot { background: var(--success);
                         box-shadow: 0 0 0 3px var(--success-soft);
                         animation: status-pulse 1.8s var(--ease-in-out) infinite; }
          @keyframes status-pulse { 50% { opacity: 0.45; } }
          .board-body { flex: 1; display: grid;
                        grid-template-columns: var(--sidebar-w) 1fr; min-height: 0; }
          .board-main { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
          .canvas-host { flex: 1; position: relative; min-height: 0;
                         background: var(--surface-canvas); }
          .error { color: var(--danger); padding: 16px; }

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
