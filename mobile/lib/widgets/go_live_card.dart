import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../providers.dart';
import '../services/repository.dart';
import '../theme/app_theme.dart';
import 'common.dart';

/// One-tap "working now" switch for a provider, safe to drop on any screen.
class GoLiveCard extends ConsumerStatefulWidget {
  const GoLiveCard({
    super.key,
    required this.businessId,
    required this.pincode,
    this.onChanged,
    this.margin = const EdgeInsets.fromLTRB(20, 12, 20, 4),
  });

  final String businessId;
  final String? pincode;

  /// Called after the provider goes live or stops, so the host screen can refresh.
  final VoidCallback? onChanged;
  final EdgeInsetsGeometry margin;

  @override
  ConsumerState<GoLiveCard> createState() => _GoLiveCardState();
}

class _GoLiveCardState extends ConsumerState<GoLiveCard> {
  Map<String, dynamic>? _session;
  bool _loading = true;
  bool _busy = false;
  Timer? _ticker;

  bool get _isLive => _session != null;

  @override
  void initState() {
    super.initState();
    _load();
    _ticker = Timer.periodic(const Duration(minutes: 1), (_) {
      if (!mounted) return;
      if (_isLive && _remaining <= Duration.zero) {
        setState(() => _session = null);
        widget.onChanged?.call();
      } else if (_isLive) {
        setState(() {});
      }
    });
  }

  @override
  void didUpdateWidget(covariant GoLiveCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.businessId != widget.businessId) _load();
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final session = await ref.read(repoProvider).fetchActiveLiveSession(widget.businessId);
      if (!mounted) return;
      setState(() {
        _session = session;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Duration get _remaining {
    final ends = DateTime.tryParse(_session?['ends_at'] as String? ?? '');
    if (ends == null) return Duration.zero;
    return ends.toLocal().difference(DateTime.now());
  }

  String get _remainingLabel {
    final left = _remaining;
    if (left <= Duration.zero) return 'Ending now';
    final hours = left.inHours;
    final minutes = left.inMinutes % 60;
    if (hours > 0) return 'Ends in ${hours}h ${minutes}m';
    return 'Ends in ${left.inMinutes.clamp(1, 59)}m';
  }

  Future<void> _toggle() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final repo = ref.read(repoProvider);
      final session = _session;
      if (session != null) {
        await repo.stopLive(session['id'] as String);
        if (!mounted) return;
        setState(() => _session = null);
        showAppSnack(context, 'You are no longer showing as live');
      } else {
        final pincode = widget.pincode?.trim() ?? '';
        if (pincode.isEmpty) {
          throw Exception('Add your pincode in profile before going live');
        }
        final created = await repo.goLive(businessId: widget.businessId, pincode: pincode);
        if (!mounted) return;
        setState(() => _session = created);
        showAppSnack(context, "You're live for the next ${SanyujRepository.liveSessionDuration.inHours} hours");
      }
      widget.onChanged?.call();
    } catch (e) {
      if (!mounted) return;
      showAppErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const SizedBox.shrink();

    final hours = SanyujRepository.liveSessionDuration.inHours;
    final pincode = widget.pincode?.trim() ?? '';

    return Padding(
      padding: widget.margin,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: _isLive ? AppColors.greenSoft : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: _isLive ? AppColors.greenDeep.withValues(alpha: 0.4) : AppColors.line,
            width: 1.5,
          ),
          boxShadow: AppColors.cardShadow,
        ),
        child: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: _isLive ? AppColors.greenDeep : AppColors.greenSoft,
                borderRadius: BorderRadius.circular(11),
              ),
              child: Icon(
                Icons.sensors_rounded,
                size: 18,
                color: _isLive ? Colors.white : AppColors.greenDeep,
              ),
            ),
            const SizedBox(width: 11),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          _isLive
                              ? "You're live${pincode.isEmpty ? '' : ' in $pincode'}"
                              : 'Available right now?',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.nunito(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: _isLive ? AppColors.greenDeep : AppColors.ink,
                          ),
                        ),
                      ),
                      const SizedBox(width: 5),
                      GoLiveInfoIcon(hours: hours),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _isLive
                        ? '$_remainingLabel · neighbours nearby can call you.'
                        : 'Go live for ${hours}h so neighbours nearby find you first.',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11, color: AppColors.inkSoft, height: 1.35),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            _ToggleButton(
              label: _isLive ? 'Stop' : 'Go live',
              busy: _busy,
              danger: _isLive,
              onTap: _toggle,
            ),
          ],
        ),
      ),
    );
  }
}

/// Tap target that explains what going live actually does.
class GoLiveInfoIcon extends StatelessWidget {
  const GoLiveInfoIcon({super.key, required this.hours});

  final int hours;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      triggerMode: TooltipTriggerMode.tap,
      showDuration: const Duration(seconds: 8),
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.ink,
        borderRadius: BorderRadius.circular(12),
        boxShadow: AppColors.popShadow,
      ),
      textStyle: const TextStyle(
        color: Colors.white,
        fontSize: 11.5,
        height: 1.45,
        fontWeight: FontWeight.w600,
      ),
      message:
          'Going live tells neighbours in your pincode that you can take work right now.\n\n'
          '• You show up under Live nearby for $hours hours\n'
          '• Stop anytime — your listing stays visible either way',
      child: const Padding(
        padding: EdgeInsets.all(3),
        child: Icon(Icons.info_outline_rounded, size: 14, color: AppColors.inkFaint),
      ),
    );
  }
}

class _ToggleButton extends StatelessWidget {
  const _ToggleButton({
    required this.label,
    required this.busy,
    required this.danger,
    required this.onTap,
  });

  final String label;
  final bool busy;
  final bool danger;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final background = danger ? Colors.white : AppColors.greenDeep;
    final foreground = danger ? AppColors.rose : Colors.white;

    return Material(
      color: background,
      borderRadius: BorderRadius.circular(100),
      child: InkWell(
        onTap: busy ? null : onTap,
        borderRadius: BorderRadius.circular(100),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(100),
            border: Border.all(color: danger ? AppColors.rose : AppColors.greenDeep, width: 1.5),
          ),
          child: busy
              ? SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 2, color: foreground),
                )
              : Text(
                  label,
                  style: GoogleFonts.nunito(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: foreground,
                  ),
                ),
        ),
      ),
    );
  }
}
