import { useState } from 'react'
import './app.css'
import { useAuth } from './state/useAuth'
import { useDataStore } from './state/useDataStore'
import LoginPage from './pages/Login/LoginPage'
import SuspendedPage from './pages/Login/SuspendedPage'
import MainMenuPage from './pages/Main/MainMenuPage'
import SandooqPage from './pages/Sandooq/SandooqPage'
import KashfPage from './pages/Kashf/KashfPage'
import ArsadaPage from './pages/Arsada/ArsadaPage'
import KashfAmilPage from './pages/KashfAmil/KashfAmilPage'
import SayarfaPage from './pages/Sayarfa/SayarfaPage'
import KhulasaPage from './pages/Khulasa/KhulasaPage'
import SettingsPage from './pages/Settings/SettingsPage'
import AuditLogPage from './pages/AuditLog/AuditLogPage'
import NotifFailsPage from './pages/NotifFails/NotifFailsPage'
import { usePinGate, PinModal } from './components/PinLock'
import Toast from '../shared/Toast'
import { toast } from '../shared/useToast'

const BUILT_PAGES = new Set([
  'pageMain',
  'pageSandooq',
  'pageKashf',
  'pageArsada',
  'pageKashfAmil',
  'pageSayarfa',
  'pageKhulasa',
  'pageSettings',
  'pageAuditLog',
  'pageNotifFails',
])

export default function App() {
  const { status, session, doLogin, doLogout } = useAuth()
  const dataReady = useDataStore((s) => s.dataReady)
  const suspended = useDataStore((s) => s.suspended)
  const suspendReason = useDataStore((s) => s.suspendReason)
  const pinGate = usePinGate()
  // يعادل pageHistory/goPage() بالكود القديم — التنقل بين صفحات التطبيق
  const [page, setPage] = useState('pageMain')
  // يعادل kaAmilId العام بالكود القديم (index.html:3338) — أي عميل مفتوح حالياً بكشف الحساب
  const [kaAmilId, setKaAmilId] = useState<number | null>(null)

  function goPage(id: string) {
    if (BUILT_PAGES.has(id)) {
      setPage(id)
      return
    }
    toast('هذا القسم قيد إعادة البناء — يرجع قريباً')
  }

  // يعادل openKashfAmil(id) بالكود القديم (كانت بالسطر 3341) — arDetail() تستدعيها مباشرة
  function openKashfAmil(customerId: number) {
    setKaAmilId(customerId)
    setPage('pageKashfAmil')
  }

  const logout = () => void doLogout()

  return (
    <>
      {status === 'loggedOut' && <LoginPage doLogin={doLogin} />}

      {status === 'ready' && !dataReady && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <div style={{ color: 'white', fontFamily: "'Cairo',sans-serif", fontSize: 14, fontWeight: 700 }}>
            ⏳ جاري تحميل البيانات...
          </div>
        </div>
      )}

      {status === 'ready' && dataReady && suspended && <SuspendedPage reason={suspendReason} doLogout={logout} />}

      {status === 'ready' && dataReady && !suspended && page === 'pageMain' && (
        <MainMenuPage goPage={goPage} doLogout={logout} />
      )}
      {status === 'ready' && dataReady && !suspended && page === 'pageSandooq' && <SandooqPage goPage={goPage} confirmPin={pinGate.confirmPin} />}
      {status === 'ready' && dataReady && !suspended && page === 'pageKashf' && <KashfPage goPage={goPage} />}
      {status === 'ready' && dataReady && !suspended && page === 'pageArsada' && <ArsadaPage goPage={goPage} openKashfAmil={openKashfAmil} />}
      {status === 'ready' && dataReady && !suspended && page === 'pageKashfAmil' && kaAmilId != null && (
        <KashfAmilPage customerId={kaAmilId} goPage={goPage} />
      )}
      {status === 'ready' && dataReady && !suspended && page === 'pageSayarfa' && <SayarfaPage goPage={goPage} />}
      {status === 'ready' && dataReady && !suspended && page === 'pageKhulasa' && <KhulasaPage goPage={goPage} />}
      {status === 'ready' && dataReady && !suspended && page === 'pageSettings' && (
        <SettingsPage goPage={goPage} accountEmail={session?.user.email || ''} doLogout={logout} confirmPin={pinGate.confirmPin} />
      )}
      {status === 'ready' && dataReady && !suspended && page === 'pageAuditLog' && <AuditLogPage goPage={goPage} />}
      {status === 'ready' && dataReady && !suspended && page === 'pageNotifFails' && <NotifFailsPage goPage={goPage} />}

      <Toast />
      <PinModal {...pinGate} />
    </>
  )
}
