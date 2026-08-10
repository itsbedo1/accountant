import { SB_URL, SB_KEY, sbClient } from './supabaseClient'

// يرسل توكن المستخدم المسجّل دخوله (إذا موجود) بدل مفتاح anon الثابت
// حتى تطبّق قواعد العزل بين الشركات (RLS) على مستوى قاعدة البيانات
// — منقولة حرفياً من index.html (sbFetch, كانت بالسطر 4545)
export async function sbFetch<T = unknown>(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body: unknown = null,
): Promise<T | null> {
  const {
    data: { session },
  } = await sbClient.auth.getSession()
  const headers: Record<string, string> = {
    apikey: SB_KEY,
    Authorization: `Bearer ${session?.access_token || SB_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }
  const opts: RequestInit = { method, headers }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(SB_URL + '/rest/v1/' + path, opts)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Supabase ${method} ${path}: ${res.status} — ${err}`)
  }
  if (res.status === 204) return null
  return res.json() as Promise<T>
}

// يجيب كل صفوف جدول مهما كان عددها — يجلبها على دفعات (صفحات) بدل طلب وحد
// حتى لا يفقد سجلات بصمت إذا تجاوز الجدول الحد الأقصى الافتراضي لصف واحد بقاعدة البيانات
// — منقولة حرفياً من index.html (sbFetchAll, كانت بالسطر 4566)
export async function sbFetchAll<T = unknown>(path: string): Promise<T[]> {
  const PAGE = 1000
  let offset = 0
  let all: T[] = []
  while (true) {
    const sep = path.includes('?') ? '&' : '?'
    const page = await sbFetch<T[]>(`${path}${sep}limit=${PAGE}&offset=${offset}`)
    if (!page || !page.length) break
    all = all.concat(page)
    // نتقدم بعدد الصفوف اللي رجعت فعلياً (مو بعدد PAGE المطلوب) — يحافظ على صحة
    // الجلب حتى لو الخادم يفرض حد أقصى أوطى من PAGE بكل طلب
    offset += page.length
  }
  return all
}

// UUID المستخدم المسجّل دخوله حالياً — لازم نمرره صراحة كفلتر بأوامر
// تعديل/حذف settings لأن PostgREST يرفض UPDATE بدون شرط WHERE
export async function myId(): Promise<string | undefined> {
  const {
    data: { session },
  } = await sbClient.auth.getSession()
  return session?.user?.id
}

// يسجّل تعديل أو حذف على حركة موجودة بسجل تدقيق (audit_log) — لا يوقف
// العملية الأساسية لو فشل التسجيل، فقط يسجّل الخطأ بالـ console
export async function dbLogAudit(
  tableName: string,
  recordId: number | string,
  action: string,
  oldData: unknown,
  newData: unknown,
): Promise<void> {
  try {
    const {
      data: { session },
    } = await sbClient.auth.getSession()
    await sbFetch('audit_log', 'POST', {
      table_name: tableName,
      record_id: recordId,
      action,
      old_data: oldData ?? null,
      new_data: newData ?? null,
      changed_by_email: session?.user?.email ?? null,
    })
  } catch (e) {
    console.error('dbLogAudit:', e)
  }
}
