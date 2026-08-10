import { useEffect, useMemo, useState } from 'react'
import { listCompanies, markPaid, suspendCompany, resetPassword, type Company } from '../api/adminApi'
import { adminToast } from '../state/useAdminToast'
import { useConfirmModal, ConfirmModal } from './ConfirmModal'
import CompanyCard, { statusOf } from './CompanyCard'
import CreatePanel from './CreatePanel'

type SortBy = 'due' | 'new' | 'old' | 'name'

// منقولة من dashView (admin.html:127) — loadCompanies/renderStats/renderCompanies
// ومعالجات markPaid/suspendCompany/resetPassword (كانت بالسطر 370-493)
export default function DashboardView({ doLogout }: { doLogout: () => void }) {
  const [companies, setCompanies] = useState<Company[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('due')
  const modal = useConfirmModal()

  async function load() {
    setLoadError('')
    setCompanies(null)
    try {
      setCompanies(await listCompanies())
    } catch (e) {
      setLoadError((e as Error).message)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const stats = useMemo(() => {
    const list = companies || []
    const active = list.filter((c) => statusOf(c).cls === 'on').length
    const trial = list.filter((c) => statusOf(c).cls === 'trial').length
    const down = list.filter((c) => statusOf(c).overdue).length
    return { total: list.length, active, trial, down }
  }, [companies])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = (companies || []).filter((c) => !q || (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q))
    list = list.slice().sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '', 'ar')
      if (sortBy === 'new') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy === 'old') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return new Date(a.next_due_at).getTime() - new Date(b.next_due_at).getTime()
    })
    return list
  }, [companies, search, sortBy])

  async function handleMarkPaid(email: string) {
    const ok = await modal.confirmModal({ title: 'تأكيد تسديد الدفعة', msg: `${email}\nيجدد الاشتراك 3 أشهر ويفعّل الشركة تلقائياً.` })
    if (!ok) return
    try {
      await markPaid(email)
      adminToast('✅ تم تسجيل الدفعة', 'ok')
      void load()
    } catch (e) {
      adminToast('❌ ' + (e as Error).message, 'err')
    }
  }

  async function handleSuspend(email: string) {
    const reason = await modal.confirmModal({
      title: 'تعليق اشتراك',
      msg: `${email}\nسبب التعليق؟ يظهر لهم عند تسجيل الدخول.`,
      withInput: true,
      placeholder: 'مثال: لم يتم تسديد اشتراك هذا الشهر',
      okLabel: '⏸️ تعليق',
    })
    if (reason === null) return
    try {
      await suspendCompany(email, reason === true ? '' : reason)
      adminToast('⏸️ تم تعليق الشركة', 'ok')
      void load()
    } catch (e) {
      adminToast('❌ ' + (e as Error).message, 'err')
    }
  }

  async function handleResetPassword(email: string) {
    const pw = await modal.confirmModal({ title: 'كلمة مرور جديدة', msg: `${email}\nاكتب كلمة المرور الجديدة (6 أحرف على الأقل).`, withInput: true, placeholder: 'كلمة المرور الجديدة', okLabel: '🔑 تغيير' })
    if (pw === null) return
    const pwStr = pw === true ? '' : pw
    if (pwStr.length < 6) {
      adminToast('❌ كلمة المرور لازم 6 أحرف على الأقل', 'err')
      return
    }
    try {
      const data = await resetPassword(email, pwStr)
      adminToast(`✅ تم تغيير كلمة المرور لـ ${data.email}`, 'ok')
    } catch (e) {
      adminToast('❌ ' + (e as Error).message, 'err')
    }
  }

  return (
    <div id="dashView">
      <div className="dash-header">
        <button className="btn-sm" onClick={doLogout}>
          🚪 خروج
        </button>
        <div className="dash-title">🏢 إدارة الشركات</div>
        <button className="btn-sm" onClick={() => void load()}>
          🔄
        </button>
      </div>
      <div className="wrap">
        <div className="stats-row">
          <div className="stat-box">
            <div className="stat-num" style={{ color: 'var(--accent)' }}>
              {companies ? stats.total : '—'}
            </div>
            <div className="stat-lbl">الكل</div>
          </div>
          <div className="stat-box">
            <div className="stat-num" style={{ color: 'var(--green)' }}>
              {companies ? stats.active : '—'}
            </div>
            <div className="stat-lbl">فعّالة</div>
          </div>
          <div className="stat-box">
            <div className="stat-num" style={{ color: 'var(--gold)' }}>
              {companies ? stats.trial : '—'}
            </div>
            <div className="stat-lbl">تجريبي</div>
          </div>
          <div className="stat-box">
            <div className="stat-num" style={{ color: 'var(--red)' }}>
              {companies ? stats.down : '—'}
            </div>
            <div className="stat-lbl">موقوفة/متأخرة</div>
          </div>
        </div>

        <div className="section-lbl">
          <span>الشركات</span>
          <button className="btn-sm" onClick={() => setCreateOpen((v) => !v)}>
            ➕ شركة جديدة
          </button>
        </div>

        <CreatePanel open={createOpen} onDone={() => { setCreateOpen(false); void load() }} confirmModal={modal.confirmModal} />

        <div className="filter-row">
          <input type="text" className="search-input" placeholder="🔍 دوّر باسم الشركة أو الإيميل..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
            <option value="due">الأقرب استحقاقاً</option>
            <option value="new">الأحدث تسجيلاً</option>
            <option value="old">الأقدم تسجيلاً</option>
            <option value="name">الاسم (أبجدي)</option>
          </select>
        </div>

        <div id="companyList">
          {companies === null && !loadError && <div className="empty">⏳ جاري التحميل...</div>}
          {loadError && <div className="empty" style={{ color: 'var(--red)' }}>❌ {loadError}</div>}
          {companies && !filtered.length && <div className="empty">لا يوجد نتائج</div>}
          {filtered.map((c) => (
            <CompanyCard key={c.email} c={c} onMarkPaid={() => void handleMarkPaid(c.email)} onSuspend={() => void handleSuspend(c.email)} onResetPassword={() => void handleResetPassword(c.email)} />
          ))}
        </div>
      </div>

      <ConfirmModal {...modal} />
    </div>
  )
}
