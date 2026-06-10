import 'profile_media_item.dart';

class WorkPromotionItem {
  const WorkPromotionItem({
    required this.jobTitle,
    this.startDate,
    this.endDate,
    this.currentPosition = false,
    this.media = const [],
  });

  factory WorkPromotionItem.fromJson(Map<String, dynamic> json) {
    return WorkPromotionItem(
      jobTitle: json['jobTitle']?.toString().trim() ?? '',
      startDate: json['startDate']?.toString().trim(),
      endDate: json['endDate']?.toString().trim(),
      currentPosition: json['currentPosition'] == true,
      media: _mediaList(json['media']),
    );
  }

  final String jobTitle;
  final String? startDate;
  final String? endDate;
  final bool currentPosition;
  final List<ProfileMediaItem> media;

  Map<String, dynamic> toJson() {
    final start = startDate?.trim();
    final end = endDate?.trim();
    return {
      'jobTitle': jobTitle.trim(),
      if (start != null && start.isNotEmpty) 'startDate': start,
      if (!currentPosition && end != null && end.isNotEmpty) 'endDate': end,
      if (currentPosition) 'currentPosition': true,
      if (media.isNotEmpty) 'media': media.map((m) => m.toJson()).toList(),
    };
  }

  static List<ProfileMediaItem> _mediaList(dynamic value) {
    if (value is! List) return const [];
    return value
        .whereType<Map<String, dynamic>>()
        .map(ProfileMediaItem.fromJson)
        .where((m) => m.url.isNotEmpty)
        .toList();
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    if (other is! WorkPromotionItem) return false;
    return jobTitle.trim() == other.jobTitle.trim() &&
        (startDate ?? '') == (other.startDate ?? '') &&
        (endDate ?? '') == (other.endDate ?? '') &&
        currentPosition == other.currentPosition &&
        _listEq(media, other.media);
  }

  static bool _listEq(List<ProfileMediaItem> a, List<ProfileMediaItem> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hash(jobTitle, startDate, endDate, currentPosition, media.length);
}
