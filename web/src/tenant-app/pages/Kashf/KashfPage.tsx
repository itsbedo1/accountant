import { useMemo, useState } from 'react'
import { fmt } from '../../../shared/format'
import { useDataStore } from '../../state/useDataStore'
import { openPrintDocument } from '../../print/openPrintDocument'
import { buildKashfPrintHtml } from '../../print/kashfPrint'
import KashfDetailModal, { type KashfDetailData } from './KashfDetailModal'
import type { Move, SayarfaMove } from '../../../shared/types'

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

interface Row {
  tarikh: string
  wared: number
  sader: number
  kind: 'move' | 'sayarfa'
  r: Move | SayarfaMove
  i: number
}

// منقولة من pageKashf (index.html:1147) — krOpen/krRender/krDetail/krCur
// (كانت بالسطر 2554-2685)
export default function KashfPage({ goPage }: { goPage: (id: string) => void }) {
  const settings = useDataStore((s) => s.settings)
  const moves = useDataStore((s) => s.moves)
  const sayarfaMoves = useDataStore((s) => s.sayarfaMoves)

  const [krCurrency, setKrCurrency] = useState<'dolar' | 'dinar'>('dolar')
  const [from, setFrom] = useState(todayISO)
  const [to, setTo] = useState(todayISO)
  const [detail, setDetail] = useState<KashfDetailData | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const isDolar = krCurrency === 'dolar'

  const { cards, prevBal, raseedFinal, totW, totS } = useMemo(() => {
    const initBal = isDolar ? settings.initBalD : settings.initBalDin

    const all: Row[] = []
    moves.forEach((r, i) => {
      if (r.jiha !== 'الصندوق') return
      const wared = isDolar ? (r.noa === 'قبض' ? r.mabD : 0) : r.noa === 'قبض' ? r.mabDin : 0
      const sader = isDolar ? (r.noa === 'صرف' ? r.mabD : 0) : r.noa === 'صرف' ? r.mabDin : 0
      if (!wared && !sader) return
      all.push({ tarikh: r.tarikh || '', wared, sader, kind: 'move', r, i })
    })
    sayarfaMoves.forEach((r, i) => {
      let wared = 0,
        sader = 0
      if (isDolar) {
        if (r.type === 'شراء') wared = r.mabD
        else sader = r.mabD
      } else {
        if (r.type === 'شراء') sader = r.mabDin
        else wared = r.mabDin
      }
      if (!wared && !sader) return
      all.push({ tarikh: r.tarikh || '', wared, sader, kind: 'sayarfa', r, i })
    })
    all.sort((a, b) => a.tarikh.localeCompare(b.tarikh))

    let prevBal = initBal
    all.forEach((m) => {
      if (from && m.tarikh < from) prevBal += m.wared - m.sader
    })

    let raseed = prevBal,
      totW = 0,
      totS = 0
    const cards: { key: string; detail: KashfDetailData; wared: number; sader: number; raseed: number; sayarfa: boolean; label: string; sub: string }[] = []

    all.forEach((m) => {
      if (from && m.tarikh < from) return
      if (to && m.tarikh > to) return
      raseed += m.wared - m.sader
      totW += m.wared
      totS += m.sader
      const dateStr = m.tarikh ? m.tarikh.split('-').reverse().join('/') : '-'

      if (m.kind === 'move') {
        const r = m.r as Move
        cards.push({
          key: `move-${m.i}`,
          sayarfa: false,
          label: r.amilName || r.hesab || '-',
          sub: `#${r.raqm || m.i + 1}`,
          wared: m.wared,
          sader: m.sader,
          raseed,
          detail: {
            sand: r.raqm,
            date: dateStr,
            name: r.amilName || r.hesab || '-',
            noa: r.noa,
            wared: m.wared,
            sader: m.sader,
            raseed,
            notes: r.notes,
            by: r.createdByEmail || undefined,
          },
        })
      } else {
        const r = m.r as SayarfaMove
        const label = `${r.type} دولار · ${r.rate} IQD/$`
        cards.push({
          key: `sayarfa-${m.i}`,
          sayarfa: true,
          label,
          sub: 'صيرفة',
          wared: m.wared,
          sader: m.sader,
          raseed,
          detail: {
            sand: 'صيرفة',
            date: dateStr,
            name: label,
            noa: r.type,
            wared: m.wared,
            sader: m.sader,
            raseed,
            notes: r.notes || '',
            by: r.createdByEmail || undefined,
          },
        })
      }
    })

    return { cards, prevBal, raseedFinal: raseed, totW, totS }
  }, [isDolar, settings.initBalD, settings.initBalDin, moves, sayarfaMoves, from, to])

  function openDetail(d: KashfDetailData) {
    setDetail(d)
    setDetailOpen(true)
  }

  function print() {
    const html = buildKashfPrintHtml({ isDolar, settings, moves, sayarfaMoves, from, to })
    openPrintDocument(html)
  }

  return (
    <div id="pageKashf" className="page active">
      <div className="kr-filter">
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span className="kr-title-box">كشف رصيد الصندوق ({isDolar ? 'دولار' : 'دينار'})</span>
        </div>
        <div className="kr-date-row">
          <span className="kr-date-lbl">من</span>
          <input className="kr-date-in" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="kr-date-lbl">الى</span>
          <input className="kr-date-in" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="kr-btn-row">
          <button className={`kr-fbtn dolar${isDolar ? ' act' : ''}`} onClick={() => setKrCurrency('dolar')}>
            دولار $
          </button>
          <button className={`kr-fbtn dinar${!isDolar ? ' act' : ''}`} onClick={() => setKrCurrency('dinar')}>
            دينار IQD
          </button>
        </div>
      </div>

      <div className="kr-tbody">
        <div className="kr-card sabiq" onClick={() => openDetail({ sand: '', date: '', name: 'رصيد سابق', noa: '', wared: 0, sader: 0, raseed: prevBal, notes: '' })}>
          <div className="kr-card-top">
            <span className="kr-card-icon">📌</span>
            <span className="kr-card-name">رصيد سابق</span>
          </div>
          <div className="kr-card-bottom">
            <div className="kr-card-amt wared">
              <span className="l">وارد</span>
              <span className="v">—</span>
            </div>
            <div className="kr-card-amt sader">
              <span className="l">صادر</span>
              <span className="v">—</span>
            </div>
            <div className="kr-card-amt raseed">
              <span className="l">الرصيد</span>
              <span className={`v${prevBal < 0 ? ' neg' : ''}`}>{fmt(prevBal)}</span>
            </div>
          </div>
        </div>

        {cards.map((c) => (
          <div key={c.key} className={`kr-card${c.sayarfa ? ' sayarfa' : ''}`} onClick={() => openDetail(c.detail)}>
            <div className="kr-card-top">
              {c.sayarfa ? (
                <span className="kr-card-icon">💱</span>
              ) : (
                <span className={`kr-card-noa ${c.detail.noa === 'قبض' ? 'qabdh' : 'sarf'}`}>{c.detail.noa || '-'}</span>
              )}
              <span className="kr-card-name">{c.label}</span>
              <span className="kr-card-raqm">{c.sub}</span>
            </div>
            <div className="kr-card-bottom">
              <div className="kr-card-amt wared">
                <span className="l">وارد</span>
                <span className="v">{fmt(c.wared)}</span>
              </div>
              <div className="kr-card-amt sader">
                <span className="l">صادر</span>
                <span className="v">{fmt(c.sader)}</span>
              </div>
              <div className="kr-card-amt raseed">
                <span className="l">الرصيد</span>
                <span className={`v${c.raseed < 0 ? ' neg' : ''}`}>{fmt(c.raseed)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="kr-totals">
        <div className="kr-tot-row">
          <div className="kr-tbox">
            <span className="tl">إجمالي الصادر</span>
            <span className="tv">{fmt(totS)}</span>
          </div>
          <div className="kr-tbox">
            <span className="tl">إجمالي الوارد</span>
            <span className="tv">{fmt(totW)}</span>
          </div>
          <div className="kr-tbox">
            <span className="tl">الرصيد النهائي</span>
            <span className="tv">{fmt(raseedFinal)}</span>
          </div>
        </div>
      </div>
      <div className="kr-toolbar">
        <button className="kr-tbtn" onClick={print}>
          🖨️ طباعة
        </button>
        <button className="kr-tbtn" onClick={() => goPage('pageMain')}>
          🏠 الرئيسية
        </button>
      </div>

      <KashfDetailModal open={detailOpen} data={detail} onClose={() => setDetailOpen(false)} />
    </div>
  )
}
