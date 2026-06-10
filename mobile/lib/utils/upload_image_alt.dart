import 'dart:io';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';

/// Alt text for company/school logos — derived from the gallery file name (no extension).
String? logoAltFromChosenFileName(String? fileName, {int maxLength = 120}) {
  var name = fileName?.trim() ?? '';
  if (name.isEmpty) return null;
  final dot = name.lastIndexOf('.');
  if (dot > 0) name = name.substring(0, dot);
  name = name.trim();
  if (name.isEmpty) return null;
  return name.length > maxLength ? name.substring(0, maxLength) : name;
}

/// Friendly device label for blog image alt text (e.g. "iPhone 16 Pro", "Samsung SM-S928B").
Future<String> resolveMobileDeviceLabel() async {
  if (kIsWeb) return 'Mobile';
  try {
    final plugin = DeviceInfoPlugin();
    if (Platform.isIOS) {
      final info = await plugin.iosInfo;
      final name = info.name.trim();
      if (name.isNotEmpty && name.toLowerCase() != 'iphone') return name;
      final model = info.model.trim();
      return model.isNotEmpty ? model : 'iPhone';
    }
    if (Platform.isAndroid) {
      final info = await plugin.androidInfo;
      final manufacturer = info.manufacturer.trim();
      final model = info.model.trim();
      if (manufacturer.isNotEmpty && model.isNotEmpty) {
        return '$manufacturer $model';
      }
      return model.isNotEmpty ? model : 'Android';
    }
  } catch (_) {
    // Fall through to generic label.
  }
  return Platform.operatingSystem;
}

/// Blog image alt/title: "{device} · {file name without extension}".
String blogImageAltFromPick({
  required String deviceLabel,
  required String? fileName,
  int maxLength = 120,
}) {
  final device = deviceLabel.trim().isEmpty ? 'Mobile' : deviceLabel.trim();
  final fileBase = logoAltFromChosenFileName(fileName) ?? 'image';
  final alt = '$device · $fileBase';
  return alt.length > maxLength ? alt.substring(0, maxLength) : alt;
}
