import type { ComponentType } from '@/types/domain'
import type { TFunction } from '@/i18n'
import en from '@/i18n/locales/en'
import generated from '@/catalog/catalog.generated.json'

// 카탈로그 카테고리 — 표시 순서는 stacks.json, 표시 이름은 i18n 의 sidebar.categories.
const ORDER = new Map(generated.categories.map((id, i) => [id, i]))

// 모르는 카테고리(서버에서 새로 추가 등)는 id 를 그대로 보여준다.
type CategoryId = keyof typeof en.sidebar.categories
function isKnownCategory(category: string): category is CategoryId {
  return category in en.sidebar.categories
}

export function categoryLabel(t: TFunction, category: string): string {
  return isKnownCategory(category) ? t(`sidebar.categories.${category}`) : category
}

// 항목을 카테고리별로 묶어 카테고리 표시 순서대로 돌려준다. 카테고리 안의 순서는 입력 순서를 유지.
export function groupByCategory(items: ComponentType[]): [string, ComponentType[]][] {
  const map = new Map<string, ComponentType[]>()
  for (const item of items) {
    const arr = map.get(item.category) ?? []
    arr.push(item)
    map.set(item.category, arr)
  }
  const order = (c: string) => ORDER.get(c) ?? Number.MAX_SAFE_INTEGER
  return [...map.entries()].sort(([a], [b]) => order(a) - order(b))
}
