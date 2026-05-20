import { nanoid } from 'nanoid'
import type { Board } from '@/types/domain'

const KEY = 'whiteboard.boards.v1'
const LAST_OPENED_KEY = 'whiteboard.lastOpenedBoardId.v1'
const OWNER_ID = 'local-guest'

function readAll(): Board[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Board[]) : []
  } catch {
    return []
  }
}

function writeAll(boards: Board[]) {
  localStorage.setItem(KEY, JSON.stringify(boards))
}

export const localBoards = {
  list(): Board[] {
    return readAll().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  },

  get(id: string): Board | null {
    return readAll().find((b) => b.id === id) ?? null
  },

  create(title: string): Board {
    const now = new Date().toISOString()
    const board: Board = {
      id: nanoid(12),
      title: title.trim() || 'New board',
      ownerId: OWNER_ID,
      createdAt: now,
      updatedAt: now,
    }
    writeAll([board, ...readAll()])
    return board
  },

  rename(id: string, title: string): Board | null {
    const all = readAll()
    const idx = all.findIndex((b) => b.id === id)
    if (idx === -1) return null
    const next: Board = { ...all[idx]!, title, updatedAt: new Date().toISOString() }
    all[idx] = next
    writeAll(all)
    return next
  },

  touch(id: string): void {
    const all = readAll()
    const idx = all.findIndex((b) => b.id === id)
    if (idx === -1) return
    all[idx] = { ...all[idx]!, updatedAt: new Date().toISOString() }
    writeAll(all)
  },

  delete(id: string): void {
    writeAll(readAll().filter((b) => b.id !== id))
    if (localStorage.getItem(LAST_OPENED_KEY) === id) {
      localStorage.removeItem(LAST_OPENED_KEY)
    }
  },

  markOpened(id: string): void {
    localStorage.setItem(LAST_OPENED_KEY, id)
    this.touch(id)
  },

  lastOpenedId(): string | null {
    const id = localStorage.getItem(LAST_OPENED_KEY)
    if (!id) return null
    return this.get(id) ? id : null
  },

  // 첫 방문 시: 마지막 보드 → 최근 보드 → 새 기본 보드 순으로 시도
  lastOpenedOrDefault(): string {
    const last = this.lastOpenedId()
    if (last) return last
    const all = this.list()
    if (all.length > 0) return all[0]!.id
    return this.create('Untitled whiteboard').id
  },
}
