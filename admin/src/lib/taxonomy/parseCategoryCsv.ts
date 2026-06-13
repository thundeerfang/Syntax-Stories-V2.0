import {
  BULK_TAXONOMY_MAX,
  TAXONOMY_CSV_HEADER_LINE,
  TAXONOMY_CSV_HEADERS,
  downloadTaxonomyCsvTemplate,
  isTaxonomyCsvFile,
  manualLinesToTaxonomyCsv,
  parseTaxonomyCsv,
  taxonomyManualPlaceholder,
  taxonomyRowsToPayload,
  validTaxonomyRows,
  type ParsedTaxonomyRow,
} from './parseTaxonomyCsv';

export {
  BULK_TAXONOMY_MAX as BULK_CATEGORY_MAX,
  TAXONOMY_CSV_HEADER_LINE as CATEGORY_CSV_HEADER_LINE,
  TAXONOMY_CSV_HEADERS as CATEGORY_CSV_HEADERS,
  type ParsedTaxonomyRow as ParsedCategoryRow,
};

export const CATEGORY_CSV_TEMPLATE = `${TAXONOMY_CSV_HEADER_LINE}
JavaScript,Posts about JavaScript and the web,10,
Web Dev,General web development topics,20,web-dev
DevOps,"CI/CD, containers, and cloud",30,devops`;

export const CATEGORY_MANUAL_PLACEHOLDER = taxonomyManualPlaceholder('category');

export function downloadCategoryCsvTemplate(): void {
  downloadTaxonomyCsvTemplate('category');
}

export const isCategoryCsvFile = isTaxonomyCsvFile;
export const manualLinesToCategoryCsv = manualLinesToTaxonomyCsv;
export const validCategoryRows = validTaxonomyRows;
export const categoryRowsToPayload = taxonomyRowsToPayload;

export function parseCategoryCsv(text: string) {
  return parseTaxonomyCsv(text, 'category');
}
