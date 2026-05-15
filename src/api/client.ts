import axios, { AxiosError } from 'axios'
import { useAuthStore } from '@/store/auth'
import type { ApiError } from '@/types/domain'

export const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 10_000,
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ error?: ApiError }>) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    const apiErr = err.response?.data?.error
    if (apiErr) {
      return Promise.reject(new Error(apiErr.message))
    }
    return Promise.reject(err)
  },
)

export function unwrap<T>(payload: { data: T }): T {
  return payload.data
}
