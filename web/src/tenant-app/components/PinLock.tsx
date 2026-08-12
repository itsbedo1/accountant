import { useCallback, useRef, useState } from 'react'
import { toast } from '../../shared/useToast'
import { useModalA11y } from '../../shared/useModalA11y'

// رمز الحماية 8888 — منقول حرفياً من index.html (PIN_CODE، requirePin/pinPress...)
// ثابت للتطبيق كامل، مو خاص بكل شركة — نفس السلوك القديم بالضبط، لا نغيّره هنا
const PIN_CODE = '8888'

interface PinGateState {
  open: boolean
  label: string
  value: string
  error: boolean
}

/**
 * يعادل requirePin(label, callback) بالكود القديم: بدل تمرير callback، يرجع
 * confirmPin(label) وعده (promise) يتحقق لما المستخدم يدخل الرمز الصحيح، أو
 * يرفض إذا ألغى — نفس سلوك المستخدم، واجهة أنظف للاستدعاء من React.
 */
export function usePinGate() {
  const [state, setState] = useState<PinGateState>({ open: false, label: '', value: '', error: false })
  const resolveRef = useRef<((ok: boolean) => void) | null>(null)

  const confirmPin = useCallback((label: string) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      setState({ open: true, label, value: '', error: false })
    })
  }, [])

  const press = useCallback((digit: string) => {
    setState((s) => {
      if (s.open === false || s.value.length >= 4) return s
      const value = s.value + digit
      if (value.length === 4) {
        setTimeout(() => {
          if (value === PIN_CODE) {
            setState({ open: false, label: '', value: '', error: false })
            resolveRef.current?.(true)
            resolveRef.current = null
          } else {
            setState((s2) => ({ ...s2, error: true }))
            setTimeout(() => {
              setState((s2) => ({ ...s2, value: '', error: false }))
              toast('❌ رمز خاطئ')
            }, 600)
          }
        }, 150)
      }
      return { ...s, value }
    })
  }, [])

  const del = useCallback(() => setState((s) => ({ ...s, value: s.value.slice(0, -1) })), [])
  const clear = useCallback(() => setState((s) => ({ ...s, value: '' })), [])
  const cancel = useCallback(() => {
    setState({ open: false, label: '', value: '', error: false })
    resolveRef.current?.(false)
    resolveRef.current = null
  }, [])

  return { pinState: state, confirmPin, press, del, clear, cancel }
}

export function PinModal({ pinState, press, del, clear, cancel }: ReturnType<typeof usePinGate>) {
  const panelRef = useModalA11y(pinState.open, cancel)
  return (
    <div className={`modal-ov${pinState.open ? ' show' : ''}`}>
      <div
        className="modal-box dark"
        style={{ background: '#1a1a2a', border: '2px solid #f0c040' }}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        <h3 className="modal-h3 dark" style={{ color: '#f0c040' }}>
          🔐 رمز الحماية
        </h3>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginBottom: 14 }}>
          {pinState.label || 'أدخل رمز الحماية للمتابعة'}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`pin-dot${pinState.error ? ' error' : i < pinState.value.length ? ' filled' : ''}`}
            />
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} className="pin-btn" onClick={() => press(d)}>
              {d}
            </button>
          ))}
          <button className="pin-btn" style={{ background: 'rgba(200,50,50,0.3)', color: '#ff8080' }} onClick={clear}>
            مسح
          </button>
          <button className="pin-btn" onClick={() => press('0')}>
            0
          </button>
          <button className="pin-btn" style={{ fontSize: 18 }} onClick={del}>
            ⌫
          </button>
        </div>

        <button className="modal-close-btn" style={{ background: '#1a1a2a', color: '#666' }} onClick={cancel}>
          إلغاء
        </button>
      </div>
    </div>
  )
}
