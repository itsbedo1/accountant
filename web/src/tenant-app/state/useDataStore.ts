import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Session } from '@supabase/supabase-js'
import { sbFetch, sbFetchAll } from '../../shared/sbFetch'
import { toast } from '../../shared/useToast'
import { EMPTY_SETTINGS, type Customer, type Move, type Role, type SayarfaMove, type Settings } from '../../shared/types'

interface DataState {
  dataReady: boolean
  loadStatus: { msg: string; color: string }
  moves: Move[]
  sayarfaMoves: SayarfaMove[]
  initBalD: number
  initBalDin: number
  settings: Settings
  customers: Customer[]
  myRole: Role
  suspended: boolean
  suspendReason: string
  /** يعادل _loadedForUserId بالكود القديم — يمنع إعادة تحميل غير ضرورية لنفس المستخدم */
  loadedForUserId: string | null

  /** يعادل enterApp() + dbLoad() بالكود القديم مجتمعتين */
  loadForUser: (session: Session) => Promise<void>
  /** زر "🔄 تحديث" بالقائمة الرئيسية — يعادل onclick="dbLoad()" المباشر بالكود القديم */
  refresh: () => Promise<void>
  reset: () => void
}

const initial = {
  dataReady: false,
  loadStatus: { msg: '', color: 'white' },
  moves: [] as Move[],
  sayarfaMoves: [] as SayarfaMove[],
  initBalD: 0,
  initBalDin: 0,
  settings: EMPTY_SETTINGS,
  customers: [] as Customer[],
  myRole: 'owner' as Role,
  suspended: false,
  suspendReason: '',
  loadedForUserId: null as string | null,
}

export const useDataStore = create<DataState>()(immer((set, get) => ({
  ...initial,

  async loadForUser(session) {
    // نحدد دور المستخدم (مالك/موظف) حتى نظبط الواجهة حسبه — الحماية الحقيقية
    // بقاعدة البيانات (RLS)، هذا فقط لتحسين تجربة الاستخدام — منقول من enterApp()
    try {
      const who = await sbFetch<{ role: Role }[]>('rpc/whoami', 'POST', {})
      set((s) => {
        s.myRole = who?.[0]?.role || 'owner'
      })
    } catch (e) {
      console.error('whoami:', e)
      set((s) => {
        s.myRole = 'owner'
      })
    }

    if (get().loadedForUserId === session.user.id) return
    set((s) => {
      s.loadedForUserId = session.user.id
    })
    await loadData(set)
  },

  async refresh() {
    await loadData(set)
  },

  reset() {
    set(() => ({ ...initial }))
  },
})))

// منقولة من dbLoad() بالكود القديم — حرفياً نفس ترتيب الجلب وحساب الأرصدة
async function loadData(set: (fn: (s: DataState) => void) => void) {
  set((s) => {
    s.dataReady = false
    s.loadStatus = { msg: 'جاري تحميل البيانات...', color: '#f0c040' }
  })

  try {
    // 1) الإعدادات — بدون فلتر id، RLS يرجع صف شركتك بس
    const settingsRows = await sbFetch<Record<string, unknown>[]>('settings')
    if (settingsRows && settingsRows[0]) {
      const s = settingsRows[0] as Record<string, string | number | boolean | null>
      const settings: Settings = {
        compName: (s.comp_name as string) || 'المنير',
        startDate: (s.start_date as string) || '',
        defaultRate: (s.default_rate as number) || 1480,
        initBalD: (s.init_bal_d as number) || 0,
        initBalDin: (s.init_bal_din as number) || 0,
        tgBotToken: (s.telegram_bot_token as string) || '',
        tgBotUser: (s.telegram_bot_username as string) || '',
        suspended: !!s.suspended,
        suspendReason: (s.suspend_reason as string) || '',
        nextDueAt: (s.next_due_at as string) || null,
        plan: ((s.plan as string) || 'paid') as Settings['plan'],
      }

      // الشركة موقوفة يدوياً، أو تجاوزت موعد الاستحقاق (تجريبي منتهي/دفعة
      // متأخرة) — نفس المنطق المطبّق فعلياً بصلاحيات القاعدة (RLS)
      const isOverdue = !!settings.nextDueAt && new Date(settings.nextDueAt) < new Date()
      if (settings.suspended || isOverdue) {
        let reason = settings.suspendReason
        if (!reason && isOverdue) {
          reason = settings.plan === 'trial' ? 'انتهت الفترة التجريبية' : 'حان موعد تسديد الاشتراك'
        }
        set((st) => {
          st.settings = settings
          st.suspended = true
          st.suspendReason = reason
          st.dataReady = true
        })
        return
      }

      set((st) => {
        st.settings = settings
        st.initBalD = settings.initBalD
        st.initBalDin = settings.initBalDin
      })
    }

    // 2) العملاء
    const customers = await sbFetchAll<Record<string, number | string | null>>('customers?order=id.asc')
    if (customers?.length) {
      set((st) => {
        st.customers = customers.map((c) => ({
          dbId: c.id as number,
          id: c.id as number,
          name: c.name as string,
          dA: (c.d_a as number) || 0,
          dL: (c.d_l as number) || 0,
          dinA: (c.din_a as number) || 0,
          dinL: (c.din_l as number) || 0,
          initDL: c.init_d_l != null ? (c.init_d_l as number) : (c.d_l as number) || 0,
          initDA: c.init_d_a != null ? (c.init_d_a as number) : (c.d_a as number) || 0,
          initDinL: c.init_din_l != null ? (c.init_din_l as number) : (c.din_l as number) || 0,
          initDinA: c.init_din_a != null ? (c.init_din_a as number) : (c.din_a as number) || 0,
          tgChatId: (c.telegram_chat_id as string) || null,
        }))
      })
    }

    // 3) حركات الصندوق
    const moves = await sbFetchAll<Record<string, string | number | boolean | null>>('moves?order=id.asc')
    if (moves?.length) {
      set((st) => {
        st.moves = moves.map((m) => ({
          dbId: m.id as number,
          id: m.id as number,
          noa: m.noa as Move['noa'],
          tarikh: m.tarikh as string,
          raqm: m.raqm as string,
          hesab: m.hesab as string,
          mabD: (m.mab_d as number) || 0,
          mabDin: (m.mab_din as number) || 0,
          jiha: m.jiha as string,
          sak: (m.sak as string) || null,
          notes: (m.notes as string) || '',
          amilId: (m.amil_id as number) ?? null,
          amilName: (m.amil_name as string) || null,
          createdByEmail: (m.created_by_email as string) || null,
          notifFailed: !!m.tg_notif_failed,
        }))

        // احسب رصيد الصندوق من الحركات — بدون ما نعتمد على init_bal_d_current
        for (const r of st.moves) {
          if (r.jiha === 'الصندوق') {
            if (r.noa === 'قبض') {
              st.initBalD += r.mabD
              st.initBalDin += r.mabDin
            } else {
              st.initBalD -= r.mabD
              st.initBalDin -= r.mabDin
            }
          }
        }
      })
    }

    // 4) حركات الصيرفة
    const smoves = await sbFetchAll<Record<string, string | number | null>>('sayarfa_moves?order=id.asc')
    if (smoves?.length) {
      set((st) => {
        st.sayarfaMoves = smoves.map((m) => ({
          dbId: m.id as number,
          id: m.id as number,
          type: m.type as SayarfaMove['type'],
          mabD: (m.mab_d as number) || 0,
          mabDin: (m.mab_din as number) || 0,
          rate: (m.rate as number) || 1480,
          notes: (m.notes as string) || '',
          tarikh: m.tarikh as string,
          time: (m.time_str as string) || '',
          balDAfter: (m.bal_d_after as number) || 0,
          balDinAfter: (m.bal_din_after as number) || 0,
          createdByEmail: (m.created_by_email as string) || null,
        }))

        // احسب تأثير الصيرفة على الصندوق
        for (const m of st.sayarfaMoves) {
          if (m.type === 'شراء') {
            st.initBalD += m.mabD
            st.initBalDin -= m.mabDin
          } else {
            st.initBalD -= m.mabD
            st.initBalDin += m.mabDin
          }
        }
      })
    }

    set((st) => {
      st.loadStatus = { msg: '✅ متصل بقاعدة البيانات', color: '#60ff90' }
    })
    toast('✅ تم تحميل البيانات')
  } catch (e) {
    console.error(e)
    set((st) => {
      st.loadStatus = { msg: '❌ ' + (e as Error).message, color: '#ff6060' }
    })
  } finally {
    set((st) => {
      st.dataReady = true
    })
  }
}
