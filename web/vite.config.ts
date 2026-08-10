import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'node:path'

const dirname = import.meta.dirname

// NOTE base path: repo's manifest.json/sw.js reference a stale "/almonner2/" path
// left over from a renamed repo (icons referenced there don't even exist in the
// repo). Actual production URL needs confirming before this ships — until then
// we default to root ('/') and allow override via VITE_BASE_PATH so it's a
// one-line change, not a re-architecture.
const basePath = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    // يعادل manifest.json/sw.js القديمين — نفس سلوك التحديث الصامت
    // (skipWaiting+clients.claim بدون سؤال المستخدم) ونفس منطق التخزين
    // المؤقت بـ src/sw.ts. مطبّق على تطبيق المستأجرين (index.html) بس،
    // نفس نطاق التثبيت بالأصل (admin.html/landing.html ما كانوا PWA).
    // manifest معطّل هنا عمداً (نكتبه يدوياً بـ public/manifest.webmanifest
    // ونربطه بـ index.html بس) لأن vite-plugin-pwa يحقن <link rel="manifest">
    // بكل نقاط الدخول تلقائياً بمشروع متعدد الصفحات — ماكو خيار بالإضافة
    // يقصره على ملف وحد فقط
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: false,
      manifest: false,
      injectManifest: {
        // الملفات المخزّنة مسبقاً — التطبيق الرئيسي بس (نفس نطاق manifest.json الأصلي)
        globPatterns: ['**/index.html', 'assets/app-*.{js,css}', 'assets/react-*.js', 'assets/jsx-runtime-*.js', 'icon-*.png'],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        app: resolve(dirname, 'index.html'),
        admin: resolve(dirname, 'admin.html'),
        landing: resolve(dirname, 'landing.html'),
      },
    },
  },
})
