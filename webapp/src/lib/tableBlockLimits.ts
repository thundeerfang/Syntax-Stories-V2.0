/** Raw paste buffer (TSV / pipe markdown) — hard cap to keep payloads reasonable. */
export const MAX_TABLE_PASTE_CHARS = 200_000;

/** Stored string per cell (UI + persistence). */
export const MAX_TABLE_CELL_CHARS = 4_000;

/** Clamp pasted / parsed matrix to editor limits (rows, cols, cell length). */
export function clampTableMatrix(
  rows: string[][],
  maxRows: number,
  maxCols: number,
  maxCellChars: number,
): string[][] {
  if (!rows.length) return [['']];
  const w = Math.min(maxCols, Math.max(1, ...rows.map((r) => r.length)));
  const h = Math.min(maxRows, Math.max(1, rows.length));
  return rows.slice(0, h).map((r) => {
    const cells = r.slice(0, w).map((c) => (c.length > maxCellChars ? c.slice(0, maxCellChars) : c));
    while (cells.length < w) cells.push('');
    return cells;
  });
}

export function truncateCell(value: string, maxCellChars: number): string {
  if (value.length <= maxCellChars) return value;
  return value.slice(0, maxCellChars);
}
