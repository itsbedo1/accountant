import { useCallback, useState } from 'react'
import { useModalA11y } from '../../shared/useModalA11y'

// طباعة ذكية للموبايل والكمبيوتر — منقولة حرفياً من smartPrint()
// (كانت بالسطر 4928). على الموبايل تعرض تعليمات واضحة قبل window.print()،
// وعلى الكمبيوتر تطبع مباشرة — بالاعتماد على أنماط @media print المستخرجة بـ app.css
export function useSmartPrint() {
  const [overlay, setOverlay] = useState<{ open: boolean; title: string }>({ open: false, title: '' })

  const trigger = useCallback((pageTitle: string) => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (isMobile) {
      setOverlay({ open: true, title: pageTitle })
    } else {
      window.print()
    }
  }, [])

  const confirmPrint = useCallback(() => {
    setOverlay((o) => ({ ...o, open: false }))
    window.print()
  }, [])

  const cancelPrint = useCallback(() => setOverlay((o) => ({ ...o, open: false })), [])

  return { overlay, trigger, confirmPrint, cancelPrint }
}

export function SmartPrintOverlay({ overlay, confirmPrint, cancelPrint }: ReturnType<typeof useSmartPrint>) {
  const panelRef = useModalA11y(overlay.open, cancelPrint)
  if (!overlay.open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div
        style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '20px 20px 0 0', padding: '22px 18px', width: '100%', maxWidth: 480 }}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        <div style={{ color: 'var(--accent)', fontSize: 16, fontWeight: 900, textAlign: 'center', marginBottom: 6 }}>🖨️ طباعة / حفظ PDF</div>
        <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', marginBottom: 16 }}>{overlay.title || 'الصفحة الحالية'}</div>
        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <div style={{ color: 'var(--text2)', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>📱 على الموبايل:</div>
          <div style={{ color: 'var(--text)', fontSize: 13, lineHeight: 2 }}>
            1️⃣ اضغط <b style={{ color: 'var(--accent)' }}>متابعة</b> أدناه
            <br />
            2️⃣ اختر <b style={{ color: 'var(--gold)' }}>حفظ كـ PDF</b> أو <b style={{ color: 'var(--gold)' }}>طباعة</b>
            <br />
            3️⃣ اختر الطابعة أو احفظ الملف
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={confirmPrint}
            style={{ flex: 2, padding: 13, borderRadius: 10, fontFamily: "'Cairo',sans-serif", fontSize: 14, fontWeight: 900, background: 'var(--accent2)', border: 'none', color: 'white', cursor: 'pointer' }}
          >
            ✅ متابعة
          </button>
          <button
            onClick={cancelPrint}
            style={{ flex: 1, padding: 13, borderRadius: 10, fontFamily: "'Cairo',sans-serif", fontSize: 13, fontWeight: 700, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer' }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}
