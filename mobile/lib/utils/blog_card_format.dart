import '../models/blog_feed_post.dart';

String titleCaseEveryWord(String raw) {
  return raw
      .split(RegExp(r'\s+'))
      .where((w) => w.isNotEmpty)
      .map((w) {
        if (RegExp(r'^[\d:.]+$').hasMatch(w)) return w;
        if (w.length == 1) return w.toUpperCase();
        return '${w[0].toUpperCase()}${w.substring(1)}';
      })
      .join(' ');
}

String titleCaseFromSlug(String token) {
  return token
      .split(RegExp(r'[-_]'))
      .where((p) => p.isNotEmpty)
      .map((w) {
        if (w.length == 1) return w.toUpperCase();
        return '${w[0].toUpperCase()}${w.substring(1).toLowerCase()}';
      })
      .join(' ');
}

String blogCategoryLabel(BlogFeedPost post) {
  final category = post.category?.trim();
  if (category != null && category.isNotEmpty) {
    return titleCaseFromSlug(category);
  }
  for (final tag in post.tags) {
    final t = tag.trim();
    if (t.isNotEmpty) {
      return t.length == 1
          ? t.toUpperCase()
          : '${t[0].toUpperCase()}${t.substring(1).toLowerCase()}';
    }
  }
  final slugParts = post.slug.split('-').where((p) => p.length > 1).toList();
  if (slugParts.isNotEmpty) {
    final token = slugParts.first;
    final clipped = token.length > 14 ? '${token.substring(0, 12)}…' : token;
    return titleCaseFromSlug(clipped);
  }
  return 'Blog';
}

int blogReadMinutes(BlogFeedPost post) {
  final minutes = post.readTimeMinutes;
  if (minutes != null && minutes >= 1) {
    return minutes.clamp(1, 999);
  }
  final words = post.summary.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length;
  return (words / 200).ceil().clamp(1, 999);
}

String blogCardAgeLabel(String iso) {
  final date = DateTime.tryParse(iso);
  if (date == null) return '';

  final diff = DateTime.now().difference(date);
  if (diff.inSeconds < 45) return 'JUST NOW';

  var remaining = diff.inSeconds;
  final days = remaining ~/ 86400;
  remaining %= 86400;
  final hours = remaining ~/ 3600;
  remaining %= 3600;
  final minutes = remaining ~/ 60;
  final seconds = remaining % 60;

  if (days >= 365) {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    final mon = months[date.month - 1];
    final yy = (date.year % 100).toString().padLeft(2, '0');
    return '$mon ${date.day} \'$yy';
  }

  final parts = <String>[];
  if (days > 0) parts.add('${days}D');
  if (hours > 0) parts.add('${hours}H');
  if (minutes > 0) parts.add('${minutes}M');
  if (seconds > 0) parts.add('${seconds}S');
  if (parts.isEmpty) return 'JUST NOW';
  return '${parts.join(' ')} AGO';
}

String formatEngagementCount(int n) {
  if (n >= 1000000) {
    final v = n / 1000000;
    final rounded = v >= 10 ? v.round().toString() : v.toStringAsFixed(1).replaceAll(RegExp(r'\.0$'), '');
    return '${rounded}M';
  }
  if (n >= 1000) {
    final v = n / 1000;
    final rounded = v >= 10 ? v.round().toString() : v.toStringAsFixed(1).replaceAll(RegExp(r'\.0$'), '');
    return '${rounded}K';
  }
  return '$n';
}

const _monthLabels = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

String blogDetailDateLong(String iso) {
  final date = DateTime.tryParse(iso);
  if (date == null) return '';
  return '${_monthLabels[date.month - 1]} ${date.day}, ${date.year}';
}
