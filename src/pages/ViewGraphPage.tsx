import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import * as Y from 'yjs'
import { createBoardDoc, type BoardDoc } from '@/collab/doc'
import { CanvasContextProvider } from '@/canvas/CanvasContext'
import { Canvas } from '@/canvas/Canvas'
import { useUndoManager } from '@/canvas/hooks'
import { readEdges, readGroups, readNodes } from '@/canvas/ops'
import { decodeGraph, encodeGraph, emptyGraph, type GraphSnapshot } from '@/board/graphCodec'

// 서버에 저장되지 않는 1회용 그래프 뷰어. /view/:token 의 token 이 그래프 전체 내용이다
// (whiteboard-mcp 가 만든 링크, 또는 이 페이지 자체가 편집 후 다시 인코드한 링크).
// URL 을 아는 사람만 열 수 있고, 다른 곳에서 이 그래프를 나열/검색할 방법은 없다.
export function ViewGraphPage() {
  const { token } = useParams<{ token: string }>()
  const [doc, setDoc] = useState<BoardDoc | null>(null)
  const [decodeError, setDecodeError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const undoManager = useUndoManager(doc)

  useEffect(() => {
    let graph: GraphSnapshot
    try {
      graph = token ? decodeGraph(token) : emptyGraph()
    } catch (err) {
      setDecodeError(err instanceof Error ? err.message : 'This graph link is invalid or corrupted.')
      return
    }
    const next = createBoardDoc()
    next.ydoc.transact(() => {
      for (const node of graph.nodes) {
        const map = new Y.Map<unknown>()
        for (const [key, value] of Object.entries(node)) map.set(key, value)
        next.nodes.set(node.id, map)
      }
      for (const edge of graph.edges) {
        const map = new Y.Map<unknown>()
        for (const [key, value] of Object.entries(edge)) map.set(key, value)
        next.edges.set(edge.id, map)
      }
      for (const group of graph.groups) {
        const map = new Y.Map<unknown>()
        for (const [key, value] of Object.entries(group)) map.set(key, value)
        next.groups.set(group.id, map)
      }
    })
    setDoc(next)
    return () => {
      next.ydoc.destroy()
      setDoc(null)
    }
  }, [token])

  // 편집하면 주소창 URL 을 항상 현재 상태와 맞춘다 — 새로고침해도 편집한 그대로 열린다.
  useEffect(() => {
    if (!doc) return
    const sync = () => {
      const next = encodeGraph({ nodes: readNodes(doc), edges: readEdges(doc), groups: readGroups(doc) })
      window.history.replaceState(null, '', `/view/${next}`)
    }
    doc.nodes.observeDeep(sync)
    doc.edges.observeDeep(sync)
    doc.groups.observeDeep(sync)
    return () => {
      doc.nodes.unobserveDeep(sync)
      doc.edges.unobserveDeep(sync)
      doc.groups.unobserveDeep(sync)
    }
  }, [doc])

  const ctxValue = useMemo(() => ({ doc, undoManager, awareness: null }), [doc, undoManager])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard 사용 불가 — 조용히 무시.
    }
  }

  if (decodeError) {
    return (
      <div className="view-error">
        <p>{decodeError}</p>
        <style>{`
          .view-error { height: 100%; display: flex; align-items: center; justify-content: center;
                        color: var(--text-muted); padding: 24px; text-align: center; }
        `}</style>
      </div>
    )
  }

  return (
    <CanvasContextProvider value={ctxValue}>
      <div className="view-shell">
        <header className="view-topbar">
          <span className="badge">Temporary view — nothing is saved on any server</span>
          <div className="spacer" />
          <button type="button" onClick={copyLink}>{copied ? 'Copied' : 'Copy link'}</button>
        </header>
        <div className="view-canvas-host">
          <Canvas boardId="view" doc={doc} />
        </div>

        <style>{`
          .view-shell { display: flex; flex-direction: column; height: 100%; }
          .view-topbar { display: flex; align-items: center; gap: 12px; padding: 8px 14px;
                         border-bottom: 1px solid var(--border-subtle); background: var(--surface-panel);
                         min-height: var(--topbar-h); }
          .badge { font-size: var(--text-sm); color: var(--text-muted); }
          .spacer { flex: 1; }
          .view-canvas-host { flex: 1; position: relative; min-height: 0; background: var(--surface-canvas); }
        `}</style>
      </div>
    </CanvasContextProvider>
  )
}
