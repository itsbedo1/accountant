import { describe, it, expect } from 'vitest'
import { applyToCustomer, applyAllEffects, reverseAllEffects, type CustomerBalance, type CashboxBalance } from './balanceMath'

function customer(overrides: Partial<CustomerBalance> = {}): CustomerBalance {
  return { id: 1, name: 'زياد الكبيسي', dA: 0, dL: 0, dinA: 0, dinL: 0, ...overrides }
}

describe('applyToCustomer', () => {
  it('قبض بدون رصيد سابق: يزيد dL (العميل صار له رصيد عندنا)', () => {
    const c = customer()
    applyToCustomer(c, 'قبض', 100, 0)
    expect(c.dL).toBe(100)
    expect(c.dA).toBe(0)
  })

  it('صرف بدون رصيد سابق: يزيد dA (العميل صار عليه دين)', () => {
    const c = customer()
    applyToCustomer(c, 'صرف', 100, 0)
    expect(c.dA).toBe(100)
    expect(c.dL).toBe(0)
  })

  it('قبض يسدد دين قائم بدون تجاوز: dA بس ينقص', () => {
    const c = customer({ dA: 300 })
    applyToCustomer(c, 'قبض', 100, 0)
    expect(c.dA).toBe(200)
    expect(c.dL).toBe(0)
  })

  it('قبض يتجاوز الدين القائم: dA يصفر والباقي يروح لـ dL (يعبر من دين لرصيد)', () => {
    const c = customer({ dA: 100 })
    applyToCustomer(c, 'قبض', 300, 0)
    expect(c.dA).toBe(0)
    expect(c.dL).toBe(200)
  })

  it('صرف يتجاوز الرصيد القائم: dL يصفر والباقي يروح لـ dA (يعبر من رصيد لدين)', () => {
    const c = customer({ dL: 100 })
    applyToCustomer(c, 'صرف', 300, 0)
    expect(c.dL).toBe(0)
    expect(c.dA).toBe(200)
  })

  it('يطبق الدولار والدينار بشكل مستقل بنفس الحركة', () => {
    const c = customer({ dA: 50, dinL: 20 })
    applyToCustomer(c, 'قبض', 200, 100)
    // dA: 50 يتصفر، الباقي 150 يروح لـ dL
    expect(c.dA).toBe(0)
    expect(c.dL).toBe(150)
    // dinL: يزيد مباشرة لأن dinA=0 أصلاً
    expect(c.dinA).toBe(0)
    expect(c.dinL).toBe(120)
  })

  it('مبلغ صفر ما يغيّر شي بتلك العملة', () => {
    const c = customer({ dA: 50 })
    applyToCustomer(c, 'قبض', 0, 0)
    expect(c).toEqual(customer({ dA: 50 }))
  })
})

describe('applyAllEffects / reverseAllEffects', () => {
  it('حركة بعميل واحد بس (amilId) وجهة صرف = الصندوق: يحدث العميل والصندوق', () => {
    const customers = [customer({ id: 1 })]
    const cashbox: CashboxBalance = { initBalD: 1000, initBalDin: 0 }
    applyAllEffects(customers, cashbox, { amilId: 1, jiha: 'الصندوق', noa: 'قبض', mabD: 300, mabDin: 0 })
    expect(customers[0].dL).toBe(300)
    expect(cashbox.initBalD).toBe(1300)
  })

  it('جهة الصرف عميل ثاني (لا الصندوق) بدون amilId: يتحدث بس رصيد جهة الصرف بتأثير معكوس، مو الصندوق', () => {
    const customers = [customer({ id: 1, name: 'عميل1' }), customer({ id: 2, name: 'عميل2' })]
    const cashbox: CashboxBalance = { initBalD: 1000, initBalDin: 0 }
    // صرف للحساب الرئيسي = تأثير معكوس على جهة الصرف = قبض منها → dL يزيد
    applyAllEffects(customers, cashbox, { amilId: null, jiha: 'عميل2', noa: 'صرف', mabD: 100, mabDin: 0 })
    expect(cashbox.initBalD).toBe(1000) // ما تغير
    expect(customers[1].dL).toBe(100)
    expect(customers[1].dA).toBe(0)
  })

  it('حركة تحويل بين عميلين (amilId وjiha كلاهما عملاء مختلفين): تتأثر أرصدة الاثنين، لا الصندوق', () => {
    const amil = customer({ id: 1, name: 'الحساب الرئيسي' })
    const jiha = customer({ id: 2, name: 'جهة الصرف' })
    const customers = [amil, jiha]
    const cashbox: CashboxBalance = { initBalD: 1000, initBalDin: 0 }

    // صرف: الحساب الرئيسي يستلم (يصير له عليه دين)، جهة الصرف تدفع (تأثيرها معكوس = قبض)
    applyAllEffects(customers, cashbox, { amilId: 1, jiha: 'جهة الصرف', noa: 'صرف', mabD: 500, mabDin: 0 })

    expect(amil.dA).toBe(500) // دفعنا له
    expect(jiha.dL).toBe(500) // جهة الصرف "دفعت" فعلياً (قبض من جهة الصرف بمنطق applyToCustomer يعني... تأكيد أدناه)
    expect(cashbox.initBalD).toBe(1000) // الصندوق ما تأثر أبداً بحركة تحويل بين عميلين
  })

  // ⚠️ ملاحظة مهمة اكتشفناها أثناء كتابة هذا الاختبار: reverseAllEffects ما
  // يرجع دايماً لنفس القيم الأصلية لـ dA/dL حرفياً إذا كانت applyAllEffects
  // الأصلية "عبرت" من دين لرصيد (أو العكس) — بس صافي الرصيد (dL-dA) يضل
  // صحيح دايماً. هذا سلوك موجود بالبرنامج الحالي (index.html) نفسه، مو خطأ
  // انولد بهذا النقل — محفوظ هنا بالضبط زي ما هو، وتم إبلاغ المستخدم به لاتخاذ القرار
  // (يصير ملموساً بصفحة "أرصدة العملاء" اللي تعرض دولار له/عليه منفصلين، مو الصافي بس)
  it('reverseAllEffects يحافظ على صافي الرصيد (dL-dA) حتى لو تغيّر توزيع dA/dL الداخلي — عميل واحد + الصندوق', () => {
    const customers = [customer({ id: 1, dA: 200, dL: 50 })]
    const cashbox: CashboxBalance = { initBalD: 1000, initBalDin: 500 }
    const netBefore = customers[0].dL - customers[0].dA
    const cashboxBefore = { ...cashbox }

    const move = { amilId: 1, jiha: 'الصندوق', noa: 'قبض' as const, mabD: 700, mabDin: 300 }
    applyAllEffects(customers, cashbox, move)
    reverseAllEffects(customers, cashbox, move)

    expect(customers[0].dL - customers[0].dA).toBe(netBefore)
    expect(cashbox).toEqual(cashboxBefore) // الصندوق دايماً يرجع مضبوط لأنه رقم واحد بس (مو dA/dL منفصلين)
  })

  it('reverseAllEffects يحافظ على صافي الرصيد لحركة تحويل بين عميلين، حتى لو تغيّر التوزيع الداخلي', () => {
    const amil = customer({ id: 1, name: 'أ', dA: 100, dL: 400 })
    const jiha = customer({ id: 2, name: 'ب', dA: 50, dL: 900 })
    const customers = [amil, jiha]
    const cashbox: CashboxBalance = { initBalD: 1000, initBalDin: 0 }
    const netAmilBefore = amil.dL - amil.dA
    const netJihaBefore = jiha.dL - jiha.dA

    const move = { amilId: 1, jiha: 'ب', noa: 'صرف' as const, mabD: 250, mabDin: 0 }
    applyAllEffects(customers, cashbox, move)
    reverseAllEffects(customers, cashbox, move)

    expect(amil.dL - amil.dA).toBe(netAmilBefore)
    expect(jiha.dL - jiha.dA).toBe(netJihaBefore)
  })

  it('لا amilId ولا جهة صرف مطابقة لعميل ولا للصندوق: ما يصير أي تغيير (مثلاً جهة صرف بنك خارجي)', () => {
    const customers = [customer({ id: 1, name: 'عميل1' })]
    const cashbox: CashboxBalance = { initBalD: 1000, initBalDin: 0 }
    applyAllEffects(customers, cashbox, { amilId: null, jiha: 'بنك خارجي', noa: 'قبض', mabD: 500, mabDin: 0 })
    expect(customers[0]).toEqual(customer({ id: 1, name: 'عميل1' }))
    expect(cashbox).toEqual({ initBalD: 1000, initBalDin: 0 })
  })
})
