import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/app_config.dart';
import 'guest.dart';

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
  AuthRegisterResult({this.session, this.confirmationSent = false, this.email});

  final AuthSessionResult? session;
  final bool confirmationSent;
  final String? email;
}

class AuthApiException implements Exception {
  AuthApiException(this.message, {this.statusCode, this.restoreAvailable = false});

  final String message;
  final int? statusCode;
  final bool restoreAvailable;

  @override
  String toString() => message;
}

class AuthApi {
  AuthApi({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Future<AuthSessionResult> login({required String email, required String password}) =>
      _auth('/api/auth/login', email: email, password: password);

  Future<AuthRegisterResult> register({required String email, required String password}) async {
    final res = await _client.post(
      Uri.parse('${AppConfig.apiBaseUrl}/api/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
        'redirectTo': '${Uri.parse(AppConfig.privacyUrl).origin}/auth/login',
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
      throw AuthApiException(
        data['error'] as String? ?? 'Authentication failed',
        statusCode: res.statusCode,
      );
    }
    if (data['confirmation_sent'] == true) {
      return AuthRegisterResult(
        confirmationSent: true,
        email: data['email'] as String? ?? email,
      );
    }
    return AuthRegisterResult(session: _sessionFrom(data));
  }

  Future<AuthSessionResult> restore({required String email, required String password}) =>
      _auth('/api/auth/restore', email: email, password: password);

  Future<void> resendSignupEmail(String email) async {
    await Supabase.instance.client.auth.resend(
      type: OtpType.signup,
      email: email,
      emailRedirectTo: '${Uri.parse(AppConfig.privacyUrl).origin}/auth/login',
    );
  }

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
      throw AuthApiException(data['error'] as String? ?? 'Could not delete account');
    }
  }
}

Future<void> applyAuthSession(AuthSessionResult session) async {
  await GuestSession.instance.clear();
  await Supabase.instance.client.auth.setSession(session.refreshToken);
}
