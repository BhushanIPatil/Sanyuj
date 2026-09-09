import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../config/app_config.dart';
import '../../services/guest.dart';
import '../../theme/app_theme.dart';
import '../../widgets/sanyuj_logo.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: AppColors.logoGradient),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
            child: Column(
              children: [
                const Spacer(flex: 2),
                const SanyujTransparentLogo(size: 168),
                const SizedBox(height: 18),
                Text(
                  'One account for everything — find trusted local help, or list your own business for free.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13.5, color: Colors.white.withValues(alpha: 0.88), height: 1.5),
                ),
                const Spacer(flex: 3),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: FilledButton(
                    onPressed: () => context.go('/login'),
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: AppColors.blueDeep,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppColors.radiusMd)),
                      textStyle: GoogleFonts.nunito(fontWeight: FontWeight.w800, fontSize: 15),
                    ),
                    child: const Text('Get started'),
                  ),
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () => context.go('/login?mode=login'),
                  child: Text(
                    'I already have an account',
                    style: GoogleFonts.nunito(fontWeight: FontWeight.w700, color: Colors.white),
                  ),
                ),
                const SizedBox(height: 4),
                TextButton(
                  onPressed: () async {
                    await GuestSession.instance.enter();
                    if (context.mounted) context.go('/home');
                  },
                  child: Text(
                    'Continue as guest',
                    style: GoogleFonts.nunito(fontWeight: FontWeight.w700, color: Colors.white.withValues(alpha: 0.82)),
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  alignment: WrapAlignment.center,
                  children: [
                    Text("By continuing you agree to Sanyuj's ", style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.7))),
                    GestureDetector(
                      onTap: () => launchUrl(
                        Uri.parse(AppConfig.termsUrl),
                        mode: LaunchMode.externalApplication,
                      ),
                      child: const Text('Terms', style: TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w700)),
                    ),
                    Text(' & ', style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.7))),
                    GestureDetector(
                      onTap: () => launchUrl(
                        Uri.parse(AppConfig.privacyUrl),
                        mode: LaunchMode.externalApplication,
                      ),
                      child: const Text('Privacy Policy', style: TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Text(
                  'App Version: ${AppConfig.appVersion}',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.white.withValues(alpha: 0.55),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
