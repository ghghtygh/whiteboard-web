import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useOnboardingStore } from '@/onboarding/store'
import { TOUR_STEPS, type Placement, type TourStep } from '@/onboarding/steps'
import { CloseIcon } from '@/components/icons'
import { MOD_KEY, useT } from '@/i18n'
import { Rich } from '@/i18n/Rich'

// 기능 소개 온보딩 투어 — 대상 요소를 스포트라이트로 하이라이트하고, 옆에 설명 툴팁을 순서대로 띄운다.
// 대상은 DOM 의 data-tour="..." 속성으로 찾는다(컴포넌트 간 ref 전달 없이 느슨하게 연결).

const SPOT_PAD = 6 // 하이라이트가 대상보다 살짝 크게
const GAP = 12 // 하이라이트와 툴팁 사이 간격
const MARGIN = 12 // 툴팁이 화면 가장자리에 붙지 않게

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

function findTarget(step: TourStep): HTMLElement | null {
  if (!step.target) return null
  return document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
}

// 화면에 실제로 보이는 대상인지 — 숨겨진 요소(모바일의 미니맵, 닫힌 drawer 등)는 해당 스텝을 건너뛴다.
function isVisible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect()
  if (r.width === 0 || r.height === 0) return false
  if (r.right <= 0 || r.bottom <= 0 || r.left >= window.innerWidth || r.top >= window.innerHeight) return false
  return getComputedStyle(el).visibility !== 'hidden'
}

function measure(el: HTMLElement | null): Rect | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  // 화면 밖으로 삐져나간 큰 대상(캔버스 등)은 뷰포트 안으로 잘라 하이라이트한다.
  const left = Math.max(r.left - SPOT_PAD, 0)
  const top = Math.max(r.top - SPOT_PAD, 0)
  const right = Math.min(r.right + SPOT_PAD, window.innerWidth)
  const bottom = Math.min(r.bottom + SPOT_PAD, window.innerHeight)
  return { left, top, width: right - left, height: bottom - top }
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(v, max))
}

// 선호 위치에 공간이 없으면 반대편 → 나머지 순으로 시도한다.
function placeTooltip(spot: Rect | null, placement: Placement, tipW: number, tipH: number) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const center = { left: (vw - tipW) / 2, top: (vh - tipH) / 2 }
  if (!spot) return center

  if (placement === 'inside') {
    return {
      left: clamp(spot.left + (spot.width - tipW) / 2, MARGIN, vw - tipW - MARGIN),
      top: clamp(spot.top + (spot.height - tipH) / 2, MARGIN, vh - tipH - MARGIN),
    }
  }

  const fits: Record<Exclude<Placement, 'inside'>, boolean> = {
    bottom: spot.top + spot.height + GAP + tipH <= vh - MARGIN,
    top: spot.top - GAP - tipH >= MARGIN,
    right: spot.left + spot.width + GAP + tipW <= vw - MARGIN,
    left: spot.left - GAP - tipW >= MARGIN,
  }
  const opposite = { bottom: 'top', top: 'bottom', left: 'right', right: 'left' } as const
  const order = [placement, opposite[placement], 'bottom', 'top', 'right', 'left'] as const
  const side = order.find((p) => fits[p])
  if (!side) return center

  const cx = spot.left + spot.width / 2 - tipW / 2
  const cy = spot.top + spot.height / 2 - tipH / 2
  const pos =
    side === 'bottom'
      ? { left: cx, top: spot.top + spot.height + GAP }
      : side === 'top'
        ? { left: cx, top: spot.top - GAP - tipH }
        : side === 'right'
          ? { left: spot.left + spot.width + GAP, top: cy }
          : { left: spot.left - GAP - tipW, top: cy }
  return {
    left: clamp(pos.left, MARGIN, vw - tipW - MARGIN),
    top: clamp(pos.top, MARGIN, vh - tipH - MARGIN),
  }
}

export function OnboardingTour() {
  const device = useOnboardingStore((s) => s.device)
  if (!device) return null
  // device 가 바뀌면(재시작) 내부 상태를 초기화하도록 key 로 리마운트.
  return <Tour key={device} steps={TOUR_STEPS[device]} />
}

function Tour({ steps: allSteps }: { steps: TourStep[] }) {
  const t = useT()
  const finish = useOnboardingStore((s) => s.finish)
  // 시작 시점에 화면에 없는 대상의 스텝은 제외한다.
  const steps = useMemo(
    () =>
      allSteps.filter((s) => {
        if (!s.target) return true
        const el = findTarget(s)
        return !!el && isVisible(el)
      }),
    [allSteps],
  )
  const [index, setIndex] = useState(0)
  const step = steps[index]!
  const isLast = index === steps.length - 1

  const [spot, setSpot] = useState<Rect | null>(null)
  const [tipPos, setTipPos] = useState<{ left: number; top: number } | null>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const nextBtnRef = useRef<HTMLButtonElement>(null)

  const next = useCallback(() => {
    if (isLast) finish()
    else setIndex((i) => i + 1)
  }, [isLast, finish])
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])

  // 대상 위치 측정 — 창 크기 변화 / 대상 크기 변화(툴바 줄바꿈 등)에도 따라간다.
  const relayout = useCallback(() => {
    const el = findTarget(step)
    const r = measure(el)
    setSpot(r)
    const tip = tipRef.current
    if (tip) setTipPos(placeTooltip(r, step.placement ?? 'bottom', tip.offsetWidth, tip.offsetHeight))
  }, [step])

  useLayoutEffect(() => {
    relayout()
    const el = findTarget(step)
    const ro = new ResizeObserver(relayout)
    if (el) ro.observe(el)
    if (tipRef.current) ro.observe(tipRef.current)
    window.addEventListener('resize', relayout)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', relayout)
    }
  }, [step, relayout])

  useEffect(() => {
    nextBtnRef.current?.focus({ preventScroll: true })
  }, [index])

  // 키보드 조작. 캔버스의 전역 단축키(Delete, ⌘Z 등)가 투어 뒤에서 동작하지 않도록 캡처 단계에서 가로챈다.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') finish()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'Enter' || e.key === ' ' || e.key === 'Tab') return // 버튼 기본 동작에 맡김
      else {
        e.preventDefault()
      }
      e.stopImmediatePropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [finish, next, prev])

  const titleId = `tour-title-${step.id}`

  return createPortal(
    <div className="tour-root">
      {/* 클릭 차단 + 어둡게. 하이라이트 구멍은 spot 의 box-shadow 로 뚫는다. */}
      <div className="tour-blocker" data-dim={!spot} />
      {spot && (
        <div
          className="tour-spot"
          style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
        />
      )}

      <div
        ref={tipRef}
        className="tour-tip"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-centered={!spot}
        style={tipPos ? { left: tipPos.left, top: tipPos.top } : { visibility: 'hidden' }}
      >
        <button type="button" className="tour-close" aria-label={t('tour.skipTour')} title={t('tour.skipTour')} onClick={finish}>
          <CloseIcon />
        </button>
        <div className="tour-step-count">
          {index + 1} / {steps.length}
        </div>
        <h3 id={titleId}>{t(step.title, { mod: MOD_KEY })}</h3>
        <div className="tour-body">
          {step.body.map((block, i) =>
            'p' in block ? (
              <p key={i}>
                <Rich text={t(block.p, { mod: MOD_KEY })} />
              </p>
            ) : (
              <ul key={i}>
                {block.ul.map((key) => (
                  <li key={key}>
                    <Rich text={t(key, { mod: MOD_KEY })} />
                  </li>
                ))}
              </ul>
            ),
          )}
        </div>
        <div className="tour-foot">
          <div className="tour-dots" aria-hidden="true">
            {steps.map((s, i) => (
              <span key={s.id} data-active={i === index} />
            ))}
          </div>
          {index === 0 ? (
            <button type="button" className="tour-ghost" onClick={finish}>
              {t('tour.skip')}
            </button>
          ) : (
            <button type="button" className="tour-ghost" onClick={prev}>
              {t('tour.back')}
            </button>
          )}
          <button type="button" ref={nextBtnRef} className="primary tour-next" onClick={next}>
            {index === 0 ? t('tour.start') : isLast ? t('tour.done') : t('tour.next')}
          </button>
        </div>
      </div>

      <style>{`
        .tour-root { position: fixed; inset: 0; z-index: 1000; }
        .tour-blocker { position: fixed; inset: 0; background: transparent; }
        .tour-blocker[data-dim="true"] { background: rgba(12, 16, 23, 0.55);
          animation: tour-fade var(--dur-base, 180ms) var(--ease-out); }
        .tour-spot {
          position: fixed; pointer-events: none;
          border-radius: var(--radius-md);
          box-shadow: 0 0 0 2px var(--indigo-400), 0 0 0 9999px rgba(12, 16, 23, 0.55);
          transition: top 0.28s var(--ease-out), left 0.28s var(--ease-out),
                      width 0.28s var(--ease-out), height 0.28s var(--ease-out);
        }
        .tour-spot::after {
          content: ''; position: absolute; inset: -2px; border-radius: inherit;
          box-shadow: 0 0 0 0 var(--indigo-400);
          animation: tour-ring 1.8s var(--ease-out) infinite;
        }
        .tour-tip {
          position: fixed; width: min(340px, calc(100vw - ${MARGIN * 2}px));
          background: var(--surface-panel); color: var(--text-body);
          border-radius: var(--radius-lg); box-shadow: var(--shadow-xl);
          padding: 18px 18px 14px;
          transition: top 0.28s var(--ease-out), left 0.28s var(--ease-out);
          animation: tour-pop 0.22s var(--ease-out);
        }
        .tour-tip[data-centered="true"] { width: min(400px, calc(100vw - ${MARGIN * 2}px)); }
        .tour-close {
          position: absolute; top: 10px; right: 10px; width: 26px; height: 26px; padding: 0;
          display: inline-flex; align-items: center; justify-content: center;
          background: transparent; border: none; border-radius: var(--radius-sm);
          color: var(--text-muted); font-size: 15px;
        }
        .tour-close:hover { background: var(--surface-hover); color: var(--text-body); }
        .tour-step-count { font: var(--font-mono-sm); color: var(--primary); margin-bottom: 4px; }
        .tour-tip h3 { font: var(--font-h3); color: var(--text-strong); margin: 0 28px 8px 0; }
        .tour-body { font: var(--font-body); font-size: var(--text-sm); color: var(--text-body); }
        .tour-body p { margin: 0 0 6px; }
        .tour-body ul { margin: 0 0 6px; padding-left: 18px; }
        .tour-body li { margin: 3px 0; }
        .tour-body kbd {
          display: inline-block; min-width: 18px; padding: 0 5px; text-align: center;
          font: var(--font-mono-sm); line-height: 18px;
          background: var(--surface-sunken); border: 1px solid var(--border-subtle);
          border-bottom-width: 2px; border-radius: 4px;
        }
        .tour-foot { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
        .tour-dots { display: flex; gap: 5px; flex: 1; flex-wrap: wrap; }
        .tour-dots span { width: 6px; height: 6px; border-radius: 50%; background: var(--border-subtle);
                          transition: width 0.2s var(--ease-out), background 0.2s var(--ease-out); }
        .tour-dots span[data-active="true"] { width: 16px; border-radius: 3px; background: var(--primary); }
        .tour-ghost {
          background: transparent; border: none; color: var(--text-muted);
          font: var(--font-label); padding: 7px 10px; border-radius: var(--radius-md);
        }
        .tour-ghost:hover { background: var(--surface-hover); color: var(--text-body); }
        .tour-next { font: var(--font-label); padding: 7px 16px; border-radius: var(--radius-md); }

        @keyframes tour-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tour-pop { from { opacity: 0; transform: translateY(6px) scale(0.98); } to { opacity: 1; transform: none; } }
        @keyframes tour-ring { 0% { box-shadow: 0 0 0 0 rgba(125, 126, 249, 0.6); } 100% { box-shadow: 0 0 0 10px rgba(125, 126, 249, 0); } }
        @media (prefers-reduced-motion: reduce) {
          .tour-spot, .tour-tip { transition: none; animation: none; }
          .tour-spot::after { animation: none; }
        }
      `}</style>
    </div>,
    document.body,
  )
}
