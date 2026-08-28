import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'providers.dart';
import 'theme/app_theme.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/onboarding_screen.dart';
import 'screens/business/setup_screen.dart';
import 'screens/explore/explore_screen.dart';
import 'screens/home/home_screen.dart';
import 'screens/jobs/job_detail_screen.dart';
import 'screens/jobs/jobs_feed_screen.dart';
import 'screens/jobs/my_jobs_screen.dart';
import 'screens/jobs/post_job_screen.dart';
import 'screens/profile/edit_profile_screen.dart';
import 'screens/profile/profile_screen.dart';
import 'screens/shell/app_shell.dart';
import 'services/guest.dart';
import 'widgets/sanyuj_logo.dart';

GoRouter createRouter() {
  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: _AuthRefresh(),
    redirect: (context, state) {
      final session = Supabase.instance.client.auth.currentSession;
      final loc = state.matchedLocation;
      final publicRoutes = {'/splash', '/login'};
      final isPublic = publicRoutes.contains(loc);
      final guest = GuestSession.instance.isGuest;
      final authRequired = loc == '/post-job' || loc == '/profile/edit' || loc == '/business/setup';

      if (loc == '/splash') return null;
      if (loc == '/welcome') {
        if (session != null) return '/home';
        if (guest) return '/home';
        return '/login';
      }

      if (session == null) {
        if (guest) {
          if (authRequired) {
            return '/login?next=${Uri.encodeComponent(loc)}';
          }
          return null;
        }
        return isPublic ? null : '/login';
      }

      if (loc == '/login') return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (context, state) => const SplashScreen()),
      GoRoute(path: '/login', builder: (context, state) => LoginScreen(next: state.uri.queryParameters['next'])),
      GoRoute(path: '/onboarding', builder: (context, state) => const OnboardingScreen()),
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/home', builder: (context, state) => const HomeScreen()),
          GoRoute(path: '/jobs-feed', builder: (context, state) => const JobsFeedScreen()),
          GoRoute(path: '/my-jobs', builder: (context, state) => const MyJobsScreen()),
          GoRoute(path: '/explore', builder: (context, state) => const ExploreScreen()),
          GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
        ],
      ),
      GoRoute(path: '/post-job', builder: (context, state) => const PostJobScreen()),
      GoRoute(
        path: '/jobs/:id',
        builder: (context, state) => JobDetailScreen(jobId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/profile/edit', builder: (context, state) => const EditProfileScreen()),
      GoRoute(path: '/business/setup', builder: (context, state) => const BusinessSetupScreen()),
    ],
  );
}

class _AuthRefresh extends ChangeNotifier {
  _AuthRefresh() {
    Supabase.instance.client.auth.onAuthStateChange.listen((_) => notifyListeners());
    GuestSession.instance.addListener(notifyListeners);
  }
}

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _boot());
  }

  Future<void> _boot() async {
    await Future<void>.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) {
      context.go(GuestSession.instance.isGuest ? '/home' : '/login');
      return;
    }
    await GuestSession.instance.clear();
    try {
      final profile = await ref.read(repoProvider).fetchProfile();
      if (!mounted) return;
      if (profile == null || !profile.onboardingComplete) {
        context.go('/onboarding');
      } else {
        context.go('/home');
      }
    } catch (_) {
      if (mounted) context.go('/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: const BoxDecoration(gradient: AppColors.heroGradient),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SanyujLogo(size: 112),
            SizedBox(height: 16),
            Text(
              'Sanyuj',
              style: TextStyle(
                color: Colors.white,
                fontSize: 36,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.5,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Trusted local help near you',
              style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}
