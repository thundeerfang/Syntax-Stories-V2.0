import '../utils/blog_streak_limits.dart';

class ReadStreakCounts {
  const ReadStreakCounts({this.current = 0, this.longest = 0});

  factory ReadStreakCounts.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const ReadStreakCounts();
    return ReadStreakCounts(
      current: _parseNum(json['current']),
      longest: _parseNum(json['longest']),
    );
  }

  final int current;
  final int longest;

  static int _parseNum(dynamic v) => v is num ? v.toInt() : 0;
}

int _readStreakInt(dynamic v) => v is num ? v.toInt() : 0;

class ReadStreakPayload {
  const ReadStreakPayload({
    this.displayMode = blogStreakModeDaily,
    this.current = 0,
    this.longest = 0,
    this.totalDistinctReadDays = 0,
    this.byMode = const {},
  });

  factory ReadStreakPayload.fromJson(dynamic value) {
    if (value is! Map<String, dynamic>) return const ReadStreakPayload();
    final byModeRaw = value['byMode'];
    final byMode = <String, ReadStreakCounts>{};
    if (byModeRaw is Map) {
      for (final mode in blogStreakModes) {
        final row = byModeRaw[mode];
        if (row is Map<String, dynamic>) {
          byMode[mode] = ReadStreakCounts.fromJson(row);
        } else if (row is Map) {
          byMode[mode] = ReadStreakCounts.fromJson(Map<String, dynamic>.from(row));
        }
      }
    }

    return ReadStreakPayload(
      displayMode: parseBlogStreakMode(value['displayMode']) ?? blogStreakModeDaily,
      current: _readStreakInt(value['current']),
      longest: _readStreakInt(value['longest']),
      totalDistinctReadDays: _readStreakInt(value['totalDistinctReadDays']),
      byMode: byMode,
    );
  }

  final String displayMode;
  final int current;
  final int longest;
  final int totalDistinctReadDays;
  final Map<String, ReadStreakCounts> byMode;

  ReadStreakCounts countsFor(String mode) =>
      byMode[mode] ?? const ReadStreakCounts();
}
