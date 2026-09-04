import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';

/// Registers / deactivates FCM device tokens via the webapp API.
class DeviceTokenApi {
  DeviceTokenApi({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Future<void> register({
    required String accessToken,
    required String deviceToken,
    String? deviceId,
    String? deviceName,
    String? deviceOs,
    String? osVersion,
    String? appVersion,
  }) async {
    final res = await _client.post(
      Uri.parse('${AppConfig.apiBaseUrl}/api/notifications/devices'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
        'Accept': 'application/json',
      },
      body: jsonEncode({
        'deviceToken': deviceToken,
        'deviceId': ?deviceId,
        'deviceName': ?deviceName,
        'deviceOs': ?deviceOs,
        'osVersion': ?osVersion,
        'appVersion': ?appVersion,
      }),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      throw Exception(data['error'] as String? ?? 'Could not register device');
    }
  }

  Future<void> deactivate({
    required String accessToken,
    required String deviceToken,
  }) async {
    final res = await _client.delete(
      Uri.parse('${AppConfig.apiBaseUrl}/api/notifications/devices'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
        'Accept': 'application/json',
      },
      body: jsonEncode({'deviceToken': deviceToken}),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      throw Exception(data['error'] as String? ?? 'Could not deactivate device');
    }
  }
}
