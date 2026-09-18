# Sanyuj webapp

Next.js public website: /app (home carousel, two notifications), /app/offerly, /app/notifications. Public login/profile/directory URLs redirect to Offerly, and retired public account/request APIs return 410.

Copy .env.example to .env.local, configure Supabase, then run `npm install` and `npm run dev` (port 3000). Run `npm run build` and `npm test` to validate.

The server-only service role key is used by /api/notifications/devices and /api/notifications/send. Registration is anonymous and rate-limited; sending requires an active admin bearer token. Firebase service-account credentials are required only on the server for push delivery. Set CORS_ALLOWED_ORIGINS for the admin deployment if needed.

The public Supabase client does not persist or refresh sessions. New clients remove legacy saved credentials. Location detection refreshes the address and pincode at startup, when returning to the foreground and every two minutes while visible. Manual pincode/locality/area filters remain available when location permission is denied. No profile or address is saved to the database.

Follow the [Services removal rollout](../backend/REMOVE_SERVICES.md) before deploying.

The **Submit Request** page at /app/requests sends name, contact, details and an image to /api/content-requests. See [request rollout](../backend/REQUESTS.md) for its database and private Storage migration.

Google Forms: configure `NEXT_PUBLIC_OFFER_REQUEST_FORM_URL`, `NEXT_PUBLIC_NOTIFICATION_REQUEST_FORM_URL`, and `NEXT_PUBLIC_CONTACT_FORM_URL` in ignored `.env.local`. Set the same variables in your hosting environment before deploying; they are included at build time. Restart development or rebuild after changing them. Actual form URLs belong only in local/hosting configuration, not Git.

## Footer and public links

Update `NEXT_PUBLIC_CONTACT_FORM_URL`, `NEXT_PUBLIC_PLAY_STORE_URL`, `NEXT_PUBLIC_LINKEDIN_URL`, `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_X_URL`, `NEXT_PUBLIC_FACEBOOK_URL`, and `NEXT_PUBLIC_YOUTUBE_URL` in `.env.local` or the hosting environment. Social URLs currently point to `example.com` placeholders; replace them with official profiles. The Google Play listing is also a placeholder until published. All support links use the contact form. Set `NEXT_PUBLIC_SITE_URL` to the canonical website origin for SEO metadata, sitemap and robots. These values are bundled at build time, so rebuild/redeploy after changes.

The About page and `/faq` contain searchable product information; FAQ structured data is generated from the same answers displayed on the page.
