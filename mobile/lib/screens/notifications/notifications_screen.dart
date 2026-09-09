import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../providers.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../utils/format.dart';
import '../../widgets/ad_detail_sheet.dart';
import '../../widgets/common.dart';
import '../../widgets/filters.dart';
import '../../widgets/notice_detail_sheet.dart';

const _sortOptions = [
  SortOption(value: 'featured', label: 'Featured', icon: Icons.workspace_premium_rounded),
  SortOption(value: 'newest', label: 'Newest first', short: 'Newest', icon: Icons.fiber_new_rounded),
  SortOption(value: 'oldest', label: 'Oldest first', short: 'Oldest', icon: Icons.history_rounded),
  SortOption(
    value: 'ending',
    label: 'Ending soonest',
    short: 'Ending soon',
    icon: Icons.hourglass_bottom_rounded,
  ),
  SortOption(value: 'title', label: 'Title: A to Z', short: 'Title A–Z', icon: Icons.sort_by_alpha_rounded),
];

const _timingGroup = FilterGroup(
  id: 'timing',
  label: 'Timing',
  options: [
    FilterOption(value: 'ending-3', label: 'Ending in 3 days'),
    FilterOption(value: 'ending-7', label: 'Ending in 7 days'),
    FilterOption(value: 'ongoing', label: 'No end date'),
    FilterOption(value: 'new', label: 'Posted this week'),
  ],
);

const _extraGroup = FilterGroup(
  id: 'extras',
  label: 'More',
  options: [
    FilterOption(value: 'photo', label: 'Has a photo'),
    FilterOption(value: 'details', label: 'Has full details'),
  ],
);

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  final _query = TextEditingController();
  List<AreaNotice> _notices = [];
  List<ContentCategory> _categories = [];
  FilterState _filters = const FilterState();
  GeoFilter _defaultGeo = GeoFilter.empty;
  GeoFilter _appliedGeo = GeoFilter.empty;
  String _sort = 'featured';
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    setState(() => _loading = true);
    try {
      final profile = await ref.read(repoProvider).fetchProfile();
      List<ContentCategory> cats = [];
      try {
        cats = await ref.read(repoProvider).fetchContentCategories('notice');
      } catch (_) {}
      final geo = GeoFilter(
        pincode: profile?.pincode ?? '',
        locality: profile?.locality ?? '',
        localityId: profile?.localityId,
        areaId: profile?.areaId ?? '',
        areaName: profile?.area ?? '',
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
    setState(() => _loading = true);
    try {
      final notices = await ref.read(repoProvider).fetchNotices(
            pincode: geo.pincode.isEmpty ? null : geo.pincode,
            localityId: geo.localityId,
            areaId: geo.areaId.isEmpty ? null : geo.areaId,
          );
      if (!mounted) return;
      setState(() {
        _notices = notices;
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

  List<FilterGroup> get _filterGroups => [
        if (_categories.isNotEmpty)
          FilterGroup(
            id: 'category',
            label: 'Category',
            searchable: _categories.length > 8,
            options: [
              for (final c in _categories) FilterOption(value: c.id, label: c.name, icon: c.emoji),
            ],
          ),
        _timingGroup,
        _extraGroup,
      ];

  List<AreaNotice> _results(FilterState state) {
    final needle = _query.text.trim().toLowerCase();
    final timing = state.valuesOf('timing');
    final extras = state.valuesOf('extras');
    final categoryIds = state.valuesOf('category');
    final now = DateTime.now();

    bool endsWithin(AreaNotice notice, int days) {
      final end = notice.eventEndsAt;
      return end != null && end.isAfter(now) && end.difference(now).inDays <= days;
    }

    bool matchesTiming(AreaNotice notice) {
      for (final value in timing) {
        switch (value) {
          case 'ending-3':
            if (endsWithin(notice, 3)) return true;
          case 'ending-7':
            if (endsWithin(notice, 7)) return true;
          case 'ongoing':
            if (notice.eventEndsAt == null) return true;
          case 'new':
            final created = notice.createdAt;
            if (created != null && now.difference(created).inDays <= 7) return true;
        }
      }
      return false;
    }

    final matched = _notices.where((notice) {
      if (categoryIds.isNotEmpty && !categoryIds.contains(notice.category?.id)) return false;
      if (timing.isNotEmpty && !matchesTiming(notice)) return false;
      if (extras.contains('photo') && (notice.imageUrl ?? '').trim().isEmpty) return false;
      if (extras.contains('details') && (notice.body ?? '').trim().isEmpty) return false;
      if (needle.isEmpty) return true;
      return '${notice.title} ${notice.body ?? ''} ${notice.category?.name ?? ''}'.toLowerCase().contains(needle);
    }).toList();

    switch (_sort) {
      case 'newest':
        matched.sort((a, b) => compareDatesDesc(a.createdAt, b.createdAt));
      case 'oldest':
        matched.sort((a, b) => compareDatesAsc(a.createdAt, b.createdAt));
      case 'ending':
        matched.sort((a, b) => compareDatesAsc(a.eventEndsAt, b.eventEndsAt));
      case 'title':
        matched.sort((a, b) => a.title.toLowerCase().compareTo(b.title.toLowerCase()));
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
      resultNoun: 'updates',
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

  Future<void> _showNotice(AreaNotice notice) async {
    final url = (notice.ctaUrl ?? '').trim();
    await showNoticeDetailSheet(
      context,
      notice: notice,
      onCta: url.isEmpty
          ? null
          : () => openCtaUrl(
                context,
                url,
                goTo: (path) {
                  if (path.startsWith('/login')) {
                    context.push(path);
                  } else if (path == '/explore' || path == '/offerly' || path == '/home' || path == '/notifications') {
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
    final results = _results(_filters);
    final filtered = _filters.activeCount(_defaultGeo) > 0 || _query.text.trim().isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FilterToolbar(
          title: 'Notify',
          subtitle: _filters.geo.isEverywhere ? 'across all areas' : 'for ${_filters.geo.label}',
          searchController: _query,
          onSearchChanged: (_) => setState(() {}),
          searchHint: 'Search events, functions…',
          searchResultLabel: () {
            final count = _results(_filters).length;
            return '$count ${count == 1 ? 'update' : 'updates'}';
          },
          sortLabel: sortLabelFor(_sortOptions, _sort),
          onOpenSort: _openSort,
          filterCount: _filters.activeCount(_defaultGeo),
          onOpenFilters: _openFilters,
          chips: buildActiveFilters(
            state: _filters,
            groups: _filterGroups,
            defaultGeo: _defaultGeo,
            onToggle: (groupId, value) => setState(() => _filters = _filters.toggle(groupId, value)),
            onGeoChange: _setGeo,
          ),
          onClearAll: _clearAll,
          resultCount: results.length,
          resultNoun: results.length == 1 ? 'update' : 'updates',
        ),
        CategoryFilterRow(
          categories: [for (final c in _categories) c.asChip],
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
                          icon: Icons.notifications_none_rounded,
                          title: filtered ? 'No updates match these filters' : 'No updates nearby',
                          message: filtered
                              ? 'Try clearing the category or timing filters, or widening the location.'
                              : 'Events and local updates for your area will show up here.',
                          padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 8),
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
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: _NoticeCard(
                          notice: results[i],
                          onTap: () => _showNotice(results[i]),
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

class _NoticeCard extends StatelessWidget {
  const _NoticeCard({required this.notice, required this.onTap});

  final AreaNotice notice;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final imageUrl = notice.imageUrl?.trim();
    final when = formatWhenRange(notice.eventStartsAt, notice.eventEndsAt);

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
              if (imageUrl != null && imageUrl.isNotEmpty)
                ColoredBox(
                  color: AppColors.surface,
                  child: AspectRatio(
                    aspectRatio: adBannerAspectRatio,
                    child: Image.network(
                      imageUrl,
                      fit: BoxFit.contain,
                      width: double.infinity,
                      alignment: Alignment.center,
                      errorBuilder: (_, _, _) => const SizedBox.shrink(),
                    ),
                  ),
                ),
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (notice.category != null) ...[
                      CategoryTintChip(category: notice.category!),
                      const SizedBox(height: 8),
                    ],
                    Text(
                      notice.title,
                      style: GoogleFonts.nunito(fontSize: 16, fontWeight: FontWeight.w800, height: 1.25),
                    ),
                    if ((notice.body ?? '').trim().isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        notice.body!.trim(),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 13, height: 1.4, color: AppColors.inkSoft),
                      ),
                    ],
                    if (when.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        when,
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.inkFaint),
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
