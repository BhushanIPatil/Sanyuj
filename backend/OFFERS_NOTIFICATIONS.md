# Offerly and notifications retirement rollout

This documents the earlier account-retirement migration. Home remains available. Follow [REMOVE_SERVICES.md](REMOVE_SERVICES.md) for the current release.

This release replaces the directory and request workflow. Public web/mobile apps have only Offerly and Notifications. Admin email/password login remains; public signup, profile forms, business requests, providers, live availability, and account-based click tracking are retired.

## Database

Apply migrations in timestamp order, ending with `20260911120000_offers_notifications_only.sql`. Earlier migrations remain for existing deployment history and clean installations.

The final migration drops profiles, businesses, service coverage for businesses, requests (including contacts/review notes), live sessions, provider categories/groups, landmarks, OTP records, and per-account ad clicks, along with their RPCs/triggers/policies. The obsolete home-carousel placement flag is removed; all offers belong in Offerly. It deletes non-admin Auth records and historical rate-limit identifiers. Only IDs registered in `public.admins` are preserved, including inactive admins. Active status still controls dashboard access. It removes account-linked push registrations and device identity metadata. Anonymous tokens are retained; updated installations register without accounts.

Retained tables: admins; ads and ad_service_areas; notices and notice_service_areas; content_categories; localities and areas; push_notifications; device_tokens; app_versions; api_rate_limits. Admin-only locality writes close the legacy authenticated-user RPC. Rate-limit counters accept only IP subjects and expire lazily after one day on registration traffic. Tokens are private to server/admin; public clients cannot list or directly write them.

## Existing production deployment

1. Confirm every administrator has a correct `public.admins` row and at least one active admin can sign in. Pause admin provisioning during cleanup. The allowlist, not email domain, determines preservation.
2. Disable **Allow new users to sign up**, anonymous sign-ins, phone auth and unused OAuth providers in hosted Supabase Auth settings. Keep email/password sign-in for existing admins. Repository config does not change hosted settings automatically.
3. Publish the updated public app/API (including retired OTP edge-function responses) and admin app. During the short cutover the old schema accepts the new anonymous token payload. Stop serving old directory builds; do not leave old API deployments active.
4. In a trusted terminal set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Run `node scripts/retire-directory-data.cjs` from backend for a read-only count summary. Verify the admin count and project. Run `node scripts/retire-directory-data.cjs --apply` to remove the retired business-photo bucket through the Storage API, then permanently delete non-admin Auth users through the Auth admin API. The script never prints tokens or contact records. It is resumable. Storage errors stop cleanup before accounts are deleted. If other buckets contain customer-owned uploads, remove those objects through Storage after reviewing ownership, then retry.
5. Apply the final migration using the deployment's migration runner. This permanently removes retired application data, blocks business-photo policies, and cleans up any non-admin Auth records remaining. A populated legacy Storage bucket must be cleaned with the script first: SQL table deletion alone cannot erase physical storage objects.
6. Release mobile with an incremented version/build and update the admin App versions record to require the new version as appropriate. The source version remains unchanged so release numbering stays under your normal release process. New clients clear their old saved auth credentials and the web service worker replaces old caches on activation.
7. Verify signed-out browsing and filters, admin login/content edits, and a test push on a consented device. Old public auth pages redirect to Offerly; public account and business-request APIs return 410. Retired admin directory routes redirect to the dashboard; removed admin data APIs return 404.

Review backups, logs, previously exported data, and CDN retention as part of retiring historical contact information. This code does not erase offline devices or provider-managed backups. Existing signed image URLs/cached responses can last until their expiration; purge the relevant CDN where applicable. Do not restore old directory data into the new schema.

## Fresh projects

Apply all migrations before creating Auth users. Create admin email/password users through the Supabase Dashboard or Auth admin API, then add their IDs to public.admins. Public signup stays disabled. Do not run the legacy-data script on an empty project before provisioning an admin.

## Verification

From backend: `npm ci`, then `npm test`. The tests apply the entire migration chain to disposable PGlite PostgreSQL with minimal Supabase Auth/Storage fixtures. They verify data retirement, admin preservation, anonymous content reads, hidden content, old JWT write denial, and admin writes. They do not call production, send FCM messages, or exercise hosted Auth/Storage deletion. Run the deployment smoke checks above against the target environment.
