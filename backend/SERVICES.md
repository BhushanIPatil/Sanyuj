# Services and home rollout

Apply all pending migrations in timestamp order, ending with `20260911160000_services_and_home.sql`, before deploying the updated webapp, admin and mobile clients. This follow-up adds services, service_coverage, the service category kind, seeded plumbing/electrician categories and the restored ads.is_home_screen flag. Existing ads default to appearing on Home; admins can change their placement. Earlier retired customer accounts and business records are not restored.

Admins create and edit services at /services, choose a service category, enter the provider name, description and contact link, and select pincode/locality/area coverage. Publishing schedules and visibility use the same rules as notifications. Services are read-only to public clients. There is no provider signup or self-submission workflow in this release.

Home shows the earlier carousel followed by up to two notifications and two services, each with See all. All listing pages retain the existing filter UI. Location permission supplies the address and pincode; the active app refreshes it periodically and on foregrounding. Pincode-only searches include precise coverage within that pincode. Users can narrow to locality/area manually. Location is held in memory, without storing customer profiles.

Run backend npm test, webapp npm test and npm run build, admin npm run build, and mobile flutter analyze / flutter test. Smoke-check location allowed and denied, moving between pincodes, manual filters, service contact links, carousel placement, both See all links, and the restored Sanyuj legal dropdown. This repository update does not apply migrations or publish a release automatically.
