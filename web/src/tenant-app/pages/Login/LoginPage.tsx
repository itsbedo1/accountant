import { useState } from 'react'
import { useAuth } from '../../state/useAuth'

// منقولة من pageLogin بالكود القديم (index.html:921) — doLogin() بالسطر 4993
export default function LoginPage({ doLogin }: { doLogin: ReturnType<typeof useAuth>['doLogin'] }) {
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
    <div id="pageLogin" className="page active">
      <div className="login-card">
        <div className="login-logo">المنير</div>
        <div className="login-sub">تسجيل الدخول</div>
        <div className="login-lbl">البريد الإلكتروني</div>
        <input
          type="email"
          className="login-input"
          autoComplete="username"
          placeholder="you@example.com"
          aria-label="البريد الإلكتروني"
          aria-describedby="login-err"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="login-lbl">كلمة المرور</div>
        <input
          type="password"
          className="login-input"
          autoComplete="current-password"
          placeholder="••••••••"
          aria-label="كلمة المرور"
          aria-describedby="login-err"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit()
          }}
        />
        <button id="btnLogin" className="login-btn" disabled={busy} onClick={() => void submit()}>
          {busy ? 'جاري الدخول...' : 'دخول'}
        </button>
        <div id="login-err" className="login-err" role="alert">
          {err}
        </div>
      </div>
    </div>
  )
}
