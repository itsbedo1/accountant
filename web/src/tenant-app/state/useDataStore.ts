import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Session } from '@supabase/supabase-js'
import { sbFetch, sbFetchAll, dbLogAudit, myId } from '../../shared/sbFetch'
import { SB_URL } from '../../shared/supabaseClient'
import { toast } from '../../shared/useToast'
import { EMPTY_SETTINGS, type Customer, type Move, type Role, type SayarfaMove, type Settings } from '../../shared/types'
import { toLocalISODate } from '../../shared/date'
import { applyAllEffects, reverseAllEffects, movementsForApply, movementsForReverse, type MoveEffect, type CustomerMovement } from '../domain/balanceMath'
import { dbSaveMove, dbDeleteMove, type MoveDraft } from '../api/moves'
import { dbSetCustomerBal, dbApplyCustomerMovement, dbCreateCustomer, dbDeleteCustomer } from '../api/customers'
import { dbSaveSettings } from '../api/settings'
import { dbSaveSayarfa, type SayarfaDraft } from '../api/sayarfa'
import { sendTelegramNotif, sendTelegramSayarfaNotif, persistNotifFailed, getFreshChatId } from '../api/telegram'
import { applyToCustomer } from '../domain/balanceMath'

function toEffect(r: MoveDraft): MoveEffect {
  return { amilId: r.amilId, jiha: r.jiha, noa: r.noa, mabD: r.mabD, mabDin: r.mabDin }
}

type StoreSet = (fn: (s: DataState) => void) => void
type StoreGet = () => DataState

/**
 * ينفّذ حركات العملاء بقاعدة البيانات — كل حركة تنطبّق ذرياً على الرصيد
 * الحقيقي هناك، مو على نسخة المتصفح، فما تنمسح كتابة مستخدم شغّال بنفس
 * الوقت. بعدين يزامن النسخة المحلية مع القيم الراجعة (فتتصحح الشاشة
 * تلقائياً لو كان غيرك عدّل بالوسط).
 */
async function runCustomerMovements(movements: CustomerMovement[], set: StoreSet, get: StoreGet): Promise<void> {
  let failed = 0
  for (const mv of movements) {
    const res = await dbApplyCustomerMovement(mv)

    // الـmigration ما انطبّق بعد — رجوع مؤقت للكتابة المطلقة (السلوك القديم)
    // حتى ما تتوقف الأرصدة نهائياً. يصير فرعاً ميتاً بعد تطبيقه.
    if (res === 'unavailable') {
      const local = get().customers.find((x) => x.id === mv.customerId)
      if (local) await dbSetCustomerBal(local)
      continue
    }

    if (!res) {
      failed++
      continue
    }

    set((st) => {
      const c = st.customers.find((x) => x.id === mv.customerId)
      if (c) {
        c.dA = res.dA
        c.dL = res.dL
        c.dinA = res.dinA
        c.dinL = res.dinL
      }
    })
  }
  if (failed) {
    toast('⚠️ ماكو تأكيد لتحديث رصيد بعض العملاء — راجع "فحص تطابق الأرصدة" بالإعدادات')
  }
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

  /** يعادل الفرع "نقدي" بـ sfSave() (كانت بالسطر 3880-3923) — تأثير على رصيد القاصة فقط. يرجع true لو انحفظت فعلاً */
  saveSayarfaCash: (type: SayarfaMove['type'], mabD: number, mabDin: number, rate: number, notes: string) => Promise<boolean>
  /** يعادل sfSaveAmil() (كانت بالسطر 3929) — تحويل عملة داخل رصيد عميل، بدون أي تأثير على القاصة. يرجع true لو انحفظت فعلاً */
  saveSayarfaAmil: (customerId: number, type: SayarfaMove['type'], mabD: number, mabDin: number, rate: number, notes: string) => Promise<boolean>

  /** يعادل nfResend() بالكود القديم (كانت بالسطر 3016) */
  resendNotif: (dbId: number) => Promise<void>

  /** يعادل stSave() بالكود القديم (كانت بالسطر 4394) — يرجع false لو فشل ربط بوت تليجرام (نفس التوقف المبكر بالأصل) */
  saveSettings: (fields: { compName: string; startDate: string; rate: number; initD: number; initDin: number; tgToken: string }) => Promise<boolean>
  /** يعادل stAddAmil() (كانت بالسطر 4327) */
  addCustomer: (name: string, dL: number, dA: number, dinL: number, dinA: number) => Promise<boolean>
  /** يعادل stDelAmil() (كانت بالسطر 4368، بدون جزء الـ PIN — ذاك بالواجهة) */
  deleteCustomer: (id: number) => Promise<boolean>
  /** يعادل stFixBalance() (كانت بالسطر 4271) */
  fixCustomerBalance: (id: number) => Promise<void>
  /** يعادل stDocumentDiff() (كانت بالسطر 4286) */
  documentCustomerDiff: (id: number, diffD: number, diffDin: number) => Promise<void>
  /** يعادل stResetMoves() (كانت بالسطر 4468) */
  resetMoves: () => Promise<void>
  /** يعادل stResetAll() (كانت بالسطر 4501) */
  resetAll: () => Promise<void>
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

    // قائمة الحركات اللي راح تطبّقها قاعدة البيانات على أرصدة العملاء —
    // تُبنى قبل أي تعديل محلي، وتقابل حرفياً ما يطبّقه التطبيق التفاؤلي تحت
    const movements: CustomerMovement[] = []
    if (old) movements.push(...movementsForReverse(get().customers, toEffect(old)))
    movements.push(...movementsForApply(get().customers, toEffect(draft)))

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

    // حدّث أرصدة العملاء المتأثرين — عكس الحركة القديمة (لو تعديل) ثم تطبيق
    // الجديدة، كل وحدة ذرياً بقاعدة البيانات
    await runCustomerMovements(movements, set, get)

    // نلتقط الأرصدة اللي نخبر فيها العملاء *بعد* تزامنها مع قاعدة البيانات،
    // حتى ما نرسل للعميل رصيداً من نسخة محلية قديمة لو كان غيرنا عدّل بالوسط
    const notifyList = buildNotifyList(get().customers, draft)

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

    const movements = movementsForReverse(get().customers, toEffect(r))

    set((st) => {
      reverseAllEffects(st.customers, st, toEffect(r))
      st.moves.splice(curIdx, 1)
    })

    void dbSaveSettings(get().settings, get().initBalD, get().initBalDin)

    // عكس أثر الحركة على أرصدة العملاء — ذرياً بقاعدة البيانات، نفس منطق saveMove
    await runCustomerMovements(movements, set, get)

    // بعد التزامن، حتى يوصل العميل رصيده الحقيقي مو نسخة محلية قديمة
    const notifyList = buildNotifyList(get().customers, r)

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

  async saveSayarfaCash(type, mabD, mabDin, rate, notes) {
    // تأثير على القاصة — منقول من sfSave() (كانت بالسطر 3896)
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
      tarikh: toLocalISODate(now),
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      balDAfter: get().initBalD,
      balDinAfter: get().initBalDin,
    }
    const newIdx = get().sayarfaMoves.length
    set((st) => {
      st.sayarfaMoves.push({ ...draft, dbId: 0, id: 0, createdByEmail: null })
    })

    // الأصل كان يعرض النجاح ويرسل الحفظ بدون انتظار نتيجته، والدالة تبتلع
    // الخطأ — فلو انقطع الاتصال يشوف المستخدم "تم" وتتغيّر القاصة قدامه
    // وماكو شي انحفظ، وترجع القاصة لقيمتها بأول إعادة تحميل بدون تفسير
    // (لأنها تُحسب من الحركات وهذي الحركة ما وُجدت). الحين ننتظر النتيجة.
    const ok = await dbSaveSayarfa(draft, get().settings, get().initBalD, get().initBalDin)

    if (!ok) {
      set((st) => {
        if (type === 'شراء') {
          st.initBalD -= mabD
          st.initBalDin += mabDin
        } else {
          st.initBalD += mabD
          st.initBalDin -= mabDin
        }
        st.sayarfaMoves.splice(newIdx, 1)
      })
      toast('❌ لم تُحفظ عملية الصيرفة — تحقق من الاتصال وحاول مرة ثانية')
      return false
    }

    toast(`✅ تم تنفيذ ${type} الدولار — تحديث القاصة`)
    return true
  },

  async saveSayarfaAmil(customerId, type, mabD, mabDin, rate, notes) {
    const c = get().customers.find((x) => x.id === customerId)
    if (!c) {
      toast('⚠️ اختر عميل أولاً')
      return false
    }

    // منقولة من sfSaveAmil() (كانت بالسطر 3929) — تُسجَّل كحركتين
    // (دولار/دينار) بربط amilId حتى تظهر بكشف حساب العميل
    const noaD = type === 'بيع' ? 'صرف' : 'قبض'
    const noaDin = type === 'بيع' ? 'قبض' : 'صرف'

    set((st) => {
      const draft = st.customers.find((x) => x.id === customerId)
      if (!draft) return
      applyToCustomer(draft, noaD, mabD, 0)
      applyToCustomer(draft, noaDin, 0, mabDin)
    })

    const now = new Date()
    const tarikh = toLocalISODate(now)
    const noteBase = `تحويل عملة (صيرفة) — سعر ${rate.toLocaleString()}` + (notes ? ` — ${notes}` : '')

    const legD: MoveDraft = { noa: noaD, tarikh, raqm: 'صيرفة', hesab: 'ذمم العملاء', mabD, mabDin: 0, jiha: '', sak: '', notes: noteBase, amilId: c.id, amilName: c.name }
    const legDin: MoveDraft = { noa: noaDin, tarikh, raqm: 'صيرفة', hesab: 'ذمم العملاء', mabD: 0, mabDin, jiha: '', sak: '', notes: noteBase, amilId: c.id, amilName: c.name }
    const legDIdx = get().moves.length
    const legDinIdx = legDIdx + 1
    set((st) => {
      st.moves.push({ ...legD, dbId: 0, id: 0, createdByEmail: null, notifFailed: false })
      st.moves.push({ ...legDin, dbId: 0, id: 0, createdByEmail: null, notifFailed: false })
    })

    // ⚠️ الترتيب هنا مقصود: نحفظ الحركتين *قبل* ما نمس رصيد العميل.
    // الأصل كان يعكسها (رصيد أولاً، وبدون تراجع لو فشلت الحركتان)، فلو فشل
    // الحفظ بينهما يتغيّر رصيد العميل بقاعدة البيانات وماكو أي حركة تفسّر
    // ليش — وهي بالضبط الحالة اللي تسميها لوحة فحص الأرصدة "فرق مشبوه".
    // بهذا الترتيب أسوأ فشل ممكن هو حركتان بدون أثر بالرصيد، وهذا قابل
    // للكشف والتصحيح لأن السجل موجود ويشرح نفسه.
    const savedD = await dbSaveMove(legD)
    const savedDin = await dbSaveMove(legDin)

    if (savedD === false || savedDin === false) {
      // تراجع محلي كامل — نشيل الحركتين ونرجّع رصيد العميل لما كان عليه
      set((st) => {
        st.moves = st.moves.filter((_, i) => i !== legDIdx && i !== legDinIdx)
        const draft = st.customers.find((x) => x.id === customerId)
        if (draft) {
          applyToCustomer(draft, noaD === 'قبض' ? 'صرف' : 'قبض', mabD, 0)
          applyToCustomer(draft, noaDin === 'قبض' ? 'صرف' : 'قبض', 0, mabDin)
        }
      })
      // لو انحفظت وحدة بس، نشيلها من قاعدة البيانات حتى ما تبقى نصف عملية
      if (savedD !== false) void dbDeleteMove(savedD)
      if (savedDin !== false) void dbDeleteMove(savedDin)
      toast('❌ لم يُحفظ تحويل العملة — ما تغيّر رصيد العميل. حاول مرة ثانية')
      return false
    }

    set((st) => {
      if (st.moves[legDIdx]) {
        st.moves[legDIdx].dbId = savedD
        st.moves[legDIdx].id = savedD
      }
      if (st.moves[legDinIdx]) {
        st.moves[legDinIdx].dbId = savedDin
        st.moves[legDinIdx].id = savedDin
      }
    })

    // الحركتان محفوظتان — الحين نطبّق أثرهما على الرصيد، ذرياً بقاعدة البيانات
    await runCustomerMovements(
      [
        { customerId, noa: noaD, mabD, mabDin: 0 },
        { customerId, noa: noaDin, mabD: 0, mabDin },
      ],
      set,
      get,
    )

    toast(`✅ تم تحويل عملة حساب ${c.name}`)

    // رصيد العميل بعد التزامن — هو اللي نخبره فيه بإشعار تليجرام
    const updated = get().customers.find((x) => x.id === customerId)!
    const sfCurD = updated.dL - updated.dA
    const sfCurDin = updated.dinL - updated.dinA

    // إشعار تليجرام للعميل (إذا مربوط) — ما يوقف الحفظ لو فشل
    void sendTelegramSayarfaNotif(get().settings.tgBotToken, updated, type, mabD, mabDin, rate, sfCurD, sfCurDin)
    return true
  },

  async resendNotif(dbId) {
    const r = get().moves.find((x) => x.dbId === dbId)
    if (!r) return
    const notifyCust = r.amilId != null ? get().customers.find((x) => x.id === r.amilId) : get().customers.find((x) => x.name === r.jiha)
    if (!notifyCust) {
      toast('⚠️ ما لقيت العميل المرتبط بهذه الحركة')
      return
    }
    if (!get().settings.tgBotToken) {
      toast('⚠️ ماكو بوت تليجرام مربوط بالإعدادات')
      return
    }
    const chatId = await getFreshChatId(notifyCust)
    if (!chatId) {
      toast('⚠️ العميل ماكو رابط حسابه بتليجرام بعد')
      return
    }
    toast('⏳ جاري إعادة الإرسال...')
    const curD = notifyCust.dL - notifyCust.dA
    const curDin = notifyCust.dinL - notifyCust.dinA
    await sendTelegramNotif(
      {
        tgBotToken: get().settings.tgBotToken,
        findCustomer: (id) => get().customers.find((x) => x.id === id),
        markNotifResult: async (failed) => {
          set((st) => {
            const m = st.moves.find((x) => x.dbId === dbId)
            if (m) m.notifFailed = failed
          })
          await persistNotifFailed(dbId, failed)
        },
      },
      notifyCust.id,
      r.noa,
      r.mabD,
      r.mabDin,
      'new',
      0,
      0,
      curD,
      curDin,
    )
    const after = get().moves.find((x) => x.dbId === dbId)
    if (after && !after.notifFailed) toast('✅ وصل الإشعار هذي المرة')
  },

  async saveSettings({ compName, startDate, rate, initD, initDin, tgToken }) {
    const prevSettings = get().settings

    // احسب الفرق بين الرصيد الافتتاحي القديم والجديد، وعدّل القاصة الحالية بالفرق
    const diffD = initD - (prevSettings.initBalD || 0)
    const diffDin = initDin - (prevSettings.initBalDin || 0)
    set((st) => {
      st.initBalD += diffD
      st.initBalDin += diffDin
    })

    // إذا توكن بوت تليجرام جديد أو تغيّر — تحقق منه وسجّل الـ webhook تلقائياً
    let tgBotUser = prevSettings.tgBotUser || ''
    if (tgToken && tgToken !== prevSettings.tgBotToken) {
      try {
        const meRes = await fetch(`https://api.telegram.org/bot${tgToken}/getMe`)
        const me = await meRes.json()
        if (!me.ok) throw new Error('توكن غير صحيح')
        tgBotUser = me.result.username
        const uid = await myId()
        const hookUrl = `${SB_URL}/functions/v1/telegram-webhook?company=${uid}`
        await fetch(`https://api.telegram.org/bot${tgToken}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: hookUrl }),
        })
        toast('✅ تم ربط بوت تليجرام: @' + tgBotUser)
      } catch (e) {
        toast('❌ فشل ربط بوت تليجرام: ' + (e as Error).message)
        return false
      }
    }

    set((st) => {
      st.settings = { ...st.settings, compName, startDate, defaultRate: rate, initBalD: initD, initBalDin: initDin, tgBotToken: tgToken, tgBotUser }
    })

    toast('✅ تم حفظ الإعدادات بنجاح')
    void dbSaveSettings(get().settings, get().initBalD, get().initBalDin)
    return true
  },

  async addCustomer(name, dL, dA, dinL, dinA) {
    if (get().customers.find((c) => c.name === name)) {
      toast('⚠️ العميل موجود مسبقاً')
      return false
    }
    try {
      const newId = (await dbCreateCustomer(name, dL, dA, dinL, dinA)) ?? Math.max(0, ...get().customers.map((c) => c.id)) + 1
      set((st) => {
        st.customers.push({ id: newId, dbId: newId, name, dA, dL, dinA, dinL, initDL: dL, initDA: dA, initDinL: dinL, initDinA: dinA, tgChatId: null })
      })
      toast(`✅ تمت إضافة: ${name}${dL || dA || dinL || dinA ? ' مع الرصيد الافتتاحي' : ''}`)
      return true
    } catch (e) {
      toast('❌ فشل الإضافة: ' + (e as Error).message)
      console.error('stAddAmil error:', e)
      return false
    }
  },

  async deleteCustomer(id) {
    const c = get().customers.find((x) => x.id === id)
    if (!c) return false
    try {
      await dbDeleteCustomer(id)
    } catch (e) {
      toast('❌ فشل الحذف: ' + (e as Error).message)
      console.error('stDelAmil DB error:', e)
      return false
    }
    set((st) => {
      st.customers = st.customers.filter((x) => x.id !== id)
    })
    toast(`🗑 تم حذف: ${c.name}`)
    return true
  },

  // يرجّع رصيد العميل الحي لنفس رصيده الافتتاحي المحفوظ — منقولة من stFixBalance() (كانت بالسطر 4271)
  async fixCustomerBalance(id) {
    const c = get().customers.find((x) => x.id === id)
    if (!c) return
    const newDL = c.initDL || 0,
      newDA = c.initDA || 0,
      newDinL = c.initDinL || 0,
      newDinA = c.initDinA || 0
    set((st) => {
      const cust = st.customers.find((x) => x.id === id)
      if (cust) {
        cust.dL = newDL
        cust.dA = newDA
        cust.dinL = newDinL
        cust.dinA = newDinA
      }
    })
    // كتابة مطلقة مقصودة هنا: الهدف *فرض* الرصيد الافتتاحي، مو تسجيل حركة
    await dbSetCustomerBal(get().customers.find((x) => x.id === id)!)
    toast(`✅ تم استرجاع رصيد ${c.name}`)
  },

  // يضيف حركة "توثيقية" بمبلغ الفرق المكتشف — بدون ما تغيّر رصيد العميل الحالي
  // إطلاقاً — منقولة من stDocumentDiff() (كانت بالسطر 4286)
  async documentCustomerDiff(id, diffD, diffDin) {
    const c = get().customers.find((x) => x.id === id)
    if (!c) return
    const now = new Date()
    const tarikh = toLocalISODate(now)
    const notes = 'توثيق فرق رصيد سابق — حركة حقيقية صار أثرها بالرصيد لكن انفقد سجلها الأصلي (هذا السجل لا يؤثر على الرصيد الحالي)'

    const drafts: MoveDraft[] = []
    if (diffD) drafts.push({ noa: diffD > 0 ? 'قبض' : 'صرف', tarikh, raqm: 'تسوية', hesab: 'ذمم العملاء', mabD: Math.abs(diffD), mabDin: 0, jiha: '', sak: '', notes, amilId: c.id, amilName: c.name })
    if (diffDin) drafts.push({ noa: diffDin > 0 ? 'قبض' : 'صرف', tarikh, raqm: 'تسوية', hesab: 'ذمم العملاء', mabD: 0, mabDin: Math.abs(diffDin), jiha: '', sak: '', notes, amilId: c.id, amilName: c.name })

    for (const d of drafts) {
      const idx = get().moves.length
      set((st) => {
        st.moves.push({ ...d, dbId: 0, id: 0, createdByEmail: null, notifFailed: false })
      })
      const savedId = await dbSaveMove(d)
      if (savedId) {
        set((st) => {
          if (st.moves[idx]) {
            st.moves[idx].dbId = savedId
            st.moves[idx].id = savedId
          }
        })
      }
    }
    toast(`✅ تم توثيق الفرق بحساب ${c.name}`)
  },

  // ⚠️ ملاحظة: نص التأكيد بالكود القديم يقول "ستبقى أرصدة العملاء كما هي"،
  // بس الكود فعلياً يصفّرها كلها (customers d_a/d_l/din_a/din_l → 0) — تناقض
  // موجود بالنسخة الأصلية نفسها، محفوظ هنا بالضبط بدون تعديل حتى يتفق عليه
  // قرار منفصل. منقولة من stResetMoves() (كانت بالسطر 4468)
  async resetMoves() {
    toast('⏳ جاري المسح...')
    try {
      await sbFetch('moves?created_at=gte.2000-01-01', 'DELETE')
      await sbFetch('sayarfa_moves?created_at=gte.2000-01-01', 'DELETE')
      for (const c of get().customers) {
        await sbFetch(`customers?id=eq.${c.id}`, 'PATCH', { d_a: 0, d_l: 0, din_a: 0, din_l: 0 })
      }
      await sbFetch(`settings?company_id=eq.${await myId()}`, 'PATCH', { init_bal_d_current: 0, init_bal_din_current: 0 })
    } catch (e) {
      toast('❌ خطأ: ' + (e as Error).message)
      console.error(e)
      return
    }
    set((st) => {
      st.initBalD = 0
      st.initBalDin = 0
      st.customers.forEach((c) => {
        c.dL = 0
        c.dA = 0
        c.dinL = 0
        c.dinA = 0
      })
      st.moves = []
      st.sayarfaMoves = []
    })
    toast('✅ تم مسح الحركات وصفّر الرصيد')
  },

  async resetAll() {
    toast('⏳ جاري المسح الكامل...')
    try {
      await sbFetch('moves?created_at=gte.2000-01-01', 'DELETE')
      await sbFetch('sayarfa_moves?created_at=gte.2000-01-01', 'DELETE')
      await sbFetch('customers?created_at=gte.2000-01-01', 'DELETE')
      await sbFetch(`settings?company_id=eq.${await myId()}`, 'PATCH', {
        comp_name: '',
        default_rate: 1480,
        init_bal_d: 0,
        init_bal_din: 0,
        init_bal_d_current: 0,
        init_bal_din_current: 0,
      })
    } catch (e) {
      toast('❌ خطأ: ' + (e as Error).message)
      console.error(e)
      return
    }
    set((st) => {
      st.moves = []
      st.sayarfaMoves = []
      st.initBalD = 0
      st.initBalDin = 0
      st.customers = []
      st.settings = { ...EMPTY_SETTINGS, defaultRate: 1480 }
    })
    toast('✅ تم إعادة الضبط بنجاح')
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
