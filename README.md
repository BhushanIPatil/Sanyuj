# Sanyuj

Offers, local notifications and services, available without a public account.

| Directory | Purpose |
| --- | --- |
| [webapp](webapp) | Public Home/Offerly/Notifications/Services website and notification APIs |
| [mobile](mobile) | Flutter Home/Offerly/Notifications/Services app |
| [admin](admin) | Admin-only login, offers, notices, services, push campaigns, content categories, area targeting and releases |
| [backend](backend) | Supabase migrations, retirement tooling and database tests |

Services such as plumbing and electrical work are published by admins with category, contact link and area coverage. Public profiles, live availability, business requests, and account-based click tracking remain retired. Only administrators have accounts. Anonymous device registrations support push notifications.

Apply the new [services and home migration](backend/supabase/migrations/20260911160000_services_and_home.sql) before releasing these clients. See [services rollout](backend/SERVICES.md).

Follow [the migration and deployment guide](backend/OFFERS_NOTIFICATIONS.md) for existing data cleanup and release order. No production data is changed just by updating this repository.
