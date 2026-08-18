import { useModalA11y } from '../../../shared/useModalA11y'

// منقولة من modalKashfDetail (index.html:873) — krDetail() (كانت بالسطر 2668)
export interface KashfDetailData {
  sand: string
  date: string
  name: string
  noa: string
  wared: number
  sader: number
  raseed: number
  notes: string
  by?: string
}

export default function KashfDetailModal({ open, data, onClose }: { open: boolean; data: KashfDetailData | null; onClose: () => void }) {
  const panelRef = useModalA11y(open, onClose)
  return (
    <div className={`modal-ov${open ? ' show' : ''}`}>
      <div className="modal-box dark" ref={panelRef} role="dialog" aria-modal="true" tabIndex={-1}>
        <h3 className="modal-h3 dark">تفاصيل الحركة</h3>
        <div className="mrow">
          <span className="ml">رقم السند</span>
          <span className="mv">{data?.sand || '-'}</span>
        </div>
        <div className="mrow">
          <span className="ml">التاريخ</span>
          <span className="mv">{data?.date || '-'}</span>
        </div>
        <div className="mrow">
          <span className="ml">الاسم</span>
          <span className="mv">{data?.name || 'رصيد سابق'}</span>
        </div>
        <div className="mrow">
          <span className="ml">النوع</span>
          <span className="mv">{data?.noa || '-'}</span>
        </div>
        <div className="mrow">
          <span className="ml">الوارد</span>
          <span className="mv">{(data?.wared ?? 0).toLocaleString()}</span>
        </div>
        <div className="mrow">
          <span className="ml">الصادر</span>
          <span className="mv">{(data?.sader ?? 0).toLocaleString()}</span>
        </div>
        <div className="mrow">
          <span className="ml">الرصيد</span>
          <span className="mv">{(data?.raseed ?? 0).toLocaleString()}</span>
        </div>
        {data?.by && (
          <div className="mrow">
            <span className="ml">أضافها</span>
            <span className="mv">{data.by}</span>
          </div>
        )}
        <div className="mrow" style={{ border: 'none' }}>
          <span className="ml">الملاحظات</span>
          <span className="mv">{data?.notes || '-'}</span>
        </div>
        <button className="modal-close-btn" style={{ background: 'var(--bg3)', color: 'var(--accent)', marginTop: 8 }} onClick={onClose}>
          إغلاق
        </button>
      </div>
    </div>
  )
}
