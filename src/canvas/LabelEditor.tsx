import { useEffect, useRef, useState } from 'react'

interface Props {
  initial: string
  maxLength: number
  // 화면(픽셀) 좌표
  screenX: number
  screenY: number
  width: number
  multiline?: boolean
  onCommit: (label: string) => void
  onCancel: () => void
}

export function LabelEditor({
  initial,
  maxLength,
  screenX,
  screenY,
  width,
  multiline = false,
  onCommit,
  onCancel,
}: Props) {
  const [value, setValue] = useState(initial)
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  const common = {
    ref,
    value,
    maxLength,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValue(e.target.value),
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === 'Enter') {
        // 멀티라인: Enter = 줄바꿈, ⌘/Ctrl+Enter = 커밋
        if (multiline && !(e.metaKey || e.ctrlKey)) return
        e.preventDefault()
        onCommit(value)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    },
    onBlur: () => onCommit(value),
    style: {
      position: 'absolute' as const,
      left: screenX,
      top: screenY,
      width,
      zIndex: 10,
      font: 'inherit',
      padding: '4px 6px',
      border: '2px solid #5d5bef',
      borderRadius: 6,
      background: 'white',
      resize: 'none' as const,
      lineHeight: 1.35,
    },
  }

  if (multiline) {
    return <textarea {...common} rows={3} />
  }
  return <input {...common} />
}
