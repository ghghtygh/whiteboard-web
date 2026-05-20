import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { localInvites, type PendingInvite } from '@/local/invitesStore'
import { SYNC_ENABLED } from '@/local/mode'
import type { MemberRole } from '@/types/domain'

interface Props {
  boardId: string
  syncConnected: boolean
  onClose: () => void
}

export function ShareModal({ boardId, syncConnected, onClose }: Props) {
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
      SYNC_ENABLED
        ? '초대 저장 완료. (백엔드 도착 시 이메일 발송)'
        : '초대 저장 완료. (실시간 동기화는 아직 비활성 — VITE_SYNC_WS_URL 설정 필요)',
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
          <button className="x" onClick={onClose} aria-label="닫기">×</button>
        </div>

        <section>
          <label className="lbl">공유 링크</label>
          <div className="row">
            <input id="share-url" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
            <button className="primary" onClick={copy}>{copied ? '복사됨' : '복사'}</button>
          </div>
          <p className="hint" data-tone={SYNC_ENABLED ? (syncConnected ? 'ok' : 'warn') : 'info'}>
            {SYNC_ENABLED
              ? syncConnected
                ? '실시간 동기화 활성 — 이 링크를 받은 사용자와 동시 편집됩니다.'
                : '동기화 서버에 연결 중…'
              : '현재 로컬 전용 모드입니다. 환경변수 VITE_SYNC_WS_URL 을 설정하면 같은 링크를 가진 사용자끼리 실시간 동시 편집이 동작합니다.'}
          </p>
        </section>

        <section>
          <label className="lbl">이메일 초대</label>
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
            position: fixed; inset: 0; background: rgba(0,0,0,0.35);
            display: grid; place-items: center; z-index: 100;
            padding: 16px;
          }
          .share-modal {
            background: white; border-radius: 8px; box-shadow: var(--shadow-md);
            padding: 20px 24px; min-width: 460px; max-width: 540px; width: 100%;
            display: flex; flex-direction: column; gap: 20px;
            max-height: calc(100vh - 32px); overflow-y: auto;
          }
          .share-head { display: flex; align-items: center; }
          .share-head h2 { margin: 0; font-size: 16px; }
          .share-head .x { margin-left: auto; background: none; border: none;
                           font-size: 22px; cursor: pointer; color: var(--color-muted); padding: 0 6px; }
          .lbl { display: block; font-size: 12px; font-weight: 600;
                 color: var(--color-muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
          .row { display: flex; gap: 8px; align-items: center; }
          .row input { flex: 1; min-width: 0; }
          .row select { padding: 6px 8px; border: 1px solid var(--color-border); border-radius: 4px; }
          .hint { font-size: 12px; margin: 8px 0 0; line-height: 1.5; }
          .hint[data-tone="ok"]   { color: #16a34a; }
          .hint[data-tone="warn"] { color: #ca8a04; }
          .hint[data-tone="info"] { color: var(--color-muted); }
          .feedback { font-size: 12px; color: var(--color-muted); margin: 8px 0 0; }
          .invites { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
          .invites li { display: flex; align-items: center; gap: 12px; font-size: 13px;
                        padding: 6px 8px; background: #fafbfc; border-radius: 4px; }
          .invites .em { flex: 1; }
          .invites .role { font-size: 11px; color: var(--color-muted); }
          .invites .link { background: none; border: none; color: var(--color-danger); cursor: pointer; padding: 0; font-size: 12px; }

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
