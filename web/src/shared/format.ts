// منقولة من index.html (fmt كانت بالسطر 1872)
export function fmt(n: number | null | undefined): string {
  return n ? Number(n).toLocaleString() : '0'
}

// تنسيق إدخال مبلغ أثناء الكتابة (فواصل كل 3 أرقام) — منقولة من fmtInput
// (كانت بالسطر 4906)، بس هنا تاخذ وترجع نص بدل ما تعدّل عنصر DOM مباشرة
export function formatAmountInput(raw: string): string {
  const digits = raw.replace(/[^0-9.]/g, '')
  if (!digits || digits === '.') return digits
  const parts = digits.split('.')
  const intPart = parts[0]
  const decPart = parts.length > 1 ? '.' + parts[1] : ''
  return parseInt(intPart || '0').toLocaleString('en-US') + decPart
}

// قراءة القيمة الحقيقية بدون فواصل — منقولة من getRaw (كانت بالسطر 4920)
export function parseAmount(formatted: string): number {
  return parseFloat((formatted || '0').replace(/,/g, '')) || 0
}

// منقولة من index.html (fmtAmount، كانت بالسطر 3146) — تُستخدم بإشعارات
// تليجرام وبقائمة نتائج البحث عن حركة
export function fmtAmount(mabD: number, mabDin: number): string {
  const parts: string[] = []
  if (mabD) parts.push(`${Number(mabD).toLocaleString()}$`)
  if (mabDin) parts.push(`${Number(mabDin).toLocaleString()} د.ع`)
  return parts.join(' و ') || '0'
}
