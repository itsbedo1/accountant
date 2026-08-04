// manage-employees
// يستدعيها صاحب الشركة (owner) من صفحة الإعدادات لإضافة أو حذف حساب موظف
// (دخول بس، بدون صلاحية تعديل/حذف). يستخدم service_role هنا فقط (بيئة
// السيرفر) — أبداً ما يوصل هذا المفتاح للمتصفح.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'مطلوب تسجيل دخول' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // ١) تحقق هوية الطالب
    const token = authHeader.replace('Bearer ', '')
    const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(token)
    if (callerErr || !callerData?.user) {
      return jsonResponse({ error: 'جلسة غير صالحة' }, 401)
    }
    const callerId = callerData.user.id

    // ٢) تحقق إن الطالب مو موظف (الموظف ما يقدر يدير موظفين ثانيين)
    const { data: callerMember } = await supabaseAdmin
      .from('company_members')
      .select('role')
      .eq('user_id', callerId)
      .maybeSingle()
    if (callerMember?.role === 'employee') {
      return jsonResponse({ error: 'ما عندك صلاحية لهذا الإجراء' }, 403)
    }
    // شركة المالك = uid حسابه نفسه (نفس نمط باقي الجداول بالنظام)
    const companyId = callerId

    const body = await req.json().catch(() => ({}))
    const action = String(body.action || 'create')

    // ── إضافة موظف جديد ──
    if (action === 'create') {
      const email = String(body.email || '').trim().toLowerCase()
      if (!email) return jsonResponse({ error: 'أدخل الإيميل' }, 400)
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      if (!emailOk) return jsonResponse({ error: 'صيغة الإيميل غير صحيحة' }, 400)

      const password = generatePassword()
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { is_owner: false },
      })
      if (createErr) {
        return jsonResponse({ error: 'فشل إنشاء حساب الموظف: ' + createErr.message }, 400)
      }

      const { error: memberErr } = await supabaseAdmin.from('company_members').insert({
        company_id: companyId,
        user_id: newUser.user.id,
        role: 'employee',
        email,
      })
      if (memberErr) {
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
        return jsonResponse({ error: 'فشل ربط الموظف بالشركة: ' + memberErr.message }, 500)
      }

      return jsonResponse({ email, password, user_id: newUser.user.id })
    }

    // ── حذف موظف ──
    if (action === 'remove') {
      const userId = String(body.user_id || '')
      if (!userId) return jsonResponse({ error: 'حدد الموظف المطلوب حذفه' }, 400)

      const { data: target } = await supabaseAdmin
        .from('company_members')
        .select('company_id, role')
        .eq('user_id', userId)
        .maybeSingle()
      if (!target || target.company_id !== companyId || target.role !== 'employee') {
        return jsonResponse({ error: 'ما لقيت هذا الموظف بشركتك' }, 404)
      }

      // حذف حساب الدخول نفسه يحذف صف company_members تلقائياً (on delete cascade)
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (delErr) {
        return jsonResponse({ error: 'فشل حذف الموظف: ' + delErr.message }, 500)
      }
      return jsonResponse({ ok: true })
    }

    return jsonResponse({ error: 'إجراء غير معروف' }, 400)
  } catch (e) {
    return jsonResponse({ error: 'خطأ غير متوقع: ' + (e as Error).message }, 500)
  }
})
