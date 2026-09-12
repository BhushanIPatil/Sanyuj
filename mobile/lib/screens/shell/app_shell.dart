import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/sanyuj_logo.dart';

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  static const _tabs = [
    ('/services', 'Services', Icons.home_repair_service_rounded),
    ('/offerly', 'Offerly', Icons.local_offer_rounded),
    ('/home', 'Home', Icons.home_rounded),
    ('/notifications', 'Notify', Icons.notifications_rounded),
  ];

  static const _homeIndex = 2;

  int _index(String loc) {
    for (var i = 0; i < _tabs.length; i++) {
      if (loc.startsWith(_tabs[i].$1)) return i;
    }
    return _homeIndex;
  }

  Future<void> _onBack(BuildContext context) async {
    final leave = await showLeaveAppDialog(context);
    if (leave == true && context.mounted) {
      SystemNavigator.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final loc = GoRouterState.of(context).matchedLocation;
    final idx = _index(loc);
    final wide = MediaQuery.sizeOf(context).width >= 900;

    final shell = wide
        ? Scaffold(
            backgroundColor: AppColors.bgPage,
            body: Row(
              children: [
                NavigationRail(
                  selectedIndex: idx,
                  onDestinationSelected: (i) => context.go(_tabs[i].$1),
                  labelType: NavigationRailLabelType.all,
                  minWidth: 92,
                  backgroundColor: AppColors.bgApp,
                  selectedIconTheme: const IconThemeData(
                    color: AppColors.greenDeep,
                  ),
                  selectedLabelTextStyle: const TextStyle(
                    color: AppColors.greenDeep,
                    fontWeight: FontWeight.w700,
                  ),
                  leading: const Padding(
                    padding: EdgeInsets.fromLTRB(12, 16, 12, 24),
                    child: SanyujBrandRow(logoSize: 52),
                  ),
                  destinations: [
                    for (final t in _tabs)
                      NavigationRailDestination(
                        icon: Icon(t.$3),
                        label: Text(t.$2),
                      ),
                  ],
                ),
                const VerticalDivider(width: 1, color: AppColors.line),
                Expanded(
                  child: ColoredBox(color: AppColors.bgApp, child: child),
                ),
              ],
            ),
          )
        : Scaffold(
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
                      homeIndex: _homeIndex,
                      onSelect: (i) => context.go(_tabs[i].$1),
                      tabs: _tabs,
                    ),
                  ),
                ],
              ),
            ),
          );

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        _onBack(context);
      },
      child: shell,
    );
  }
}

class _FloatingBottomNav extends StatelessWidget {
  const _FloatingBottomNav({
    required this.index,
    required this.homeIndex,
    required this.onSelect,
    required this.tabs,
  });

  final int index;
  final int homeIndex;
  final ValueChanged<int> onSelect;
  final List<(String, String, IconData)> tabs;

  @override
  Widget build(BuildContext context) {
    final left = <(int, (String, String, IconData))>[];
    final right = <(int, (String, String, IconData))>[];
    for (var i = 0; i < tabs.length; i++) {
      if (i == homeIndex) continue;
      if (i < homeIndex) {
        left.add((i, tabs[i]));
      } else {
        right.add((i, tabs[i]));
      }
    }

    return Container(
      height: 70,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.line),
        boxShadow: AppColors.popShadow,
      ),
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.bottomCenter,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: Row(
                  children: [
                    for (final item in left)
                      Expanded(
                        child: _NavItem(
                          label: item.$2.$2,
                          icon: item.$2.$3,
                          selected: index == item.$1,
                          onTap: () => onSelect(item.$1),
                          margin: const EdgeInsets.fromLTRB(4, 8, 2, 8),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 62),
              Expanded(
                child: Row(
                  children: [
                    for (final item in right)
                      Expanded(
                        child: _NavItem(
                          label: item.$2.$2,
                          icon: item.$2.$3,
                          selected: index == item.$1,
                          onTap: () => onSelect(item.$1),
                          margin: const EdgeInsets.fromLTRB(2, 8, 4, 8),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
          Positioned(
            top: -18,
            child: _HomeFab(
              selected: index == homeIndex,
              onTap: () => onSelect(homeIndex),
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
    this.margin = const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  final EdgeInsets margin;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        margin: margin,
        decoration: BoxDecoration(
          color: selected ? AppColors.greenSoft : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 20,
              color: selected ? AppColors.greenDeep : AppColors.inkFaint,
            ),
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
      child: Container(
        width: 54,
        height: 54,
        decoration: BoxDecoration(
          color: AppColors.blueDeep,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF1D5FA0).withValues(alpha: 0.30),
              blurRadius: 10,
              offset: const Offset(0, 5),
              spreadRadius: -2,
            ),
          ],
          border: selected ? Border.all(color: Colors.white, width: 2) : null,
        ),
        child: const Icon(Icons.home_rounded, color: Colors.white, size: 24),
      ),
    );
  }
}
