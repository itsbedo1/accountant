import type { MoveType } from '../../shared/types'

export interface CustomerBalance {
  id: number
  name: string
  dA: number
  dL: number
  dinA: number
  dinL: number
}

export interface CashboxBalance {
  initBalD: number
  initBalDin: number
}

export interface MoveEffect {
  amilId: number | null
  jiha: string
  noa: MoveType
  mabD: number
  mabDin: number
}

// تغيير رصيد زبون حسب نوع الحركة — منقولة حرفياً من index.html (applyToCustomer، كانت بالسطر 2443)
//
// المنطق المحاسبي:
//   dL = له  = العميل يدين لنا (net+)
//   dA = عليه = نحن ندين له (net-)
//   net = dL - dA
//
//   قبض: العميل دفع لنا → ديننا له نقص، أو ديوننا له نقصت
//        → dL ينقص أولاً، إذا صفر dA يزيد (صرنا ندينه)
//   صرف: دفعنا للعميل → ديننا له زادت، أو ديونه لنا زادت
//        → dA ينقص أولاً، إذا صفر dL يزيد
export function applyToCustomer(c: CustomerBalance, noa: MoveType, mabD: number, mabDin: number): void {
  if (noa === 'قبض') {
    if (mabD > 0) {
      if (c.dA >= mabD) {
        c.dA -= mabD
      } else {
        const rem = mabD - c.dA
        c.dA = 0
        c.dL += rem
      }
    }
    if (mabDin > 0) {
      if (c.dinA >= mabDin) {
        c.dinA -= mabDin
      } else {
        const rem = mabDin - c.dinA
        c.dinA = 0
        c.dinL += rem
      }
    }
  } else if (noa === 'صرف') {
    if (mabD > 0) {
      if (c.dL >= mabD) {
        c.dL -= mabD
      } else {
        const rem = mabD - c.dL
        c.dL = 0
        c.dA += rem
      }
    }
    if (mabDin > 0) {
      if (c.dinL >= mabDin) {
        c.dinL -= mabDin
      } else {
        const rem = mabDin - c.dinL
        c.dinL = 0
        c.dinA += rem
      }
    }
  }
}

// تطبيق تأثير الحركة على العميل (الحساب الرئيسي) وجهة الصرف والصندوق —
// منقولة حرفياً من index.html (applyAllEffects، كانت بالسطر 2382)
export function applyAllEffects(customers: CustomerBalance[], cashbox: CashboxBalance, r: MoveEffect): void {
  // 1) العميل في الحساب الرئيسي
  if (r.amilId != null) {
    const c = customers.find((x) => x.id === r.amilId)
    if (c) applyToCustomer(c, r.noa, r.mabD, r.mabDin)
  }
  // 2) جهة الصرف — إذا كانت زبون
  const jihaC = customers.find((x) => x.name === r.jiha)
  if (jihaC) {
    // جهة الصرف تأثيرها معكوس:
    // قبض من العميل الرئيسي = صرف لجهة الصرف (يزيد رصيدها)
    // صرف للعميل الرئيسي  = قبض من جهة الصرف (ينقص رصيدها)
    const jihaEffect: MoveType = r.noa === 'قبض' ? 'صرف' : 'قبض'
    applyToCustomer(jihaC, jihaEffect, r.mabD, r.mabDin)
  }
  // 3) إذا جهة الصرف = الصندوق → يتغير رصيد القاصة
  if (r.jiha === 'الصندوق') {
    if (r.noa === 'قبض') {
      cashbox.initBalD += r.mabD
      cashbox.initBalDin += r.mabDin
    } else if (r.noa === 'صرف') {
      cashbox.initBalD -= r.mabD
      cashbox.initBalDin -= r.mabDin
    }
  }
}

// ── حركة واحدة على رصيد عميل واحد، تنفّذها قاعدة البيانات ذرياً ──────────
// الدالتان تحت تبنيان نفس ما تطبّقه applyAllEffects/reverseAllEffects على
// العملاء بالضبط (نفس الترتيب ونفس أنواع الحركات)، بس بدل ما تعدّلا الأرصدة
// محلياً ترجّعان قائمة الحركات المطلوبة — حتى تطبّقها قاعدة البيانات بدل
// المتصفح، فما تنمسح كتابة مستخدم بكتابة مستخدم ثاني شغّال بنفس الوقت.
export interface CustomerMovement {
  customerId: number
  noa: MoveType
  mabD: number
  mabDin: number
}

const flip = (noa: MoveType): MoveType => (noa === 'قبض' ? 'صرف' : 'قبض')

/** يقابل applyAllEffects — الجزء الخاص بالعملاء منها فقط (القاصة تُحسب محلياً) */
export function movementsForApply(customers: CustomerBalance[], r: MoveEffect): CustomerMovement[] {
  const out: CustomerMovement[] = []
  if (r.amilId != null) {
    const c = customers.find((x) => x.id === r.amilId)
    if (c) out.push({ customerId: c.id, noa: r.noa, mabD: r.mabD, mabDin: r.mabDin })
  }
  const jihaC = customers.find((x) => x.name === r.jiha)
  // جهة الصرف تأثيرها معكوس — نفس منطق applyAllEffects
  if (jihaC) out.push({ customerId: jihaC.id, noa: flip(r.noa), mabD: r.mabD, mabDin: r.mabDin })
  return out
}

/** يقابل reverseAllEffects — نفس الحركات بالاتجاه المعاكس */
export function movementsForReverse(customers: CustomerBalance[], r: MoveEffect): CustomerMovement[] {
  const out: CustomerMovement[] = []
  if (r.amilId != null) {
    const c = customers.find((x) => x.id === r.amilId)
    if (c) out.push({ customerId: c.id, noa: flip(r.noa), mabD: r.mabD, mabDin: r.mabDin })
  }
  const jihaC = customers.find((x) => x.name === r.jiha)
  // عكس العكس = نفس نوع الحركة الأصلي
  if (jihaC) out.push({ customerId: jihaC.id, noa: r.noa, mabD: r.mabD, mabDin: r.mabDin })
  return out
}

// عكس تأثير applyAllEffects بالضبط — منقولة حرفياً من index.html (reverseAllEffects، كانت بالسطر 2409)
export function reverseAllEffects(customers: CustomerBalance[], cashbox: CashboxBalance, r: MoveEffect): void {
  if (r.amilId != null) {
    const c = customers.find((x) => x.id === r.amilId)
    if (c) {
      const rev: MoveType = r.noa === 'قبض' ? 'صرف' : 'قبض'
      applyToCustomer(c, rev, r.mabD, r.mabDin)
    }
  }
  const jihaC = customers.find((x) => x.name === r.jiha)
  if (jihaC) {
    const jihaRev: MoveType = r.noa === 'قبض' ? 'قبض' : 'صرف'
    applyToCustomer(jihaC, jihaRev, r.mabD, r.mabDin)
  }
  if (r.jiha === 'الصندوق') {
    if (r.noa === 'قبض') {
      cashbox.initBalD -= r.mabD
      cashbox.initBalDin -= r.mabDin
    } else if (r.noa === 'صرف') {
      cashbox.initBalD += r.mabD
      cashbox.initBalDin += r.mabDin
    }
  }
}
