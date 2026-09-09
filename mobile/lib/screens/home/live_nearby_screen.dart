import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/live_provider_card.dart';

class LiveNearbyScreen extends ConsumerStatefulWidget {
  const LiveNearbyScreen({super.key});

  @override
  ConsumerState<LiveNearbyScreen> createState() => _LiveNearbyScreenState();
}

class _LiveNearbyScreenState extends ConsumerState<LiveNearbyScreen> {
  List<Map<String, dynamic>> _live = [];
  String? _pincode;
  bool _loading = true;
  bool _refreshing = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
    if (silent) setState(() => _refreshing = true);
    try {
      final repo = ref.read(repoProvider);
      final profile = await repo.fetchProfile();
      final live = await repo.fetchLiveSessions(profile?.pincode);
      if (!mounted) return;
      setState(() {
        _pincode = profile?.pincode;
        _live = live;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      showAppErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  Future<void> _callPhone(String? phone, String name) async {
    final digits = phone?.replaceAll(RegExp(r'\D'), '') ?? '';
    if (digits.isEmpty) {
      showAppSnack(context, 'No contact for $name');
      return;
    }
    try {
      final ok = await launchUrl(Uri.parse('tel:$digits'), mode: LaunchMode.externalApplication);
      if (!ok && mounted) showAppSnack(context, 'Could not open dialer');
    } catch (_) {
      if (!mounted) return;
      showAppSnack(context, 'Could not open dialer');
    }
  }

  @override
  Widget build(BuildContext context) {
    final userId = ref.read(repoProvider).userId;

    return Scaffold(
      backgroundColor: AppColors.bgApp,
      body: SafeArea(
        child: Column(
          children: [
            ScreenTopBar(
              title: 'Working near you',
              showBack: true,
              onBack: () => context.pop(),
              trailing: IconButton(
                tooltip: 'Refresh',
                onPressed: _refreshing ? null : () => _load(silent: true),
                icon: _refreshing
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.greenDeep),
                      )
                    : const Icon(Icons.refresh_rounded, color: AppColors.greenDeep),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
              child: Row(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: AppColors.greenDeep,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.greenDeep.withValues(alpha: 0.35), width: 3),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _live.isEmpty
                          ? 'No one live nearby'
                          : '${_live.length} live${_pincode != null ? ' · $_pincode' : ''}',
                      style: GoogleFonts.nunito(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: AppColors.greenDeep,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.greenDeep))
                  : RefreshIndicator(
                      color: AppColors.greenDeep,
                      onRefresh: () => _load(silent: true),
                      child: ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                        children: [
                          if (_live.isEmpty)
                            const EmptyState(
                              icon: Icons.sensors_rounded,
                              title: 'No one live nearby',
                              message: 'When providers check in nearby, they show up here. Try Explore to find listed businesses.',
                              iconColor: AppColors.greenDeep,
                              iconBackground: AppColors.greenSoft,
                            )
                          else
                            for (final row in _live)
                              LiveProviderCard(
                                row: row,
                                isOwn: userId != null &&
                                    row['businesses'] is Map &&
                                    (row['businesses'] as Map)['owner_id'] == userId,
                                onCall: _callPhone,
                              ),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
