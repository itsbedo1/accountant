// يفتح مستند HTML جاهز بتبويب جديد للطباعة/حفظ PDF — منقولة حرفياً من
// نهاية printKashf()/printKashfAmil() بالكود القديم (نفس أسلوب Blob مع
// fallback إلى window.open). نسخة طباعة منفصلة تماماً عن واجهة التطبيق —
// طباعة واجهة التطبيق مباشرة كانت تطلع مزدحمة وتعلّق المتصفح بالموبايل
export function openPrintDocument(html: string): void {
  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 1000)
  } catch {
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
    }
  }
}

// أسلوب مشترك لكل مستندات الطباعة — منقول حرفياً (نفس الألوان والقياسات)
export const PRINT_DOC_STYLE = `
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Tahoma','Arial',sans-serif;background:#eef1f5;color:#1a2233;font-size:12px;padding:22px;font-variant-numeric:tabular-nums;line-height:1.4;}
.sheet{max-width:900px;margin:0 auto;background:#fff;border-radius:10px;box-shadow:0 4px 24px rgba(20,30,50,.08);overflow:hidden;}
.print-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;max-width:900px;margin:0 auto 14px;padding:13px;background:#0d3f7a;color:#fff;border:none;border-radius:10px;font-family:'Tahoma','Arial',sans-serif;font-size:15px;font-weight:700;cursor:pointer;}
.doc-header{background:linear-gradient(135deg,#0d3f7a,#1a5fb0);color:#fff;padding:20px 26px;display:flex;align-items:flex-start;justify-content:space-between;gap:14px;}
.doc-header .comp-name{font-size:23px;font-weight:700;letter-spacing:.2px;}
.doc-header .doc-title{margin-top:5px;font-size:12.5px;font-weight:700;color:#cfe1f7;letter-spacing:1px;}
.doc-header .doc-meta{font-size:11px;font-weight:400;color:#d9e7f8;line-height:1.9;text-align:left;white-space:nowrap;}
.doc-header .doc-meta b{color:#fff;font-weight:700;}
.customer-box{display:flex;align-items:center;justify-content:space-between;gap:14px;background:#f4f7fb;border-bottom:1px solid #e2e6ec;padding:14px 26px;}
.customer-box .cust-name{font-size:15px;font-weight:700;color:#0d3f7a;}
.customer-box .cust-id{font-size:11.5px;font-weight:700;color:#5b6472;background:#fff;border:1px solid #dbe2ea;border-radius:6px;padding:5px 12px;}
.sheet-body{padding:20px 26px 26px;}
.table-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;margin-bottom:20px;}
table{width:100%;table-layout:fixed;border-collapse:collapse;margin-bottom:0;font-size:11px;}
thead{display:table-header-group;}
tr{break-inside:avoid;page-break-inside:avoid;}
thead th{padding:9px 4px;font-weight:700;font-size:11px;background:#0d3f7a;color:#fff;border-left:1px solid rgba(255,255,255,.15);}
thead .sub-row th{padding:6px 4px;font-weight:700;font-size:10px;color:#0d3f7a;background:#dce8f6;border-left:1px solid #fff;border-bottom:2px solid #0d3f7a;}
tbody td{padding:7px 4px;border-bottom:1px solid #eef0f4;text-align:center;vertical-align:middle;white-space:nowrap;color:#28303e;}
tbody tr:nth-child(even){background:#f6f7f9;}
tbody tr.row-sabiq{background:#eef2f7;font-weight:700;}
tbody tr.row-sabiq td{border-bottom:2px solid #0d3f7a;color:#0d3f7a;}
td.col-notes{text-align:right;color:#8a93a3;font-size:9.5px;white-space:normal;word-break:break-word;}
td.col-noa{font-weight:700;}
td.col-noa.noa-qabd{color:#1a7a44;}
td.col-noa.noa-sarf{color:#b03030;}
td.col-net{font-weight:700;color:#0d3f7a;background:#f2f6fb;}
td.col-name{text-align:right;white-space:normal;word-break:break-word;}
tfoot td{padding:9px 4px;text-align:center;font-weight:700;background:#0d3f7a;color:#fff;white-space:nowrap;}
.balances{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;}
.bal-card{flex:1;min-width:180px;border-radius:8px;padding:14px 16px;text-align:center;border:1.5px solid;}
.bal-card.owe{background:#fdeeee;border-color:#f3c6c6;}
.bal-card.due{background:#eaf8ef;border-color:#bfe8cc;}
.bal-card.even{background:#eef2ff;border-color:#c7d2ff;}
.bal-amt{font-size:19px;font-weight:700;margin-bottom:4px;color:#0d3f7a;}
.bal-card.owe .bal-amt{color:#b03030;}
.bal-card.due .bal-amt{color:#1a7a44;}
.bal-cur{font-size:12px;font-weight:700;}
.bal-lbl{font-size:11px;font-weight:700;color:#5b6472;}
.e-note{text-align:center;font-size:10.5px;color:#5b6472;background:#f4f7fb;border:1px dashed #c9d2dd;border-radius:6px;padding:9px;margin-bottom:14px;}
.footer{display:flex;justify-content:space-between;font-size:10px;color:#9aa2b1;border-top:1px solid #eef0f4;padding-top:10px;}
@media print{
  body{background:#fff;padding:0;}
  .print-btn{display:none!important;}
  .sheet{box-shadow:none;border-radius:0;max-width:none;}
  .table-scroll{overflow-x:visible;}
  table{min-width:0;}
  @page{size:A4 landscape;margin:10mm;}
}
`

export function fmtPrintNum(n: number): string {
  return n ? Math.round(n).toLocaleString() : ''
}

// تنسيق الرصيد بطريقة محاسبية عراقية: سالب يطلع بإشارة ناقص بعد الرقم (105,134-)
export function fmtPrintSigned(n: number): string {
  const r = Math.round(n)
  return r === 0 ? '0' : r < 0 ? `${Math.abs(r).toLocaleString()}-` : r.toLocaleString()
}

export function escapeHtml(str: string | null | undefined): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
