import { useEffect, useState } from 'react'

/**
 * 동기화 연결 상태의 짧은 깜빡임을 막는다.
 * - 연결되면 즉시 true.
 * - 끊기면 graceMs 동안 기다렸다가, 그 사이 다시 연결되지 않을 때만 false.
 *
 * y-websocket 은 정상 동작 중에도 주기적 재연결로 status('connected'↔'disconnected')가
 * 잠깐씩 흔들린다. 이 값을 그대로 표시하면 '연결 중…'↔'동기화 중'이 깜빡이므로 안정화한다.
 */
export function useStableConnected(connected: boolean, graceMs = 4000): boolean {
  const [stable, setStable] = useState(connected)
  useEffect(() => {
    if (connected) {
      setStable(true)
      return
    }
    const t = setTimeout(() => setStable(false), graceMs)
    return () => clearTimeout(t)
  }, [connected, graceMs])
  return stable
}
