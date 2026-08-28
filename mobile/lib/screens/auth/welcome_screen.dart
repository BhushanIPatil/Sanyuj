import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../config/app_config.dart';
import '../../services/guest.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/sanyuj_logo.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgApp,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
          child: Column(
            children: [
              const Spacer(flex: 2),
              const SanyujLogo(size: 104),
              const SizedBox(height: 20),
              Text(
                'Sanyuj',
                style: GoogleFonts.nunito(fontSize: 28, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text(
                'One account for everything — find trusted local help, or list your own business for free.',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13.5, color: AppColors.inkSoft, height: 1.5),
              ),
              const Spacer(flex: 3),
              PrimaryButton(label: 'Get started', onPressed: () => context.go('/login')),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => context.go('/login?mode=login'),
                child: Text(
                  'I already have an account',
                  style: GoogleFonts.nunito(fontWeight: FontWeight.w700, color: AppColors.blueDeep),
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
                  style: GoogleFonts.nunito(fontWeight: FontWeight.w700, color: AppColors.inkSoft),
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                alignment: WrapAlignment.center,
                children: [
                  const Text("By continuing you agree to Sanyuj's ", style: TextStyle(fontSize: 12, color: AppColors.inkFaint)),
                  GestureDetector(
                    onTap: () => launchUrl(Uri.parse(AppConfig.termsUrl)),
                    child: const Text('Terms', style: TextStyle(fontSize: 12, color: AppColors.blueDeep, fontWeight: FontWeight.w700)),
                  ),
                  const Text(' & ', style: TextStyle(fontSize: 12, color: AppColors.inkFaint)),
                  GestureDetector(
                    onTap: () => launchUrl(Uri.parse(AppConfig.privacyUrl)),
                    child: const Text('Privacy Policy', style: TextStyle(fontSize: 12, color: AppColors.blueDeep, fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
