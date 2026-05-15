import { apiClient, unwrap } from './client'
import type { AuthTokens, User } from '@/types/domain'

interface LoginResponse {
  tokens: AuthTokens
  user: User
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await apiClient.post<{ data: LoginResponse }>('/auth/login', { email, password })
  return unwrap(res.data)
}

export async function signup(input: { email: string; name: string; password: string }): Promise<User> {
  const res = await apiClient.post<{ data: User }>('/auth/signup', input)
  return unwrap(res.data)
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const res = await apiClient.post<{ data: AuthTokens }>('/auth/refresh', { refreshToken })
  return unwrap(res.data)
}

export async function me(): Promise<User> {
  const res = await apiClient.get<{ data: User }>('/auth/me')
  return unwrap(res.data)
}
