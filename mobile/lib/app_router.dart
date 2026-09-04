import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'screens/auth/login_screen.dart';
import 'screens/auth/onboarding_screen.dart';
import 'screens/business/setup_screen.dart';
import 'screens/business/coverage_screen.dart';
import 'screens/explore/explore_screen.dart';
import 'screens/home/home_screen.dart';
import 'screens/home/live_nearby_screen.dart';
import 'screens/jobs/job_detail_screen.dart';
import 'screens/jobs/jobs_feed_screen.dart';
import 'screens/jobs/my_jobs_screen.dart';
import 'screens/jobs/post_job_screen.dart';
import 'screens/profile/edit_profile_screen.dart';
import 'screens/profile/profile_screen.dart';
import 'screens/shell/app_shell.dart';
import 'services/guest.dart';

/// Resolves the first route before the app UI renders (native splash stays visible).
Future<String> resolveInitialRoute() async {
  final session = Supabase.instance.client.auth.currentSession;
  if (session == null) {
    await GuestSession.instance.enter();
    return '/home';
  }
  await GuestSession.instance.clear();
  try {
    final row = await Supabase.instance.client
        .from('profiles')
        .select('onboarding_complete')
        .eq('id', session.user.id)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .maybeSingle();
    if (row == null || row['onboarding_complete'] != true) {
      return '/onboarding';
    }
  } catch (_) {
    // Fall through to home.
  }
  return '/home';
}

GoRouter createRouter({
  String initialLocation = '/home',
  GlobalKey<NavigatorState>? navigatorKey,
}) {
  return GoRouter(
    navigatorKey: navigatorKey,
    initialLocation: initialLocation,
    refreshListenable: _AuthRefresh(),
    redirect: (context, state) {
      final session = Supabase.instance.client.auth.currentSession;
      final loc = state.matchedLocation;
      final authRequired = loc == '/post-job' || loc == '/profile/edit' || loc == '/business/setup' || loc == '/business/coverage';

      if (session == null) {
        if (authRequired) {
          return '/login?next=${Uri.encodeComponent(loc)}';
        }
        return null;
      }

      if (loc == '/login') {
        final next = state.uri.queryParameters['next'];
        if (next != null && next.startsWith('/')) return next;
        return '/home';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => LoginScreen(next: state.uri.queryParameters['next'])),
      GoRoute(path: '/onboarding', builder: (context, state) => const OnboardingScreen()),
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/home', builder: (context, state) => const HomeScreen()),
          GoRoute(path: '/jobs-feed', builder: (context, state) => const JobsFeedScreen()),
          GoRoute(path: '/my-jobs', builder: (context, state) => const MyJobsScreen()),
          GoRoute(
            path: '/explore',
            builder: (context, state) => ExploreScreen(
              initialCategoryId: state.uri.queryParameters['category'],
            ),
          ),
          GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
        ],
      ),
      GoRoute(
        path: '/post-job',
        builder: (context, state) => PostJobScreen(jobId: state.uri.queryParameters['edit']),
      ),
      GoRoute(
        path: '/jobs/:id',
        builder: (context, state) => JobDetailScreen(jobId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/live-nearby', builder: (context, state) => const LiveNearbyScreen()),
      GoRoute(path: '/profile/edit', builder: (context, state) => const EditProfileScreen()),
      GoRoute(path: '/business/setup', builder: (context, state) => const BusinessSetupScreen()),
      GoRoute(path: '/business/coverage', builder: (context, state) => const BusinessCoverageScreen()),
    ],
  );
}

class _AuthRefresh extends ChangeNotifier {
  _AuthRefresh() {
    Supabase.instance.client.auth.onAuthStateChange.listen((_) => notifyListeners());
    GuestSession.instance.addListener(notifyListeners);
  }
}
