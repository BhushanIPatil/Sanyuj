import 'dart:io' show File, Platform;
import 'dart:typed_data';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';

import 'device_token_api.dart';

const _channelId = 'sanyuj_default';
const _channelName = 'Sanyuj';

int _trayNotificationId(RemoteMessage message) {
  final sendId = message.data['send_id'];
  final raw = (sendId != null && sendId.isNotEmpty)
      ? sendId.hashCode
      : message.messageId?.hashCode ?? DateTime.now().millisecondsSinceEpoch;
  final id = raw.abs() % 0x7fffffff;
  return id == 0 ? 1 : id;
}

final FlutterLocalNotificationsPlugin _localNotifications =
    FlutterLocalNotificationsPlugin();

/// Top-level background handler (required by firebase_messaging).
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    // FCM already posted the system tray item when a `notification` payload is present.
    // Showing another local notification here would duplicate it.
    if (message.notification != null) return;

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
      // Channel must exist even if FCM later fails — otherwise the OS drops
      // background pushes that target `sanyuj_default`.
      await ensureLocalNotificationsInitialized();

      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp();
      }

      final messaging = FirebaseMessaging.instance;
      final permission = await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
      if (permission.authorizationStatus == AuthorizationStatus.denied ||
          permission.authorizationStatus == AuthorizationStatus.notDetermined) {
        return;
      }

      if (Platform.isIOS) {
        await messaging.setForegroundNotificationPresentationOptions(
          alert: false,
          badge: true,
          sound: true,
        );
      }

      FirebaseMessaging.onMessage.listen((message) {
        showRemoteMessage(message).catchError((e) {
          // ignore: avoid_print
          print('[push] foreground show failed: $e');
        });
      });

      _currentToken = await messaging.getToken();
      messaging.onTokenRefresh.listen((token) {
        _currentToken = token;
        syncTokenToServer();
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

    const androidInit = AndroidInitializationSettings(
      '@drawable/ic_notification',
    );
    const iosInit = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    await _localNotifications.initialize(
      settings: const InitializationSettings(
        android: androidInit,
        iOS: iosInit,
      ),
    );

    final androidPlugin = _localNotifications
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();
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
    final id = _trayNotificationId(message);
    final payload = message.data['notification_id'];

    // Show text immediately. Waiting on a large/slow image can delay or drop
    // the tray item (this campaign image is over FCM's 1MB cap).
    await _showTray(id: id, title: title, body: body, payload: payload);

    final imageUrl =
        message.data['image'] ??
        message.notification?.android?.imageUrl?.toString() ??
        message.notification?.apple?.imageUrl?.toString();
    if (imageUrl == null || imageUrl.trim().isEmpty) return;

    final bytes = await _downloadImage(imageUrl.trim());
    if (bytes == null || bytes.isEmpty) return;

    final largeIcon = ByteArrayAndroidBitmap(bytes);
    await _showTray(
      id: id,
      title: title,
      body: body,
      payload: payload,
      androidStyle: BigPictureStyleInformation(
        ByteArrayAndroidBitmap(bytes),
        largeIcon: largeIcon,
        contentTitle: title,
        summaryText: body,
        htmlFormatContentTitle: false,
        htmlFormatSummaryText: false,
      ),
      largeIcon: largeIcon,
      iosAttachment: await _iosAttachmentFromBytes(bytes),
    );
  }

  static Future<void> _showTray({
    required int id,
    required String title,
    required String body,
    String? payload,
    StyleInformation? androidStyle,
    ByteArrayAndroidBitmap? largeIcon,
    DarwinNotificationAttachment? iosAttachment,
  }) {
    return _localNotifications.show(
      id: id,
      title: title,
      body: body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          _channelId,
          _channelName,
          channelDescription: 'General Sanyuj notifications',
          icon: '@drawable/ic_notification',
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
      payload: payload,
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
      final declared = int.tryParse(res.headers['content-length'] ?? '');
      if (declared != null && declared > 1024 * 1024) return null;
      if (res.bodyBytes.length > 1024 * 1024) return null;
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

  /// Register this installation for broadcast notifications.
  static Future<void> syncTokenToServer() async {
    if (!_ready) return;
    final token = _currentToken ?? await FirebaseMessaging.instance.getToken();
    if (token == null || token.isEmpty) return;

    _currentToken = token;
    final pkg = await PackageInfo.fromPlatform();
    final appVersion = '${pkg.version} (${pkg.buildNumber})';

    try {
      await DeviceTokenApi().register(
        deviceToken: token,
        deviceOs: Platform.isIOS ? 'iOS' : 'Android',
        appVersion: appVersion,
      );
    } catch (e) {
      // ignore: avoid_print
      print('[push] register failed: $e');
    }
  }

  /// Best-effort disable notifications for this installation.
  static Future<void> deactivateCurrentDevice() async {
    final token = _currentToken;
    if (token == null || token.isEmpty) return;
    try {
      await DeviceTokenApi().deactivate(deviceToken: token);
    } catch (_) {}
  }
}
