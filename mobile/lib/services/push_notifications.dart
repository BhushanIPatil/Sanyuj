import 'dart:io' show File, Platform;
import 'dart:typed_data';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'device_token_api.dart';

const _channelId = 'sanyuj_default';
const _channelName = 'Sanyuj';

final FlutterLocalNotificationsPlugin _localNotifications =
    FlutterLocalNotificationsPlugin();

/// Top-level background handler (required by firebase_messaging).
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp();
    }
    await PushNotifications.ensureLocalNotificationsInitialized();
    await PushNotifications.showRemoteMessage(message);
  } catch (e) {
    // ignore: avoid_print
    print('[push] background handler error: $e');
  }
}

/// Isolated FCM bootstrap + token registration + rich local notifications.
class PushNotifications {
  PushNotifications._();

  static bool _ready = false;
  static bool _localReady = false;
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

      await ensureLocalNotificationsInitialized();

      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission(alert: true, badge: true, sound: true);

      if (Platform.isIOS) {
        await messaging.setForegroundNotificationPresentationOptions(
          alert: false,
          badge: true,
          sound: true,
        );
      }

      FirebaseMessaging.onMessage.listen((message) {
        void show() => showRemoteMessage(message);
        show();
      });

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

  static Future<void> ensureLocalNotificationsInitialized() async {
    if (_localReady) return;

    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    await _localNotifications.initialize(
      settings: const InitializationSettings(android: androidInit, iOS: iosInit),
    );

    final androidPlugin = _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    await androidPlugin?.createNotificationChannel(
      const AndroidNotificationChannel(
        _channelId,
        _channelName,
        description: 'General Sanyuj notifications',
        importance: Importance.high,
      ),
    );
    await androidPlugin?.requestNotificationsPermission();

    _localReady = true;
  }

  /// Render a tray notification, downloading [data.image] when present.
  static Future<void> showRemoteMessage(RemoteMessage message) async {
    await ensureLocalNotificationsInitialized();

    final title =
        message.notification?.title ?? message.data['title'] ?? 'Sanyuj';
    final body = message.notification?.body ?? message.data['body'] ?? '';
    final imageUrl =
        message.data['image'] ??
        message.notification?.android?.imageUrl?.toString() ??
        message.notification?.apple?.imageUrl?.toString();

    StyleInformation? androidStyle;
    DarwinNotificationAttachment? iosAttachment;
    ByteArrayAndroidBitmap? largeIcon;

    if (imageUrl != null && imageUrl.trim().isNotEmpty) {
      final bytes = await _downloadImage(imageUrl.trim());
      if (bytes != null && bytes.isNotEmpty) {
        largeIcon = ByteArrayAndroidBitmap(bytes);
        androidStyle = BigPictureStyleInformation(
          ByteArrayAndroidBitmap(bytes),
          largeIcon: largeIcon,
          contentTitle: title,
          summaryText: body,
          htmlFormatContentTitle: false,
          htmlFormatSummaryText: false,
        );
        iosAttachment = await _iosAttachmentFromBytes(bytes);
      }
    }

    final id = message.messageId?.hashCode ??
        DateTime.now().millisecondsSinceEpoch.remainder(100000);

    await _localNotifications.show(
      id: id,
      title: title,
      body: body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          _channelId,
          _channelName,
          channelDescription: 'General Sanyuj notifications',
          importance: Importance.high,
          priority: Priority.high,
          styleInformation: androidStyle,
          largeIcon: largeIcon,
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
          attachments: iosAttachment == null ? null : [iosAttachment],
        ),
      ),
      payload: message.data['notification_id'],
    );
  }

  static Future<Uint8List?> _downloadImage(String url) async {
    try {
      final res = await http
          .get(
            Uri.parse(url),
            headers: {
              // Some CDNs reject requests without a UA (FCM's fetch can fail the same way).
              'User-Agent': 'Sanyuj/1.0 (push-image)',
              'Accept': 'image/*,*/*',
            },
          )
          .timeout(const Duration(seconds: 12));
      if (res.statusCode < 200 || res.statusCode >= 300) return null;
      if (res.bodyBytes.length > 1024 * 1024) return null; // FCM-style 1MB cap
      return res.bodyBytes;
    } catch (_) {
      return null;
    }
  }

  static Future<DarwinNotificationAttachment?> _iosAttachmentFromBytes(
    Uint8List bytes,
  ) async {
    try {
      final dir = await getTemporaryDirectory();
      final file = File(
        '${dir.path}${Platform.pathSeparator}push_${DateTime.now().millisecondsSinceEpoch}.jpg',
      );
      await file.writeAsBytes(bytes, flush: true);
      return DarwinNotificationAttachment(file.path);
    } catch (_) {
      return null;
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
