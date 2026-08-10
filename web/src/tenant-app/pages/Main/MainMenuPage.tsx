import { useClock } from '../../../shared/useClock'
import { useDataStore } from '../../state/useDataStore'
import RoleGate from '../../components/RoleGate'
import { toast } from '../../../shared/useToast'

// منقولة من pageMain بالكود القديم (index.html:955) — الصفحات الفرعية
// (الصندوق، كشف الرصيد...) تُضاف بالمراحل الجاية، هذا الهيكل العام بس
export default function MainMenuPage({ goPage, doLogout }: { goPage: (id: string) => void; doLogout: () => void }) {
  const { dayName, dateShort } = useClock()
  const loadStatus = useDataStore((s) => s.loadStatus)
  const settings = useDataStore((s) => s.settings)
  const refresh = useDataStore((s) => s.refresh)
  // يعادل updateNotifFailBadge() بالكود القديم (كانت بالسطر 2984)
  const notifFailCount = useDataStore((s) => s.moves.filter((m) => m.notifFailed).length)

  return (
    <div id="pageMain" className="page active">
      <div className="main-header">
        <div className="main-date">
          {dayName}
          <br />
          {dateShort}
        </div>
        <div className="main-logo">{settings.compName || 'المنير'}</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div className="main-subtitle">نظام الحسابات</div>
      </div>
      <div className="menu-grid">
        <div
          style={{
            gridColumn: '1/-1',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 8,
            padding: '7px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 2,
          }}
        >
          <button
            onClick={() => void refresh()}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 5,
              color: 'white',
              fontFamily: "'Cairo',sans-serif",
              fontSize: 11,
              padding: '3px 10px',
              cursor: 'pointer',
            }}
          >
            🔄 تحديث
          </button>
          <div style={{ fontSize: 11, fontWeight: 700, color: loadStatus.color }}>{loadStatus.msg}</div>
          <div style={{ fontSize: 13 }}>☁️</div>
        </div>
        <button className="menu-btn highlight" onClick={() => goPage('pageSandooq')}>
          <span className="icon">🏦</span>الصندوق
        </button>
        <button className="menu-btn highlight" onClick={() => goPage('pageKashf')}>
          <span className="icon">📊</span>كشف رصيد الصندوق
        </button>
        <button className="menu-btn highlight" onClick={() => goPage('pageArsada')}>
          <span className="icon">👥</span>أرصدة العملاء
        </button>
        <button className="menu-btn highlight" onClick={() => goPage('pageSayarfa')}>
          <span className="icon">💱</span>الصيرفة
        </button>
        <button className="menu-btn" onClick={() => toast('قريباً')}>
          <span className="icon">📨</span>ارسال الامانات
        </button>
        <button className="menu-btn" onClick={() => toast('قريباً')}>
          <span className="icon">📥</span>الامانات الواردة
        </button>
        <button className="menu-btn" onClick={() => toast('قريباً')}>
          <span className="icon">📤</span>الامانات الصادرة
        </button>
        <button className="menu-btn" onClick={() => toast('قريباً')}>
          <span className="icon">🏢</span>ارصدة الشركات
        </button>
        <RoleGate only="owner">
          <button className="menu-btn highlight" onClick={() => goPage('pageKhulasa')}>
            <span className="icon">📊</span>الخلاصة
          </button>
          <button className="menu-btn" onClick={() => goPage('pageNotifFails')}>
            <span className="icon">🔔</span>إشعارات فشلت
            <span style={{ color: '#ff6060', fontWeight: 900 }}>{notifFailCount > 0 ? ` (${notifFailCount})` : ''}</span>
          </button>
          <button
            className="menu-btn highlight"
            onClick={() => goPage('pageSettings')}
            style={{ gridColumn: '1/-1', background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' }}
          >
            <span className="icon">⚙️</span>الإعدادات
          </button>
        </RoleGate>
        <RoleGate only="employee">
          <button
            className="menu-btn"
            onClick={doLogout}
            style={{ gridColumn: '1/-1', background: 'rgba(251,113,133,.12)', borderColor: 'rgba(251,113,133,.3)', color: '#fb7185' }}
          >
            <span className="icon">🚪</span>تسجيل الخروج
          </button>
        </RoleGate>
      </div>
    </div>
  )
}
