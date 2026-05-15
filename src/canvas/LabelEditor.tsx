import { useEffect, useRef, useState } from 'react'

interface Props {
  initial: string
  maxLength: number
  // 화면(픽셀) 좌표
  screenX: number
  screenY: number
  width: number
  onCommit: (label: string) => void
  onCancel: () => void
}

export function LabelEditor({ initial, maxLength, screenX, screenY, width, onCommit, onCancel }: Props) {
  const [value, setValue] = useState(initial)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  return (
    <input
      ref={ref}
      className="label-editor"
      value={value}
      maxLength={maxLength}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onCommit(value)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        }
      }}
      onBlur={() => onCommit(value)}
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY,
        width,
        zIndex: 10,
        font: 'inherit',
        padding: '4px 6px',
        border: '2px solid #2563eb',
        borderRadius: 4,
        background: 'white',
      }}
    />
  )
}
