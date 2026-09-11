/// App configuration.
///
/// Values come from compile-time defines (preferred), with safe defaults for local runs.
///
/// Local:
///   flutter run -d DEVICE --dart-define-from-file=env/dev.json
///
/// Play Store / release:
///   flutter build appbundle --release --dart-define-from-file=env/prod.json
///
/// Edit `env/dev.json` / `env/prod.json` instead of pasting long --dart-define flags.
class AppConfig {
  static const supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://kjfempugmonrlpdtpvju.supabase.co',
  );

  /// Same as webapp `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public client key (RLS-protected).
  static const supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZmVtcHVnbW9ucmxwZHRwdmp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMjE1OTEsImV4cCI6MjEwMjg5NzU5MX0.FBhjSauTD4rlthQkrd0VyBJEeKnhrgHTM0rixW_bysA',
  );

  /// Notification APIs hosted by the webapp (Vercel in production).
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.161.151.171:3000',
  );

  static const privacyUrl = String.fromEnvironment(
    'PRIVACY_URL',
    defaultValue: 'https://sanyuj.vercel.app/privacy',
  );

  static const termsUrl = String.fromEnvironment(
    'TERMS_URL',
    defaultValue: 'https://sanyuj.vercel.app/terms',
  );

  static const helpUrl = String.fromEnvironment(
    'HELP_URL',
    defaultValue: 'https://sanyuj.vercel.app/help',
  );

  /// Play Store listing. Update `PLAY_STORE_URL` in env/*.json when the listing is live.
  static const playStoreUrl = String.fromEnvironment(
    'PLAY_STORE_URL',
    defaultValue: 'https://play.google.com/store/apps/details?id=app.sanyuj',
  );

  static const supportEmail = String.fromEnvironment(
    'SUPPORT_EMAIL',
    defaultValue: 'support@sanyuj.app',
  );

  /// Keep in sync with `version:` in pubspec.yaml (name part before `+`).
  static const appVersion = '1.0.0';

  static bool get isConfigured =>
      supabaseUrl.isNotEmpty &&
      !supabaseUrl.contains('YOUR_PROJECT') &&
      supabaseAnonKey.isNotEmpty &&
      supabaseAnonKey != 'your_anon_key';
}
