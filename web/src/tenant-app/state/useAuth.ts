import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { sbClient } from '../../shared/supabaseClient'
import { useDataStore } from './useDataStore'

export type AuthStatus = 'checking' | 'loggedOut' | 'ready'

// يعادل sbClient.auth.onAuthStateChange(...) + enterApp()/showLogin() بالكود
// القديم (كانتا مربوطتين مباشرة بالـ listener بالسطر 5061)
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>('checking')

  useEffect(() => {
    const { data: sub } = sbClient.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s) {
        setStatus('ready')
        void useDataStore.getState().loadForUser(s)
      } else {
        useDataStore.getState().reset()
        setStatus('loggedOut')
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function doLogin(email: string, password: string): Promise<string | null> {
    if (!email || !password) return 'أدخل الإيميل وكلمة المرور'
    const { error } = await sbClient.auth.signInWithPassword({ email, password })
    if (error) return 'خطأ: بيانات الدخول غير صحيحة'
    return null
  }

  async function doLogout() {
    await sbClient.auth.signOut()
  }

  return { session, status, doLogin, doLogout }
}
