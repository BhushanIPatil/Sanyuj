# Sanyuj Admin

Next.js admin dashboard for managing users, providers, jobs, live sessions, ads, and categories.

Deploy this folder to **Vercel** as a separate project from `webapp/`.

## Setup

1. Apply the migration `../backend/supabase/migrations/20260901120000_admins.sql` in your Supabase project
2. Create an admin auth user in Supabase Dashboard (Authentication → Users → Add user, email + password)
3. Insert the admin row (replace UUID and email):

```sql
insert into public.admins (id, email, full_name)
values ('YOUR_AUTH_USER_UUID', 'admin@example.com', 'Admin Name');
```

4. Copy the brand logo from the webapp:

```bash
mkdir -p public/brand
cp ../webapp/public/brand/sanyuj-logo.png public/brand/
```

5. Copy env template and fill values:

```bash
cp .env.example .env.local
```

6. In Supabase → Authentication → URL Configuration, add your admin app URL (e.g. `http://localhost:3001` for dev, your Vercel URL for prod)

7. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Deploy (Vercel)

1. Import the `admin` directory as a new Vercel project
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy

## Scripts

- `npm run dev` — local development (port 3001)
- `npm run build` — production build
- `npm run start` — run production server
