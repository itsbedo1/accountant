// منقولة من pageSuspended بالكود القديم (index.html:937)
export default function SuspendedPage({ reason, doLogout }: { reason: string; doLogout: () => void }) {
  return (
    <div id="pageSuspended" className="page active">
      <div className="login-card">
        <div style={{ fontSize: 44, textAlign: 'center', marginBottom: 6 }}>⏸️</div>
        <div className="login-logo" style={{ color: '#ff8080' }}>
          الخدمة موقوفة مؤقتاً
        </div>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, textAlign: 'center', lineHeight: 1.8, margin: '14px 0 10px' }}>
          يرجى تسديد الاشتراك لتفعيل الخدمة مرة أخرى.
        </div>
        {reason && (
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,128,128,0.3)',
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 20,
              textAlign: 'center',
            }}
          >
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 4 }}>السبب</div>
            <div style={{ color: '#ffaaaa', fontSize: 13, fontWeight: 700 }}>{reason}</div>
          </div>
        )}
        <button className="login-btn" style={{ background: 'rgba(255,255,255,0.1)' }} onClick={doLogout}>
          🚪 تسجيل الخروج
        </button>
      </div>
    </div>
  )
}
