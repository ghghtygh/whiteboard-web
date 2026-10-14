import type { MessageKey } from '@/i18n'
import type { TourDevice } from '@/onboarding/store'

// 툴팁 위치. 'inside' 는 캔버스처럼 큰 대상 안쪽 중앙에 띄운다. target 이 없으면 화면 중앙 카드.
export type Placement = 'top' | 'bottom' | 'left' | 'right' | 'inside'

// 본문은 번역 키 블록의 나열이다. 문장 안 <b>/<kbd> 서식과 {mod} 자리표시자는
// 렌더 시점(OnboardingTour)에 현재 로케일로 풀어낸다 — 언어를 바꾸면 투어도 즉시 바뀐다.
export type TourKey = Extract<MessageKey, `tour.${string}`>
export type TourBlock = { p: TourKey } | { ul: TourKey[] }

export interface TourStep {
  id: string
  /** 하이라이트할 요소의 data-tour 값. 없으면 화면 중앙 안내 카드. */
  target?: string
  placement?: Placement
  title: TourKey
  body: TourBlock[]
}

const WELCOME: TourStep = {
  id: 'welcome',
  title: 'tour.welcome.title',
  body: [{ p: 'tour.welcome.body' }],
}

const DESKTOP: TourStep[] = [
  WELCOME,
  {
    id: 'sidebar',
    target: 'sidebar',
    placement: 'right',
    title: 'tour.sidebar.title',
    body: [{ p: 'tour.sidebar.body' }, { ul: ['tour.sidebar.drag', 'tour.sidebar.click'] }],
  },
  {
    id: 'canvas',
    target: 'canvas',
    placement: 'inside',
    title: 'tour.canvas.title',
    body: [{ ul: ['tour.canvas.connect', 'tour.canvas.edit', 'tour.canvas.select'] }],
  },
  {
    id: 'toolbar',
    target: 'toolbar',
    placement: 'bottom',
    title: 'tour.toolbar.title',
    body: [{ ul: ['tour.toolbar.undo', 'tour.toolbar.group', 'tour.toolbar.grid'] }],
  },
  {
    id: 'zoom',
    target: 'zoom',
    placement: 'top',
    title: 'tour.zoom.title',
    body: [{ ul: ['tour.zoom.pan', 'tour.zoom.zoom', 'tour.zoom.reset'] }],
  },
  {
    id: 'minimap',
    target: 'minimap',
    placement: 'top',
    title: 'tour.minimap.title',
    body: [{ p: 'tour.minimap.body' }],
  },
  {
    id: 'share',
    target: 'share',
    placement: 'bottom',
    title: 'tour.share.title',
    body: [{ p: 'tour.share.body' }],
  },
  {
    id: 'sync',
    target: 'sync',
    placement: 'bottom',
    title: 'tour.sync.title',
    body: [{ p: 'tour.sync.body' }],
  },
  {
    id: 'help',
    target: 'help',
    placement: 'bottom',
    title: 'tour.help.title',
    body: [{ ul: ['tour.help.copyPaste', 'tour.help.edge', 'tour.help.esc'] }, { p: 'tour.help.replay' }],
  },
]

const MOBILE: TourStep[] = [
  WELCOME,
  {
    id: 'menu',
    target: 'menu',
    placement: 'bottom',
    title: 'tour.menu.title',
    body: [{ p: 'tour.menu.body' }, { ul: ['tour.menu.tap', 'tour.menu.drag'] }],
  },
  {
    id: 'canvas',
    target: 'canvas',
    placement: 'inside',
    title: 'tour.canvas.title',
    body: [{ ul: ['tour.canvas.connectTouch', 'tour.canvas.editTouch', 'tour.canvas.panTouch'] }],
  },
  {
    id: 'toolbar',
    target: 'toolbar',
    placement: 'bottom',
    title: 'tour.toolbar.title',
    body: [{ ul: ['tour.toolbar.undoTouch', 'tour.toolbar.groupTouch', 'tour.toolbar.gridTouch'] }],
  },
  {
    id: 'zoom',
    target: 'zoom',
    placement: 'top',
    title: 'tour.zoom.titleTouch',
    body: [{ p: 'tour.zoom.bodyTouch' }],
  },
  {
    id: 'share',
    target: 'share',
    placement: 'bottom',
    title: 'tour.share.title',
    body: [{ p: 'tour.share.body' }],
  },
  {
    id: 'sync',
    target: 'sync',
    placement: 'bottom',
    title: 'tour.sync.title',
    body: [{ p: 'tour.sync.bodyTouch' }],
  },
  {
    id: 'help',
    target: 'help',
    placement: 'bottom',
    title: 'tour.help.titleTouch',
    body: [{ p: 'tour.help.replayTouch' }],
  },
]

export const TOUR_STEPS: Record<TourDevice, TourStep[]> = { desktop: DESKTOP, mobile: MOBILE }
