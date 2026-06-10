import 'profile_media_item.dart';
import '../utils/project_limits.dart';

class ProjectItem {
  const ProjectItem({
    this.type = projectTypeProject,
    this.source,
    this.repoFullName,
    this.repoId,
    required this.title,
    this.publisher,
    this.ongoing = false,
    this.publicationDate,
    this.endDate,
    this.publicationUrl,
    this.description,
    this.prjLog,
    this.media = const [],
  });

  factory ProjectItem.fromJson(Map<String, dynamic> json) {
    final rawType = json['type']?.toString().trim();
    return ProjectItem(
      type: rawType == projectTypePublication ? projectTypePublication : projectTypeProject,
      source: json['source']?.toString().trim(),
      repoFullName: json['repoFullName']?.toString().trim(),
      repoId: json['repoId'] is int ? json['repoId'] as int : int.tryParse('${json['repoId']}'),
      title: json['title']?.toString().trim() ?? json['name']?.toString().trim() ?? '',
      publisher: json['publisher']?.toString().trim(),
      ongoing: json['ongoing'] == true,
      publicationDate: json['publicationDate']?.toString().trim(),
      endDate: json['endDate']?.toString().trim(),
      publicationUrl: json['publicationUrl']?.toString().trim() ?? json['url']?.toString().trim(),
      description: json['description']?.toString().trim(),
      prjLog: json['prjLog']?.toString().trim(),
      media: _media(json['media']),
    );
  }

  final String type;
  final String? source;
  final String? repoFullName;
  final int? repoId;
  final String title;
  final String? publisher;
  final bool ongoing;
  final String? publicationDate;
  final String? endDate;
  final String? publicationUrl;
  final String? description;
  final String? prjLog;
  final List<ProfileMediaItem> media;

  bool get isGithub => source == 'github';
  bool get isPublication => type == projectTypePublication;

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      if (source != null && source!.trim().isNotEmpty) 'source': source!.trim(),
      if (repoFullName != null && repoFullName!.trim().isNotEmpty)
        'repoFullName': repoFullName!.trim(),
      if (repoId != null) 'repoId': repoId,
      'title': title.trim(),
      if (publisher != null && publisher!.trim().isNotEmpty) 'publisher': publisher!.trim(),
      if (ongoing) 'ongoing': true,
      if (publicationDate != null && publicationDate!.trim().isNotEmpty)
        'publicationDate': publicationDate!.trim(),
      if (!ongoing && endDate != null && endDate!.trim().isNotEmpty) 'endDate': endDate!.trim(),
      if (publicationUrl != null && publicationUrl!.trim().isNotEmpty)
        'publicationUrl': publicationUrl!.trim(),
      if (description != null && description!.trim().isNotEmpty) 'description': description!.trim(),
      if (prjLog != null && prjLog!.trim().isNotEmpty) 'prjLog': prjLog!.trim(),
      if (media.isNotEmpty) 'media': media.map((m) => m.toJson()).toList(),
    };
  }

  static List<ProfileMediaItem> _media(dynamic media) {
    if (media is! List) return const [];
    return media
        .whereType<Map<String, dynamic>>()
        .map(ProfileMediaItem.fromJson)
        .where((m) => m.url.isNotEmpty)
        .toList();
  }

  static List<ProjectItem> githubOnly(List<ProjectItem> items) =>
      items.where((p) => p.isGithub).toList();

  static List<ProjectItem> manualOnly(List<ProjectItem> items) =>
      items.where((p) => !p.isGithub).toList();

  static List<ProjectItem> mergeForSave({
    required List<ProjectItem> github,
    required List<ProjectItem> manual,
  }) =>
      [...github, ...manual].take(projectMax).toList();

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    if (other is! ProjectItem) return false;
    return type == other.type &&
        (source ?? '') == (other.source ?? '') &&
        (repoFullName ?? '') == (other.repoFullName ?? '') &&
        repoId == other.repoId &&
        title.trim() == other.title.trim() &&
        (publisher ?? '') == (other.publisher ?? '') &&
        ongoing == other.ongoing &&
        (publicationDate ?? '') == (other.publicationDate ?? '') &&
        (endDate ?? '') == (other.endDate ?? '') &&
        (publicationUrl ?? '') == (other.publicationUrl ?? '') &&
        (description ?? '') == (other.description ?? '') &&
        _mediaEquals(media, other.media);
  }

  @override
  int get hashCode => Object.hash(type, source, title, publicationDate, ongoing);

  static bool _mediaEquals(List<ProfileMediaItem> a, List<ProfileMediaItem> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}
