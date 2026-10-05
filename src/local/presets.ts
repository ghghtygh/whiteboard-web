import builtin from '@/catalog/presets.json'

// 기술 스택 프리셋.
// - 내장: src/catalog/presets.json (회사별 대표 스택, 공개 기술 블로그 기준)
// - 커스텀: 사용자가 "현재 보드의 스택" 으로 저장한 것. localStorage 에만 보관 (사용자 단위, 보드와 무관).
export interface StackPreset {
  id: string
  name: string
  stacks: string[]
  source?: string
  custom: boolean
}

const CUSTOM_KEY = 'whiteboard.presets.custom.v1'
const SELECTED_KEY = 'whiteboard.presets.selected.v1'
const CUSTOM_PREFIX = 'custom:'

export const BUILTIN_PRESETS: StackPreset[] = builtin.presets.map((p) => ({ ...p, custom: false }))

function readCustom(): StackPreset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
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

function writeCustom(list: StackPreset[]) {
  try {
    localStorage.setItem(
      CUSTOM_KEY,
      JSON.stringify(list.map(({ id, name, stacks }) => ({ id, name, stacks }))),
    )
  } catch {
    // 저장 실패 (private 모드 등) — 이번 세션 동안만 유지된다
  }
}

export const localPresets = {
  listCustom(): StackPreset[] {
    return readCustom()
  },
  saveCustom(name: string, stacks: string[]): StackPreset {
    const preset: StackPreset = {
      id: `${CUSTOM_PREFIX}${Date.now().toString(36)}`,
      name,
      stacks,
      custom: true,
    }
    writeCustom([...readCustom(), preset])
    return preset
  },
  removeCustom(id: string): void {
    writeCustom(readCustom().filter((p) => p.id !== id))
  },
  getSelected(): string | null {
    try {
      return localStorage.getItem(SELECTED_KEY)
    } catch {
      return null
    }
  },
  setSelected(id: string | null): void {
    try {
      if (id) localStorage.setItem(SELECTED_KEY, id)
      else localStorage.removeItem(SELECTED_KEY)
    } catch {
      // 무시 — 다음 진입 때 프리셋 미선택 상태로 시작할 뿐
    }
  },
}
