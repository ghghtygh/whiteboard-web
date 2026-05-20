import { create } from 'zustand'
import { fetchCatalog } from '@/api/catalog'
import type { ComponentType } from '@/types/domain'

interface CatalogState {
  items: ComponentType[]
  loaded: boolean
  loading: boolean
  error: string | null
  load: () => Promise<void>
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  items: [],
  loaded: false,
  loading: false,
  error: null,
  load: async () => {
    if (get().loading || get().loaded) return
    set({ loading: true, error: null })
    try {
      const items = await fetchCatalog()
      set({ items, loaded: true })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load catalog' })
    } finally {
      set({ loading: false })
    }
  },
}))
