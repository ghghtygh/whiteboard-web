/* eslint-disable react-refresh/only-export-components */
import { createContext } from 'react'
import type * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'
import type { BoardDoc } from '@/collab/doc'

export interface CanvasCtx {
  doc: BoardDoc | null
  undoManager: Y.UndoManager | null
  awareness: Awareness | null
}

export const CanvasCtx = createContext<CanvasCtx>({
  doc: null,
  undoManager: null,
  awareness: null,
})
export const CanvasContextProvider = CanvasCtx.Provider
