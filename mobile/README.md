# Sanyuj Mobile (Flutter)

Single codebase for **Android**, **iOS**, **Web**, and **Windows**.

## Config (no long dart-define flags)

Edit these files once:

| File | Use |
|------|-----|
| `env/dev.json` | Local phone / Chrome → your PC IP + port 3000 |
| `env/prod.json` | Play Store / production → deployed webapp HTTPS URL |
| `lib/config/app_config.dart` | Defaults if you run plain `flutter run` |

Anon key is a **public** client key (same as webapp `NEXT_PUBLIC_*`). Never put the **service role** key in the app.

### Day to day

```bash
# Start webapp first
cd ../webapp && npm run dev

# Phone (USB) — uses env/dev.json
cd ../mobile
flutter run -d PVZXAQ5TPZJVMJKJ --dart-define-from-file=env/dev.json

# Or Chrome
flutter run -d chrome --dart-define-from-file=env/dev.json
```

Or use VS Code / Cursor launch configs in `.vscode/launch.json`.

If your PC IP changes, update `API_BASE_URL` in `env/dev.json` only.

### Play Store release

1. Set `API_BASE_URL` in `env/prod.json` to your live webapp (e.g. `https://sanyuj.vercel.app`)
2. Build:

```bash
flutter build appbundle --release --dart-define-from-file=env/prod.json
```

Those values are **baked into the binary** at build time. Users do not need your PC or localhost.

## Play Store checklist

- Package: `app.sanyuj`, targetSdk 36
- Offerly and Notifications only; no public accounts, profiles, or directory
- Help, Privacy, and Terms links in the app menu
- Production `API_BASE_URL` must be HTTPS
- Sign with your upload keystore (not debug)

See [the retirement rollout](../backend/OFFERS_NOTIFICATIONS.md) before releasing. Push registration stores only token, platform, app version and timestamps. Device name/hardware identifiers and account-linked tracking are removed.

Public form links have defaults in `lib/config/app_config.dart`, so they also work with plain `flutter run`. Configure `OFFER_REQUEST_FORM_URL`, `NOTIFICATION_REQUEST_FORM_URL`, and `CONTACT_FORM_URL` in `env/dev.json` and `env/prod.json` alongside the other app links. Commands and launch configurations load only the selected environment file. Fully stop and rebuild the app after changing these compile-time values; hot reload does not update them.

## Public links

Social links have been removed. `CONTACT_FORM_URL` controls support contact; `FAQ_URL` controls the FAQ link. Rebuild after changing compile-time configuration.

## Android release signing

Release builds target API 36 and require an upload key; there is no debug-signing fallback.
Local signing uses ignored files `android/key.properties` and `android/upload-keystore.jks`.
Back up both securely outside this computer before the first upload. Never commit or share their contents.
Enable Play App Signing in Play Console; keep using the same upload key for updates.

On another trusted build machine, restore the key and create `android/key.properties` with:

```properties
storeFile=upload-keystore.jks
storePassword=<private password>
keyAlias=upload
keyPassword=<private password>
```

The storeFile path is relative to `android/`. Build with the production environment command above.
The September 28, 2026 remediation generated a new RSA upload key locally for the first release.
This does not enroll the app in Play App Signing or publish the app.

Mobile location detection is user-initiated. Viewing is free; provider publication charges are arranged offline.
The provider fee wording is a disclosure, not a Google Play billing-policy exemption. See the readiness audit for remaining release checks.
