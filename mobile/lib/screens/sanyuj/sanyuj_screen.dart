import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/app_config.dart';
import '../../theme/app_theme.dart';
import '../../widgets/ad_detail_sheet.dart';
import '../../widgets/sanyuj_logo.dart';

class SanyujScreen extends StatelessWidget {
  const SanyujScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
      children: [
        Row(
          children: [
            const SanyujBrandRow(logoSize: 56),
            const SizedBox(width: 14),
            Text(
              'Sanyuj',
              style: GoogleFonts.nunito(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: AppColors.blueDeep,
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        Text(
          'Your neighbourhood, connected.',
          style: GoogleFonts.nunito(fontSize: 26, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        const Text(
          'Get to know Sanyuj, find answers, or get in touch.',
          style: TextStyle(color: AppColors.inkSoft, height: 1.5),
        ),
        const SizedBox(height: 28),
        _heading('Explore & connect'),
        _link(
          context,
          Icons.info_outline_rounded,
          'About Sanyuj',
          'A little more about your local community app.',
          AppConfig.aboutUrl,
        ),
        _link(
          context,
          Icons.mail_outline_rounded,
          'Contact Us',
          'Send us a message. We would love to hear from you.',
          AppConfig.contactFormUrl,
        ),
        _link(
          context,
          Icons.help_outline_rounded,
          'Help & Support',
          'Find answers and help getting started.',
          AppConfig.helpUrl,
        ),
        _link(
          context,
          Icons.quiz_outlined,
          'FAQs',
          'Answers about local offers, events and sharing.',
          AppConfig.faqUrl,
        ),
        const SizedBox(height: 16),
        _heading('Follow Sanyuj'),
        const Text(
          'Stay connected on your favourite platforms.',
          style: TextStyle(fontSize: 13, color: AppColors.inkSoft),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            _socialLink(context, 'LinkedIn', 'linkedin', AppConfig.linkedinUrl),
            _socialLink(
              context,
              'Instagram',
              'instagram',
              AppConfig.instagramUrl,
            ),
            _socialLink(context, 'X', 'x', AppConfig.xUrl),
            _socialLink(context, 'Facebook', 'facebook', AppConfig.facebookUrl),
            _socialLink(context, 'YouTube', 'youtube', AppConfig.youtubeUrl),
          ],
        ),
        const SizedBox(height: 28),
        _heading('Privacy & terms'),
        _link(
          context,
          Icons.shield_outlined,
          'Privacy Policy',
          'Understand how your information is handled.',
          AppConfig.privacyUrl,
        ),
        _link(
          context,
          Icons.description_outlined,
          'Terms of Use',
          'Read the guidelines for using Sanyuj.',
          AppConfig.termsUrl,
        ),
        const SizedBox(height: 16),
        const Text(
          'Links open in your browser.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 12, color: AppColors.inkSoft),
        ),
      ],
    );
  }

  Widget _socialLink(
    BuildContext context,
    String label,
    String platform,
    String url,
  ) {
    return Semantics(
      label: label,
      child: OutlinedButton(
        onPressed: () =>
            openCtaUrl(context, url, goTo: (path) => context.go(path)),
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(48, 48),
          padding: const EdgeInsets.all(12),
          backgroundColor: Colors.white,
          side: const BorderSide(color: AppColors.line),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
        child: Image.asset(
          'assets/brand/social/$platform.png',
          width: 24,
          height: 24,
          excludeFromSemantics: true,
        ),
      ),
    );
  }

  Widget _heading(String title) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Text(
      title,
      style: GoogleFonts.nunito(fontSize: 16, fontWeight: FontWeight.w800),
    ),
  );

  Widget _link(
    BuildContext context,
    IconData icon,
    String title,
    String description,
    String url,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: AppColors.line),
        ),
        clipBehavior: Clip.antiAlias,
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 8,
          ),
          leading: CircleAvatar(
            backgroundColor: AppColors.blueSoft,
            child: Icon(icon, color: AppColors.blueDeep, size: 22),
          ),
          title: Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              description,
              style: const TextStyle(fontSize: 12, color: AppColors.inkSoft),
            ),
          ),
          trailing: const Icon(Icons.open_in_new_rounded, size: 18),
          onTap: () =>
              openCtaUrl(context, url, goTo: (path) => context.go(path)),
        ),
      ),
    );
  }
}
