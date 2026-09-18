# Sanyuj

Offers and local notifications, available without a public account.

| Directory | Purpose |
| --- | --- |
| [webapp](webapp) | Public Home/Offerly/Notifications website and notification APIs |
| [mobile](mobile) | Flutter Home/Offerly/Notifications app |
| [admin](admin) | Admin-only login, offers, notices, push campaigns, content categories, area targeting and releases |
| [backend](backend) | Supabase migrations, retirement tooling and database tests |

Public profiles, live availability, business requests, and account-based click tracking remain retired. Only administrators have accounts. Anonymous device registrations support push notifications.

Apply the [Services removal migration and rollout](backend/REMOVE_SERVICES.md) before releasing these clients.

Follow [the migration and deployment guide](backend/OFFERS_NOTIFICATIONS.md) for existing data cleanup and release order. No production data is changed just by updating this repository.

Public visitors can submit an offer or notification enquiry through **Submit Request**. Admins manage these privately in **Requests**. Apply the [requests migration and rollout](backend/REQUESTS.md) before releasing this feature.
