import { useState } from 'react'
import type { Customer } from '../../../shared/types'
import { useModalA11y } from '../../../shared/useModalA11y'

// منقولة من modalJiha (index.html:840) — openJihaModal/filterJihaList/selJiha
// (كانت بالسطر 2143-2168)
export default function JihaPickerModal({
  open,
  customers,
  onSelect,
  onClose,
}: {
  open: boolean
  customers: Customer[]
  onSelect: (v: string) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const filtered = q.trim() ? customers.filter((c) => c.name.includes(q.trim())) : customers
  const panelRef = useModalA11y(open, onClose)

  function select(v: string) {
    onSelect(v)
    setQ('')
  }

  return (
    <div className={`modal-ov${open ? ' show' : ''}`}>
      <div className="modal-box green" ref={panelRef} role="dialog" aria-modal="true" tabIndex={-1}>
        <h3 className="modal-h3 light">جهة الصرف</h3>
        <button
          className="modal-opt"
          style={{ background: 'var(--bg4)', color: 'var(--accent)', borderColor: 'var(--border2)', fontSize: 15, fontWeight: 900 }}
          onClick={() => select('الصندوق')}
        >
          🏦 الصندوق (القاصة)
        </button>
        <div
          style={{
            textAlign: 'center',
            color: 'var(--text-dim)',
            fontSize: 11,
            fontWeight: 600,
            margin: '6px 0 8px',
            borderTop: '1px solid var(--border)',
            paddingTop: 8,
          }}
        >
          ── أو اختر زبون ──
        </div>
        <input
          className="search-input"
          type="text"
          placeholder="🔍 بحث عن زبون..."
          aria-label="بحث عن زبون"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div style={{ maxHeight: '42vh', overflowY: 'auto' }}>
          {filtered.map((c) => (
            <button key={c.id} className="modal-opt" onClick={() => select(c.name)}>
              <span style={{ color: '#888', fontSize: 11, marginLeft: 6 }}>عميل</span>
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
