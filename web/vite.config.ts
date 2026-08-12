import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'

const dirname = import.meta.dirname

// NOTE base path: repo's manifest.json/sw.js reference a stale "/almonner2/" path
// left over from a renamed repo (icons referenced there don't even exist in the
// repo). No CNAME file exists in the repo root, so GitHub Pages serves this
// project at its default project-site URL (https://<owner>.github.io/<repo>/) —
// i.e. "/accountant/" for this repo. That's a well-grounded inference, not a
// certainty confirmed by the account owner; VITE_BASE_PATH stays available as a
// one-line override if the real path turns out to differ (e.g. "/" on Vercel,
// which serves the project from the domain root instead of a repo subpath).
const basePath = process.env.VITE_BASE_PATH || '/accountant/'

// manifest.webmanifest بيه مسارات مطلقة (start_url/scope/icons) لازم تتبع
// نفس الـ base — مو ملف static عادي بـ public/ لأنه يختلف باختلاف منصة
// النشر (GitHub Pages بمسار فرعي مقابل Vercel بالجذر)
function manifestPlugin(base: string): Plugin {
  function render() {
    const raw = readFileSync(resolve(dirname, 'manifest.template.webmanifest'), 'utf-8')
    return raw.replaceAll('__BASE__', base)
  }
  return {
    name: 'manifest-webmanifest',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: render() })
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === `${base}manifest.webmanifest`) {
          res.setHeader('Content-Type', 'application/manifest+json')
          res.end(render())
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    manifestPlugin(basePath),
    // يعادل manifest.json/sw.js القديمين — نفس سلوك التحديث الصامت
    // (skipWaiting+clients.claim بدون سؤال المستخدم) ونفس منطق التخزين
    // المؤقت بـ src/sw.ts. مطبّق على تطبيق المستأجرين (index.html) بس،
    // نفس نطاق التثبيت بالأصل (admin.html/landing.html ما كانوا PWA).
    // manifest معطّل هنا عمداً (نولّده بـ manifestPlugin فوق ونربطه بـ
    // index.html بس) لأن vite-plugin-pwa يحقن <link rel="manifest"> بكل
    // نقاط الدخول تلقائياً بمشروع متعدد الصفحات — ماكو خيار بالإضافة
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
