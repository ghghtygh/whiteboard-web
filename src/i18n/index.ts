import { useCallback } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import en from '@/i18n/locales/en'
import ko from '@/i18n/locales/ko'
import type { MessageKey, Messages, TArgs, TFunction } from '@/i18n/types'

export type { MessageKey, Messages, TFunction } from '@/i18n/types'

// 지원 로케일 레지스트리. 새 언어 추가 = locales/<code>.ts 작성 + 여기 한 줄 추가.
// label 은 언어 선택 UI 에 그대로 보이므로 항상 그 언어 자신의 이름(endonym)으로 쓴다.
export const LOCALES = {
  en: { label: 'English', messages: en as Messages },
  ko: { label: '한국어', messages: ko },
} satisfies Record<string, { label: string; messages: Messages }>

export type Locale = keyof typeof LOCALES
export const DEFAULT_LOCALE: Locale = 'en'
export const SUPPORTED_LOCALES = Object.keys(LOCALES) as Locale[]

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && value in LOCALES
}

// 첫 방문 시 브라우저 언어 목록에서 지원 로케일을 고른다('ko-KR' → 'ko'). 없으면 영어.
function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const tag of candidates) {
    const base = tag?.toLowerCase().split('-')[0]
    if (isLocale(base)) return base
  }
  return DEFAULT_LOCALE
}

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: detectLocale(),
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'whiteboard.locale.v1',
      // 저장된 값이 더 이상 지원하지 않는 로케일이면(언어 제거 등) 감지값으로 되돌린다.
      merge: (persisted, current) => {
        const saved = (persisted as Partial<LocaleState> | undefined)?.locale
        return isLocale(saved) ? { ...current, locale: saved } : current
      },
    },
  ),
)

function lookup(messages: Messages, key: string): string | undefined {
  let cur: unknown = messages
  for (const part of key.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return typeof cur === 'string' ? cur : undefined
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m))
}

/** 대상 로케일 → 영어 → 키 자체 순으로 폴백한다(빈 화면 대신 키가 보이면 누락을 바로 알 수 있다). */
export function translate<K extends MessageKey>(locale: Locale, key: K, ...args: TArgs<K>): string {
  const template = lookup(LOCALES[locale].messages, key) ?? lookup(LOCALES[DEFAULT_LOCALE].messages, key) ?? key
  return interpolate(template, args[0] as Record<string, string | number> | undefined)
}

/**
 * 컴포넌트 밖(스토어, 이벤트 콜백, 토스트, 기본값 생성 등)에서 쓰는 번역 함수.
 * 호출 시점의 로케일로 문자열을 "확정"하므로, 언어를 바꿔도 이미 만든 문자열은 그대로다.
 * 렌더 중엔 useT() 를 써야 언어 변경 시 다시 그려진다.
 */
export const t: TFunction = (key, ...args) => translate(useLocaleStore.getState().locale, key, ...args)

/** 렌더용 번역 훅. 로케일이 바뀌면 컴포넌트가 다시 렌더된다. */
export function useT(): TFunction {
  const locale = useLocaleStore((s) => s.locale)
  return useCallback<TFunction>((key, ...args) => translate(locale, key, ...args), [locale])
}

export function useLocale(): Locale {
  return useLocaleStore((s) => s.locale)
}

/** 날짜 표시 — 로케일별 관례(예: en "Oct 5, 2026" / ko "2026. 10. 5.")를 Intl 에 맡긴다. */
export function formatDate(value: string | number | Date, locale: Locale): string {
  return new Date(value).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function useFormatDate(): (value: string | number | Date) => string {
  const locale = useLocale()
  return useCallback((value) => formatDate(value, locale), [locale])
}

// 단축키 표기용 수식키. 메시지에 {mod} 로 넘긴다.
export const MOD_KEY =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'

/** <html lang> 과 문서 제목을 현재 로케일에 맞춘다. 부트 시 한 번 호출. */
export function bindDocumentLocale() {
  const apply = (locale: Locale) => {
    document.documentElement.lang = locale
    document.title = translate(locale, 'app.documentTitle')
  }
  apply(useLocaleStore.getState().locale)
  useLocaleStore.subscribe((s, prev) => {
    if (s.locale !== prev.locale) apply(s.locale)
  })
}
