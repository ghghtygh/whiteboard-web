import { apiClient, unwrap } from './client'
import type { ComponentType } from '@/types/domain'
import { IS_LOCAL_MODE } from '@/local/mode'
import { LOCAL_CATALOG } from '@/local/catalogSeed'

export async function fetchCatalog(): Promise<ComponentType[]> {
  if (IS_LOCAL_MODE) return LOCAL_CATALOG
  const res = await apiClient.get<{ data: ComponentType[] }>('/catalog')
  return unwrap(res.data)
}

export async function fetchComponent(type: string): Promise<ComponentType> {
  if (IS_LOCAL_MODE) {
    const found = LOCAL_CATALOG.find((c) => c.type === type)
    if (!found) throw new Error(`UNKNOWN_COMPONENT_TYPE: ${type}`)
    return found
  }
  const res = await apiClient.get<{ data: ComponentType }>(`/catalog/${type}`)
  return unwrap(res.data)
}

export function iconUrl(type: string): string {
  return `/api/v1/icons/${type}.svg`
}
