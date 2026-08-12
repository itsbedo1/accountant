import { useModalA11y } from '../../../shared/useModalA11y'

// منقولة من modalHesab (index.html:829) — selHesab بالسطر 2137
const HESAB_OPTIONS = ['ذمم العملاء', 'إيرادات عامة', 'مصاريف عامة']

export default function HesabPickerModal({
  open,
  onSelect,
  onClose,
}: {
  open: boolean
  onSelect: (v: string) => void
  onClose: () => void
}) {
  const panelRef = useModalA11y(open, onClose)
  return (
    <div className={`modal-ov${open ? ' show' : ''}`}>
      <div className="modal-box green" ref={panelRef} role="dialog" aria-modal="true" tabIndex={-1}>
        <h3 className="modal-h3 light">الحساب الرئيسي</h3>
        {HESAB_OPTIONS.map((v) => (
          <button key={v} className="modal-opt" onClick={() => onSelect(v)}>
            {v}
          </button>
        ))}
        <button className="modal-close-btn" onClick={onClose}>
          إلغاء
        </button>
      </div>
    </div>
  )
}
