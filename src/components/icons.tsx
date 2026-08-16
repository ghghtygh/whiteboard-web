// 공용 UI 아이콘 세트 — 이모지/유니코드 글리프 대신 사용.
// 24x24 뷰박스, 1.75 stroke, round cap/join 으로 톤을 통일한다.
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Svg({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function UndoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 7 3 11l4 4" />
      <path d="M3 11h11a6 6 0 0 1 0 12h-2" />
    </Svg>
  )
}

export function RedoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m17 7 4 4-4 4" />
      <path d="M21 11H10a6 6 0 0 0 0 12h2" />
    </Svg>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M10 11v6M14 11v6" />
    </Svg>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  )
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </Svg>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  )
}

export function MinusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
    </Svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12 5 5L20 7" />
    </Svg>
  )
}
