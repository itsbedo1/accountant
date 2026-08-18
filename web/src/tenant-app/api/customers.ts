import { sbFetch } from '../../shared/sbFetch'
import type { CustomerBalance, CustomerMovement } from '../domain/balanceMath'

// كتابة أرصدة عميل كقيم مطلقة.
// ⚠️ ما تستخدمها لتسجيل حركة — استخدم dbApplyCustomerMovement تحت. هذي
// للحالات اللي نريد فيها *فرض* رصيد معيّن عمداً (استرجاع الرصيد الافتتاحي)،
// وفيها الكتابة المطلقة هي المطلوب بالضبط. منقولة من index.html (dbUpdateCustomerBal، كانت بالسطر 4802)
export async function dbSetCustomerBal(c: CustomerBalance): Promise<void> {
  try {
    await sbFetch(`customers?id=eq.${c.id}`, 'PATCH', { d_a: c.dA, d_l: c.dL, din_a: c.dinA, din_l: c.dinL })
  } catch (e) {
    console.error('dbSetCustomerBal:', e)
  }
}

export interface CustomerBalanceRow {
  dA: number
  dL: number
  dinA: number
  dinL: number
}

// نطبع التحذير مرة وحدة بس بدل ما نغرّق الـconsole بكل حركة
let missingRpcWarned = false

/**
 * يطبّق حركة على رصيد عميل داخل قاعدة البيانات نفسها (جملة UPDATE واحدة
 * تقفل الصف)، بدل ما يحسب المتصفح الناتج ويكتبه كقيمة مطلقة — وهذا اللي
 * يمنع ضياع كتابة مستخدم لما يشتغل اثنان بنفس الوقت.
 * يرجّع الأرصدة الجديدة كما هي فعلياً بقاعدة البيانات (حتى تتزامن الشاشة
 * مع الحقيقة لو كان مستخدم ثاني عدّل بالوسط)، أو null لو فشل التطبيق.
 */
export async function dbApplyCustomerMovement(mv: CustomerMovement): Promise<CustomerBalanceRow | 'unavailable' | null> {
  try {
    const rows = await sbFetch<{ d_a: number; d_l: number; din_a: number; din_l: number }[]>(
      'rpc/apply_customer_movement',
      'POST',
      { p_customer_id: mv.customerId, p_noa: mv.noa, p_mab_d: mv.mabD, p_mab_din: mv.mabDin },
    )
    const r = rows?.[0]
    // ماكو صف رجع = العميل غير موجود أو منعته صلاحيات RLS — فشل حقيقي
    if (!r) {
      console.error('dbApplyCustomerMovement: 0 rows for customer', mv.customerId)
      return null
    }
    return { dA: r.d_a, dL: r.d_l, dinA: r.din_a, dinL: r.din_l }
  } catch (e) {
    // الدالة لسا مو منصوبة بقاعدة البيانات (الـmigration ما انطبّق بعد) —
    // نرجع للطريقة القديمة حتى ما تتوقف الأرصدة نهائياً بهذي الفترة.
    // ⚠️ الطريقة القديمة هي نفسها الخلل اللي يصلحه هذا الملف، فهي حل مؤقت
    // للانتقال فقط: بعد تطبيق migration 20260812000000 يصير هذا الفرع ميتاً
    // ويمكن حذفه.
    if (isMissingFunction(e)) {
      if (!missingRpcWarned) {
        missingRpcWarned = true
        console.warn(
          '[أرصدة] الدالة apply_customer_movement غير موجودة بقاعدة البيانات — ' +
            'رجعنا مؤقتاً للكتابة المطلقة. طبّق migration 20260812000000_atomic_customer_balance.sql',
        )
      }
      return 'unavailable'
    }
    console.error('dbApplyCustomerMovement:', e)
    return null
  }
}

/** يميّز "الدالة غير موجودة" عن أي فشل ثاني (اتصال/صلاحيات) */
function isMissingFunction(e: unknown): boolean {
  const msg = (e as Error)?.message || ''
  return msg.includes('404') || msg.includes('PGRST202')
}

// إنشاء عميل جديد مع رصيد افتتاحي اختياري — منقولة من stAddAmil() (كانت بالسطر 4327)
export async function dbCreateCustomer(name: string, dL: number, dA: number, dinL: number, dinA: number): Promise<number | null> {
  const res = await sbFetch<{ id: number }[]>('customers', 'POST', {
    name,
    d_a: dA,
    d_l: dL,
    din_a: dinA,
    din_l: dinL,
    init_d_l: dL,
    init_d_a: dA,
    init_din_l: dinL,
    init_din_a: dinA,
  })
  return res?.[0]?.id ?? null
}

export async function dbDeleteCustomer(id: number): Promise<void> {
  await sbFetch(`customers?id=eq.${id}`, 'DELETE')
}
