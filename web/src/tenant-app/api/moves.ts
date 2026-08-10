import { sbClient } from '../../shared/supabaseClient'
import { sbFetch } from '../../shared/sbFetch'
import { toast } from '../../shared/useToast'
import type { Move } from '../../shared/types'

export interface MoveDraft {
  noa: Move['noa']
  tarikh: string
  raqm: string
  hesab: string
  mabD: number
  mabDin: number
  jiha: string
  sak: string | null
  notes: string
  amilId: number | null
  amilName: string | null
  /** موجودة فقط لو هذا تعديل على سجل حالي — نفس دور r.dbId بالكود القديم */
  dbId?: number
}

// منقولة حرفياً من index.html (dbSaveMove، كانت بالسطر 4729) — ترجع true/false
// بدل throw حتى يقدر المتصل يسوي rollback محلي بدون try/catch إضافي
export async function dbSaveMove(r: MoveDraft): Promise<number | false> {
  try {
    const row = {
      noa: r.noa,
      tarikh: r.tarikh,
      raqm: r.raqm,
      hesab: r.hesab,
      mab_d: r.mabD,
      mab_din: r.mabDin,
      jiha: r.jiha,
      sak: r.sak,
      notes: r.notes,
      amil_id: r.amilId || null,
      amil_name: r.amilName || null,
    }
    if (r.dbId) {
      await sbFetch(`moves?id=eq.${r.dbId}`, 'PATCH', row)
      return r.dbId
    } else {
      // نسجّل مين أضاف الحركة وقت الإنشاء بس — التعديل (PATCH فوق) ما يغيّرها،
      // حتى يضل واضح منو الأصل سجّلها حتى لو عدّلها المالك بعدين
      const {
        data: { session },
      } = await sbClient.auth.getSession()
      const res = await sbFetch<{ id: number }[]>('moves', 'POST', {
        ...row,
        created_by_email: session?.user?.email || null,
      })
      return res?.[0]?.id ?? false
    }
  } catch (e) {
    console.error('dbSaveMove:', e)
    toast('❌ فشل الحفظ بقاعدة البيانات: ' + (e as Error).message)
    return false
  }
}

// منقولة حرفياً من index.html (dbDeleteMove، كانت بالسطر 4751) — ترجع true فقط
// لو انحذف صف حقيقي فعلاً (Supabase يرجع نجاح فاضي بصمت لو ماكو صف طابق الفلتر)
export async function dbDeleteMove(rowId: number): Promise<boolean> {
  try {
    const deleted = await sbFetch<unknown[]>(`moves?id=eq.${rowId}`, 'DELETE')
    if (!deleted || !deleted.length) {
      console.error('dbDeleteMove: DELETE matched 0 rows for id', rowId)
      return false
    }
    return true
  } catch (e) {
    console.error('dbDeleteMove:', e)
    toast('⚠️ خطأ بالحذف: ' + (e as Error).message)
    return false
  }
}
