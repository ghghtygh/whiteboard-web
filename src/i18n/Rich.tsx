import { Fragment, type ReactNode } from 'react'

// 번역 문자열 안의 간단한 서식 태그만 React 요소로 바꾼다. 화이트리스트 밖의 태그나
// 속성은 해석하지 않고 텍스트로 남기므로 dangerouslySetInnerHTML 없이 안전하다.
// 중첩은 지원하지 않는다 — 문장 안 강조/키캡 정도면 충분하다.
const TAGS = ['b', 'strong', 'kbd', 'code'] as const
type Tag = (typeof TAGS)[number]

const PATTERN = new RegExp(`<(${TAGS.join('|')})>(.*?)</\\1>`, 'g')

function renderRich(text: string): ReactNode {
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(PATTERN)) {
    const start = m.index ?? 0
    if (start > last) out.push(text.slice(last, start))
    const Tag = m[1] as Tag
    out.push(<Tag key={start}>{m[2]}</Tag>)
    last = start + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return <Fragment>{out}</Fragment>
}

export function Rich({ text }: { text: string }) {
  return renderRich(text)
}
