import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme/app_theme.dart';

class SearchableSelectOption<T> {
  const SearchableSelectOption({required this.value, required this.label, this.subtitle});

  final T value;
  final String label;
  final String? subtitle;
}

class SearchableSelect<T> extends StatelessWidget {
  const SearchableSelect({
    super.key,
    required this.label,
    required this.hint,
    required this.options,
    required this.value,
    required this.onChanged,
    this.enabled = true,
  });

  final String label;
  final String hint;
  final List<SearchableSelectOption<T>> options;
  final T? value;
  final ValueChanged<T?> onChanged;
  final bool enabled;

  String? get _selectedLabel {
    for (final o in options) {
      if (o.value == value) return o.label;
    }
    return null;
  }

  Future<void> _open(BuildContext context) async {
    if (!enabled) return;
    final selected = await showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.bgApp,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (ctx) => _SearchableSelectSheet<T>(
        title: label,
        hint: hint,
        options: options,
        value: value,
      ),
    );
    if (selected != null) onChanged(selected);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 8, top: 4),
          child: Text(
            label,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.ink),
          ),
        ),
        Material(
          color: Colors.white,
          borderRadius: BorderRadius.circular(AppColors.radiusMd),
          child: InkWell(
            onTap: enabled ? () => _open(context) : null,
            borderRadius: BorderRadius.circular(AppColors.radiusMd),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(AppColors.radiusMd),
                border: Border.all(color: AppColors.line, width: 1.5),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      _selectedLabel ?? hint,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: _selectedLabel == null ? AppColors.inkFaint : AppColors.ink,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Icon(
                    Icons.keyboard_arrow_down_rounded,
                    color: enabled ? AppColors.inkSoft : AppColors.inkFaint,
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _SearchableSelectSheet<T> extends StatefulWidget {
  const _SearchableSelectSheet({
    required this.title,
    required this.hint,
    required this.options,
    required this.value,
  });

  final String title;
  final String hint;
  final List<SearchableSelectOption<T>> options;
  final T? value;

  @override
  State<_SearchableSelectSheet<T>> createState() => _SearchableSelectSheetState<T>();
}

class _SearchableSelectSheetState<T> extends State<_SearchableSelectSheet<T>> {
  final _query = TextEditingController();

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final q = _query.text.trim().toLowerCase();
    final filtered = widget.options.where((o) {
      if (q.isEmpty) return true;
      final hay = '${o.label} ${o.subtitle ?? ''}'.toLowerCase();
      return hay.contains(q);
    }).toList();

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
        child: SizedBox(
          height: MediaQuery.sizeOf(context).height * 0.62,
          child: Column(
            children: [
              const SizedBox(height: 10),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: AppColors.line, borderRadius: BorderRadius.circular(100)),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 8),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(widget.title, style: GoogleFonts.nunito(fontSize: 17, fontWeight: FontWeight.w800)),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: TextField(
                  controller: _query,
                  autofocus: true,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    hintText: 'Search…',
                    prefixIcon: const Icon(Icons.search_rounded),
                    filled: true,
                    fillColor: AppColors.surface,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: filtered.isEmpty
                    ? const Center(
                        child: Text('No matches', style: TextStyle(color: AppColors.inkSoft)),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(12, 4, 12, 20),
                        itemCount: filtered.length,
                        separatorBuilder: (_, _) => const Divider(height: 1, color: AppColors.line),
                        itemBuilder: (_, i) {
                          final o = filtered[i];
                          final selected = o.value == widget.value;
                          return ListTile(
                            title: Text(o.label, style: TextStyle(fontWeight: selected ? FontWeight.w800 : FontWeight.w600)),
                            subtitle: o.subtitle == null ? null : Text(o.subtitle!, style: const TextStyle(fontSize: 12)),
                            trailing: selected ? const Icon(Icons.check_rounded, color: AppColors.blueDeep) : null,
                            onTap: () => Navigator.pop(context, o.value),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
