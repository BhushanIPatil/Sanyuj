# Google Play readiness audit

Reviewed: September 28, 2026. Original verdict: **not ready for production submission**.

## Remediation after the audit

The owner requested technical blocker fixes, provider-payment disclosures and removal of social links. Changes now implemented:

- Android target API 36; release signing uses a new local RSA upload key with no debug-key fallback. Both the key and passwords are ignored by Git. Back them up securely before upload; Play App Signing still needs Console setup.
- Removed the blanket Flutter embedding keep rule that retained unused deferred-component classes. The signed production rebuild passed, resolving the original R8 failure.
- Removed mobile and web social links and their public URL configuration.
- Terms, FAQs and request screens explain free viewing, provider-only offline publication fees and no in-app checkout. This is not an assertion of a Play Billing exemption; paid-placement classification remains unresolved.
- Mobile location detection now requires an explicit action and affirmative disclosure. Removed automatic startup, resume and periodic GPS lookups; pull-to-refresh only refreshes content.
- Privacy text now covers Google Forms, geocoding recipients, provider payment records, retention limitations and deletion requests. The text still requires operational review and deployment.
- Existing Android notification channel preferences are preserved. Default API configuration now uses the production HTTPS endpoint.
- Mobile analysis passed; all 8 mobile tests passed, including accept/cancel/dismiss disclosure tests. All 15 web tests and TypeScript checks passed. Full web lint reports 20 pre-existing errors in unmodified picker/test files.

The original findings below are historical evidence. Already-remediated source findings do not describe the current code. Remaining work includes Console verification/closed testing, billing and moderation classification/controls, Data safety and ads declarations, deployed policies and device testing. No production deployment or Play upload has occurred.

## Remediated release validation

- Production build: PASSED in approximately 705 seconds, with shrinking enabled.
- Artifact: `build/app/outputs/bundle/release/app-release.aab`, 58,421,089 bytes; version 1.0.0 (1).
- SHA-256: `0A39D996B74C16CE6C0EC1B3B7EA04588A0CAA95BA7ABA45397F43400EBE7AE3`.
- JAR signature verified. Signer: `CN=Sanyuj Upload`, 3072-bit RSA, SHA256withRSA, not Android Debug. Jarsigner reports the expected self-signed/no-timestamp warnings and archive streaming-order warnings; bundletool validation passes.
- Official bundletool 1.18.3 validation: PASSED. Packaged manifest: app.sanyuj, minSdk 24, targetSdk 36, cleartext disabled, no debuggable=true.
- Bundle configuration requests `PAGE_ALIGNMENT_16K`. All eight arm64-v8a/x86_64 native libraries inspected have LOAD alignment of 16 KB or 64 KB. Actual 16 KB device/emulator execution and Play-generated APK verification remain release checks.
- Changed web files pass ESLint; TypeScript passes. Full web lint still has 20 pre-existing errors in AreaPicker, LocalityPicker and CommonJS tests, outside the edited files.
- Build warns about package_info_plus using the older Kotlin Gradle integration; it does not fail this release build.
- Signing material is local and ignored: `android/upload-keystore.jks` and `android/key.properties`. Securely back up both. Passwords were not printed or committed.

These technical results do not resolve the outstanding payments/UGC policy questions or fulfill the new-account closed-test requirement. The updated web policies must be deployed before submission. Nothing was uploaded to Play or deployed by this change.

## Original audit

This is a source, live-endpoint and local-validation audit, not a Google approval. No application behavior was changed or production data modified. The owner confirmed that placements will be charged offline and that a new personal Play developer account will be created.

## Confirmed submission blockers

| Finding | Evidence | Required action |
| --- | --- | --- |
| Production AAB does not build | Audit build failed at `:app:minifyReleaseWithR8` with missing Google Play Core split-install/task classes referenced by Flutter deferred-component code | Correct the release dependency/shrinker configuration for the actual use of deferred components; rerun the production build. Do not blindly suppress all R8 warnings. |
| Release uses debug signing | `android/app/build.gradle.kts:29` selects `signingConfigs.getByName("debug")` | Configure a private upload keystore, keep credentials out of Git, enable Play App Signing, and rebuild. Do not submit the audit build. |
| Target API is too low for ordinary new submissions | `android/app/build.gradle.kts:21` sets targetSdk 35, although compileSdk is 36 | Target API 36 and test Android 16 behavior. An approved Console extension, if available, is temporary and has not been established here. |
| Production account/testing prerequisites are incomplete | Owner has not yet created the personal developer account | Complete identity/contact/device verification and closed testing; apply for production access. |

New apps and updates ordinarily require API 36 from August 31, 2026. `compileSdk` alone does not satisfy this. [Target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en). Debug certificates are unsuitable for store release. [Android signing documentation](https://developer.android.com/studio/publish/app-signing).

For the planned new personal account, at least 12 testers must remain opted into a closed test continuously for 14 days before applying for production access. This is an application requirement, not a guarantee of immediate approval after 14 days. [Testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en), [device verification](https://support.google.com/googleplay/android-developer/answer/14316361?hl=en).

## Policy risks to resolve before submission

### 1. Offline payment for placements: high priority, classification unresolved

`lib/screens/requests/requests_screen.dart:209` sends users to Google Forms and promises follow-up. The live offer and notification forms collect contact details and proposed content. `../backend/supabase/migrations/20260926120000_admin_request_payments.sql:9` explicitly describes an amount charged for an offer or notification. The owner confirmed offline charging.

There is no Play Billing dependency or checkout in the mobile source. That alone does not prove a violation. However, this is an app-initiated route to purchase placement displayed inside the app, which can be treated as a digital service. Offline collection does not automatically exempt the flow. Determine the applicable treatment of this advertising-placement business model and distribution regions before release. If billing requirements apply, implement compliant billing or an eligible enrolled program, or remove the paid-placement solicitation path from the consumer app. Do not merely hide payment instructions behind a form or follow-up call. Purchases of the physical goods advertised are a separate issue. [Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en).

### 2. Location disclosure and collection: high priority

`lib/app_router.dart` wraps all tabs in `LocationSession`. `lib/widgets/location_session.dart:20` immediately starts a lookup, repeats it every two minutes while visible, and refreshes on resume. `lib/services/location.dart:66` requests permission; line 110 sends latitude/longitude to the web API. The server forwards coordinates to both Nominatim and Photon (`../webapp/src/app/api/geo/reverse/route.ts`).

No preceding in-app explanation of these transfers was found. Location also supplies area defaults for offers. The privacy wording says users choose location detection, while the initial request starts automatically. Prefer an explicit Use my location action with disclosure of purposes and recipients, plus manual selection. Assess whether coarse location is sufficient; fine location is currently requested. This is a disclosure/minimization risk, not a finding of background-location access: no background-location permission was found.

### 3. Privacy policy needs concrete retention and deletion coverage

The live policy is reachable and names Sanyuj. Source: `../webapp/src/app/privacy/page.tsx`. It mentions Firebase/Supabase and some location processing, but lacks a clear retention/deletion policy for current requests, tokens and payment records; backups merely follow unspecified configured periods. Google Forms and the two geocoding services are not identified by name. The deletion text addresses correspondence/published content without clearly covering unpublished requests or installation data. Define actual retention criteria, deletion handling, secure processing and developer contact details; describe the complete form-to-admin workflow and publication use accurately. Do not invent retention promises that operations cannot honor.

Google requires accurate disclosures, appropriate consent, a public policy, and retention/deletion information. [User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en).

### 4. Submitted content needs a moderation decision and controls

The live forms invite public contributions for later publication. Admin review is present, but approval by an administrator does not by itself remove user-generated-content obligations. No content-specific report or block action was found in mobile offer/notice detail views. General support opens an external Google Form. The forms have no visible Sanyuj terms acceptance or prohibited-content rules.

If submissions are published as contributed content, implement the required in-app reporting/blocking, submission terms acceptance and ongoing moderation. Confirm the correct classification if every item is instead independently authored editorial/advertising content. Review prohibited offers, scams, intellectual-property rights and content ratings in either case. [UGC moderation guidance](https://support.google.com/googleplay/android-developer/answer/12923286?hl=en).

### 5. Ads declarations and push campaign practices

The app has paid offer/banner placements even without an advertising SDK. Assess these against the Console ads declaration: native/banner advertising is covered; paid product placement has a distinction in Google's guidance. Do not answer No just because AdMob is absent. Clearly distinguish sponsored content where appropriate. [Prepare for review](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en).

The push service broadcasts arbitrary admin title/body/image content to registered devices. Review actual campaigns: paid advertising delivered outside the app can raise disruptive-ad/lockscreen-monetization concerns; an Android notification permission is not proof that every campaign is compliant. Disclose any location-based advertising use. [Ads policy](https://support.google.com/googleplay/android-developer/answer/9857753?hl=en).

## Functional issues and release hardening

| Item | Finding / action |
| --- | --- |
| Placeholder links | All five social URLs in `env/prod.json:12` onward point to `example.com`. Replace with real profiles or remove the buttons. |
| Notification preferences | `android/app/src/main/kotlin/app/sanyuj/MainActivity.kt:21` deletes/recreates the channel whenever its importance is below HIGH. Stop attempting to raise an existing channel's importance; respect settings and verify denied/silent states on-device. This is a code concern, not a demonstrated device-test failure. |
| Push tap behavior | No `onMessageOpenedApp`, initial-message routing or local notification response callback was found. Check that taps reach the relevant content, especially from terminated state. |
| Build configuration | Plain release builds can inherit the local HTTP API default in `lib/config/app_config.dart`. Require the production defines and fail release builds with local/HTTP configuration. |
| Version gate | Live Android version endpoint reports latest/minimum 1.0.0 and an empty download URL. It does not currently block version 1.0.0. Set a valid Play URL before raising minimum/latest versions; a forced update with no usable destination can trap reviewers/users. |
| Fonts/offline launch | Google Fonts runtime use exists and no bundled font declaration was found. Verify cold offline start and font-download failure behavior. |
| Unused SDK surface | `image_picker` remains a dependency although the current request flow uses external Forms. Remove unused dependencies after verifying other usage. |
| Production migrations | Local tests pass, but they do not establish that production retirement, Auth settings, storage cleanup or all migrations were applied. Follow the backend rollout documents and verify deployed access controls. |

## Data safety preparation

Do not claim that the app collects no data simply because there is no login. Build final declarations from this inventory and the SDK documentation. Collection, sharing and service-provider exceptions are separate decisions. Ephemeral location processing needs validation against actual logging and recipient retention. [Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).

| Observed flow | Review for declaration |
| --- | --- |
| GPS coordinates sent to web API and two geocoders; area queries to Supabase | Approximate/precise location, functionality/personalization, and advertising purpose if used for paid offer targeting |
| FCM delivery token, platform, version and timestamps | Device or other IDs; verify Firebase installation/SDK collection and communication/marketing purposes |
| Google Forms collect names, contact details, locality and submission text | Privacy policy must cover the workflow; determine declaration scope for the external-browser integration rather than treating it as an in-app native form |
| Admin stores request images, notes, amount and paid/unpaid status | Review related personal data, content/images and purchase records; distinguish offline administrator entry from mobile collection |
| Hosting, geocoding and SDK network traffic | Confirm IP/log retention and provider use; do not infer no collection from absence of an analytics SDK |

Public account creation is absent from current mobile routes. An in-app account-deletion button is therefore not automatically required for this build. Historical accounts/data still need the promised retirement verified; anonymous device registrations do not remove privacy obligations.

## Verified during this audit

- Flutter analyzer: passed, no issues.
- Existing Flutter tests: all 5 passed (models, dates, filter layout and navigation).
- Backend `npm.cmd test`: disposable migration/access-control suite passed; all 5 retirement-script tests passed. No production writes occurred.
- HTTPS privacy, terms and help pages: HTTP 200 and content inspected.
- All three production Google Forms: HTTP 200; visible fields inspected without submitting forms.
- Production anonymous reads of active ads, notices and content categories: HTTP 200, at least one item in each. This does not verify every RPC, image, content item or permission rule.
- Android version API: HTTP 200; no forced update for 1.0.0.
- Manifest source and generated release merge: no SMS, contacts, background location, broad media/storage, accessibility, package-install or advertising-ID permission observed. Release has targetSdk 35, cleartext disabled, and no explicit debuggable=true. Recheck the final packaged manifest after fixing the build.
- Local production bundle validation: see final build results below.

## Original release build results (before remediation)

Command: `flutter build appbundle --release --no-pub --dart-define-from-file=env/prod.json` (invoked through the installed Flutter tool snapshot to avoid a sandboxed SDK-cache access issue).

**FAILED**, exit 1 after approximately 291 seconds. `:app:minifyReleaseWithR8` reported missing `com.google.android.play.core.splitcompat.SplitCompatApplication`, split-install types, and `com.google.android.play.core.tasks` types. References originate in Flutter's `FlutterPlayStoreSplitApplication` and `PlayStoreDeferredComponentManager`. The generated diagnostic is `build/app/outputs/mapping/release/missing_rules.txt`. Investigate the keep rules and whether optional deferred-component code is being retained unnecessarily; the diagnostic suggestions are not a substitute for verifying runtime dependencies.

No release AAB was produced. Intermediate Dart `app.so` LOAD segments showed 64 KB alignment for arm64-v8a/x86_64 and 16 KB for armeabi-v7a. This is only a partial check: Flutter/plugin native libraries, final ZIP alignment and 16 KB runtime compatibility remain unverified. No Play upload, pre-launch report, signing-certificate inspection of a final bundle, or physical-device end-to-end test was possible from this result.

## Remaining Play Console and device checks

1. Create/verify the intended developer account and permanently choose `app.sanyuj` before first upload.
2. Resolve signing, API level and the policy risks above; build a fresh production AAB with a unique version code.
3. Verify 64-bit native libraries, 16 KB ELF/packaging alignment, and runtime behavior on a 16 KB device/emulator. SDK versions alone are not proof. [16 KB requirements](https://developer.android.com/guide/practices/page-sizes).
4. Install through internal testing; test Android 7 (minSdk 24) and current Android, small screens, large fonts, rotation, edge-to-edge insets, back navigation, offline/slow network and all permission denial/revocation cases.
5. Exercise Home, Offerly, Notify, filters, empty/error states, images, external links, phone/email actions, form return, push delivery/taps and update prompts. No complete physical-device walkthrough was performed in this audit.
6. Complete privacy/Data safety, ads, target audience, IARC rating, app access and every applicable Console declaration. Public browsing should not require reviewer credentials; give a populated sample area and navigation instructions.
7. Prepare truthful screenshots, icon, feature graphic, descriptions, support email and country availability. Do not advertise retired account/directory functionality. Ensure content and listings match the actual audience.
8. Run the required closed test with real engagement; collect feedback, fix failures, review the pre-launch report and apply for production access.
9. Confirm live content moderation, support/deletion handling and production backend availability before submitting for review.

Approval remains Google's decision. Passing local tests is useful evidence but does not certify policy compliance or store readiness.
