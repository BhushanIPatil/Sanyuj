import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/models.dart';
import '../theme/app_theme.dart';
import '../utils/format.dart';

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
    final hasOfferDates = ad.offerStartsAt != null || ad.offerEndsAt != null;

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.bgApp,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        boxShadow: [
          BoxShadow(color: Color(0x26000000), blurRadius: 24, offset: Offset(0, -4)),
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
                        ? ColoredBox(
                            color: AppColors.surface,
                            child: Image.network(
                              imageUrl,
                              fit: BoxFit.contain,
                              width: double.infinity,
                              alignment: Alignment.center,
                              errorBuilder: (_, _, _) => _BannerFallback(ad: ad),
                            ),
                          )
                        : _BannerFallback(ad: ad),
                  ),
                ),
                const SizedBox(height: 18),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
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
                if (hasOfferDates) ...[
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
                        Text('Offer period', style: eyebrowStyle(color: AppColors.inkSoft)),
                        const SizedBox(height: 10),
                        _DateRow(label: 'Starts', value: formatAdDate(ad.offerStartsAt)),
                        const SizedBox(height: 8),
                        _DateRow(label: 'Ends', value: formatAdDate(ad.offerEndsAt)),
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
                          borderRadius: BorderRadius.circular(AppColors.radiusMd),
                        ),
                      ),
                      child: Text(
                        ad.ctaLabel!.trim(),
                        style: GoogleFonts.nunito(fontWeight: FontWeight.w700, fontSize: 15),
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

class _DateRow extends StatelessWidget {
  const _DateRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: 52,
          child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.inkSoft)),
        ),
        Expanded(
          child: Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.ink)),
        ),
      ],
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

Future<void> openAdCta(BuildContext context, AdBanner ad, {required bool isGuest, required void Function(String) goTo}) async {
  final url = ad.ctaUrl?.trim();
  if (url == null || url.isEmpty) return;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    return;
  }
  if (url.contains('explore')) {
    goTo('/explore');
  } else if (url.contains('post-job') || url.contains('post_job')) {
    goTo(isGuest ? '/login?next=/post-job' : '/post-job');
  }
}
