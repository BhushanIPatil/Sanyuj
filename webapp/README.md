# Sanyuj Webapp

Next.js app that includes:

- Marketing landing (`/`)
- Email + password auth (`/auth/*`)
- Full customer + business web app (`/app/*`)

Deploy this folder to **Vercel**.

## Local setup

1. Apply the SQL migrations from `../backend/supabase/migrations/` in your Supabase project (including `20260903120000_profiles_email_auth.sql`)
2. Copy env template:

```bash
cp .env.example .env.local
```

3. Fill values from Supabase → Project Settings → API (set `SUPABASE_SERVICE_ROLE_KEY` for auth API routes)
4. Run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Sign up / log in with a real email and password. Phone is only collected when listing a business (provider contact).

## Deploy (Vercel)

1. Import the `webapp` directory as a Vercel project
2. Set the same environment variables in the Vercel dashboard (do not commit secrets)
3. Deploy

## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm run start` — run production server
