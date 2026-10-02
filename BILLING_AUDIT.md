# Third-party services and billing audit

Reviewed: 2026-09-29. Scope: admin, backend, mobile, webapp; source, dependency manifests/lockfiles, native mobile configuration, migrations, scripts, local environment variable names and deployment configuration. Secret values were not included in this report. Existing uncommitted work was preserved.

**Result: a zero-charge deployment is not yet verified.** No active pay-per-SMS, paid maps, AI API, payment gateway, or paid analytics integration was found in application code. However, Supabase and Vercel are core infrastructure with paid plans and usage billing. Source code cannot establish their current account plans, invoices, add-ons, or production settings. No cloud billing settings or deployments were changed.

## Service inventory

| Service / dependency | Where and why | Billing assessment |
| --- | --- | --- |
| Supabase hosted database, Auth, Storage | All apps: `admin/src/lib/supabase/`, `webapp/src/lib/supabase/`, `webapp/src/lib/auth/admin.ts`, `mobile/lib/services/repository.dart`, `mobile/lib/main.dart`; backend migrations | **Account verification required.** Database capacity, storage, traffic, authentication and other enabled features have plan-dependent charges. Supabase explicitly states Free users are not charged. Require the Free plan; paid plans with a spend cap do not meet a zero-charge requirement. |
| Vercel hosting / Next.js | `admin/vercel.json`, `webapp/vercel.json`; mobile API and legal-page defaults point to `sanyuj.vercel.app` | **Deployment decision required.** Functions, middleware, data transfer and image optimization can be metered on paid plans. Hobby is free but restricted to personal, non-commercial use. Sanyuj's paid provider promotions appear incompatible with Hobby; verify with Vercel or move to hosting that explicitly permits this application at no charge. |
| Next.js image optimization | Logos use `next/image`; admin previously allowed arbitrary remote hosts | Disabled globally in both `next.config.ts` files by this audit. Removed the admin wildcard optimizer host configuration. Original image downloads still consume bandwidth; this is not a hosting cost cap. Larger original images may increase transfer compared with optimized images. |
| Firebase Cloud Messaging (FCM) | `webapp/src/lib/notifications/firebase.ts`, `send.ts`; `mobile/lib/services/push_notifications.dart` | FCM itself is no-cost, including production usage. Require Firebase Spark / no linked Cloud Billing account to prevent accidental use of other paid Google Cloud products. The webapp sending API, Supabase token storage and notification image hosting still consume their own resources. |
| Firebase Admin SDK transitive Google Cloud libraries | `webapp/package-lock.json` includes Firestore and Cloud Storage support through `firebase-admin` | Installed SDK support is not evidence of paid API usage. Application imports use Firebase app credentials and messaging; no Firestore/Google Cloud Storage calls were found. Do not remove transitive packages manually or treat their presence as an invoice. |
| OpenStreetMap Nominatim | `webapp/src/app/api/geo/search/route.ts`, `reverse/route.ts` | Public geocoding calls with no billing credentials or paid fallback. Usage policy limits apply, including an application-wide maximum of one request per second. Current routes do not enforce an application-wide limiter. Throttling/blocking is a service risk; calls also consume web hosting resources. |
| Photon public demo | `webapp/src/app/api/geo/reverse/route.ts` | Public endpoint without billing credentials. Operator may throttle/ban excessive use and does not guarantee availability. Called alongside Nominatim on each reverse lookup, not only as a failure fallback. |
| Postal PIN Code API | `admin/src/lib/geo/postal.ts`, `webapp/src/lib/geo/postal.ts`, `mobile/lib/services/postal.dart` | Provider describes commercial/non-commercial use as free. No account/API key or automatic paid fallback is used. Server lookups are cached for one day. Availability and future terms are outside this repository's control. |
| Google Fonts | Admin/webapp layouts use `next/font/google`; mobile uses `google_fonts` | Free font service; no metered API credentials. Next.js downloads fonts at build time and serves them locally; Flutter may fetch fonts at runtime. Downloads consume hosting/device bandwidth. |
| Google Forms and social/store links | `webapp/src/lib/requestForms.ts`, `siteLinks.ts`, mobile configuration | Ordinary outbound links; no Forms billing API or paid connector was found. Existing Google Workspace subscriptions, Forms add-ons, automations and linked storage cannot be audited from these URLs. Public image requests currently use the application's own upload API. |
| Flutter, React, Next.js, icons, pluscodes, geolocator and other local libraries | App dependency manifests | No per-use vendor billing integration found. Plus Codes are calculated locally, not through Google Maps. Device location does not call a Google Maps billing API in this code. PGlite backend tests run a local database. |
| Google Play / Apple distribution | Mobile store links and Android/iOS projects | Publishing is not universally free: Google Play has a US$25 one-time registration fee; Apple Developer Program is normally US$99 per year, subject to region/waivers. These are separate from application API usage. |

## Usage paths that still matter

- Public browsing queries Supabase. Request images are uploaded to Supabase Storage via `webapp/src/app/api/content-requests/route.ts`; admins also upload and view signed images. The public route limits each image to 3 MB and submissions to five per IP per hour, but these are not a total storage or financial cap. Distributed traffic can still exhaust quotas.
- Anonymous push device registration writes to Supabase and has a per-IP rate limit. Broadcasts use Vercel/server compute plus database reads and writes even though FCM delivery is free. Rich notification images and ad/notice/category URLs can point to externally hosted content; the database's actual URLs and those hosts' billing arrangements were not inspected.
- `webapp/src/components/UserLocation.tsx` performs location detection on mount, visibility changes and every two minutes while visible. Each successful reverse lookup invokes two public geocoders through the webapp. Mobile location is user-triggered in the current working tree. None of these limits guarantees zero hosting charges on a paid plan.
- Retired OTP edge functions and public account endpoints return HTTP 410; no SMS provider call remains. Deployed old versions, custom SMTP/SMS settings, dashboard-created functions, database jobs or webhooks must be checked separately. Even a retired deployed edge function may consume invocation quota if called.
- No recurring cloud job, paid payment SDK, AI API, paid maps SDK, analytics SDK or paid geocoding fallback was found in repository configuration. Admin payment fields record business transactions; they do not themselves invoke a payment processor.
- Old private storage objects may still occupy space after services are retired. The existing retirement script supports review/cleanup; this audit did not delete data.

## Conditions for accepting a no-charge release

1. Verify the Supabase **organization** is on Free, with no paid subscription/add-ons or unrelated paid projects. Check invoices and deployed Auth/provider settings. Let quota exhaustion restrict service; do not enable upgrades or paid fallbacks.
2. Resolve hosting for **both** admin and webapp. Do not rely on Vercel Hobby for commercial production, and do not use Vercel Pro for a zero-charge requirement. A hosting migration must support the existing Next.js server routes, middleware and secrets; a static upload alone will not preserve the APIs. Self-hosting only avoids vendor usage billing when existing hardware/network costs are acceptable.
3. Verify Firebase is on Spark and that no Cloud Billing account is linked to its Google Cloud project. Inspect separately deployed Google Cloud services and extensions. FCM does not require upgrading to Blaze.
4. Inspect actual image hosts, domains/renewals, mailbox/Workspace subscriptions, developer memberships and external CI services. These charges are controlled outside application code. Do not enable trial conversions, paid add-ons or overage billing.
5. Verify the deployed code and migrations match the audited working tree. Apply/redeploy the image configuration change before expecting it to affect production. Review provider terms when introducing any dependency or changing a plan.

Budget alerts and application rate limits are not a universal hard billing stop. There is no source-level switch that can guarantee a zero invoice while resources remain on paid infrastructure. Account-plan confirmation and a suitable hosting decision remain outstanding.

## Validation of repository changes

Loaded each app's configuration through its installed Next.js production configuration loader and checked generated image properties for both a local logo and an external image URL. Both apps passed: original source URLs are preserved and no optimized `srcSet` is generated. `git diff --check` passed. No production build, cloud deployment, live traffic test or billing-account inspection was performed.

## Sources

- [Supabase cost control and spend-cap exclusions](https://supabase.com/docs/guides/platform/cost-control)
- [Vercel Hobby restrictions](https://vercel.com/docs/plans/hobby) and [Vercel pricing resources](https://vercel.com/docs/pricing)
- [Firebase no-cost products and Spark/Blaze plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
- [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/)
- [Photon public demo policy](https://github.com/komoot/photon#demo-server)
- [Postal PIN Code API terms](https://www.postalpincode.in/Api-Details)
- [Google Fonts FAQ](https://developers.google.com/fonts/faq)
- [Google Play registration](https://support.google.com/googleplay/android-developer/answer/6112435) and [Apple Developer membership](https://developer.apple.com/programs/enroll/)

Provider policies were checked during this audit; future pricing changes require review.
