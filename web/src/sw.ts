/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>
}

// منقولة حرفياً من sw.js القديم (نفس منطق cache-then-network-fallback
// وتجاوز supabase.co/fonts.googleapis.com بالضبط) — الفرق الوحيد: قائمة
// الملفات المخزّنة مسبقاً (precache) تُحقن تلقائياً من vite-plugin-pwa
// (self.__WB_MANIFEST) بدل قائمة يدوية ثابتة، لأن أسماء ملفات البناء
// تتغيّر (hash) بكل نشرة
const CACHE_NAME = 'accounting-app-v1'
const PRECACHE_URLS: string[] = self.__WB_MANIFEST.map((entry) => (typeof entry === 'string' ? entry : entry.url))

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {})),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.url.includes('supabase.co')) return
  if (req.url.includes('fonts.googleapis.com')) return
  e.respondWith(
    fetch(req)
      .then((res) => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then((c) => c.put(req, clone))
        return res
      })
      .catch(() => caches.match(req).then((res) => res as Response)),
  )
})
