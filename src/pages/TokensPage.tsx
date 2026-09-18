import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { createToken, listTokens, revokeToken } from '@/api/tokens'
import { toast } from '@/store/toast'
import { IS_LOCAL_MODE } from '@/local/mode'
import { COMPACT_BP } from '@/styles/breakpoints'
import type { IssuedPersonalAccessToken, PersonalAccessToken } from '@/types/domain'

export function TokensPage() {
  const [tokens, setTokens] = useState<PersonalAccessToken[]>([])
  const [loading, setLoading] = useState(!IS_LOCAL_MODE)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [issued, setIssued] = useState<IssuedPersonalAccessToken | null>(null)
  const [copied, setCopied] = useState(false)
  // 되돌릴 수 없는 작업이라 네이티브 confirm() 대신 "한 번 더 누르면 확정" 방식으로 무장한다.
  const [armedRevoke, setArmedRevoke] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    try {
      setTokens(await listTokens())
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Failed to load tokens.', { tone: 'danger' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!IS_LOCAL_MODE) void refresh()
  }, [])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || creating) return
    setCreating(true)
    try {
      const token = await createToken(name.trim())
      setIssued(token)
      setName('')
      await refresh()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Failed to create the token.', { tone: 'danger' })
    } finally {
      setCreating(false)
    }
  }

  async function onCopy(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard 사용 불가 — 조용히 무시(사용자가 직접 선택해 복사할 수 있음).
    }
  }

  async function onRevoke(id: string) {
    if (armedRevoke !== id) {
      setArmedRevoke(id)
      setTimeout(() => setArmedRevoke((cur) => (cur === id ? null : cur)), 3000)
      return
    }
    setArmedRevoke(null)
    setTokens((ts) => ts.filter((t) => t.id !== id))
    try {
      await revokeToken(id)
      toast.show('Token revoked.')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Failed to revoke the token.', { tone: 'danger' })
      void refresh()
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <Link to="/boards" className="back">← My boards</Link>
        <h1>API tokens</h1>
      </header>

      <p className="intro">
        Personal access tokens let external tools — like an MCP server — call the whiteboard API on
        your behalf. Anyone with a token can read and edit your boards, so keep it as secret as a
        password.
      </p>

      {IS_LOCAL_MODE ? (
        <p className="muted">API tokens are only available when connected to the backend (remote mode).</p>
      ) : (
        <>
          <form className="create" onSubmit={onCreate}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Token name (e.g. MCP on my laptop)"
              maxLength={80}
            />
            <button className="primary" type="submit" disabled={!name.trim() || creating}>
              {creating ? 'Creating…' : 'Create token'}
            </button>
          </form>

          {issued && (
            <div className="issued">
              <p>
                <strong>{issued.name}</strong> was created. Copy it now — it won’t be shown again.
              </p>
              <div className="issued-value">
                <code>{issued.token}</code>
                <button type="button" onClick={() => onCopy(issued.token)}>
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <button type="button" className="dismiss" onClick={() => setIssued(null)}>Done</button>
            </div>
          )}

          {loading && <p className="muted">Loading…</p>}

          {!loading && (
            <ul className="list">
              {tokens.length === 0 && <li className="empty">No tokens yet.</li>}
              {tokens.map((t) => (
                <li key={t.id} className="row">
                  <div className="row-main">
                    <strong>{t.name}</strong>
                    <span className="muted">
                      Created {new Date(t.createdAt).toLocaleDateString('en-US')} · Expires{' '}
                      {new Date(t.expiresAt).toLocaleDateString('en-US')}
                      {t.lastUsedAt && ` · Last used ${new Date(t.lastUsedAt).toLocaleDateString('en-US')}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={armedRevoke === t.id ? 'danger armed' : 'danger'}
                    onClick={() => onRevoke(t.id)}
                  >
                    {armedRevoke === t.id ? 'Confirm revoke' : 'Revoke'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <style>{`
        .page { padding: 32px 24px; max-width: 640px; margin: 0 auto; }
        .topbar { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
        .back { color: var(--text-muted); font-size: var(--text-sm); }
        .topbar h1 { margin: 0; font: var(--font-h1); letter-spacing: var(--tracking-tight); }
        .intro { color: var(--text-muted); font-size: var(--text-sm); line-height: 1.5; margin: 0 0 24px; }
        .muted { color: var(--text-muted); font-size: var(--text-sm); }

        .create { display: flex; gap: 8px; margin-bottom: 16px; }
        .create input { flex: 1; padding: 8px 12px; border: 1px solid var(--border-subtle);
                         border-radius: var(--radius-sm); font-size: var(--text-sm); }

        .issued { background: var(--surface-panel); border: 1px solid var(--border-subtle);
                  border-radius: var(--radius-lg); padding: 14px 16px; margin-bottom: 20px; }
        .issued p { margin: 0 0 10px; font-size: var(--text-sm); }
        .issued-value { display: flex; align-items: center; gap: 8px; }
        .issued-value code { flex: 1; overflow-wrap: anywhere; background: var(--surface-canvas);
                              border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);
                              padding: 6px 8px; font-size: var(--text-xs); }
        .issued .dismiss { margin-top: 10px; }

        .list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
        .row { display: flex; align-items: center; justify-content: space-between; gap: 12px;
               background: var(--surface-panel); border: 1px solid var(--border-subtle);
               border-radius: var(--radius-lg); padding: 12px 14px; }
        .row-main { display: flex; flex-direction: column; gap: 2px; }
        .empty { color: var(--text-muted); font-size: var(--text-sm); padding: 16px 0; }

        .danger { color: var(--text-muted); }
        .danger.armed { color: var(--danger); border-color: var(--danger-soft); background: var(--danger-soft); }

        @media (max-width: ${COMPACT_BP}px) {
          .page { padding: 16px; }
          .create { flex-direction: column; }
        }
      `}</style>
    </div>
  )
}
