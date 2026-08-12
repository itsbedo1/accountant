import { useAdminToastStore } from '../state/useAdminToast'

export default function AdminToastBox() {
  const items = useAdminToastStore((s) => s.items)
  return (
    <div id="toastBox" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast${t.type ? ' ' + t.type : ''}`}>
          {t.msg}
        </div>
      ))}
    </div>
  )
}
