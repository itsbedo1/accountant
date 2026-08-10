import { PRINT_DOC_STYLE, escapeHtml, fmtPrintNum, fmtPrintSigned } from './openPrintDocument'
import type { Move, SayarfaMove, Settings } from '../../shared/types'

// منقولة حرفياً من printKashf() بالكود القديم (index.html:2689) — نفس
// منطق تجميع الحركات، حساب الرصيد السابق، وبناء الجدول
export function buildKashfPrintHtml(params: {
  isDolar: boolean
  settings: Settings
  moves: Move[]
  sayarfaMoves: SayarfaMove[]
  from: string
  to: string
}): string {
  const { isDolar, settings, moves, sayarfaMoves, from, to } = params
  const curLabel = isDolar ? 'دولار أمريكي (USD)' : 'دينار عراقي (IQD)'
  const initBal = isDolar ? settings.initBalD : settings.initBalDin
  const fromStr = from ? from.split('-').reverse().join('/') : '—'
  const toStr = to ? to.split('-').reverse().join('/') : '—'
  const compName = settings.compName || 'المنير'
  const today = new Date().toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  interface Row {
    tarikh: string
    wared: number
    sader: number
    kind: 'move' | 'sayarfa'
    r: Move | SayarfaMove
    i: number
  }
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
  let rowsHtml = ''
  all.forEach((m) => {
    if (from && m.tarikh < from) return
    if (to && m.tarikh > to) return
    raseed += m.wared - m.sader
    totW += m.wared
    totS += m.sader
    const dateStr = m.tarikh ? m.tarikh.split('-').reverse().join('/') : '-'
    let name: string, noa: string, raqm: string
    if (m.kind === 'move') {
      const r = m.r as Move
      name = r.amilName || r.hesab || '-'
      noa = r.noa || '-'
      raqm = r.raqm || String(m.i + 1)
    } else {
      const r = m.r as SayarfaMove
      name = `${r.type} دولار · ${r.rate} IQD/$`
      noa = r.type
      raqm = 'صيرفة'
    }
    const noaCls = noa === 'قبض' ? 'noa-qabd' : 'noa-sarf'
    rowsHtml += `<tr>
      <td>${dateStr}</td>
      <td style="color:#9aa2b1;">${escapeHtml(raqm)}</td>
      <td class="col-name">${escapeHtml(name)}</td>
      <td class="col-noa ${noaCls}">${escapeHtml(noa)}</td>
      <td>${fmtPrintNum(m.wared)}</td>
      <td>${fmtPrintNum(m.sader)}</td>
      <td class="col-net">${fmtPrintSigned(raseed)}</td>
    </tr>`
  })

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>كشف رصيد الصندوق — ${escapeHtml(compName)}</title>
<style>${PRINT_DOC_STYLE}
table{min-width:520px;}
@media print{ table{min-width:0;} }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>

<div class="sheet">
  <div class="doc-header">
    <div>
      <div class="comp-name">${escapeHtml(compName)}</div>
      <div class="doc-title">كشف رصيد الصندوق</div>
    </div>
    <div class="doc-meta">
      <div>تاريخ الإصدار: <b>${today}</b></div>
      <div>الفترة: <b>${fromStr}</b> — <b>${toStr}</b></div>
    </div>
  </div>

  <div class="customer-box">
    <div class="cust-name">🏦 القاصة</div>
    <div class="cust-id">العملة: ${curLabel}</div>
  </div>

  <div class="sheet-body">
  <div class="table-scroll">
  <table>
    <colgroup>
      <col style="width:11%"><col style="width:10%"><col style="width:27%"><col style="width:11%">
      <col style="width:13%"><col style="width:13%"><col style="width:15%">
    </colgroup>
    <thead>
      <tr>
        <th>التاريخ</th><th>الرقم</th><th>البيان</th><th>النوع</th>
        <th>وارد</th><th>صادر</th><th>الرصيد</th>
      </tr>
    </thead>
    <tbody>
      <tr class="row-sabiq">
        <td colspan="4">رصيد سابق</td>
        <td></td><td></td><td class="col-net">${fmtPrintSigned(prevBal)}</td>
      </tr>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4">الإجمالي</td>
        <td>${fmtPrintNum(totW)}</td><td>${fmtPrintNum(totS)}</td><td>${fmtPrintSigned(raseed)}</td>
      </tr>
    </tfoot>
  </table>
  </div>

  <div class="balances">
    <div class="bal-card even">
      <div class="bal-amt">${fmtPrintNum(raseed)} ${curLabel.split(' ')[0]}</div>
      <div class="bal-lbl">الرصيد النهائي للصندوق</div>
    </div>
  </div>

  <div class="e-note">هذا المستند صادر إلكترونياً عبر نظام ${escapeHtml(compName)} المحاسبي ولا يحتاج توقيعاً أو ختماً يدوياً</div>

  <div class="footer">
    <span>${escapeHtml(compName)}</span>
    <span>صفحة 1 من 1</span>
    <span>${today}</span>
  </div>
  </div>
</div>
</body></html>`
}
