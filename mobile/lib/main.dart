import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app_router.dart';
import 'config/app_config.dart';
import 'services/app_version_api.dart';
import 'services/guest.dart';
import 'services/push_notifications.dart';
import 'theme/app_theme.dart';
import 'widgets/update_app_dialog.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

  await Future.wait([
    GuestSession.instance.load(),
    Supabase.initialize(
      url: AppConfig.supabaseUrl,
      publishableKey: AppConfig.supabaseAnonKey,
    ),
  ]);

  // Keep the native splash short: skip network/permission work until the first frame.
  final initialRoute = await resolveInitialRoute();
  runApp(ProviderScope(child: SanyujApp(initialRoute: initialRoute)));
}

class SanyujApp extends StatefulWidget {
  const SanyujApp({super.key, required this.initialRoute});

  final String initialRoute;

  @override
  State<SanyujApp> createState() => _SanyujAppState();
}

class _SanyujAppState extends State<SanyujApp> {
  final _navigatorKey = GlobalKey<NavigatorState>();
  late final _router = createRouter(
    initialLocation: widget.initialRoute,
    navigatorKey: _navigatorKey,
  );
  var _updateChecked = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(PushNotifications.init());
      unawaited(_redirectIfOnboardingNeeded());
      unawaited(_checkAppUpdate());
    });
  }

  Future<void> _redirectIfOnboardingNeeded() async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) return;
    try {
      final row = await Supabase.instance.client
          .from('profiles')
          .select('onboarding_complete')
          .eq('id', session.user.id)
          .eq('is_active', true)
          .eq('is_deleted', false)
          .maybeSingle();
      if (row == null || row['onboarding_complete'] != true) {
        final ctx = _navigatorKey.currentContext;
        if (ctx != null && ctx.mounted) ctx.go('/onboarding');
      }
    } catch (_) {
      // Stay on the first screen if the profile lookup fails.
    }
  }

  Future<void> _checkAppUpdate() async {
    if (_updateChecked) return;
    _updateChecked = true;

    try {
      final remote = await AppVersionApi().fetchActive();
      if (remote == null) return;

      final kind = resolveAppUpdateKind(
        currentVersion: AppConfig.appVersion,
        remote: remote,
      );
      if (kind == AppUpdateKind.none) return;

      final ctx = _navigatorKey.currentContext;
      if (ctx == null || !ctx.mounted) return;

      await showUpdateAppDialog(
        ctx,
        version: remote,
        kind: kind,
        currentVersion: AppConfig.appVersion,
      );
    } catch (_) {
      // Fail open — never block launch if the version API is unreachable.
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Sanyuj',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      routerConfig: _router,
    );
  }
}
