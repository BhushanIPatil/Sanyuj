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
  // Public form defaults also work with plain `flutter run`. Build defines can
  // override them via env/dev.json or env/prod.json.
  static const contactFormUrl = String.fromEnvironment(
    'CONTACT_FORM_URL',
    defaultValue: 'https://docs.google.com/forms/d/e/1FAIpQLSdBK_amONuJuecRVjdQT-wWq8JYtrS0kD-eYK6T4PP0qEijcw/viewform?usp=publish-editor',
  );
  static const offerRequestFormUrl = String.fromEnvironment(
    'OFFER_REQUEST_FORM_URL',
    defaultValue: 'https://docs.google.com/forms/d/e/1FAIpQLSdIaxil1Lq1RpBZlOln67wlKd_fngnQzpIAJRMRFufkESR5Qw/viewform?usp=publish-editor',
  );
  static const notificationRequestFormUrl = String.fromEnvironment(
    'NOTIFICATION_REQUEST_FORM_URL',
    defaultValue: 'https://docs.google.com/forms/d/e/1FAIpQLSdctJJWgDR9GsB9SDebzLeoFRMot6JqW9d692WGzyGzQ1FLlQ/viewform?usp=publish-editor',
  );

  static const supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://kjfempugmonrlpdtpvju.supabase.co',
  );

  /// Same as webapp `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public client key (RLS-protected).
  static const supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZmVtcHVnbW9ucmxwZHRwdmp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMjE1OTEsImV4cCI6MjEwMjg5NzU5MX0.FBhjSauTD4rlthQkrd0VyBJEeKnhrgHTM0rixW_bysA',
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

  static const aboutUrl = String.fromEnvironment(
    'ABOUT_URL',
    defaultValue: 'https://sanyuj.vercel.app/about',
  );

  /// Play Store listing. Update `PLAY_STORE_URL` in env/*.json when the listing is live.
  static const playStoreUrl = String.fromEnvironment(
    'PLAY_STORE_URL',
    defaultValue: 'https://play.google.com/store/apps/details?id=app.sanyuj',
  );

  // Placeholder links; set the official profiles in env/dev.json and env/prod.json.
  static const linkedinUrl = String.fromEnvironment(
    'LINKEDIN_URL',
    defaultValue: 'https://example.com/sanyuj/linkedin',
  );

  static const instagramUrl = String.fromEnvironment(
    'INSTAGRAM_URL',
    defaultValue: 'https://example.com/sanyuj/instagram',
  );

  static const xUrl = String.fromEnvironment(
    'X_URL',
    defaultValue: 'https://example.com/sanyuj/x',
  );

  static const facebookUrl = String.fromEnvironment(
    'FACEBOOK_URL',
    defaultValue: 'https://example.com/sanyuj/facebook',
  );

  static const youtubeUrl = String.fromEnvironment(
    'YOUTUBE_URL',
    defaultValue: 'https://example.com/sanyuj/youtube',
  );

  static const faqUrl = String.fromEnvironment(
    'FAQ_URL',
    defaultValue: 'https://sanyuj.vercel.app/faq',
  );

  /// Keep in sync with `version:` in pubspec.yaml (name part before `+`).
  static const appVersion = '1.0.0';

  static bool get isConfigured =>
      supabaseUrl.isNotEmpty &&
      !supabaseUrl.contains('YOUR_PROJECT') &&
      supabaseAnonKey.isNotEmpty &&
      supabaseAnonKey != 'your_anon_key';
}
