# Remove Services rollout

Deploy the updated web API and clients, then apply all pending migrations through `20260917120000_remove_services.sql`. Old mobile installations must update: their Services queries will no longer work.

Before applying the removal migration to an existing database, select `image_path` from `public.content_requests` where `kind = 'service'` and remove those files from the private `request-images` bucket using the Supabase Storage API. Do not delete Storage metadata directly. Service listing images use external URLs and are not managed by this migration.

The migration deletes service listings, coverage, categories and service enquiries (including contacts and follow-up notes), drops their RPCs and triggers, and restricts category/request kinds to offers and notifications. Offers, notifications, their coverage and the Home carousel remain available. Historical migrations remain intact so existing and fresh databases follow the same upgrade path.

Run `npm test` in `backend` and `webapp`, lint/build both Next.js applications, and run `flutter analyze` and `flutter test` in `mobile` before release. No production database is changed by updating this repository.
