import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/models.dart';
import '../theme/app_theme.dart';
import '../utils/format.dart';

Future<void> showNoticeDetailSheet(BuildContext context, {required AreaNotice notice}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => DraggableScrollableSheet(
      initialChildSize: 0.72,
      minChildSize: 0.4,
      maxChildSize: 0.92,
      builder: (_, scrollController) => _NoticeDetailSheet(
        notice: notice,
        scrollController: scrollController,
      ),
    ),
  );
}

class _NoticeDetailSheet extends StatelessWidget {
  const _NoticeDetailSheet({
    required this.notice,
    required this.scrollController,
  });

  final AreaNotice notice;
  final ScrollController scrollController;

  @override
  Widget build(BuildContext context) {
    final imageUrl = notice.imageUrl?.trim();
    final hasWindow = notice.startsAt != null || notice.endsAt != null;

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
                if (imageUrl != null && imageUrl.isNotEmpty)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(adBannerRadius),
                    child: AspectRatio(
                      aspectRatio: adBannerAspectRatio,
                      child: Image.network(
                        imageUrl,
                        fit: BoxFit.contain,
                        width: double.infinity,
                        errorBuilder: (_, _, _) => const SizedBox.shrink(),
                      ),
                    ),
                  ),
                SizedBox(height: imageUrl != null && imageUrl.isNotEmpty ? 16 : 4),
                Text(
                  notice.title,
                  style: GoogleFonts.nunito(fontSize: 22, fontWeight: FontWeight.w800, height: 1.25),
                ),
                if ((notice.body ?? '').trim().isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(
                    notice.body!.trim(),
                    style: const TextStyle(fontSize: 14, height: 1.5, color: AppColors.inkSoft),
                  ),
                ],
                if (hasWindow) ...[
                  const SizedBox(height: 18),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: AppColors.line),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'WHEN',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.6,
                            color: AppColors.inkSoft,
                          ),
                        ),
                        const SizedBox(height: 10),
                        _DateRow(label: 'Starts', value: formatAdDate(notice.startsAt)),
                        const SizedBox(height: 8),
                        _DateRow(label: 'Ends', value: formatAdDate(notice.endsAt)),
                      ],
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
          child: Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.inkSoft)),
        ),
        Expanded(
          child: Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
        ),
      ],
    );
  }
}
