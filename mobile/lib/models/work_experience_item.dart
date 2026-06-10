import 'profile_media_item.dart';
import 'work_promotion_item.dart';

class WorkExperienceItem {
  const WorkExperienceItem({
    this.workId,
    required this.jobTitle,
    required this.employmentType,
    required this.company,
    this.companyDomain,
    this.companyLogo,
    this.companyLogoAlt,
    this.currentPosition = false,
    required this.startDate,
    this.endDate,
    this.location,
    required this.locationType,
    this.description,
    required this.skills,
    this.promotions = const [],
    this.media = const [],
  });

  factory WorkExperienceItem.fromJson(Map<String, dynamic> json) {
    return WorkExperienceItem(
      workId: json['workId']?.toString().trim(),
      jobTitle: json['jobTitle']?.toString().trim() ?? '',
      employmentType: json['employmentType']?.toString().trim() ?? 'Full-time',
      company: json['company']?.toString().trim() ?? '',
      companyDomain: json['companyDomain']?.toString().trim(),
      companyLogo: json['companyLogo']?.toString().trim(),
      companyLogoAlt: json['companyLogoAlt']?.toString().trim(),
      currentPosition: json['currentPosition'] == true,
      startDate: json['startDate']?.toString().trim() ?? '',
      endDate: json['endDate']?.toString().trim(),
      location: json['location']?.toString().trim(),
      locationType: json['locationType']?.toString().trim() ?? 'On-site',
      description: json['description']?.toString().trim(),
      skills: _skills(json['skills']),
      promotions: _promotions(json['promotions']),
      media: _media(json['media'], json['mediaUrls']),
    );
  }

  final String? workId;
  final String jobTitle;
  final String employmentType;
  final String company;
  final String? companyDomain;
  final String? companyLogo;
  final String? companyLogoAlt;
  final bool currentPosition;
  final String startDate;
  final String? endDate;
  final String? location;
  final String locationType;
  final String? description;
  final List<String> skills;
  final List<WorkPromotionItem> promotions;
  final List<ProfileMediaItem> media;

  Map<String, dynamic> toJson() {
    final promos = promotions.where((p) => p.jobTitle.trim().isNotEmpty).toList();
    return {
      if (workId != null && workId!.trim().isNotEmpty) 'workId': workId!.trim(),
      'jobTitle': jobTitle.trim(),
      'employmentType': employmentType,
      'company': company.trim(),
      if (companyDomain != null && companyDomain!.trim().isNotEmpty)
        'companyDomain': companyDomain!.trim(),
      if (companyLogo != null && companyLogo!.trim().isNotEmpty) 'companyLogo': companyLogo!.trim(),
      if (companyLogoAlt != null && companyLogoAlt!.trim().isNotEmpty)
        'companyLogoAlt': companyLogoAlt!.trim(),
      if (currentPosition) 'currentPosition': true,
      'startDate': startDate.trim(),
      if (!currentPosition && endDate != null && endDate!.trim().isNotEmpty) 'endDate': endDate!.trim(),
      if (location != null && location!.trim().isNotEmpty) 'location': location!.trim(),
      'locationType': locationType,
      if (description != null && description!.trim().isNotEmpty) 'description': description!.trim(),
      'skills': skills.map((s) => s.trim()).where((s) => s.isNotEmpty).take(10).toList(),
      if (promos.isNotEmpty) 'promotions': promos.map((p) => p.toJson()).toList(),
      if (media.isNotEmpty) 'media': media.map((m) => m.toJson()).toList(),
    };
  }

  static List<String> _skills(dynamic value) {
    if (value is! List) return const [];
    return value.map((e) => e.toString().trim()).where((s) => s.isNotEmpty).toList();
  }

  static List<WorkPromotionItem> _promotions(dynamic value) {
    if (value is! List) return const [];
    return value
        .whereType<Map<String, dynamic>>()
        .map(WorkPromotionItem.fromJson)
        .where((p) => p.jobTitle.isNotEmpty)
        .toList();
  }

  static List<ProfileMediaItem> _media(dynamic media, dynamic mediaUrls) {
    if (media is List) {
      return media
          .whereType<Map<String, dynamic>>()
          .map(ProfileMediaItem.fromJson)
          .where((m) => m.url.isNotEmpty)
          .toList();
    }
    if (mediaUrls is List) {
      return mediaUrls
          .map((e) => e.toString().trim())
          .where((s) => s.isNotEmpty)
          .map((url) => ProfileMediaItem(url: url))
          .toList();
    }
    return const [];
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    if (other is! WorkExperienceItem) return false;
    return (workId ?? '') == (other.workId ?? '') &&
        jobTitle.trim() == other.jobTitle.trim() &&
        employmentType == other.employmentType &&
        company.trim() == other.company.trim() &&
        (companyDomain ?? '') == (other.companyDomain ?? '') &&
        (companyLogo ?? '') == (other.companyLogo ?? '') &&
        (companyLogoAlt ?? '') == (other.companyLogoAlt ?? '') &&
        currentPosition == other.currentPosition &&
        startDate.trim() == other.startDate.trim() &&
        (endDate ?? '') == (other.endDate ?? '') &&
        (location ?? '') == (other.location ?? '') &&
        locationType == other.locationType &&
        (description ?? '') == (other.description ?? '') &&
        _listEq(skills, other.skills) &&
        _promoEq(promotions, other.promotions) &&
        _mediaEq(media, other.media);
  }

  static bool _listEq(List<String> a, List<String> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  static bool _promoEq(List<WorkPromotionItem> a, List<WorkPromotionItem> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  static bool _mediaEq(List<ProfileMediaItem> a, List<ProfileMediaItem> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hash(workId, jobTitle, company, startDate, skills.length, media.length);
}
