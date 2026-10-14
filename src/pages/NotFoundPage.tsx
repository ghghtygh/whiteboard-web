import { Link } from 'react-router-dom'
import { useT } from '@/i18n'

export function NotFoundPage() {
  const t = useT()
  return (
    <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p
          style={{
            margin: 0,
            font: 'var(--weight-extra) var(--text-5xl)/1 var(--font-mono)',
            color: 'var(--primary)',
          }}
        >
          404
        </p>
        <h1 style={{ margin: 0 }}>{t('notFound.title')}</h1>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>{t('notFound.body')}</p>
        <p style={{ margin: '4px 0 0' }}>
          <Link to="/">{t('notFound.home')}</Link>
        </p>
      </div>
    </div>
  )
}
