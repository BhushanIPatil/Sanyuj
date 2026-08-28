import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../theme/app_theme.dart';
import '../../widgets/sanyuj_logo.dart';

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  // Matches HTML bottom nav order: New Jobs · My Jobs · Home FAB · Explore · Profile
  static const _tabs = [
    ('/jobs-feed', 'New Jobs', Icons.work_outline_rounded),
    ('/my-jobs', 'My Jobs', Icons.calendar_today_outlined),
    ('/home', 'Home', Icons.home_rounded),
    ('/explore', 'Explore', Icons.search_rounded),
    ('/profile', 'Profile', Icons.person_outline_rounded),
  ];

  int _index(String loc) {
    for (var i = 0; i < _tabs.length; i++) {
      if (loc.startsWith(_tabs[i].$1)) return i;
    }
    return 2;
  }

  void _postJob(BuildContext context) {
    final signedIn = Supabase.instance.client.auth.currentSession != null;
    if (!signedIn) {
      context.push('/login?next=/post-job');
      return;
    }
    context.push('/post-job');
  }

  @override
  Widget build(BuildContext context) {
    final loc = GoRouterState.of(context).matchedLocation;
    final idx = _index(loc);
    final wide = MediaQuery.sizeOf(context).width >= 900;

    if (wide) {
      return Scaffold(
        backgroundColor: AppColors.bgPage,
        body: Row(
          children: [
            NavigationRail(
              selectedIndex: idx,
              onDestinationSelected: (i) => context.go(_tabs[i].$1),
              labelType: NavigationRailLabelType.all,
              backgroundColor: AppColors.bgApp,
              selectedIconTheme: const IconThemeData(color: AppColors.greenDeep),
              selectedLabelTextStyle: const TextStyle(color: AppColors.greenDeep, fontWeight: FontWeight.w700),
              leading: Padding(
                padding: const EdgeInsets.fromLTRB(12, 16, 12, 24),
                child: SanyujBrandRow(
                  logoSize: 44,
                  nameStyle: GoogleFonts.nunito(fontWeight: FontWeight.w800, fontSize: 18),
                ),
              ),
              trailing: Padding(
                padding: const EdgeInsets.all(12),
                child: FilledButton(
                  onPressed: () => _postJob(context),
                  child: Text(Supabase.instance.client.auth.currentSession == null ? 'Log in to post' : 'Post a job'),
                ),
              ),
              destinations: [
                for (final t in _tabs)
                  NavigationRailDestination(icon: Icon(t.$3), label: Text(t.$2)),
              ],
            ),
            const VerticalDivider(width: 1, color: AppColors.line),
            Expanded(child: ColoredBox(color: AppColors.bgApp, child: child)),
          ],
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.bgApp,
      body: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            Positioned.fill(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 88),
                child: child,
              ),
            ),
            Positioned(
              left: 16,
              right: 16,
              bottom: 14 + MediaQuery.paddingOf(context).bottom,
              child: _FloatingBottomNav(
                index: idx,
                onSelect: (i) => context.go(_tabs[i].$1),
                tabs: _tabs,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FloatingBottomNav extends StatelessWidget {
  const _FloatingBottomNav({
    required this.index,
    required this.onSelect,
    required this.tabs,
  });

  final int index;
  final ValueChanged<int> onSelect;
  final List<(String, String, IconData)> tabs;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 70,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.line),
        boxShadow: AppColors.popShadow,
      ),
      child: Row(
        children: [
          for (var i = 0; i < tabs.length; i++)
            Expanded(
              child: i == 2
                  ? _HomeFab(selected: index == 2, onTap: () => onSelect(2))
                  : _NavItem(
                      label: tabs[i].$2,
                      icon: tabs[i].$3,
                      selected: index == i,
                      onTap: () => onSelect(i),
                    ),
            ),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.greenSoft : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 20, color: selected ? AppColors.greenDeep : AppColors.inkFaint),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                fontSize: 9.5,
                fontWeight: FontWeight.w700,
                color: selected ? AppColors.greenDeep : AppColors.inkFaint,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HomeFab extends StatelessWidget {
  const _HomeFab({required this.selected, required this.onTap});

  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Center(
        child: Transform.translate(
          offset: const Offset(0, -18),
          child: Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              gradient: AppColors.heroGradient,
              borderRadius: BorderRadius.circular(18),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF1F8E7B).withValues(alpha: 0.40),
                  blurRadius: 22,
                  offset: const Offset(0, 10),
                ),
              ],
              border: selected ? Border.all(color: Colors.white, width: 2) : null,
            ),
            child: const Icon(Icons.home_rounded, color: Colors.white, size: 24),
          ),
        ),
      ),
    );
  }
}
