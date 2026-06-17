import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';

class PublicPlatformStats {
  const PublicPlatformStats({
    required this.linesWritten,
    required this.activeUsers,
    required this.components,
    required this.uptimePercent,
  });

  factory PublicPlatformStats.fromJson(Map<String, dynamic> json) {
    return PublicPlatformStats(
      linesWritten: _asInt(json['linesWritten']),
      activeUsers: _asInt(json['activeUsers']),
      components: _asInt(json['components']),
      uptimePercent: json['uptimePercent'] is num
          ? (json['uptimePercent'] as num).toDouble()
          : 0,
    );
  }

  final int linesWritten;
  final int activeUsers;
  final int components;
  final double uptimePercent;

  static int _asInt(dynamic v) => v is num ? v.toInt() : 0;
}

class PlatformApi {
  PlatformApi({String? baseUrl}) : _baseUrlOverride = baseUrl;

  final String? _baseUrlOverride;

  String get baseUrl => _baseUrlOverride ?? resolveApiBaseUrl();

  /// `GET /api/platform/stats` — mirrors webapp `fetchPlatformStats`.
  Future<PublicPlatformStats?> fetchStats() async {
    final uri = Uri.parse('$baseUrl/api/platform/stats');
    try {
      final res = await http.get(uri);
      if (res.statusCode < 200 || res.statusCode >= 300) return null;
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      if (data['success'] != true) return null;
      final stats = data['stats'];
      if (stats is! Map<String, dynamic>) return null;
      return PublicPlatformStats.fromJson(stats);
    } catch (_) {
      return null;
    }
  }
}
