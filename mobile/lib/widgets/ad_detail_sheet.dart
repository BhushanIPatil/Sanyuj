import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/models.dart';
import '../theme/app_theme.dart';
import '../utils/format.dart';

import '../widgets/common.dart';

Future<void> showAdDetailSheet(
  BuildContext context, {
  required AdBanner ad,
  Future<void> Function()? onCta,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => DraggableScrollableSheet(
      initialChildSize: 0.78,
      minChildSize: 0.45,
      maxChildSize: 0.92,
      builder: (_, scrollController) => _AdDetailSheet(
        ad: ad,
        scrollController: scrollController,
        onCta: onCta,
      ),
    ),
  );
}

class _AdDetailSheet extends StatelessWidget {
  const _AdDetailSheet({
    required this.ad,
    required this.scrollController,
    this.onCta,
  });

  final AdBanner ad;
  final ScrollController scrollController;
  final Future<void> Function()? onCta;

  @override
  Widget build(BuildContext context) {
    final imageUrl = ad.imageUrl?.trim();
    final when = formatWhenRange(ad.offerStartsAt, ad.offerEndsAt);

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.bgApp,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        boxShadow: [
          BoxShadow(
            color: Color(0x26000000),
            blurRadius: 24,
            offset: Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        children: [
          const SizedBox(height: 10),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.line,
              borderRadius: BorderRadius.circular(100),
            ),
          ),
          Expanded(
            child: ListView(
              controller: scrollController,
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(adBannerRadius),
                  child: AspectRatio(
                    aspectRatio: adBannerAspectRatio,
                    child: imageUrl != null && imageUrl.isNotEmpty
                        ? Image.network(
                            imageUrl,
                            fit: BoxFit.contain,
                            width: double.infinity,
                            alignment: Alignment.center,
                            errorBuilder: (_, _, _) => _BannerFallback(ad: ad),
                          )
                        : _BannerFallback(ad: ad),
                  ),
                ),
                const SizedBox(height: 18),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.blueSoft,
                        borderRadius: BorderRadius.circular(100),
                      ),
                      child: Text(
                        ad.brandName.isEmpty ? 'Sponsored' : ad.brandName,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.blueDeep,
                        ),
                      ),
                    ),
                    if (ad.category != null)
                      CategoryTintChip(category: ad.category!),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  ad.title,
                  style: GoogleFonts.nunito(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    height: 1.25,
                    color: AppColors.ink,
                  ),
                ),
                if ((ad.body ?? '').trim().isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(
                    ad.body!.trim(),
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppColors.inkSoft,
                      height: 1.55,
                    ),
                  ),
                ],
                if (when.isNotEmpty) ...[
                  const SizedBox(height: 18),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(AppColors.radiusMd),
                      border: Border.all(color: AppColors.line),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'When',
                          style: eyebrowStyle(color: AppColors.inkSoft),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          when,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.ink,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                if ((ad.ctaLabel ?? '').trim().isNotEmpty && onCta != null) ...[
                  const SizedBox(height: 22),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () async {
                        await onCta!();
                        if (context.mounted) Navigator.pop(context);
                      },
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.blueDeep,
                        minimumSize: const Size.fromHeight(50),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(
                            AppColors.radiusMd,
                          ),
                        ),
                      ),
                      child: Text(
                        ad.ctaLabel!.trim(),
                        style: GoogleFonts.nunito(
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BannerFallback extends StatelessWidget {
  const _BannerFallback({required this.ad});

  final AdBanner ad;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: AppColors.blueDeep,
      padding: const EdgeInsets.all(18),
      alignment: Alignment.bottomLeft,
      child: Text(
        ad.title,
        style: GoogleFonts.nunito(
          color: Colors.white,
          fontWeight: FontWeight.w800,
          fontSize: 18,
          height: 1.3,
        ),
      ),
    );
  }
}

Future<void> openCtaUrl(
  BuildContext context,
  String? rawUrl, {
  required void Function(String) goTo,
}) async {
  final url = rawUrl?.trim();
  if (url == null || url.isEmpty) return;
  try {
    final scheme = Uri.parse(url).scheme.toLowerCase();
    if (['http', 'https', 'tel', 'mailto'].contains(scheme)) {
      final ok = await launchUrl(
        Uri.parse(url),
        mode: LaunchMode.externalApplication,
      );
      if (!ok && context.mounted) {
        showAppErrorSnack(context, 'Could not open link');
      }
      return;
    }
    final path = Uri.parse(url).path.replaceFirst(RegExp(r'^/app'), '');
    if (path == '/offerly') {
      goTo('/offerly');
      return;
    }
    if (path == '/notifications') {
      goTo('/notifications');
      return;
    }
    if (path == '' || path == '/home') {
      goTo('/home');
      return;
    }
    if (context.mounted) showAppErrorSnack(context, 'Could not open link');
  } catch (e) {
    if (!context.mounted) return;
    showAppErrorSnack(context, e);
  }
}

Future<void> openAdCta(
  BuildContext context,
  AdBanner ad, {
  required void Function(String) goTo,
}) {
  return openCtaUrl(context, ad.ctaUrl, goTo: goTo);
}
