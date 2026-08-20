# Sanyuj Webapp

Next.js app that includes:

- Marketing landing (`/`)
- Phone OTP login (`/auth/*`)
- Full customer + business web app (`/app/*`)

Deploy this folder to **Vercel**.

## Local setup

1. Apply the SQL migration from `../backend/supabase/migrations/` in your Supabase project
2. Copy env template:

```bash
cp .env.example .env.local
```

3. Fill values from Supabase → Project Settings → API (and set `SUPABASE_SERVICE_ROLE_KEY` for OTP routes)
4. Run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

With `OTP_DEV_MODE=true` (default), OTP is always **123456** and is also returned in the send-otp response for convenience.

## Deploy (Vercel)

1. Import the `webapp` directory as a Vercel project
2. Set the same environment variables in the Vercel dashboard (do not commit secrets)
3. Deploy

## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm run start` — run production server
