import { apiClient, unwrap } from './client'
import type { Board, BoardMember, MemberRole } from '@/types/domain'
import { isBackendActive } from '@/store/auth'
import { localBoards } from '@/local/boardsStore'

export async function listBoards(): Promise<Board[]> {
  if (!isBackendActive()) return localBoards.list()
  const res = await apiClient.get<{ data: Board[] }>('/boards')
  return unwrap(res.data)
}

export async function createBoard(title: string): Promise<Board> {
  if (!isBackendActive()) return localBoards.create(title)
  const res = await apiClient.post<{ data: Board }>('/boards', { title })
  return unwrap(res.data)
}

export async function getBoard(id: string): Promise<Board> {
  if (!isBackendActive()) {
    const board = localBoards.get(id)
    if (!board) {
      // 처음 직접 URL로 접근하는 경우 자동 생성해 UX를 부드럽게 한다.
      return localBoards.create('New board')
    }
    return board
  }
  const res = await apiClient.get<{ data: Board }>(`/boards/${id}`)
  return unwrap(res.data)
}

export async function renameBoard(id: string, title: string): Promise<Board> {
  if (!isBackendActive()) {
    const next = localBoards.rename(id, title)
    if (!next) throw new Error('BOARD_NOT_FOUND')
    return next
  }
  const res = await apiClient.patch<{ data: Board }>(`/boards/${id}`, { title })
  return unwrap(res.data)
}

export async function deleteBoard(id: string): Promise<void> {
  if (!isBackendActive()) {
    localBoards.delete(id)
    return
  }
  await apiClient.delete(`/boards/${id}`)
}

export async function listMembers(boardId: string): Promise<BoardMember[]> {
  if (!isBackendActive()) return []
  const res = await apiClient.get<{ data: BoardMember[] }>(`/boards/${boardId}/members`)
  return unwrap(res.data)
}

export async function addMember(
  boardId: string,
  userId: string,
  role: MemberRole,
): Promise<BoardMember> {
  if (!isBackendActive()) throw new Error('NOT_AVAILABLE_IN_LOCAL_MODE')
  const res = await apiClient.post<{ data: BoardMember }>(`/boards/${boardId}/members`, {
    userId,
    role,
  })
  return unwrap(res.data)
}

export async function updateMemberRole(
  boardId: string,
  userId: string,
  role: MemberRole,
): Promise<BoardMember> {
  if (!isBackendActive()) throw new Error('NOT_AVAILABLE_IN_LOCAL_MODE')
  const res = await apiClient.patch<{ data: BoardMember }>(
    `/boards/${boardId}/members/${userId}`,
    { role },
  )
  return unwrap(res.data)
}

export async function removeMember(boardId: string, userId: string): Promise<void> {
  if (!isBackendActive()) throw new Error('NOT_AVAILABLE_IN_LOCAL_MODE')
  await apiClient.delete(`/boards/${boardId}/members/${userId}`)
}

export async function exportBoard(id: string): Promise<Blob> {
  if (!isBackendActive()) throw new Error('NOT_AVAILABLE_IN_LOCAL_MODE')
  const res = await apiClient.get(`/boards/${id}/export`, { responseType: 'blob' })
  return res.data
}

export async function importBoard(id: string, file: Blob): Promise<void> {
  if (!isBackendActive()) throw new Error('NOT_AVAILABLE_IN_LOCAL_MODE')
  const form = new FormData()
  form.append('file', file)
  await apiClient.post(`/boards/${id}/import`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
