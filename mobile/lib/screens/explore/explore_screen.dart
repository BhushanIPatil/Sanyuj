import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../providers.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../utils/format.dart';
import '../../widgets/common.dart';
import '../../widgets/filters.dart';
import '../../widgets/provider_detail_sheet.dart';

const _sortOptions = [
  SortOption(
    value: 'name-asc',
    label: 'Name: A to Z',
    short: 'Name A–Z',
    icon: Icons.sort_by_alpha_rounded,
  ),
  SortOption(
    value: 'name-desc',
    label: 'Name: Z to A',
    short: 'Name Z–A',
    icon: Icons.sort_rounded,
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
];

const _detailGroup = FilterGroup(
  id: 'details',
  label: 'Listing',
  options: [
    FilterOption(value: 'phone', label: 'Contact number shared'),
    FilterOption(value: 'photo', label: 'Has a photo'),
    FilterOption(value: 'address', label: 'Address shared'),
  ],
);

class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key, this.initialCategoryId});

  final String? initialCategoryId;

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  final _query = TextEditingController();
  List<Category> _categories = [];
  List<Business> _items = [];
  FilterState _filters = const FilterState();
  GeoFilter _defaultGeo = GeoFilter.empty;
  GeoFilter _appliedGeo = GeoFilter.empty;
  String _sort = 'name-asc';
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  @override
  void didUpdateWidget(covariant ExploreScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    final next = widget.initialCategoryId;
    if (oldWidget.initialCategoryId != next && next != null) {
      setState(() {
        _filters = _filters.withGeo(_filters.geo).selectOnly('category', next);
      });
    }
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    setState(() => _loading = true);
    try {
      final repo = ref.read(repoProvider);
      final profile = await repo.fetchProfile();
      final groups = await repo.fetchCategoryTree();
      final geo = GeoFilter(
        pincode: profile?.pincode ?? '',
        locality: profile?.locality ?? '',
        localityId: profile?.localityId,
        areaId: profile?.areaId ?? '',
        areaName: profile?.area ?? '',
      );
      if (!mounted) return;
      final initial = widget.initialCategoryId;
      setState(() {
        _categories = [
          ...groups.expand((g) => g.categories),
          kOtherBrowseCategory,
        ];
        _defaultGeo = geo;
        _filters = _filters.withGeo(geo);
        if (initial != null && !_filters.isSelected('category', initial)) {
          _filters = _filters.selectOnly('category', initial);
        }
      });
      await _load(geo);
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      showAppErrorAlert(context, e, actionLabel: 'Retry', onAction: _bootstrap);
    }
  }

  Future<void> _load(GeoFilter geo) async {
    setState(() => _loading = true);
    try {
      final items = await ref.read(repoProvider).fetchBusinesses(
            pincode: geo.pincode.isEmpty ? null : geo.pincode,
            localityId: geo.localityId,
            areaId: geo.areaId.isEmpty ? null : geo.areaId,
            excludeOwn: true,
          );
      if (!mounted) return;
      setState(() {
        _items = items;
        _appliedGeo = geo;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      showAppErrorAlert(context, e, actionLabel: 'Retry', onAction: () => _load(geo));
    }
  }

  Future<void> _refresh() => _load(_filters.geo);

  /// One flat category list, shared by the horizontal strip and the filter sheet.
  List<FilterGroup> get _filterGroups => [
        if (_categories.isNotEmpty)
          FilterGroup(
            id: 'category',
            label: 'Category',
            searchable: _categories.length > 8,
            options: [
              for (final c in _categories)
                FilterOption(value: c.id, label: c.name, icon: c.emoji),
            ],
          ),
        _detailGroup,
      ];

  List<Business> _results(FilterState state) {
    final needle = _query.text.trim().toLowerCase();
    final categoryIds = state.valuesOf('category');
    final details = state.valuesOf('details');

    final matched = _items.where((b) {
      if (categoryIds.isNotEmpty) {
        final wantsOther = categoryIds.contains(kOtherCategoryId);
        final official = categoryIds.where((id) => id != kOtherCategoryId);
        final matchOfficial = official.contains(b.category?.id);
        final matchOther = wantsOther && (b.category?.isOther ?? false);
        if (!matchOfficial && !matchOther) return false;
      }
      if (details.contains('phone') && (b.phone ?? '').trim().isEmpty) return false;
      if (details.contains('photo') && (b.photoUrl ?? '').trim().isEmpty) return false;
      if (details.contains('address') && (b.address ?? '').trim().isEmpty) return false;
      if (needle.isEmpty) return true;
      final hay =
          '${b.name} ${b.category?.name ?? ''} ${b.providerName ?? ''} ${b.address ?? ''}'.toLowerCase();
      return hay.contains(needle);
    }).toList();

    int byName(Business a, Business b) => a.name.toLowerCase().compareTo(b.name.toLowerCase());
    switch (_sort) {
      case 'name-desc':
        matched.sort((a, b) => byName(b, a));
      case 'newest':
      case 'oldest':
        final oldestFirst = _sort == 'oldest';
        matched.sort((a, b) {
          final left = a.createdAt;
          final right = b.createdAt;
          if (left == null && right == null) return byName(a, b);
          if (left == null) return 1;
          if (right == null) return -1;
          return oldestFirst ? left.compareTo(right) : right.compareTo(left);
        });
      default:
        matched.sort(byName);
    }
    return matched;
  }

  Future<void> _openFilters() async {
    final result = await showFilterSheet(
      context,
      groups: _filterGroups,
      value: _filters,
      defaultGeo: _defaultGeo,
      resultNoun: 'providers',
      previewCount: (state) => state.geo == _appliedGeo ? _results(state).length : null,
    );
    if (result == null || !mounted) return;
    final geoChanged = result.geo != _appliedGeo;
    setState(() => _filters = result);
    if (geoChanged) await _load(result.geo);
  }

  Future<void> _openSort() async {
    final next = await showSortSheet(context, options: _sortOptions, value: _sort);
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
    setState(() {
      final selected = _filters.valuesOf('category');
      if (selected.length == 1 && selected.first == id) {
        _filters = _filters.clearGroup('category');
      } else {
        _filters = _filters.selectOnly('category', id);
      }
    });
  }

  Future<void> _openDetails(Business b) async {
    await showProviderDetailSheet(
      context,
      business: b,
      repo: ref.read(repoProvider),
      onCall: _call,
    );
  }

  Future<void> _call(Business b) async {
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

  @override
  Widget build(BuildContext context) {
    final groups = _filterGroups;
    final results = _results(_filters);
    final filtered = _filters.activeCount(_defaultGeo) > 0 || _query.text.trim().isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FilterToolbar(
          title: 'Explore providers',
          subtitle: _filters.geo.isEverywhere ? 'across all areas' : 'near ${_filters.geo.label}',
          searchController: _query,
          onSearchChanged: (_) => setState(() {}),
          searchHint: 'Search providers…',
          animatedHint: true,
          searchResultLabel: () {
            final count = _results(_filters).length;
            return '$count ${count == 1 ? 'provider' : 'providers'}';
          },
          sortLabel: sortLabelFor(_sortOptions, _sort),
          onOpenSort: _openSort,
          filterCount: _filters.activeCount(_defaultGeo),
          onOpenFilters: _openFilters,
          chips: buildActiveFilters(
            state: _filters,
            groups: groups,
            defaultGeo: _defaultGeo,
            onToggle: (groupId, value) => setState(() => _filters = _filters.toggle(groupId, value)),
            onGeoChange: _setGeo,
          ),
          onClearAll: _clearAll,
          resultCount: results.length,
          resultNoun: results.length == 1 ? 'provider' : 'providers',
        ),
        CategoryFilterRow(
          categories: _categories,
          selectedIds: _filters.valuesOf('category'),
          onToggle: _pickListingCategory,
          onClear: _clearCategories,
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: AppColors.blueDeep))
              : RefreshIndicator(
                  color: AppColors.blueDeep,
                  onRefresh: _refresh,
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(20, 6, 20, 100),
                    itemCount: results.isEmpty ? 1 : results.length,
                    itemBuilder: (_, i) {
                      if (results.isEmpty) {
                        return EmptyState(
                          icon: Icons.storefront_outlined,
                          title: filtered ? 'No providers match these filters' : 'No providers nearby',
                          message: filtered
                              ? 'Try widening the location or picking a different category.'
                              : 'Check back later as more businesses join Sanyuj.',
                          iconColor: AppColors.indigo,
                          iconBackground: AppColors.indigoSoft,
                          padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 8),
                          action: filtered
                              ? TextButton(
                                  onPressed: _clearAll,
                                  child: const Text(
                                    'Clear all filters',
                                    style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.blueDeep),
                                  ),
                                )
                              : null,
                        );
                      }
                      final b = results[i];
                      return SoftCard(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        radius: 18,
                        onTap: () => _openDetails(b),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            AvatarBadge(
                              label: initials(b.name),
                              imageUrl: b.photoUrl,
                              size: 44,
                              radius: 12,
                              background: AppColors.tealSoft,
                              foreground: AppColors.teal,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(b.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                                  if (b.category?.name != null) ...[
                                    const SizedBox(height: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: AppColors.blueSoft,
                                        borderRadius: BorderRadius.circular(100),
                                      ),
                                      child: Text(
                                        b.category!.name,
                                        style: const TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.blueDeep,
                                        ),
                                      ),
                                    ),
                                  ],
                                  const SizedBox(height: 6),
                                  Text(
                                    (b.providerName ?? '').trim().isEmpty ? 'Provider' : b.providerName!.trim(),
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                  ),
                                  if (b.phone != null && b.phone!.isNotEmpty)
                                    Text(displayPhone(b.phone!), style: monoStyle(fontSize: 11.5, color: AppColors.blueDeep))
                                  else
                                    const Text('No contact shared', style: TextStyle(fontSize: 11, color: AppColors.inkFaint)),
                                  if ((b.address ?? '').isNotEmpty)
                                    Text(
                                      b.address!,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontSize: 11, color: AppColors.inkFaint),
                                    ),
                                ],
                              ),
                            ),
                            TextButton(
                              onPressed: () => _call(b),
                              child: const Text('Call', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.blueDeep)),
                            ),
                          ],
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
