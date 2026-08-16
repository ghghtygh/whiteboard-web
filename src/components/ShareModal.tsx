import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { localInvites, type PendingInvite } from '@/local/invitesStore'
import { SYNC_AVAILABLE, useSyncStore } from '@/store/sync'
import { CloseIcon } from '@/components/icons'
import type { MemberRole } from '@/types/domain'

interface Props {
  boardId: string
  syncConnected: boolean
  onClose: () => void
}

export function ShareModal({ boardId, syncConnected, onClose }: Props) {
  const syncOn = useSyncStore((s) => s.enabled)
  // 실제로 동기화가 동작하는 상태 = 릴레이 URL 있음 + 사용자가 켬
  const syncEnabled = SYNC_AVAILABLE && syncOn
  const shareUrl = useMemo(() => `${window.location.origin}/boards/${boardId}`, [boardId])
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('editor')
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    setInvites(localInvites.listFor(boardId))
  }, [boardId])

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard 사용 불가 환경 — input select 폴백
      const input = document.getElementById('share-url') as HTMLInputElement | null
      input?.select()
    }
  }

  function onInvite(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    const next = localInvites.add(boardId, email, role)
    setInvites([next, ...invites])
    setEmail('')
    setFeedback(
      syncEnabled
        ? '초대를 저장했습니다. (백엔드가 준비되면 이메일이 발송됩니다.)'
        : '초대를 저장했습니다. (실시간 동기화가 꺼져 있어 아직 함께 편집할 수 없습니다.)',
    )
    setTimeout(() => setFeedback(null), 3000)
  }

  function onRevoke(id: string) {
    localInvites.remove(id)
    setInvites(invites.filter((i) => i.id !== id))
  }

  // Esc 로 닫기
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="share-backdrop" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-head">
          <h2>보드 공유</h2>
          <button className="x" onClick={onClose} aria-label="Close" title="Close">
            <CloseIcon />
          </button>
        </div>

        <section>
          <label className="lbl">공유 링크</label>
          <div className="row">
            <input id="share-url" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
            <button className="primary" onClick={copy}>{copied ? '복사됨' : '링크 복사'}</button>
          </div>
          <p className="hint" data-tone={syncEnabled ? (syncConnected ? 'ok' : 'warn') : 'info'}>
            {syncEnabled
              ? syncConnected
                ? '실시간 동기화 활성화 — 링크가 있는 누구나 함께 편집할 수 있습니다.'
                : '동기화 서버에 연결 중…'
              : SYNC_AVAILABLE
                ? '실시간 동기화가 꺼져 있습니다. 상단의 상태 표시를 눌러 켜면 링크를 공유한 사용자와 함께 편집할 수 있습니다.'
                : '현재 이 보드는 실시간 공동 편집을 지원하지 않습니다. 링크를 공유해도 각자 로컬에 따로 저장됩니다.'}
          </p>
        </section>

        <section>
          <label className="lbl">이메일로 초대</label>
          <form className="row" onSubmit={onInvite}>
            <input
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <select value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
              <option value="viewer">뷰어</option>
              <option value="editor">편집자</option>
              <option value="owner">소유자</option>
            </select>
            <button className="primary" type="submit">초대</button>
          </form>
          {feedback && <p className="feedback">{feedback}</p>}
        </section>

        {invites.length > 0 && (
          <section>
            <label className="lbl">대기 중인 초대 ({invites.length})</label>
            <ul className="invites">
              {invites.map((inv) => (
                <li key={inv.id}>
                  <span className="em">{inv.email}</span>
                  <span className="role">{inv.role}</span>
                  <button className="link" onClick={() => onRevoke(inv.id)}>취소</button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <style>{`
          .share-backdrop {
            position: fixed; inset: 0; background: var(--surface-overlay);
            backdrop-filter: blur(2px);
            display: grid; place-items: center; z-index: 100;
            padding: 16px;
          }
          .share-modal {
            background: var(--surface-panel); border-radius: var(--radius-xl);
            box-shadow: var(--shadow-xl);
            padding: 24px; min-width: 460px; max-width: 540px; width: 100%;
            display: flex; flex-direction: column; gap: 20px;
            max-height: calc(100vh - 32px); overflow-y: auto;
          }
          .share-head { display: flex; align-items: center; }
          .share-head h2 { margin: 0; font: var(--font-h2); }
          .share-head .x { margin-left: auto; background: none; border: none;
                           display: inline-flex; align-items: center; justify-content: center;
                           font-size: 20px; cursor: pointer; color: var(--text-muted); padding: 4px 6px;
                           border-radius: var(--radius-sm); }
          .share-head .x:hover { background: var(--surface-hover); color: var(--text-body); }
          .lbl { display: block; font: var(--weight-semibold) var(--text-2xs)/1 var(--font-sans);
                 color: var(--text-muted); margin-bottom: 7px;
                 text-transform: uppercase; letter-spacing: var(--tracking-caps); }
          .row { display: flex; gap: 8px; align-items: center; }
          .row input { flex: 1; min-width: 0; }
          .hint { font-size: var(--text-xs); margin: 8px 0 0; line-height: var(--leading-normal); }
          .hint[data-tone="ok"]   { color: var(--success); }
          .hint[data-tone="warn"] { color: var(--warning); }
          .hint[data-tone="info"] { color: var(--text-muted); }
          .feedback { font-size: var(--text-xs); color: var(--text-muted); margin: 8px 0 0; }
          .invites { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
          .invites li { display: flex; align-items: center; gap: 12px; font-size: var(--text-sm);
                        padding: 8px 10px; background: var(--surface-sunken);
                        border: 1px solid var(--border-subtle); border-radius: var(--radius-md); }
          .invites .em { flex: 1; }
          .invites .role { font: var(--font-mono-sm); color: var(--accent-text); }
          .invites .link { background: none; border: none; color: var(--danger); cursor: pointer; padding: 0; font-size: var(--text-xs); }

          @media (max-width: 640px) {
            .share-backdrop { padding: 0; align-items: stretch; }
            .share-modal {
              min-width: 0; max-width: none; width: 100%;
              border-radius: 0; max-height: 100vh; height: 100%;
              padding: 16px;
            }
            .row { flex-wrap: wrap; }
            .row input, .row select { flex: 1 1 100%; }
          }
        `}</style>
      </div>
    </div>
  )
}
