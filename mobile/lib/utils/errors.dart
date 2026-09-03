import 'dart:async';

import 'package:supabase_flutter/supabase_flutter.dart' hide AuthApiException;

import '../services/auth_api.dart';

/// Returns a short, user-facing message for any thrown error.
String friendlyError(Object error) {
  if (error is AuthApiException) return error.message;
  if (error is AuthException) return error.message;
  if (error is TimeoutException) {
    return 'This is taking longer than usual. Please try again.';
  }
  if (error is PostgrestException) {
    final msg = error.message.trim();
    if (msg.isNotEmpty) return msg;
    return 'Could not complete the request. Please try again.';
  }
  final text = error.toString();
  const prefix = 'Exception: ';
  if (text.startsWith(prefix)) return text.substring(prefix.length);
  return text;
}
