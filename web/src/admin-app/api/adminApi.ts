import { sbClient } from '../../shared/supabaseClient'

export interface Company {
  name: string
  email: string
  created_at: string
  next_due_at: string
  plan: 'trial' | 'paid'
  suspended: boolean
  suspend_reason: string | null
}

interface FunctionError {
  message: string
  context?: { json?: () => Promise<{ error?: string }> }
}

// منقولة من extractErr() (admin.html:312) — رسائل خطأ edge functions أحياناً
// تجي بجسم JSON منفصل بدل error.message العام
async function extractErr(error: FunctionError): Promise<string> {
  if (error.context && typeof error.context.json === 'function') {
    try {
      const body = await error.context.json()
      if (body?.error) return body.error
    } catch {
      /* تجاهل — نستخدم error.message كحل احتياطي */
    }
  }
  return error.message
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await sbClient.functions.invoke('admin-create-tenant', { body })
  if (error) throw new Error(await extractErr(error))
  if (data?.error) throw new Error(data.error)
  return data as T
}

// منقولة من loadCompanies() (كانت بالسطر 370)
export async function listCompanies(): Promise<Company[]> {
  const data = await invoke<{ companies: Company[] }>({ action: 'list' })
  return data.companies || []
}

// منقولة من createCompany() (كانت بالسطر 320)
export async function createCompany(businessName: string, email: string, password: string, plan: 'trial' | 'paid'): Promise<{ email: string; password: string }> {
  return invoke({ business_name: businessName, email, password, plan })
}

// منقولة من markPaid() (كانت بالسطر 438)
export async function markPaid(email: string): Promise<void> {
  await invoke({ action: 'mark_paid', email })
}

// منقولة من suspendCompany() (كانت بالسطر 455)
export async function suspendCompany(email: string, reason: string): Promise<void> {
  await invoke({ action: 'toggle_suspension', email, suspended: true, reason })
}

// منقولة من resetPassword() (كانت بالسطر 475)
export async function resetPassword(email: string, password: string): Promise<{ email: string }> {
  return invoke({ action: 'reset_password', email, password })
}
