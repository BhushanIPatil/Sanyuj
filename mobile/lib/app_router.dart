import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'screens/offerly/offerly_screen.dart';
import 'screens/home/home_screen.dart';
import 'widgets/location_session.dart';
import 'screens/notifications/notifications_screen.dart';
import 'screens/shell/app_shell.dart';

Future<String> resolveInitialRoute() async => '/home';
GoRouter createRouter({
  String initialLocation = '/home',
  GlobalKey<NavigatorState>? navigatorKey,
}) => GoRouter(
  navigatorKey: navigatorKey,
  initialLocation: initialLocation,
  redirect: (context, state) =>
      [
        '/home',
        '/services',
        '/offerly',
        '/notifications',
      ].contains(state.uri.path)
      ? null
      : '/home',
  routes: [
    ShellRoute(
      builder: (context, state, child) =>
          LocationSession(child: AppShell(child: child)),
      routes: [
        GoRoute(path: '/home', builder: (context, state) => const HomeScreen()),
        GoRoute(
          path: '/services',
          builder: (context, state) => const NotificationsScreen(
            key: ValueKey('services'),
            services: true,
          ),
        ),
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
