import { create } from 'zustand'

export interface ToastItem {
  id: number
  msg: string
  type?: 'ok' | 'err'
}

let nextId = 1

interface ToastState {
  items: ToastItem[]
  show: (msg: string, type?: 'ok' | 'err') => void
  remove: (id: number) => void
}

// توست خفيف بدل alert() — منقولة من toast() (admin.html:210)، تدعم عدة
// توستات مكدّسة بنفس الوقت (خلاف toast تطبيق المستأجرين اللي توست واحد بس)
export const useAdminToastStore = create<ToastState>((set) => ({
  items: [],
  show: (msg, type) => {
    const id = nextId++
    set((s) => ({ items: [...s.items, { id, msg, type }] }))
    setTimeout(() => set((s) => ({ items: s.items.filter((t) => t.id !== id) })), 3200)
  },
  remove: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}))

export function adminToast(msg: string, type?: 'ok' | 'err') {
  useAdminToastStore.getState().show(msg, type)
}
