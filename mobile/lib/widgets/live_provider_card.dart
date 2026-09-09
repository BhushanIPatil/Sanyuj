import 'package:flutter/material.dart';

import '../models/models.dart';
import '../theme/app_theme.dart';
import '../utils/format.dart';
import 'common.dart';

Business? businessFromLiveRow(Map<String, dynamic> row) {
  final biz = row['businesses'];
  if (biz is! Map) return null;
  final map = Map<String, dynamic>.from(biz);
  if (map['id'] is! String) return null;
  map['providerName'] ??= map['ownerName'];
  map['phone'] ??= map['ownerPhone'];
  return Business.fromJson(map);
}

class LiveProviderCard extends StatelessWidget {
  const LiveProviderCard({
    super.key,
    required this.row,
    required this.isOwn,
    required this.onCall,
    this.onTap,
  });

  final Map<String, dynamic> row;
  final bool isOwn;
  final Future<void> Function(String? phone, String name) onCall;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final biz = row['businesses'];
    if (biz is! Map) return const SizedBox.shrink();

    final name = biz['name'] as String? ?? 'Provider';
    final ownerName = (biz['ownerName'] as String?)?.trim();
    final ownerPhone = biz['ownerPhone'] as String?;
    final photoUrl = biz['photo_url'] as String?;
    final cat = biz['categories'];
    final categoryName = cat is Map ? (cat['name'] as String? ?? '') : '';
    final startedAt = DateTime.tryParse(row['started_at'] as String? ?? '') ?? DateTime.now();

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: isOwn ? AppColors.greenDeep.withValues(alpha: 0.4) : AppColors.line),
        boxShadow: AppColors.cardShadow,
      ),
      clipBehavior: Clip.antiAlias,
      child: Material(
        color: Colors.white,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: AppColors.greenDeep, width: 2),
                      ),
                      padding: const EdgeInsets.all(2),
                      child: AvatarBadge(
                        label: initials(name),
                        imageUrl: photoUrl,
                        size: 48,
                        radius: 14,
                        background: AppColors.blueSoft,
                        foreground: AppColors.blueDeep,
                      ),
                    ),
                    Positioned(
                      bottom: -6,
                      left: 0,
                      right: 0,
                      child: Center(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.greenDeep,
                            borderRadius: BorderRadius.circular(100),
                          ),
                          child: const Text(
                            'LIVE',
                            style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w800),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, height: 1.3)),
                      if (categoryName.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.blueSoft,
                            borderRadius: BorderRadius.circular(100),
                          ),
                          child: Text(
                            categoryName,
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.blueDeep),
                          ),
                        ),
                      ],
                      const SizedBox(height: 6),
                      if (isOwn)
                        const Text(
                          'You are live',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.greenDeep),
                        )
                      else ...[
                        Text(
                          (ownerName == null || ownerName.isEmpty) ? 'Provider' : ownerName,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 2),
                        if (ownerPhone != null && ownerPhone.isNotEmpty)
                          Text(displayPhone(ownerPhone), style: monoStyle(fontSize: 11.5, color: AppColors.blueDeep))
                        else
                          const Text('No contact shared', style: TextStyle(fontSize: 11, color: AppColors.inkFaint)),
                      ],
                      const SizedBox(height: 6),
                      Text(
                        'Checked in ${timeAgo(startedAt)}',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.greenDeep),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: isOwn ? null : () => onCall(ownerPhone, ownerName ?? name),
                  tooltip: 'Call',
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                  icon: Icon(
                    Icons.phone_rounded,
                    size: 22,
                    color: isOwn
                        ? AppColors.inkFaint
                        : (ownerPhone != null && ownerPhone.isNotEmpty)
                            ? AppColors.blueDeep
                            : AppColors.inkFaint,
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

class LiveNearbyFab extends StatelessWidget {
  const LiveNearbyFab({
    super.key,
    required this.liveCount,
    required this.onTap,
  });

  final int liveCount;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final live = liveCount > 0;
    return Tooltip(
      message: live ? 'Live nearby · $liveCount' : 'Live nearby',
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            color: live ? AppColors.greenDeep : AppColors.greenSoft,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: AppColors.greenDeep.withValues(alpha: 0.28),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.center,
            children: [
              Icon(
                Icons.sensors_rounded,
                size: 24,
                color: live ? Colors.white : AppColors.greenDeep,
              ),
              if (live)
                Positioned(
                  top: 4,
                  right: 4,
                  child: Container(
                    constraints: const BoxConstraints(minWidth: 16),
                    height: 16,
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(100),
                    ),
                    child: Text(
                      liveCount > 9 ? '9+' : '$liveCount',
                      style: const TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                        color: AppColors.greenDeep,
                        height: 1,
                      ),
                    ),
                  ),
                )
              else
                Positioned(
                  top: 8,
                  right: 8,
                  child: Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: AppColors.greenDeep,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
