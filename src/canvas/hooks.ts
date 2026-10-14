import { useEffect, useState } from 'react'
import * as Y from 'yjs'
import type { BoardDoc } from '@/collab/doc'
import type { Edge, Group, Node } from '@/types/domain'
import { track } from '@/metrics/track'
import { readEdges, readGroups, readNodes } from './ops'

export function useNodesSnapshot(doc: BoardDoc | null): Node[] {
  const [snap, setSnap] = useState<Node[]>([])
  useEffect(() => {
    if (!doc) {
      setSnap([])
      return
    }
    const refresh = () => setSnap(readNodes(doc))
    refresh()
    doc.nodes.observeDeep(refresh)
    return () => doc.nodes.unobserveDeep(refresh)
  }, [doc])
  return snap
}

export function useEdgesSnapshot(doc: BoardDoc | null): Edge[] {
  const [snap, setSnap] = useState<Edge[]>([])
  useEffect(() => {
    if (!doc) {
      setSnap([])
      return
    }
    const refresh = () => setSnap(readEdges(doc))
    refresh()
    doc.edges.observeDeep(refresh)
    return () => doc.edges.unobserveDeep(refresh)
  }, [doc])
  return snap
}

export function useGroupsSnapshot(doc: BoardDoc | null): Group[] {
  const [snap, setSnap] = useState<Group[]>([])
  useEffect(() => {
    if (!doc) {
      setSnap([])
      return
    }
    const refresh = () => setSnap(readGroups(doc))
    refresh()
    doc.groups.observeDeep(refresh)
    return () => doc.groups.unobserveDeep(refresh)
  }, [doc])
  return snap
}

export function useUndoManager(doc: BoardDoc | null): Y.UndoManager | null {
  const [um, setUm] = useState<Y.UndoManager | null>(null)
  useEffect(() => {
    if (!doc) {
      setUm(null)
      return
    }
    const manager = new Y.UndoManager([doc.nodes, doc.edges, doc.groups], {
      captureTimeout: 350,
    })
    // 단축키·툴바 어느 쪽으로 실행해도 한 곳에서 집계된다.
    const onPopped = (e: { type: 'undo' | 'redo' }) => track(e.type)
    manager.on('stack-item-popped', onPopped)
    setUm(manager)
    return () => {
      manager.off('stack-item-popped', onPopped)
      manager.destroy()
      setUm(null)
    }
  }, [doc])
  return um
}
