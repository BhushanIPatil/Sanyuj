import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/app_config.dart';
import 'guest.dart';
import 'push_notifications.dart';

class AuthSessionResult {
  AuthSessionResult({
    required this.accessToken,
    required this.refreshToken,
    required this.userId,
  });

  final String accessToken;
  final String refreshToken;
  final String userId;
}

class AuthRegisterResult {
  AuthRegisterResult({
    this.session,
    this.otpSent = false,
    this.email,
    this.purpose,
  });

  final AuthSessionResult? session;
  final bool otpSent;
  final String? email;
  final String? purpose;

  bool get confirmationSent => otpSent;
}

class AuthApiException implements Exception {
  AuthApiException(
    this.message, {
    this.statusCode,
    this.restoreAvailable = false,
    this.otpRequired = false,
    this.email,
    this.retryAfter,
  });

  final String message;
  final int? statusCode;
  final bool restoreAvailable;
  final bool otpRequired;
  final String? email;
  final int? retryAfter;

  bool get isRateLimited => statusCode == 429;

  @override
  String toString() => message;
}

class AuthApi {
  AuthApi({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  String get _redirectTo => '${Uri.parse(AppConfig.privacyUrl).origin}/auth/login';

  Never _throwApiError(
    Map<String, dynamic> data,
    int statusCode, {
    String fallback = 'Request failed',
  }) {
    throw AuthApiException(
      data['error'] as String? ?? fallback,
      statusCode: statusCode,
      retryAfter: (data['retryAfter'] as num?)?.toInt(),
      restoreAvailable: data['restore_available'] == true,
      otpRequired: data['otp_required'] == true || data['confirmation_required'] == true,
      email: data['email'] as String?,
    );
  }

  Future<AuthSessionResult> login({required String email, required String password}) =>
      _auth('/api/auth/login', email: email, password: password);

  Future<AuthRegisterResult> register({required String email, required String password}) async {
    final res = await _client.post(
      Uri.parse('${AppConfig.apiBaseUrl}/api/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
        'redirectTo': _redirectTo,
      }),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode == 409 && data['restore_available'] == true) {
      throw AuthApiException(
        data['error'] as String? ?? 'Restore available',
        statusCode: 409,
        restoreAvailable: true,
      );
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      _throwApiError(data, res.statusCode, fallback: 'Authentication failed');
    }
    if (data['otp_sent'] == true || data['confirmation_sent'] == true) {
      return AuthRegisterResult(
        otpSent: true,
        email: data['email'] as String? ?? email,
        purpose: data['purpose'] as String? ?? 'signup',
      );
    }
    return AuthRegisterResult(session: _sessionFrom(data));
  }

  Future<AuthRegisterResult> restore({required String email, required String password}) async {
    final res = await _client.post(
      Uri.parse('${AppConfig.apiBaseUrl}/api/auth/restore'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
        'redirectTo': _redirectTo,
      }),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      _throwApiError(data, res.statusCode, fallback: 'Could not start restore');
    }
    if (data['otp_sent'] == true) {
      return AuthRegisterResult(
        otpSent: true,
        email: data['email'] as String? ?? email,
        purpose: data['purpose'] as String? ?? 'restore',
      );
    }
    return AuthRegisterResult(session: _sessionFrom(data));
  }

  Future<void> sendOtp({required String email, required String purpose}) async {
    final res = await _client.post(
      Uri.parse('${AppConfig.apiBaseUrl}/api/auth/send-otp'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'purpose': purpose,
        'redirectTo': _redirectTo,
      }),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode == 409 && data['restore_available'] == true) {
      throw AuthApiException(
        data['error'] as String? ?? 'Restore available',
        statusCode: 409,
        restoreAvailable: true,
      );
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      _throwApiError(data, res.statusCode, fallback: 'Could not send code');
    }
  }

  Future<AuthSessionResult> verifyOtp({
    required String email,
    required String token,
    required String purpose,
    String? password,
  }) async {
    final res = await _client.post(
      Uri.parse('${AppConfig.apiBaseUrl}/api/auth/verify-otp'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'token': token,
        'purpose': purpose,
        if (password != null) 'password': password,
      }),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw AuthApiException(
        data['error'] as String? ?? 'Invalid or expired code',
        statusCode: res.statusCode,
      );
    }
    return _sessionFrom(data);
  }

  Future<void> setPassword({
    required String email,
    required String password,
    required String accessToken,
    required String refreshToken,
  }) async {
    final res = await _client.post(
      Uri.parse('${AppConfig.apiBaseUrl}/api/auth/set-password'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
        'access_token': accessToken,
        'refresh_token': refreshToken,
      }),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      throw AuthApiException(
        data['error'] as String? ?? 'Could not update password',
        statusCode: res.statusCode,
      );
    }
  }

  @Deprecated('Use sendOtp(purpose: signup)')
  Future<void> resendSignupEmail(String email) => sendOtp(email: email, purpose: 'signup');

  Future<AuthSessionResult> _auth(
    String path, {
    required String email,
    required String password,
  }) async {
    final res = await _client.post(
      Uri.parse('${AppConfig.apiBaseUrl}$path'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode == 409 && data['restore_available'] == true) {
      throw AuthApiException(
        data['error'] as String? ?? 'Restore available',
        statusCode: 409,
        restoreAvailable: true,
      );
    }
    if (res.statusCode == 403 &&
        (data['otp_required'] == true || data['confirmation_required'] == true)) {
      throw AuthApiException(
        data['error'] as String? ?? 'Verify your email first',
        statusCode: 403,
        otpRequired: true,
        email: data['email'] as String? ?? email,
      );
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw AuthApiException(
        data['error'] as String? ?? 'Authentication failed',
        statusCode: res.statusCode,
      );
    }
    return _sessionFrom(data);
  }

  AuthSessionResult _sessionFrom(Map<String, dynamic> data) {
    final session = data['session'] as Map<String, dynamic>?;
    final user = session?['user'] as Map<String, dynamic>?;
    if (session == null || user == null) {
      throw AuthApiException('Authentication failed');
    }
    return AuthSessionResult(
      accessToken: session['access_token'] as String,
      refreshToken: session['refresh_token'] as String,
      userId: user['id'] as String,
    );
  }

  Future<void> deleteAccount(String accessToken) async {
    final res = await _client.post(
      Uri.parse('${AppConfig.apiBaseUrl}/api/account/delete'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      _throwApiError(data, res.statusCode, fallback: 'Could not delete account');
    }
  }
}

Future<void> applyAuthSession(AuthSessionResult session) async {
  await GuestSession.instance.clear();
  await Supabase.instance.client.auth.setSession(session.refreshToken);
  await PushNotifications.syncTokenToServer();
}
