import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <h1>페이지를 찾을 수 없습니다</h1>
      <p>
        <Link to="/">홈으로</Link>
      </p>
    </div>
  )
}
