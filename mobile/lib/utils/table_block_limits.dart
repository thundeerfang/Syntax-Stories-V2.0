const int maxTableRows = 20;
const int maxTableCols = 5;
const int maxTableCellChars = 4000;

List<List<String>> clampTableMatrix(List<List<String>> rows) {
  if (rows.isEmpty) return [['']];

  final width = rows
      .map((r) => r.length)
      .fold<int>(1, (a, b) => a > b ? a : b)
      .clamp(1, maxTableCols);
  final height = rows.length.clamp(1, maxTableRows);

  return List.generate(height, (ri) {
    final src = ri < rows.length ? rows[ri] : <String>[];
    final cells = List.generate(width, (ci) {
      final raw = ci < src.length ? src[ci] : '';
      return raw.length > maxTableCellChars ? raw.substring(0, maxTableCellChars) : raw;
    });
    return cells;
  });
}

bool tableHasContent(List<List<String>> rows) {
  for (final row in rows) {
    for (final cell in row) {
      if (cell.trim().isNotEmpty) return true;
    }
  }
  return false;
}

bool tableWithinLimits(List<List<String>> rows) {
  if (rows.length > maxTableRows) return false;
  for (final row in rows) {
    if (row.length > maxTableCols) return false;
  }
  return true;
}

/// Columns to show in preview — drops trailing columns that are empty in every row.
int tableEffectiveColCount(List<List<String>> rows) {
  if (rows.isEmpty) return 1;
  var width = rows.fold<int>(1, (w, row) => row.length > w ? row.length : w);
  while (width > 1) {
    final trailingEmpty = rows.every(
      (row) => width - 1 >= row.length || row[width - 1].trim().isEmpty,
    );
    if (!trailingEmpty) break;
    width--;
  }
  return width;
}
