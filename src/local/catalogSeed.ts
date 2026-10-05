import type { ComponentType, Anchor } from '@/types/domain'
import generated from '@/catalog/catalog.generated.json'

const NOW = '2026-05-15T00:00:00Z'
const ANCHORS: Anchor[] = ['top', 'right', 'bottom', 'left']

// 스펙 §3.1 ComponentType + §11 카탈로그 시드.
// 원본은 src/catalog/stacks.json — 수정 후 `npm run catalog:sync` 로 generated JSON 과 아이콘을 갱신한다.
// 배열 순서 = 카테고리 안의 인기순 (사이드바 "더보기" 접힘 기준).
interface GeneratedEntry {
  type: string
  displayName: string
  category: string
  color: string
  aliases: string[]
  icon: boolean
}

const ENTRIES: GeneratedEntry[] = generated.items

export const CATALOG_CATEGORIES: { id: string; label: string }[] = generated.categories

export const LOCAL_CATALOG: ComponentType[] = ENTRIES.map((s) => ({
  type: s.type,
  displayName: s.displayName,
  category: s.category,
  iconUrl: `local://${s.type}`,
  defaultWidth: 80,
  defaultHeight: 80,
  anchors: ANCHORS,
  version: 1,
  deprecated: false,
  createdAt: NOW,
  updatedAt: NOW,
}))

const BY_TYPE = new Map(ENTRIES.map((s) => [s.type, s]))

export function catalogColor(type: string): string {
  return BY_TYPE.get(type)?.color ?? '#6b7280'
}

// 검색용 별칭 (예: postgres → PostgreSQL, k8s → Kubernetes)
export function catalogAliases(type: string): string[] {
  return BY_TYPE.get(type)?.aliases ?? []
}

// 카테고리 안의 인기 순위 (작을수록 위). 시드에 없는 type(원격 카탈로그 전용)은 맨 뒤.
const RANK = new Map(ENTRIES.map((s, i) => [s.type, i]))
export function catalogRank(type: string): number {
  return RANK.get(type) ?? Number.MAX_SAFE_INTEGER
}
