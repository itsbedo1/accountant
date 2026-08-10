import { useCallback, useRef, useState } from 'react'

interface ModalOptions {
  title?: string
  msg?: string
  withInput?: boolean
  placeholder?: string
  okLabel?: string
}

interface ModalState extends ModalOptions {
  open: boolean
  inputValue: string
}

// نافذة منبثقة عامة (تأكيد بس أو تأكيد + إدخال نص) بدل prompt/confirm
// المتصفح — منقولة من showModal() (admin.html:220). ترجع true (تأكيد بدون
// نص)، أو النص المدخل، أو null (إلغاء) — نفس دلالات القيم المرجعة بالأصل
export function useConfirmModal() {
  const [state, setState] = useState<ModalState>({ open: false, inputValue: '' })
  const resolveRef = useRef<((v: string | true | null) => void) | null>(null)

  const confirmModal = useCallback((opts: ModalOptions) => {
    return new Promise<string | true | null>((resolve) => {
      resolveRef.current = resolve
      setState({ open: true, inputValue: '', ...opts })
    })
  }, [])

  const setInputValue = useCallback((v: string) => setState((s) => ({ ...s, inputValue: v })), [])

  const confirm = useCallback(() => {
    setState((s) => {
      resolveRef.current?.(s.withInput ? s.inputValue : true)
      resolveRef.current = null
      return { ...s, open: false }
    })
  }, [])

  const cancel = useCallback(() => {
    setState((s) => ({ ...s, open: false }))
    resolveRef.current?.(null)
    resolveRef.current = null
  }, [])

  return { modalState: state, confirmModal, setInputValue, confirm, cancel }
}

export function ConfirmModal({ modalState, setInputValue, confirm, cancel }: ReturnType<typeof useConfirmModal>) {
  return (
    <div className="modal-overlay" style={{ display: modalState.open ? 'flex' : 'none' }}>
      <div className="modal-box">
        <div className="modal-title">{modalState.title}</div>
        <div className="modal-msg">{modalState.msg}</div>
        {modalState.withInput && (
          <input
            type="text"
            className="f-input ltr"
            placeholder={modalState.placeholder}
            value={modalState.inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirm()
            }}
            autoFocus
          />
        )}
        <div className="modal-actions">
          <button className="modal-btn" onClick={cancel}>
            إلغاء
          </button>
          <button className="modal-btn primary" onClick={confirm}>
            {modalState.okLabel || 'تأكيد'}
          </button>
        </div>
      </div>
    </div>
  )
}
