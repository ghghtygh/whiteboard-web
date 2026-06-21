import { useEffect, useRef, useState } from 'react'
import type { AwarenessState } from './awareness'

/**
 * awareness 상태가 잠깐 사라져도 graceMs 동안 마지막 값을 유지한다.
 * y-websocket 의 awareness 는 재연결·메시지 누락 등으로 순간적으로 비었다 다시 채워질 수 있는데,
 * 그대로 렌더하면 원격 커서/이름이 깜빡인다. grace 동안 유지해 깜빡임을 없앤다.
 */
export function useStableAwareness(
  states: Map<number, AwarenessState>,
  graceMs = 4000,
): Map<number, AwarenessState> {
  const [stable, setStable] = useState(states)
  // clientId -> { 마지막 상태, 마지막으로 본 시각 }
  const seenRef = useRef(new Map<number, { state: AwarenessState; t: number }>())

  // 새 states 가 올 때마다 병합 — 현재 있는 건 그대로, 사라진 건 grace 내면 유지.
  useEffect(() => {
    const now = Date.now()
    states.forEach((s, id) => seenRef.current.set(id, { state: s, t: now }))
    const next = new Map<number, AwarenessState>()
    seenRef.current.forEach((v, id) => {
      if (states.has(id)) next.set(id, states.get(id)!)
      else if (now - v.t < graceMs) next.set(id, v.state)
      else seenRef.current.delete(id)
    })
    setStable(next)
  }, [states, graceMs])

  // states 변화가 없어도 grace 만료된 항목을 주기적으로 정리한다.
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now()
      setStable((prev) => {
        let changed = false
        const next = new Map(prev)
        seenRef.current.forEach((v, id) => {
          if (!states.has(id) && now - v.t >= graceMs) {
            next.delete(id)
            seenRef.current.delete(id)
            changed = true
          }
        })
        return changed ? next : prev
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [states, graceMs])

  return stable
}
