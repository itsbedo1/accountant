import { sbFetch } from '../../shared/sbFetch'
import { toast } from '../../shared/useToast'
import { fmtAmount } from '../../shared/format'
import type { MoveType } from '../../shared/types'

// يبني نص رصيد واضح من منظور العميل — بدل رقم سالب صغير يصعب ملاحظته
// موجب = لك (بذمتنا لك)، سالب = عليك (بذمتك علينا) — منقولة من fmtBalanceLine (كانت بالسطر 3155)
export function fmtBalanceLine(curD: number, curDin: number): string {
  const lines: string[] = []
  if (curD) lines.push(`💵 ${Math.abs(curD).toLocaleString()}$ ${curD > 0 ? '(لك)' : '(عليك)'}`)
  if (curDin) lines.push(`💴 ${Math.abs(curDin).toLocaleString()} د.ع ${curDin > 0 ? '(لك)' : '(عليك)'}`)
  if (!lines.length) return 'رصيدك الحالي: متطابق (0)'
  return `رصيدك الحالي:\n${lines.join('\n')}`
}

interface ChatIdHolder {
  id: number
  tgChatId: string | null
}

// يجيب chat_id محدث مباشرة من قاعدة البيانات — العميل ممكن يكون ربط حسابه
// بتليجرام بعد ما فتح المحاسب التطبيق بالمتصفح، فتضل نسخة الذاكرة المحلية
// قديمة (بدون ربط) — منقولة من getFreshChatId (كانت بالسطر 3165)
export async function getFreshChatId(c: ChatIdHolder): Promise<string | null> {
  let chatId = c.tgChatId
  try {
    const rows = await sbFetch<{ telegram_chat_id: string | null }[]>(
      `customers?id=eq.${c.id}&select=telegram_chat_id`,
    )
    if (rows && rows[0]) {
      chatId = rows[0].telegram_chat_id || null
      c.tgChatId = chatId
    }
  } catch {
    // فشل التحديث — نكمل بالقيمة المخزنة محلياً كحل احتياطي
  }
  return chatId
}

// منقولة حرفياً من index.html (sendTgMessage، كانت بالسطر 3177)
export async function sendTgMessage(token: string, chatId: string, text: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Telegram API ${res.status}: ${body}`)
  }
}

export interface TelegramContext {
  tgBotToken: string
  findCustomer: (id: number) => ChatIdHolder | undefined
  /** يسجل نتيجة الإرسال (نجاح/فشل) على الحركة بقاعدة البيانات — markNotifResult */
  markNotifResult?: (failed: boolean) => Promise<void>
}

// إشعار تليجرام لحركة صندوق — منقولة حرفياً من index.html (sendTelegramNotif، كانت بالسطر 3193)
// snapCurD/snapCurDin: رصيد العميل الملتقط وقت هذي الحركة بالضبط (snapshot) —
// لازم ينطى من المتصل مو نقرأه هنا حي من كائن العميل المشترك، لأن هذا الكائن
// ممكن ينتغيّر بحركة ثانية أسرع منّا أثناء انتظارنا
export async function sendTelegramNotif(
  ctx: TelegramContext,
  customerId: number,
  noa: MoveType,
  mabD: number,
  mabDin: number,
  kind: 'new' | 'edit' | 'delete' = 'new',
  oldMabD = 0,
  oldMabDin = 0,
  snapCurD = 0,
  snapCurDin = 0,
): Promise<void> {
  try {
    const token = ctx.tgBotToken
    if (!token) return
    const c = ctx.findCustomer(customerId)
    if (!c) return

    const chatId = await getFreshChatId(c)
    if (!chatId) return

    const amountStr = fmtAmount(mabD, mabDin)
    const dir = noa === 'قبض' ? 'من' : 'الى'

    let actionLine: string
    if (kind === 'delete') {
      actionLine = `⚠️ تم إلغاء حركة ${noa || ''} بمبلغ ${amountStr} ${dir} حسابك — رجعت لرصيدك`
    } else if (kind === 'edit') {
      const oldAmountStr = fmtAmount(oldMabD, oldMabDin)
      actionLine = `✏️ تم تعديل حركة سابقة على حسابك (${noa || ''})\nكانت: ${oldAmountStr}\nصارت: ${amountStr}`
    } else {
      actionLine = `${noa === 'قبض' ? 'تم قبض' : 'تم صرف'} ${amountStr} ${dir} حسابك`
    }

    const text = `${actionLine}.\n${fmtBalanceLine(snapCurD, snapCurDin)}`
    await sendTgMessage(token, chatId, text)
    if (ctx.markNotifResult) await ctx.markNotifResult(false)
  } catch (e) {
    console.error('sendTelegramNotif:', e)
    toast('⚠️ الحركة انحفظت، بس فشل إشعار العميل بتليجرام — بلّغه يدوياً')
    if (ctx.markNotifResult) await ctx.markNotifResult(true)
  }
}

// يسجل نتيجة إرسال إشعار تليجرام على الحركة نفسها بقاعدة البيانات — منقولة
// من markNotifResult (كانت بالسطر 3230). التحديث المحلي (r.notifFailed) والبادج
// (updateNotifFailBadge) من مسؤولية المتصل بالـ store، هذا يحفظ لقاعدة البيانات بس
export async function persistNotifFailed(dbId: number, failed: boolean): Promise<void> {
  try {
    await sbFetch(`moves?id=eq.${dbId}`, 'PATCH', { tg_notif_failed: failed })
  } catch (e) {
    console.error('markNotifResult:', e)
  }
}

// إشعار تليجرام لحركة صيرفة ذمم عملاء — منقولة من sendTelegramSayarfaNotif (كانت بالسطر 3241)
export async function sendTelegramSayarfaNotif(
  tgBotToken: string,
  c: ChatIdHolder,
  type: 'شراء' | 'بيع',
  mabD: number,
  mabDin: number,
  rate: number,
  snapCurD = 0,
  snapCurDin = 0,
): Promise<void> {
  try {
    if (!tgBotToken) return
    const chatId = await getFreshChatId(c)
    if (!chatId) return

    const lines = [`🔄 تحويل عملة (صيرفة) على حسابك — ${type} دولار بسعر ${rate.toLocaleString()}`]
    if (mabD) lines.push(`💵 ${mabD.toLocaleString()}$`)
    if (mabDin) lines.push(`💴 ${mabDin.toLocaleString()} د.ع`)

    const text = `${lines.join('\n')}.\n${fmtBalanceLine(snapCurD, snapCurDin)}`
    await sendTgMessage(tgBotToken, chatId, text)
  } catch (e) {
    console.error('sendTelegramSayarfaNotif:', e)
    toast('⚠️ الحركة انحفظت، بس فشل إشعار العميل بتليجرام — بلّغه يدوياً')
  }
}
