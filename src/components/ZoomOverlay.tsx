import { useViewportStore, MIN_SCALE, MAX_SCALE } from '@/store/viewport'

export function ZoomOverlay() {
  const scale = useViewportStore((s) => s.scale)
  const setScale = useViewportStore((s) => s.setScale)
  const reset = useViewportStore((s) => s.reset)

  const atMin = scale <= MIN_SCALE + 1e-6
  const atMax = scale >= MAX_SCALE - 1e-6

  return (
    <div className="zoom-overlay">
      <button title="줌 아웃" disabled={atMin} onClick={() => setScale(scale / 1.1)}>
        −
      </button>
      <button title="100% 로 리셋" onClick={reset} className="zoom-pct">
        {Math.round(scale * 100)}%
      </button>
      <button title="줌 인" disabled={atMax} onClick={() => setScale(scale * 1.1)}>
        +
      </button>

      <style>{`
        .zoom-overlay {
          position: absolute; right: 16px; bottom: 16px;
          display: inline-flex; align-items: center;
          background: white;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          padding: 2px;
          z-index: 5;
          user-select: none;
        }
        .zoom-overlay button {
          width: 28px; height: 28px;
          background: transparent; border: none; padding: 0;
          color: var(--color-text);
          font-size: 16px; line-height: 1;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: 4px; cursor: pointer;
        }
        .zoom-overlay button:hover:not(:disabled) { background: #f1f3f5; }
        .zoom-overlay button:disabled { opacity: 0.35; cursor: default; }
        .zoom-overlay .zoom-pct {
          width: auto; padding: 0 8px;
          font-size: 12px; color: var(--color-muted);
          min-width: 48px;
        }
        .zoom-overlay .zoom-pct:hover { color: var(--color-text); }
      `}</style>
    </div>
  )
}
