export type Role = 'owner' | 'employee'
export type MoveType = 'صرف' | 'قبض'
export type SayarfaType = 'شراء' | 'بيع'
export type Plan = 'trial' | 'paid'

export interface Move {
  dbId: number
  id: number
  noa: MoveType
  tarikh: string
  raqm: string
  hesab: string
  mabD: number
  mabDin: number
  jiha: string
  sak: string | null
  notes: string
  amilId: number | null
  amilName: string | null
  createdByEmail: string | null
  notifFailed: boolean
}

export interface SayarfaMove {
  dbId: number
  id: number
  type: SayarfaType
  mabD: number
  mabDin: number
  rate: number
  notes: string
  tarikh: string
  time: string
  balDAfter: number
  balDinAfter: number
  createdByEmail: string | null
}

export interface Customer {
  dbId: number
  id: number
  name: string
  dA: number
  dL: number
  dinA: number
  dinL: number
  // الرصيد الافتتاحي — يُستخدم لحساب "الرصيد قبل التاريخ الفلاني" بكشف الحساب
  initDL: number
  initDA: number
  initDinL: number
  initDinA: number
  tgChatId: string | null
}

export interface Settings {
  compName: string
  startDate: string
  defaultRate: number
  initBalD: number
  initBalDin: number
  tgBotToken: string
  tgBotUser: string
  suspended: boolean
  suspendReason: string
  nextDueAt: string | null
  plan: Plan
}

export const EMPTY_SETTINGS: Settings = {
  compName: '',
  startDate: '',
  defaultRate: 1480,
  initBalD: 0,
  initBalDin: 0,
  tgBotToken: '',
  tgBotUser: '',
  suspended: false,
  suspendReason: '',
  nextDueAt: null,
  plan: 'paid',
}
