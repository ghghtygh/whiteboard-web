import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <h1>Page not found</h1>
      <p>
        <Link to="/">Go home</Link>
      </p>
    </div>
  )
}
