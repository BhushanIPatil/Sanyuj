import 'dart:async';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../providers.dart';
import '../../models/models.dart';
import '../../config/app_config.dart';
import '../../services/location.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/filters.dart';
import '../../widgets/ad_detail_sheet.dart';
import '../../widgets/notice_detail_sheet.dart';
import '../../widgets/notice_card.dart';

enum _HomeMenuAction { terms, privacy, help }

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});
  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  List<AdBanner> _ads = [];
  List<AreaNotice> _notices = [], _services = [];
  bool _loading = true, _locationLoading = false;
  String? _error;
  GeoFilter _geo = GeoFilter.empty;
  bool _manualGeo = false;
  int _loadId = 0;
  int _adIndex = 0;
  PageController _adController = PageController();
  Timer? _adTimer;
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
    _geo = GeoFilter(pincode: LocationService.instance.lastFix?.pincode ?? '');
    LocationService.instance.currentFix.addListener(_onLocation);
    _load();
  }

  @override
  void dispose() {
    LocationService.instance.currentFix.removeListener(_onLocation);
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

  void _onLocation() {
    if (!mounted) return;
    final pin = LocationService.instance.lastFix?.pincode;
    if (!_manualGeo && pin != null && pin != _geo.pincode) {
      setState(() => _geo = GeoFilter(pincode: pin));
      _load();
    } else {
      setState(() {});
    }
  }

  Future<void> _chooseLocation() async {
    final result = await showFilterSheet(
      context,
      groups: const [],
      value: FilterState(geo: _geo),
      defaultGeo: GeoFilter(
        pincode: LocationService.instance.lastFix?.pincode ?? '',
      ),
      resultNoun: 'results',
    );
    if (result == null || !mounted) return;
    setState(() {
      _geo = result.geo;
      _manualGeo =
          _geo !=
          GeoFilter(pincode: LocationService.instance.lastFix?.pincode ?? '');
    });
    await _load();
  }

  Future<void> _refresh() async {
    setState(() => _locationLoading = true);
    await LocationService.instance.fetchCurrentLocation(forceRefresh: true);
    if (!mounted) return;
    setState(() => _locationLoading = false);
    await _load();
  }

  Future<void> _load() async {
    final loadId = ++_loadId;
    setState(() {
      _loading = true;
      _error = null;
    });
    final repo = ref.read(repoProvider);
    final pin = _geo.pincode.isEmpty ? null : _geo.pincode;
    final area = _geo.areaId.isEmpty ? null : _geo.areaId;
    try {
      final results = await Future.wait<Object>([
        repo.fetchAds(
          pincode: pin,
          localityId: _geo.localityId,
          areaId: area,
          homeScreenOnly: true,
        ),
        repo.fetchNotices(
          pincode: pin,
          localityId: _geo.localityId,
          areaId: area,
        ),
        repo.fetchNotices(
          kind: 'service',
          pincode: pin,
          localityId: _geo.localityId,
          areaId: area,
        ),
      ]);
      if (!mounted || loadId != _loadId) return;
      final ads = results[0] as List<AdBanner>;
      _resetAdPager(adCount: ads.length);
      setState(() {
        _ads = ads;
        _notices = (results[1] as List<AreaNotice>).take(2).toList();
        _services = (results[2] as List<AreaNotice>).take(2).toList();
        _loading = false;
      });
      _scheduleNextAd();
    } catch (e) {
      if (!mounted || loadId != _loadId) return;
      setState(() {
        _loading = false;
        _error = 'Could not load nearby results. Pull down to retry.';
      });
    }
  }

  Future<void> _openUrl(String url) =>
      openCtaUrl(context, url, goTo: (path) => context.go(path));
  Future<void> _showAd(AdBanner ad) => showAdDetailSheet(
    context,
    ad: ad,
    onCta: (ad.ctaUrl ?? '').isEmpty ? null : () => _openUrl(ad.ctaUrl!),
  );
  Future<void> _showNotice(AreaNotice notice) => showNoticeDetailSheet(
    context,
    notice: notice,
    onCta: (notice.ctaUrl ?? '').isEmpty
        ? null
        : () => _openUrl(notice.ctaUrl!),
  );
  Widget _section(String title, String route, List<AreaNotice> items) => Column(
    children: [
      SectionHeader(
        title: title,
        trailing: TextButton(
          onPressed: () => context.go(route),
          child: const Text(
            'See all',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppColors.blueDeep,
            ),
          ),
        ),
      ),
      if (_loading)
        const Padding(
          padding: EdgeInsets.all(20),
          child: CircularProgressIndicator(),
        )
      else if (_error == null && items.isEmpty)
        Padding(
          padding: const EdgeInsets.all(20),
          child: Text('No ${title.toLowerCase()} nearby yet.'),
        )
      else if (_error == null)
        for (final item in items)
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
            child: NoticeCard(notice: item, onTap: () => _showNotice(item)),
          ),
    ],
  );
  @override
  Widget build(BuildContext context) {
    final location = _manualGeo
        ? _geo.label
        : (LocationService.instance.lastFix?.address ?? 'Choose your area');
    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 6),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Text(
                            'Hi there',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          SizedBox(width: 6),
                          Icon(
                            Icons.waving_hand_outlined,
                            size: 18,
                            color: AppColors.amber,
                          ),
                        ],
                      ),
                      const SizedBox(height: 1),
                      GestureDetector(
                        onTap: _chooseLocation,
                        behavior: HitTestBehavior.opaque,
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                location,
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  color: AppColors.inkSoft,
                                  height: 1.35,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (_locationLoading) ...[
                              const SizedBox(width: 6),
                              const SizedBox(
                                width: 12,
                                height: 12,
                                child: CircularProgressIndicator(
                                  strokeWidth: 1.8,
                                  color: AppColors.blueDeep,
                                ),
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
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  onSelected: (action) {
                    switch (action) {
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
                      value: _HomeMenuAction.terms,
                      child: Row(
                        children: [
                          Icon(
                            Icons.description_outlined,
                            size: 18,
                            color: AppColors.indigo,
                          ),
                          const SizedBox(width: 10),
                          const Text(
                            'Terms of Use',
                            style: TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    PopupMenuItem(
                      value: _HomeMenuAction.privacy,
                      child: Row(
                        children: [
                          Icon(
                            Icons.privacy_tip_outlined,
                            size: 18,
                            color: AppColors.teal,
                          ),
                          const SizedBox(width: 10),
                          const Text(
                            'Privacy Policy',
                            style: TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    PopupMenuItem(
                      value: _HomeMenuAction.help,
                      child: Row(
                        children: [
                          Icon(
                            Icons.support_agent_rounded,
                            size: 18,
                            color: AppColors.greenDeep,
                          ),
                          const SizedBox(width: 10),
                          const Text(
                            'Help and support',
                            style: TextStyle(fontWeight: FontWeight.w600),
                          ),
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
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: AppColors.blueDeep,
                          ),
                        ),
                        SizedBox(width: 2),
                        Icon(
                          Icons.keyboard_arrow_down_rounded,
                          size: 18,
                          color: AppColors.inkSoft,
                        ),
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
                          if (notification.metrics.axis != Axis.horizontal) {
                            return false;
                          }
                          if (notification is ScrollStartNotification &&
                              notification.dragDetails != null) {
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
                          physics: const PageScrollPhysics(
                            parent: ClampingScrollPhysics(),
                          ),
                          itemCount: _adLooping ? _ads.length + 2 : _ads.length,
                          onPageChanged: (i) {
                            if (_adLooping &&
                                (i == 0 || i == _ads.length + 1)) {
                              final target = i == 0 ? _ads.length : 1;
                              setState(() => _adIndex = _adIndexForPage(i));
                              WidgetsBinding.instance.addPostFrameCallback((_) {
                                if (!mounted || !_adController.hasClients) {
                                  return;
                                }
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
                                      errorBuilder: (_, _, _) =>
                                          _AdFallback(ad: ad),
                                      loadingBuilder:
                                          (context, child, progress) {
                                            if (progress == null) return child;
                                            return const Center(
                                              child: SizedBox(
                                                width: 22,
                                                height: 22,
                                                child:
                                                    CircularProgressIndicator(
                                                      strokeWidth: 2.2,
                                                      color: AppColors.blueDeep,
                                                    ),
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
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 3,
                              ),
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

          if (_error != null)
            Padding(padding: const EdgeInsets.all(20), child: Text(_error!)),
          _section('Notifications', '/notifications', _notices),
          _section('Services', '/services', _services),
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
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.85),
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
          const Spacer(),
          Text(
            ad.title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.nunito(
              color: Colors.white,
              fontWeight: FontWeight.w700,
              fontSize: 15,
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }
}
