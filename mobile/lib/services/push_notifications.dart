import 'dart:io' show Platform;

import 'package:device_info_plus/device_info_plus.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'device_token_api.dart';

/// Top-level background handler (required by firebase_messaging).
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // No-op for now — delivery is handled by the OS notification tray.
  // Keep Firebase initialized if a future handler needs it.
  try {
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp();
    }
  } catch (_) {}
}

/// Isolated FCM bootstrap + token registration.
///
/// Safe to call when Firebase / google-services are not configured yet —
/// failures are swallowed so app launch is never blocked.
class PushNotifications {
  PushNotifications._();

  static bool _ready = false;
  static String? _currentToken;

  static String? get currentToken => _currentToken;

  static Future<void> init() async {
    if (kIsWeb) return;
    if (!(Platform.isAndroid || Platform.isIOS)) return;

    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp();
      }
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission(alert: true, badge: true, sound: true);

      if (Platform.isAndroid) {
        await messaging.setForegroundNotificationPresentationOptions(
          alert: true,
          badge: true,
          sound: true,
        );
      }
      if (Platform.isIOS) {
        await messaging.setForegroundNotificationPresentationOptions(
          alert: true,
          badge: true,
          sound: true,
        );
      }

      _currentToken = await messaging.getToken();
      messaging.onTokenRefresh.listen((token) {
        _currentToken = token;
        void sync() => syncTokenToServer();
        sync();
      });

      _ready = true;
      await syncTokenToServer();
    } catch (e) {
      // Missing google-services.json / APNs / etc. — fail open.
      // ignore: avoid_print
      print('[push] init skipped: $e');
      _ready = false;
    }
  }

  /// Call after sign-in (or on cold start with an existing session).
  static Future<void> syncTokenToServer() async {
    if (!_ready) return;
    final session = Supabase.instance.client.auth.currentSession;
    final token = _currentToken ?? await FirebaseMessaging.instance.getToken();
    if (session == null || token == null || token.isEmpty) return;

    _currentToken = token;
    final meta = await _deviceMeta();
    final pkg = await PackageInfo.fromPlatform();
    final appVersion = '${pkg.version} (${pkg.buildNumber})';

    try {
      await DeviceTokenApi().register(
        accessToken: session.accessToken,
        deviceToken: token,
        deviceId: meta.deviceId,
        deviceName: meta.deviceName,
        deviceOs: meta.deviceOs,
        osVersion: meta.osVersion,
        appVersion: appVersion,
      );
    } catch (e) {
      // ignore: avoid_print
      print('[push] register failed: $e');
    }
  }

  /// Best-effort deactivate before logout / account delete.
  static Future<void> deactivateCurrentDevice() async {
    final session = Supabase.instance.client.auth.currentSession;
    final token = _currentToken;
    if (session == null || token == null || token.isEmpty) return;
    try {
      await DeviceTokenApi().deactivate(
        accessToken: session.accessToken,
        deviceToken: token,
      );
    } catch (_) {}
  }

  static Future<_DeviceMeta> _deviceMeta() async {
    final info = DeviceInfoPlugin();
    if (Platform.isAndroid) {
      final a = await info.androidInfo;
      return _DeviceMeta(
        deviceId: a.id,
        deviceName: '${a.brand} ${a.model}'.trim(),
        deviceOs: 'Android',
        osVersion: 'Android ${a.version.release} (SDK ${a.version.sdkInt})',
      );
    }
    if (Platform.isIOS) {
      final i = await info.iosInfo;
      return _DeviceMeta(
        deviceId: i.identifierForVendor,
        deviceName: i.name,
        deviceOs: 'iOS',
        osVersion: '${i.systemName} ${i.systemVersion}',
      );
    }
    return const _DeviceMeta(
      deviceId: null,
      deviceName: null,
      deviceOs: null,
      osVersion: null,
    );
  }
}

class _DeviceMeta {
  const _DeviceMeta({
    required this.deviceId,
    required this.deviceName,
    required this.deviceOs,
    required this.osVersion,
  });

  final String? deviceId;
  final String? deviceName;
  final String? deviceOs;
  final String? osVersion;
}
