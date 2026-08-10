import { useState } from 'react'
import { useDataStore } from '../../state/useDataStore'

interface Mismatch {
  name: string
  id: number
  diffD: number
  diffDin: number
  hasMoves: boolean
}

// يقارن رصيد كل عميل الحالي بالرصيد اللي المفروض ينتج من إعادة حساب رصيده
// الافتتاحي + كل حركاته المسجلة — منقولة من stCheckBalances() (كانت بالسطر 4217)
export default function BalanceCheckPanel() {
  const customers = useDataStore((s) => s.customers)
  const moves = useDataStore((s) => s.moves)
  const fixCustomerBalance = useDataStore((s) => s.fixCustomerBalance)
  const documentCustomerDiff = useDataStore((s) => s.documentCustomerDiff)
  const [checked, setChecked] = useState(false)
  const [mismatches, setMismatches] = useState<Mismatch[]>([])

  function check() {
    const found: Mismatch[] = []
    for (const c of customers) {
      let expD = (c.initDL != null ? c.initDL : c.dL) - (c.initDA != null ? c.initDA : c.dA)
      let expDin = (c.initDinL != null ? c.initDinL : c.dinL) - (c.initDinA != null ? c.initDinA : c.dinA)
      let hasMoves = false
      for (const r of moves) {
        const isAmil = r.amilId === c.id
        const isJiha = r.jiha === c.name
        if (isAmil || isJiha) hasMoves = true
        if (isAmil) {
          if (r.noa === 'قبض') {
            expD += r.mabD
            expDin += r.mabDin
          } else {
            expD -= r.mabD
            expDin -= r.mabDin
          }
        } else if (isJiha) {
          if (r.noa === 'قبض') {
            expD -= r.mabD
            expDin -= r.mabDin
          } else {
            expD += r.mabD
            expDin += r.mabDin
          }
        }
      }
      const curD = c.dL - c.dA,
        curDin = c.dinL - c.dinA
      const diffD = Math.round((curD - expD) * 100) / 100
      const diffDin = Math.round(curDin - expDin)
      if (Math.abs(diffD) >= 1 || Math.abs(diffDin) >= 1) {
        found.push({ name: c.name, id: c.id, diffD, diffDin, hasMoves })
      }
    }
    setMismatches(found)
    setChecked(true)
  }

  return (
    <div style={{ background: 'rgba(240,192,64,.06)', border: '1px solid rgba(240,192,64,.25)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
      <div style={{ color: 'var(--gold)', fontSize: 13, fontWeight: 900, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>🔍 فحص تطابق أرصدة العملاء</div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 10, textAlign: 'right' }}>
        يقارن رصيد كل عميل الحالي بمجموع كل حركاته المسجلة — لو فيه فرق، معناه رصيده تأثر بدون حركة توضحه (مثل خطأ تعديل قديم).
      </div>
      <button
        onClick={check}
        style={{ width: '100%', padding: 10, borderRadius: 8, fontFamily: "'Cairo',sans-serif", fontSize: 13, fontWeight: 900, background: 'rgba(240,192,64,.2)', border: '1.5px solid rgba(240,192,64,.5)', color: 'var(--gold)', cursor: 'pointer', marginBottom: 8 }}
      >
        🔍 فحص الآن
      </button>

      {checked && !mismatches.length && <div style={{ textAlign: 'center', color: '#60ff90', fontSize: 12, padding: 10 }}>✅ كل الأرصدة متطابقة — ما فيه أي فرق مشبوه</div>}

      {checked && mismatches.length > 0 && (
        <>
          <div style={{ color: 'var(--red)', fontSize: 12, fontWeight: 900, marginBottom: 6, textAlign: 'center' }}>⚠️ لقينا {mismatches.length} عميل عندهم فرق مشبوه:</div>
          {mismatches.map((m) => (
            <div key={m.id} style={{ background: 'rgba(251,113,133,.1)', border: '1px solid rgba(251,113,133,.3)', borderRadius: 8, padding: 10, marginBottom: 6 }}>
              <div style={{ color: 'white', fontWeight: 900, fontSize: 13, marginBottom: 4 }}>
                {m.name} (#{m.id})
              </div>
              {!!m.diffD && (
                <div style={{ color: 'var(--gold)', fontSize: 12 }}>
                  فرق دولار: {m.diffD > 0 ? '+' : ''}
                  {m.diffD.toLocaleString()}$
                </div>
              )}
              {!!m.diffDin && (
                <div style={{ color: 'var(--accent)', fontSize: 12 }}>
                  فرق دينار: {m.diffDin > 0 ? '+' : ''}
                  {m.diffDin.toLocaleString()} د.ع
                </div>
              )}
              {m.hasMoves ? (
                <>
                  <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 6 }}>
                    ⚠️ عنده حركات فعلية مسجلة — ما نصلحه تلقائياً برجاع الرصيد الافتتاحي (ممكن يمسح حركاته الحقيقية الثانية). إذا متأكد إن الفرق سببه حركة حقيقية صارت فعلاً وأثرها موجود بالرصيد بس انفقد سجلها، تكدر توثقها كحركة بدون ما تغير الرصيد الحالي:
                  </div>
                  <button
                    onClick={() => {
                      const parts: string[] = []
                      if (m.diffD) parts.push(`${Math.abs(m.diffD).toLocaleString()}$`)
                      if (m.diffDin) parts.push(`${Math.abs(m.diffDin).toLocaleString()} د.ع`)
                      if (!confirm(`إضافة حركة توثيقية لحساب ${m.name} بمبلغ ${parts.join(' + ')}\n\nهذي الحركة فقط توضح سبب الرصيد الحالي بكشف حسابه — ما راح تغيّر رصيده أبداً (الفرق أصلاً محسوب بالرصيد الحالي).\n\nتأكد إنك ما وثقت هذا الفرق مرة سابقة قبل ما تضغط تأكيد.`)) return
                      void documentCustomerDiff(m.id, m.diffD, m.diffDin).then(check)
                    }}
                    style={{ marginTop: 8, width: '100%', padding: 8, borderRadius: 7, fontFamily: "'Cairo',sans-serif", fontSize: 12, fontWeight: 900, background: 'rgba(96,180,255,.15)', border: '1.5px solid rgba(96,180,255,.5)', color: '#60b4ff', cursor: 'pointer' }}
                  >
                    📝 توثيق الفرق كحركة (بدون تغيير الرصيد)
                  </button>
                </>
              ) : (
                <>
                  <div style={{ color: 'var(--gold)', fontSize: 11, marginTop: 6 }}>
                    ⚠️ ماكو حركة مسجلة بس هذا لا يعني الرصيد غلط بالضرورة — يمكن حركة حقيقية صارت وانفقد سجلها بس أثرها ضل بالرصيد. تأكد إنك ما سويت حركة حقيقية بهذا المبلغ لهذا العميل قبل ما تضغط استرجاع.
                  </div>
                  <button
                    onClick={() => {
                      const c = customers.find((x) => x.id === m.id)
                      if (!c) return
                      const newDL = c.initDL || 0,
                        newDA = c.initDA || 0,
                        newDinL = c.initDinL || 0,
                        newDinA = c.initDinA || 0
                      if (!confirm(`استرجاع رصيد ${c.name} الافتتاحي:\nدولار له: ${newDL} / عليه: ${newDA}\nدينار له: ${newDinL} / عليه: ${newDinA}\n\nمتأكد؟`)) return
                      void fixCustomerBalance(m.id).then(check)
                    }}
                    style={{ marginTop: 8, width: '100%', padding: 8, borderRadius: 7, fontFamily: "'Cairo',sans-serif", fontSize: 12, fontWeight: 900, background: 'rgba(96,255,144,.15)', border: '1.5px solid rgba(96,255,144,.5)', color: '#60ff90', cursor: 'pointer' }}
                  >
                    🔧 استرجاع الرصيد الافتتاحي
                  </button>
                </>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
