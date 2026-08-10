import { sbClient } from '../../shared/supabaseClient'
import { sbFetch, dbLogAudit } from '../../shared/sbFetch'
import { dbSaveSettings } from './settings'
import type { Settings, SayarfaMove } from '../../shared/types'

export interface SayarfaDraft {
  type: SayarfaMove['type']
  mabD: number
  mabDin: number
  rate: number
  notes: string
  tarikh: string
  time: string
  balDAfter: number
  balDinAfter: number
}

// منقولة حرفياً من index.html (dbSaveSayarfa، كانت بالسطر 4764) — تحفظ
// إعدادات القاصة (rasid) وتسجّل بسجل التدقيق ضمنها، وكلها ملفوفة بـ
// try/catch واحد يبتلع الخطأ (fire-and-forget من ناحية المتصل، نفس الأصل)
export async function dbSaveSayarfa(r: SayarfaDraft, settings: Settings, initBalD: number, initBalDin: number): Promise<void> {
  try {
    const row = {
      type: r.type,
      mab_d: r.mabD,
      mab_din: r.mabDin,
      rate: r.rate,
      notes: r.notes,
      tarikh: r.tarikh,
      time_str: r.time,
      bal_d_after: r.balDAfter,
      bal_din_after: r.balDinAfter,
    }
    const {
      data: { session },
    } = await sbClient.auth.getSession()
    const res = await sbFetch<{ id: number }[]>('sayarfa_moves', 'POST', { ...row, created_by_email: session?.user?.email || null })
    const dbId = res?.[0]?.id
    await dbSaveSettings(settings, initBalD, initBalDin)
    if (dbId) await dbLogAudit('sayarfa_moves', dbId, 'create', null, r)
  } catch (e) {
    console.error('dbSaveSayarfa:', e)
  }
}
