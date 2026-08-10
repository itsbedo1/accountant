// toISOString() يحوّل للـ UTC — قرب منتصف الليل بتوقيت العراق (UTC+3) هذا
// يرجع تاريخ الأمس لحد الساعة 3 فجراً محلياً. الدوال هنا تاخذ تاريخ اليوم
// المحلي فعلياً بدل هذا الخلل.
export function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayISO(): string {
  return toLocalISODate(new Date())
}
