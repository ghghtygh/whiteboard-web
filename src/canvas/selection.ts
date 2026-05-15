import { create } from 'zustand'

export type Selectable = { kind: 'node' | 'edge' | 'group'; id: string }

interface SelectionState {
  nodes: Set<string>
  edges: Set<string>
  groups: Set<string>
  isSelected: (kind: Selectable['kind'], id: string) => boolean
  set: (items: Selectable[]) => void
  toggle: (kind: Selectable['kind'], id: string, additive: boolean) => void
  clear: () => void
}

function setOf(items: Selectable[], kind: Selectable['kind']): Set<string> {
  return new Set(items.filter((i) => i.kind === kind).map((i) => i.id))
}

export const useSelection = create<SelectionState>((set, get) => ({
  nodes: new Set(),
  edges: new Set(),
  groups: new Set(),
  isSelected: (kind, id) => {
    const s = get()
    if (kind === 'node') return s.nodes.has(id)
    if (kind === 'edge') return s.edges.has(id)
    return s.groups.has(id)
  },
  set: (items) =>
    set({
      nodes: setOf(items, 'node'),
      edges: setOf(items, 'edge'),
      groups: setOf(items, 'group'),
    }),
  toggle: (kind, id, additive) => {
    const cur = get()
    if (!additive) {
      set({
        nodes: kind === 'node' ? new Set([id]) : new Set(),
        edges: kind === 'edge' ? new Set([id]) : new Set(),
        groups: kind === 'group' ? new Set([id]) : new Set(),
      })
      return
    }
    const key = kind === 'node' ? 'nodes' : kind === 'edge' ? 'edges' : 'groups'
    const next = new Set(cur[key])
    if (next.has(id)) next.delete(id)
    else next.add(id)
    set({ [key]: next } as Partial<SelectionState>)
  },
  clear: () => set({ nodes: new Set(), edges: new Set(), groups: new Set() }),
}))
