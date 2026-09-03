import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../providers.dart';
import '../../models/models.dart';
import '../../config/app_config.dart';
import '../../services/location.dart';
import '../../theme/app_theme.dart';
import '../../utils/format.dart';
import '../../widgets/common.dart';
import '../../widgets/ad_detail_sheet.dart';
import '../../widgets/live_provider_card.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  Profile? _profile;
  Business? _business;
  List<CategoryGroup> _groups = [];
  List<Job> _recent = [];
  List<Map<String, dynamic>> _live = [];
  List<AdBanner> _ads = [];
  bool _loading = true;
  int _adIndex = 0;
  String? _guestAddress;
  bool _guestAddressLoading = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _loadGuestAddress() async {
    if (_guestAddressLoading) return;
    setState(() => _guestAddressLoading = true);
    try {
      final address = await LocationService.instance.fetchCurrentAddress();
      if (!mounted) return;
      setState(() {
        _guestAddress = address;
        _guestAddressLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _guestAddressLoading = false);
      showAppErrorSnack(context, 'Could not detect your location');
    }
  }

  Future<void> _refetchLocation() async {
    await _loadGuestAddress();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final repo = ref.read(repoProvider);
      final profile = await repo.fetchProfile();
      final groups = await repo.fetchCategoryTree();
      final recent = await repo.fetchMyJobs();
      final business = await repo.fetchMyBusiness();
      final ads = await repo
          .fetchAds(
            pincode: profile?.pincode,
            localityId: profile?.localityId,
            areaId: profile?.areaId,
          )
          .catchError((_) => <AdBanner>[]);
      final live = await repo.fetchLiveSessions(profile?.pincode);
      if (!mounted) return;
      setState(() {
        _profile = profile;
        _business = business;
        _groups = groups;
        _recent = recent.take(2).toList();
        _live = live;
        _ads = ads;
        _loading = false;
      });
      if (repo.userId == null) {
        _loadGuestAddress();
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      showAppErrorAlert(context, e, actionLabel: 'Retry', onAction: _load);
    }
  }

  Future<void> _openUrl(String url) async {
    try {
      final ok = await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
      if (!ok && mounted) showAppErrorSnack(context, 'Could not open link');
    } catch (e) {
      if (!mounted) return;
      showAppErrorSnack(context, e);
    }
  }

  Future<void> _showAd(AdBanner ad) async {
    await ref.read(repoProvider).recordAdClick(ad.id);
    if (!mounted) return;
    final isGuest = ref.read(repoProvider).userId == null;
    await showAdDetailSheet(
      context,
      ad: ad,
      onCta: (ad.ctaUrl ?? '').trim().isEmpty
          ? null
          : () => openAdCta(
                context,
                ad,
                isGuest: isGuest,
                goTo: (path) {
                  if (path.startsWith('/login')) {
                    context.push(path);
                  } else if (path == '/explore') {
                    context.go(path);
                  } else {
                    context.push(path);
                  }
                },
              ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.blueDeep));
    }

    final cats = _groups.expand((g) => g.categories).take(9).toList();
    final userId = ref.read(repoProvider).userId;
    final isGuest = userId == null;
    final firstName = isGuest ? 'there' : (_profile?.fullName?.split(' ').first ?? 'there');
    final profileLocation =
        locationLabel(area: _profile?.area, locality: _profile?.locality, pincode: _profile?.pincode, address: _profile?.address);
    final location = _guestAddressLoading
        ? 'Detecting your location\u2026'
        : (_guestAddress?.isNotEmpty == true
            ? _guestAddress!
            : (isGuest
                ? 'Location unavailable'
                : (profileLocation.isEmpty ? 'Set your location in profile' : profileLocation)));
    final closedCount = _recent.where((j) => j.status == 'closed').length;
    final closedPct = _recent.isEmpty ? 0 : ((closedCount / _recent.length) * 100).round();

    return Stack(
      children: [
        RefreshIndicator(
          color: AppColors.blueDeep,
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.only(bottom: 88),
            children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 6),
            child: Row(
              children: [
                AvatarBadge(
                  label: isGuest ? 'S' : initials(_profile?.fullName),
                  size: 42,
                  radius: 14,
                  background: AppColors.blueSoft,
                  foreground: AppColors.blueDeep,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isGuest ? 'Hi there' : 'Hi, $firstName \u{1F44B}',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 1),
                      GestureDetector(
                        onTap: _refetchLocation,
                        behavior: HitTestBehavior.opaque,
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                location,
                                style: const TextStyle(fontSize: 11.5, color: AppColors.inkSoft, height: 1.35),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (_guestAddressLoading) ...[
                              const SizedBox(width: 6),
                              const SizedBox(
                                width: 12,
                                height: 12,
                                child: CircularProgressIndicator(strokeWidth: 1.8, color: AppColors.blueDeep),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                PopupMenuButton<_HomeMenuAction>(
                  tooltip: 'Sanyuj',
                  offset: const Offset(0, 44),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  onSelected: (action) {
                    switch (action) {
                      case _HomeMenuAction.profile:
                        context.go('/profile');
                      case _HomeMenuAction.policies:
                        _openUrl(AppConfig.policiesUrl);
                      case _HomeMenuAction.help:
                        _openUrl(AppConfig.helpUrl);
                    }
                  },
                  itemBuilder: (context) => [
                    PopupMenuItem(
                      value: _HomeMenuAction.profile,
                      child: Row(
                        children: [
                          Icon(Icons.person_outline_rounded, size: 18, color: AppColors.blueDeep),
                          const SizedBox(width: 10),
                          const Text('My Profile', style: TextStyle(fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                    PopupMenuItem(
                      value: _HomeMenuAction.policies,
                      child: Row(
                        children: [
                          Icon(Icons.policy_outlined, size: 18, color: AppColors.indigo),
                          const SizedBox(width: 10),
                          const Text('Sanyuj Policies', style: TextStyle(fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                    PopupMenuItem(
                      value: _HomeMenuAction.help,
                      child: Row(
                        children: [
                          Icon(Icons.support_agent_rounded, size: 18, color: AppColors.greenDeep),
                          const SizedBox(width: 10),
                          const Text('Help and support', style: TextStyle(fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ],
                  child: Container(
                    height: 40,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(100),
                      border: Border.all(color: AppColors.line),
                      boxShadow: AppColors.cardShadow,
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Sanyuj',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.blueDeep),
                        ),
                        SizedBox(width: 2),
                        Icon(Icons.keyboard_arrow_down_rounded, size: 18, color: AppColors.inkSoft),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          if (_ads.isNotEmpty) ...[
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: SizedBox(
                height: adBannerHeight,
                child: PageView.builder(
                  itemCount: _ads.length,
                  onPageChanged: (i) => setState(() => _adIndex = i),
                  itemBuilder: (_, i) {
                    final ad = _ads[i];
                    final imageUrl = ad.imageUrl?.trim();
                    return GestureDetector(
                      onTap: () => _showAd(ad),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(adBannerRadius),
                        child: ColoredBox(
                          color: AppColors.surface,
                          child: imageUrl != null && imageUrl.isNotEmpty
                              ? Image.network(
                                  imageUrl,
                                  fit: BoxFit.contain,
                                  width: double.infinity,
                                  height: double.infinity,
                                  alignment: Alignment.center,
                                  errorBuilder: (_, _, _) => _AdFallback(ad: ad),
                                  loadingBuilder: (context, child, progress) {
                                    if (progress == null) return child;
                                    return Container(
                                      color: AppColors.surface,
                                      child: const Center(
                                        child: SizedBox(
                                          width: 22,
                                          height: 22,
                                          child: CircularProgressIndicator(strokeWidth: 2.2, color: AppColors.blueDeep),
                                        ),
                                      ),
                                    );
                                  },
                                )
                              : _AdFallback(ad: ad),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
            if (_ads.length > 1) ...[
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (var i = 0; i < _ads.length; i++)
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: i == _adIndex ? 18 : 6,
                      height: 6,
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      decoration: BoxDecoration(
                        color: i == _adIndex ? AppColors.blueDeep : AppColors.line,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                ],
              ),
            ],
          ],

          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 4),
            child: Material(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(100),
              child: InkWell(
                onTap: () => _openUrl('mailto:support@sanyuj.app?subject=Banner%20ad%20on%20Sanyuj'),
                borderRadius: BorderRadius.circular(100),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(100),
                    border: Border.all(color: AppColors.line, width: 1.5),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.campaign_outlined, size: 16, color: AppColors.blueDeep),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Want your ad here?',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'Contact',
                        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: AppColors.blueDeep),
                      ),
                      const SizedBox(width: 2),
                      const Icon(Icons.arrow_forward_rounded, size: 14, color: AppColors.blueDeep),
                    ],
                  ),
                ),
              ),
            ),
          ),

          SectionHeader(
            title: 'Categories',
            trailing: GestureDetector(
              onTap: () => context.go('/explore'),
              child: const Text('See all', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.blueDeep)),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 6),
            child: GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: cats.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                mainAxisSpacing: 6,
                crossAxisSpacing: 8,
                childAspectRatio: 1.05,
              ),
              itemBuilder: (_, i) {
                final c = cats[i];
                return InkWell(
                  onTap: () => context.go('/explore?category=${Uri.encodeComponent(c.id)}'),
                  borderRadius: BorderRadius.circular(12),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CategoryIcon(value: c.emoji, size: 48, radius: 14),
                      const SizedBox(height: 6),
                      Text(
                        c.name,
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, height: 1.2),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),

          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
            child: Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.indigoSoft,
                borderRadius: BorderRadius.circular(AppColors.radiusLg),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      "Can't find your exact need? Post it & let providers come to you.",
                      style: GoogleFonts.nunito(fontSize: 14.5, fontWeight: FontWeight.w700, color: AppColors.indigo, height: 1.35),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Material(
                    color: AppColors.indigo,
                    borderRadius: BorderRadius.circular(100),
                    child: InkWell(
                      onTap: () => context.push(isGuest ? '/login?next=/post-job' : '/post-job'),
                      borderRadius: BorderRadius.circular(100),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        child: Text(
                          isGuest ? 'Log in to post' : 'Post a Job',
                          style: GoogleFonts.nunito(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          SectionHeader(
            title: 'Recent activity',
            trailing: GestureDetector(
              onTap: () => context.go('/my-jobs'),
              child: const Text('Show all', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.blueDeep)),
            ),
          ),
          if (_recent.isEmpty)
            EmptyState(
              icon: Icons.history_rounded,
              title: isGuest ? 'Nothing here yet' : 'No recent jobs',
              message: isGuest
                  ? 'Log in to post a job and track it here.'
                  : 'Jobs you post will show up in this list.',
              action: isGuest
                  ? SizedBox(
                      width: double.infinity,
                      child: PrimaryButton(
                        label: 'Log in',
                        onPressed: () => context.push('/login?next=/post-job'),
                      ),
                    )
                  : SizedBox(
                      width: double.infinity,
                      child: PrimaryButton(
                        label: 'Post a job',
                        onPressed: () => context.push('/post-job'),
                      ),
                    ),
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 12),
            )
          else ...[
            ..._recent.map(
              (j) => GestureDetector(
                onTap: () async {
                  await context.push('/jobs/${j.id}');
                  if (mounted) await _load();
                },
                child: StatusRowTile(
                  title: j.title,
                  subtitle: j.status == 'open' ? 'Open - waiting for responses' : 'Closed',
                  amount: j.budgetLabel,
                  when: timeAgo(j.createdAt),
                  ok: j.status == 'closed',
                ),
              ),
            ),
          ],

          if (isGuest || _business == null)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () => context.push(isGuest ? '/login?next=/business/setup' : '/business/setup'),
                  borderRadius: BorderRadius.circular(AppColors.radiusLg),
                  child: Ink(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: AppColors.greenSoft,
                      borderRadius: BorderRadius.circular(AppColors.radiusLg),
                      border: Border.all(color: AppColors.green.withValues(alpha: 0.15)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 46,
                          height: 46,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(15),
                            boxShadow: AppColors.cardShadow,
                          ),
                          child: const Icon(Icons.storefront_outlined, color: AppColors.greenDeep),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Have a business or offer a service?', style: GoogleFonts.nunito(fontSize: 14, fontWeight: FontWeight.w700)),
                              const SizedBox(height: 3),
                              const Text(
                                'List it free on Sanyuj and start getting job requests nearby.',
                                style: TextStyle(fontSize: 11, color: AppColors.inkSoft, height: 1.4),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.arrow_forward_rounded, color: AppColors.greenDeep, size: 20),
                      ],
                    ),
                  ),
                ),
              ),
            ),

          if (_recent.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
              child: Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: AppColors.blueDeep,
                  borderRadius: BorderRadius.circular(AppColors.radiusLg),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF1F8E7B).withValues(alpha: 0.28),
                      blurRadius: 30,
                      offset: const Offset(0, 16),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('THIS MONTH', style: eyebrowStyle(color: Colors.white.withValues(alpha: 0.75))),
                          const SizedBox(height: 6),
                          Text(
                            closedCount > 0
                                ? '$closedCount of ${_recent.length} jobs you posted got closed'
                                : 'Track your posted jobs and responses here',
                            style: GoogleFonts.nunito(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w700, height: 1.35),
                          ),
                          const SizedBox(height: 14),
                          Material(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(100),
                            child: InkWell(
                              onTap: () => context.go('/my-jobs'),
                              borderRadius: BorderRadius.circular(100),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                child: Text('View My Jobs', style: GoogleFonts.nunito(color: AppColors.blueDeep, fontWeight: FontWeight.w700, fontSize: 12.5)),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    SizedBox(
                      width: 80,
                      height: 80,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          SizedBox(
                            width: 80,
                            height: 80,
                            child: CircularProgressIndicator(
                              value: closedPct / 100,
                              strokeWidth: 7,
                              backgroundColor: Colors.white.withValues(alpha: 0.28),
                              valueColor: const AlwaysStoppedAnimation(Colors.white),
                              strokeCap: StrokeCap.round,
                            ),
                          ),
                          Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('$closedPct%', style: monoStyle(fontSize: 16, color: Colors.white)),
                              Text('Closed', style: TextStyle(fontSize: 8, color: Colors.white.withValues(alpha: 0.85), letterSpacing: 0.4)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
          ),
        ),
        Positioned(
          right: 16,
          bottom: 28,
          child: LiveNearbyFab(
            liveCount: _live.length,
            onTap: () => context.push('/live-nearby'),
          ),
        ),
      ],
    );
  }
}

class _AdFallback extends StatelessWidget {
  const _AdFallback({required this.ad});

  final AdBanner ad;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: const BoxDecoration(color: AppColors.blueDeep),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            ad.brandName.isEmpty ? 'Sponsored' : ad.brandName,
            style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 11, fontWeight: FontWeight.w700),
          ),
          const Spacer(),
          Text(
            ad.title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.nunito(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15, height: 1.3),
          ),
        ],
      ),
    );
  }
}

enum _HomeMenuAction { profile, policies, help }

