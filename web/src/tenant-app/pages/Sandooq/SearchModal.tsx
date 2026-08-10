import { useState } from 'react'
import { fmtAmount } from '../../../shared/format'
import type { Move } from '../../../shared/types'

// منقولة من modalSearch + openSearchModal/filterSearch/loadFromSearch
// (index.html:909, 3265-3333)
export default function SearchModal({
  open,
  moves,
  onClose,
  onLoad,
}: {
  open: boolean
  moves: Move[]
  onClose: () => void
  onLoad: (idx: number) => void
}) {
  const [q, setQ] = useState('')
  const query = q.trim()

  // نبحث بالرقم، اسم العميل، الحساب، جهة الصرف، والملاحظات — مو بس الاسم
  const matched = query
    ? moves.filter(
        (r) =>
          r.raqm?.includes(query) ||
          r.amilName?.includes(query) ||
          r.hesab?.includes(query) ||
          r.jiha?.includes(query) ||
          r.notes?.includes(query),
      )
    : moves

  // الحركات محفوظة بترتيب الإنشاء تصاعدياً — نعكسها حتى تطلع الأحدث أولاً
  const withIdx = matched.map((r) => ({ r, i: moves.indexOf(r) })).reverse()
  // بدون بحث: نعرض بس آخر 30 حركة تجنباً لقائمة طويلة بطيئة التصفح
  const shown = query ? withIdx : withIdx.slice(0, 30)

  function handleLoad(idx: number, r: Move) {
    const who = r.amilName || r.hesab || 'بدون اسم'
    const ok = confirm(
      `هل تريد فتح هذا السجل للتعديل؟\n\n` +
        `${r.noa || '-'} — ${who}\n${(r.mabD || 0).toLocaleString()}$ / ${(r.mabDin || 0).toLocaleString()} د.ع\n\n` +
        `⚠️ إذا أكدت، أي تغيير وحفظ بعدها يعدّل هذا السجل نفسه — مو سجل جديد.\n` +
        `إذا تريد تسوي حركة جديدة، اضغط "إلغاء" وارجع للرئيسية ثم افتح الصندوق من جديد.`,
    )
    if (!ok) return
    onLoad(idx)
    setQ('')
  }

  return (
    <div className={`modal-ov${open ? ' show' : ''}`}>
      <div className="modal-box green">
        <h3 className="modal-h3 light">🔍 بحث عن تسجيل</h3>
        <input
          className="search-input"
          type="text"
          placeholder="رقم السند أو اسم العميل..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="search-list">
          {!shown.length && (
            <div style={{ textAlign: 'center', color: '#888', padding: 16, fontSize: 13 }}>لا توجد نتائج</div>
          )}
          {!query && shown.length > 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 11, padding: '2px 0 10px' }}>
              آخر {shown.length} حركة — اكتب للبحث بكل السجل
            </div>
          )}
          {shown.map(({ r, i }) => {
            const dateStr = r.tarikh ? r.tarikh.split('-').reverse().join('/') : '-'
            const noaCls = r.noa === 'قبض' ? 'si-qabd' : 'si-sarf'
            return (
              <div key={i} className="search-item" onClick={() => handleLoad(i, r)}>
                <div className="si-raqm">{r.raqm || '#' + (i + 1)}</div>
                <div className="si-info">
                  <div className="si-name">{r.amilName || r.jiha || r.hesab || 'بدون اسم'}</div>
                  <div className="si-meta">
                    <span className={`si-noa ${noaCls}`}>{r.noa || '-'}</span> · {dateStr} · {fmtAmount(r.mabD, r.mabDin)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <button className="modal-close-btn" onClick={onClose}>
          إلغاء
        </button>
      </div>
    </div>
  )
}
