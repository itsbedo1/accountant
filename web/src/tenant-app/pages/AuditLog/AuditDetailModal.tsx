import type { ReactNode } from 'react'
import { AL_ACTION_META, AL_FIELD_LABELS, type AuditLogEntry } from './auditLogTypes'
import { useModalA11y } from '../../../shared/useModalA11y'

// منقولة من modalAuditDetail (index.html:1755) — alDetail() (كانت بالسطر 2949)
export default function AuditDetailModal({ open, entry, onClose }: { open: boolean; entry: AuditLogEntry | null; onClose: () => void }) {
  const panelRef = useModalA11y(open && entry != null, onClose)
  if (!entry) return null
  const meta = AL_ACTION_META[entry.action] || AL_ACTION_META.update
  const tableLabel = entry.table_name === 'sayarfa_moves' ? 'حركة صيرفة' : 'حركة صندوق'
  const oldD = entry.old_data || {}
  const newD = entry.new_data || {}
  const fields = Object.keys(AL_FIELD_LABELS)

  const rows: { label: string; content: ReactNode }[] = []
  if (entry.action === 'delete' || entry.action === 'create') {
    const src = entry.action === 'delete' ? oldD : newD
    for (const f of fields) {
      const v = src[f]
      if (v == null || v === '') continue
      rows.push({ label: AL_FIELD_LABELS[f], content: String(v) })
    }
  } else {
    for (const f of fields) {
      const ov = oldD[f]
      const nv = newD[f]
      if ((ov == null || ov === '') && (nv == null || nv === '')) continue
      const changed = String(ov ?? '') !== String(nv ?? '')
      rows.push({
        label: AL_FIELD_LABELS[f],
        content: (
          <>
            {String(ov ?? '—')} ← <span style={changed ? { color: 'var(--gold)' } : undefined}>{String(nv ?? '—')}</span>
          </>
        ),
      })
    }
  }

  return (
    <div className={`modal-ov${open ? ' show' : ''}`}>
      <div className="modal-box dark" ref={panelRef} role="dialog" aria-modal="true" tabIndex={-1}>
        <h3 className="modal-h3 dark">
          {meta.icon} {meta.label} — {tableLabel}
        </h3>
        <div className="mrow" style={{ borderBottom: '2px solid var(--border2)' }}>
          <span className="ml">بواسطة</span>
          <span className="mv">{entry.changed_by_email || '—'}</span>
        </div>
        <div className="mrow">
          <span className="ml">التاريخ والوقت</span>
          <span className="mv">{new Date(entry.created_at).toLocaleString('ar-IQ')}</span>
        </div>
        {rows.map((r, i) => (
          <div className="mrow al-diff-row" key={i}>
            <span className="ml">{r.label}</span>
            <span className="mv">{r.content}</span>
          </div>
        ))}
        <button className="modal-close-btn" style={{ background: '#1a3060', color: '#80e8ff', marginTop: 8 }} onClick={onClose}>
          إغلاق
        </button>
      </div>
    </div>
  )
}
