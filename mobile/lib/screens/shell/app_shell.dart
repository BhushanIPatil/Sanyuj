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
    ('/offerly', 'Offerly', Icons.local_offer_outlined),
    ('/notifications', 'Notify', Icons.notifications_outlined),
    ('/home', 'Home', Icons.home_outlined),
    ('/services', 'Services', Icons.home_repair_service_outlined),
    ('/requests', 'Requests', Icons.add_comment_outlined),
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
            body: SafeArea(bottom: false, child: child),
            bottomNavigationBar: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 14),
                child: _FloatingBottomNav(
                  index: idx,
                  onSelect: (i) => context.go(_tabs[i].$1),
                  tabs: _tabs,
                ),
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
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var i = 0; i < tabs.length; i++)
            Expanded(
              child: _NavItem(
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
          color: selected ? AppColors.blueDeep : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 20,
              color: selected ? Colors.white : AppColors.inkSoft,
            ),
            const SizedBox(height: 3),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 9.5,
                fontWeight: FontWeight.w700,
                color: selected ? Colors.white : AppColors.inkSoft,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
