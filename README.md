# Sanyuj

Offers and local notifications, available without a public account.

| Directory | Purpose |
| --- | --- |
| [webapp](webapp) | Public Offerly/Notifications website and notification APIs |
| [mobile](mobile) | Flutter Offerly/Notifications app |
| [admin](admin) | Admin-only login, offers, notices, push campaigns, content categories, area targeting and releases |
| [backend](backend) | Supabase migrations, retirement tooling and database tests |

Public profiles, providers, live listings, business requests, and account-based click tracking are removed. Only administrators have accounts. Anonymous device registrations support push notifications.

Follow [the migration and deployment guide](backend/OFFERS_NOTIFICATIONS.md) for existing data cleanup and release order. No production data is changed just by updating this repository.
