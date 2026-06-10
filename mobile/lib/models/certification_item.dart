import 'profile_media_item.dart';

class CertificationItem {
  const CertificationItem({
    this.certId,
    required this.name,
    required this.issuingOrganization,
    this.issuerLogo,
    this.issuerLogoAlt,
    this.currentlyValid,
    required this.issueDate,
    this.expirationDate,
    this.certValType,
    this.credentialId,
    this.credentialUrl,
    this.description,
    required this.skills,
    this.media = const [],
  });

  factory CertificationItem.fromJson(Map<String, dynamic> json) {
    return CertificationItem(
      certId: json['certId']?.toString().trim(),
      name: json['name']?.toString().trim() ?? '',
      issuingOrganization: json['issuingOrganization']?.toString().trim() ?? '',
      issuerLogo: json['issuerLogo']?.toString().trim(),
      issuerLogoAlt: json['issuerLogoAlt']?.toString().trim(),
      currentlyValid: json['currentlyValid'] == true ? true : null,
      issueDate: json['issueDate']?.toString().trim() ?? '',
      expirationDate: json['expirationDate']?.toString().trim(),
      certValType: json['certValType']?.toString().trim(),
      credentialId: json['credentialId']?.toString().trim(),
      credentialUrl: json['credentialUrl']?.toString().trim(),
      description: json['description']?.toString().trim(),
      skills: _skills(json['skills']),
      media: _media(json['media']),
    );
  }

  final String? certId;
  final String name;
  final String issuingOrganization;
  final String? issuerLogo;
  final String? issuerLogoAlt;
  final bool? currentlyValid;
  final String issueDate;
  final String? expirationDate;
  final String? certValType;
  final String? credentialId;
  final String? credentialUrl;
  final String? description;
  final List<String> skills;
  final List<ProfileMediaItem> media;

  Map<String, dynamic> toJson() {
    final skillList = skills.map((s) => s.trim()).where((s) => s.isNotEmpty).take(30).toList();
    return {
      if (certId != null && certId!.trim().isNotEmpty) 'certId': certId!.trim(),
      'name': name.trim(),
      'issuingOrganization': issuingOrganization.trim(),
      if (issuerLogo != null && issuerLogo!.trim().isNotEmpty) 'issuerLogo': issuerLogo!.trim(),
      if (issuerLogoAlt != null && issuerLogoAlt!.trim().isNotEmpty)
        'issuerLogoAlt': issuerLogoAlt!.trim(),
      if (currentlyValid == true) 'currentlyValid': true,
      'issueDate': issueDate.trim(),
      if (expirationDate != null && expirationDate!.trim().isNotEmpty)
        'expirationDate': expirationDate!.trim(),
      if (certValType != null && certValType!.trim().isNotEmpty) 'certValType': certValType!.trim(),
      if (credentialId != null && credentialId!.trim().isNotEmpty)
        'credentialId': credentialId!.trim(),
      if (credentialUrl != null && credentialUrl!.trim().isNotEmpty)
        'credentialUrl': credentialUrl!.trim(),
      if (description != null && description!.trim().isNotEmpty) 'description': description!.trim(),
      'skills': skillList,
      if (media.isNotEmpty) 'media': media.map((m) => m.toJson()).toList(),
    };
  }

  static List<String> _skills(dynamic value) {
    if (value is! List) return const [];
    return value.map((e) => e.toString().trim()).where((s) => s.isNotEmpty).toList();
  }

  static List<ProfileMediaItem> _media(dynamic media) {
    if (media is! List) return const [];
    return media
        .whereType<Map<String, dynamic>>()
        .map(ProfileMediaItem.fromJson)
        .where((m) => m.url.isNotEmpty)
        .toList();
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    if (other is! CertificationItem) return false;
    return (certId ?? '') == (other.certId ?? '') &&
        name.trim() == other.name.trim() &&
        issuingOrganization.trim() == other.issuingOrganization.trim() &&
        (issuerLogo ?? '') == (other.issuerLogo ?? '') &&
        (issuerLogoAlt ?? '') == (other.issuerLogoAlt ?? '') &&
        (currentlyValid ?? false) == (other.currentlyValid ?? false) &&
        issueDate.trim() == other.issueDate.trim() &&
        (expirationDate ?? '') == (other.expirationDate ?? '') &&
        (certValType ?? '') == (other.certValType ?? '') &&
        (credentialId ?? '') == (other.credentialId ?? '') &&
        (credentialUrl ?? '') == (other.credentialUrl ?? '') &&
        (description ?? '') == (other.description ?? '') &&
        _listEquals(skills, other.skills) &&
        _mediaEquals(media, other.media);
  }

  @override
  int get hashCode => Object.hash(
        certId,
        name,
        issuingOrganization,
        issuerLogo,
        issueDate,
        expirationDate,
        Object.hashAll(skills),
      );

  static bool _listEquals(List<String> a, List<String> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i].trim() != b[i].trim()) return false;
    }
    return true;
  }

  static bool _mediaEquals(List<ProfileMediaItem> a, List<ProfileMediaItem> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}
