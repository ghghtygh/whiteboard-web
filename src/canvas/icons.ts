// 기술 스택 아이콘. scripts/sync-stack-icons.mjs 가 devicon(컬러 원본) / simple-icons(브랜드 hex 주입)
// 에서 수집해 src/assets/stack-icons/<type>.svg 로 저장한 파일을 쓴다. 아이콘이 없으면 컬러 배지 폴백.
// 파일은 ?url 로만 참조해 번들 JS 에는 경로 문자열만 남는다 (vite.config.ts 에서 인라인 제외).

const FILES = import.meta.glob<string>('/src/assets/stack-icons/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})

const URLS = new Map<string, string>(
  Object.entries(FILES).map(([file, url]) => [file.slice(file.lastIndexOf('/') + 1, -'.svg'.length), url]),
)

export function iconUrl(type: string): string | null {
  return URLS.get(type) ?? null
}

export function hasIcon(type: string): boolean {
  return URLS.has(type)
}

// 기존 API 호환 (NodeShape / Sidebar 가 iconDataUrl 을 사용)
export const iconDataUrl = iconUrl
