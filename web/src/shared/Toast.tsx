import { useToastStore } from './useToast'

export default function Toast() {
  const { msg, visible } = useToastStore()
  return (
    <div className={`toast${visible ? ' show' : ''}`} role="status" aria-live="polite">
      {msg}
    </div>
  )
}
