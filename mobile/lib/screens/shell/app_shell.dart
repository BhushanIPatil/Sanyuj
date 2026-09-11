import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../config/app_config.dart';
import '../../widgets/common.dart';

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) {
    final index = GoRouterState.of(context).uri.path == '/notifications'
        ? 1
        : 0;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (!didPop &&
            await showLeaveAppDialog(context) == true &&
            context.mounted) {
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Sanyuj'),
          actions: [
            PopupMenuButton<String>(
              tooltip: 'Help and information',
              onSelected: (url) async {
                await launchUrl(
                  Uri.parse(url),
                  mode: LaunchMode.externalApplication,
                );
              },
              itemBuilder: (_) => const [
                PopupMenuItem(value: AppConfig.helpUrl, child: Text('Help')),
                PopupMenuItem(
                  value: AppConfig.privacyUrl,
                  child: Text('Privacy'),
                ),
                PopupMenuItem(value: AppConfig.termsUrl, child: Text('Terms')),
              ],
            ),
          ],
        ),
        body: SafeArea(child: child),
        bottomNavigationBar: NavigationBar(
          selectedIndex: index,
          onDestinationSelected: (i) =>
              context.go(i == 0 ? '/offerly' : '/notifications'),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.local_offer_outlined),
              selectedIcon: Icon(Icons.local_offer),
              label: 'Offerly',
            ),
            NavigationDestination(
              icon: Icon(Icons.notifications_outlined),
              selectedIcon: Icon(Icons.notifications),
              label: 'Notifications',
            ),
          ],
        ),
      ),
    );
  }
}
