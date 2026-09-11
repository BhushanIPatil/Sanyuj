import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'screens/offerly/offerly_screen.dart';
import 'screens/notifications/notifications_screen.dart';
import 'screens/shell/app_shell.dart';

Future<String> resolveInitialRoute() async => '/offerly';
GoRouter createRouter({
  String initialLocation = '/offerly',
  GlobalKey<NavigatorState>? navigatorKey,
}) => GoRouter(
  navigatorKey: navigatorKey,
  initialLocation: initialLocation,
  redirect: (context, state) =>
      ['/offerly', '/notifications'].contains(state.uri.path)
      ? null
      : '/offerly',
  routes: [
    ShellRoute(
      builder: (context, state, child) => AppShell(child: child),
      routes: [
        GoRoute(
          path: '/offerly',
          builder: (context, state) => const OfferlyScreen(),
        ),
        GoRoute(
          path: '/notifications',
          builder: (context, state) => const NotificationsScreen(),
        ),
      ],
    ),
  ],
);
