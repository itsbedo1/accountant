// telegram-webhook
// يستقبل تحديثات بوت تليجرام. تليجرام يرسل ?company=<company_id> بالرابط حتى نعرف
// أي شركة (بوت) هذا التحديث يخصها. يربط chat_id بالعميل المطابق لرقمه المرسل بـ /start.
// لا يحتاج تسجيل دخول (Telegram نفسه يستدعيه) — يُنشر بخيار --no-verify-jwt.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url)
    const companyId = url.searchParams.get('company')
    if (!companyId) {
      return jsonResponse({ ok: true })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const update = await req.json().catch(() => ({}))
    const message = update.message
    if (!message || !message.chat || typeof message.text !== 'string') {
      return jsonResponse({ ok: true })
    }

    const chatId = message.chat.id
    const text = message.text.trim()
    const match = text.match(/^\/start\s+(\d+)/)
    if (!match) {
      return jsonResponse({ ok: true })
    }
    const customerId = parseInt(match[1], 10)

    // اجلب توكن بوت هذي الشركة للرد على العميل
    const { data: settingsRows } = await supabaseAdmin
      .from('settings')
      .select('telegram_bot_token, comp_name')
      .eq('company_id', companyId)
      .limit(1)
    const settings = settingsRows?.[0]
    if (!settings?.telegram_bot_token) {
      return jsonResponse({ ok: true })
    }

    // اربط العميل بمعرف الدردشة — بشرط يكون العميل فعلاً تابع لنفس الشركة
    const { data: updated, error: updErr } = await supabaseAdmin
      .from('customers')
      .update({ telegram_chat_id: chatId })
      .eq('id', customerId)
      .eq('company_id', companyId)
      .select('name')

    const replyText =
      !updErr && updated && updated.length > 0
        ? `تم الربط بنجاح ✅\nراح توصلك إشعارات ${settings.comp_name || ''} على كل حركة بحسابك.`
        : 'ما لقينا حسابك — تأكد من الرابط اللي أرسله لك المحاسب.'

    await fetch(`https://api.telegram.org/bot${settings.telegram_bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: replyText }),
    })

    return jsonResponse({ ok: true })
  } catch (e) {
    console.error(e)
    return jsonResponse({ ok: true })
  }
})
