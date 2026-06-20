# Deploy Talent Portal (free)

This app runs on **Vercel** (free hosting) with **Upstash Redis** (free database) and **Resend** (free email alerts).

## 1. Upstash Redis (stores users and resumes)

1. Go to [https://upstash.com](https://upstash.com) and sign up.
2. Create a Redis database (free tier).
3. Copy **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN**.

Without these, the app uses a local JSON file — that does **not** persist on Vercel.

## 2. Resend (signup email notifications)

1. Go to [https://resend.com](https://resend.com) and sign up.
2. Create an API key → set **RESEND_API_KEY**.
3. Set **ADMIN_NOTIFICATION_EMAIL** to your email (where you want alerts).
4. For testing, use **RESEND_FROM_EMAIL** = `Talent Portal <onboarding@resend.dev>` (Resend’s sandbox sender).

You’ll get an email whenever someone signs up with their **name**, **email**, and **username**.

## 3. AI keys (for resume tailoring)

Set at least one:

- **CURSOR_API_KEY** — [Cursor integrations](https://cursor.com/dashboard/integrations)
- or **OPENAI_API_KEY**

## 4. Deploy on Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub.
2. **Add New Project** → import `kanha55/talent-portal`.
3. Framework preset: **Next.js** (auto-detected).
4. Add environment variables from `.env.example`:

   | Variable | Required on Vercel |
   |----------|-------------------|
   | `UPSTASH_REDIS_REST_URL` | Yes |
   | `UPSTASH_REDIS_REST_TOKEN` | Yes |
   | `ADMIN_NOTIFICATION_EMAIL` | For signup alerts |
   | `RESEND_API_KEY` | For signup alerts |
   | `RESEND_FROM_EMAIL` | Optional |
   | `CURSOR_API_KEY` or `OPENAI_API_KEY` | For AI tailoring |

5. Click **Deploy**.

Your live URL will look like `https://talent-portal-xxx.vercel.app`.

## 5. Custom domain (optional)

In Vercel → Project → **Settings** → **Domains**, add your domain.

## Local development

```bash
cp .env.example .env
# Fill in keys; Redis is optional locally (uses data/app-store.json)
npm install
npm run dev
```

## Troubleshooting

- **"This page couldn't load" / server error** → Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel → Settings → Environment Variables, then **Redeploy**. Push the latest code fix if you haven't already.
- **Signups don’t persist on Vercel** → Add Upstash Redis env vars and redeploy.
- **No signup emails** → Check `ADMIN_NOTIFICATION_EMAIL`, `RESEND_API_KEY`, and Resend dashboard logs.
- **AI tailoring fails** → Verify `CURSOR_API_KEY` or `OPENAI_API_KEY` in Vercel env settings.
