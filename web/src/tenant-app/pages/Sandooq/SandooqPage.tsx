import { useEffect, useState } from 'react'
import { useClock } from '../../../shared/useClock'
import { formatAmountInput, parseAmount } from '../../../shared/format'
import { todayISO } from '../../../shared/date'
import { toast } from '../../../shared/useToast'
import { useDataStore } from '../../state/useDataStore'
import RoleGate from '../../components/RoleGate'
import type { MoveDraft } from '../../api/moves'
import type { Move, MoveType } from '../../../shared/types'
import HesabPickerModal from './HesabPickerModal'
import JihaPickerModal from './JihaPickerModal'
import AmilPickerModal from '../../../shared/AmilPickerModal'
import SearchModal from './SearchModal'
import ConfirmSaveModal from './ConfirmSaveModal'

// الحسابات اللي ما تحتاج عميل — منقولة من NO_AMIL_HESAB (index.html:1974)
const NO_AMIL_HESAB = ['إيرادات عامة', 'مصاريف عامة']

// رقم سند تلقائي — يُحسب من أعلى رقم موجود فعلياً بالسجلات (وليس عداد
// بالذاكرة) حتى ما يتكرر — منقولة من getNextSandNumber (index.html:2203)
function getNextSandNumber(moves: Move[]): number {
  let max = 1000
  for (const r of moves) {
    const n = parseInt(r.raqm, 10)
    if (!isNaN(n) && n > max) max = n
  }
  return max + 1
}

function blankForm(moves: Move[]) {
  return {
    noa: '' as MoveType | '',
    tarikh: todayISO(),
    raqm: String(getNextSandNumber(moves)),
    hesab: '',
    mabDStr: '0',
    mabDinStr: '0',
    jiha: 'الصندوق',
    sak: '',
    notes: '',
    amilId: null as number | null,
    amilName: '',
  }
}

// منقولة من pageSandooq (index.html:988) وكل دوال sLoad/sGet/sSave/sReset/
// sNew/setNoa/calcAfter/showAmilBal/checkAmilVisibility/selAmil/selHesab/
// selJiha (index.html:1911-2278، 2543-2549)
//
// sCurIdx بالكود القديم كان متغيّر عام يتصفّر بـ sReset() كل مرة يوصل
// المستخدم لصفحة الصندوق (goPage/popstate، index.html:1837,1861) — هنا
// المكوّن نفسه يتفكك (unmount) وينبني من جديد بكل مرة يترك/يرجع المستخدم
// للصفحة، فـ useState(-1) المحلي يعطي نفس النتيجة تلقائياً بدون حاجة لإعادة تصفير يدوية
export default function SandooqPage({ goPage, confirmPin }: { goPage: (id: string) => void; confirmPin: (label: string) => Promise<boolean> }) {
  const { time, dateShort } = useClock()
  const moves = useDataStore((s) => s.moves)
  const customers = useDataStore((s) => s.customers)
  const dataReady = useDataStore((s) => s.dataReady)
  const myRole = useDataStore((s) => s.myRole)
  const saveMove = useDataStore((s) => s.saveMove)
  const deleteMove = useDataStore((s) => s.deleteMove)

  const [curIdx, setCurIdx] = useState(-1)
  const [form, setForm] = useState(() => blankForm(moves))
  const [hesabOpen, setHesabOpen] = useState(false)
  const [jihaOpen, setJihaOpen] = useState(false)
  const [amilOpen, setAmilOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDraft, setPendingDraft] = useState<MoveDraft | null>(null)
  const [saving, setSaving] = useState(false)

  const hasCur = curIdx >= 0 && curIdx < moves.length
  const current = hasCur ? moves[curIdx] : null

  // يعادل sUpdateUI() -> sLoad(r) — يحمّل حقول النموذج من السجل الحالي
  // كل ما يتغير curIdx (بحث، تنقل...)
  useEffect(() => {
    if (!current) return
    setForm({
      noa: current.noa,
      tarikh: current.tarikh || '',
      raqm: current.raqm || '',
      hesab: current.hesab || '',
      mabDStr: (current.mabD || 0).toLocaleString('en-US'),
      mabDinStr: (current.mabDin || 0).toLocaleString('en-US'),
      jiha: current.jiha || '',
      sak: current.sak || '',
      notes: current.notes || '',
      amilId: current.amilId,
      amilName: current.amilName || '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curIdx])

  const noNeedAmil = NO_AMIL_HESAB.includes(form.hesab)
  const hasNoa = form.noa === 'قبض' || form.noa === 'صرف'
  const showAmil = hasNoa && !noNeedAmil

  const mabD = parseAmount(form.mabDStr)
  const mabDin = parseAmount(form.mabDinStr)
  const selectedCustomer = form.amilId != null ? customers.find((c) => c.id === form.amilId) : null

  // يعادل calcAfter()/showAmilBal() — نفس الحساب بالضبط، هنا مشتق بدل ما
  // ينكتب لعناصر DOM يدوياً من أكثر من مكان (index.html:2041-2092)
  let prevD = 0,
    prevDin = 0,
    afterD = 0,
    afterDin = 0
  if (selectedCustomer) {
    prevD = selectedCustomer.dL - selectedCustomer.dA
    prevDin = selectedCustomer.dinL - selectedCustomer.dinA
    afterD = prevD
    afterDin = prevDin
    if (form.noa === 'قبض') {
      afterD += mabD
      afterDin += mabDin
    } else if (form.noa === 'صرف') {
      afterD -= mabD
      afterDin -= mabDin
    }
  }
  const afterLabel = form.noa === 'قبض' ? 'بعد القبض' : 'بعد الصرف'

  function setNoa(val: MoveType) {
    const prev = form.noa
    setForm((f) => ({ ...f, noa: val, mabDStr: prev && prev !== val ? '0' : f.mabDStr, mabDinStr: prev && prev !== val ? '0' : f.mabDinStr }))
    if (prev && prev !== val) toast('⚠️ تم تغيير نوع الحركة — أعد إدخال المبلغ')
    if (noNeedAmil) setForm((f) => ({ ...f, amilId: null, amilName: '' }))
  }

  function selHesab(v: string) {
    const willNoNeedAmil = NO_AMIL_HESAB.includes(v)
    setForm((f) => ({ ...f, hesab: v, ...(willNoNeedAmil ? { amilId: null, amilName: '' } : {}) }))
    setHesabOpen(false)
  }

  function selJiha(v: string) {
    setForm((f) => ({ ...f, jiha: v }))
    setJihaOpen(false)
  }

  function selAmil(c: { id: number; name: string }) {
    if (form.amilId && form.amilId !== c.id) {
      setForm((f) => ({ ...f, mabDStr: '0', mabDinStr: '0' }))
      toast('⚠️ تم تغيير العميل — أعد إدخال المبلغ')
    }
    setForm((f) => ({ ...f, amilId: c.id, amilName: c.name }))
    setAmilOpen(false)
  }

  function resetForm() {
    setForm(blankForm(moves))
    setCurIdx(-1)
  }

  function loadFromSearch(idx: number) {
    setCurIdx(idx)
    setSearchOpen(false)
    toast('✏️ تم تحميل السجل رقم ' + (idx + 1) + ' للتعديل')
  }

  function sSave() {
    if (saving) {
      toast('⏳ فيه حفظ سابق لا يزال قيد التنفيذ — انتظر لحظة')
      return
    }
    if (!dataReady) {
      toast('⏳ البيانات لسا تتحمل — انتظر لحظة وحاول مرة ثانية')
      return
    }
    if (!form.noa) {
      toast('⚠️ اختر نوع الحركة')
      return
    }
    if (!mabD && !mabDin) {
      toast('⚠️ أدخل مبلغ')
      return
    }
    // الموظف (إدخال بس) ما يقدر يعدّل حركة موجودة — قاعدة البيانات ترفضها
    // برضو (RLS)، بس نوقفها هنا بدري حتى تصير رسالة الخطأ واضحة فوراً
    if (hasCur && myRole === 'employee') {
      toast('⚠️ ماكو صلاحية لتعديل حركة موجودة — تواصل مع المالك')
      return
    }

    const draft: MoveDraft = {
      noa: form.noa,
      tarikh: form.tarikh,
      raqm: form.raqm,
      hesab: form.hesab,
      mabD,
      mabDin,
      jiha: form.jiha,
      sak: form.sak || null,
      notes: form.notes,
      amilId: form.amilId,
      amilName: form.amilName || null,
      dbId: current?.dbId,
    }
    setPendingDraft(draft)
    setConfirmOpen(true)
  }

  async function confirmSave() {
    if (!pendingDraft || saving) return
    setSaving(true)
    const ok = await saveMove(pendingDraft, curIdx)
    setSaving(false)
    setConfirmOpen(false)
    setPendingDraft(null)
    // نفس سلوك confirmAndSave الأصلي: ينجح أو يفشل، بعدين يرجع لنموذج فارغ
    // (index.html:2378 يستدعي sReset() بأي الحالتين لو نجح؛ إذا فشل نبقى
    // بنفس النموذج حتى يعيد المستخدم المحاولة بدون ما يخسر ما كتبه)
    if (ok) resetForm()
  }

  function sDel() {
    if (myRole === 'employee') {
      toast('⚠️ ماكو صلاحية حذف — تواصل مع المالك')
      return
    }
    if (!dataReady) {
      toast('⏳ البيانات لسا تتحمل — انتظر لحظة وحاول مرة ثانية')
      return
    }
    if (!moves.length) {
      toast('⚠️ لا يوجد سجل')
      return
    }
    if (!hasCur) {
      toast('⚠️ ماكو سجل محمّل للحذف — دوّر عليه أولاً من البحث')
      return
    }
    void (async () => {
      // يعادل requirePin('🗑 حذف الحركة الحالية', ...) بالكود القديم (index.html:2476)
      const pinOk = await confirmPin('🗑 حذف الحركة الحالية')
      if (!pinOk) return
      if (!confirm('تأكيد حذف هذه الحركة؟')) return
      const ok = await deleteMove(curIdx)
      if (ok) resetForm()
    })()
  }

  return (
    <div id="pageSandooq" className="page active">
      <div
        style={{
          background: 'linear-gradient(135deg,#1e5a28,#2d8a3e)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 6, padding: '4px 12px', fontSize: 13, fontWeight: 900, color: 'white' }}>
          {hasCur ? curIdx + 1 : '—'}
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: 'white', textDecoration: 'underline', textUnderlineOffset: 3 }}>الصندوق</div>
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 6, padding: '4px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{dateShort}</div>
          <div style={{ fontSize: 11, color: 'white', fontWeight: 700 }}>{time}</div>
        </div>
      </div>

      {current?.createdByEmail && (
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '5px 14px', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
          👤 أضافها: <b style={{ color: 'white', direction: 'ltr', display: 'inline-block' }}>{current.createdByEmail}</b>
        </div>
      )}

      <div id="sFormWrap" style={{ padding: '12px 14px', maxWidth: 480, margin: '0 auto', paddingBottom: 90 }}>
        {/* قسم 1: نوع الحركة + السند */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 10 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: 'var(--text2)', fontSize: 11, fontWeight: 700, marginBottom: 6, textAlign: 'right' }}>نوع الحركة</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                onClick={() => setNoa('قبض')}
                style={{
                  padding: 11,
                  borderRadius: 8,
                  fontFamily: "'Cairo',sans-serif",
                  fontSize: 14,
                  fontWeight: 900,
                  border: form.noa === 'قبض' ? '2px solid #60c870' : '2px solid rgba(255,255,255,0.3)',
                  background: form.noa === 'قبض' ? '#2d8a3e' : 'rgba(255,255,255,0.1)',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                ⬇️ قبض
              </button>
              <button
                onClick={() => setNoa('صرف')}
                style={{
                  padding: 11,
                  borderRadius: 8,
                  fontFamily: "'Cairo',sans-serif",
                  fontSize: 14,
                  fontWeight: 900,
                  border: form.noa === 'صرف' ? '2px solid #ff8050' : '2px solid rgba(255,255,255,0.3)',
                  background: form.noa === 'صرف' ? '#c05020' : 'rgba(255,255,255,0.1)',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                ⬆️ صرف
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ color: 'var(--text2)', fontSize: 11, fontWeight: 700, marginBottom: 4, textAlign: 'right' }}>تاريخ السند</div>
              <input
                type="date"
                value={form.tarikh}
                onChange={(e) => setForm((f) => ({ ...f, tarikh: e.target.value }))}
                style={{ width: '100%', background: '#071e38', border: '1.5px solid var(--border2)', borderRadius: 7, padding: '8px 10px', fontFamily: "'Cairo',sans-serif", fontSize: 12, color: 'var(--text)', direction: 'ltr', textAlign: 'center' }}
              />
            </div>
            <div>
              <div style={{ color: 'var(--text2)', fontSize: 11, fontWeight: 700, marginBottom: 4, textAlign: 'right' }}>رقم السند</div>
              <input
                type="text"
                value={form.raqm}
                onChange={(e) => setForm((f) => ({ ...f, raqm: e.target.value }))}
                style={{ width: '100%', background: '#071e38', border: '1.5px solid var(--border2)', borderRadius: 7, padding: '8px 10px', fontFamily: "'Cairo',sans-serif", fontSize: 13, fontWeight: 700, color: 'var(--text)', direction: 'ltr', textAlign: 'center' }}
              />
            </div>
          </div>
        </div>

        {/* قسم 2: الحساب الرئيسي + العميل */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 10 }}>
          <div style={{ color: 'var(--text2)', fontSize: 11, fontWeight: 700, marginBottom: 6, textAlign: 'right' }}>الحساب الرئيسي</div>
          <input
            type="text"
            readOnly
            placeholder="اضغط لاختيار الحساب ▾"
            value={form.hesab}
            onClick={() => setHesabOpen(true)}
            style={{ width: '100%', background: '#071e38', border: '1.5px solid var(--border2)', borderRadius: 7, padding: '9px 12px', fontFamily: "'Cairo',sans-serif", fontSize: 13, fontWeight: 700, color: 'var(--text)', cursor: 'pointer', direction: 'rtl', marginBottom: 10 }}
          />

          {showAmil && (
            <div>
              <div style={{ color: 'var(--text2)', fontSize: 11, fontWeight: 700, marginBottom: 6, textAlign: 'right' }}>العميل</div>
              <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 8 }}>
                <input
                  type="text"
                  readOnly
                  placeholder="رقم"
                  value={form.amilId ?? ''}
                  style={{ background: '#071e38', border: '1.5px solid var(--border2)', borderRadius: 7, padding: '8px 6px', fontFamily: "'Cairo',sans-serif", fontSize: 12, fontWeight: 700, color: 'var(--text)', textAlign: 'center', direction: 'ltr' }}
                />
                <input
                  type="text"
                  readOnly
                  placeholder="اضغط لاختيار العميل ▾"
                  value={form.amilName}
                  onClick={() => setAmilOpen(true)}
                  style={{ background: '#071e38', border: '1.5px solid var(--border2)', borderRadius: 7, padding: '8px 12px', fontFamily: "'Cairo',sans-serif", fontSize: 13, fontWeight: 700, color: 'var(--text)', cursor: 'pointer', direction: 'rtl' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* قسم 3: الأرصدة السابقة */}
        {showAmil && selectedCustomer && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 700, marginBottom: 6, textAlign: 'right', paddingRight: 4 }}>أرصدة العميل</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <BalBox label="الرصيد الحالي $" value={prevD} />
              <BalBox label={afterLabel + ' $'} value={afterD} highlight />
              <BalBox label="الرصيد الحالي دينار" value={prevDin} />
              <BalBox label={afterLabel + ' دينار'} value={afterDin} highlight />
            </div>
          </div>
        )}

        {/* قسم 4: المبالغ */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 10 }}>
          <div style={{ color: 'var(--text2)', fontSize: 11, fontWeight: 700, marginBottom: 8, textAlign: 'right' }}>المبالغ</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: 10, textAlign: 'center' }}>
              <div style={{ color: '#f0d060', fontSize: 11, fontWeight: 700, marginBottom: 5 }}>دولار $</div>
              <input
                type="text"
                inputMode="decimal"
                value={form.mabDStr}
                onChange={(e) => setForm((f) => ({ ...f, mabDStr: formatAmountInput(e.target.value) }))}
                style={{ width: '100%', background: 'var(--bg2)', border: '1.5px solid var(--border2)', borderRadius: 6, padding: 8, fontFamily: "'Cairo',sans-serif", fontSize: 16, fontWeight: 900, color: 'var(--gold)', textAlign: 'center', direction: 'ltr' }}
              />
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: 10, textAlign: 'center' }}>
              <div style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 700, marginBottom: 5 }}>دينار IQD</div>
              <input
                type="text"
                inputMode="numeric"
                value={form.mabDinStr}
                onChange={(e) => setForm((f) => ({ ...f, mabDinStr: formatAmountInput(e.target.value) }))}
                style={{ width: '100%', background: 'var(--bg2)', border: '1.5px solid var(--border2)', borderRadius: 6, padding: 8, fontFamily: "'Cairo',sans-serif", fontSize: 16, fontWeight: 900, color: 'var(--accent)', textAlign: 'center', direction: 'ltr' }}
              />
            </div>
          </div>
        </div>

        {/* قسم 5: جهة الصرف + الصك + الملاحظات */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div>
              <div style={{ color: 'var(--text2)', fontSize: 11, fontWeight: 700, marginBottom: 4, textAlign: 'right' }}>جهة الصرف</div>
              <input
                type="text"
                readOnly
                value={form.jiha}
                onClick={() => setJihaOpen(true)}
                className={`jiha-box${form.jiha !== 'الصندوق' ? ' customer' : ''}`}
                style={{ width: '100%', borderRadius: 7, padding: '8px 10px', fontFamily: "'Cairo',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer', direction: 'rtl' }}
              />
            </div>
            <div>
              <div style={{ color: 'var(--text2)', fontSize: 11, fontWeight: 700, marginBottom: 4, textAlign: 'right' }}>رقم الصك/الفيشة</div>
              <input
                type="text"
                placeholder="اختياري"
                value={form.sak}
                onChange={(e) => setForm((f) => ({ ...f, sak: e.target.value }))}
                style={{ width: '100%', background: '#071e38', border: '1.5px solid var(--border2)', borderRadius: 7, padding: '8px 10px', fontFamily: "'Cairo',sans-serif", fontSize: 13, color: 'var(--text)', direction: 'rtl' }}
              />
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text2)', fontSize: 11, fontWeight: 700, marginBottom: 4, textAlign: 'right' }}>الملاحظات</div>
            <textarea
              placeholder="أدخل أي ملاحظات..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              style={{ width: '100%', background: '#071e38', border: '1.5px solid var(--border2)', borderRadius: 7, padding: '9px 12px', fontFamily: "'Cairo',sans-serif", fontSize: 13, color: 'var(--text)', direction: 'rtl', resize: 'none', height: 60 }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <button
            onClick={() => goPage('pageArsada')}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)', padding: 10, fontFamily: "'Cairo',sans-serif", fontSize: 12, fontWeight: 700, color: 'var(--text2)', cursor: 'pointer' }}
          >
            👥 أرصدة العملاء
          </button>
          <button
            onClick={() => goPage('pageKashf')}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)', padding: 10, fontFamily: "'Cairo',sans-serif", fontSize: 12, fontWeight: 700, color: 'var(--text2)', cursor: 'pointer' }}
          >
            📊 كشف الصندوق
          </button>
        </div>
      </div>

      <div className="s-toolbar">
        <button className="tbtn tbtn-lbl" onClick={() => setSearchOpen(true)}>
          🔍<span>بحث</span>
        </button>
        <button className="tbtn tbtn-lbl" onClick={sSave}>
          💾<span>حفظ</span>
        </button>
        <RoleGate only="owner">
          <button className="tbtn tbtn-lbl" onClick={sDel}>
            🗑<span>حذف</span>
          </button>
        </RoleGate>
        <button className="tbtn tbtn-lbl" onClick={() => goPage('pageMain')}>
          🏠<span>رئيسية</span>
        </button>
      </div>

      <HesabPickerModal open={hesabOpen} onSelect={selHesab} onClose={() => setHesabOpen(false)} />
      <JihaPickerModal open={jihaOpen} customers={customers} onSelect={selJiha} onClose={() => setJihaOpen(false)} />
      <AmilPickerModal open={amilOpen} customers={customers} onSelect={selAmil} onClose={() => setAmilOpen(false)} />
      <SearchModal open={searchOpen} moves={moves} onClose={() => setSearchOpen(false)} onLoad={loadFromSearch} />
      <ConfirmSaveModal
        open={confirmOpen}
        draft={pendingDraft}
        old={current}
        saving={saving}
        onConfirm={() => void confirmSave()}
        onCancel={() => {
          setConfirmOpen(false)
          setPendingDraft(null)
        }}
      />
    </div>
  )
}

function BalBox({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{ background: 'rgba(200,160,232,0.15)', border: '1px solid #a070cc', borderRadius: 8, padding: 8, textAlign: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600 }}>{label}</div>
      <div style={{ color: highlight ? (value >= 0 ? '#60ff90' : '#ff6060') : '#e8c0ff', fontSize: 14, fontWeight: 900, direction: 'ltr' }}>
        {value.toLocaleString()}
      </div>
    </div>
  )
}
