import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';

class JobsApiException implements Exception {
  JobsApiException(this.message, {this.statusCode, this.code});

  final String message;
  final int? statusCode;
  final String? code;

  bool get isDailyLimit =>
      statusCode == 429 || code == 'JOB_DAILY_LIMIT';

  @override
  String toString() => message;
}

/// Creates jobs via the webapp API (enforces one post per user per day).
class JobsApi {
  JobsApi({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Future<void> createJob({
    required String accessToken,
    required String categoryId,
    required String title,
    required String description,
    required String pincode,
    required String locality,
    String? areaId,
    String? area,
    required String urgency,
    int? budgetMin,
    int? budgetMax,
  }) async {
    final res = await _client.post(
      Uri.parse('${AppConfig.apiBaseUrl}/api/jobs'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
        'Accept': 'application/json',
      },
      body: jsonEncode({
        'categoryId': categoryId,
        'title': title,
        'description': description,
        'pincode': pincode,
        'locality': locality,
        'areaId': areaId,
        'area': area,
        'urgency': urgency,
        'budgetMin': budgetMin,
        'budgetMax': budgetMax,
      }),
    );

    Map<String, dynamic> data = {};
    try {
      final decoded = jsonDecode(res.body);
      if (decoded is Map<String, dynamic>) data = decoded;
    } catch (_) {}
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw JobsApiException(
        data['error'] as String? ?? 'Could not post job',
        statusCode: res.statusCode,
        code: data['code'] as String?,
      );
    }
  }
}
