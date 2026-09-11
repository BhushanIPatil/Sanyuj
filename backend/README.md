# Sanyuj backend

Supabase PostgreSQL for Offerly and Notifications. Public apps read published content anonymously. Administrators authenticate through Supabase email/password and must have an active public.admins row. RLS protects content writes and private delivery tokens.

See [OFFERS_NOTIFICATIONS.md](OFFERS_NOTIFICATIONS.md) for schema changes, irreversible legacy-data cleanup, hosted Auth settings, deployment order, and admin provisioning.

Run `npm ci` then `npm test` for disposable database regression tests. The tests never use your hosted database. Historical OTP edge-function names remain as HTTP 410 tombstones for old clients; redeploy them when upgrading an existing installation.
