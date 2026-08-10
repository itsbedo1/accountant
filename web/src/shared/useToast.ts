import { create } from 'zustand'

interface ToastState {
  msg: string
  visible: boolean
  show: (msg: string) => void
}

let hideTimer: ReturnType<typeof setTimeout> | undefined

// يعادل toast(msg) بالكود القديم (كانت تحدّث عنصر #toast مباشرة بالـ DOM)
export const useToastStore = create<ToastState>((set) => ({
  msg: '',
  visible: false,
  show: (msg) => {
    clearTimeout(hideTimer)
    set({ msg, visible: true })
    hideTimer = setTimeout(() => set({ visible: false }), 2500)
  },
}))

export function toast(msg: string) {
  useToastStore.getState().show(msg)
}
