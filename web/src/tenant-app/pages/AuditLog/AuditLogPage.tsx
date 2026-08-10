import { useEffect, useState } from 'react'
import { sbFetchAll } from '../../../shared/sbFetch'
import { AL_ACTION_META, type AuditLogEntry } from './auditLogTypes'
import AuditDetailModal from './AuditDetailModal'

function isoDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}
function todayISO() {
  return new Date().toISOString().split('T')[0]
}

// منقولة من pageAuditLog (index.html:1709) — alOpen/alRender/alDetail (كانت بالسطر 2902-2979)
export default function AuditLogPage({ goPage }: { goPage: (id: string) => void }) {
  const [from, setFrom] = useState(() => isoDaysAgo(30))
  const [to, setTo] = useState(todayISO)
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null)
  const [error, setError] = useState(false)
  const [detailIdx, setDetailIdx] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setEntries(null)
    setError(false)
    ;(async () => {
      try {
        let path = `audit_log?table_name=in.(moves,sayarfa_moves)&order=created_at.desc`
        if (from) path += `&created_at=gte.${from}T00:00:00`
        if (to) path += `&created_at=lte.${to}T23:59:59`
        const rows = await sbFetchAll<AuditLogEntry>(path)
        if (!cancelled) setEntries(rows)
      } catch (e) {
        console.error('alRender:', e)
        if (!cancelled) setError(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [from, to])

  return (
    <div id="pageAuditLog" className="page active">
      <div style={{ background: 'linear-gradient(135deg,#040d1a,#071e38)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
        <button onClick={() => goPage('pageSettings')} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, color: 'white', padding: '6px 10px', fontFamily: "'Cairo',sans-serif", fontSize: 12, cursor: 'pointer' }}>
          ↩ رجوع
        </button>
        <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent)' }}>📜 سجل التعديلات والحذف</div>
        <div style={{ width: 50 }}></div>
      </div>

      <div className="kr-filter">
        <div style={{ color: 'var(--text-dim)', fontSize: 11, marginBottom: 8, textAlign: 'center' }}>
          كل إضافة أو تعديل أو حذف على حركات الصندوق والصيرفة — بيبيّن منو سواها (مالك أو موظف)، بالترتيب الأحدث أولاً
        </div>
        <div className="kr-date-row">
          <span className="kr-date-lbl">من</span>
          <input className="kr-date-in" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="kr-date-lbl">الى</span>
          <input className="kr-date-in" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="kr-tbody">
        {entries === null && !error && <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, padding: 20 }}>⏳ جاري التحميل...</div>}
        {error && <div style={{ textAlign: 'center', color: 'var(--red)', fontSize: 12, padding: 20 }}>❌ فشل تحميل السجل</div>}
        {entries && !entries.length && <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, padding: 20 }}>لا يوجد نشاط مسجّل بهذه الفترة</div>}
        {entries?.map((e, i) => {
          const meta = AL_ACTION_META[e.action] || AL_ACTION_META.update
          const data = (e.new_data || e.old_data || {}) as Record<string, unknown>
          const name = (data.amilName as string) || (data.hesab as string) || (data.type as string) || '-'
          const raqm = (data.raqm as string) || (e.table_name === 'sayarfa_moves' ? 'صيرفة' : '—')
          const when = new Date(e.created_at).toLocaleString('ar-IQ', { dateStyle: 'short', timeStyle: 'short' })
          return (
            <div key={i} className="kr-card" onClick={() => setDetailIdx(i)}>
              <div className="kr-card-top">
                <span className={`kr-card-noa ${meta.cls}`}>
                  {meta.icon} {meta.label}
                </span>
                <span className="kr-card-name">{name}</span>
                <span className="kr-card-raqm">#{raqm}</span>
              </div>
              <div className="al-card-meta">
                {when} — {e.changed_by_email || '—'}
              </div>
            </div>
          )
        })}
      </div>

      <div className="kr-toolbar">
        <button className="kr-tbtn" onClick={() => goPage('pageMain')}>
          🏠 الرئيسية
        </button>
      </div>

      <AuditDetailModal open={detailIdx != null} entry={detailIdx != null ? (entries?.[detailIdx] ?? null) : null} onClose={() => setDetailIdx(null)} />
    </div>
  )
}
