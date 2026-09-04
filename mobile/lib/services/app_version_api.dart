import 'dart:convert';
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import '../models/models.dart';

/// Fetches the active store version gate for the current platform.
class AppVersionApi {
  AppVersionApi({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  static String? get currentPlatform {
    if (kIsWeb) return null;
    if (Platform.isAndroid) return 'android';
    if (Platform.isIOS) return 'ios';
    return null;
  }

  Future<AppVersionInfo?> fetchActive({String? platform}) async {
    final p = platform ?? currentPlatform;
    if (p == null) return null;

    final res = await _client.get(
      Uri.parse('${AppConfig.apiBaseUrl}/api/app-version?platform=$p'),
      headers: {'Accept': 'application/json'},
    );
    if (res.statusCode == 404) return null;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Could not fetch app version');
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return AppVersionInfo.fromJson(data);
  }
}

/// Semver-ish compare: `1.0.5` vs `1.0.10`. Returns negative if [a] < [b].
int compareAppVersions(String a, String b) {
  List<int> parts(String v) =>
      v.split(RegExp(r'[^0-9]+')).where((s) => s.isNotEmpty).map((s) => int.tryParse(s) ?? 0).toList();
  final pa = parts(a);
  final pb = parts(b);
  final len = pa.length > pb.length ? pa.length : pb.length;
  for (var i = 0; i < len; i++) {
    final x = i < pa.length ? pa[i] : 0;
    final y = i < pb.length ? pb[i] : 0;
    if (x != y) return x.compareTo(y);
  }
  return 0;
}

enum AppUpdateKind { none, optional, required }

AppUpdateKind resolveAppUpdateKind({
  required String currentVersion,
  required AppVersionInfo remote,
}) {
  if (compareAppVersions(currentVersion, remote.minimumVersion) < 0) {
    return AppUpdateKind.required;
  }
  if (compareAppVersions(currentVersion, remote.latestVersion) < 0) {
    return AppUpdateKind.optional;
  }
  return AppUpdateKind.none;
}
