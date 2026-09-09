import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/postal.dart';
import '../theme/app_theme.dart';
import 'animated_search_hint.dart';
import 'area_picker.dart';
import 'common.dart';
import 'locality_picker.dart';

/// One checkable value inside a [FilterGroup].
@immutable
class FilterOption {
  const FilterOption({required this.value, required this.label, this.icon, this.count});

  final String value;
  final String label;

  /// Emoji character or image URL rendered before the label.
  final String? icon;
  final int? count;
}

/// A block of options shown as one tab in the filter sheet.
@immutable
class FilterGroup {
  const FilterGroup({
    required this.id,
    required this.label,
    required this.options,
    this.searchable = false,
  });

  final String id;
  final String label;
  final List<FilterOption> options;

  /// Adds a search box above the options — use for long lists such as categories.
  final bool searchable;
}

@immutable
class SortOption {
  const SortOption({required this.value, required this.label, required this.icon, this.short});

  final String value;
  final String label;
  final IconData icon;

  /// Compact label for the toolbar button; falls back to [label].
  final String? short;

  String get buttonLabel => short ?? label;
}

/// Label for the currently applied sort, for use on the toolbar button.
String sortLabelFor(List<SortOption> options, String value) {
  for (final option in options) {
    if (option.value == value) return option.buttonLabel;
  }
  return 'Sort';
}

/// Oldest first, with missing dates pushed to the end.
int compareDatesAsc(DateTime? a, DateTime? b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a.compareTo(b);
}

/// Newest first, with missing dates pushed to the end.
int compareDatesDesc(DateTime? a, DateTime? b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return b.compareTo(a);
}

/// Pincode → locality → area, matching the `*_covering` RPC parameters.
@immutable
class GeoFilter {
  const GeoFilter({
    this.pincode = '',
    this.locality = '',
    this.localityId,
    this.areaId = '',
    this.areaName = '',
  });

  static const empty = GeoFilter();

  final String pincode;
  final String locality;
  final String? localityId;
  final String areaId;
  final String areaName;

  bool get isEverywhere => pincode.length != 6;

  String get label {
    final parts = [areaName, locality, pincode].where((p) => p.trim().isNotEmpty);
    return parts.isEmpty ? 'All areas' : parts.join(', ');
  }

  GeoFilter copyWith({
    String? pincode,
    String? locality,
    String? localityId,
    bool clearLocalityId = false,
    String? areaId,
    String? areaName,
  }) {
    return GeoFilter(
      pincode: pincode ?? this.pincode,
      locality: locality ?? this.locality,
      localityId: clearLocalityId ? null : (localityId ?? this.localityId),
      areaId: areaId ?? this.areaId,
      areaName: areaName ?? this.areaName,
    );
  }

  @override
  bool operator ==(Object other) =>
      other is GeoFilter &&
      other.pincode == pincode &&
      other.locality == locality &&
      other.localityId == localityId &&
      other.areaId == areaId;

  @override
  int get hashCode => Object.hash(pincode, locality, localityId, areaId);
}

@immutable
class FilterState {
  const FilterState({this.selections = const {}, this.geo = GeoFilter.empty});

  final Map<String, List<String>> selections;
  final GeoFilter geo;

  List<String> valuesOf(String groupId) => selections[groupId] ?? const [];

  bool isSelected(String groupId, String value) => valuesOf(groupId).contains(value);

  /// Highest numeric value selected in [groupId], or 0 when nothing is selected.
  double maxNumberOf(String groupId) {
    var best = 0.0;
    for (final v in valuesOf(groupId)) {
      final n = double.tryParse(v);
      if (n != null && n > best) best = n;
    }
    return best;
  }

  /// Values selected across every group whose id starts with [prefix].
  List<String> valuesWithPrefix(String prefix) {
    final out = <String>[];
    selections.forEach((key, values) {
      if (key.startsWith(prefix)) out.addAll(values);
    });
    return out;
  }

  FilterState toggle(String groupId, String value) {
    final next = Map<String, List<String>>.from(selections);
    final current = [...valuesOf(groupId)];
    if (current.remove(value)) {
      if (current.isEmpty) {
        next.remove(groupId);
      } else {
        next[groupId] = current;
      }
    } else {
      next[groupId] = [...current, value];
    }
    return FilterState(selections: next, geo: geo);
  }

  /// Listing chips pick one value. Filter sheets still use [toggle].
  FilterState selectOnly(String groupId, String value) {
    final next = Map<String, List<String>>.from(selections);
    next[groupId] = [value];
    return FilterState(selections: next, geo: geo);
  }

  FilterState clearGroup(String groupId) {
    final next = Map<String, List<String>>.from(selections);
    next.remove(groupId);
    return FilterState(selections: next, geo: geo);
  }

  FilterState withGeo(GeoFilter next) => FilterState(selections: selections, geo: next);

  int activeCount(GeoFilter defaultGeo) {
    final facets = selections.values.fold<int>(0, (sum, list) => sum + list.length);
    return facets + (geo == defaultGeo ? 0 : 1);
  }
}

/// A removable chip describing one applied filter.
@immutable
class ActiveFilter {
  const ActiveFilter({required this.label, required this.onRemove});

  final String label;
  final VoidCallback onRemove;
}

/// Chips for everything currently narrowing the list, location included.
List<ActiveFilter> buildActiveFilters({
  required FilterState state,
  required List<FilterGroup> groups,
  required GeoFilter defaultGeo,
  required void Function(String groupId, String value) onToggle,
  required ValueChanged<GeoFilter> onGeoChange,
}) {
  final chips = <ActiveFilter>[];

  if (state.geo != defaultGeo) {
    if (state.geo.pincode.isNotEmpty) {
      chips.add(ActiveFilter(label: state.geo.pincode, onRemove: () => onGeoChange(defaultGeo)));
    } else {
      chips.add(ActiveFilter(label: 'All areas', onRemove: () => onGeoChange(defaultGeo)));
    }
    if (state.geo.locality.isNotEmpty) {
      chips.add(
        ActiveFilter(
          label: state.geo.locality,
          onRemove: () => onGeoChange(
            GeoFilter(pincode: state.geo.pincode),
          ),
        ),
      );
    }
    if (state.geo.areaName.isNotEmpty) {
      chips.add(
        ActiveFilter(
          label: state.geo.areaName,
          onRemove: () => onGeoChange(state.geo.copyWith(areaId: '', areaName: '')),
        ),
      );
    }
  }

  for (final group in groups) {
    for (final value in state.valuesOf(group.id)) {
      // Options can vanish when the location changes (brands, for example), so
      // fall back to the raw value to keep the chip removable.
      var label = value;
      for (final option in group.options) {
        if (option.value == value) {
          label = option.label;
          break;
        }
      }
      chips.add(ActiveFilter(label: label, onRemove: () => onToggle(group.id, value)));
    }
  }

  return chips;
}

/// Compact listing header: title, live result count, and the search/sort/filter
/// controls.
///
/// Search is an icon that opens [showFloatingSearch] so the field costs no
/// vertical space, leaving the results as high up the screen as possible.
class FilterToolbar extends StatelessWidget {
  const FilterToolbar({
    super.key,
    required this.title,
    required this.subtitle,
    required this.searchController,
    required this.onSearchChanged,
    required this.searchHint,
    required this.sortLabel,
    required this.onOpenSort,
    required this.filterCount,
    required this.onOpenFilters,
    required this.chips,
    required this.onClearAll,
    required this.resultCount,
    required this.resultNoun,
    this.searchResultLabel,
    this.animatedHint = false,
  });

  final String title;

  /// Trails the result count, e.g. "near Kothrud, 411038".
  final String subtitle;
  final TextEditingController searchController;
  final ValueChanged<String> onSearchChanged;
  final String searchHint;
  final String sortLabel;
  final VoidCallback onOpenSort;
  final int filterCount;
  final VoidCallback onOpenFilters;
  final List<ActiveFilter> chips;
  final VoidCallback onClearAll;
  final int resultCount;
  final String resultNoun;

  /// Recomputes the match count while the floating search bar is open, where a
  /// captured [resultCount] would go stale.
  final String Function()? searchResultLabel;

  /// Cycles through example searches while the field is empty (Explore only).
  final bool animatedHint;

  @override
  Widget build(BuildContext context) {
    final query = searchController.text.trim();
    final allChips = <ActiveFilter>[
      if (query.isNotEmpty)
        ActiveFilter(
          label: '“$query”',
          onRemove: () {
            searchController.clear();
            onSearchChanged('');
          },
        ),
      ...chips,
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.nunito(fontSize: 20, fontWeight: FontWeight.w800, height: 1.15),
                    ),
                    const SizedBox(height: 3),
                    RichText(
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      text: TextSpan(
                        style: const TextStyle(fontSize: 12, color: AppColors.inkSoft, fontWeight: FontWeight.w600),
                        children: [
                          TextSpan(
                            text: '$resultCount ',
                            style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.ink),
                          ),
                          TextSpan(text: resultNoun),
                          if (subtitle.trim().isNotEmpty) TextSpan(text: ' · ${subtitle.trim()}'),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              _SearchIconButton(
                active: query.isNotEmpty,
                onTap: () => showFloatingSearch(
                  context,
                  controller: searchController,
                  hint: searchHint,
                  onChanged: onSearchChanged,
                  animatedHint: animatedHint,
                  resultLabel: searchResultLabel,
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
          child: Row(
            children: [
              Expanded(
                child: _ToolbarButton(
                  icon: Icons.swap_vert_rounded,
                  label: sortLabel,
                  onTap: onOpenSort,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ToolbarButton(
                  icon: Icons.tune_rounded,
                  label: 'Filters',
                  badge: filterCount,
                  onTap: onOpenFilters,
                ),
              ),
            ],
          ),
        ),
        if (allChips.isNotEmpty)
          SizedBox(
            height: 42,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
              children: [
                for (final chip in allChips) ...[
                  _AppliedChip(chip: chip),
                  const SizedBox(width: 8),
                ],
                GestureDetector(
                  onTap: onClearAll,
                  child: Container(
                    alignment: Alignment.center,
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: const Text(
                      'Clear all',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.inkSoft,
                        decoration: TextDecoration.underline,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        const SizedBox(height: 8),
      ],
    );
  }
}

class _SearchIconButton extends StatelessWidget {
  const _SearchIconButton({required this.active, required this.onTap});

  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: active ? AppColors.blueDeep : Colors.white,
      borderRadius: BorderRadius.circular(13),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(13),
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(13),
            border: Border.all(color: active ? AppColors.blueDeep : AppColors.line, width: 1.5),
            boxShadow: AppColors.cardShadow,
          ),
          child: Icon(
            Icons.search_rounded,
            size: 20,
            color: active ? Colors.white : AppColors.blueDeep,
          ),
        ),
      ),
    );
  }
}

/// Search bar that floats over the list instead of taking a row in the header.
///
/// The barrier stays translucent so results keep filtering behind it as the
/// visitor types; dismissing keeps whatever was typed.
Future<void> showFloatingSearch(
  BuildContext context, {
  required TextEditingController controller,
  required String hint,
  required ValueChanged<String> onChanged,
  bool animatedHint = false,
  String Function()? resultLabel,
}) {
  return showGeneralDialog<void>(
    context: context,
    barrierDismissible: true,
    barrierLabel: 'Close search',
    barrierColor: AppColors.ink.withValues(alpha: 0.10),
    transitionDuration: const Duration(milliseconds: 200),
    pageBuilder: (_, _, _) => _FloatingSearchBar(
      controller: controller,
      hint: hint,
      onChanged: onChanged,
      animatedHint: animatedHint,
      resultLabel: resultLabel,
    ),
    transitionBuilder: (context, animation, _, child) {
      final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
      return FadeTransition(
        opacity: curved,
        child: SlideTransition(
          position: Tween(begin: const Offset(0, -0.15), end: Offset.zero).animate(curved),
          child: child,
        ),
      );
    },
  );
}

class _FloatingSearchBar extends StatelessWidget {
  const _FloatingSearchBar({
    required this.controller,
    required this.hint,
    required this.onChanged,
    required this.animatedHint,
    this.resultLabel,
  });

  final TextEditingController controller;
  final String hint;
  final ValueChanged<String> onChanged;
  final bool animatedHint;
  final String Function()? resultLabel;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.topCenter,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 0),
          child: Material(
            color: AppColors.bgApp,
            borderRadius: BorderRadius.circular(18),
            elevation: 12,
            shadowColor: AppColors.ink.withValues(alpha: 0.28),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(6, 4, 6, 4),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.arrow_back_rounded, size: 20, color: AppColors.inkSoft),
                        tooltip: 'Close search',
                      ),
                      Expanded(
                        child: ValueListenableBuilder<TextEditingValue>(
                          valueListenable: controller,
                          builder: (context, value, _) => Stack(
                            alignment: Alignment.centerLeft,
                            children: [
                              if (value.text.isEmpty && animatedHint)
                                const IgnorePointer(
                                  child: AnimatedSearchHint(
                                    style: TextStyle(
                                      fontSize: 14.5,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.inkFaint,
                                    ),
                                  ),
                                ),
                              TextField(
                                controller: controller,
                                autofocus: true,
                                onChanged: onChanged,
                                textInputAction: TextInputAction.search,
                                onSubmitted: (_) => Navigator.pop(context),
                                style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600),
                                decoration: InputDecoration(
                                  hintText: animatedHint && value.text.isEmpty ? '' : hint,
                                  border: InputBorder.none,
                                  enabledBorder: InputBorder.none,
                                  focusedBorder: InputBorder.none,
                                  filled: false,
                                  isDense: true,
                                  contentPadding: const EdgeInsets.symmetric(vertical: 14),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      ValueListenableBuilder<TextEditingValue>(
                        valueListenable: controller,
                        builder: (context, value, _) => value.text.isEmpty
                            ? const SizedBox(width: 8)
                            : IconButton(
                                onPressed: () {
                                  controller.clear();
                                  onChanged('');
                                },
                                icon: const Icon(Icons.close_rounded, size: 19, color: AppColors.inkSoft),
                                tooltip: 'Clear',
                              ),
                      ),
                    ],
                  ),
                  if (resultLabel != null)
                    ValueListenableBuilder<TextEditingValue>(
                      valueListenable: controller,
                      builder: (context, _, _) => Padding(
                        padding: const EdgeInsets.fromLTRB(14, 0, 14, 8),
                        child: Row(
                          children: [
                            const Icon(Icons.bolt_rounded, size: 13, color: AppColors.greenDeep),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                'Showing ${resultLabel!()}',
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.inkSoft,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ToolbarButton extends StatelessWidget {
  const _ToolbarButton({
    required this.icon,
    required this.label,
    required this.onTap,
    this.badge = 0,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final int badge;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: badge > 0 ? AppColors.blueDeep : AppColors.line, width: 1.5),
            boxShadow: AppColors.cardShadow,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 17, color: AppColors.blueDeep),
              const SizedBox(width: 7),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: AppColors.ink),
                ),
              ),
              if (badge > 0) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.blueDeep,
                    borderRadius: BorderRadius.circular(100),
                  ),
                  child: Text(
                    '$badge',
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _AppliedChip extends StatelessWidget {
  const _AppliedChip({required this.chip});

  final ActiveFilter chip;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.only(left: 12, right: 6),
      decoration: BoxDecoration(
        color: AppColors.blueSoft,
        borderRadius: BorderRadius.circular(100),
        border: Border.all(color: AppColors.blueDeep.withValues(alpha: 0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            chip.label,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.blueDeep),
          ),
          const SizedBox(width: 2),
          GestureDetector(
            onTap: chip.onRemove,
            behavior: HitTestBehavior.opaque,
            child: const Padding(
              padding: EdgeInsets.all(4),
              child: Icon(Icons.close_rounded, size: 14, color: AppColors.blueDeep),
            ),
          ),
        ],
      ),
    );
  }
}

/// Radio-style sheet listing the sort orders for a page.
Future<String?> showSortSheet(
  BuildContext context, {
  required List<SortOption> options,
  required String value,
}) {
  return showModalBottomSheet<String>(
    context: context,
    backgroundColor: AppColors.bgApp,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
    ),
    builder: (ctx) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 10),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(color: AppColors.line, borderRadius: BorderRadius.circular(100)),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 6),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text('Sort by', style: GoogleFonts.nunito(fontSize: 17, fontWeight: FontWeight.w800)),
            ),
          ),
          for (final option in options)
            ListTile(
              onTap: () => Navigator.pop(ctx, option.value),
              leading: Icon(
                option.icon,
                size: 20,
                color: option.value == value ? AppColors.blueDeep : AppColors.inkFaint,
              ),
              title: Text(
                option.label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: option.value == value ? FontWeight.w800 : FontWeight.w600,
                  color: option.value == value ? AppColors.blueDeep : AppColors.ink,
                ),
              ),
              trailing: option.value == value
                  ? const Icon(Icons.check_rounded, color: AppColors.blueDeep, size: 20)
                  : null,
            ),
          const SizedBox(height: 12),
        ],
      ),
    ),
  );
}

/// Full-height filter sheet: category/location tabs on the left, options on the right.
///
/// Returns the edited state when the visitor applies it, or `null` on dismiss.
Future<FilterState?> showFilterSheet(
  BuildContext context, {
  required List<FilterGroup> groups,
  required FilterState value,
  required GeoFilter defaultGeo,
  required String resultNoun,

  /// Live result count for a candidate state, or `null` when it needs a refetch.
  int? Function(FilterState state)? previewCount,
}) {
  return showModalBottomSheet<FilterState>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _FilterSheet(
      groups: groups,
      initial: value,
      defaultGeo: defaultGeo,
      resultNoun: resultNoun,
      previewCount: previewCount,
    ),
  );
}

class _FilterSheet extends StatefulWidget {
  const _FilterSheet({
    required this.groups,
    required this.initial,
    required this.defaultGeo,
    required this.resultNoun,
    this.previewCount,
  });

  final List<FilterGroup> groups;
  final FilterState initial;
  final GeoFilter defaultGeo;
  final String resultNoun;
  final int? Function(FilterState state)? previewCount;

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late FilterState _draft = widget.initial;
  int _tab = 0;

  List<FilterGroup> get _groups => widget.groups.where((g) => g.options.isNotEmpty).toList();

  void _toggle(String groupId, String value) {
    setState(() => _draft = _draft.toggle(groupId, value));
  }

  void _setGeo(GeoFilter geo) {
    setState(() => _draft = _draft.withGeo(geo));
  }

  @override
  Widget build(BuildContext context) {
    final groups = _groups;
    final preview = widget.previewCount?.call(_draft);
    final activeCount = _draft.activeCount(widget.defaultGeo);

    return SizedBox(
      height: MediaQuery.sizeOf(context).height * 0.88,
      child: Container(
        decoration: const BoxDecoration(
          color: AppColors.bgApp,
          borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
        ),
        child: SafeArea(
          top: false,
          child: Column(
            children: [
              const SizedBox(height: 10),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: AppColors.line, borderRadius: BorderRadius.circular(100)),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 14, 12, 12),
                child: Row(
                  children: [
                    const Icon(Icons.tune_rounded, size: 18, color: AppColors.blueDeep),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text('Filters', style: GoogleFonts.nunito(fontSize: 18, fontWeight: FontWeight.w800)),
                    ),
                    TextButton(
                      onPressed: activeCount == 0
                          ? null
                          : () => setState(
                                () => _draft = FilterState(geo: widget.defaultGeo),
                              ),
                      child: Text(
                        'Clear all',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 12.5,
                          color: activeCount == 0 ? AppColors.inkFaint : AppColors.blueDeep,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, color: AppColors.line),
              Expanded(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SizedBox(
                      width: 136,
                      child: ColoredBox(
                        color: AppColors.surface,
                        child: ListView(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          children: [
                            _RailItem(
                              label: 'Location',
                              selected: _tab == 0,
                              badge: _draft.geo == widget.defaultGeo ? 0 : 1,
                              onTap: () => setState(() => _tab = 0),
                            ),
                            for (var i = 0; i < groups.length; i++)
                              _RailItem(
                                label: groups[i].label,
                                selected: _tab == i + 1,
                                badge: _draft.valuesOf(groups[i].id).length,
                                onTap: () => setState(() => _tab = i + 1),
                              ),
                          ],
                        ),
                      ),
                    ),
                    const VerticalDivider(width: 1, color: AppColors.line),
                    Expanded(
                      child: _tab == 0
                          ? _GeoPane(
                              geo: _draft.geo,
                              defaultGeo: widget.defaultGeo,
                              onChanged: _setGeo,
                            )
                          : _OptionsPane(
                              key: ValueKey(groups[_tab - 1].id),
                              group: groups[_tab - 1],
                              state: _draft,
                              onToggle: _toggle,
                            ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, color: AppColors.line),
              Padding(
                // Extra bottom space so Apply sits above the shell's floating
                // home button instead of touching it.
                padding: EdgeInsets.fromLTRB(
                  16,
                  12,
                  16,
                  12 + (MediaQuery.sizeOf(context).width < 900 ? 28 : 0),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.inkSoft,
                          side: const BorderSide(color: AppColors.line, width: 1.5),
                          minimumSize: const Size.fromHeight(48),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppColors.radiusMd)),
                          textStyle: GoogleFonts.nunito(fontWeight: FontWeight.w700, fontSize: 14),
                        ),
                        child: const Text('Cancel'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: FilledButton(
                        onPressed: () => Navigator.pop(context, _draft),
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.blueDeep,
                          foregroundColor: Colors.white,
                          minimumSize: const Size.fromHeight(48),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppColors.radiusMd)),
                          textStyle: GoogleFonts.nunito(fontWeight: FontWeight.w700, fontSize: 14),
                        ),
                        child: Text(
                          preview == null
                              ? 'Apply filters'
                              : 'Show $preview ${preview == 1 ? widget.resultNoun.replaceAll(RegExp(r's$'), '') : widget.resultNoun}',
                        ),
                      ),
                    ),
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

class _RailItem extends StatelessWidget {
  const _RailItem({
    required this.label,
    required this.selected,
    required this.badge,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final int badge;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          color: selected ? AppColors.bgApp : Colors.transparent,
          border: Border(
            left: BorderSide(
              color: selected ? AppColors.blueDeep : Colors.transparent,
              width: 3,
            ),
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                  color: selected ? AppColors.ink : AppColors.inkSoft,
                ),
              ),
            ),
            if (badge > 0)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: AppColors.blueSoft,
                  borderRadius: BorderRadius.circular(100),
                ),
                child: Text(
                  '$badge',
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.blueDeep),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _OptionsPane extends StatefulWidget {
  const _OptionsPane({
    super.key,
    required this.group,
    required this.state,
    required this.onToggle,
  });

  final FilterGroup group;
  final FilterState state;
  final void Function(String groupId, String value) onToggle;

  @override
  State<_OptionsPane> createState() => _OptionsPaneState();
}

class _OptionsPaneState extends State<_OptionsPane> {
  final _query = TextEditingController();

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final needle = _query.text.trim().toLowerCase();
    final options = widget.group.options
        .where((o) => needle.isEmpty || o.label.toLowerCase().contains(needle))
        .toList();

    return Column(
      children: [
        if (widget.group.searchable)
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 4),
            child: TextField(
              controller: _query,
              onChanged: (_) => setState(() {}),
              style: const TextStyle(fontSize: 13.5),
              decoration: InputDecoration(
                hintText: 'Search ${widget.group.label.toLowerCase()}…',
                prefixIcon: const Icon(Icons.search_rounded, size: 18),
                filled: true,
                fillColor: AppColors.surface,
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        Expanded(
          child: options.isEmpty
              ? const Center(
                  child: Text('No matches', style: TextStyle(fontSize: 13, color: AppColors.inkSoft)),
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(6, 6, 10, 20),
                  itemCount: options.length,
                  itemBuilder: (_, i) {
                    final option = options[i];
                    final selected = widget.state.isSelected(widget.group.id, option.value);
                    return InkWell(
                      onTap: () => widget.onToggle(widget.group.id, option.value),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                        child: Row(
                          children: [
                            _CheckBox(selected: selected),
                            const SizedBox(width: 10),
                            if ((option.icon ?? '').trim().isNotEmpty) ...[
                              CategoryIcon(value: option.icon, size: 20, radius: 6, fallback: '•'),
                              const SizedBox(width: 8),
                            ],
                            Expanded(
                              child: Text(
                                option.label,
                                style: TextStyle(
                                  fontSize: 13.5,
                                  fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                                  color: selected ? AppColors.ink : AppColors.inkSoft,
                                ),
                              ),
                            ),
                            if (option.count != null)
                              Text(
                                '${option.count}',
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.inkFaint,
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class _CheckBox extends StatelessWidget {
  const _CheckBox({required this.selected});

  final bool selected;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 20,
      height: 20,
      decoration: BoxDecoration(
        color: selected ? AppColors.blueDeep : Colors.white,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: selected ? AppColors.blueDeep : AppColors.line, width: 1.5),
      ),
      child: selected
          ? const Icon(Icons.check_rounded, size: 14, color: Colors.white)
          : null,
    );
  }
}

class _GeoPane extends StatefulWidget {
  const _GeoPane({required this.geo, required this.defaultGeo, required this.onChanged});

  final GeoFilter geo;
  final GeoFilter defaultGeo;
  final ValueChanged<GeoFilter> onChanged;

  @override
  State<_GeoPane> createState() => _GeoPaneState();
}

class _GeoPaneState extends State<_GeoPane> {
  late final TextEditingController _pin = TextEditingController(text: widget.geo.pincode);

  @override
  void dispose() {
    _pin.dispose();
    super.dispose();
  }

  void _onPincode(String raw) {
    final pincode = raw.replaceAll(RegExp(r'\D'), '');
    widget.onChanged(GeoFilter(pincode: pincode));
  }

  Future<void> _onLocality(String? name) async {
    final locality = name ?? '';
    widget.onChanged(GeoFilter(pincode: widget.geo.pincode, locality: locality));
    if (locality.isEmpty) return;
    try {
      final id = await resolveLocalityId(widget.geo.pincode, locality);
      if (!mounted) return;
      widget.onChanged(
        GeoFilter(pincode: widget.geo.pincode, locality: locality, localityId: id),
      );
    } catch (_) {
      // Keep the name-only selection; the RPC falls back to whole-pincode coverage.
    }
  }

  @override
  Widget build(BuildContext context) {
    final geo = widget.geo;
    final customised = geo != widget.defaultGeo;

    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 24),
      children: [
        const FieldLabel('Pincode'),
        TextField(
          controller: _pin,
          keyboardType: TextInputType.number,
          maxLength: 6,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          style: monoStyle(fontSize: 15, fontWeight: FontWeight.w600),
          onChanged: _onPincode,
          decoration: const InputDecoration(
            hintText: 'Any pincode',
            counterText: '',
            isDense: true,
          ),
        ),
        if (geo.pincode.length == 6) ...[
          const SizedBox(height: 14),
          LocalityPicker(
            pincode: geo.pincode,
            value: geo.locality.isEmpty ? null : geo.locality,
            onChanged: (name) => _onLocality(name),
          ),
          if (geo.locality.isNotEmpty)
            AreaPicker(
              pincode: geo.pincode,
              locality: geo.locality,
              value: geo.areaId.isEmpty ? null : geo.areaId,
              onChanged: (id, name) => widget.onChanged(
                geo.copyWith(areaId: id ?? '', areaName: name ?? ''),
              ),
            ),
        ] else
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: Text(
              'Enter a 6-digit pincode to narrow down by locality and area.',
              style: TextStyle(fontSize: 12, color: AppColors.inkSoft, height: 1.4),
            ),
          ),
        const SizedBox(height: 18),
        if (customised)
          _GeoResetButton(
            icon: Icons.my_location_rounded,
            label: widget.defaultGeo.pincode.isEmpty
                ? 'Clear location'
                : 'Back to ${widget.defaultGeo.label}',
            onTap: () {
              _pin.text = widget.defaultGeo.pincode;
              widget.onChanged(widget.defaultGeo);
            },
          ),
        if (!geo.isEverywhere)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: _GeoResetButton(
              icon: Icons.public_rounded,
              label: 'Show all areas',
              onTap: () {
                _pin.clear();
                widget.onChanged(GeoFilter.empty);
              },
            ),
          ),
      ],
    );
  }
}

class _GeoResetButton extends StatelessWidget {
  const _GeoResetButton({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          children: [
            Icon(icon, size: 15, color: AppColors.blueDeep),
            const SizedBox(width: 7),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: AppColors.blueDeep),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
