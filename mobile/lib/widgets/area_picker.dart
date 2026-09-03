import 'package:flutter/material.dart';

import '../utils/errors.dart';
import '../services/postal.dart';
import '../theme/app_theme.dart';
import 'searchable_select.dart';

class AreaPicker extends StatefulWidget {
  const AreaPicker({
    super.key,
    required this.pincode,
    required this.locality,
    required this.value,
    required this.onChanged,
    this.onAvailabilityChange,
  });

  final String pincode;
  final String? locality;
  final String? value;
  final void Function(String? id, String? name) onChanged;
  final ValueChanged<bool>? onAvailabilityChange;

  @override
  State<AreaPicker> createState() => _AreaPickerState();
}

class _AreaPickerState extends State<AreaPicker> {
  List<AreaOption> _areas = [];
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant AreaPicker oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.pincode != widget.pincode || oldWidget.locality != widget.locality) {
      _load();
    }
  }

  Future<void> _load() async {
    final locality = widget.locality?.trim() ?? '';
    if (widget.pincode.length != 6 || locality.isEmpty) {
      setState(() {
        _areas = [];
        _error = null;
      });
      widget.onAvailabilityChange?.call(false);
      if (widget.value != null) widget.onChanged(null, null);
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final localityId = await resolveLocalityId(widget.pincode, locality);
      final list = localityId == null ? <AreaOption>[] : await fetchAreasForLocality(localityId);
      if (!mounted) return;
      setState(() {
        _areas = list;
        _loading = false;
      });
      widget.onAvailabilityChange?.call(list.isNotEmpty);
      if (widget.value != null && !list.any((a) => a.id == widget.value)) {
        widget.onChanged(null, null);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _areas = [];
        _loading = false;
        _error = friendlyError(e);
      });
      widget.onAvailabilityChange?.call(false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locality = widget.locality?.trim() ?? '';
    if (widget.pincode.length != 6 || locality.isEmpty) return const SizedBox.shrink();
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.only(top: 8),
        child: Text('Loading areas…', style: TextStyle(fontSize: 12, color: AppColors.inkSoft)),
      );
    }
    if (_error != null) {
      return Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Text(_error!, style: const TextStyle(fontSize: 12, color: AppColors.rose)),
      );
    }
    if (_areas.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: SearchableSelect<String>(
        label: 'Area / colony',
        hint: 'Select your area / colony',
        value: widget.value != null && _areas.any((a) => a.id == widget.value) ? widget.value : null,
        options: [
          for (final a in _areas) SearchableSelectOption(value: a.id, label: a.name),
        ],
        onChanged: (id) {
          AreaOption? match;
          for (final a in _areas) {
            if (a.id == id) {
              match = a;
              break;
            }
          }
          widget.onChanged(id, match?.name);
        },
      ),
    );
  }
}
