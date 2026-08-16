import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createBoard, deleteBoard, listBoards } from '@/api/boards'
import { useAuthStore } from '@/store/auth'
import { toast } from '@/store/toast'
import { COMPACT_BP } from '@/styles/breakpoints'
import type { Board } from '@/types/domain'

const DELETE_UNDO_MS = 4000

export function BoardListPage() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // 실행취소 대기 중인 삭제(아직 서버/로컬에 실제 반영 안 됨) 예약 타이머.
  const pendingDeletes = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  async function refresh() {
    setLoading(true)
    try {
      setBoards(await listBoards())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load boards')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    const pending = pendingDeletes.current
    return () => {
      // 페이지를 떠나면 대기 중인 삭제는 즉시 확정한다(예약을 무한정 들고 있지 않음).
      for (const timer of pending.values()) clearTimeout(timer)
      pending.clear()
    }
  }, [])

  async function onCreate() {
    // 제목 입력 팝업 없이 바로 만들고, 보드 안에서 제목을 눌러 바꾸게 한다.
    const board = await createBoard('New board')
    navigate(`/boards/${board.id}`)
  }

  function onDelete(id: string) {
    const target = boards.find((b) => b.id === id)
    if (!target) return

    // 낙관적으로 목록에서 제거 — 실제 삭제는 실행취소 유예 시간 뒤에 확정한다.
    setBoards((bs) => bs.filter((b) => b.id !== id))

    const timer = setTimeout(() => {
      pendingDeletes.current.delete(id)
      void deleteBoard(id).catch(() => {
        toast.show('Failed to delete the board.', { tone: 'danger' })
        void refresh()
      })
    }, DELETE_UNDO_MS)
    pendingDeletes.current.set(id, timer)

    toast.show(`Deleted "${target.title}"`, {
      action: {
        label: 'Undo',
        onClick: () => {
          const pending = pendingDeletes.current.get(id)
          if (pending) {
            clearTimeout(pending)
            pendingDeletes.current.delete(id)
          }
          setBoards((bs) => (bs.some((b) => b.id === id) ? bs : [target, ...bs]))
        },
      },
      duration: DELETE_UNDO_MS,
    })
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" />
          <h1>My boards</h1>
        </div>
        <div className="spacer" />
        <span className="who">{user?.name ?? user?.email}</span>
        <button onClick={() => { logout(); navigate('/login') }}>Log out</button>
        <button className="primary" onClick={onCreate}>New board</button>
      </header>

      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <ul className="grid">
          {boards.length === 0 && (
            <li className="empty">
              <strong>No boards yet</strong>
              <span>Click “New board” to create your first diagram.</span>
            </li>
          )}
          {boards.map((b) => (
            <li key={b.id} className="card">
              <Link to={`/boards/${b.id}`} className="card-thumb" aria-label={b.title}>
                <span className="thumb-node" />
                <span className="thumb-node alt" />
              </Link>
              <div className="card-body">
                <Link to={`/boards/${b.id}`} className="card-title">{b.title}</Link>
                <p className="muted">Updated {new Date(b.updatedAt).toLocaleDateString('en-US')}</p>
              </div>
              <button className="card-del" title="Delete board" onClick={() => onDelete(b.id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}

      <style>{`
        .page { padding: 32px 24px; max-width: var(--container-max); margin: 0 auto; }
        .topbar { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; flex-wrap: wrap; }
        .topbar .brand { display: flex; align-items: center; gap: 10px; }
        .topbar .brand-dot { width: 14px; height: 14px; border-radius: 4px;
                             background: var(--primary); box-shadow: 0 0 0 4px var(--primary-soft); }
        .topbar h1 { margin: 0; font: var(--font-h1); letter-spacing: var(--tracking-tight); }
        .spacer { flex: 1; }
        .who { color: var(--text-muted); font-size: var(--text-sm); }
        .muted { color: var(--text-muted); font-size: var(--text-sm); }
        .error { color: var(--danger); }
        .grid { list-style: none; padding: 0; margin: 0; display: grid;
                grid-template-columns: repeat(auto-fill, minmax(248px, 1fr)); gap: 20px; }

        .card { position: relative; background: var(--surface-panel);
                border: 1px solid var(--border-subtle); border-radius: var(--radius-lg);
                overflow: hidden; box-shadow: var(--shadow-sm);
                transition: transform var(--dur-base) var(--ease-out),
                            box-shadow var(--dur-base) var(--ease-out),
                            border-color var(--dur-base) var(--ease-out); }
        .card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md);
                      border-color: var(--border-strong); }

        /* 미니 캔버스 썸네일 — 도트 그리드 + 노드 칩 */
        .card-thumb { display: block; height: 112px; position: relative;
                      background:
                        radial-gradient(circle, var(--canvas-grid) 1.2px, transparent 1.2px) 0 0 / 22px 22px,
                        var(--surface-canvas);
                      border-bottom: 1px solid var(--divider); }
        .thumb-node { position: absolute; width: 34px; height: 34px; border-radius: 9px;
                      background: var(--surface-panel); border: 1px solid var(--node-border);
                      box-shadow: var(--shadow-xs); left: 28%; top: 30%; }
        .thumb-node.alt { left: 56%; top: 48%; }
        .thumb-node.alt::before { content: ''; position: absolute; left: -26px; top: 50%;
                      width: 26px; height: 2px; background: var(--edge-stroke); opacity: 0.5; }

        .card-body { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 4px; }
        .card-title { font: var(--font-body-strong); font-size: var(--text-md);
                      color: var(--text-strong); }
        .card-title:hover { text-decoration: none; color: var(--primary); }
        .card-del { position: absolute; top: 10px; right: 10px;
                    font-size: var(--text-xs); padding: 4px 9px;
                    background: var(--surface-panel); border: 1px solid var(--border-subtle);
                    color: var(--text-muted); opacity: 0; border-radius: var(--radius-sm);
                    transition: opacity var(--dur-fast) var(--ease-out); }
        .card:hover .card-del { opacity: 1; }
        .card-del:hover { color: var(--danger); border-color: var(--danger-soft);
                          background: var(--danger-soft); }

        .empty { grid-column: 1 / -1; text-align: center; padding: 64px 24px;
                 display: flex; flex-direction: column; gap: 6px;
                 color: var(--text-muted); }
        .empty strong { font: var(--font-h3); color: var(--text-strong); }

        @media (max-width: ${COMPACT_BP}px) {
          .page { padding: 16px; }
          .topbar { gap: 8px; margin-bottom: 16px; }
          .topbar h1 { font-size: var(--text-xl); }
          .spacer { flex: 1 1 100%; order: 5; height: 0; }
          .grid { grid-template-columns: 1fr; gap: 14px; }
          .card-del { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
