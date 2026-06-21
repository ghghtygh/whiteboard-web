import { useEffect, useRef, useState } from 'react'
import { useRemoteAwareness, type AwarenessState } from '@/collab/awareness'
import type { Awareness } from 'y-protocols/awareness'

interface Props {
  awareness: Awareness | null
}

function initial(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase()
}

/**
 * 프레즌스 배지를 안정화한다.
 * - WS 가 끊겼다 붙을 때 y-websocket 이 원격 awareness 를 잠깐 비우는데, 그대로 그리면
 *   이름(점)이 사라졌다 나타나며 깜빡인다. peer 가 사라져도 graceMs 동안 유지하고
 *   그 안에 다시 보이면 제거를 취소한다.
 * - 배지는 이름/색만 쓰므로, 커서 이동(awareness change 가 초당 수십 번)에는 리렌더하지
 *   않고 join/leave/이름·색 변경 때만 갱신한다.
 */
function useStablePresence(
  states: Map<number, AwarenessState>,
  graceMs = 4000,
): Map<number, AwarenessState> {
  const shownRef = useRef<Map<number, AwarenessState>>(new Map())
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const [, force] = useState(0)
  const rerender = () => force((n) => n + 1)

  useEffect(() => {
    let changed = false
    // 현재 보이는 peer: 즉시 표시하고 제거 타이머 취소. 이름/색이 바뀐 경우에만 리렌더.
    states.forEach((s, id) => {
      const t = timers.current.get(id)
      if (t) {
        clearTimeout(t)
        timers.current.delete(id)
      }
      const prev = shownRef.current.get(id)
      shownRef.current.set(id, s)
      if (!prev || prev.user.name !== s.user.name || prev.user.color !== s.user.color) {
        changed = true
      }
    })
    // 더 이상 안 보이는 peer: graceMs 뒤 제거 예약(그 안에 다시 보이면 위에서 취소됨).
    shownRef.current.forEach((_, id) => {
      if (!states.has(id) && !timers.current.has(id)) {
        const timer = setTimeout(() => {
          timers.current.delete(id)
          shownRef.current.delete(id)
          rerender()
        }, graceMs)
        timers.current.set(id, timer)
      }
    })
    if (changed) rerender()
  }, [states, graceMs])

  useEffect(() => {
    const t = timers.current
    return () => {
      t.forEach(clearTimeout)
      t.clear()
    }
  }, [])

  return shownRef.current
}

export function PresenceBadges({ awareness }: Props) {
  const raw = useRemoteAwareness(awareness)
  const states = useStablePresence(raw)
  if (states.size === 0) return null
  const list = [...states.entries()]
  return (
    <div className="presence">
      {list.map(([id, s]: [number, AwarenessState]) => (
        <span
          key={id}
          className="dot"
          title={s.user.name}
          style={{ background: s.user.color }}
        >
          {initial(s.user.name)}
        </span>
      ))}
      <style>{`
        .presence { display: flex; gap: -6px; }
        .presence .dot {
          width: 26px; height: 26px; border-radius: 50%;
          color: white; font-size: 11px; font-weight: 600;
          display: inline-flex; align-items: center; justify-content: center;
          border: 2px solid white; box-shadow: 0 0 0 1px rgba(0,0,0,0.08);
          margin-left: -6px;
        }
        .presence .dot:first-child { margin-left: 0; }
      `}</style>
    </div>
  )
}
