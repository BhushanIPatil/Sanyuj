import 'package:flutter/material.dart';

import '../services/location.dart';
import '../theme/app_theme.dart';
import 'filters.dart';
import 'location_disclosure.dart';

/// The same location-only sheet for Home, Offerly, and Notify.
Future<GeoFilter?> showLocationSheet(
  BuildContext context, {
  required GeoFilter value,
}) async {
  final result = await showFilterSheet(
    context,
    groups: const [],
    value: FilterState(geo: value),
    defaultGeo: GeoFilter(
      pincode: LocationService.instance.lastFix?.pincode ?? '',
    ),
    resultNoun: 'results',
    onUseCurrentLocation: () async {
      final accepted = await confirmLocationUse(context);
      if (!accepted || !context.mounted) return null;
      final fix = await LocationService.instance.fetchCurrentLocation(
        forceRefresh: true,
      );
      if (!context.mounted) return null;
      if (fix?.pincode == null) {
        throw StateError('Location is unavailable. Choose your area manually.');
      }
      return (geo: GeoFilter(pincode: fix!.pincode!), address: fix.address);
    },
  );
  return result?.geo;
}

class LocationLink extends StatefulWidget {
  const LocationLink({
    super.key,
    required this.label,
    required this.onTap,
    this.fontSize = 12,
    this.maxLines = 1,
  });

  final String label;
  final VoidCallback onTap;
  final double fontSize;
  final int maxLines;

  @override
  State<LocationLink> createState() => _LocationLinkState();
}

class _LocationLinkState extends State<LocationLink>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 800),
  );
  late final Animation<double> _opacity = Tween<double>(
    begin: 1,
    end: 0.55,
  ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller.stop();
      _controller.value = 0;
    } else if (!_controller.isAnimating) {
      _controller.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    child: GestureDetector(
      onTap: widget.onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: FadeTransition(
          opacity: _opacity,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.my_location,
                size: 18,
                color: AppColors.blueDeep,
              ),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  widget.label,
                  maxLines: widget.maxLines,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: widget.fontSize,
                    fontWeight: FontWeight.w700,
                    color: AppColors.blueDeep,
                    height: 1.35,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
