import 'package:flutter/material.dart';

import '../services/postal.dart';
import '../theme/app_theme.dart';
import 'common.dart';

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
      setState(() => _areas = []);
      widget.onAvailabilityChange?.call(false);
      if (widget.value != null) widget.onChanged(null, null);
      return;
    }
    setState(() => _loading = true);
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
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _areas = [];
        _loading = false;
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
    if (_areas.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 12),
        const FieldLabel('Area / colony'),
        DropdownButtonFormField<String>(
          value: widget.value != null && _areas.any((a) => a.id == widget.value) ? widget.value : null,
          decoration: const InputDecoration(hintText: 'Select your area / colony'),
          items: [
            for (final a in _areas) DropdownMenuItem(value: a.id, child: Text(a.name, overflow: TextOverflow.ellipsis)),
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
      ],
    );
  }
}
