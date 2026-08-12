import { useEffect, useState } from 'react'
import { sbClient } from '../../../shared/supabaseClient'
import { sbFetch } from '../../../shared/sbFetch'
import { toast } from '../../../shared/useToast'

interface Member {
  user_id: string
  email: string | null
}

function extractErrorMessage(error: { message: string; context?: { json?: () => Promise<{ error?: string }> } }): Promise<string> {
  if (error.context && typeof error.context.json === 'function') {
    return error.context
      .json()
      .then((body) => body?.error || error.message)
      .catch(() => error.message)
  }
  return Promise.resolve(error.message)
}

// الموظفين — حساب دخول بس، إضافة حركات بدون تعديل/حذف (RLS يفرضها فعلياً)
// منقولة من emLoad/emCreate/emRemove (index.html:4141-4212)
export default function EmployeeManager() {
  const [members, setMembers] = useState<Member[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [result, setResult] = useState<{ email: string; password: string } | null>(null)

  async function emLoad() {
    setLoadError(false)
    try {
      const rows = await sbFetch<Member[]>('company_members?role=eq.employee&order=created_at.asc')
      setMembers(rows || [])
    } catch (e) {
      console.error('emLoad:', e)
      setLoadError(true)
    }
  }

  useEffect(() => {
    void emLoad()
  }, [])

  async function emCreate() {
    const email = newEmail.trim()
    if (!email) {
      toast('⚠️ أدخل إيميل الموظف')
      return
    }
    try {
      const { data, error } = await sbClient.functions.invoke('manage-employees', { body: { action: 'create', email } })
      if (error) throw new Error(await extractErrorMessage(error))
      if (data?.error) throw new Error(data.error)
      setResult({ email: data.email, password: data.password })
      setNewEmail('')
      toast('✅ تم إنشاء حساب الموظف')
      void emLoad()
    } catch (e) {
      toast('❌ ' + (e as Error).message)
    }
  }

  async function emRemove(userId: string) {
    if (!confirm('تأكيد حذف حساب هذا الموظف؟ ما يقدر يسجل دخول بعدها.')) return
    try {
      const { data, error } = await sbClient.functions.invoke('manage-employees', { body: { action: 'remove', user_id: userId } })
      if (error) throw new Error(await extractErrorMessage(error))
      if (data?.error) throw new Error(data.error)
      toast('🗑 تم حذف الموظف')
      void emLoad()
    } catch (e) {
      toast('❌ ' + (e as Error).message)
    }
  }

  return (
    <div style={{ background: 'rgba(96,160,255,0.06)', border: '1px solid rgba(96,160,255,0.25)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
      <div style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 900, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>👥 الموظفين</div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 10, textAlign: 'right' }}>
        حساب الموظف يقدر يضيف حركات صندوق وصيرفة جديدة بس — ما يقدر يعدّل أو يحذف حركة موجودة، ولا يفتح الإعدادات أو الخلاصة.
      </div>

      <div style={{ marginBottom: 10 }}>
        {loadError && <div style={{ textAlign: 'center', color: 'var(--red)', padding: 8, fontSize: 12 }}>❌ فشل تحميل قائمة الموظفين</div>}
        {!loadError && members && !members.length && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 8, fontSize: 12 }}>لا يوجد موظفين بعد</div>}
        {members?.map((m) => (
          <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', marginBottom: 4, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7 }}>
            <button
              onClick={() => void emRemove(m.user_id)}
              style={{ background: 'rgba(200,50,50,0.3)', border: '1px solid #cc4444', borderRadius: 5, color: '#ffaaaa', fontSize: 11, fontWeight: 700, padding: '3px 8px', cursor: 'pointer', fontFamily: "'Cairo',sans-serif" }}
            >
              حذف
            </button>
            <div style={{ flex: 1, textAlign: 'right', marginRight: 8, color: 'white', fontSize: 13, fontWeight: 700, direction: 'ltr' }}>{m.email || '—'}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="email"
          placeholder="إيميل الموظف الجديد"
          aria-label="إيميل الموظف الجديد"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          style={{ flex: 1, background: '#071e38', border: '1.5px solid var(--border2)', borderRadius: 7, padding: '9px 12px', fontFamily: "'Cairo',sans-serif", fontSize: 13, color: 'var(--text)', direction: 'ltr', textAlign: 'right' }}
        />
        <button
          onClick={() => void emCreate()}
          style={{ padding: '9px 16px', borderRadius: 7, fontFamily: "'Cairo',sans-serif", fontSize: 13, fontWeight: 900, background: 'rgba(96,160,255,.2)', border: '1.5px solid rgba(96,160,255,.5)', color: 'var(--accent)', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          ➕ إضافة
        </button>
      </div>

      {result && (
        <div style={{ background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.35)', borderRadius: 8, padding: 10, marginTop: 10, fontSize: 12 }}>
          <div style={{ color: 'var(--text-dim)', marginBottom: 4 }}>أعطِ الموظف بيانات الدخول هذي (تظهر مرة واحدة بس):</div>
          <div>
            الإيميل: <b style={{ direction: 'ltr' }}>{result.email}</b>
          </div>
          <div>
            كلمة المرور: <b style={{ direction: 'ltr' }}>{result.password}</b>
          </div>
        </div>
      )}
    </div>
  )
}
