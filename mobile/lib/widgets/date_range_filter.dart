import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

String _day(DateTime value) => value.toIso8601String().substring(0, 10);

List<(String, String)> dateRangePresets([DateTime? now]) {
  final today = now ?? DateTime.now();
  String day(int offset) =>
      _day(DateTime(today.year, today.month, today.day + offset));
  return [
    ('Any time', ''),
    ('Today', '${day(0)}|${day(0)}'),
    ('Tomorrow', '${day(1)}|${day(1)}'),
    ('Next 7 days', '${day(0)}|${day(6)}'),
    ('Next 30 days', '${day(0)}|${day(29)}'),
  ];
}

String dateRangeLabel(BuildContext context, String value) {
  if (value.isEmpty) return 'Any time';
  final parts = value.split('|');
  final localizations = MaterialLocalizations.of(context);
  String format(String day) =>
      localizations.formatMediumDate(DateTime.parse(day));
  if (parts[0] == parts[1]) return format(parts[0]);
  return '${format(parts[0])} to ${format(parts[1])}';
}

class DateRangeFilter extends StatefulWidget {
  const DateRangeFilter({
    super.key,
    required this.value,
    required this.onChanged,
  });

  final String value;
  final ValueChanged<String> onChanged;

  @override
  State<DateRangeFilter> createState() => _DateRangeFilterState();
}

class _DateRangeFilterState extends State<DateRangeFilter> {
  late bool _custom =
      widget.value.isNotEmpty &&
      !dateRangePresets().any((preset) => preset.$2 == widget.value);

  void _update(String value) {
    if (value != widget.value) widget.onChanged(value);
  }

  Future<void> _pickDate({required bool start}) async {
    final parts = widget.value.split('|');
    final now = DateTime.now();
    final from =
        DateTime.tryParse(parts.first) ??
        DateTime(now.year, now.month, now.day);
    final to = parts.length > 1 ? DateTime.tryParse(parts[1]) ?? from : from;
    final picked = await showDatePicker(
      context: context,
      helpText: start ? 'Choose start date' : 'Choose end date',
      initialDate: start ? from : to,
      firstDate: start ? DateTime(1900) : from,
      lastDate: DateTime(2100, 12, 31),
    );
    if (picked == null || !mounted) return;
    final nextFrom = start ? picked : from;
    final nextTo = start && (widget.value.isEmpty || picked.isAfter(to))
        ? picked
        : (start ? to : picked);
    _update('${_day(nextFrom)}|${_day(nextTo)}');
  }

  @override
  Widget build(BuildContext context) {
    final parts = widget.value.split('|');
    final from = DateTime.tryParse(parts.first);
    final to = parts.length > 1 ? DateTime.tryParse(parts[1]) : null;
    final localizations = MaterialLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Choose when you want to see active items.',
          style: TextStyle(fontSize: 13, height: 1.5, color: AppColors.inkSoft),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: [
            for (final preset in dateRangePresets())
              ChoiceChip(
                label: Text(preset.$1),
                selected: !_custom && widget.value == preset.$2,
                onSelected: (_) {
                  setState(() => _custom = false);
                  _update(preset.$2);
                },
              ),
            ChoiceChip(
              avatar: const Icon(Icons.calendar_month_outlined, size: 18),
              label: const Text('Custom dates'),
              selected: _custom,
              onSelected: (_) => setState(() => _custom = true),
            ),
          ],
        ),
        if (_custom) ...[
          const SizedBox(height: 16),
          const Text(
            'Pick a start and end date. Both days are included.',
            style: TextStyle(
              fontSize: 12,
              height: 1.5,
              color: AppColors.inkSoft,
            ),
          ),
          const SizedBox(height: 10),
          for (final field in [
            (true, 'Start date', from),
            (false, 'End date', to),
          ])
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => _pickDate(start: field.$1),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.all(12),
                    alignment: Alignment.centerLeft,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        field.$2,
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.inkSoft,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        field.$3 == null
                            ? 'Choose date'
                            : localizations.formatMediumDate(field.$3!),
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
        const SizedBox(height: 12),
        Semantics(
          liveRegion: true,
          child: Text(
            dateRangeLabel(context, widget.value),
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.blueDeep,
            ),
          ),
        ),
      ],
    );
  }
}
