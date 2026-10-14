import builtin from '@/catalog/presets.json'

// 기술 스택 프리셋.
// - 내장: src/catalog/presets.json (회사별 대표 스택, 공개 기술 블로그 기준)
// - 커스텀: 사용자가 "현재 보드의 스택" 으로 저장한 것. 여기(localStorage, 사용자 id 별 키)는
//   로컬 모드·비회원용 저장소다. 로그인 회원은 `src/api/presets.ts` 가 백엔드로 보낸다.
export interface StackPreset {
  id: string
  name: string
  stacks: string[]
  source?: string
  custom: boolean
}

const CUSTOM_PREFIX = 'custom:'
const customKey = (userId: string) => `whiteboard.presets.custom.v1.${userId}`
const selectedKey = (userId: string) => `whiteboard.presets.selected.v1.${userId}`
// 이 브라우저에서 프리셋을 저장한 비회원(게스트) id 목록 — 로그인하면 그 회원 계정으로 옮긴다.
const GUEST_OWNERS_KEY = 'whiteboard.presets.guestOwners.v1'

function readGuestOwners(): string[] {
  try {
    const arr = JSON.parse(localStorage.getItem(GUEST_OWNERS_KEY) ?? '[]')
    return Array.isArray(arr) ? arr.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

function writeGuestOwners(ids: string[]) {
  try {
    if (ids.length) localStorage.setItem(GUEST_OWNERS_KEY, JSON.stringify(ids))
    else localStorage.removeItem(GUEST_OWNERS_KEY)
  } catch {
    // 무시 — 기록이 없으면 로그인 후 이관만 빠질 뿐 프리셋 자체는 남아 있다
  }
}

export const BUILTIN_PRESETS: StackPreset[] = builtin.presets.map((p) => ({ ...p, custom: false }))

function readCustom(userId: string): StackPreset[] {
  try {
    const raw = localStorage.getItem(customKey(userId))
    const arr = raw ? JSON.parse(raw) : []
    if (!Array.isArray(arr)) return []
    return arr
      .filter(
        (p): p is { id: string; name: string; stacks: string[] } =>
          !!p && typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.stacks),
      )
      .map((p) => ({ id: p.id, name: p.name, stacks: p.stacks, custom: true }))
  } catch {
    return []
  }
}

function writeCustom(userId: string, list: StackPreset[]) {
  try {
    if (list.length === 0) {
      localStorage.removeItem(customKey(userId))
      return
    }
    localStorage.setItem(
      customKey(userId),
      JSON.stringify(list.map(({ id, name, stacks }) => ({ id, name, stacks }))),
    )
  } catch {
    // 저장 실패 (private 모드 등) — 이번 세션 동안만 유지된다
  }
}

export const localPresets = {
  listCustom(userId: string): StackPreset[] {
    return readCustom(userId)
  },
  saveCustom(userId: string, name: string, stacks: string[]): StackPreset {
    const preset: StackPreset = {
      id: `${CUSTOM_PREFIX}${Date.now().toString(36)}`,
      name,
      stacks,
      custom: true,
    }
    writeCustom(userId, [...readCustom(userId), preset])
    return preset
  },
  removeCustom(userId: string, id: string): void {
    writeCustom(userId, readCustom(userId).filter((p) => p.id !== id))
  },
  markGuestOwner(userId: string): void {
    const owners = readGuestOwners()
    if (!owners.includes(userId)) writeGuestOwners([...owners, userId])
  },
  listGuestOwners(): string[] {
    return readGuestOwners()
  },
  removeGuestOwner(userId: string): void {
    writeGuestOwners(readGuestOwners().filter((id) => id !== userId))
  },
  getSelected(userId: string): string | null {
    try {
      return localStorage.getItem(selectedKey(userId))
    } catch {
      return null
    }
  },
  setSelected(userId: string, id: string | null): void {
    try {
      if (id) localStorage.setItem(selectedKey(userId), id)
      else localStorage.removeItem(selectedKey(userId))
    } catch {
      // 무시 — 다음 진입 때 프리셋 미선택 상태로 시작할 뿐
    }
  },
}
