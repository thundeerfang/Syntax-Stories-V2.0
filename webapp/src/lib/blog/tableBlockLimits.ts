export const MAX_TABLE_ROWS = 20;
export const MAX_TABLE_COLS = 5;
export const MAX_TABLE_CELL_CHARS = 4000;
export function tableHasContent(rows: string[][]): boolean {
  return rows.some((row) => row.some((cell) => cell.trim().length > 0));
}
export function clampTableMatrix(
  rows: string[][],
  maxRows: number,
  maxCols: number,
  maxCellChars: number,
): string[][] {
  if (!rows.length) return [[""]];
  const w = Math.min(maxCols, Math.max(1, ...rows.map((r) => r.length)));
  const h = Math.min(maxRows, Math.max(1, rows.length));
  return rows.slice(0, h).map((r) => {
    const cells = r
      .slice(0, w)
      .map((c) => (c.length > maxCellChars ? c.slice(0, maxCellChars) : c));
    while (cells.length < w) cells.push("");
    return cells;
  });
}
export function truncateCell(value: string, maxCellChars: number): string {
  if (value.length <= maxCellChars) return value;
  return value.slice(0, maxCellChars);
}
export function tableEffectiveColCount(rows: string[][]): number {
  if (!rows.length) return 1;
  let width = Math.max(1, ...rows.map((row) => row.length));
  while (width > 1) {
    const trailingEmpty = rows.every(
      (row) => width - 1 >= row.length || row[width - 1].trim().length === 0,
    );
    if (!trailingEmpty) break;
    width--;
  }
  return width;
}
