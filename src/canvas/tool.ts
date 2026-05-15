import { create } from 'zustand'

export type Tool = 'select' | 'group'

interface ToolState {
  tool: Tool
  set: (tool: Tool) => void
  toggleGroup: () => void
}

export const useToolStore = create<ToolState>((set, get) => ({
  tool: 'select',
  set: (tool) => set({ tool }),
  toggleGroup: () => set({ tool: get().tool === 'group' ? 'select' : 'group' }),
}))
