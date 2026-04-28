/**
 * Parse clipboard / pasted text into a row×column matrix.
 * Supports tab-separated values and markdown-style pipe rows.
 */
export function parseTableFromText(raw: string): string[][] | null {
  const text = raw.trim();
  if (!text) return null;
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return null;

  const tabCount = lines.filter((l) => l.includes('\t')).length;
  if (tabCount >= Math.ceil(lines.length * 0.45)) {
    return lines.map((line) => line.split('\t').map((c) => c.trim()));
  }

  const pipeHeavy = lines.filter((l) => l.includes('|')).length;
  if (pipeHeavy >= 2) {
    const rows: string[][] = [];
    for (const line of lines) {
      if (/^\s*\|?[\s\-:|]+\|?\s*$/.test(line.replace(/[^\s\-:|]/g, '')) && /[-]{2,}/.test(line)) {
        continue;
      }
      const rawCells = line.split('|');
      const cells = rawCells
        .map((c) => c.trim())
        .filter((c, i, arr) => !(i === 0 && c === '') && !(i === arr.length - 1 && c === ''));
      if (cells.length) rows.push(cells);
    }
    return rows.length >= 2 ? rows : null;
  }

  return null;
}
