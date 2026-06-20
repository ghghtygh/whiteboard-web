import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createBoard, deleteBoard, listBoards } from '@/api/boards'
import { useAuthStore } from '@/store/auth'
import type { Board } from '@/types/domain'

export function BoardListPage() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
  }, [])

  async function onCreate() {
    const title = window.prompt('새 보드 제목', '새 보드')
    if (!title) return
    const board = await createBoard(title)
    navigate(`/boards/${board.id}`)
  }

  async function onDelete(id: string) {
    if (!window.confirm('이 보드를 삭제하시겠어요?')) return
    await deleteBoard(id)
    await refresh()
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" />
          <h1>내 보드</h1>
        </div>
        <div className="spacer" />
        <span className="who">{user?.name ?? user?.email}</span>
        <button onClick={() => { logout(); navigate('/login') }}>로그아웃</button>
        <button className="primary" onClick={onCreate}>새 보드</button>
      </header>

      {loading && <p className="muted">불러오는 중…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <ul className="grid">
          {boards.length === 0 && (
            <li className="empty">
              <strong>보드가 없습니다</strong>
              <span>“새 보드”를 눌러 첫 다이어그램을 만들어 보세요.</span>
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
                <p className="muted">{new Date(b.updatedAt).toLocaleDateString('ko-KR')} 업데이트</p>
              </div>
              <button className="card-del" title="삭제" onClick={() => onDelete(b.id)}>삭제</button>
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

        @media (max-width: 640px) {
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
