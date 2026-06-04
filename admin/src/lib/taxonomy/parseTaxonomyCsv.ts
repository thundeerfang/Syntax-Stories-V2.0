import { previewSlugFromDisplayName } from '@/lib/slug/slugifyDisplayName';

export type TaxonomyKind = 'category' | 'tag';

export const TAXONOMY_CSV_HEADERS = ['name', 'description', 'sortOrder', 'slug'] as const;
export const TAXONOMY_CSV_HEADER_LINE = TAXONOMY_CSV_HEADERS.join(',');

export const BULK_TAXONOMY_MAX = 50;

const SLUG_MAX: Record<TaxonomyKind, number> = {
  category: 64,
  tag: 48,
};

const TEMPLATES: Record<TaxonomyKind, string> = {
  category: `${TAXONOMY_CSV_HEADER_LINE}
JavaScript,Posts about JavaScript and the web,10,
Web Dev,General web development topics,20,web-dev
DevOps,"CI/CD, containers, and cloud",30,devops`,
  tag: `${TAXONOMY_CSV_HEADER_LINE}
Tutorial,Step-by-step guides and how-tos,10,tutorial
Opinion,Thoughts and editorials,20,opinion
News,Industry and product updates,30,news`,
};

const MANUAL_PLACEHOLDERS: Record<TaxonomyKind, string> = {
  category: `JavaScript, Posts about JavaScript, 10,
Web Dev, General web development, 20, web-dev`,
  tag: `Tutorial, Step-by-step guides, 10, tutorial
Opinion, Editorials and takes, 20, opinion`,
};

const TEMPLATE_FILES: Record<TaxonomyKind, string> = {
  category: 'categories-template.csv',
  tag: 'tags-template.csv',
};

const ENTITY_LABEL: Record<TaxonomyKind, string> = {
  category: 'categories',
  tag: 'tags',
};

export type ParsedTaxonomyRow = {
  line: number;
  name: string;
  description: string;
  sortOrder: number;
  slug: string;
  slugPreview: string;
  errors: string[];
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

function parseSortOrder(raw: string): { value: number; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: 0 };
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n)) return { value: 0, error: 'sortOrder must be a number' };
  return { value: n };
}

function validateSlug(raw: string): { slug: string; error?: string } {
  const slug = raw.trim().toLowerCase();
  if (!slug) return { slug: '' };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { slug, error: 'slug must be lowercase letters, numbers, and hyphens' };
  }
  return { slug };
}

export function manualLinesToTaxonomyCsv(manualText: string): string {
  const lines = manualText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return '';
  return `${TAXONOMY_CSV_HEADER_LINE}\n${lines.join('\n')}`;
}

export function downloadTaxonomyCsvTemplate(kind: TaxonomyKind): void {
  const blob = new Blob([`${TEMPLATES[kind]}\n`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = TEMPLATE_FILES[kind];
  a.click();
  URL.revokeObjectURL(url);
}

export function isTaxonomyCsvFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel';
}

export function parseTaxonomyCsv(
  text: string,
  kind: TaxonomyKind
): { rows: ParsedTaxonomyRow[]; parseError: string | null } {
  const entity = ENTITY_LABEL[kind];
  const slugMax = SLUG_MAX[kind];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { rows: [], parseError: null };
  }

  const headerCells = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/\s+/g, ''));
  const expected = TAXONOMY_CSV_HEADERS.map((h) => h.toLowerCase());
  const headerOk =
    headerCells.length === expected.length && headerCells.every((cell, i) => cell === expected[i]);
  if (!headerOk) {
    return {
      rows: [],
      parseError: `Invalid CSV header. First row must be exactly: ${TAXONOMY_CSV_HEADER_LINE}`,
    };
  }

  const dataLines = lines.slice(1);
  if (dataLines.length > BULK_TAXONOMY_MAX) {
    return {
      rows: [],
      parseError: `Maximum ${BULK_TAXONOMY_MAX} ${entity} per import (found ${dataLines.length})`,
    };
  }

  const slugSeen = new Map<string, number>();
  const rows: ParsedTaxonomyRow[] = dataLines.map((line, index) => {
    const cells = parseCsvLine(line);
    const get = (idx: number) => (idx >= 0 && idx < cells.length ? cells[idx] : '');

    const name = get(0).trim();
    const description = get(1).trim();
    const sortRaw = get(2);
    const slugRaw = get(3);

    const errors: string[] = [];
    if (!name) errors.push('name is required');

    const sortParsed = parseSortOrder(sortRaw);
    if (sortParsed.error) errors.push(sortParsed.error);

    const slugParsed = validateSlug(slugRaw);
    if (slugParsed.error) errors.push(slugParsed.error);

    const slugPreview =
      slugParsed.slug || (name ? previewSlugFromDisplayName(name, slugMax) : '');

    if (slugPreview) {
      const prevLine = slugSeen.get(slugPreview);
      if (prevLine !== undefined) {
        errors.push(`duplicate slug (line ${prevLine})`);
      } else {
        slugSeen.set(slugPreview, index + 2);
      }
    }

    return {
      line: index + 2,
      name,
      description,
      sortOrder: sortParsed.value,
      slug: slugParsed.slug,
      slugPreview,
      errors,
    };
  });

  return { rows, parseError: null };
}

export function validTaxonomyRows(rows: ParsedTaxonomyRow[]): ParsedTaxonomyRow[] {
  return rows.filter((row) => row.errors.length === 0 && row.name.trim());
}

export function taxonomyRowsToPayload(rows: ParsedTaxonomyRow[]) {
  return validTaxonomyRows(rows).map((row) => ({
    name: row.name,
    description: row.description,
    sortOrder: row.sortOrder,
    ...(row.slug ? { slug: row.slug } : {}),
  }));
}

export function taxonomyManualPlaceholder(kind: TaxonomyKind): string {
  return MANUAL_PLACEHOLDERS[kind];
}
