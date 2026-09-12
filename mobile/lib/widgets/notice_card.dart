import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/models.dart';
import '../theme/app_theme.dart';
import '../utils/format.dart';
import 'common.dart';

class NoticeCard extends StatelessWidget {
  const NoticeCard({super.key, required this.notice, required this.onTap});

  final AreaNotice notice;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final imageUrl = notice.imageUrl?.trim();
    final when = formatWhenRange(notice.eventStartsAt, notice.eventEndsAt);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.line),
        boxShadow: AppColors.cardShadow,
      ),
      clipBehavior: Clip.antiAlias,
      child: Material(
        color: Colors.white,
        child: InkWell(
          onTap: onTap,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (imageUrl != null && imageUrl.isNotEmpty)
                ColoredBox(
                  color: AppColors.surface,
                  child: AspectRatio(
                    aspectRatio: adBannerAspectRatio,
                    child: Image.network(
                      imageUrl,
                      fit: BoxFit.contain,
                      width: double.infinity,
                      alignment: Alignment.center,
                      errorBuilder: (_, _, _) => const SizedBox.shrink(),
                    ),
                  ),
                ),
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (notice.category != null) ...[
                      CategoryTintChip(category: notice.category!),
                      const SizedBox(height: 8),
                    ],
                    Text(
                      notice.title,
                      style: GoogleFonts.nunito(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        height: 1.25,
                      ),
                    ),
                    if ((notice.body ?? '').trim().isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        notice.body!.trim(),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13,
                          height: 1.4,
                          color: AppColors.inkSoft,
                        ),
                      ),
                    ],
                    if (when.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        when,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.inkFaint,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
