import { useParams, Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { getBoard, renameBoard } from '@/api/boards'
import { localBoards } from '@/local/boardsStore'
import { isBackendActive, useAuthStore } from '@/store/auth'
import { IS_LOCAL_MODE } from '@/local/mode'
import { ensureCollabSession } from '@/collab/session'
import { Sidebar } from '@/components/Sidebar'
import { Toolbar } from '@/components/Toolbar'
import { ShareModal } from '@/components/ShareModal'
import { PresenceBadges } from '@/components/PresenceBadges'
import { ZoomOverlay } from '@/components/ZoomOverlay'
import { Minimap } from '@/components/Minimap'
import { MenuIcon, ArrowLeftIcon } from '@/components/icons'
import { MOBILE_BP } from '@/styles/breakpoints'
import { Canvas } from '@/canvas/Canvas'
import { useBoardCollab } from '@/collab/useBoardCollab'
import { useStableConnected } from '@/collab/useStableConnected'
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
  // 짧은 재연결 깜빡임을 막기 위해 안정화한 연결 상태.
  const syncConnected = useStableConnected(collab.syncConnected)
  const undoManager = useUndoManager(collab.doc)
  const clearSel = useSelection((s) => s.clear)
  const syncOn = useSyncStore((s) => s.enabled)
  const toggleSync = useSyncStore((s) => s.toggle)
  // 비회원(게스트)은 공유할 수 없다 — 원격 모드에서만 막는다(로컬 모드는 회원 개념이 없음).
  const isGuest = useAuthStore((s) => s.isGuest)
  const shareDisabled = !IS_LOCAL_MODE && isGuest

  // 제목 인라인 편집 — window.prompt 대신 클릭 시 그 자리에서 입력 필드로 전환.
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  function startEditTitle() {
    if (!board) return
    setTitleDraft(board.title)
    setEditingTitle(true)
  }

  async function commitTitle() {
    setEditingTitle(false)
    const next = titleDraft.trim()
    if (!board || !next || next === board.title) return
    const updated = await renameBoard(board.id, next)
    setBoard(updated)
  }

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

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.select()
  }, [editingTitle])

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
            <MenuIcon />
          </button>
          <Link to="/boards" className="back" aria-label="Back to board list" title="Board list">
            <ArrowLeftIcon />
          </Link>
          {editingTitle ? (
            <input
              ref={titleInputRef}
              className="title-input"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') setEditingTitle(false)
              }}
            />
          ) : (
            <button className="title-btn" onClick={startEditTitle} title="Rename board">
              {board?.title ?? '…'}
            </button>
          )}
          <span className="vsep" />
          <Toolbar />
          <div className="spacer" />
          <PresenceBadges awareness={collab.provider?.awareness ?? null} />
          <button
            className="share-btn primary"
            disabled={shareDisabled}
            title={shareDisabled ? 'Sign in to share' : undefined}
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
              data-online={syncOn && syncConnected}
              data-on={syncOn}
              title={syncOn ? 'Real-time sync on — click to turn off' : 'Real-time sync off — click to turn on'}
              onClick={toggleSync}
            >
              <span className="dot" />
              {syncOn ? (syncConnected ? '동기화 중' : '연결 중…') : '동기화 꺼짐'}
            </button>
          ) : (
            <span className="status" data-online={collab.ready} title="No sync server configured — saved locally only">
              <span className="dot" />
              {collab.ready ? '로컬' : '…'}
            </span>
          )}
        </header>

        {shareOpen && boardId && (
          <ShareModal
            boardId={boardId}
            syncConnected={syncConnected}
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
          .back { display: inline-flex; align-items: center; justify-content: center;
                  font-size: 17px; color: var(--text-muted); text-decoration: none; padding: 4px 6px;
                  border-radius: var(--radius-sm); }
          .back:hover { color: var(--primary); background: var(--surface-hover); text-decoration: none; }
          .title-btn { background: none; border: none; font: var(--font-body-strong);
                       padding: 5px 8px; cursor: pointer; max-width: 220px;
                       white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .title-btn:hover { background: var(--surface-hover); border-radius: var(--radius-sm); }
          .title-input { font: var(--font-body-strong); padding: 5px 8px; max-width: 220px;
                          border: 1px solid var(--border-focus); border-radius: var(--radius-sm);
                          background: var(--surface-panel); box-shadow: var(--focus-ring); }
          .vsep { width: 1px; height: 18px; background: var(--border-subtle); margin: 0 4px; }
          .spacer { flex: 1; }
          .share-btn { font-size: var(--text-sm); padding: 6px 14px; border-radius: var(--radius-md); }
          .share-btn:disabled { opacity: 0.45; cursor: not-allowed; filter: grayscale(0.3); }
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
          @media (max-width: ${MOBILE_BP}px) {
            .board-topbar { padding: 6px 8px; gap: 6px; min-height: 44px; }
            .menu-btn { display: inline-flex; align-items: center; justify-content: center;
                        width: 32px; height: 32px; padding: 0; }
            .vsep { display: none; }
            .title-btn { font-size: 13px; max-width: 120px; }
            .share-btn { padding: 4px 8px; }
            /* 10px 미만은 판독성이 떨어져 DS 최소 크기(--text-2xs)를 유지하고
               대신 패딩/줄바꿈으로 압축한다. */
            .status { font-size: var(--text-2xs); padding: 4px; white-space: nowrap; }
            .board-body { grid-template-columns: 1fr; }
          }
        `}</style>
      </div>
    </CanvasContextProvider>
  )
}
