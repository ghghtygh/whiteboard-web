import { Link } from 'react-router-dom'

export function NotFoundPage() {
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
        <h1 style={{ margin: 0 }}>페이지를 찾을 수 없습니다</h1>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>주소가 잘못되었거나 삭제된 보드일 수 있어요.</p>
        <p style={{ margin: '4px 0 0' }}>
          <Link to="/">홈으로 돌아가기</Link>
        </p>
      </div>
    </div>
  )
}
