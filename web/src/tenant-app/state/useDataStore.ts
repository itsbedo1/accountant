import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Session } from '@supabase/supabase-js'
import { sbFetch, sbFetchAll, dbLogAudit } from '../../shared/sbFetch'
import { toast } from '../../shared/useToast'
import { EMPTY_SETTINGS, type Customer, type Move, type Role, type SayarfaMove, type Settings } from '../../shared/types'
import { applyAllEffects, reverseAllEffects, type MoveEffect } from '../domain/balanceMath'
import { dbSaveMove, dbDeleteMove, type MoveDraft } from '../api/moves'
import { dbUpdateCustomerBal } from '../api/customers'
import { dbSaveSettings } from '../api/settings'
import { dbSaveSayarfa, type SayarfaDraft } from '../api/sayarfa'
import { sendTelegramNotif, sendTelegramSayarfaNotif, persistNotifFailed } from '../api/telegram'
import { applyToCustomer } from '../domain/balanceMath'

function toEffect(r: MoveDraft): MoveEffect {
  return { amilId: r.amilId, jiha: r.jiha, noa: r.noa, mabD: r.mabD, mabDin: r.mabDin }
}

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

  /**
   * يعادل confirmAndSave() بالكود القديم (كانت بالسطر 2282) — curIdx يعادل
   * sCurIdx (-1 = سجل جديد). يرجع true لو نجح الحفظ فعلياً بقاعدة البيانات.
   */
  saveMove: (draft: MoveDraft, curIdx: number) => Promise<boolean>
  /** يعادل sDel() بالكود القديم (كانت بالسطر 2471) */
  deleteMove: (curIdx: number) => Promise<boolean>

  /** يعادل الفرع "نقدي" بـ sfSave() (كانت بالسطر 3880-3923) — تأثير على رصيد القاصة فقط */
  saveSayarfaCash: (type: SayarfaMove['type'], mabD: number, mabDin: number, rate: number, notes: string) => void
  /** يعادل sfSaveAmil() (كانت بالسطر 3929) — تحويل عملة داخل رصيد عميل، بدون أي تأثير على القاصة */
  saveSayarfaAmil: (customerId: number, type: SayarfaMove['type'], mabD: number, mabDin: number, rate: number, notes: string) => Promise<void>
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

  async saveMove(draft, curIdx) {
    const movesLen = get().moves.length
    const wasEdit = curIdx >= 0 && curIdx < movesLen
    const old = wasEdit ? get().moves[curIdx] : null

    // تطبيق تفاؤلي محلي — إذا تعديل، ارجع تأثير القديم أولاً ثم طبّق الجديد
    set((st) => {
      if (old) reverseAllEffects(st.customers, st, toEffect(old))
      applyAllEffects(st.customers, st, toEffect(draft))
      if (old) {
        Object.assign(st.moves[curIdx], draft)
      } else {
        st.moves.push({
          ...draft,
          dbId: 0,
          id: 0,
          createdByEmail: null,
          notifFailed: false,
        })
      }
    })
    const newIdx = wasEdit ? curIdx : get().moves.length - 1

    // نلتقط العملاء المتأثرين فعلياً ورصيد كل وحد منهم هنا مباشرة — بشكل متزامن،
    // قبل أي انتظار async (نفس حماية confirmAndSave الأصلية، كانت بالسطر 2307)
    const notifyList = buildNotifyList(get().customers, draft)

    const savedId = await dbSaveMove({ ...draft, dbId: old?.dbId })

    if (savedId === false) {
      // فشل الحفظ — تراجع عن كل التغييرات المحلية حتى لا تختلف الشاشة عن قاعدة البيانات
      set((st) => {
        reverseAllEffects(st.customers, st, toEffect(draft))
        if (old) {
          applyAllEffects(st.customers, st, toEffect(old))
          st.moves[curIdx] = old
        } else {
          st.moves.pop()
        }
      })
      toast('❌ لم يتم الحفظ — تحقق من الاتصال وحاول مرة ثانية')
      return false
    }

    set((st) => {
      st.moves[newIdx].dbId = savedId
      st.moves[newIdx].id = savedId
    })

    void dbLogAudit('moves', savedId, wasEdit ? 'update' : 'create', wasEdit ? old : null, get().moves[newIdx])
    void dbSaveSettings(get().settings, get().initBalD, get().initBalDin)

    // حدّث أرصدة العملاء المتأثرين بقاعدة البيانات — الحساب الحالي (عميل/جهة
    // صرف)، وأيضاً القديم إذا التعديل غيّر العميل أو جهة الصرف عن حركة موجودة
    const balCustomers = new Map<number, Customer>()
    const addBal = (c: Customer | undefined) => {
      if (c) balCustomers.set(c.id, c)
    }
    if (draft.amilId != null) addBal(get().customers.find((x) => x.id === draft.amilId))
    addBal(get().customers.find((x) => x.name === draft.jiha))
    if (old) {
      if (old.amilId != null) addBal(get().customers.find((x) => x.id === old.amilId))
      addBal(get().customers.find((x) => x.name === old.jiha))
    }
    for (const c of balCustomers.values()) await dbUpdateCustomerBal(c)

    // إشعار تليجرام لكل عميل تأثر فعلياً — بأفضل جهد، بدون انتظار (fire-and-forget)
    for (const n of notifyList) {
      void sendTelegramNotif(
        {
          tgBotToken: get().settings.tgBotToken,
          findCustomer: (id) => get().customers.find((x) => x.id === id),
          markNotifResult: n.primary
            ? async (failed) => {
                set((st) => {
                  const m = st.moves.find((x) => x.dbId === savedId)
                  if (m) m.notifFailed = failed
                })
                await persistNotifFailed(savedId, failed)
              }
            : undefined,
        },
        n.custId,
        draft.noa,
        draft.mabD,
        draft.mabDin,
        wasEdit ? 'edit' : 'new',
        old?.mabD ?? 0,
        old?.mabDin ?? 0,
        n.curD,
        n.curDin,
      )
    }

    toast('✅ تم الحفظ وتحديث الأرصدة')
    return true
  },

  async deleteMove(curIdx) {
    const moves = get().moves
    if (curIdx < 0 || curIdx >= moves.length) return false
    const r = moves[curIdx]
    const rowId = r.dbId || r.id

    if (rowId) {
      const deleted = await dbDeleteMove(rowId)
      if (!deleted) {
        toast('❌ فشل الحذف — الحركة ما انمسحت فعلياً بقاعدة البيانات (تحقق من الاتصال وحاول ثانية)')
        return false
      }
      void dbLogAudit('moves', rowId, 'delete', r, null)
    }

    set((st) => {
      reverseAllEffects(st.customers, st, toEffect(r))
      st.moves.splice(curIdx, 1)
    })

    // نلتقط العملاء المتأثرين ورصيدهم بعد الإرجاع مباشرة — نفس منطق saveMove
    const notifyList = buildNotifyList(get().customers, r)

    void dbSaveSettings(get().settings, get().initBalD, get().initBalDin)

    if (r.amilId != null) {
      const c = get().customers.find((x) => x.id === r.amilId)
      if (c) void dbUpdateCustomerBal(c)
    }
    const jihaC2 = get().customers.find((x) => x.name === r.jiha)
    if (jihaC2) void dbUpdateCustomerBal(jihaC2)

    for (const n of notifyList) {
      void sendTelegramNotif(
        {
          tgBotToken: get().settings.tgBotToken,
          findCustomer: (id) => get().customers.find((x) => x.id === id),
        },
        n.custId,
        n.noa,
        r.mabD,
        r.mabDin,
        'delete',
        0,
        0,
        n.curD,
        n.curDin,
      )
    }

    toast('🗑 تم الحذف بنجاح')
    return true
  },

  saveSayarfaCash(type, mabD, mabDin, rate, notes) {
    // تأثير على القاصة — منقول حرفياً من sfSave() (كانت بالسطر 3896)
    set((st) => {
      if (type === 'شراء') {
        st.initBalD += mabD
        st.initBalDin -= mabDin
      } else {
        st.initBalD -= mabD
        st.initBalDin += mabDin
      }
    })

    const now = new Date()
    const draft: SayarfaDraft = {
      type,
      mabD,
      mabDin,
      rate,
      notes,
      tarikh: now.toISOString().split('T')[0],
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      balDAfter: get().initBalD,
      balDinAfter: get().initBalDin,
    }
    set((st) => {
      st.sayarfaMoves.push({ ...draft, dbId: 0, id: 0, createdByEmail: null })
    })

    toast(`✅ تم تنفيذ ${type} الدولار — تحديث القاصة`)
    // نفس الأصل بالضبط: الحفظ بقاعدة البيانات fire-and-forget، بدون انتظار
    // (sfReset يصير فوراً بالواجهة قبل ما يخلص الحفظ فعلياً)
    void dbSaveSayarfa(draft, get().settings, get().initBalD, get().initBalDin)
  },

  async saveSayarfaAmil(customerId, type, mabD, mabDin, rate, notes) {
    const c = get().customers.find((x) => x.id === customerId)
    if (!c) {
      toast('⚠️ اختر عميل أولاً')
      return
    }

    // منقولة حرفياً من sfSaveAmil() (كانت بالسطر 3929) — تُسجَّل كحركتين
    // (دولار/دينار) بربط amilId حتى تظهر بكشف حساب العميل. بدون rollback لو
    // فشل الحفظ — نفس تحمّل المخاطرة الموجود بالأصل لهذا المسار تحديداً
    const noaD = type === 'بيع' ? 'صرف' : 'قبض'
    const noaDin = type === 'بيع' ? 'قبض' : 'صرف'

    set((st) => {
      const draft = st.customers.find((x) => x.id === customerId)
      if (!draft) return
      applyToCustomer(draft, noaD, mabD, 0)
      applyToCustomer(draft, noaDin, 0, mabDin)
    })

    // نلتقط رصيد العميل هنا مباشرة (متزامن، فور تطبيق أثر الحركة) — نفس حماية sendTelegramNotif
    const updated = get().customers.find((x) => x.id === customerId)!
    const sfCurD = updated.dL - updated.dA
    const sfCurDin = updated.dinL - updated.dinA

    const now = new Date()
    const tarikh = now.toISOString().split('T')[0]
    const noteBase = `تحويل عملة (صيرفة) — سعر ${rate.toLocaleString()}` + (notes ? ` — ${notes}` : '')

    const legD: MoveDraft = { noa: noaD, tarikh, raqm: 'صيرفة', hesab: 'ذمم العملاء', mabD, mabDin: 0, jiha: '', sak: '', notes: noteBase, amilId: c.id, amilName: c.name }
    const legDin: MoveDraft = { noa: noaDin, tarikh, raqm: 'صيرفة', hesab: 'ذمم العملاء', mabD: 0, mabDin, jiha: '', sak: '', notes: noteBase, amilId: c.id, amilName: c.name }
    const legDIdx = get().moves.length
    const legDinIdx = legDIdx + 1
    set((st) => {
      st.moves.push({ ...legD, dbId: 0, id: 0, createdByEmail: null, notifFailed: false })
      st.moves.push({ ...legDin, dbId: 0, id: 0, createdByEmail: null, notifFailed: false })
    })

    toast(`✅ تم تحويل عملة حساب ${c.name}`)

    await dbUpdateCustomerBal(updated)
    const savedD = await dbSaveMove(legD)
    const savedDin = await dbSaveMove(legDin)
    set((st) => {
      if (savedD && st.moves[legDIdx]) {
        st.moves[legDIdx].dbId = savedD
        st.moves[legDIdx].id = savedD
      }
      if (savedDin && st.moves[legDinIdx]) {
        st.moves[legDinIdx].dbId = savedDin
        st.moves[legDinIdx].id = savedDin
      }
    })

    // إشعار تليجرام للعميل (إذا مربوط) — ما يوقف الحفظ لو فشل
    void sendTelegramSayarfaNotif(get().settings.tgBotToken, updated, type, mabD, mabDin, rate, sfCurD, sfCurDin)
  },
})))

interface NotifyEntry {
  custId: number
  noa: Move['noa']
  primary: boolean
  curD: number
  curDin: number
}

// يعادل بناء notifyList بدالة confirmAndSave (كانت بالسطر 2313) ونفس منطق
// delNotifyList بدالة sDel (كانت بالسطر 2509) — نفس الصيغة بالضبط، فرق فقط
// بتوقيت الاستدعاء (قبل الإرجاع بالحفظ، بعد الإرجاع بالحذف)
function buildNotifyList(
  customers: Customer[],
  r: { amilId: number | null; jiha: string; noa: Move['noa'] },
): NotifyEntry[] {
  const list: NotifyEntry[] = []
  const amilCust = r.amilId != null ? customers.find((x) => x.id === r.amilId) : undefined
  if (amilCust) {
    list.push({ custId: amilCust.id, noa: r.noa, primary: true, curD: amilCust.dL - amilCust.dA, curDin: amilCust.dinL - amilCust.dinA })
  }
  const jihaCust = customers.find((x) => x.name === r.jiha)
  if (jihaCust && (!amilCust || jihaCust.id !== amilCust.id)) {
    const jihaNoa: Move['noa'] = r.noa === 'قبض' ? 'صرف' : 'قبض'
    list.push({ custId: jihaCust.id, noa: jihaNoa, primary: false, curD: jihaCust.dL - jihaCust.dA, curDin: jihaCust.dinL - jihaCust.dinA })
  }
  return list
}

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
