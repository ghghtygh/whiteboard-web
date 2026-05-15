import { useContext } from 'react'
import { CanvasCtx, type CanvasCtx as CanvasCtxType } from './CanvasContext'

export function useCanvasContext(): CanvasCtxType {
  return useContext(CanvasCtx)
}
