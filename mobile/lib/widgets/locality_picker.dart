import 'package:flutter/material.dart';

import '../utils/errors.dart';
import '../services/postal.dart';
import '../theme/app_theme.dart';
import 'searchable_select.dart';

class LocalityPicker extends StatefulWidget {
  const LocalityPicker({
    super.key,
    required this.pincode,
    required this.value,
    required this.onChanged,
  });

  final String pincode;
  final String? value;
  final ValueChanged<String?> onChanged;

  @override
  State<LocalityPicker> createState() => _LocalityPickerState();
}

class _LocalityPickerState extends State<LocalityPicker> {
  List<PostalLocality> _localities = [];
  bool _loading = false;
  String? _error;
  bool _fromCache = false;

  @override
  void didUpdateWidget(covariant LocalityPicker oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.pincode != widget.pincode) {
      _load();
    }
  }

  @override
  void initState() {
    super.initState();
    if (widget.pincode.length == 6) _load();
  }

  Future<void> _load() async {
    if (widget.pincode.length != 6) {
      setState(() {
        _localities = [];
        _error = null;
        _loading = false;
        _fromCache = false;
      });
      if (widget.value != null) widget.onChanged(null);
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
      _fromCache = false;
    });
    try {
      final cached = await fetchCachedLocalities(widget.pincode);
      List<PostalLocality> list;
      var fromCache = false;
      try {
        list = await fetchLocalitiesForPincode(widget.pincode);
        fromCache = cached.isNotEmpty && list.every((l) => cached.any((c) => c.name == l.name)) && cached.length == list.length;
      } catch (_) {
        list = cached;
        fromCache = cached.isNotEmpty;
        if (list.isEmpty) rethrow;
      }
      if (!mounted) return;
      setState(() {
        _localities = list;
        _loading = false;
        _fromCache = fromCache;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = friendlyError(e);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.pincode.length != 6) {
      return const Padding(
        padding: EdgeInsets.only(top: 6),
        child: Text(
          'Enter your 6-digit pincode to see localities.',
          style: TextStyle(fontSize: 12, color: AppColors.inkSoft),
        ),
      );
    }

    if (_loading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 12),
        child: Center(
          child: SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2.4, color: AppColors.blueDeep),
          ),
        ),
      );
    }

    final options = [..._localities];
    if (widget.value != null && widget.value!.isNotEmpty && !options.any((l) => l.name == widget.value)) {
      options.insert(0, PostalLocality(name: widget.value!));
    }

    if (_error != null && options.isEmpty) {
      return Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Text(_error!, style: const TextStyle(fontSize: 12, color: AppColors.rose)),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SearchableSelect<String>(
          label: 'Locality',
          hint: 'Select your locality',
          value: widget.value != null && options.any((l) => l.name == widget.value) ? widget.value : null,
          options: [
            for (final l in options)
              SearchableSelectOption(
                value: l.name,
                label: l.name,
                subtitle: l.district,
              ),
          ],
          onChanged: widget.onChanged,
        ),
        if (_fromCache)
          const Padding(
            padding: EdgeInsets.only(top: 6),
            child: Text(
              'Showing saved localities while postal lookup is unavailable.',
              style: TextStyle(fontSize: 11, color: AppColors.inkSoft),
            ),
          ),
      ],
    );
  }
}
