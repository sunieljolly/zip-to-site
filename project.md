# ZipToSite — Architecture & How It Works

## What It Does

ZipToSite lets a user upload a ZIP file containing a static website (HTML, CSS, JS) and instantly receive a live public URL. No build steps, no servers — just upload and go.

---

## System Overview

```
User (browser)
    │
    ▼
Next.js App (Vercel / CF Pages)
  ├── Auth UI          (Supabase Auth)
  ├── Dashboard UI     (React, Tailwind)
  ├── Upload API       (validates ZIP → uploads to R2 → writes KV)
  ├── Sites API        (list / delete sites)
  ├── Domains API      (save custom domain)
  └── Stripe Webhook   (update subscription plan)
    │
    ├── Supabase Postgres   (sites, subscriptions tables)
    ├── Cloudflare R2       (raw file storage)
    └── Cloudflare KV       (subdomain → R2 path mapping)

Visitor (browser)
    │
    ▼
Cloudflare Worker  ←  reads KV  →  fetches R2  →  serves response
```

---

## Upload Flow (step by step)

1. User fills in a site name and drops a `.zip` file on the upload page.
2. The browser `POST`s the form to `/api/upload`.
3. The API route (`src/app/api/upload/route.ts`):
   - Authenticates the user via Supabase session cookie.
   - Validates the file:
     - Must be a `.zip` under 50 MB.
     - Must contain `index.html`.
     - Must not contain `package.json` (raw dev project).
     - Must not contain blocked extensions (`.php`, `.exe`, `.sh`, etc.).
   - Extracts each file from the ZIP using `unzipper`.
   - Strips the top-level folder prefix if present (e.g. `dist/index.html` → `index.html`).
   - Uploads each file to Cloudflare R2 under `sites/{user_id}/{site_id}/`.
   - Inserts a row into the `sites` Supabase table.
   - Calls `syncSiteToKV()` to write `subdomain → { r2_path }` into Cloudflare KV.
4. The response returns the live URL: `https://{subdomain}.yourdomain.com`.

---

## Serving Flow (Cloudflare Worker)

The Worker (`worker/index.js`) runs on every request to `*.yourdomain.com` or a custom domain:

1. Parse the `hostname` from the incoming request.
2. If the hostname is a subdomain of the app domain, look up the subdomain in KV.
3. If it looks like a custom domain, look up `custom:{domain}` in KV.
4. If no KV record found → return 404.
5. Resolve the file path from the URL (default to `index.html` for `/`).
6. Fetch the file from R2 using the stored `r2_path` prefix.
7. If the file isn't found, fall back to `index.html` (SPA support).
8. Return the file with correct `Content-Type` and cache headers.

---

## Authentication

Handled entirely by Supabase Auth:

- Email/password sign-up and sign-in.
- Session stored in a cookie managed by `@supabase/ssr`.
- `src/middleware.ts` intercepts every `/dashboard/*` request and redirects unauthenticated users to `/login`.
- Server components and API routes use `createServerSupabaseClient()` to verify the session server-side.

---

## Database Schema

### `sites`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → `auth.users` |
| `name` | text | Display name |
| `subdomain` | text | Unique slug |
| `custom_domain` | text | Optional |
| `r2_path` | text | R2 key prefix |
| `created_at` | timestamptz | |

Row Level Security ensures users can only read/write their own sites.

### `subscriptions`
| Column | Type | Notes |
|---|---|---|
| `user_email` | text | Unique |
| `plan` | text | `free` or `pro` |
| `status` | text | Stripe subscription status |

Written by the Stripe webhook handler only (service role key).

---

## Cloudflare KV Structure

The Worker uses a KV namespace (`SITES_KV`) with two key formats:

| Key | Value |
|---|---|
| `my-site` | `{"r2_path":"sites/uid/sid"}` |
| `custom:userdomain.com` | `{"r2_path":"sites/uid/sid"}` |

Keys are written by the Next.js API via the Cloudflare REST API (`src/lib/kv.ts`) every time a site is uploaded or a custom domain is saved.

---

## R2 Storage Layout

```
sites/
  {user_id}/
    {site_id}/
      index.html
      style.css
      assets/
        logo.png
        ...
```

Files are stored with their original relative paths, preserving directory structure.

---

## Stripe / Monetization

Plans are defined in `src/lib/stripe.ts`:

| Plan | Sites | Custom Domains |
|---|---|---|
| Free | 1 | No |
| Pro | 10 | Yes |

The Stripe webhook at `/api/stripe/webhook` listens for `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted` events, then upserts the user's plan in the `subscriptions` table.

> Plan enforcement (checking limits before upload) is not yet wired into the upload route — that's the next step after MVP.

---

## Key Files Reference

| File | Purpose |
|---|---|
| `src/app/api/upload/route.ts` | Core upload logic |
| `src/app/api/sites/[id]/route.ts` | Delete site + R2 cleanup |
| `src/app/api/domains/route.ts` | Save custom domain |
| `src/app/api/stripe/webhook/route.ts` | Subscription sync |
| `src/lib/kv.ts` | Write to Cloudflare KV via REST API |
| `src/lib/r2.ts` | S3-compatible R2 client |
| `src/lib/supabase-server.ts` | Server-side Supabase clients |
| `src/middleware.ts` | Auth-protect `/dashboard` routes |
| `worker/index.js` | Cloudflare Worker — serves sites |
| `supabase/schema.sql` | Full DB schema with RLS |
| `wrangler.toml` | Worker deployment config |
| `.env.example` | All required environment variables |

---

## What's Not Yet Implemented

- Plan limit enforcement (max sites per plan)
- Stripe Checkout session creation (upgrade flow)
- Custom domain verification / SSL status display
- Site re-deploy (overwrite existing site)
- Version history / rollback
