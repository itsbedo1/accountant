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

// تحفظ حركة الصيرفة، وتحدّث رصيد القاصة بالإعدادات، وتسجّل بسجل التدقيق.
// كانت تبتلع أي خطأ بصمت (منقولة كذلك من index.html:4764) فيظهر للمستخدم
// نجاح وهمي — صارت ترجّع true/false حتى يقدر المتصل يتراجع ويخبره بالحقيقة.
export async function dbSaveSayarfa(r: SayarfaDraft, settings: Settings, initBalD: number, initBalDin: number): Promise<boolean> {
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
    // ماكو صف رجع = الحركة ما انحفظت فعلاً، لا نكمل كأنها نجحت
    if (!dbId) {
      console.error('dbSaveSayarfa: ماكو صف رجع من الإدراج')
      return false
    }
    await dbSaveSettings(settings, initBalD, initBalDin)
    await dbLogAudit('sayarfa_moves', dbId, 'create', null, r)
    return true
  } catch (e) {
    console.error('dbSaveSayarfa:', e)
    return false
  }
}
