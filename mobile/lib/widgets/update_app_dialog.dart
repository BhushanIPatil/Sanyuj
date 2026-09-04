import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/models.dart';
import '../services/app_version_api.dart';
import '../theme/app_theme.dart';

Future<void> showUpdateAppDialog(
  BuildContext context, {
  required AppVersionInfo version,
  required AppUpdateKind kind,
  required String currentVersion,
}) {
  final force = kind == AppUpdateKind.required;
  return showDialog<void>(
    context: context,
    barrierDismissible: !force,
    barrierColor: const Color(0xFF0B1220).withValues(alpha: 0.72),
    builder: (ctx) => PopScope(
      canPop: !force,
      child: Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 24),
        child: _UpdateAppCard(
          version: version,
          force: force,
          currentVersion: currentVersion,
        ),
      ),
    ),
  );
}

class _UpdateAppCard extends StatefulWidget {
  const _UpdateAppCard({
    required this.version,
    required this.force,
    required this.currentVersion,
  });

  final AppVersionInfo version;
  final bool force;
  final String currentVersion;

  @override
  State<_UpdateAppCard> createState() => _UpdateAppCardState();
}

class _UpdateAppCardState extends State<_UpdateAppCard> with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1600),
  )..repeat(reverse: true);

  bool _opening = false;

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  Future<void> _openStore() async {
    final raw = widget.version.downloadUrl.trim();
    if (raw.isEmpty) return;
    setState(() => _opening = true);
    try {
      final uri = Uri.parse(raw);
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } finally {
      if (mounted) setState(() => _opening = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final notes = widget.version.releaseNotes?.trim();
    final noteLines = (notes == null || notes.isEmpty)
        ? const <String>[]
        : notes
            .split(RegExp(r'[\n•]+'))
            .map((s) => s.trim())
            .where((s) => s.isNotEmpty)
            .toList();

    return ClipRRect(
      borderRadius: BorderRadius.circular(28),
      child: Material(
        color: AppColors.bgApp,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(24, 28, 24, 36),
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Color(0xFF10549C),
                        Color(0xFF0E8094),
                        Color(0xFF12966C),
                      ],
                    ),
                  ),
                  child: Column(
                    children: [
                      AnimatedBuilder(
                        animation: _pulse,
                        builder: (context, child) {
                          final t = 0.85 + (_pulse.value * 0.15);
                          return Transform.scale(scale: t, child: child);
                        },
                        child: Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.18),
                            borderRadius: BorderRadius.circular(22),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.35), width: 1.5),
                          ),
                          child: const Icon(Icons.system_update_rounded, color: Colors.white, size: 34),
                        ),
                      ),
                      const SizedBox(height: 18),
                      Text(
                        widget.force ? 'Update required' : 'New version available',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.nunito(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          height: 1.15,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        widget.force
                            ? 'This version of Sanyuj is no longer supported. Update to continue.'
                            : 'A fresher build is ready with improvements for you.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 13.5,
                          height: 1.45,
                          color: Colors.white.withValues(alpha: 0.88),
                        ),
                      ),
                    ],
                  ),
                ),
                Positioned(
                  left: 20,
                  right: 20,
                  bottom: -18,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _VersionChip(label: 'Yours', value: widget.currentVersion, muted: true),
                      const SizedBox(width: 10),
                      Icon(Icons.arrow_forward_rounded, size: 16, color: AppColors.ink.withValues(alpha: 0.35)),
                      const SizedBox(width: 10),
                      _VersionChip(label: 'Latest', value: widget.version.latestVersion, muted: false),
                    ],
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(22, 32, 22, 22),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (noteLines.isNotEmpty) ...[
                    Text(
                      'WHAT\'S NEW',
                      style: GoogleFonts.nunito(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.1,
                        color: AppColors.inkFaint,
                      ),
                    ),
                    const SizedBox(height: 10),
                    ...noteLines.take(5).map(
                      (line) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              margin: const EdgeInsets.only(top: 6),
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: AppColors.green,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                line,
                                style: const TextStyle(
                                  fontSize: 13.5,
                                  height: 1.4,
                                  color: AppColors.inkSoft,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                  DecoratedBox(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(AppColors.radiusMd),
                      boxShadow: AppColors.ctaShadow,
                      gradient: AppColors.logoGradient,
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: _opening ? null : _openStore,
                        borderRadius: BorderRadius.circular(AppColors.radiusMd),
                        child: SizedBox(
                          height: 54,
                          child: Center(
                            child: _opening
                                ? const SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white),
                                  )
                                : Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.open_in_new_rounded, color: Colors.white, size: 18),
                                      const SizedBox(width: 8),
                                      Text(
                                        'Update now',
                                        style: GoogleFonts.nunito(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w800,
                                          fontSize: 15.5,
                                        ),
                                      ),
                                    ],
                                  ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  if (!widget.force) ...[
                    const SizedBox(height: 10),
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: Text(
                        'Not now',
                        style: GoogleFonts.nunito(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                          color: AppColors.inkSoft,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _VersionChip extends StatelessWidget {
  const _VersionChip({required this.label, required this.value, required this.muted});

  final String label;
  final String value;
  final bool muted;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: muted ? AppColors.surface : AppColors.bgApp,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: muted ? AppColors.line : AppColors.blue.withValues(alpha: 0.35)),
        boxShadow: AppColors.cardShadow,
      ),
      child: Column(
        children: [
          Text(
            label.toUpperCase(),
            style: GoogleFonts.nunito(
              fontSize: 9.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
              color: AppColors.inkFaint,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'v$value',
            style: GoogleFonts.nunito(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: muted ? AppColors.inkSoft : AppColors.blueDeep,
            ),
          ),
        ],
      ),
    );
  }
}
