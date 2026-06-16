/// Mirrors webapp `formatJoinedDate`.
String formatJoinedDate(String? createdAt) {
  final raw = createdAt?.trim() ?? '';
  if (raw.isEmpty) return '';
  try {
    final date = DateTime.parse(raw).toLocal();
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    final month = months[date.month - 1];
    return '$month ${date.day}, ${date.year}';
  } catch (_) {
    return '';
  }
}
