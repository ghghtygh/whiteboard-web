import { LOCALES, SUPPORTED_LOCALES, isLocale, useLocaleStore, useT } from '@/i18n'

export function LanguageSelect({ className }: { className?: string }) {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)

  return (
    <select
      className={['lang-select', className].filter(Boolean).join(' ')}
      value={locale}
      onChange={(e) => {
        if (isLocale(e.target.value)) setLocale(e.target.value)
      }}
      aria-label={t('common.language')}
      title={t('common.language')}
    >
      {SUPPORTED_LOCALES.map((code) => (
        <option key={code} value={code} lang={code}>
          {LOCALES[code].label}
        </option>
      ))}
    </select>
  )
}
