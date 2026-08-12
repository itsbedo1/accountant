import { useMemo, useState } from 'react'
import { fmt } from '../../../shared/format'
import { toLocalISODate, todayISO } from '../../../shared/date'
import { toast } from '../../../shared/useToast'
import { useDataStore } from '../../state/useDataStore'
import { openPrintDocument } from '../../print/openPrintDocument'
import { buildKashfAmilPrintHtml } from '../../print/kashfAmilPrint'

function firstOfMonthISO() {
  const d = new Date()
  return toLocalISODate(new Date(d.getFullYear(), d.getMonth(), 1))
}

type KaCur = 'dolar' | 'dinar' | 'all'

// منقولة من pageKashfAmil (index.html:1218) — openKashfAmil/kaRender/kaCur/
// printKashfAmil (كانت بالسطر 3341-3721)
export default function KashfAmilPage({ customerId, goPage }: { customerId: number; goPage: (id: string) => void }) {
  const customers = useDataStore((s) => s.customers)
  const allMoves = useDataStore((s) => s.moves)
  const settings = useDataStore((s) => s.settings)
  const c = customers.find((x) => x.id === customerId)

  // نفس الفترة الافتراضية بـ openKashfAmil القديمة: من أول الشهر لليوم
  const [from, setFrom] = useState(firstOfMonthISO)
  const [to, setTo] = useState(todayISO)
  const [cur, setCur] = useState<KaCur>('dolar')

  const netD = c ? c.dL - c.dA : 0
  const netDin = c ? c.dinL - c.dinA : 0

  const { rows, prevRaseed } = useMemo(() => {
    if (!c) return { rows: [] as { key: string; wared: number; sader: number; raseed: number; label: string; sand: string; date: string }[], prevRaseed: 0 }

    const isDolar = cur === 'dolar'
    const isDinar = cur === 'dinar'
    const isAll = cur === 'all'

    const moves = allMoves.filter((r) => {
      const isAmil = r.amilId === c.id
      const isJiha = r.jiha === c.name
      if (!isAmil && !isJiha) return false
      if (from && r.tarikh < from) return false
      if (to && r.tarikh > to) return false
      return true
    })

    let prevRaseed =
      isDolar || isAll
        ? (c.initDL != null ? c.initDL : c.dL) - (c.initDA != null ? c.initDA : c.dA)
        : (c.initDinL != null ? c.initDinL : c.dinL) - (c.initDinA != null ? c.initDinA : c.dinA)
    allMoves.forEach((r) => {
      const isAmil = r.amilId === c.id
      if (!isAmil) return
      if (from && r.tarikh >= from) return
      if (isDolar || isAll) {
        if (r.noa === 'قبض') prevRaseed += r.mabD
        else prevRaseed -= r.mabD
      } else {
        if (r.noa === 'قبض') prevRaseed += r.mabDin
        else prevRaseed -= r.mabDin
      }
    })

    let raseed = prevRaseed
    const rows: { key: string; wared: number; sader: number; raseed: number; label: string; sand: string; date: string }[] = []
    moves.forEach((r, idx) => {
      const isAmil = r.amilId === c.id
      const isJiha = r.jiha === c.name
      let wared = 0,
        sader = 0

      if (isDolar || isAll) {
        if (isAmil) {
          if (r.noa === 'قبض') wared = r.mabD
          else sader = r.mabD
        } else if (isJiha) {
          if (r.noa === 'قبض') sader = r.mabD
          else wared = r.mabD
        }
      }
      if (isDinar) {
        wared = 0
        sader = 0
        if (isAmil) {
          if (r.noa === 'قبض') wared = r.mabDin
          else sader = r.mabDin
        } else if (isJiha) {
          if (r.noa === 'قبض') sader = r.mabDin
          else wared = r.mabDin
        }
      }
      if (!wared && !sader) return

      raseed += wared - sader
      const dateStr = r.tarikh ? r.tarikh.split('-').reverse().join('/') : '-'
      const jihaLabel = isJiha ? `(جهة صرف)` : r.jiha || '-'
      rows.push({
        key: `${idx}-${r.dbId}`,
        wared,
        sader,
        raseed,
        label: `${r.noa} · ${jihaLabel}`,
        sand: r.raqm || '-',
        date: dateStr,
      })
    })

    return { rows, prevRaseed }
  }, [c, allMoves, from, to, cur])

  function print() {
    if (!c) {
      toast('⚠️ اختر عميلاً أولاً')
      return
    }
    const html = buildKashfAmilPrintHtml({ customer: c, allMoves, settings, from, to })
    openPrintDocument(html)
  }

  if (!c) {
    return (
      <div id="pageKashfAmil" className="page active">
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>ما لقينا العميل</div>
      </div>
    )
  }

  return (
    <div id="pageKashfAmil" className="page active">
      <div className="ka-header">
        <div className="ka-name">كشف حساب: {c.name}</div>
        <div className="ka-bal-grid">
          <div className="ka-bal-box">
            <div className="kbl">الرصيد $ (له)</div>
            <div className="kbv">{fmt(c.dL)}</div>
          </div>
          <div className="ka-bal-box">
            <div className="kbl">الرصيد دينار (له)</div>
            <div className="kbv">{fmt(c.dinL)}</div>
          </div>
          <div className="ka-bal-box net">
            <div className="kbl">صافي $</div>
            <div className="kbv">
              {netD < 0 ? '-' : ''}
              {fmt(Math.abs(netD))}
            </div>
          </div>
          <div className="ka-bal-box net">
            <div className="kbl">صافي دينار</div>
            <div className="kbv">
              {netDin < 0 ? '-' : ''}
              {fmt(Math.abs(netDin))}
            </div>
          </div>
        </div>
        <div className="ka-date-row">
          <span className="ka-date-lbl">من</span>
          <input className="ka-date-in" type="date" aria-label="من تاريخ" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="ka-date-lbl">الى</span>
          <input className="ka-date-in" type="date" aria-label="الى تاريخ" value={to} onChange={(e) => setTo(e.target.value)} />
          <button className="ka-filter-btn" onClick={() => toast('✅ تم تحديث الفترة')}>
            عرض
          </button>
        </div>
      </div>

      <div className="ka-cur-row">
        <button className={`ka-cur-btn${cur === 'dolar' ? ' act-d' : ''}`} onClick={() => setCur('dolar')}>
          دولار $
        </button>
        <button className={`ka-cur-btn${cur === 'dinar' ? ' act-din' : ''}`} onClick={() => setCur('dinar')}>
          دينار IQD
        </button>
        <button className={`ka-cur-btn${cur === 'all' ? ' act-din' : ''}`} onClick={() => setCur('all')}>
          الكل
        </button>
      </div>

      <div className="ka-thead">
        <div className="ka-th">📄</div>
        <div className="ka-th">الرصيد</div>
        <div className="ka-th">وارد</div>
        <div className="ka-th">صادر</div>
        <div className="ka-th">النوع/جهة</div>
        <div className="ka-th">سند</div>
      </div>
      <div className="ka-tbody">
        <div className="ka-row sabiq-row">
          <div className="katd">📌</div>
          <div className="katd raseed">{fmt(prevRaseed)}</div>
          <div className="katd wared"></div>
          <div className="katd sader"></div>
          <div className="katd noa">رصيد سابق</div>
          <div className="katd sand"></div>
        </div>
        {rows.map((row) => (
          <div key={row.key} className="ka-row">
            <div className="katd" style={{ color: '#888' }}>
              📄
            </div>
            <div className="katd raseed" style={row.raseed < 0 ? { color: '#ff6060' } : undefined}>
              {fmt(row.raseed)}
            </div>
            <div className="katd wared">{fmt(row.wared)}</div>
            <div className="katd sader">{fmt(row.sader)}</div>
            <div className="katd noa">{row.label}</div>
            <div className="katd sand">
              {row.sand}
              <br />
              <span style={{ color: '#666', fontSize: 9 }}>{row.date}</span>
            </div>
          </div>
        ))}
        {!rows.length && <div style={{ textAlign: 'center', color: '#888', padding: 30, fontSize: 13 }}>لا توجد حركات في هذه الفترة</div>}
      </div>

      <div className="ka-bot">
        <button className="ka-bot-btn print" onClick={print}>
          🖨️ طباعة الكشف
        </button>
        <button className="ka-bot-btn back" onClick={() => goPage('pageArsada')}>
          ← رجوع
        </button>
      </div>
    </div>
  )
}
