# ZipToSite

Upload a ZIP file, get a live website in seconds. A lightweight static site hosting platform built on Next.js, Supabase, Cloudflare R2, and Cloudflare Workers.

See [project.md](project.md) for a full architectural overview.

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Cloudflare](https://cloudflare.com) account with:
  - An R2 bucket
  - A Workers KV namespace
  - A Worker deployed from `wrangler.toml`
- A [Stripe](https://stripe.com) account (optional for MVP)

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your keys:

```bash
cp .env.example .env.local
```

Open `.env.local` and set every value. See `.env.example` for descriptions of each variable.

### 3. Set up the database

In your Supabase project, open the **SQL Editor** and run the contents of:

```
supabase/schema.sql
```

This creates the `sites` and `subscriptions` tables with Row Level Security enabled.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to the dashboard (sign up first).

---

## Deploying the Cloudflare Worker

### 1. Install Wrangler

```bash
npm install -g wrangler
wrangler login
```

### 2. Update `wrangler.toml`

Fill in your KV namespace ID and R2 bucket name in `wrangler.toml`.

### 3. Deploy

```bash
wrangler deploy
```

### 4. Configure DNS

In your Cloudflare dashboard, add a wildcard DNS route pointing to the Worker:

```
*.yourdomain.com  →  Worker route
```

---

## Deploying the Next.js App

The easiest option is [Vercel](https://vercel.com):

1. Push the repo to GitHub.
2. Import it in Vercel.
3. Add all `.env.local` values as environment variables in the Vercel project settings.
4. Deploy.

Alternatively deploy to [Cloudflare Pages](https://pages.cloudflare.com) using the Next.js preset.

---

## Stripe Webhooks (optional)

1. In the Stripe dashboard, add a webhook endpoint pointing to:
   ```
   https://yourdomain.com/api/stripe/webhook
   ```
2. Subscribe to events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
3. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET` in your environment.

---

## Project Structure

```
src/
  app/
    login/             Sign-in page
    signup/            Sign-up page
    dashboard/         Protected dashboard (sites list, upload, manage)
    api/               API routes (upload, sites, domains, auth, stripe)
  lib/
    supabase.ts        Browser Supabase client
    supabase-server.ts Server-side Supabase client
    r2.ts              Cloudflare R2 (S3-compatible) client
    stripe.ts          Stripe client + plan config
    kv.ts              Cloudflare KV sync helper
  middleware.ts        Auth route protection
worker/
  index.js            Cloudflare Worker — serves deployed sites
supabase/
  schema.sql          Database schema + RLS policies
wrangler.toml         Worker config
.env.example          All required environment variables
```
