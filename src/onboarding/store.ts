import { create } from 'zustand'
import { MOBILE_BP } from '@/styles/breakpoints'

// 온보딩 투어 상태. PC 와 모바일은 조작 방식(마우스 vs 터치)이 달라 가이드 내용도 다르므로
// "본 적 있음" 플래그를 기기 종류별로 따로 저장한다 — PC 에서 봤어도 모바일 첫 진입 땐 다시 보여준다.

export type TourDevice = 'desktop' | 'mobile'

const SEEN_KEY: Record<TourDevice, string> = {
  desktop: 'whiteboard.onboarding.desktop.v1',
  mobile: 'whiteboard.onboarding.mobile.v1',
}

// 레이아웃 전환 기준(MOBILE_BP)과 같은 기준으로 판정해야 하이라이트 대상(햄버거 메뉴 등)이 실제로 보인다.
export function detectDevice(): TourDevice {
  if (typeof window === 'undefined') return 'desktop'
  return window.matchMedia(`(max-width: ${MOBILE_BP}px)`).matches ? 'mobile' : 'desktop'
}

export function hasSeenTour(device: TourDevice): boolean {
  try {
    return localStorage.getItem(SEEN_KEY[device]) === '1'
  } catch {
    // 스토리지 접근 불가(프라이빗 모드 등) — 매번 뜨는 것보단 안 뜨는 편이 낫다.
    return true
  }
}

function markSeen(device: TourDevice) {
  try {
    localStorage.setItem(SEEN_KEY[device], '1')
  } catch {
    /* 무시 */
  }
}

interface OnboardingState {
  /** 진행 중인 투어의 기기 종류. null 이면 닫힘. */
  device: TourDevice | null
  start: (device?: TourDevice) => void
  /** 완료/건너뛰기 모두 "본 것"으로 기록한다. */
  finish: () => void
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  device: null,
  start(device) {
    set({ device: device ?? detectDevice() })
  },
  finish() {
    const d = get().device
    if (d) markSeen(d)
    set({ device: null })
  },
}))
