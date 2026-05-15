import * as Y from 'yjs'

// 스펙 §3.6 BoardDoc 구조
export interface BoardDoc {
  ydoc: Y.Doc
  nodes: Y.Map<Y.Map<unknown>>
  edges: Y.Map<Y.Map<unknown>>
  groups: Y.Map<Y.Map<unknown>>
}

export function createBoardDoc(): BoardDoc {
  const ydoc = new Y.Doc()
  return {
    ydoc,
    nodes: ydoc.getMap('nodes'),
    edges: ydoc.getMap('edges'),
    groups: ydoc.getMap('groups'),
  }
}
