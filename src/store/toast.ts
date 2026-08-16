import { create } from 'zustand'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: string
  message: string
  tone: 'default' | 'success' | 'danger'
  action?: ToastAction
  duration: number
}

interface ToastState {
  toasts: Toast[]
  show: (message: string, opts?: { tone?: Toast['tone']; action?: ToastAction; duration?: number }) => string
  dismiss: (id: string) => void
}

let seq = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show(message, opts) {
    const id = `toast-${++seq}`
    const toast: Toast = {
      id,
      message,
      tone: opts?.tone ?? 'default',
      action: opts?.action,
      duration: opts?.duration ?? (opts?.action ? 5000 : 3000),
    }
    set((s) => ({ toasts: [...s.toasts, toast] }))
    return id
  },
  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))

// 컴포넌트 밖(콜백, 이벤트 핸들러)에서도 쓰기 쉽게 하는 헬퍼.
export const toast = {
  show: (message: string, opts?: Parameters<ToastState['show']>[1]) =>
    useToastStore.getState().show(message, opts),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
}
