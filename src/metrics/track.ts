import { IS_LOCAL_MODE } from '@/local/mode'

// 사용 이벤트를 모아 whiteboard-server 의 /api/v1/metrics/events 로 보낸다 → Prometheus 카운터로 집계.
// 서버가 이벤트 이름·페이지를 허용 목록으로 거르므로, 새 이벤트를 추가하면
// ClientEventController 의 COUNT_EVENTS / PAGES 에도 같이 추가해야 집계된다.
// 사용자/보드 id 같은 식별자는 절대 싣지 않는다 (집계 지표 전용).

export type CountEvent =
  | 'node_create'
  | 'edge_create'
  | 'group_create'
  | 'element_delete'
  | 'paste'
  | 'undo'
  | 'redo'
  | 'share_open'
  | 'share_link_copy'

export type Page =
  | 'landing'
  | 'login'
  | 'signup'
  | 'oauth_callback'
  | 'view'
  | 'board_list'
  | 'board_edit'
  | 'tokens'
  | 'not_found'

interface ClientEvent {
  name: string
  page?: Page
  value?: number
}

const ENDPOINT = '/api/v1/metrics/events'
const FLUSH_INTERVAL_MS = 10_000
const MAX_BATCH = 50 // 서버 MAX_EVENTS_PER_BATCH 와 맞춘다.

// 로컬 모드는 백엔드가 없으므로 아무것도 보내지 않는다.
const ENABLED = !IS_LOCAL_MODE

const queue: ClientEvent[] = []
let timer: ReturnType<typeof setTimeout> | null = null

function enqueue(event: ClientEvent) {
  if (!ENABLED) return
  queue.push(event)
  if (queue.length >= MAX_BATCH) {
    flush()
  } else if (!timer) {
    timer = setTimeout(flush, FLUSH_INTERVAL_MS)
  }
}

/** 큐를 비워 전송한다. 페이지를 떠날 때는 sendBeacon 으로 언로드 중에도 전달되게 한다. */
export function flush(useBeacon = false) {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  while (queue.length > 0) {
    const body = JSON.stringify({ events: queue.splice(0, MAX_BATCH) })
    if (useBeacon && navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }))) {
      continue
    }
    // 지표 전송 실패는 사용자 경험에 영향을 주지 않도록 조용히 버린다.
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  }
}

export function track(name: CountEvent) {
  enqueue({ name })
}

export function trackPageView(page: Page) {
  enqueue({ name: 'page_view', page })
}

export function trackBoardSession(seconds: number) {
  const value = Math.round(seconds)
  // 1초 미만(StrictMode 이중 마운트 등)은 의미 없는 세션이라 보내지 않는다.
  if (value > 0) enqueue({ name: 'board_session', value })
}

/** 라우트 경로 → 페이지 라벨. 경로 파라미터(boardId, 토큰)는 라벨에 넣지 않는다. */
export function pageOf(pathname: string): Page {
  if (pathname === '/') return 'landing'
  if (pathname === '/login') return 'login'
  if (pathname === '/signup') return 'signup'
  if (pathname === '/oauth/callback') return 'oauth_callback'
  if (pathname.startsWith('/view/')) return 'view'
  if (pathname === '/boards') return 'board_list'
  if (pathname.startsWith('/boards/')) return 'board_edit'
  if (pathname === '/settings/tokens') return 'tokens'
  return 'not_found'
}

if (ENABLED && typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => flush(true))
}
