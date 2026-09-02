import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app_router.dart';
import 'config/app_config.dart';
import 'services/guest.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await GuestSession.instance.load();
  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    publishableKey: AppConfig.supabaseAnonKey,
  );

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
  late final _router = createRouter(initialLocation: widget.initialRoute);

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
