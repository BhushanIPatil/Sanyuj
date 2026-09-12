import 'dart:async';
import 'dart:convert';

import 'package:geolocator/geolocator.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';

class LocationFix {
  LocationFix({required this.address, this.pincode, this.lat, this.lng});

  final String address;
  final String? pincode;
  final double? lat;
  final double? lng;
}

class LocationService {
  LocationService._();
  static final instance = LocationService._();

  LocationFix? _lastFix;
  DateTime? _lastFixAt;
  Future<LocationFix?>? _inFlight;

  LocationFix? get lastFix => _lastFix;
  final currentFix = ValueNotifier<LocationFix?>(null);

  Future<String?> fetchCurrentAddress() async {
    return (await fetchCurrentLocation())?.address;
  }

  /// GPS + reverse-geocode via webapp `/api/geo/reverse`.
  ///
  /// Reuses a recent fix so refresh is instant. On GPS/network timeout, returns
  /// the last successful address instead of throwing.
  Future<LocationFix?> fetchCurrentLocation({bool forceRefresh = false}) async {
    if (!forceRefresh && _isFresh(_lastFixAt, const Duration(minutes: 2))) {
      return _lastFix;
    }
    if (forceRefresh && _isFresh(_lastFixAt, const Duration(seconds: 30))) {
      return _lastFix;
    }
    if (_inFlight != null) return _inFlight;
    _inFlight = _resolve(forceRefresh: forceRefresh);
    try {
      return await _inFlight;
    } finally {
      _inFlight = null;
    }
  }

  bool _isFresh(DateTime? at, Duration maxAge) {
    if (_lastFix == null || at == null) return false;
    return DateTime.now().difference(at) < maxAge;
  }

  Future<LocationFix?> _resolve({required bool forceRefresh}) async {
    try {
      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) return _lastFix;

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return _lastFix;
      }

      Position? lastKnown = await Geolocator.getLastKnownPosition();
      Position? pos;
      {
        try {
          pos = await Geolocator.getCurrentPosition(
            locationSettings: LocationSettings(
              accuracy: forceRefresh
                  ? LocationAccuracy.low
                  : LocationAccuracy.medium,
              timeLimit: Duration(seconds: forceRefresh ? 8 : 12),
            ),
          );
        } on TimeoutException {
          pos = lastKnown;
        } catch (_) {
          pos = lastKnown;
        }
      }

      if (pos == null) return _lastFix;

      final fix = await _reverseGeocode(pos);
      if (fix != null) {
        _lastFix = fix;
        currentFix.value = fix;
        _lastFixAt = DateTime.now();
        return fix;
      }
      return _lastFix;
    } catch (_) {
      return _lastFix;
    }
  }

  Future<LocationFix?> _reverseGeocode(Position pos) async {
    final uri = Uri.parse(
      '${AppConfig.apiBaseUrl}/api/geo/reverse'
      '?lat=${pos.latitude}&lng=${pos.longitude}',
    );
    final res = await http.get(uri).timeout(const Duration(seconds: 10));
    if (res.statusCode < 200 || res.statusCode >= 300) return null;
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final address = (data['address'] as String?)?.trim();
    if (address == null || address.isEmpty) return null;
    final pin = (data['pincode'] as String?)?.replaceAll(RegExp(r'\D'), '');
    return LocationFix(
      address: address,
      pincode: (pin != null && pin.length == 6) ? pin : null,
      lat: (data['lat'] as num?)?.toDouble() ?? pos.latitude,
      lng: (data['lng'] as num?)?.toDouble() ?? pos.longitude,
    );
  }
}
