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

## Base path

`vite.config.ts`'s `base` defaults to `/accountant/` and is overridable via
`VITE_BASE_PATH`. The legacy `manifest.json`/`sw.js` reference a stale
`/almonner2/` path that doesn't match the current repo name (`accountant`)
and even lists icon sizes that don't exist in the repo — almost certainly
leftover from a renamed project, not the real production path.

`/accountant/` is inferred, not confirmed by the account owner: there is no
`CNAME` file at the repo root, so (absent a custom domain configured only in
GitHub's dashboard, which isn't visible from the repo contents) GitHub Pages
serves this as a project site at its default URL,
`https://<owner>.github.io/accountant/`. **Double check the real URL in
Settings → Pages before cutover** — if it differs, `VITE_BASE_PATH` is a
one-line override, no re-architecture needed.

Note: `public/manifest.webmanifest` is a hand-written static file (not
generated from `vite.config.ts`'s `base`) because `vite-plugin-pwa` has no
per-entry option for a multi-page build — it injects `<link rel="manifest">`
into every HTML entry it finds, and only `index.html` (the tenant app) should
get one, matching the legacy app's PWA scope. Its `start_url`/`scope`/icon
paths are already prefixed with `/accountant/` to match the current default
above; if the base path changes, update this file by hand alongside
`VITE_BASE_PATH`. The three HTML entry points reference their icons/manifest
via Vite's `%BASE_URL%` placeholder so those stay in sync with `base`
automatically — only this file needs a manual edit.

## PWA

`index.html` (tenant app only — same scope as the legacy `manifest.json`)
registers a service worker built via `vite-plugin-pwa`'s `injectManifest`
strategy (`src/sw.ts`), ported line-for-line from the legacy `sw.js`: same
cache-then-network-with-fallback logic, same `supabase.co`/
`fonts.googleapis.com` bypass, same silent `skipWaiting`+`clients.claim`
auto-update (no "update available" prompt). The only difference is the
precached file list is generated from the actual hashed build output instead
of a hardcoded array, since asset filenames change on every build.

## Deployment

`.github/workflows/web-deploy.yml` builds, lints, typechecks, tests, and
deploys `web/dist` to GitHub Pages via `actions/deploy-pages` — triggered on
push to `master` (paths under `web/**`) or manually via `workflow_dispatch`.

**Manual step required before this can actually publish anything**: in the
repo's GitHub Settings → Pages → "Build and deployment" → Source, switch
from "Deploy from a branch" (the current setting, serving the legacy root
HTML files directly) to "GitHub Actions". Until that switch happens, this
workflow's `deploy` job will fail even though `build` succeeds — that's
expected, not a bug in the workflow.

`.github/workflows/web-ci.yml` runs the same build/lint/typecheck/test
checks (no deploy) on every PR and push to `master`, so the checks run
whether or not the Pages source has been switched yet.
