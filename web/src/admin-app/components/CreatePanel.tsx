import { useState } from 'react'
import { createCompany } from '../api/adminApi'
import type { useConfirmModal } from './ConfirmModal'

// نموذج إنشاء شركة جديدة (قابل للطي) — منقولة من #createPanel (admin.html:146)
// و createCompany()/selectPlan/togglePwVisibility/updatePwHint (كانت بالسطر 287-354)
export default function CreatePanel({ open, onDone, confirmModal }: { open: boolean; onDone: () => void; confirmModal: ReturnType<typeof useConfirmModal>['confirmModal'] }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [plan, setPlan] = useState<'trial' | 'paid'>('trial')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const pwLen = password.length
  const pwHint = pwLen === 0 ? 'لسا ما كتبت كلمة مرور' : pwLen < 6 ? `${pwLen}/6 أحرف — لسا ناقص` : `✓ ${pwLen} أحرف — تمام`
  const pwOk = pwLen >= 6

  async function submit() {
    setErr('')
    const n = name.trim()
    const e = email.trim()
    if (!n || !e || !password) {
      setErr('عبّي كل الحقول')
      return
    }
    if (password.length < 6) {
      setErr('كلمة المرور لازم 6 أحرف على الأقل')
      return
    }
    setBusy(true)
    try {
      const data = await createCompany(n, e, password, plan)
      await confirmModal({
        title: `✅ تم إنشاء حساب "${n}"`,
        msg: `الإيميل: ${data.email}\nكلمة المرور: ${data.password}\n\nخذ نسخة من كلمة المرور هذي — ما راح تظهر مرة ثانية.`,
        okLabel: 'تمام',
      })
      setName('')
      setEmail('')
      setPassword('')
      onDone()
    } catch (e) {
      setErr('❌ ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div id="createPanel">
      <div className="f-lbl">اسم الشركة</div>
      <input type="text" className="f-input" placeholder="مثال: صيرفة الأمانة" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="f-lbl">الإيميل</div>
      <input type="email" className="f-input ltr" placeholder="owner@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      <div className="f-lbl">كلمة المرور (تختارها أنت — 6 أحرف على الأقل)</div>
      <div className="pw-row">
        <input type={showPw ? 'text' : 'password'} className="f-input ltr" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)}>
          {showPw ? '🙈' : '👁️'}
        </button>
      </div>
      <div className={`pw-hint ${pwOk ? 'ok' : 'bad'}`}>{pwHint}</div>
      <div className="f-lbl">نوع الاشتراك</div>
      <div className="plan-row">
        <div className={`plan-opt${plan === 'trial' ? ' sel' : ''}`} onClick={() => setPlan('trial')}>
          🟡 تجريبي (7 أيام مجاناً)
        </div>
        <div className={`plan-opt${plan === 'paid' ? ' sel' : ''}`} onClick={() => setPlan('paid')}>
          💳 مدفوع (3 أشهر)
        </div>
      </div>
      <button className="f-btn" disabled={busy} onClick={() => void submit()}>
        {busy ? '⏳ جاري الإنشاء...' : '➕ إنشاء الحساب'}
      </button>
      <div className="f-err">{err}</div>
    </div>
  )
}

// إعادة تصدير toast للحفاظ على استخدام واحد فقط بهذا الملف عند الحاجة لاحقاً