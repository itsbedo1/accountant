import { useState } from 'react'
import type { Customer } from './types'
import { useModalA11y } from './useModalA11y'

// نسخة موحّدة من modalAmil (index.html:853) و modalSfAmil (index.html:863) —
// كانا نفس المنطق حرفياً (اختيار عميل من قائمة قابلة للبحث)، فقط IDs مختلفة
// لصفحتين مختلفتين (الصندوق والصيرفة). موحّدة هنا بمكوّن واحد قابل لإعادة
// الاستخدام — يخدم نفس هدف المستخدم "أسهل أعدّل شي محدد لاحقاً"
export default function AmilPickerModal({
  open,
  title = 'اختر العميل',
  customers,
  onSelect,
  onClose,
}: {
  open: boolean
  title?: string
  customers: Customer[]
  onSelect: (c: Customer) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const filtered = q.trim() ? customers.filter((c) => c.name.includes(q.trim())) : customers
  const panelRef = useModalA11y(open, onClose)

  return (
    <div className={`modal-ov${open ? ' show' : ''}`}>
      <div className="modal-box green" ref={panelRef} role="dialog" aria-modal="true" tabIndex={-1}>
        <h3 className="modal-h3 light">{title}</h3>
        <input
          className="search-input"
          type="text"
          placeholder="🔍 بحث عن عميل..."
          aria-label="بحث عن عميل"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div style={{ maxHeight: '42vh', overflowY: 'auto' }}>
          {filtered.map((c) => (
            <button
              key={c.id}
              className="modal-opt"
              onClick={() => {
                onSelect(c)
                setQ('')
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
        <button className="modal-close-btn" onClick={onClose}>
          إلغاء
        </button>
      </div>
    </div>
  )
}
