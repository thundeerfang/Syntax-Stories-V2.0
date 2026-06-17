class BookmarkGroup {
  const BookmarkGroup({
    required this.id,
    required this.name,
    this.emoji = '',
    this.isDefault = false,
    this.bookmarkCount = 0,
  });

  factory BookmarkGroup.fromJson(Map<String, dynamic> json) {
    return BookmarkGroup(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      emoji: json['emoji']?.toString() ?? '',
      isDefault: json['isDefault'] == true,
      bookmarkCount: json['bookmarkCount'] is num
          ? (json['bookmarkCount'] as num).toInt()
          : 0,
    );
  }

  final String id;
  final String name;
  final String emoji;
  final bool isDefault;
  final int bookmarkCount;
}

const kBookmarkFolderEmojis = [
  '📚',
  '🔖',
  '💡',
  '⭐',
  '🎯',
  '🚀',
  '💻',
  '📝',
  '🎨',
  '🎮',
  '🏠',
  '❤️',
  '🔥',
  '✨',
  '📌',
  '🗂️',
  '🌟',
  '💼',
  '🧠',
  '🔬',
  '📖',
];
