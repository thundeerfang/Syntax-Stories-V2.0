import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../firebase_options.dart';
import '../models/app_notification.dart';
import 'notifications_api.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await PushNotificationService.ensureFirebaseInitialized();
  await PushNotificationService.showLocalFromRemoteMessage(message);
}

/// System push (FCM/APNs) + local display for foreground alerts.
class PushNotificationService {
  PushNotificationService({NotificationsApi? api})
    : _api = api ?? NotificationsApi();

  final NotificationsApi _api;
  final _local = FlutterLocalNotificationsPlugin();
  static bool _firebaseReady = false;
  static const _channelId = 'syntax_stories_alerts';

  static bool get isConfigured => Platform.isAndroid || Platform.isIOS;

  static Future<void> ensureFirebaseInitialized() async {
    if (_firebaseReady || Firebase.apps.isNotEmpty) {
      _firebaseReady = true;
      return;
    }
    if (!isConfigured) return;
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    _firebaseReady = true;
  }

  Future<bool> initialize() async {
    if (!isConfigured) {
      if (kDebugMode) {
        debugPrint('[push] Firebase not configured for this platform.');
      }
      return false;
    }

    await ensureFirebaseInitialized();
    await _initLocalNotifications();

    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    final messaging = FirebaseMessaging.instance;
    await messaging.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    final settings = await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    final allowed =
        settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional;
    if (!allowed) return false;

    FirebaseMessaging.onMessage.listen((message) async {
      await showLocalFromRemoteMessage(message);
    });

    return true;
  }

  Future<void> _initLocalNotifications() async {
    const android = AndroidInitializationSettings('syntax_notification_logo');
    const ios = DarwinInitializationSettings();
    await _local.initialize(
      const InitializationSettings(android: android, iOS: ios),
      onDidReceiveNotificationResponse: (_) {},
    );

    if (Platform.isAndroid) {
      final androidPlugin = _local
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >();
      await androidPlugin?.createNotificationChannel(
        const AndroidNotificationChannel(
          _channelId,
          'Syntax Stories alerts',
          description: 'Milestones, follows, squads, and account updates',
          importance: Importance.high,
        ),
      );
    }
  }

  static Future<void> showLocalFromRemoteMessage(RemoteMessage message) async {
    final title =
        message.notification?.title ?? message.data['title']?.toString();
    final body =
        message.notification?.body ?? message.data['message']?.toString();
    if (title == null || body == null) return;

    final plugin = FlutterLocalNotificationsPlugin();
    const androidDetails = AndroidNotificationDetails(
      _channelId,
      'Syntax Stories alerts',
      importance: Importance.high,
      priority: Priority.high,
      icon: 'syntax_notification_logo',
      largeIcon: DrawableResourceAndroidBitmap('syntax_notification_logo'),
    );
    const iosDetails = DarwinNotificationDetails();
    await plugin.show(
      message.hashCode,
      title,
      body,
      const NotificationDetails(android: androidDetails, iOS: iosDetails),
    );
  }

  Future<void> showLocalInAppAlert(AppNotification notification) async {
    final androidDetails = AndroidNotificationDetails(
      _channelId,
      'Syntax Stories alerts',
      importance: Importance.high,
      priority: Priority.high,
      icon: 'syntax_notification_logo',
      largeIcon: const DrawableResourceAndroidBitmap(
        'syntax_notification_logo',
      ),
    );
    const iosDetails = DarwinNotificationDetails();
    await _local.show(
      notification.id.hashCode,
      notification.title,
      notification.message,
      NotificationDetails(android: androidDetails, iOS: iosDetails),
    );
  }

  Future<String?> fetchDeviceToken() async {
    if (!isConfigured) return null;
    await ensureFirebaseInitialized();
    final messaging = FirebaseMessaging.instance;

    if (Platform.isIOS) {
      final apnsReady = await _waitForApnsToken(messaging);
      if (!apnsReady) {
        if (kDebugMode) {
          debugPrint(
            '[push] APNS token not ready (simulator or permissions). Skipping FCM token.',
          );
        }
        return null;
      }
    }

    try {
      return await messaging.getToken();
    } on FirebaseException catch (e) {
      if (kDebugMode) {
        debugPrint('[push] getToken failed: ${e.code} ${e.message}');
      }
      return null;
    } catch (e) {
      if (kDebugMode) debugPrint('[push] getToken failed: $e');
      return null;
    }
  }

  Future<bool> _waitForApnsToken(FirebaseMessaging messaging) async {
    for (var attempt = 0; attempt < 10; attempt++) {
      final apns = await messaging.getAPNSToken();
      if (apns != null && apns.isNotEmpty) return true;
      await Future<void>.delayed(Duration(milliseconds: 400 * (attempt + 1)));
    }
    return false;
  }

  Future<void> registerWithServer(String accessToken) async {
    try {
      final token = await fetchDeviceToken();
      if (token == null || token.isEmpty) return;
      final platform = Platform.isIOS ? 'ios' : 'android';
      await _api.registerDeviceToken(
        accessToken,
        token: token,
        platform: platform,
      );
    } catch (e) {
      if (kDebugMode) debugPrint('[push] registerWithServer failed: $e');
    }
  }

  Future<void> unregisterFromServer(String accessToken) async {
    try {
      final token = await fetchDeviceToken();
      if (token == null || token.isEmpty) return;
      await _api.unregisterDeviceToken(accessToken, token: token);
    } catch (e) {
      if (kDebugMode) debugPrint('[push] unregisterFromServer failed: $e');
    }
  }
}
