import { useEffect } from 'react'
import { useToastStore } from '@/store/toast'
import { CloseIcon } from '@/components/icons'

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="toast-host">
      {toasts.map((t) => (
        <ToastItem key={t.id} id={t.id} message={t.message} tone={t.tone} action={t.action} duration={t.duration} onDismiss={dismiss} />
      ))}

      <style>{`
        .toast-host {
          position: fixed; left: 0; right: 0; bottom: 20px;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          z-index: 300; pointer-events: none;
          padding: 0 16px calc(env(safe-area-inset-bottom, 0px));
        }
      `}</style>
    </div>
  )
}

interface ToastItemProps {
  id: string
  message: string
  tone: 'default' | 'success' | 'danger'
  action?: { label: string; onClick: () => void }
  duration: number
  onDismiss: (id: string) => void
}

function ToastItem({ id, message, tone, action, duration, onDismiss }: ToastItemProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(id), duration)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <div className="toast" data-tone={tone} role="status">
      <span className="toast-msg">{message}</span>
      {action && (
        <button
          type="button"
          className="toast-action"
          onClick={() => {
            action.onClick()
            onDismiss(id)
          }}
        >
          {action.label}
        </button>
      )}
      <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => onDismiss(id)}>
        <CloseIcon />
      </button>

      <style>{`
        .toast {
          pointer-events: auto;
          display: inline-flex; align-items: center; gap: 10px;
          max-width: min(420px, calc(100vw - 32px));
          background: var(--slate-900); color: var(--slate-50);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          padding: 11px 12px 11px 16px;
          font: var(--font-body-strong); font-size: var(--text-sm);
          animation: toast-in var(--dur-slow) var(--ease-spring);
        }
        .toast[data-tone="success"] { background: var(--green-600); }
        .toast[data-tone="danger"] { background: var(--red-600); }
        .toast-msg { flex: 1; min-width: 0; word-break: keep-all; }
        .toast-action {
          flex: none; background: transparent; border: none; color: var(--indigo-300);
          font: var(--font-body-strong); font-size: var(--text-sm); padding: 4px 6px;
          border-radius: var(--radius-sm);
        }
        .toast[data-tone="success"] .toast-action,
        .toast[data-tone="danger"] .toast-action { color: #fff; text-decoration: underline; text-underline-offset: 2px; }
        .toast-action:hover { background: rgba(255,255,255,0.1); }
        .toast-close {
          flex: none; width: 22px; height: 22px; padding: 0;
          display: inline-flex; align-items: center; justify-content: center;
          background: transparent; border: none; color: var(--slate-400); font-size: 14px;
          border-radius: var(--radius-sm);
        }
        .toast-close:hover { background: rgba(255,255,255,0.1); color: var(--slate-50); }

        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
