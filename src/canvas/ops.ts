import * as Y from 'yjs'
import { nanoid } from 'nanoid'
import type { BoardDoc } from '@/collab/doc'
import type { Anchor, Edge, EdgeDirection, EdgeStyle, Group, Node } from '@/types/domain'
import { NODE_H, NODE_W, snap } from './geometry'

function mapToNode(map: Y.Map<unknown>): Node {
  return {
    id: map.get('id') as string,
    type: map.get('type') as string,
    label: (map.get('label') as string) ?? '',
    x: map.get('x') as number,
    y: map.get('y') as number,
    groupId: (map.get('groupId') as string | null) ?? null,
    catalogVersion: (map.get('catalogVersion') as number) ?? 1,
  }
}

function mapToEdge(map: Y.Map<unknown>): Edge {
  return {
    id: map.get('id') as string,
    from: map.get('from') as string,
    to: map.get('to') as string,
    fromAnchor: (map.get('fromAnchor') as Anchor | null) ?? null,
    toAnchor: (map.get('toAnchor') as Anchor | null) ?? null,
    label: (map.get('label') as string | null) ?? null,
    style: (map.get('style') as EdgeStyle) ?? 'solid',
    direction: (map.get('direction') as EdgeDirection) ?? 'forward',
  }
}

function mapToGroup(map: Y.Map<unknown>): Group {
  return {
    id: map.get('id') as string,
    label: (map.get('label') as string | null) ?? null,
    x: map.get('x') as number,
    y: map.get('y') as number,
    width: map.get('width') as number,
    height: map.get('height') as number,
    color: (map.get('color') as string | null) ?? null,
  }
}

export function readNodes(doc: BoardDoc): Node[] {
  const out: Node[] = []
  doc.nodes.forEach((m) => out.push(mapToNode(m)))
  return out
}

export function readEdges(doc: BoardDoc): Edge[] {
  const out: Edge[] = []
  doc.edges.forEach((m) => out.push(mapToEdge(m)))
  return out
}

export function readGroups(doc: BoardDoc): Group[] {
  const out: Group[] = []
  doc.groups.forEach((m) => out.push(mapToGroup(m)))
  return out
}

export function createNode(
  doc: BoardDoc,
  type: string,
  x: number,
  y: number,
  catalogVersion = 1,
  origin?: unknown,
): string {
  const id = nanoid(10)
  doc.ydoc.transact(() => {
    const ymap = new Y.Map<unknown>()
    ymap.set('id', id)
    ymap.set('type', type)
    ymap.set('label', '')
    ymap.set('x', snap(x - NODE_W / 2))
    ymap.set('y', snap(y - NODE_H / 2))
    ymap.set('groupId', containingGroup(doc, x, y))
    ymap.set('catalogVersion', catalogVersion)
    doc.nodes.set(id, ymap)
  }, origin)
  return id
}

export function moveNode(
  doc: BoardDoc,
  id: string,
  x: number,
  y: number,
  origin?: unknown,
): void {
  const map = doc.nodes.get(id)
  if (!map) return
  doc.ydoc.transact(() => {
    map.set('x', snap(x))
    map.set('y', snap(y))
    // 노드 중심이 어떤 그룹에 들어가면 자동 편입
    const cx = (map.get('x') as number) + NODE_W / 2
    const cy = (map.get('y') as number) + NODE_H / 2
    const gid = containingGroup(doc, cx, cy)
    if ((map.get('groupId') as string | null) !== gid) {
      map.set('groupId', gid)
    }
  }, origin)
}

export function setNodeLabel(doc: BoardDoc, id: string, label: string, origin?: unknown): void {
  const map = doc.nodes.get(id)
  if (!map) return
  doc.ydoc.transact(() => {
    map.set('label', label.slice(0, 50))
  }, origin)
}

export function deleteNodes(doc: BoardDoc, ids: string[], origin?: unknown): void {
  doc.ydoc.transact(() => {
    for (const id of ids) {
      doc.nodes.delete(id)
      // 끊긴 엣지도 제거
      doc.edges.forEach((edge, edgeId) => {
        if (edge.get('from') === id || edge.get('to') === id) {
          doc.edges.delete(edgeId)
        }
      })
    }
  }, origin)
}

export function createEdge(
  doc: BoardDoc,
  from: string,
  to: string,
  fromAnchor: Anchor | null,
  toAnchor: Anchor | null,
  origin?: unknown,
): string | null {
  if (from === to) return null
  const id = nanoid(10)
  doc.ydoc.transact(() => {
    const ymap = new Y.Map<unknown>()
    ymap.set('id', id)
    ymap.set('from', from)
    ymap.set('to', to)
    ymap.set('fromAnchor', fromAnchor)
    ymap.set('toAnchor', toAnchor)
    ymap.set('label', null)
    ymap.set('style', 'solid' satisfies EdgeStyle)
    ymap.set('direction', 'forward' satisfies EdgeDirection)
    doc.edges.set(id, ymap)
  }, origin)
  return id
}

export function setEdgeStyle(doc: BoardDoc, id: string, style: EdgeStyle, origin?: unknown): void {
  const map = doc.edges.get(id)
  if (!map) return
  doc.ydoc.transact(() => map.set('style', style), origin)
}

export function setEdgeDirection(
  doc: BoardDoc,
  id: string,
  direction: EdgeDirection,
  origin?: unknown,
): void {
  const map = doc.edges.get(id)
  if (!map) return
  doc.ydoc.transact(() => map.set('direction', direction), origin)
}

export function setEdgeLabel(doc: BoardDoc, id: string, label: string, origin?: unknown): void {
  const map = doc.edges.get(id)
  if (!map) return
  doc.ydoc.transact(() => map.set('label', label.slice(0, 30) || null), origin)
}

export function deleteEdges(doc: BoardDoc, ids: string[], origin?: unknown): void {
  doc.ydoc.transact(() => {
    for (const id of ids) doc.edges.delete(id)
  }, origin)
}

export function createGroup(
  doc: BoardDoc,
  x: number,
  y: number,
  width: number,
  height: number,
  origin?: unknown,
): string {
  const id = nanoid(10)
  doc.ydoc.transact(() => {
    const ymap = new Y.Map<unknown>()
    ymap.set('id', id)
    ymap.set('label', null)
    ymap.set('x', snap(x))
    ymap.set('y', snap(y))
    ymap.set('width', Math.max(60, snap(width)))
    ymap.set('height', Math.max(60, snap(height)))
    ymap.set('color', null)
    doc.groups.set(id, ymap)
    // 새로 만든 그룹이 기존 노드를 포함하면 편입
    const gx = snap(x)
    const gy = snap(y)
    const gw = Math.max(60, snap(width))
    const gh = Math.max(60, snap(height))
    doc.nodes.forEach((nm) => {
      const nx = (nm.get('x') as number) + NODE_W / 2
      const ny = (nm.get('y') as number) + NODE_H / 2
      if (nx >= gx && nx <= gx + gw && ny >= gy && ny <= gy + gh) {
        nm.set('groupId', id)
      }
    })
  }, origin)
  return id
}

export function moveGroup(
  doc: BoardDoc,
  id: string,
  dx: number,
  dy: number,
  origin?: unknown,
): void {
  const map = doc.groups.get(id)
  if (!map) return
  doc.ydoc.transact(() => {
    map.set('x', snap((map.get('x') as number) + dx))
    map.set('y', snap((map.get('y') as number) + dy))
    // 자식 노드들도 함께 이동
    doc.nodes.forEach((nm) => {
      if (nm.get('groupId') === id) {
        nm.set('x', snap((nm.get('x') as number) + dx))
        nm.set('y', snap((nm.get('y') as number) + dy))
      }
    })
  }, origin)
}

export function setGroupLabel(doc: BoardDoc, id: string, label: string, origin?: unknown): void {
  const map = doc.groups.get(id)
  if (!map) return
  doc.ydoc.transact(() => map.set('label', label.slice(0, 30) || null), origin)
}

export function deleteGroups(doc: BoardDoc, ids: string[], origin?: unknown): void {
  doc.ydoc.transact(() => {
    for (const id of ids) {
      doc.groups.delete(id)
      doc.nodes.forEach((nm) => {
        if (nm.get('groupId') === id) nm.set('groupId', null)
      })
    }
  }, origin)
}

function containingGroup(doc: BoardDoc, cx: number, cy: number): string | null {
  let found: string | null = null
  doc.groups.forEach((gm, gid) => {
    const gx = gm.get('x') as number
    const gy = gm.get('y') as number
    const gw = gm.get('width') as number
    const gh = gm.get('height') as number
    if (cx >= gx && cx <= gx + gw && cy >= gy && cy <= gy + gh) {
      found = gid
    }
  })
  return found
}
