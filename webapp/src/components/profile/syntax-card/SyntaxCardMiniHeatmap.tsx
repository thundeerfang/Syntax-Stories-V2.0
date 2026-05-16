'use client';

import type { HeatmapCell } from '@/lib/syntaxCardHeatmap';

const LEVEL_CLASS: Record<number, string> = {
  0: 'bg-[#e4e4e7]',
  1: 'bg-primary/25',
  2: 'bg-primary/45',
  3: 'bg-primary/70',
  4: 'bg-primary',
};

/** GitHub-style grid sized for Syntax Card export (no external calendar lib). */
export function SyntaxCardMiniHeatmap({
  cells,
  columns = 26,
  cellSize = 10,
  gap = 2,
  label,
}: Readonly<{
  cells: HeatmapCell[];
  columns?: number;
  cellSize?: number;
  gap?: number;
  label?: string;
}>) {
  const rows: HeatmapCell[][] = [];
  for (let i = 0; i < cells.length; i += columns) {
    rows.push(cells.slice(i, i + columns));
  }

  return (
    <div className="w-full">
      {label ? (
        <p className="mb-1.5 text-[9px] font-black uppercase tracking-widest text-[#71717a]">{label}</p>
      ) : null}
      <div className="flex flex-col" style={{ gap }}>
        {rows.map((row) => (
          <div key={row[0]?.date ?? 'row'} className="flex" style={{ gap }}>
            {row.map((cell) => (
              <span
                key={cell.date}
                className={LEVEL_CLASS[cell.level] ?? LEVEL_CLASS[0]}
                style={{ width: cellSize, height: cellSize }}
                aria-hidden
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
