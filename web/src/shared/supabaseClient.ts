import { createClient } from '@supabase/supabase-js'

export const SB_URL = import.meta.env.VITE_SUPABASE_URL as string
export const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!SB_URL || !SB_KEY) {
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing — copy .env.example to .env.local')
}

// يدير تسجيل الدخول والجلسة تلقائياً — نفس عميل index.html/admin.html القديم
export const sbClient = createClient(SB_URL, SB_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
})
