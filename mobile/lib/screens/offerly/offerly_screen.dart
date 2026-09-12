import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../providers.dart';
import '../../services/location.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../utils/format.dart';
import '../../widgets/ad_detail_sheet.dart';
import '../../widgets/common.dart';
import '../../widgets/filters.dart';

const _sortOptions = [
  SortOption(
    value: 'featured',
    label: 'Featured',
    icon: Icons.workspace_premium_rounded,
  ),
  SortOption(
    value: 'newest',
    label: 'Newest first',
    short: 'Newest',
    icon: Icons.fiber_new_rounded,
  ),
  SortOption(
    value: 'oldest',
    label: 'Oldest first',
    short: 'Oldest',
    icon: Icons.history_rounded,
  ),
  SortOption(
    value: 'ending',
    label: 'Ending soonest',
    short: 'Ending soon',
    icon: Icons.hourglass_bottom_rounded,
  ),
  SortOption(
    value: 'brand',
    label: 'Brand: A to Z',
    short: 'Brand A–Z',
    icon: Icons.sort_by_alpha_rounded,
  ),
];

const _statusGroup = FilterGroup(
  id: 'status',
  label: 'Offer status',
  options: [
    FilterOption(value: 'live', label: 'Running now'),
    FilterOption(value: 'upcoming', label: 'Starting soon'),
    FilterOption(value: 'ending', label: 'Ending in 7 days'),
    FilterOption(value: 'open', label: 'No end date'),
  ],
);

const _extraGroup = FilterGroup(
  id: 'extras',
  label: 'More',
  options: [
    FilterOption(value: 'new', label: 'Added this week'),
    FilterOption(value: 'cta', label: 'Has an action link'),
    FilterOption(value: 'photo', label: 'Has a photo'),
  ],
);

class OfferlyScreen extends ConsumerStatefulWidget {
  const OfferlyScreen({super.key});

  @override
  ConsumerState<OfferlyScreen> createState() => _OfferlyScreenState();
}

class _OfferlyScreenState extends ConsumerState<OfferlyScreen> {
  final _query = TextEditingController();
  List<AdBanner> _ads = [];
  List<ContentCategory> _categories = [];
  FilterState _filters = const FilterState();
  GeoFilter _defaultGeo = GeoFilter.empty;
  GeoFilter _appliedGeo = GeoFilter.empty;
  String _sort = 'featured';
  bool _loading = true;
  int _loadId = 0;

  @override
  void initState() {
    super.initState();
    LocationService.instance.currentFix.addListener(_onLocation);
    _bootstrap();
  }

  @override
  void dispose() {
    LocationService.instance.currentFix.removeListener(_onLocation);
    _query.dispose();
    super.dispose();
  }

  void _onLocation() {
    if (!mounted) return;
    final pin = LocationService.instance.lastFix?.pincode;
    if (pin == null) return;
    final geo = GeoFilter(pincode: pin);
    final followsDefault = _filters.geo == _defaultGeo;
    setState(() {
      _defaultGeo = geo;
      if (followsDefault) _filters = _filters.withGeo(geo);
    });
    if (followsDefault && geo != _appliedGeo) _load(geo);
  }

  Future<void> _bootstrap() async {
    setState(() => _loading = true);
    try {
      List<ContentCategory> cats = [];
      try {
        cats = await ref.read(repoProvider).fetchContentCategories('offer');
      } catch (_) {}
      final geo = GeoFilter(
        pincode: LocationService.instance.lastFix?.pincode ?? '',
      );
      if (!mounted) return;
      setState(() {
        _defaultGeo = geo;
        _filters = _filters.withGeo(geo);
        _categories = cats;
      });
      await _load(geo);
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      showAppErrorAlert(context, e, actionLabel: 'Retry', onAction: _bootstrap);
    }
  }

  Future<void> _load(GeoFilter geo) async {
    final loadId = ++_loadId;
    setState(() => _loading = true);
    try {
      final ads = await ref
          .read(repoProvider)
          .fetchAds(
            pincode: geo.pincode.isEmpty ? null : geo.pincode,
            localityId: geo.localityId,
            areaId: geo.areaId.isEmpty ? null : geo.areaId,
            limit: null,
          );
      if (!mounted || loadId != _loadId) return;
      setState(() {
        _ads = ads;
        _appliedGeo = geo;
        _loading = false;
      });
    } catch (e) {
      if (!mounted || loadId != _loadId) return;
      setState(() => _loading = false);
      showAppErrorAlert(
        context,
        e,
        actionLabel: 'Retry',
        onAction: () => _load(geo),
      );
    }
  }

  Future<void> _refresh() => _load(_filters.geo);

  /// Brands come from the ads currently in range, with a count per brand.
  FilterGroup get _brandGroup {
    final counts = <String, int>{};
    for (final ad in _ads) {
      final brand = ad.brandName.trim();
      if (brand.isEmpty) continue;
      counts[brand] = (counts[brand] ?? 0) + 1;
    }
    final brands = counts.keys.toList()
      ..sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));
    return FilterGroup(
      id: 'brand',
      label: 'Brand',
      searchable: brands.length > 8,
      options: [
        for (final brand in brands)
          FilterOption(value: brand, label: brand, count: counts[brand]),
      ],
    );
  }

  List<FilterGroup> get _filterGroups => [
    if (_categories.isNotEmpty)
      FilterGroup(
        id: 'category',
        label: 'Category',
        searchable: true,
        options: [
          for (final c in _categories)
            FilterOption(value: c.id, label: c.name, icon: c.emoji),
        ],
      ),
    _brandGroup,
    _statusGroup,
    _extraGroup,
  ];

  List<AdBanner> _results(FilterState state) {
    final needle = _query.text.trim().toLowerCase();
    final brands = state.valuesOf('brand');
    final statuses = state.valuesOf('status');
    final extras = state.valuesOf('extras');
    final categoryIds = state.valuesOf('category');
    final now = DateTime.now();

    bool matchesStatus(AdBanner ad) {
      for (final status in statuses) {
        switch (status) {
          case 'live':
            final started =
                ad.offerStartsAt == null || !ad.offerStartsAt!.isAfter(now);
            final open = ad.offerEndsAt == null || ad.offerEndsAt!.isAfter(now);
            if (started && open) return true;
          case 'upcoming':
            if (ad.offerStartsAt != null && ad.offerStartsAt!.isAfter(now)) {
              return true;
            }
          case 'ending':
            final end = ad.offerEndsAt;
            if (end != null &&
                end.isAfter(now) &&
                end.difference(now).inDays <= 7) {
              return true;
            }
          case 'open':
            if (ad.offerEndsAt == null) return true;
        }
      }
      return false;
    }

    final matched = _ads.where((ad) {
      if (categoryIds.isNotEmpty && !categoryIds.contains(ad.category?.id)) {
        return false;
      }
      if (brands.isNotEmpty && !brands.contains(ad.brandName.trim())) {
        return false;
      }
      if (statuses.isNotEmpty && !matchesStatus(ad)) return false;
      if (extras.contains('new')) {
        final created = ad.createdAt;
        if (created == null || now.difference(created).inDays > 7) return false;
      }
      if (extras.contains('cta') && (ad.ctaUrl ?? '').trim().isEmpty) {
        return false;
      }
      if (extras.contains('photo') && (ad.imageUrl ?? '').trim().isEmpty) {
        return false;
      }
      if (needle.isEmpty) return true;
      return '${ad.brandName} ${ad.title} ${ad.body ?? ''} ${ad.category?.name ?? ''}'
          .toLowerCase()
          .contains(needle);
    }).toList();

    switch (_sort) {
      case 'newest':
        matched.sort((a, b) => compareDatesDesc(a.createdAt, b.createdAt));
      case 'oldest':
        matched.sort((a, b) => compareDatesAsc(a.createdAt, b.createdAt));
      case 'ending':
        matched.sort((a, b) => compareDatesAsc(a.offerEndsAt, b.offerEndsAt));
      case 'brand':
        matched.sort(
          (a, b) =>
              a.brandName.toLowerCase().compareTo(b.brandName.toLowerCase()),
        );
      default:
        break; // 'featured' keeps the admin sort_order coming back from the query.
    }
    return matched;
  }

  Future<void> _openFilters() async {
    final result = await showFilterSheet(
      context,
      groups: _filterGroups,
      value: _filters,
      defaultGeo: _defaultGeo,
      resultNoun: 'offers',
      previewCount: (state) =>
          state.geo == _appliedGeo ? _results(state).length : null,
    );
    if (result == null || !mounted) return;
    final geoChanged = result.geo != _appliedGeo;
    setState(() => _filters = result);
    if (geoChanged) await _load(result.geo);
  }

  Future<void> _openSort() async {
    final next = await showSortSheet(
      context,
      options: _sortOptions,
      value: _sort,
    );
    if (next == null || !mounted) return;
    setState(() => _sort = next);
  }

  void _setGeo(GeoFilter geo) {
    setState(() => _filters = _filters.withGeo(geo));
    if (geo != _appliedGeo) _load(geo);
  }

  void _clearAll() {
    _query.clear();
    final geoChanged = _filters.geo != _defaultGeo;
    setState(() => _filters = FilterState(geo: _defaultGeo));
    if (geoChanged) _load(_defaultGeo);
  }

  void _clearCategories() {
    setState(() => _filters = _filters.clearGroup('category'));
  }

  void _pickListingCategory(String id) {
    setState(() => _filters = _filters.toggle('category', id));
  }

  Future<void> _showAd(AdBanner ad) async {
    if (!mounted) return;
    await showAdDetailSheet(
      context,
      ad: ad,
      onCta: (ad.ctaUrl ?? '').trim().isEmpty
          ? null
          : () => openAdCta(context, ad, goTo: (path) => context.go(path)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final groups = _filterGroups;
    final results = _results(_filters);
    final filtered =
        _filters.activeCount(_defaultGeo) > 0 || _query.text.trim().isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FilterToolbar(
          title: 'Offerly',
          subtitle: _filters.geo.isEverywhere
              ? 'across all areas'
              : 'in ${_filters.geo.label}',
          searchController: _query,
          onSearchChanged: (_) => setState(() {}),
          searchHint: 'Search offers, brands…',
          searchResultLabel: () {
            final count = _results(_filters).length;
            return '$count ${count == 1 ? 'offer' : 'offers'}';
          },
          sortLabel: sortLabelFor(_sortOptions, _sort),
          onOpenSort: _openSort,
          filterCount: _filters.activeCount(_defaultGeo),
          onOpenFilters: _openFilters,
          onCreateRequest: () => context.go('/requests?kind=offer'),
          requestLabel: 'Request an offer',
          chips: buildActiveFilters(
            state: _filters,
            groups: groups,
            defaultGeo: _defaultGeo,
            onToggle: (groupId, value) =>
                setState(() => _filters = _filters.toggle(groupId, value)),
            onGeoChange: _setGeo,
          ),
          onClearAll: _clearAll,
          resultCount: results.length,
          resultNoun: results.length == 1 ? 'offer' : 'offers',
        ),
        CategoryFilterRow(
          categories: _categories,
          selectedIds: _filters.valuesOf('category'),
          onToggle: _pickListingCategory,
          onClear: _clearCategories,
        ),
        Expanded(
          child: _loading
              ? const Center(
                  child: CircularProgressIndicator(color: AppColors.blueDeep),
                )
              : RefreshIndicator(
                  color: AppColors.blueDeep,
                  onRefresh: _refresh,
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(20, 6, 20, 100),
                    itemCount: results.isEmpty ? 1 : results.length,
                    itemBuilder: (_, i) {
                      if (results.isEmpty) {
                        return EmptyState(
                          icon: Icons.local_offer_outlined,
                          title: filtered
                              ? 'No offers match these filters'
                              : 'No offers nearby',
                          message: filtered
                              ? 'Try clearing the offer status, category, or brand filters, or widening the location.'
                              : 'Featured offers for your area will show up here. Check back soon.',
                          padding: const EdgeInsets.symmetric(
                            vertical: 48,
                            horizontal: 8,
                          ),
                          action: filtered
                              ? TextButton(
                                  onPressed: _clearAll,
                                  child: const Text(
                                    'Clear all filters',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.blueDeep,
                                    ),
                                  ),
                                )
                              : null,
                        );
                      }
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: _OfferlyCard(
                          ad: results[i],
                          onTap: () => _showAd(results[i]),
                        ),
                      );
                    },
                  ),
                ),
        ),
      ],
    );
  }
}

class _OfferlyCard extends StatelessWidget {
  const _OfferlyCard({required this.ad, required this.onTap});

  final AdBanner ad;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final imageUrl = ad.imageUrl?.trim();
    final when = formatWhenRange(ad.offerStartsAt, ad.offerEndsAt);

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
              ColoredBox(
                color: AppColors.surface,
                child: AspectRatio(
                  aspectRatio: adBannerAspectRatio,
                  child: imageUrl != null && imageUrl.isNotEmpty
                      ? Image.network(
                          imageUrl,
                          fit: BoxFit.contain,
                          width: double.infinity,
                          alignment: Alignment.center,
                          errorBuilder: (_, _, _) => _OfferlyFallback(ad: ad),
                        )
                      : _OfferlyFallback(ad: ad),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.blueSoft,
                            borderRadius: BorderRadius.circular(100),
                          ),
                          child: Text(
                            ad.brandName.isEmpty ? 'Sponsored' : ad.brandName,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.blueDeep,
                            ),
                          ),
                        ),
                        if (ad.category != null)
                          CategoryTintChip(category: ad.category!),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      ad.title,
                      style: GoogleFonts.nunito(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        height: 1.25,
                      ),
                    ),
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

class _OfferlyFallback extends StatelessWidget {
  const _OfferlyFallback({required this.ad});

  final AdBanner ad;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: double.infinity,
      color: AppColors.blueDeep,
      padding: const EdgeInsets.all(16),
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
              fontSize: 16,
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }
}
