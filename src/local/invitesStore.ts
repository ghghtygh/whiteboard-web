import { nanoid } from 'nanoid'
import type { MemberRole } from '@/types/domain'

export interface PendingInvite {
  id: string
  boardId: string
  email: string
  role: MemberRole
  createdAt: string
}

const KEY = 'whiteboard.invites.v1'

function readAll(): PendingInvite[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as PendingInvite[]) : []
  } catch {
    return []
  }
}

function writeAll(invites: PendingInvite[]) {
  localStorage.setItem(KEY, JSON.stringify(invites))
}

// 백엔드가 없는 동안엔 초대 정보를 localStorage 에 모아둔다.
// 백엔드 도착 후 일괄 발송하거나, 사용자 본인이 링크를 직접 공유하는 용도.
export const localInvites = {
  listFor(boardId: string): PendingInvite[] {
    return readAll().filter((i) => i.boardId === boardId)
  },

  add(boardId: string, email: string, role: MemberRole): PendingInvite {
    const invite: PendingInvite = {
      id: nanoid(10),
      boardId,
      email: email.trim().toLowerCase(),
      role,
      createdAt: new Date().toISOString(),
    }
    writeAll([invite, ...readAll()])
    return invite
  },

  remove(id: string): void {
    writeAll(readAll().filter((i) => i.id !== id))
  },
}
