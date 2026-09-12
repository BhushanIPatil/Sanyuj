# Sanyuj webapp

Next.js public website: /app (home carousel, two notifications and two services), /app/offerly, /app/notifications and /app/services. Public login/profile/directory URLs redirect to Offerly, and retired public account/request APIs return 410.

Copy .env.example to .env.local, configure Supabase, then run `npm install` and `npm run dev` (port 3000). Run `npm run build` and `npm test` to validate.

The server-only service role key is used by /api/notifications/devices and /api/notifications/send. Registration is anonymous and rate-limited; sending requires an active admin bearer token. Firebase service-account credentials are required only on the server for push delivery. Set CORS_ALLOWED_ORIGINS for the admin deployment if needed.

The public Supabase client does not persist or refresh sessions. New clients remove legacy saved credentials. Location detection refreshes the address and pincode at startup, when returning to the foreground and every two minutes while visible. Manual pincode/locality/area filters remain available when location permission is denied. No profile or address is saved to the database.

Apply [services rollout](../backend/SERVICES.md) for this release. See [rollout instructions](../backend/OFFERS_NOTIFICATIONS.md) before deploying.
