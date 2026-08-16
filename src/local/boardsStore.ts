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

  // 저장하지 않는 임시 보드 객체. 모르는 boardId(예: 공유 링크) 로 직접 들어왔을 때,
  // 목록에 유령 보드를 쌓지 않으려고 메타데이터만 즉석에서 만들어 돌려준다.
  // 실제 내용은 boardId 기준 IndexedDB(Yjs)로 동기화되고, 이름 변경 등 명시적 행동 시 저장된다.
  transient(id: string): Board {
    const now = new Date().toISOString()
    return { id, title: 'Untitled board', ownerId: OWNER_ID, createdAt: now, updatedAt: now }
  },

  // 주어진 id 를 유지한 채 보드를 저장(upsert). 임시 보드를 이름 변경으로 처음 저장할 때 사용.
  upsert(id: string, title: string): Board {
    const now = new Date().toISOString()
    const all = readAll().filter((b) => b.id !== id)
    const board: Board = {
      id,
      title: title.trim() || 'New board',
      ownerId: OWNER_ID,
      createdAt: now,
      updatedAt: now,
    }
    writeAll([board, ...all])
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
