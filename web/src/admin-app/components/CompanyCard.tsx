import type { Company } from '../api/adminApi'

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ar-IQ', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export interface CompanyStatus {
  cls: 'on' | 'off' | 'trial'
  label: string
  overdue: boolean
}

// منقولة من statusOf() (admin.html:361)
export function statusOf(c: Company): CompanyStatus {
  const now = new Date()
  const due = new Date(c.next_due_at)
  if (c.suspended) return { cls: 'off', label: '⛔ موقوفة', overdue: true }
  if (due < now) return { cls: 'off', label: c.plan === 'trial' ? '🔴 انتهت التجربة' : '🔴 متأخرة الدفع', overdue: true }
  if (c.plan === 'trial') return { cls: 'trial', label: '🟡 تجريبي', overdue: false }
  return { cls: 'on', label: '🟢 فعّالة', overdue: false }
}

// منقولة من بطاقة الشركة داخل renderCompanies() (admin.html:415-435)
export default function CompanyCard({ c, onMarkPaid, onSuspend, onResetPassword }: { c: Company; onMarkPaid: () => void; onSuspend: () => void; onResetPassword: () => void }) {
  const st = statusOf(c)
  return (
    <div className={`co-card${st.overdue ? ' overdue' : ''}`}>
      <div className="co-top">
        <span className={`co-badge ${st.cls}`}>{st.label}</span>
        <span className="co-name">{c.name || '—'}</span>
      </div>
      <div className="co-email">{c.email || '—'}</div>
      <div className="co-dates">
        <div className="co-date-box">
          <div className="co-date-lbl">تاريخ التسجيل</div>
          <div className="co-date-val">{fmtDate(c.created_at)}</div>
        </div>
        <div className="co-date-box">
          <div className="co-date-lbl">الدفعة القادمة</div>
          <div className={`co-date-val${st.overdue && !c.suspended ? ' due' : ''}`}>{fmtDate(c.next_due_at)}</div>
        </div>
      </div>
      {c.suspended && c.suspend_reason && <div className="co-reason">السبب: {c.suspend_reason}</div>}
      <div className="co-actions">
        <button className="co-btn pay" onClick={onMarkPaid}>
          ✅ تسديد الدفعة
        </button>
        {!c.suspended && (
          <button className="co-btn danger" onClick={onSuspend}>
            ⏸️ تعليق
          </button>
        )}
        <button className="co-btn" onClick={onResetPassword}>
          🔑 كلمة مرور
        </button>
      </div>
    </div>
  )
}
