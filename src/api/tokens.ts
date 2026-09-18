import { apiClient, unwrap } from './client'
import type { IssuedPersonalAccessToken, PersonalAccessToken } from '@/types/domain'

/** MCP 서버 등 외부 클라이언트가 쓰는 개인용 API 토큰(PAT) 관리. 원격 모드 전용. */
export async function listTokens(): Promise<PersonalAccessToken[]> {
  const res = await apiClient.get<{ data: PersonalAccessToken[] }>('/auth/tokens')
  return unwrap(res.data)
}

export async function createToken(name: string): Promise<IssuedPersonalAccessToken> {
  const res = await apiClient.post<{ data: IssuedPersonalAccessToken }>('/auth/tokens', { name })
  return unwrap(res.data)
}

export async function revokeToken(id: string): Promise<void> {
  await apiClient.delete(`/auth/tokens/${id}`)
}
