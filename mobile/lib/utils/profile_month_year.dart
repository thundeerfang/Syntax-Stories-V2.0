const profileMonthOptions = [
  ('01', 'Jan'),
  ('02', 'Feb'),
  ('03', 'Mar'),
  ('04', 'Apr'),
  ('05', 'May'),
  ('06', 'Jun'),
  ('07', 'Jul'),
  ('08', 'Aug'),
  ('09', 'Sep'),
  ('10', 'Oct'),
  ('11', 'Nov'),
  ('12', 'Dec'),
];

const profileDateStartYear = 1980;

/// Latest selectable year for certification expiration (matches server `@syntax-stories/shared`).
const profileCertExpirationEndYear = 2050;

List<String> profileYearOptions({int minYear = profileDateStartYear, int? maxYear}) {
  final end = maxYear ?? DateTime.now().year;
  final start = minYear > end ? end : minYear;
  return [for (var y = end; y >= start; y--) y.toString()];
}

String? monthYearToValue(String? month, String? year) {
  final m = month?.trim();
  final y = year?.trim();
  if (m == null || m.isEmpty || y == null || y.isEmpty) return null;
  if (m.length == 1) return '$y-0$m';
  return '$y-$m';
}

({String month, String year}) valueToMonthYear(String? value) {
  final raw = value?.trim() ?? '';
  if (!RegExp(r'^\d{4}-\d{2}$').hasMatch(raw)) {
    return (month: '', year: '');
  }
  final parts = raw.split('-');
  return (month: parts[1], year: parts[0]);
}

String formatMonthYearLabel(String? value) {
  final parsed = valueToMonthYear(value);
  if (parsed.month.isEmpty || parsed.year.isEmpty) return '';
  final label = profileMonthOptions
      .where((m) => m.$1 == parsed.month)
      .map((m) => m.$2)
      .firstOrNull;
  return '${label ?? parsed.month} ${parsed.year}';
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull {
    final it = iterator;
    if (!it.moveNext()) return null;
    return it.current;
  }
}
