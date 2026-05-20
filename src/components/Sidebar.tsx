import { useEffect, useMemo, useState } from 'react'
import { useCatalogStore } from '@/store/catalog'
import type { ComponentType } from '@/types/domain'
import { catalogColor } from '@/local/catalogSeed'
import { localRecents } from '@/local/recents'
import { iconDataUrl, hasIcon } from '@/canvas/icons'

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

function ComponentRow({ item, onPick }: { item: ComponentType; onPick?: () => void }) {
  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('application/x-whiteboard-component', item.type)
    e.dataTransfer.effectAllowed = 'copy'
    // 드래그 시작 = 사용자가 캔버스로 가져갈 의도 → drawer 닫음 (모바일).
    onPick?.()
  }
  const url = iconDataUrl(item.type)
  return (
    <li draggable onDragStart={onDragStart} title={item.displayName}>
      {hasIcon(item.type) && url ? (
        <img className="icon" src={url} alt="" width={20} height={20} draggable={false} />
      ) : (
        <span className="badge" style={{ background: catalogColor(item.type) }}>
          {item.displayName.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="name">{item.displayName}</span>
    </li>
  )
}

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open = false, onClose }: SidebarProps = {}) {
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
    <>
      {/* 모바일에서 drawer 열렸을 때 뒤 캔버스 dim. ESC 대신 탭으로 닫기. */}
      <div
        className="sidebar-backdrop"
        data-open={open}
        onClick={onClose}
        aria-hidden
      />
      <aside className="sidebar" data-open={open}>
        <div className="search">
          <input
            placeholder="컴포넌트 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="메뉴 닫기"
            title="닫기"
          >
            ×
          </button>
        </div>

        <div className="list">
          {loading && <p className="muted">불러오는 중…</p>}
          {error && <p className="error">{error}</p>}

          {recents.length > 0 && (
            <section>
              <h3>최근 사용</h3>
              <ul>
                {recents.map((c) => (
                  <ComponentRow key={`recent-${c.type}`} item={c} onPick={onClose} />
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
                      <ComponentRow key={c.type} item={c} onPick={onClose} />
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
          .search { padding: 12px; border-bottom: 1px solid var(--color-border);
                    display: flex; align-items: center; gap: 8px; }
          .search input { flex: 1; min-width: 0; }
          .close-btn { display: none; background: none; border: none;
                       font-size: 24px; line-height: 1; padding: 0 4px;
                       color: var(--color-muted); cursor: pointer; }
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
          .icon { width: 20px; height: 20px; flex-shrink: 0; object-fit: contain; }
          .name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .muted { color: var(--color-muted); font-size: 13px; }
          .error { color: var(--color-danger); font-size: 13px; }
          .sidebar-backdrop { display: none; }

          /* 모바일 = drawer 모드. 화면 왼쪽에서 슬라이드. */
          @media (max-width: 768px) {
            .sidebar {
              position: fixed; top: 0; left: 0; bottom: 0;
              width: min(82vw, 320px);
              z-index: 50;
              transform: translateX(-100%);
              transition: transform 0.22s ease-out;
              box-shadow: 0 0 24px rgba(0,0,0,0.12);
            }
            .sidebar[data-open="true"] { transform: translateX(0); }
            .close-btn { display: inline-flex; align-items: center; justify-content: center; }
            .sidebar-backdrop[data-open="true"] {
              display: block; position: fixed; inset: 0;
              background: rgba(0,0,0,0.35); z-index: 40;
            }
            .list li { padding: 10px 8px; font-size: 14px; }
          }
        `}</style>
      </aside>
    </>
  )
}
