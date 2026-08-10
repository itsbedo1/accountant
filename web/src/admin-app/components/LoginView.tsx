import { useState } from 'react'
import type { useAdminAuth } from '../state/useAdminAuth'

// منقولة من loginView (admin.html:114) — doLogin() (كانت بالسطر 245)
export default function LoginView({ doLogin, notOwnerError }: { doLogin: ReturnType<typeof useAdminAuth>['doLogin']; notOwnerError: boolean }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setErr('')
    setBusy(true)
    const error = await doLogin(email.trim(), password)
    setBusy(false)
    if (error) setErr(error)
  }

  return (
    <div id="loginView">
      <div className="login-card">
        <div className="login-logo">لوحة إدارة الشركات</div>
        <div className="login-sub">دخول مالك النظام فقط</div>
        <div className="login-lbl">البريد الإلكتروني</div>
        <input type="email" className="login-input" autoComplete="username" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="login-lbl">كلمة المرور</div>
        <input
          type="password"
          className="login-input"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit()
          }}
        />
        <button className="login-btn" disabled={busy} onClick={() => void submit()}>
          {busy ? '⏳ جاري الدخول...' : 'دخول'}
        </button>
        <div className="login-err">{err || (notOwnerError ? '❌ هذا الحساب ما عنده صلاحية دخول لوحة الإدارة' : '')}</div>
      </div>
    </div>
  )
}
