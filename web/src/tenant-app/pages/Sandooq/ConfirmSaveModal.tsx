import type { MoveDraft } from '../../api/moves'
import type { Move } from '../../../shared/types'
import { useModalA11y } from '../../../shared/useModalA11y'

// منقولة من modalConfirmSave (index.html:766) — sSave() تبني محتواه
// (كانت بالسطر 2219-2278)، confirmAndSave() ينفذ الحفظ (كانت بالسطر 2282)
export default function ConfirmSaveModal({
  open,
  draft,
  old,
  saving,
  onConfirm,
  onCancel,
}: {
  open: boolean
  draft: MoveDraft | null
  old: Move | null
  saving: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const panelRef = useModalA11y(open && draft != null, onCancel)
  if (!draft) return null
  const wasEdit = old != null
  const isQabdh = draft.noa === 'قبض'
  // خطر إضافي: لو السجل القديم كان لعميل مختلف تماماً — تحذير أوضح
  const diffCust = wasEdit && old.amilId != null && draft.amilId != null && old.amilId !== draft.amilId

  return (
    <div className={`modal-ov${open ? ' show' : ''}`}>
      <div
        className="modal-box dark"
        style={{ background: 'var(--bg2)', border: '1.5px solid var(--border2)' }}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        <h3 className="modal-h3 dark" style={{ color: 'var(--accent)' }}>
          📋 تأكيد الحركة
        </h3>

        {wasEdit && (
          <div
            style={{
              background: 'rgba(251,191,36,.15)',
              border: '1.5px solid rgba(251,191,36,.5)',
              borderRadius: 8,
              padding: 10,
              marginBottom: 12,
              textAlign: 'center',
              color: 'var(--gold)',
              fontSize: 13,
              fontWeight: 900,
            }}
          >
            {diffCust
              ? `⚠️ خطر — هذا السجل حالياً لعميل ثاني (${old?.amilName || '؟'})! لو أكدت، بياناته تنمسح وتنستبدل بحركتك`
              : '⚠️ انتباه — هذا تعديل على سجل موجود، مو سجل جديد'}
          </div>
        )}

        <div
          style={{
            textAlign: 'center',
            fontSize: 20,
            fontWeight: 900,
            padding: 10,
            borderRadius: 10,
            marginBottom: 12,
            background: isQabdh ? 'rgba(57,255,136,.15)' : 'rgba(251,113,133,.15)',
            color: isQabdh ? 'var(--accent)' : 'var(--red)',
            border: isQabdh ? '1.5px solid rgba(57,255,136,.4)' : '1.5px solid rgba(251,113,133,.4)',
          }}
        >
          {isQabdh ? '⬇️ قبض' : '⬆️ صرف'}
        </div>

        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <Row label="رقم السند" value={draft.raqm || '—'} />
          <Row label="التاريخ" value={draft.tarikh ? draft.tarikh.split('-').reverse().join('/') : '—'} />
          <Row label="الحساب" value={draft.hesab || '—'} />
          {draft.amilName && <Row label="العميل" value={draft.amilName} accent />}
          <Row label="جهة الصرف" value={draft.jiha || '—'} last />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <div style={{ background: 'rgba(251,191,36,.1)', border: '1px solid rgba(251,191,36,.3)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 10, marginBottom: 4 }}>دولار $</div>
            <div style={{ color: 'var(--gold)', fontSize: 18, fontWeight: 900, direction: 'ltr' }}>{(draft.mabD || 0).toLocaleString()}</div>
          </div>
          <div style={{ background: 'rgba(57,255,136,.08)', border: '1px solid rgba(57,255,136,.2)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 10, marginBottom: 4 }}>دينار IQD</div>
            <div style={{ color: 'var(--accent)', fontSize: 16, fontWeight: 900, direction: 'ltr' }}>{(draft.mabDin || 0).toLocaleString()}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            disabled={saving}
            onClick={onConfirm}
            style={{
              padding: 14,
              borderRadius: 10,
              fontFamily: "'Cairo',sans-serif",
              fontSize: 15,
              fontWeight: 900,
              background: 'var(--accent2)',
              border: 'none',
              color: 'white',
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? '⏳ جاري الحفظ...' : wasEdit ? '⚠️ تأكيد التعديل' : '✅ تأكيد وحفظ'}
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: 14,
              borderRadius: 10,
              fontFamily: "'Cairo',sans-serif",
              fontSize: 14,
              fontWeight: 700,
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              color: 'var(--text-dim)',
              cursor: 'pointer',
            }}
          >
            ✏️ تعديل
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, accent, last }: { label: string; value: string; accent?: boolean; last?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '7px 0',
        borderBottom: last ? 'none' : '1px solid var(--border)',
      }}
    >
      <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{label}</span>
      <span style={{ color: accent ? 'var(--accent)' : 'var(--text)', fontWeight: 700 }}>{value}</span>
    </div>
  )
}
