import { useEffect, useRef, useState } from 'react'
import { LOCALES, SUPPORTED_LOCALES, useLocaleStore, useT } from '@/i18n'
import { CheckIcon, GlobeIcon } from '@/components/icons'

interface Props {
  /** true 면 지구본 아이콘만 보인다(보드 상단바처럼 좁은 곳). 기본은 아이콘 + 현재 언어 이름. */
  compact?: boolean
  className?: string
}

// 지구본 버튼 → 언어 목록 팝오버. 메뉴는 버튼 오른쪽 끝에 맞춰 아래로 연다.
export function LanguageSelect({ compact = false, className }: Props) {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // 바깥 클릭 / Esc 로 닫기. Esc 는 캔버스 단축키(선택 해제)로 새지 않도록 캡처 단계에서 막는다.
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      setOpen(false)
      buttonRef.current?.focus()
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  return (
    <div ref={rootRef} className={['lang-select', className].filter(Boolean).join(' ')} data-compact={compact}>
      <button
        ref={buttonRef}
        type="button"
        className="lang-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t('common.language')}: ${LOCALES[locale].label}`}
        title={t('common.language')}
        onClick={() => setOpen((v) => !v)}
      >
        <GlobeIcon className="lang-globe" />
        {!compact && <span className="lang-current">{LOCALES[locale].label}</span>}
      </button>

      {open && (
        <ul className="lang-menu" role="menu" aria-label={t('common.language')}>
          {SUPPORTED_LOCALES.map((code) => (
            <li key={code} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={code === locale}
                lang={code}
                autoFocus={code === locale}
                onClick={() => {
                  setLocale(code)
                  setOpen(false)
                  buttonRef.current?.focus()
                }}
              >
                <span>{LOCALES[code].label}</span>
                {code === locale && <CheckIcon className="lang-check" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <style>{`
        .lang-select { position: relative; display: inline-flex; }
        .lang-trigger { display: inline-flex; align-items: center; gap: 6px;
                        height: 30px; padding: 0 10px; font-size: var(--text-sm);
                        background: transparent; border: 1px solid transparent;
                        border-radius: var(--radius-sm); color: var(--text-muted); }
        .lang-trigger:hover:not(:disabled) { background: var(--surface-hover); border-color: transparent;
                                             color: var(--primary); }
        .lang-trigger[aria-expanded="true"] { background: var(--surface-hover); color: var(--primary); }
        .lang-select[data-compact="true"] .lang-trigger { width: 30px; padding: 0; justify-content: center; }
        .lang-globe { font-size: 17px; flex-shrink: 0; }

        .lang-menu { position: absolute; top: calc(100% + 6px); right: 0; z-index: 50;
                     min-width: 148px; margin: 0; padding: 4px; list-style: none;
                     background: var(--surface-panel); border: 1px solid var(--border-subtle);
                     border-radius: var(--radius-md); box-shadow: var(--shadow-md); }
        .lang-menu button { width: 100%; display: flex; align-items: center; justify-content: space-between;
                            gap: 12px; padding: 7px 10px; font: var(--font-body); font-size: var(--text-sm);
                            text-align: left; background: transparent; border: 1px solid transparent;
                            border-radius: var(--radius-sm); color: var(--text-body); }
        .lang-menu button:hover:not(:disabled) { background: var(--surface-hover); border-color: transparent; }
        .lang-menu button[aria-checked="true"] { color: var(--primary); font-weight: var(--weight-semibold); }
        .lang-check { font-size: 15px; }
      `}</style>
    </div>
  )
}
