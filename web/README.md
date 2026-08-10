# web/ — React rewrite (in progress)

Rewrite of the legacy static `index.html` / `admin.html` / `landing.html` into a
single Vite + React + TypeScript project with three build entries, replacing
the old zero-build static HTML/JS app one phase at a time. The legacy files at
the repo root are untouched and still what's actually deployed until cutover.

## Structure

- `index.html`, `admin.html`, `landing.html` — Vite entry points (same
  filenames as the legacy root files, so the built output can drop into the
  same served paths at cutover).
- `src/tenant-app/` — main app (was `index.html`'s inline script).
- `src/admin-app/` — company/tenant admin panel (was `admin.html`).
- `src/landing/` — marketing page (was `landing.html`, pure static markup —
  the legacy file has no JS to port).
- `src/shared/` — Supabase client, data-fetch helpers, design tokens, types
  used by more than one of the three apps above.

## Running locally

```sh
cp .env.example .env.local   # already points at the real (shared) Supabase project
npm install
npm run dev
```

## Scripts

- `npm run dev` — Vite dev server (all three entries).
- `npm run build` — typecheck + production build (`dist/index.html`,
  `dist/admin.html`, `dist/landing.html`).
- `npm run typecheck` — `tsc -b` only.
- `npm run lint` — oxlint.
- `npm run test` — vitest (unit tests for the money-math layer live under
  `src/tenant-app/domain/*.test.ts`).

## Open item: base path

`vite.config.ts`'s `base` defaults to `/` and is overridable via
`VITE_BASE_PATH`. The legacy `manifest.json`/`sw.js` reference a stale
`/almonner2/` path that doesn't match the current repo name (`accountant`)
and even lists icon sizes that don't exist in the repo — almost certainly
leftover from a renamed project, not the real production path. **Confirm the
actual production URL before Phase 9 (deployment pipeline) ships**, since it
determines `base`, the PWA `scope`/`start_url`, and the service worker's
precache list.

Note: `public/manifest.webmanifest` is a hand-written static file (not
generated from `vite.config.ts`'s `base`) because `vite-plugin-pwa` has no
per-entry option for a multi-page build — it injects `<link rel="manifest">`
into every HTML entry it finds, and only `index.html` (the tenant app) should
get one, matching the legacy app's PWA scope. If the base path ever changes
from `/`, update `public/manifest.webmanifest`'s `start_url`/`scope` and the
icon paths by hand alongside `VITE_BASE_PATH`.

## PWA

`index.html` (tenant app only — same scope as the legacy `manifest.json`)
registers a service worker built via `vite-plugin-pwa`'s `injectManifest`
strategy (`src/sw.ts`), ported line-for-line from the legacy `sw.js`: same
cache-then-network-with-fallback logic, same `supabase.co`/
`fonts.googleapis.com` bypass, same silent `skipWaiting`+`clients.claim`
auto-update (no "update available" prompt). The only difference is the
precached file list is generated from the actual hashed build output instead
of a hardcoded array, since asset filenames change on every build.
