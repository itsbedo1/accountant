import { PRINT_DOC_STYLE, escapeHtml, fmtPrintNum, fmtPrintSigned } from './openPrintDocument'
import type { Customer, Move, Settings } from '../../shared/types'

// منقولة حرفياً من printKashfAmil() بالكود القديم (index.html:3477)
export function buildKashfAmilPrintHtml(params: {
  customer: Customer
  allMoves: Move[]
  settings: Settings
  from: string
  to: string
}): string {
  const { customer: c, allMoves, settings, from, to } = params
  const fromStr = from ? from.split('-').reverse().join('/') : '—'
  const toStr = to ? to.split('-').reverse().join('/') : '—'
  const compName = settings.compName || 'المنير'
  const today = new Date().toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const moves = allMoves
    .filter((r) => {
      const isAmil = r.amilId === c.id
      const isJiha = r.jiha === c.name
      if (!isAmil && !isJiha) return false
      if (from && r.tarikh < from) return false
      if (to && r.tarikh > to) return false
      return true
    })
    .sort((a, b) => (a.tarikh || '').localeCompare(b.tarikh || ''))

  // رصيد سابق قبل الفترة — يبدأ من الرصيد الافتتاحي المحفوظ للعميل
  let prevD = (c.initDL != null ? c.initDL : c.dL) - (c.initDA != null ? c.initDA : c.dA)
  let prevDin = (c.initDinL != null ? c.initDinL : c.dinL) - (c.initDinA != null ? c.initDinA : c.dinA)
  allMoves.forEach((r) => {
    if (r.amilId !== c.id) return
    if (from && r.tarikh >= from) return
    if (r.noa === 'قبض') {
      prevD += r.mabD
      prevDin += r.mabDin
    } else {
      prevD -= r.mabD
      prevDin -= r.mabDin
    }
  })

  let netD = prevD,
    netDin = prevDin
  let totLeD = 0,
    totAlayhD = 0,
    totLeDin = 0,
    totAlayhDin = 0

  const rowsHtml = moves
    .map((r) => {
      const isAmil = r.amilId === c.id
      const isJiha = r.jiha === c.name
      let leD = 0,
        alayhD = 0,
        leDin = 0,
        alayhDin = 0
      if (isAmil) {
        if (r.noa === 'قبض') {
          leD = r.mabD
          leDin = r.mabDin
        } else {
          alayhD = r.mabD
          alayhDin = r.mabDin
        }
      } else if (isJiha) {
        if (r.noa === 'قبض') {
          alayhD = r.mabD
          alayhDin = r.mabDin
        } else {
          leD = r.mabD
          leDin = r.mabDin
        }
      }
      netD += leD - alayhD
      netDin += leDin - alayhDin
      totLeD += leD
      totAlayhD += alayhD
      totLeDin += leDin
      totAlayhDin += alayhDin
      const dateStr = r.tarikh ? r.tarikh.split('-').reverse().join('/') : ''
      const noaCls = r.noa === 'قبض' ? 'noa-qabd' : 'noa-sarf'
      return `<tr>
      <td class="col-notes">${escapeHtml(r.notes || (isJiha ? r.amilName : '') || '')}</td>
      <td>${dateStr}</td>
      <td style="color:#9aa2b1;">${escapeHtml(r.raqm || '')}</td>
      <td class="col-noa ${noaCls}">${escapeHtml(r.noa || '')}</td>
      <td>${fmtPrintNum(alayhDin)}</td>
      <td>${fmtPrintNum(leDin)}</td>
      <td class="col-net">${fmtPrintSigned(netDin)}</td>
      <td>${fmtPrintNum(alayhD)}</td>
      <td>${fmtPrintNum(leD)}</td>
      <td class="col-net">${fmtPrintSigned(netD)}</td>
    </tr>`
    })
    .join('')

  // المتبقي — بذمتنا (علينا له) = موجب | بذمتكم (عليه لنا) = سالب
  const bZimtinaD = netD > 0 ? netD : 0
  const bZimtihomD = netD < 0 ? Math.abs(netD) : 0
  const bZimtinaDin = netDin > 0 ? netDin : 0
  const bZimtihomDin = netDin < 0 ? Math.abs(netDin) : 0

  const balCards: { lbl: string; amt: number; cur: string; tone: 'owe' | 'due' }[] = []
  if (bZimtinaDin > 0) balCards.push({ lbl: 'المتبقي بذمتنا (لكم علينا)', amt: bZimtinaDin, cur: 'دينار', tone: 'owe' })
  if (bZimtinaD > 0) balCards.push({ lbl: 'المتبقي بذمتنا (لكم علينا)', amt: bZimtinaD, cur: 'دولار', tone: 'owe' })
  if (bZimtihomDin > 0) balCards.push({ lbl: 'المتبقي بذمتكم (لنا عليكم)', amt: bZimtihomDin, cur: 'دينار', tone: 'due' })
  if (bZimtihomD > 0) balCards.push({ lbl: 'المتبقي بذمتكم (لنا عليكم)', amt: bZimtihomD, cur: 'دولار', tone: 'due' })
  const balancesHtml = balCards.length
    ? balCards
        .map(
          (b) => `
        <div class="bal-card ${b.tone}">
          <div class="bal-amt">${fmtPrintNum(b.amt)} <span class="bal-cur">${b.cur}</span></div>
          <div class="bal-lbl">${b.lbl}</div>
        </div>`,
        )
        .join('')
    : `<div class="bal-card even"><div class="bal-amt">✓ متطابق</div><div class="bal-lbl">لا يوجد رصيد متبقٍ</div></div>`

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>كشف حساب — ${escapeHtml(c.name)}</title>
<style>${PRINT_DOC_STYLE}
table{min-width:640px;}
thead .grp-row th{padding:9px 4px;font-weight:700;font-size:11px;background:#0d3f7a;color:#fff;border-left:1px solid rgba(255,255,255,.15);}
@media print{ table{min-width:0;} }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>

<div class="sheet">
  <div class="doc-header">
    <div>
      <div class="comp-name">${escapeHtml(compName)}</div>
      <div class="doc-title">كشف حساب عميل</div>
    </div>
    <div class="doc-meta">
      <div>تاريخ الإصدار: <b>${today}</b></div>
      <div>الفترة: <b>${fromStr}</b> — <b>${toStr}</b></div>
    </div>
  </div>

  <div class="customer-box">
    <div class="cust-name">👤 ${escapeHtml(c.name)}</div>
    <div class="cust-id">رقم العميل: #${c.id}</div>
  </div>

  <div class="sheet-body">
  <div class="table-scroll">
  <table>
    <colgroup>
      <col style="width:17%"><col style="width:8%"><col style="width:7%"><col style="width:7%">
      <col style="width:9%"><col style="width:9%"><col style="width:12%">
      <col style="width:9%"><col style="width:9%"><col style="width:12%">
    </colgroup>
    <thead>
      <tr class="grp-row">
        <th rowspan="2">الملاحظات</th>
        <th rowspan="2">التاريخ</th>
        <th rowspan="2">الرقم</th>
        <th rowspan="2">النوع</th>
        <th colspan="3">دينار عراقي (IQD)</th>
        <th colspan="3">دولار أمريكي (USD)</th>
      </tr>
      <tr class="sub-row">
        <th>عليه</th><th>له</th><th>الرصيد</th>
        <th>عليه</th><th>له</th><th>الرصيد</th>
      </tr>
    </thead>
    <tbody>
      <tr class="row-sabiq">
        <td colspan="4">رصيد سابق</td>
        <td></td><td></td><td class="col-net">${fmtPrintSigned(prevDin)}</td>
        <td></td><td></td><td class="col-net">${fmtPrintSigned(prevD)}</td>
      </tr>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4">الإجمالي</td>
        <td>${fmtPrintNum(totAlayhDin)}</td><td>${fmtPrintNum(totLeDin)}</td><td>${fmtPrintSigned(netDin)}</td>
        <td>${fmtPrintNum(totAlayhD)}</td><td>${fmtPrintNum(totLeD)}</td><td>${fmtPrintSigned(netD)}</td>
      </tr>
    </tfoot>
  </table>
  </div>

  <div class="balances">
    ${balancesHtml}
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
