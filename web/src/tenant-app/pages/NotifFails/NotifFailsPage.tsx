import { fmtAmount } from '../../../shared/format'
import { useDataStore } from '../../state/useDataStore'

// منقولة من pageNotifFails (index.html:1736) — nfRender/nfResend (كانت بالسطر 2991-3034)
export default function NotifFailsPage({ goPage }: { goPage: (id: string) => void }) {
  const moves = useDataStore((s) => s.moves)
  const resendNotif = useDataStore((s) => s.resendNotif)
  const rows = moves.filter((r) => r.notifFailed).sort((a, b) => (b.tarikh || '').localeCompare(a.tarikh || ''))

  return (
    <div id="pageNotifFails" className="page active">
      <div style={{ background: 'linear-gradient(135deg,var(--bg),var(--input-bg))', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
        <button onClick={() => goPage('pageMain')} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, color: 'white', padding: '6px 10px', fontFamily: "'Cairo',sans-serif", fontSize: 12, cursor: 'pointer' }}>
          ↩ رجوع
        </button>
        <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent)' }}>🔔 إشعارات فشلت</div>
        <div style={{ width: 50 }}></div>
      </div>

      <div className="kr-filter">
        <div style={{ color: 'var(--text-dim)', fontSize: 11, textAlign: 'center' }}>
          حركات ما وصل إشعارها للعميل بتليجرام — اضغط "إعادة إرسال" بعد ما تتأكد إن سبب الفشل انحل (مثلاً العميل فتح البوت من جديد لو كان قافله)
        </div>
      </div>

      <div className="kr-tbody">
        {!rows.length && <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, padding: 20 }}>✅ ماكو إشعارات فشلت — كلشي وصل</div>}
        {rows.map((r) => {
          const name = r.amilName || r.jiha || '-'
          const dateStr = r.tarikh ? r.tarikh.split('-').reverse().join('/') : '-'
          const noaCls = r.noa === 'قبض' ? 'qabdh' : 'sarf'
          return (
            <div key={r.dbId} className="kr-card">
              <div className="kr-card-top">
                <span className={`kr-card-noa ${noaCls}`}>{r.noa === 'قبض' ? '⬇️ قبض' : '⬆️ صرف'}</span>
                <span className="kr-card-name">{name}</span>
                <span className="kr-card-raqm">#{r.raqm || ''}</span>
              </div>
              <div className="al-card-meta">
                {dateStr} — {fmtAmount(r.mabD, r.mabDin)}
              </div>
              <button className="kr-tbtn" style={{ marginTop: 8, width: '100%' }} onClick={() => void resendNotif(r.dbId)}>
                🔄 إعادة إرسال
              </button>
            </div>
          )
        })}
      </div>

      <div className="kr-toolbar">
        <button className="kr-tbtn" onClick={() => goPage('pageMain')}>
          🏠 الرئيسية
        </button>
      </div>
    </div>
  )
}
