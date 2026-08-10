export type Role = 'owner' | 'employee'

export interface Move {
  id: number
  dbId: number
  noa: 'صرف' | 'قبض'
  tarikh: string
  raqm: string
  hesab: string
  jiha: string
  amilName: string | null
  mabD: number
  mabDin: number
  notes: string
}

export interface Customer {
  id: number
  name: string
  dA: number
  dL: number
  telegramChatId?: string | null
}

export interface Settings {
  compName: string
  startDate: string
  defaultRate: number
  initBalD: number
  initBalDin: number
}
