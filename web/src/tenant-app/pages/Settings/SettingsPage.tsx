import { useState } from 'react'
import { useDataStore } from '../../state/useDataStore'
import RoleGate from '../../components/RoleGate'
import CustomerManager from './CustomerManager'
import EmployeeManager from './EmployeeManager'
import BalanceCheckPanel from './BalanceCheckPanel'
import DangerZone from './DangerZone'

// منقولة من pageSettings (index.html:1480) — stOpen/stSave (كانت بالسطر 4087-4461)
export default function SettingsPage({
  goPage,
  accountEmail,
  doLogout,
  confirmPin,
}: {
  goPage: (id: string) => void
  accountEmail: string
  doLogout: () => void
  confirmPin: (label: string) => Promise<boolean>
}) {
  const settings = useDataStore((s) => s.settings)
  const initBalD = useDataStore((s) => s.initBalD)
  const initBalDin = useDataStore((s) => s.initBalDin)
  const saveSettings = useDataStore((s) => s.saveSettings)
  const refresh = useDataStore((s) => s.refresh)

  const [compName, setCompName] = useState(settings.compName || '')
  const [startDate, setStartDate] = useState(settings.startDate || new Date().toISOString().split('T')[0])
  const [tgToken, setTgToken] = useState(settings.tgBotToken || '')
  const [rateStr, setRateStr] = useState(String(settings.defaultRate || 1480))
  const [initDStr, setInitDStr] = useState(String(settings.initBalD || 0))
  const [initDinStr, setInitDinStr] = useState(String(settings.initBalDin || 0))
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await saveSettings({
      compName: compName.trim(),
      startDate,
      rate: parseFloat(rateStr) || 1480,
      initD: parseFloat(initDStr) || 0,
      initDin: parseFloat(initDinStr) || 0,
      tgToken: tgToken.trim(),
    })
    setSaving(false)
  }

  return (
    <div id="pageSettings" className="page active">
      <div style={{ background: 'linear-gradient(135deg,#040d1a,#071e38)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
        <div style={{ fontSize: 20 }}>⚙️</div>
        <div style={{ fontSize: 19, fontWeight: 900, color: 'white', textDecoration: 'underline', textUnderlineOffset: 3 }}>الإعدادات</div>
        <button onClick={() => goPage('pageMain')} style={{ background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 7, color: 'white', fontFamily: "'Cairo',sans-serif", fontSize: 12, fontWeight: 700, padding: '5px 12px', cursor: 'pointer' }}>
          🏠 رئيسية
        </button>
      </div>

      <div style={{ padding: 14, maxWidth: 480, margin: '0 auto', paddingBottom: 30 }}>
        {/* قسم 0: الحساب */}
        <div style={{ background: 'rgba(96,160,255,0.08)', border: '1.5px solid rgba(96,160,255,0.3)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 900, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>👤 الحساب</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 10, textAlign: 'right' }}>{accountEmail || '—'}</div>
          <button
            onClick={() => void refresh()}
            style={{ width: '100%', padding: 11, borderRadius: 8, fontFamily: "'Cairo',sans-serif", fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer', marginBottom: 8 }}
          >
            🔄 تحميل البيانات من السحابة
          </button>
          <RoleGate only="owner">
            <button
              onClick={() => goPage('pageAuditLog')}
              style={{ width: '100%', padding: 11, borderRadius: 8, fontFamily: "'Cairo',sans-serif", fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer', marginBottom: 8 }}
            >
              📜 سجل التعديلات والحذف
            </button>
          </RoleGate>
          <button
            onClick={doLogout}
            style={{ width: '100%', padding: 11, borderRadius: 8, fontFamily: "'Cairo',sans-serif", fontSize: 13, fontWeight: 900, background: 'rgba(251,113,133,.15)', border: '1.5px solid rgba(251,113,133,.4)', color: '#fb7185', cursor: 'pointer' }}
          >
            🚪 تسجيل الخروج
          </button>
        </div>

        <RoleGate only="owner">
          <>
            {/* قسم 1: معلومات الشركة */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 14 }}>
              <div style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 900, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>🏢 معلومات الشركة</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 700, marginBottom: 5, textAlign: 'right' }}>اسم الشركة / الصيرفة</div>
                <input
                  type="text"
                  placeholder="المنير للصيرفة"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  style={{ width: '100%', background: '#071e38', border: '1.5px solid var(--border2)', borderRadius: 7, padding: '9px 12px', fontFamily: "'Cairo',sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--text)', direction: 'rtl' }}
                />
              </div>
              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 700, marginBottom: 5, textAlign: 'right' }}>تاريخ بداية العمل بالبرنامج</div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ width: '100%', background: '#071e38', border: '1.5px solid var(--border2)', borderRadius: 7, padding: '9px 12px', fontFamily: "'Cairo',sans-serif", fontSize: 13, color: 'var(--text)', direction: 'ltr', textAlign: 'center' }}
                />
              </div>
            </div>

            {/* بوت تليجرام */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 14 }}>
              <div style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 900, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>📨 إشعارات تليجرام</div>
              <div style={{ color: 'var(--text-dim)', fontSize: 11, marginBottom: 10, textAlign: 'right' }}>اربط بوت تليجرام حتى يوصل العملاء إشعار تلقائي بكل حركة على حسابهم</div>
              <div style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 700, marginBottom: 5, textAlign: 'right' }}>توكن البوت (من BotFather)</div>
              <input
                type="text"
                placeholder="123456:ABC-DEF..."
                value={tgToken}
                onChange={(e) => setTgToken(e.target.value)}
                style={{ width: '100%', background: '#071e38', border: '1.5px solid var(--border2)', borderRadius: 7, padding: '9px 12px', fontFamily: "'Cairo',sans-serif", fontSize: 13, color: 'var(--text)', direction: 'ltr' }}
              />
            </div>

            {/* الرصيد الافتتاحي */}
            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(240,192,64,0.3)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <div style={{ color: 'var(--gold)', fontSize: 13, fontWeight: 900, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>🏦 الرصيد الافتتاحي للقاصة</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 12, textAlign: 'right' }}>هذا هو رصيد القاصة في بداية استخدام البرنامج</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ color: 'var(--gold)', fontSize: 11, fontWeight: 700, marginBottom: 5, textAlign: 'center' }}>دولار $</div>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={initDStr}
                    onChange={(e) => setInitDStr(e.target.value)}
                    style={{ width: '100%', background: '#071e38', border: '2px solid rgba(251,191,36,.5)', borderRadius: 7, padding: '10px 8px', fontFamily: "'Cairo',sans-serif", fontSize: 15, fontWeight: 900, color: 'var(--text)', textAlign: 'center', direction: 'ltr' }}
                  />
                </div>
                <div>
                  <div style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 700, marginBottom: 5, textAlign: 'center' }}>دينار IQD</div>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={initDinStr}
                    onChange={(e) => setInitDinStr(e.target.value)}
                    style={{ width: '100%', background: '#071e38', border: '2px solid rgba(34,211,238,.5)', borderRadius: 7, padding: '10px 8px', fontFamily: "'Cairo',sans-serif", fontSize: 15, fontWeight: 900, color: 'var(--text)', textAlign: 'center', direction: 'ltr' }}
                  />
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 10, marginTop: 10 }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, textAlign: 'center', marginBottom: 5 }}>الرصيد الحالي للقاصة (بعد جميع الحركات)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div style={{ background: 'rgba(240,192,64,0.1)', borderRadius: 6, padding: 6, textAlign: 'center' }}>
                    <div style={{ color: '#f0c040', fontSize: 10, fontWeight: 600 }}>$</div>
                    <div style={{ color: '#f0e060', fontSize: 13, fontWeight: 900, direction: 'ltr' }}>{initBalD.toLocaleString()}</div>
                  </div>
                  <div style={{ background: 'rgba(96,216,160,0.1)', borderRadius: 6, padding: 6, textAlign: 'center' }}>
                    <div style={{ color: '#60d8a0', fontSize: 10, fontWeight: 600 }}>IQD</div>
                    <div style={{ color: '#80ffb8', fontSize: 12, fontWeight: 900, direction: 'ltr' }}>{initBalDin.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* سعر الصرف */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 14 }}>
              <div style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 900, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>💱 سعر الصرف الافتراضي</div>
              <div style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 700, marginBottom: 5, textAlign: 'right' }}>سعر الصرف (دينار لكل دولار)</div>
              <input
                type="number"
                min={1}
                step={1}
                value={rateStr}
                onChange={(e) => setRateStr(e.target.value)}
                style={{ width: '100%', background: '#071e38', border: '1.5px solid var(--border2)', borderRadius: 7, padding: '10px 12px', fontFamily: "'Cairo',sans-serif", fontSize: 16, fontWeight: 900, color: 'var(--text)', textAlign: 'center', direction: 'ltr' }}
              />
            </div>

            <CustomerManager confirmPin={confirmPin} />
            <EmployeeManager />
            <BalanceCheckPanel />
            <DangerZone confirmPin={confirmPin} />

            <button
              onClick={() => void save()}
              disabled={saving}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 10,
                fontFamily: "'Cairo',sans-serif",
                fontSize: 15,
                fontWeight: 900,
                background: 'linear-gradient(135deg,#2a7a3a,#1a5a28)',
                border: '2px solid #40c060',
                color: 'white',
                cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.7 : 1,
                boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
              }}
            >
              {saving ? '⏳ جاري الحفظ...' : '💾 حفظ الإعدادات'}
            </button>
          </>
        </RoleGate>
      </div>
    </div>
  )
}
