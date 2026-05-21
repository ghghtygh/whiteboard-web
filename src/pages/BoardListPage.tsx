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
    const title = window.prompt('New board title', 'New board')
    if (!title) return
    const board = await createBoard(title)
    navigate(`/boards/${board.id}`)
  }

  async function onDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete this board?')) return
    await deleteBoard(id)
    await refresh()
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1>My Boards</h1>
        <div className="spacer" />
        <span className="muted">{user?.name ?? user?.email}</span>
        <button onClick={() => { logout(); navigate('/login') }}>Sign out</button>
        <button className="primary" onClick={onCreate}>New board</button>
      </header>

      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <ul className="grid">
          {boards.length === 0 && <li className="empty">No boards yet. Click “New board” to get started.</li>}
          {boards.map((b) => (
            <li key={b.id} className="card">
              <Link to={`/boards/${b.id}`} className="card-title">{b.title}</Link>
              <p className="muted">Updated {new Date(b.updatedAt).toLocaleString('en-US')}</p>
              <button className="danger" onClick={() => onDelete(b.id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}

      <style>{`
        .page { padding: 24px; max-width: 1080px; margin: 0 auto; }
        .topbar { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .topbar h1 { margin: 0; font-size: 20px; }
        .spacer { flex: 1; }
        .muted { color: var(--color-muted); font-size: 13px; }
        .error { color: var(--color-danger); }
        .grid { list-style: none; padding: 0; margin: 0; display: grid;
                grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
        .card { background: var(--color-panel); border: 1px solid var(--color-border);
                border-radius: var(--radius-md); padding: 16px;
                display: flex; flex-direction: column; gap: 8px; box-shadow: var(--shadow-sm); }
        .card-title { font-size: 16px; font-weight: 600; color: var(--color-text); }
        .empty { grid-column: 1 / -1; color: var(--color-muted); text-align: center; padding: 48px; }

        @media (max-width: 640px) {
          .page { padding: 16px; }
          .topbar { gap: 8px; margin-bottom: 16px; }
          .topbar h1 { font-size: 18px; flex: 1 1 100%; }
          .spacer { display: none; }
          .muted { flex: 1 1 100%; }
          .grid { grid-template-columns: 1fr; gap: 12px; }
        }
      `}</style>
    </div>
  )
}
