# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Runtime and toolchain

- Cloudflare Worker entrypoint: `src/index.ts`
- Frontend: React 19 + Vite 7, source rooted at `frontend/`
- Styling: Tailwind CSS 4 via `@tailwindcss/vite`
- Database: Cloudflare D1 with SQL migrations in `migrations/`
- Package manager: npm (`package-lock.json` is checked in)

## Common commands

- `npm install` — install dependencies
- `npm run dev` — start the local Wrangler dev server
- `npm run build` — build the Vite client and type-check the worker code
- `npm run build:client` — build the frontend into `dist/client`
- `npm run build:worker` — TypeScript check for the worker (`tsc --noEmit`)
- `npm run check` — alias for worker type-checking
- `npm run db:migrate:local` — apply D1 migrations to the local database
- `npm run db:migrate:remote` — apply D1 migrations to the remote database
- `npm run deploy` — build and deploy with Wrangler

## Testing

- There is no automated test suite configured right now.
- There is no single-test command yet because no test runner is set up.
- For changes, rely on `npm run build` and manual verification in `wrangler dev` until a test framework is added.

## Local development requirements

- Worker config lives in `wrangler.jsonc`.
- The worker expects a D1 binding named `DB` and an assets binding named `ASSETS`.
- `COOKIE_ENCRYPTION_KEY` is required at runtime to encrypt and decrypt per-site stored headers/cookies.
- `SESSION_COOKIE_NAME` is configurable through `wrangler.jsonc` vars and defaults to `page_mirror_session`.
- `.dev.vars.example` exists as a template for local secrets, but verify it against the current source before relying on every variable in it.

## High-level architecture

This project is a single Cloudflare Worker that serves three roles:

1. Admin pages under `/admin/*`
2. Admin JSON APIs under `/api/admin/*`
3. Public shared snapshot pages under `/p/:shareId` and `/api/public/pages/:shareId`

Static frontend assets are built by Vite into `dist/client` and served through the Worker via the `ASSETS` binding.

## Request flow

- `src/index.ts` is the only request router. It handles auth gates, dispatches admin/public routes, and falls back to `env.ASSETS.fetch()` for static files.
- `/admin/login` is special-cased for both HTML and JSON login flows.
- `/admin/*` routes render server-provided app state into the React shell.
- `/api/admin/sites`, `/api/admin/pages`, and `/api/admin/settings` are authenticated JSON/form endpoints used by the admin UI.
- `/p/:shareId` renders the public reader page shell; `/api/public/pages/:shareId` returns the snapshot payload as JSON.

## Frontend/Worker rendering model

The app is not a pure SPA and not traditional server-rendered HTML either.

- The Worker renders a minimal HTML shell in `src/templates/app-shell.ts`.
- That shell injects initial route data into `window.__APP_DATA__`.
- The React app in `frontend/src/main.tsx` hydrates from that injected data and continues with client-side fetches for mutations and refreshes.
- Route selection in the frontend is data-driven through `frontend/src/App.tsx`, not a separate client router library.

When changing page bootstrapping, keep the Worker template payload shape and the frontend `AppData` types in sync.

## Data model

D1 schema is defined by `migrations/0001_init.sql` and `migrations/0002_system_settings.sql`.

Core tables:

- `sites`: source domains plus encrypted per-site request headers/cookies
- `pages`: snapshot definitions and stored snapshot content
- `admin_sessions`: hashed session tokens with expiry
- `system_settings`: singleton row holding the admin password hash

Database access is centralized in `src/lib/db.ts`; route handlers should use that module rather than inlining SQL.

## Snapshot pipeline

The core product flow is:

1. Admin creates a site with a domain and optional request headers/cookies.
2. Headers are normalized and encrypted before storage.
3. Admin creates a page with `siteId`, `sourceUrl`, and a DOM selector.
4. The worker validates that the URL belongs to the selected site domain.
5. The worker fetches the remote HTML using the decrypted stored headers.
6. `src/lib/parse-page.ts` extracts the matching DOM subtree and strips dangerous elements/attributes.
7. The sanitized HTML snapshot is stored in D1 and later served from `/p/:shareId`.

Files involved in this flow:

- `src/routes/api-sites.ts`
- `src/routes/api-pages.ts`
- `src/lib/fetch-page.ts`
- `src/lib/crypto.ts`
- `src/lib/parse-page.ts`

## Authentication model

- Admin auth is cookie-based.
- Password verification and session management live in `src/lib/auth.ts`.
- Session tokens are random values stored only as SHA-256 hashes in D1.
- Login sets an `HttpOnly` cookie; authenticated admin page and API routes are protected in `src/index.ts` before dispatch.
- Changing the admin password via `src/routes/api-settings.ts` updates the stored hash and clears all sessions.

## Directory responsibilities

- `src/index.ts` — top-level Worker request routing
- `src/routes/` — route handlers for admin pages and APIs
- `src/lib/` — shared database, auth, crypto, fetch, parsing, and utility logic
- `src/templates/` — Worker-side HTML shell/template generation
- `frontend/src/pages/` — page-level React views
- `frontend/src/components/` — reusable UI and layout components
- `frontend/src/lib/` — browser-side API helpers and shared frontend types
- `migrations/` — D1 schema changes

## Important implementation constraints

- `wrangler.jsonc` uses `assets.run_worker_first` for `/admin*`, `/api/*`, and `/p/*`; those routes must continue to be handled by the Worker before static asset fallback.
- `src/templates/app-shell.ts` hard-codes `/assets/app.js` and `/assets/index.css`. Those names are preserved by `vite.config.ts`; if you change Vite output naming, update the Worker shell too.
- Public page rendering uses `dangerouslySetInnerHTML` in `frontend/src/pages/PublicPage.tsx`, so snapshot sanitization in `src/lib/parse-page.ts` is a security boundary.
- Site header storage is encrypted at rest, but admin edit/detail flows decrypt it back for display and reuse. Changes to the encryption format affect both site management and page refresh/create flows.
- The admin UI can boot from server-provided data, then immediately refresh from JSON APIs on the client. If data looks duplicated, that is intentional.
