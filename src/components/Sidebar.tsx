import { useEffect, useMemo, useState } from 'react'
import { useCatalogStore } from '@/store/catalog'
import type { ComponentType } from '@/types/domain'
import { catalogColor } from '@/local/catalogSeed'
import { localRecents } from '@/local/recents'

const CATEGORY_LABELS: Record<string, string> = {
  'ci-cd': 'CI / CD',
  database: '데이터베이스',
  framework: '프레임워크',
  messaging: '메시징',
  infrastructure: '인프라',
  cloud: '클라우드',
  observability: '모니터링',
  auth: '인증',
  storage: '스토리지',
  etc: '기타',
}

function ComponentRow({ item }: { item: ComponentType }) {
  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('application/x-whiteboard-component', item.type)
    e.dataTransfer.effectAllowed = 'copy'
  }
  return (
    <li draggable onDragStart={onDragStart} title={item.displayName}>
      <span className="badge" style={{ background: catalogColor(item.type) }}>
        {item.displayName.slice(0, 2).toUpperCase()}
      </span>
      <span className="name">{item.displayName}</span>
    </li>
  )
}

export function Sidebar() {
  const items = useCatalogStore((s) => s.items)
  const loading = useCatalogStore((s) => s.loading)
  const error = useCatalogStore((s) => s.error)
  const load = useCatalogStore((s) => s.load)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [, setRecentsTick] = useState(0)

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim().toLowerCase()), 200)
    return () => clearTimeout(t)
  }, [query])

  // 최근 사용은 localStorage라 다른 곳에서 push 후 화면에 반영하려면 polling 비슷한 트릭
  useEffect(() => {
    const t = setInterval(() => setRecentsTick((x) => x + 1), 1500)
    return () => clearInterval(t)
  }, [])

  const filtered = useMemo(() => {
    if (!debounced) return items
    return items.filter(
      (c) => c.displayName.toLowerCase().includes(debounced) || c.type.toLowerCase().includes(debounced),
    )
  }, [items, debounced])

  const grouped = useMemo(() => {
    const map = new Map<string, ComponentType[]>()
    for (const item of filtered) {
      const arr = map.get(item.category) ?? []
      arr.push(item)
      map.set(item.category, arr)
    }
    return [...map.entries()]
  }, [filtered])

  const recents = useMemo(() => {
    if (debounced) return []
    const recentTypes = localRecents.list()
    return recentTypes
      .map((t) => items.find((c) => c.type === t))
      .filter((c): c is ComponentType => !!c)
  }, [items, debounced])

  return (
    <aside className="sidebar">
      <div className="search">
        <input
          placeholder="컴포넌트 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="list">
        {loading && <p className="muted">불러오는 중…</p>}
        {error && <p className="error">{error}</p>}

        {recents.length > 0 && (
          <section>
            <h3>최근 사용</h3>
            <ul>
              {recents.map((c) => (
                <ComponentRow key={`recent-${c.type}`} item={c} />
              ))}
            </ul>
          </section>
        )}

        {grouped.map(([category, list]) => {
          const isCollapsed = collapsed[category]
          return (
            <section key={category}>
              <h3
                onClick={() => setCollapsed((s) => ({ ...s, [category]: !s[category] }))}
                style={{ cursor: 'pointer' }}
              >
                <span>{isCollapsed ? '▸' : '▾'}</span> {CATEGORY_LABELS[category] ?? category}
                <span className="count">{list.length}</span>
              </h3>
              {!isCollapsed && (
                <ul>
                  {list.map((c) => (
                    <ComponentRow key={c.type} item={c} />
                  ))}
                </ul>
              )}
            </section>
          )
        })}

        {!loading && items.length === 0 && !error && (
          <p className="muted">카탈로그 비어 있음</p>
        )}
      </div>

      <style>{`
        .sidebar { display: flex; flex-direction: column;
                   border-right: 1px solid var(--color-border);
                   background: var(--color-panel); min-height: 0; }
        .search { padding: 12px; border-bottom: 1px solid var(--color-border); }
        .search input { width: 100%; }
        .list { flex: 1; overflow-y: auto; padding: 8px 12px; }
        .list h3 { font-size: 12px; text-transform: uppercase; color: var(--color-muted);
                   margin: 12px 0 6px; letter-spacing: 0.04em;
                   display: flex; align-items: center; gap: 4px; user-select: none; }
        .list h3 .count { margin-left: auto; color: #9ca3af; font-weight: normal; }
        .list ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 2px; }
        .list li { display: flex; align-items: center; gap: 8px; padding: 6px 8px;
                   border-radius: var(--radius-sm); cursor: grab; font-size: 13px; }
        .list li:hover { background: #f1f3f5; }
        .badge { display: inline-flex; align-items: center; justify-content: center;
                 width: 22px; height: 22px; border-radius: 4px;
                 color: white; font-size: 10px; font-weight: 700; flex-shrink: 0; }
        .name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .muted { color: var(--color-muted); font-size: 13px; }
        .error { color: var(--color-danger); font-size: 13px; }
      `}</style>
    </aside>
  )
}
