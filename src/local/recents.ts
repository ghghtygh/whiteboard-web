const KEY = 'whiteboard.catalog.recents.v1'
const MAX = 5

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? (arr as string[]) : []
  } catch {
    return []
  }
}

export const localRecents = {
  list(): string[] {
    return read()
  },
  push(type: string): void {
    const next = [type, ...read().filter((t) => t !== type)].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  },
}
