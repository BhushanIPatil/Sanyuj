import 'dart:async';

import 'package:flutter/material.dart';

import '../services/location.dart';

/// Refresh only while the app is visible; share one fix across all tabs.
class LocationSession extends StatefulWidget {
  const LocationSession({super.key, required this.child});
  final Widget child;
  @override
  State<LocationSession> createState() => _LocationSessionState();
}

class _LocationSessionState extends State<LocationSession>
    with WidgetsBindingObserver {
  Timer? _timer;
  bool _visible = true;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refresh();
    _timer = Timer.periodic(const Duration(minutes: 2), (_) {
      if (_visible) _refresh();
    });
  }

  void _refresh() {
    unawaited(LocationService.instance.fetchCurrentLocation());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _visible = state == AppLifecycleState.resumed;
    if (_visible) _refresh();
  }

  @override
  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
