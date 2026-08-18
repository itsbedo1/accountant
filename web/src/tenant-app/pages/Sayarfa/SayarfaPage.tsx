import { useState } from 'react'
import { formatAmountInput, parseAmount } from '../../../shared/format'
import { toast } from '../../../shared/useToast'
import { useDataStore } from '../../state/useDataStore'
import AmilPickerModal from '../../../shared/AmilPickerModal'
import type { SayarfaType } from '../../../shared/types'

function todayShort() {
  const now = new Date()
  const d = String(now.getDate()).padStart(2, '0')
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${d}/${m}/${now.getFullYear()}`
}

// منقولة من pageSayarfa (index.html:1261) — sfOpen/sfSetMode/sfSetType/
// sfCalcFromD/sfCalcFromDin/sfShowResult/sfSave/sfReset (كانت بالسطر 3729-3993)
export default function SayarfaPage({ goPage }: { goPage: (id: string) => void }) {
  const customers = useDataStore((s) => s.customers)
  const initBalD = useDataStore((s) => s.initBalD)
  const initBalDin = useDataStore((s) => s.initBalDin)
  const saveSayarfaCash = useDataStore((s) => s.saveSayarfaCash)
  const saveSayarfaAmil = useDataStore((s) => s.saveSayarfaAmil)

  const [mode, setMode] = useState<'نقدي' | 'ذمم عملاء'>('نقدي')
  const [selectedAmilId, setSelectedAmilId] = useState<number | null>(null)
  const [amilModalOpen, setAmilModalOpen] = useState(false)
  const [type, setType] = useState<SayarfaType | ''>('')
  const [rateStr, setRateStr] = useState('1,480')
  const [mabDStr, setMabDStr] = useState('0')
  const [mabDinStr, setMabDinStr] = useState('0')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedAmil = selectedAmilId != null ? customers.find((c) => c.id === selectedAmilId) : null

  const rate = parseAmount(rateStr)
  const mabD = parseAmount(mabDStr)
  const mabDin = parseAmount(mabDinStr)

  function setModeAndReset(m: 'نقدي' | 'ذمم عملاء') {
    setMode(m)
    if (m === 'نقدي') {
      setSelectedAmilId(null)
    }
  }

  function selAmil(c: { id: number }) {
    setSelectedAmilId(c.id)
    setAmilModalOpen(false)
  }

  // يعادل sfCalcFromD() — تغيّر مبلغ الدولار يحسب الدينار تلقائياً
  function onMabDChange(v: string) {
    const formatted = formatAmountInput(v)
    setMabDStr(formatted)
    const d = parseAmount(formatted)
    setMabDinStr(Math.round(d * rate).toLocaleString('en-US'))
  }

  // يعادل sfCalcFromDin() — تغيّر مبلغ الدينار يحسب الدولار تلقائياً
  function onMabDinChange(v: string) {
    const formatted = formatAmountInput(v)
    setMabDinStr(formatted)
    const din = parseAmount(formatted)
    if (rate > 0) setMabDStr(parseFloat((din / rate).toFixed(2)).toLocaleString('en-US'))
  }

  // يعادل sfCalc() = sfCalcFromD() — تغيّر السعر يعيد حساب الدينار من الدولار الحالي
  function onRateChange(v: string) {
    const formatted = formatAmountInput(v)
    setRateStr(formatted)
    const r = parseAmount(formatted)
    setMabDinStr(Math.round(mabD * r).toLocaleString('en-US'))
  }

  // رصيد القاصة أو العميل الحالي — يعادل sfRefreshBal()
  const curBalD = mode === 'ذمم عملاء' ? (selectedAmil ? selectedAmil.dL - selectedAmil.dA : null) : initBalD
  const curBalDin = mode === 'ذمم عملاء' ? (selectedAmil ? selectedAmil.dinL - selectedAmil.dinA : null) : initBalDin

  // نتيجة بعد العملية — يعادل sfShowResult()
  let afterD: number | null = null,
    afterDin: number | null = null
  const showResult = !!type && (!!mabD || !!mabDin) && (mode !== 'ذمم عملاء' || !!selectedAmil)
  if (showResult) {
    afterD = curBalD ?? 0
    afterDin = curBalDin ?? 0
    if (type === 'شراء') {
      afterD += mabD
      afterDin -= mabDin
    } else {
      afterD -= mabD
      afterDin += mabDin
    }
  }

  function reset() {
    setType('')
    setMabDStr('0')
    setMabDinStr('0')
    setNotes('')
    setSelectedAmilId(null)
  }

  async function save() {
    if (saving) {
      toast('⏳ فيه حفظ سابق لا يزال قيد التنفيذ — انتظر لحظة')
      return
    }
    if (!type) {
      toast('⚠️ اختر نوع العملية')
      return
    }
    if (!mabD && !mabDin) {
      toast('⚠️ أدخل المبلغ')
      return
    }
    if (!rate) {
      toast('⚠️ أدخل سعر الصرف')
      return
    }

    if (mode === 'ذمم عملاء' && !selectedAmilId) {
      toast('⚠️ اختر عميل أولاً')
      return
    }

    setSaving(true)
    const ok =
      mode === 'ذمم عملاء'
        ? await saveSayarfaAmil(selectedAmilId!, type, mabD, mabDin, rate, notes)
        : await saveSayarfaCash(type, mabD, mabDin, rate, notes)
    setSaving(false)

    // ما نفرّغ النموذج إلا لو انحفظت فعلاً — قبل هذا كان يتفرّغ دائماً، فلو
    // فشل الحفظ يخسر المستخدم ما أدخله بدون ما يدري إنه فشل أصلاً
    if (ok) reset()
  }

  return (
    <div id="pageSayarfa" className="page active">
      <div style={{ background: 'linear-gradient(135deg,#071428,#0d2348)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
        <div style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 900, color: 'white' }}>💱</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: 'white', textDecoration: 'underline', textUnderlineOffset: 3 }}>الصيرفة</div>
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 6, padding: '5px 10px', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>{todayShort()}</div>
      </div>

      <div id="sfPage" style={{ padding: '12px 14px', maxWidth: 480, margin: '0 auto', paddingBottom: 90 }}>
        {/* رصيد القاصة/العميل الحالي */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 12 }}>
          <div style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
            {mode === 'ذمم عملاء' ? 'رصيد العميل الحالي' : 'رصيد القاصة الحالي'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: 'rgba(240,192,64,0.15)', border: '1.5px solid rgba(240,192,64,0.4)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
              <div style={{ color: '#f0c040', fontSize: 10, fontWeight: 700, marginBottom: 3 }}>دولار $</div>
              <div style={{ color: '#f0e060', fontSize: 16, fontWeight: 900, direction: 'ltr' }}>{curBalD == null ? '—' : curBalD.toLocaleString()}</div>
            </div>
            <div style={{ background: 'rgba(96,216,160,0.15)', border: '1.5px solid rgba(96,216,160,0.4)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
              <div style={{ color: '#60d8a0', fontSize: 10, fontWeight: 700, marginBottom: 3 }}>دينار IQD</div>
              <div style={{ color: '#80ffb8', fontSize: 14, fontWeight: 900, direction: 'ltr' }}>{curBalDin == null ? '—' : curBalDin.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* نوع الحركة */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 12 }}>
          <div style={{ color: 'var(--text2)', fontSize: 11, fontWeight: 700, marginBottom: 8, textAlign: 'right' }}>نوع الحركة</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <ModeBtn active={mode === 'نقدي'} onClick={() => setModeAndReset('نقدي')}>
              💰 نقدي (القاصة)
            </ModeBtn>
            <ModeBtn active={mode === 'ذمم عملاء'} onClick={() => setModeAndReset('ذمم عملاء')}>
              👤 ذمم عملاء
            </ModeBtn>
          </div>
          {mode === 'ذمم عملاء' && (
            <div style={{ marginTop: 10 }}>
              <div style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 700, marginBottom: 5, textAlign: 'right' }}>العميل</div>
              <input
                type="text"
                readOnly
                placeholder="اضغط لاختيار العميل ▾"
                aria-label="العميل"
                value={selectedAmil?.name || ''}
                onClick={() => setAmilModalOpen(true)}
                style={{ width: '100%', background: '#071e38', border: '2px solid rgba(34,211,238,.4)', borderRadius: 8, padding: 10, fontFamily: "'Cairo',sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--text)', textAlign: 'center', cursor: 'pointer' }}
              />
            </div>
          )}
        </div>

        {/* نوع العملية */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 12 }}>
          <div style={{ color: 'var(--text2)', fontSize: 11, fontWeight: 700, marginBottom: 8, textAlign: 'right' }}>نوع العملية</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              onClick={() => setType('شراء')}
              style={{ padding: '12px 6px', borderRadius: 9, fontFamily: "'Cairo',sans-serif", fontSize: 14, fontWeight: 900, border: type === 'شراء' ? '2px solid #40d060' : '2px solid rgba(255,255,255,0.3)', background: type === 'شراء' ? '#1a7a30' : 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}
            >
              🟢 شراء دولار
            </button>
            <button
              onClick={() => setType('بيع')}
              style={{ padding: '12px 6px', borderRadius: 9, fontFamily: "'Cairo',sans-serif", fontSize: 14, fontWeight: 900, border: type === 'بيع' ? '2px solid #d04040' : '2px solid rgba(255,255,255,0.3)', background: type === 'بيع' ? '#7a1a1a' : 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}
            >
              🔴 بيع دولار
            </button>
          </div>
        </div>

        {/* المبالغ وسعر الصرف */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 12 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: 'var(--text2)', fontSize: 11, fontWeight: 700, marginBottom: 5, textAlign: 'right' }}>سعر الصرف (دينار لكل دولار)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="text"
                inputMode="numeric"
                aria-label="سعر الصرف (دينار لكل دولار)"
                value={rateStr}
                onChange={(e) => onRateChange(e.target.value)}
                style={{ flex: 1, background: 'var(--bg3)', border: '2px solid var(--border2)', borderRadius: 8, padding: 10, fontFamily: "'Cairo',sans-serif", fontSize: 18, fontWeight: 900, color: 'var(--gold)', textAlign: 'center', direction: 'ltr' }}
              />
              <div style={{ color: 'var(--text2)', fontSize: 12, fontWeight: 700, textAlign: 'center', lineHeight: 1.4, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px' }}>
                IQD
                <br />
                /$
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ color: 'var(--gold)', fontSize: 11, fontWeight: 700, marginBottom: 5, textAlign: 'right' }}>مبلغ الدولار $</div>
            <input
              type="text"
              inputMode="decimal"
              aria-label="مبلغ الدولار $"
              value={mabDStr}
              onChange={(e) => onMabDChange(e.target.value)}
              style={{ width: '100%', background: 'var(--bg3)', border: '2px solid rgba(251,191,36,.4)', borderRadius: 8, padding: 10, fontFamily: "'Cairo',sans-serif", fontSize: 18, fontWeight: 900, color: 'var(--gold)', textAlign: 'center', direction: 'ltr' }}
            />
          </div>

          <div style={{ textAlign: 'center', margin: '8px 0', fontSize: 22, color: 'var(--text-dim)' }}>
            {!type ? '⇅' : type === 'شراء' ? 'دينار ← دولار  💵' : 'دولار ← دينار  🪙'}
          </div>

          <div>
            <div style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 700, marginBottom: 5, textAlign: 'right' }}>مبلغ الدينار IQD</div>
            <input
              type="text"
              inputMode="numeric"
              aria-label="مبلغ الدينار IQD"
              value={mabDinStr}
              onChange={(e) => onMabDinChange(e.target.value)}
              style={{ width: '100%', background: 'var(--bg3)', border: '2px solid rgba(34,211,238,.4)', borderRadius: 8, padding: 10, fontFamily: "'Cairo',sans-serif", fontSize: 18, fontWeight: 900, color: 'var(--accent)', textAlign: 'center', direction: 'ltr' }}
            />
          </div>
        </div>

        {/* نتيجة التأثير */}
        {showResult && (
          <div style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
              بعد العملية — {mode === 'ذمم عملاء' ? 'رصيد العميل' : 'رصيد القاصة'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ background: 'rgba(240,192,64,0.1)', border: '1px solid rgba(240,192,64,0.3)', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                <div style={{ color: '#f0c040', fontSize: 10, fontWeight: 600 }}>دولار $</div>
                <div style={{ color: (afterD ?? 0) < 0 ? '#ff6060' : '#f0e060', fontSize: 15, fontWeight: 900, direction: 'ltr' }}>{(afterD ?? 0).toLocaleString()}</div>
              </div>
              <div style={{ background: 'rgba(96,216,160,0.1)', border: '1px solid rgba(96,216,160,0.3)', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                <div style={{ color: '#60d8a0', fontSize: 10, fontWeight: 600 }}>دينار IQD</div>
                <div style={{ color: (afterDin ?? 0) < 0 ? '#ff6060' : '#80ffb8', fontSize: 13, fontWeight: 900, direction: 'ltr' }}>{(afterDin ?? 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* ملاحظات */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 12 }}>
          <div style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 700, marginBottom: 5, textAlign: 'right' }}>ملاحظات</div>
          <textarea
            placeholder="اختياري..."
            aria-label="ملاحظات"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ width: '100%', background: '#071e38', border: '1.5px solid var(--border2)', borderRadius: 7, padding: '9px 12px', fontFamily: "'Cairo',sans-serif", fontSize: 13, color: 'var(--text)', direction: 'rtl', resize: 'none', height: 55 }}
          />
        </div>
      </div>

      <div id="sfToolbar" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#040d1a', borderTop: '1px solid rgba(34,211,238,.2)', display: 'flex', gap: 8, padding: '8px 12px', zIndex: 200, maxWidth: 480, margin: '0 auto' }}>
        <button
          onClick={() => void save()}
          disabled={saving}
          style={{ flex: 2, padding: 12, borderRadius: 9, fontFamily: "'Cairo',sans-serif", fontSize: 14, fontWeight: 900, background: '#f0c040', border: 'none', color: '#0a1628', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? '⏳ جاري الحفظ...' : '💾 تنفيذ وحفظ'}
        </button>
        <button onClick={reset} style={{ flex: 1, padding: 12, borderRadius: 9, fontFamily: "'Cairo',sans-serif", fontSize: 14, fontWeight: 700, background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.3)', color: 'white', cursor: 'pointer' }}>
          🔄 مسح
        </button>
        <button
          onClick={() => goPage('pageMain')}
          aria-label="الرئيسية"
          style={{ flex: 1, padding: 12, borderRadius: 9, fontFamily: "'Cairo',sans-serif", fontSize: 14, fontWeight: 700, background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.3)', color: 'white', cursor: 'pointer' }}
        >
          🏠
        </button>
      </div>

      <AmilPickerModal open={amilModalOpen} customers={customers} onSelect={selAmil} onClose={() => setAmilModalOpen(false)} />
    </div>
  )
}

function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: '12px 6px', borderRadius: 9, fontFamily: "'Cairo',sans-serif", fontSize: 14, fontWeight: 900, border: active ? '2px solid #40a0e0' : '2px solid rgba(255,255,255,0.3)', background: active ? '#1a5a8a' : 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}
    >
      {children}
    </button>
  )
}
