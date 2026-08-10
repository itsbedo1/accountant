import { sbFetch } from '../../shared/sbFetch'
import type { CustomerBalance } from '../domain/balanceMath'

// حفظ أرصدة عميل بعد كل حركة — منقولة حرفياً من index.html (dbUpdateCustomerBal، كانت بالسطر 4802)
export async function dbUpdateCustomerBal(c: CustomerBalance): Promise<void> {
  try {
    await sbFetch(`customers?id=eq.${c.id}`, 'PATCH', { d_a: c.dA, d_l: c.dL, din_a: c.dinA, din_l: c.dinL })
  } catch (e) {
    console.error('dbUpdateCustomerBal:', e)
  }
}
