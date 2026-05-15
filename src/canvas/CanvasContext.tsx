/* eslint-disable react-refresh/only-export-components */
import { createContext } from 'react'
import type * as Y from 'yjs'
import type { BoardDoc } from '@/collab/doc'

export interface CanvasCtx {
  doc: BoardDoc | null
  undoManager: Y.UndoManager | null
}

export const CanvasCtx = createContext<CanvasCtx>({ doc: null, undoManager: null })
export const CanvasContextProvider = CanvasCtx.Provider
