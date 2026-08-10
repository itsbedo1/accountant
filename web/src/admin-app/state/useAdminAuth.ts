import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { sbClient } from '../../shared/supabaseClient'

export type AdminAuthStatus = 'checking' | 'loggedOut' | 'notOwner' | 'ready'

// منقولة من checkOwnerAndEnter()/showLogin()/sb.auth.onAuthStateChange
// (admin.html:265-284) — لوحة الإدارة لمالك النظام بس (is_owner بـ app_metadata)
export function useAdminAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AdminAuthStatus>('checking')

  useEffect(() => {
    const { data: sub } = sbClient.auth.onAuthStateChange((_event, s) => {
      if (s) {
        if (s.user.app_metadata?.is_owner !== true) {
          setStatus('notOwner')
          void sbClient.auth.signOut()
          return
        }
        setSession(s)
        setStatus('ready')
      } else {
        setSession(null)
        setStatus('loggedOut')
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function doLogin(email: string, password: string): Promise<string | null> {
    if (!email || !password) return 'أدخل الإيميل وكلمة المرور'
    const { error } = await sbClient.auth.signInWithPassword({ email, password })
    if (error) return '❌ بيانات الدخول غير صحيحة'
    return null
  }

  async function doLogout() {
    await sbClient.auth.signOut()
  }

  return { session, status, doLogin, doLogout }
}
