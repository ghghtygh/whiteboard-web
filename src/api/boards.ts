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
      // 모르는 id로 직접 접근(예: 공유 링크)은 목록에 유령 보드를 만들지 않고
      // 임시 객체만 돌려준다. 이름 변경 등 명시적 행동을 할 때 비로소 저장된다.
      return localBoards.transient(id)
    }
    return board
  }
  const res = await apiClient.get<{ data: Board }>(`/boards/${id}`)
  return unwrap(res.data)
}

export async function renameBoard(id: string, title: string): Promise<Board> {
  if (!isBackendActive()) {
    // 기존 보드면 rename, 임시 보드(아직 미저장)면 이때 처음 저장한다.
    return localBoards.rename(id, title) ?? localBoards.upsert(id, title)
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
