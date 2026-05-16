import { useRemoteAwareness, type AwarenessState } from '@/collab/awareness'
import type { Awareness } from 'y-protocols/awareness'

interface Props {
  awareness: Awareness | null
}

function initial(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase()
}

export function PresenceBadges({ awareness }: Props) {
  const states = useRemoteAwareness(awareness)
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
