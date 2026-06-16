class AppNotification {
  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    required this.href,
    required this.icon,
    required this.time,
    required this.unread,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    final kind = json['type']?.toString() ?? json['kind']?.toString() ?? 'settings_update';
    return AppNotification(
      id: json['id']?.toString() ?? '',
      type: kind,
      title: json['title']?.toString() ?? '',
      message: json['message']?.toString() ?? '',
      href: json['href']?.toString() ?? '/',
      icon: json['icon']?.toString() ?? 'bell',
      time: json['time']?.toString() ?? '',
      unread: json['unread'] == true,
    );
  }

  final String id;
  final String type;
  final String title;
  final String message;
  final String href;
  final String icon;
  final String time;
  final bool unread;

  AppNotification copyWith({bool? unread}) {
    return AppNotification(
      id: id,
      type: type,
      title: title,
      message: message,
      href: href,
      icon: icon,
      time: time,
      unread: unread ?? this.unread,
    );
  }
}

const notificationTypeLabels = <String, String>{
  'repost_milestone': 'Reposts',
  'view_milestone': 'Views',
  'respect_milestone': 'Respects',
  'category_new_post': 'Category',
  'tag_new_post': 'Topic',
  'squad_new_post': 'Squad',
  'following_new_post': 'Following',
  'blog_trending': 'Trending',
  'post_trending': 'Trending',
  'referral_accepted': 'Invite',
  'settings_update': 'Settings',
  'achievement_unlocked': 'Achievement',
};

String notificationTypeLabel(String type) =>
    notificationTypeLabels[type] ?? 'Alert';
