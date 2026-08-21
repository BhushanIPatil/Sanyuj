# Sanyuj Backend (Supabase)

Database schema, Row Level Security, storage buckets, and Edge Functions for OTP.

## Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Install CLI: `npm i -g supabase` (or use npx)
3. From this folder:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase functions deploy send-otp
npx supabase functions deploy verify-otp
```

Or paste `supabase/migrations/*.sql` into the SQL Editor in the dashboard (in order).

## Auth / OTP

The **webapp** ships working OTP API routes (`/api/auth/send-otp`, `/api/auth/verify-otp`) that use the service role key on Vercel. That is the primary path for launch.

Optional Edge Functions in `supabase/functions/` mirror the same flow if you prefer OTP on Supabase:

```bash
npx supabase functions deploy send-otp
npx supabase functions deploy verify-otp
```

### Secrets (set yourself — never commit)

**Webapp (Vercel / `.env.local`):** see `../webapp/.env.example`

**Edge Functions (Supabase Dashboard → Edge Functions → Secrets):**

| Secret | Required | Notes |
|--------|----------|-------|
| `SUPABASE_URL` | auto | Usually injected |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Service role |
| `MSG91_AUTH_KEY` | no* | SMS provider |
| `MSG91_TEMPLATE_ID` | no* | DLT template id |
| `OTP_DEV_MODE` | recommended for launch | `true` = OTP `123456` |

\*Without MSG91 keys, keep `OTP_DEV_MODE=true`.

## Tables (overview)

- `profiles` — user name, phone, pincode, address, current_address (live)
- `category_groups` — super categories (Food, Services, Daily) — manage in dashboard
- `categories` — subcategories under a group — manage in dashboard
- `businesses` — optional provider listing (`category_id`)
- `jobs` — customer requests (`category_id`)
- `job_interests` — provider responses
- `live_sessions` — “Go Live” check-ins
- `otp_codes` — short-lived OTP (service role only)

## Storage

Bucket `business-photos` (public read, owner write).
