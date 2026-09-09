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

## Auth / OTP (email)

Primary path: **webapp** API routes

- `POST /api/auth/register` — create account (sends signup OTP email)
- `POST /api/auth/restore` — deleted-account restore (sends OTP)
- `POST /api/auth/send-otp` — resend / forgot-password OTP (`purpose`: `signup` | `restore` | `reset`)
- `POST /api/auth/verify-otp` — verify 6-digit code
- `POST /api/auth/set-password` — set password after reset OTP

### Supabase email templates (required for codes)

In **Authentication → Email Templates**, include `{{ .Token }}` in:

1. **Confirm signup** — account creation OTP  
2. **Magic Link** — restore-account OTP  
3. **Reset password** — forgot-password OTP  

Example body:

```html
<h2>Your verification code</h2>
<p>Enter this code in the app:</p>
<p style="font-size:24px;letter-spacing:4px"><strong>{{ .Token }}</strong></p>
<p>If you don’t see this email, check Spam / Junk.</p>
```

Also add your webapp URL to **Authentication → URL Configuration → Redirect URLs**.

Optional Edge Functions in `supabase/functions/` are legacy phone-OTP helpers and are not used by the current email flow.

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
- `live_sessions` — “Go Live” check-ins
- `otp_codes` — short-lived OTP (service role only)
- `api_rate_limits` — fixed-window counters for register / OTP email / restore / delete-account (service role + RPC only)

## Storage

Bucket `business-photos` (public read, owner write).
