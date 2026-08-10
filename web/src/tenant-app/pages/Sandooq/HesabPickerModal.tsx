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
  return (
    <div className={`modal-ov${open ? ' show' : ''}`}>
      <div className="modal-box green">
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
