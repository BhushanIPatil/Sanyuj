import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../providers.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../utils/format.dart';
import '../../widgets/common.dart';
import '../../widgets/ad_detail_sheet.dart';

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
  bool _refreshingLive = false;
  int _adIndex = 0;

  @override
  void initState() {
    super.initState();
    _load();
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
        _recent = recent.take(5).toList();
        _live = live;
        _ads = ads;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      showAppSnack(context, e.toString());
    }
  }

  Future<void> _refreshLive() async {
    final pin = _profile?.pincode;
    if (_refreshingLive) return;
    setState(() => _refreshingLive = true);
    final started = DateTime.now();
    try {
      final live = await ref.read(repoProvider).fetchLiveSessions(pin);
      if (!mounted) return;
      setState(() => _live = live);
    } catch (_) {
      if (!mounted) return;
      showAppSnack(context, 'Could not refresh live providers');
    } finally {
      final elapsed = DateTime.now().difference(started).inMilliseconds;
      if (elapsed < 600) {
        await Future<void>.delayed(Duration(milliseconds: 600 - elapsed));
      }
      if (mounted) setState(() => _refreshingLive = false);
    }
  }

  Future<void> _callPhone(String? phone, String name) async {
    final digits = phone?.replaceAll(RegExp(r'\D'), '') ?? '';
    if (digits.isEmpty) {
      showAppSnack(context, 'No contact for $name');
      return;
    }
    final uri = Uri.parse('tel:$digits');
    try {
      final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!ok && mounted) showAppSnack(context, 'Could not open dialer');
    } catch (_) {
      if (!mounted) return;
      showAppSnack(context, 'Could not open dialer');
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

    final cats = _groups.expand((g) => g.categories).take(6).toList();
    final userId = ref.read(repoProvider).userId;
    final isGuest = userId == null;
    final firstName = isGuest ? 'there' : (_profile?.fullName?.split(' ').first ?? 'there');
    final location = isGuest
        ? 'Browsing as guest'
        : locationLabel(area: _profile?.area, locality: _profile?.locality, pincode: _profile?.pincode, address: _profile?.address);
    final closedCount = _recent.where((j) => j.status == 'closed').length;
    final closedPct = _recent.isEmpty ? 0 : ((closedCount / _recent.length) * 100).round();

    return RefreshIndicator(
      color: AppColors.blueDeep,
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 24),
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
                  child: isGuest
                      ? Align(
                          alignment: Alignment.centerLeft,
                          child: Material(
                            color: AppColors.blueDeep,
                            borderRadius: BorderRadius.circular(100),
                            child: InkWell(
                              onTap: () => context.push('/login'),
                              borderRadius: BorderRadius.circular(100),
                              child: const Padding(
                                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                child: Text(
                                  'Log in',
                                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13.5),
                                ),
                              ),
                            ),
                          ),
                        )
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Hi, $firstName 👋', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                            const SizedBox(height: 1),
                            Text(
                              location.isEmpty ? 'Set your location in profile' : location,
                              style: const TextStyle(fontSize: 11.5, color: AppColors.inkSoft, height: 1.35),
                            ),
                          ],
                        ),
                ),
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.line),
                    boxShadow: AppColors.cardShadow,
                  ),
                  child: const Icon(Icons.notifications_none_rounded, size: 18, color: AppColors.ink),
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
                onTap: () => launchUrl(Uri.parse('mailto:support@sanyuj.app?subject=Banner%20ad%20on%20Sanyuj')),
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
                          'Want your business featured here?',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'Contact →',
                        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: AppColors.blueDeep),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 6),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: AppColors.greenDeep,
                              shape: BoxShape.circle,
                              border: Border.all(color: AppColors.greenDeep.withValues(alpha: 0.35), width: 3),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text('Working near you now', style: GoogleFonts.nunito(fontSize: 16, fontWeight: FontWeight.w700)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Providers who checked in as currently working — call them directly.',
                        style: TextStyle(fontSize: 11.5, color: AppColors.inkSoft, height: 1.4),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Row(
                  children: [
                    Text(
                      '${_live.length} live',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.greenDeep),
                    ),
                    const SizedBox(width: 8),
                    Material(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      child: InkWell(
                        onTap: _refreshingLive ? null : _refreshLive,
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.line),
                            boxShadow: AppColors.cardShadow,
                          ),
                          child: _refreshingLive
                              ? const Padding(
                                  padding: EdgeInsets.all(9),
                                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.greenDeep),
                                )
                              : const Icon(Icons.refresh_rounded, size: 18, color: AppColors.greenDeep),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          if (_live.isEmpty)
            SoftCard(
              margin: const EdgeInsets.symmetric(horizontal: 20),
              child: const Text(
                'No one is live nearby right now. Post a job or check Explore.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.inkSoft, fontSize: 13),
              ),
            )
          else
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
              child: Column(
                children: [
                  for (final row in _live)
                    _LiveProviderCard(
                      row: row,
                      isOwn: userId != null &&
                          row['businesses'] is Map &&
                          (row['businesses'] as Map)['owner_id'] == userId,
                      onCall: _callPhone,
                    ),
                ],
              ),
            ),

          SearchFakeField(
            hint: 'Search "electrician", "AC repair"...',
            onTap: () => context.go('/explore'),
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
                mainAxisSpacing: 14,
                crossAxisSpacing: 12,
                childAspectRatio: 0.85,
              ),
              itemBuilder: (_, i) {
                final c = cats[i];
                return InkWell(
                  onTap: () => context.go('/explore'),
                  borderRadius: BorderRadius.circular(12),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CategoryIcon(value: c.emoji, size: 52, radius: 14),
                      const SizedBox(height: 8),
                      Text(
                        c.name,
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, height: 1.25),
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

          const SectionHeader(title: 'Recent activity'),
          if (_recent.isEmpty)
            SoftCard(
              margin: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                isGuest
                    ? 'Log in to post a job and track it here.'
                    : 'You have not posted any jobs yet.',
                style: const TextStyle(color: AppColors.inkSoft),
              ),
            )
          else
            ..._recent.map(
              (j) => GestureDetector(
                onTap: () => context.push('/jobs/${j.id}'),
                child: StatusRowTile(
                  title: j.title,
                  subtitle: j.status == 'open' ? 'Open — waiting for responses' : 'Closed',
                  amount: j.budgetLabel,
                  when: timeAgo(j.createdAt),
                  ok: j.status == 'closed',
                ),
              ),
            ),

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
                        const Text('→', style: TextStyle(color: AppColors.greenDeep, fontSize: 18, fontWeight: FontWeight.w700)),
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

class _LiveProviderCard extends StatelessWidget {
  const _LiveProviderCard({
    required this.row,
    required this.isOwn,
    required this.onCall,
  });

  final Map<String, dynamic> row;
  final bool isOwn;
  final Future<void> Function(String? phone, String name) onCall;

  @override
  Widget build(BuildContext context) {
    final biz = row['businesses'];
    if (biz is! Map) return const SizedBox.shrink();

    final name = biz['name'] as String? ?? 'Provider';
    final ownerName = (biz['ownerName'] as String?)?.trim();
    final ownerPhone = biz['ownerPhone'] as String?;
    final cat = biz['categories'];
    final categoryName = cat is Map ? (cat['name'] as String? ?? '') : '';
    final startedAt = DateTime.tryParse(row['started_at'] as String? ?? '') ?? DateTime.now();

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: isOwn ? AppColors.greenDeep.withValues(alpha: 0.4) : AppColors.line),
        boxShadow: AppColors.cardShadow,
      ),
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
                    child: const Text('LIVE', style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w800)),
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
                  const Text('You are live', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.greenDeep))
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
    );
  }
}
