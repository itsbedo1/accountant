import { sbFetch, myId } from '../../shared/sbFetch'
import type { Settings } from '../../shared/types'

// منقولة حرفياً من index.html (dbSaveSettings، كانت بالسطر 4812) — تُستدعى
// بعد أي حركة تغيّر رصيد القاصة (init_bal_*_current) أو بعد تعديل الإعدادات نفسها
export async function dbSaveSettings(settings: Settings, initBalD: number, initBalDin: number): Promise<void> {
  try {
    await sbFetch(`settings?company_id=eq.${await myId()}`, 'PATCH', {
      comp_name: settings.compName,
      start_date: settings.startDate,
      default_rate: settings.defaultRate,
      init_bal_d: settings.initBalD,
      init_bal_din: settings.initBalDin,
      init_bal_d_current: initBalD,
      init_bal_din_current: initBalDin,
      telegram_bot_token: settings.tgBotToken || null,
      telegram_bot_username: settings.tgBotUser || null,
    })
  } catch (e) {
    console.error('dbSaveSettings:', e)
  }
}
