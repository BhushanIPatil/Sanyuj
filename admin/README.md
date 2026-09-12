# Sanyuj Admin

Separate Next.js application for Offerly, notifications, services, push campaigns, content categories, geographic coverage, and app versions. Admin email/password login and password changes remain. Directory, customer, request, and account-based click-reporting tools are removed.

Apply backend migrations, including `20260911160000_services_and_home.sql`. Services are published at /services using the existing category and coverage editor; use the provider/service name, description and contact link (https, tel or mailto). Offers include a home-carousel placement checkbox. Create an admin Auth user through the Supabase Dashboard or Admin API, then register the UUID:

```sql
insert into public.admins (id, email, full_name)
values ('YOUR_AUTH_USER_UUID', 'admin@example.com', 'Admin Name');
```

Copy .env.example to .env.local. Set public Supabase URL/key and NEXT_PUBLIC_WEBAPP_URL for the notification send API. Add the admin origin to hosted Supabase Auth URL configuration. Keep public signup disabled.

Run `npm install`, `npm run dev` (port 3001), and `npm run build` for validation. Deploy this directory separately from webapp. Content writes use the signed-in admin's RLS permissions; the admin webapp no longer needs a service-role key.

See [rollout instructions](../backend/OFFERS_NOTIFICATIONS.md).
