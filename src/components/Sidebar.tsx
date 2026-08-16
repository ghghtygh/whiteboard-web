import { useEffect, useMemo, useRef, useState } from 'react'
import { useCatalogStore } from '@/store/catalog'
import type { ComponentType } from '@/types/domain'
import { catalogColor, LOCAL_CATALOG } from '@/local/catalogSeed'
import { localRecents } from '@/local/recents'
import { iconDataUrl, hasIcon } from '@/canvas/icons'
import { useCanvasContext } from '@/canvas/useCanvasContext'
import { useViewportStore } from '@/store/viewport'
import { useSnapStore } from '@/canvas/snapStore'
import { useSelection } from '@/canvas/selection'
import { createNode } from '@/canvas/ops'
import { COARSE_GRID, NODE_H, NODE_W, coarseSnap, dropJitter } from '@/canvas/geometry'
import { CloseIcon } from '@/components/icons'

const CATEGORY_LABELS: Record<string, string> = {
  'ci-cd': 'CI / CD',
  database: 'Database',
  framework: 'Framework',
  messaging: 'Messaging',
  infrastructure: 'Infrastructure',
  cloud: 'Cloud',
  observability: 'Observability',
  auth: 'Auth',
  storage: 'Storage',
  etc: 'Other',
}

interface TouchDragState {
  type: string
  label: string
  iconUrl?: string
  color?: string
  startX: number
  startY: number
  isDragging: boolean
}

interface GhostState {
  label: string
  iconUrl?: string
  color?: string
  x: number
  y: number
}

function ComponentRow({
  item,
  onDragPick,
  onTapAdd,
  onTouchDragStart,
}: {
  item: ComponentType
  onDragPick?: () => void
  onTapAdd?: (type: string) => void
  onTouchDragStart?: (item: ComponentType, clientX: number, clientY: number) => void
}) {
  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('application/x-whiteboard-component', item.type)
    e.dataTransfer.effectAllowed = 'copy'
    onDragPick?.()
  }
  function onClick() {
    onTapAdd?.(item.type)
  }
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    if (t) onTouchDragStart?.(item, t.clientX, t.clientY)
  }
  const url = iconDataUrl(item.type)
  return (
    <li
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      onTouchStart={onTouchStart}
      title={item.displayName}
    >
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

  const { doc } = useCanvasContext()
  const scale = useViewportStore((s) => s.scale)
  const vx = useViewportStore((s) => s.x)
  const vy = useViewportStore((s) => s.y)
  const cw = useViewportStore((s) => s.canvasWidth)
  const ch = useViewportStore((s) => s.canvasHeight)
  const snapEnabled = useSnapStore((s) => s.enabled)
  const setSel = useSelection((s) => s.set)

  // ── 터치 드래그 ────────────────────────────────────────────────
  const [ghost, setGhost] = useState<GhostState | null>(null)

  // 이벤트 핸들러 안에서 최신 값을 읽기 위한 refs
  const docRef = useRef(doc)
  const scaleRef = useRef(scale)
  const vxRef = useRef(vx)
  const vyRef = useRef(vy)
  const snapRef = useRef(snapEnabled)
  const onCloseRef = useRef(onClose)
  const setSelRef = useRef(setSel)
  const touchDragRef = useRef<TouchDragState | null>(null)

  useEffect(() => { docRef.current = doc }, [doc])
  useEffect(() => { scaleRef.current = scale }, [scale])
  useEffect(() => { vxRef.current = vx }, [vx])
  useEffect(() => { vyRef.current = vy }, [vy])
  useEffect(() => { snapRef.current = snapEnabled }, [snapEnabled])
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => { setSelRef.current = setSel }, [setSel])

  function onTouchDragStart(item: ComponentType, clientX: number, clientY: number) {
    touchDragRef.current = {
      type: item.type,
      label: item.displayName,
      iconUrl: hasIcon(item.type) ? (iconDataUrl(item.type) ?? undefined) : undefined,
      color: catalogColor(item.type),
      startX: clientX,
      startY: clientY,
      isDragging: false,
    }
  }

  // window 레벨 touch 리스너 — 한 번만 등록
  useEffect(() => {
    function onTouchMove(e: TouchEvent) {
      const drag = touchDragRef.current
      if (!drag) return
      const t = e.touches[0]
      if (!t) return

      const dx = t.clientX - drag.startX
      const dy = t.clientY - drag.startY
      const dist = Math.hypot(dx, dy)

      if (!drag.isDragging) {
        if (dist < 10) return
        // 세로 이동이 가로의 2배 이상이면 스크롤 의도 → 중단
        if (Math.abs(dy) > Math.abs(dx) * 2) {
          touchDragRef.current = null
          return
        }
        drag.isDragging = true
      }

      e.preventDefault() // 스크롤 방지

      setGhost({
        label: drag.label,
        iconUrl: drag.iconUrl,
        color: drag.color,
        x: t.clientX,
        y: t.clientY,
      })
    }

    function onTouchEnd(e: TouchEvent) {
      const drag = touchDragRef.current
      if (!drag) return

      setGhost(null)
      touchDragRef.current = null

      if (!drag.isDragging) return

      // 이후 click 이벤트 방지 (drag 후 tap 추가되는 것 막기)
      e.preventDefault()

      const t = e.changedTouches[0]
      if (!t) return

      const canvas = document.querySelector('.canvas-root') as HTMLElement | null
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const inside =
        t.clientX >= rect.left &&
        t.clientX <= rect.right &&
        t.clientY >= rect.top &&
        t.clientY <= rect.bottom

      if (!inside) return

      const d = docRef.current
      if (!d) return

      const s = scaleRef.current
      const ox = vxRef.current
      const oy = vyRef.current
      const sn = snapRef.current

      const sx = t.clientX - rect.left
      const sy = t.clientY - rect.top
      let x = (sx - ox) / s + dropJitter()
      let y = (sy - oy) / s + dropJitter()
      if (sn) {
        x = coarseSnap(x - NODE_W / 2) + NODE_W / 2
        y = coarseSnap(y - NODE_H / 2) + NODE_H / 2
      }
      const ct = LOCAL_CATALOG.find((c) => c.type === drag.type)
      const id = createNode(d, drag.type, x, y, ct?.version ?? 1)
      localRecents.push(drag.type)
      setSelRef.current([{ kind: 'node', id }])
      onCloseRef.current?.()
    }

    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [])
  // ────────────────────────────────────────────────────────────────

  // 탭으로 추가 — HTML5 드래그가 동작하지 않는 모바일/터치 기기 폴백.
  function onTapAdd(type: string) {
    if (!open || !doc) return
    const cx = (cw / 2 - vx) / scale + dropJitter()
    const cy = (ch / 2 - vy) / scale + dropJitter()
    let x = cx - NODE_W / 2
    let y = cy - NODE_H / 2
    if (snapEnabled) {
      x = Math.round(x / COARSE_GRID) * COARSE_GRID
      y = Math.round(y / COARSE_GRID) * COARSE_GRID
    }
    const ct = LOCAL_CATALOG.find((c) => c.type === type)
    const id = createNode(doc, type, x, y, ct?.version ?? 1)
    localRecents.push(type)
    setSel([{ kind: 'node', id }])
    onClose?.()
  }

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim().toLowerCase()), 200)
    return () => clearTimeout(t)
  }, [query])

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
            aria-label="Close menu"
            title="Close"
          >
            <CloseIcon />
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
                  <ComponentRow
                    key={`recent-${c.type}`}
                    item={c}
                    onDragPick={onClose}
                    onTapAdd={onTapAdd}
                    onTouchDragStart={onTouchDragStart}
                  />
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
                      <ComponentRow
                        key={c.type}
                        item={c}
                        onDragPick={onClose}
                        onTapAdd={onTapAdd}
                        onTouchDragStart={onTouchDragStart}
                      />
                    ))}
                  </ul>
                )}
              </section>
            )
          })}

          {!loading && items.length === 0 && !error && (
            <p className="muted">카탈로그가 비어 있습니다</p>
          )}
        </div>

        <style>{`
          .sidebar { display: flex; flex-direction: column;
                     border-right: 1px solid var(--border-subtle);
                     background: var(--surface-panel); min-height: 0; }
          .search { padding: 12px; border-bottom: 1px solid var(--border-subtle);
                    display: flex; align-items: center; gap: 8px; }
          .search input { flex: 1; min-width: 0; }
          .close-btn { display: none; background: none; border: none;
                       font-size: 24px; line-height: 1; padding: 0 4px;
                       color: var(--text-muted); cursor: pointer; }
          .list { flex: 1; overflow-y: auto; padding: 8px 12px; }
          .list h3 { font: var(--weight-semibold) var(--text-2xs)/1 var(--font-sans);
                     text-transform: uppercase; color: var(--text-muted);
                     margin: 14px 0 6px; letter-spacing: var(--tracking-caps);
                     display: flex; align-items: center; gap: 4px; user-select: none; }
          .list h3 .count { margin-left: auto; color: var(--text-faint); font-weight: 400;
                            font-family: var(--font-mono); letter-spacing: 0; }
          .list ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1px; }
          .list li { display: flex; align-items: center; gap: 9px; padding: 7px 9px;
                     border-radius: var(--radius-md); cursor: grab; font-size: var(--text-sm);
                     transition: background var(--dur-fast) var(--ease-out); }
          .list li:hover { background: var(--surface-hover); }
          .badge { display: inline-flex; align-items: center; justify-content: center;
                   width: 22px; height: 22px; border-radius: var(--radius-xs);
                   color: white; font-size: 10px; font-weight: 700; flex-shrink: 0; }
          .icon { width: 20px; height: 20px; flex-shrink: 0; object-fit: contain; }
          .name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .muted { color: var(--text-muted); font-size: var(--text-sm); }
          .error { color: var(--danger); font-size: var(--text-sm); }
          .sidebar-backdrop { display: none; }

          /* 터치 드래그 고스트 */
          .touch-drag-ghost {
            position: fixed;
            pointer-events: none;
            z-index: 200;
            background: var(--surface-panel);
            border: 1.5px solid #5d5bef;
            border-radius: var(--radius-lg);
            padding: 6px 10px;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: var(--text-sm);
            box-shadow: var(--shadow-lg);
            transform: translate(-50%, calc(-100% - 14px));
            white-space: nowrap;
            opacity: 0.95;
          }
          .touch-drag-ghost img { width: 20px; height: 20px; object-fit: contain; }
          .touch-drag-ghost .badge {
            display: inline-flex; align-items: center; justify-content: center;
            width: 22px; height: 22px; border-radius: 4px;
            color: white; font-size: 10px; font-weight: 700; flex-shrink: 0;
          }

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

      {/* 터치 드래그 중 손가락 위에 떠다니는 고스트 */}
      {ghost && (
        <div
          className="touch-drag-ghost"
          style={{ left: ghost.x, top: ghost.y }}
        >
          {ghost.iconUrl ? (
            <img src={ghost.iconUrl} alt="" />
          ) : (
            <span className="badge" style={{ background: ghost.color }}>
              {ghost.label.slice(0, 2).toUpperCase()}
            </span>
          )}
          <span>{ghost.label}</span>
        </div>
      )}
    </>
  )
}
