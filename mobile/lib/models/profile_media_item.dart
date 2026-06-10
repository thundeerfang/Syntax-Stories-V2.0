class ProfileMediaItem {
  const ProfileMediaItem({
    required this.url,
    this.title,
  });

  factory ProfileMediaItem.fromJson(Map<String, dynamic> json) {
    return ProfileMediaItem(
      url: json['url']?.toString().trim() ?? '',
      title: json['title']?.toString().trim(),
    );
  }

  final String url;
  final String? title;

  Map<String, dynamic> toJson() {
    final t = title?.trim();
    return {
      'url': url.trim(),
      if (t != null && t.isNotEmpty) 'title': t,
    };
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    if (other is! ProfileMediaItem) return false;
    return url.trim() == other.url.trim() && (title ?? '').trim() == (other.title ?? '').trim();
  }

  @override
  int get hashCode => Object.hash(url, title);
}
