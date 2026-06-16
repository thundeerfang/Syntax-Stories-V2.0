import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/recent_search_item.dart';
import '../models/search_hit.dart';

/// Local recent search history — most recent first, capped at [maxItems].
class RecentSearchStorage {
  static const _key = 'search_recent_items_v1';
  static const maxItems = 100;

  Future<List<RecentSearchItem>> readAll() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null || raw.isEmpty) return const [];

    try {
      final list = jsonDecode(raw);
      if (list is! List) return const [];
      final out = <RecentSearchItem>[];
      for (final entry in list) {
        if (entry is! Map) continue;
        final item = recentSearchItemFromJson(Map<String, dynamic>.from(entry));
        if (item == null) continue;
        if (item is RecentSearchQuery && item.query.trim().isEmpty) continue;
        if (item is RecentSearchHitEntry && item.hit.id.isEmpty) continue;
        out.add(item);
      }
      out.sort((a, b) => b.savedAtMs.compareTo(a.savedAtMs));
      return out.take(maxItems).toList();
    } catch (_) {
      return const [];
    }
  }

  Future<void> addQuery(String query) async {
    final normalized = query.trim();
    if (normalized.isEmpty) return;
    await _prepend(RecentSearchQuery(query: normalized, savedAtMs: DateTime.now().millisecondsSinceEpoch));
  }

  Future<void> addHit(SearchHit hit, {String? replaceQuery}) async {
    if (hit.id.isEmpty) return;
    final item = RecentSearchHitEntry(hit: hit, savedAtMs: DateTime.now().millisecondsSinceEpoch);
    final existing = await readAll();
    final dropQuery = replaceQuery?.trim().toLowerCase();
    final next = [
      item,
      ...existing.where((e) {
        if (e.dedupeKey == item.dedupeKey) return false;
        if (dropQuery != null &&
            dropQuery.isNotEmpty &&
            e is RecentSearchQuery &&
            e.query.trim().toLowerCase() == dropQuery) {
          return false;
        }
        return true;
      }),
    ].take(maxItems).toList();

    final prefs = await SharedPreferences.getInstance();
    final encoded = jsonEncode(next.map((e) => switch (e) {
          RecentSearchQuery q => q.toJson(),
          RecentSearchHitEntry h => h.toJson(),
        }).toList());
    await prefs.setString(_key, encoded);
  }

  Future<void> clearAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }

  Future<void> _prepend(RecentSearchItem item) async {
    final existing = await readAll();
    final next = [
      item,
      ...existing.where((e) => e.dedupeKey != item.dedupeKey),
    ].take(maxItems).toList();

    final prefs = await SharedPreferences.getInstance();
    final encoded = jsonEncode(next.map((e) => switch (e) {
          RecentSearchQuery q => q.toJson(),
          RecentSearchHitEntry h => h.toJson(),
        }).toList());
    await prefs.setString(_key, encoded);
  }
}
