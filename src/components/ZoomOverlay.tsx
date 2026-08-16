import { useViewportStore, MIN_SCALE, MAX_SCALE } from '@/store/viewport'
import { MinusIcon, PlusIcon } from '@/components/icons'

export function ZoomOverlay() {
  const scale = useViewportStore((s) => s.scale)
  const setScale = useViewportStore((s) => s.setScale)
  const reset = useViewportStore((s) => s.reset)

  const atMin = scale <= MIN_SCALE + 1e-6
  const atMax = scale >= MAX_SCALE - 1e-6

  return (
    <div className="zoom-overlay">
      <button title="Zoom out" disabled={atMin} onClick={() => setScale(scale / 1.1)}>
        <MinusIcon />
      </button>
      <button title="Reset to 100%" onClick={reset} className="zoom-pct">
        {Math.round(scale * 100)}%
      </button>
      <button title="Zoom in" disabled={atMax} onClick={() => setScale(scale * 1.1)}>
        <PlusIcon />
      </button>

      <style>{`
        .zoom-overlay {
          position: absolute; left: 16px; bottom: 16px;
          display: inline-flex; align-items: center;
          background: var(--surface-raised);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-float);
          padding: 3px;
          z-index: 5;
          user-select: none;
        }
        .zoom-overlay button {
          width: 30px; height: 30px;
          background: transparent; border: none; padding: 0;
          color: var(--text-body);
          font-size: 16px; line-height: 1;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: var(--radius-sm); cursor: pointer;
          transition: background var(--dur-fast) var(--ease-out);
        }
        .zoom-overlay button:hover:not(:disabled) { background: var(--surface-hover); }
        .zoom-overlay button:active:not(:disabled) { transform: scale(0.92); }
        .zoom-overlay button:disabled { opacity: 0.35; cursor: default; }
        .zoom-overlay .zoom-pct {
          width: auto; padding: 0 8px;
          font: var(--font-mono-sm); color: var(--text-muted);
          min-width: 48px;
        }
        .zoom-overlay .zoom-pct:hover { color: var(--text-body); }

        /* 모바일 — 터치 영역 확대 + 위치 살짝 위로 (safe-area 고려) */
        @media (max-width: 768px) {
          .zoom-overlay {
            left: 12px;
            bottom: calc(12px + env(safe-area-inset-bottom, 0px));
          }
          .zoom-overlay button { width: 38px; height: 38px; font-size: 18px; }
          .zoom-overlay .zoom-pct { min-width: 52px; font-size: 13px; }
        }
      `}</style>
    </div>
  )
}
