import { useEffect, useState } from 'react'

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

function compute() {
  const now = new Date()
  const h = now.getHours()
  const m = String(now.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'م' : 'ص'
  const h12 = h % 12 || 12
  const d = String(now.getDate()).padStart(2, '0')
  const mo = String(now.getMonth() + 1).padStart(2, '0')
  const yr = now.getFullYear()
  return {
    time: `${h12}:${m} ${ampm}`,
    dateShort: `${d}/${mo}/${yr}`,
    dayName: DAYS[now.getDay()],
  }
}

// يعادل updateClock() + setInterval(updateClock,1000) بالكود القديم (كانت
// بالسطر 1890) — هنا hook بدل تحديث DOM مباشر
export function useClock() {
  const [clock, setClock] = useState(compute)
  useEffect(() => {
    const id = setInterval(() => setClock(compute()), 1000)
    return () => clearInterval(id)
  }, [])
  return clock
}
