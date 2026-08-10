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

// إنشاء عميل جديد مع رصيد افتتاحي اختياري — منقولة من stAddAmil() (كانت بالسطر 4327)
export async function dbCreateCustomer(name: string, dL: number, dA: number, dinL: number, dinA: number): Promise<number | null> {
  const res = await sbFetch<{ id: number }[]>('customers', 'POST', {
    name,
    d_a: dA,
    d_l: dL,
    din_a: dinA,
    din_l: dinL,
    init_d_l: dL,
    init_d_a: dA,
    init_din_l: dinL,
    init_din_a: dinA,
  })
  return res?.[0]?.id ?? null
}

export async function dbDeleteCustomer(id: number): Promise<void> {
  await sbFetch(`customers?id=eq.${id}`, 'DELETE')
}
