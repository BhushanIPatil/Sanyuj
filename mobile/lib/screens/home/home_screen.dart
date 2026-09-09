import 'dart:async';

import 'package:flutter/gestures.dart';
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
import '../../widgets/go_live_card.dart';
import '../../widgets/live_provider_card.dart';
import '../../widgets/provider_detail_sheet.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  Profile? _profile;
  Business? _business;
  List<CategoryGroup> _groups = [];
  List<Map<String, dynamic>> _live = [];
  List<AdBanner> _ads = [];
  List<Business> _nearby = [];
  bool _loading = true;
  int _adIndex = 0;
  PageController _adController = PageController();
  Timer? _adTimer;
  String? _guestAddress;
  bool _guestAddressLoading = false;

  bool get _adLooping => _ads.length > 1;

  int _adIndexForPage(int page) {
    if (_ads.isEmpty) return 0;
    if (!_adLooping) return page.clamp(0, _ads.length - 1);
    if (page <= 0) return _ads.length - 1;
    if (page >= _ads.length + 1) return 0;
    return page - 1;
  }

  void _resetAdPager({required int adCount}) {
    final old = _adController;
    _adController = PageController(initialPage: adCount > 1 ? 1 : 0);
    _adIndex = 0;
    if (old.hasClients) {
      WidgetsBinding.instance.addPostFrameCallback((_) => old.dispose());
    } else {
      old.dispose();
    }
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _adTimer?.cancel();
    _adController.dispose();
    super.dispose();
  }

  void _scheduleNextAd() {
    _adTimer?.cancel();
    if (!_adLooping) return;
    _adTimer = Timer(adCarouselInterval, () {
      if (!mounted || !_adLooping || !_adController.hasClients) return;
      final current = _adController.page?.round() ?? 1;
      _adController.animateToPage(
        current + 1,
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOut,
      );
    });
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
      final business = await repo.fetchMyBusiness();
      final ads = await repo
          .fetchAds(
            pincode: profile?.pincode,
            localityId: profile?.localityId,
            areaId: profile?.areaId,
            homeScreenOnly: true,
          )
          .catchError((_) => <AdBanner>[]);
      final live = await repo.fetchLiveSessions(profile?.pincode);
      final nearby = await repo
          .fetchBusinesses(
            pincode: profile?.pincode,
            localityId: profile?.localityId,
            areaId: profile?.areaId,
            excludeOwn: true,
            limit: 8,
          )
          .catchError((_) => <Business>[]);
      if (!mounted) return;
      _resetAdPager(adCount: ads.length);
      setState(() {
        _profile = profile;
        _business = business;
        _groups = groups;
        _live = live;
        _nearby = nearby.take(6).toList();
        _ads = ads;
        _loading = false;
      });
      _scheduleNextAd();
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
      final uri = Uri.parse(url);
      var ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!ok) {
        ok = await launchUrl(uri, mode: LaunchMode.platformDefault);
      }
      if (!ok && mounted) showAppErrorSnack(context, 'Could not open link');
    } catch (e) {
      if (!mounted) return;
      showAppErrorSnack(context, e);
    }
  }

  Future<void> _refreshLive() async {
    try {
      final live = await ref.read(repoProvider).fetchLiveSessions(_profile?.pincode);
      if (!mounted) return;
      setState(() => _live = live);
    } catch (_) {
      // The live strip keeps its current contents if the refresh fails.
    }
  }

  Future<void> _openProviderDetails(Business b) async {
    await showProviderDetailSheet(
      context,
      business: b,
      repo: ref.read(repoProvider),
      onCall: _callBusiness,
    );
  }

  Future<void> _callBusiness(Business b) async {
    final digits = b.phone?.replaceAll(RegExp(r'\D'), '') ?? '';
    if (digits.isEmpty) {
      showAppSnack(context, 'No contact for ${b.name}');
      return;
    }
    try {
      await launchUrl(Uri.parse('tel:$digits'), mode: LaunchMode.externalApplication);
    } catch (e) {
      if (!mounted) return;
      showAppErrorSnack(context, e);
    }
  }

  Future<void> _showAd(AdBanner ad) async {
    await ref.read(repoProvider).recordAdClick(ad.id);
    if (!mounted) return;
    await showAdDetailSheet(
      context,
      ad: ad,
      onCta: (ad.ctaUrl ?? '').trim().isEmpty
          ? null
          : () => openAdCta(
                context,
                ad,
                goTo: (path) {
                  if (path.startsWith('/login')) {
                    context.push(path);
                  } else if (path == '/explore' || path == '/offerly' || path == '/notifications') {
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

    final cats = [
      ..._groups.expand((g) => g.categories).take(8),
      kOtherBrowseCategory,
    ];
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
                      case _HomeMenuAction.business:
                        if (isGuest) {
                          context.push('/login?next=/business');
                        } else {
                          context.push('/business');
                        }
                      case _HomeMenuAction.terms:
                        _openUrl(AppConfig.termsUrl);
                      case _HomeMenuAction.privacy:
                        _openUrl(AppConfig.privacyUrl);
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
                      value: _HomeMenuAction.business,
                      child: Row(
                        children: [
                          Icon(Icons.storefront_outlined, size: 18, color: AppColors.greenDeep),
                          const SizedBox(width: 10),
                          const Text('Your Business', style: TextStyle(fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                    PopupMenuItem(
                      value: _HomeMenuAction.terms,
                      child: Row(
                        children: [
                          Icon(Icons.description_outlined, size: 18, color: AppColors.indigo),
                          const SizedBox(width: 10),
                          const Text('Terms of Use', style: TextStyle(fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                    PopupMenuItem(
                      value: _HomeMenuAction.privacy,
                      child: Row(
                        children: [
                          Icon(Icons.privacy_tip_outlined, size: 18, color: AppColors.teal),
                          const SizedBox(width: 10),
                          const Text('Privacy Policy', style: TextStyle(fontWeight: FontWeight.w600)),
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
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(adBannerRadius),
                  child: Stack(
                    children: [
                      NotificationListener<ScrollNotification>(
                        onNotification: (notification) {
                          if (notification.metrics.axis != Axis.horizontal) return false;
                          if (notification is ScrollStartNotification && notification.dragDetails != null) {
                            _adTimer?.cancel();
                          } else if (notification is ScrollEndNotification) {
                            _scheduleNextAd();
                          }
                          return false;
                        },
                        child: PageView.builder(
                          controller: _adController,
                          padEnds: false,
                          scrollDirection: Axis.horizontal,
                          dragStartBehavior: DragStartBehavior.down,
                          physics: const PageScrollPhysics(parent: ClampingScrollPhysics()),
                          itemCount: _adLooping ? _ads.length + 2 : _ads.length,
                          onPageChanged: (i) {
                            if (_adLooping && (i == 0 || i == _ads.length + 1)) {
                              final target = i == 0 ? _ads.length : 1;
                              setState(() => _adIndex = _adIndexForPage(i));
                              WidgetsBinding.instance.addPostFrameCallback((_) {
                                if (!mounted || !_adController.hasClients) return;
                                _adController.jumpToPage(target);
                                _scheduleNextAd();
                              });
                              return;
                            }
                            setState(() => _adIndex = _adIndexForPage(i));
                            _scheduleNextAd();
                          },
                          itemBuilder: (_, i) {
                            final ad = _ads[_adIndexForPage(i)];
                            final imageUrl = ad.imageUrl?.trim();
                            return GestureDetector(
                              onTap: () => _showAd(ad),
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
                                        return const Center(
                                          child: SizedBox(
                                            width: 22,
                                            height: 22,
                                            child: CircularProgressIndicator(strokeWidth: 2.2, color: AppColors.blueDeep),
                                          ),
                                        );
                                      },
                                    )
                                  : _AdFallback(ad: ad),
                            );
                          },
                        ),
                      ),
                      if (_ads.length > 1)
                        Positioned(
                          top: 8,
                          right: 8,
                          child: IgnorePointer(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppColors.ink.withValues(alpha: 0.7),
                                borderRadius: BorderRadius.circular(100),
                              ),
                              child: Text(
                                '${_adIndex + 1}/${_ads.length}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  height: 1.2,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ],

          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 4),
            child: Material(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(100),
              child: InkWell(
                onTap: () => _openUrl(
                  'mailto:${AppConfig.supportEmail}?subject=Banner%20ad%20on%20Sanyuj',
                ),
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

          if (_business != null)
            GoLiveCard(
              businessId: _business!.id,
              pincode: _profile?.pincode,
              onChanged: _refreshLive,
              margin: const EdgeInsets.fromLTRB(20, 10, 20, 2),
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
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 8),
            child: Row(
              children: [
                Expanded(
                  child: Text('Nearby providers', style: GoogleFonts.nunito(fontSize: 16, fontWeight: FontWeight.w700)),
                ),
                GestureDetector(
                  onTap: () => context.go('/explore'),
                  child: const Text('See all', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.blueDeep)),
                ),
              ],
            ),
          ),
          if (_nearby.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: EmptyState(
                icon: Icons.storefront_outlined,
                title: 'No providers nearby',
                message: 'No providers in this area yet. Try Explore, or list your business so neighbours can find you.',
                padding: EdgeInsets.symmetric(vertical: 16, horizontal: 8),
              ),
            )
          else
            ..._nearby.map(
              (b) => SoftCard(
                margin: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                padding: const EdgeInsets.all(14),
                radius: 18,
                onTap: () => _openProviderDetails(b),
                child: Row(
                  children: [
                    AvatarBadge(
                      label: initials(b.name),
                      imageUrl: b.photoUrl,
                      size: 48,
                      radius: 15,
                      background: AppColors.tealSoft,
                      foreground: AppColors.teal,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(b.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                          const SizedBox(height: 3),
                          Text(
                            b.category?.name ?? 'Service',
                            style: const TextStyle(fontSize: 12, color: AppColors.inkSoft),
                          ),
                        ],
                      ),
                    ),
                    Material(
                      color: AppColors.blueDeep,
                      borderRadius: BorderRadius.circular(13),
                      child: InkWell(
                        onTap: () => _callBusiness(b),
                        borderRadius: BorderRadius.circular(13),
                        child: const SizedBox(
                          width: 40,
                          height: 40,
                          child: Icon(Icons.call_rounded, color: Colors.white, size: 18),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

          if (isGuest || _business == null)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () => context.push(isGuest ? '/login?next=/business' : '/business'),
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
                                'List it free on Sanyuj and get found by neighbours nearby.',
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

enum _HomeMenuAction { profile, business, terms, privacy, help }

