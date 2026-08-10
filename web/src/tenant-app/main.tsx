import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../shared/tokens.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// تسجيل يدوي (injectRegister: false بـ vite.config.ts) — نفس سلوك sw.js
// القديم بالضبط (يسجّل فوراً، تحديث صامت بدون سؤال المستخدم). التطبيق
// الرئيسي بس، مو admin/landing — نفس نطاق manifest.json الأصلي
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.error('SW registration failed:', e))
  })
}
