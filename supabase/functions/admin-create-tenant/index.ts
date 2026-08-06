// admin-create-tenant
// ينشئ حساب دخول لشركة جديدة — يستدعيها بس صاحب النظام (is_owner) من صفحة الإدارة بالموقع.
// يستخدم مفتاح service_role هنا فقط (بيئة السيرفر) — أبداً ما يوصل هذا المفتاح للمتصفح.

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

    // عميل بصلاحية كاملة (service_role) — يستخدم فقط داخل هذي الدالة الخادمة
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // ١) تحقق هوية الطالب من التوكن المرسل
    const token = authHeader.replace('Bearer ', '')
    const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(token)
    if (callerErr || !callerData?.user) {
      return jsonResponse({ error: 'جلسة غير صالحة' }, 401)
    }

    // ٢) تحقق إن الطالب فعلاً "المالك" — الفحص الحقيقي، مو شكلي بالواجهة بس
    if (callerData.user.app_metadata?.is_owner !== true) {
      return jsonResponse({ error: 'ما عندك صلاحية لهذا الإجراء' }, 403)
    }

    // ٣) تحقق المدخلات
    const body = await req.json().catch(() => ({}))
    const action = String(body.action || 'create')

    // ── قائمة كل الشركات المشتركة (لوحة الإدارة) — ما تحتاج إيميل ──
    if (action === 'list') {
      const { data: settingsRows, error: settingsListErr } = await supabaseAdmin
        .from('settings')
        .select('company_id, comp_name, suspended, suspend_reason, default_rate')
        .order('comp_name', { ascending: true })
      if (settingsListErr) {
        return jsonResponse({ error: 'خطأ بجلب الشركات: ' + settingsListErr.message }, 500)
      }

      const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })
      if (listErr) {
        return jsonResponse({ error: 'خطأ بجلب الحسابات: ' + listErr.message }, 500)
      }
      const emailById = new Map(listData.users.map((u) => [u.id, u.email || '']))

      const companies = (settingsRows || []).map((s) => ({
        company_id: s.company_id,
        name: s.comp_name,
        email: emailById.get(s.company_id) || '',
        suspended: s.suspended,
        suspend_reason: s.suspend_reason,
        rate: s.default_rate,
      }))
      return jsonResponse({ companies })
    }

    const email = String(body.email || '').trim().toLowerCase()

    if (!email) {
      return jsonResponse({ error: 'أدخل الإيميل' }, 400)
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!emailOk) {
      return jsonResponse({ error: 'صيغة الإيميل غير صحيحة' }, 400)
    }

    // ── إعادة تعيين كلمة مرور لشركة موجودة ──
    if (action === 'reset_password') {
      const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers()
      if (listErr) {
        return jsonResponse({ error: 'خطأ بجلب الحسابات: ' + listErr.message }, 500)
      }
      const target = listData.users.find((u) => u.email?.toLowerCase() === email)
      if (!target) {
        return jsonResponse({ error: 'ما لقيت حساب بهذا الإيميل' }, 404)
      }
      const newPassword = generatePassword()
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(target.id, {
        password: newPassword,
      })
      if (updErr) {
        return jsonResponse({ error: 'فشل تغيير كلمة المرور: ' + updErr.message }, 500)
      }
      return jsonResponse({ email, password: newPassword })
    }

    // ── تعليق أو تفعيل اشتراك شركة ──
    if (action === 'toggle_suspension') {
      const suspended = Boolean(body.suspended)
      // السبب يُحفظ بس وقت التعليق — التفعيل يمسحه حتى ما يبقى سبب قديم معلّق بدون داعي
      const reason = suspended ? String(body.reason || '').trim() : null

      const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers()
      if (listErr) {
        return jsonResponse({ error: 'خطأ بجلب الحسابات: ' + listErr.message }, 500)
      }
      const target = listData.users.find((u) => u.email?.toLowerCase() === email)
      if (!target) {
        return jsonResponse({ error: 'ما لقيت حساب بهذا الإيميل' }, 404)
      }

      // لو الحساب موظف نرجع لشركة صاحب العمل نفسها، مو حساب الموظف
      const { data: member } = await supabaseAdmin
        .from('company_members')
        .select('company_id')
        .eq('user_id', target.id)
        .maybeSingle()
      const companyId = member?.company_id || target.id

      const { error: updErr } = await supabaseAdmin
        .from('settings')
        .update({ suspended, suspend_reason: reason })
        .eq('company_id', companyId)
      if (updErr) {
        return jsonResponse({ error: 'فشل تحديث حالة الاشتراك: ' + updErr.message }, 500)
      }
      return jsonResponse({ ok: true, email, suspended, reason })
    }

    // ── إنشاء شركة جديدة (الافتراضي) ──
    const businessName = String(body.business_name || '').trim()
    if (!businessName) {
      return jsonResponse({ error: 'أدخل اسم الشركة' }, 400)
    }

    // ٤) أنشئ المستخدم الجديد
    const password = generatePassword()
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { is_owner: false },
    })
    if (createErr) {
      return jsonResponse({ error: 'فشل إنشاء الحساب: ' + createErr.message }, 400)
    }

    // ٥) أنشئ صف إعدادات ابتدائي للشركة الجديدة
    //    (service_role يتجاوز RLS، فلازم نحدد company_id يدوياً)
    const { error: settingsErr } = await supabaseAdmin.from('settings').insert({
      company_id: newUser.user.id,
      comp_name: businessName,
      default_rate: 1480,
      init_bal_d: 0,
      init_bal_din: 0,
      init_bal_d_current: 0,
      init_bal_din_current: 0,
    })
    if (settingsErr) {
      // نظّف الحساب اللي انشأ حتى ما يضل معلّق بدون بيانات
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return jsonResponse({ error: 'فشل إعداد بيانات الشركة: ' + settingsErr.message }, 500)
    }

    return jsonResponse({ email, password, company_id: newUser.user.id })
  } catch (e) {
    return jsonResponse({ error: 'خطأ غير متوقع: ' + (e as Error).message }, 500)
  }
})
