/** Full month names (settings forms, long display). */
export const MONTH_NAMES_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** Short month labels (cards, heatmaps). */
export const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const PROFILE_DATE_START_YEAR = 1980;

export function profileYearOptions(endYear = new Date().getFullYear()) {
  return Array.from({ length: endYear - PROFILE_DATE_START_YEAR + 1 }, (_, i) => {
    const y = endYear - i;
    return { value: String(y), label: String(y) };
  });
}

export const MONTH_SELECT_OPTIONS = MONTH_NAMES_FULL.map((m, i) => ({
  value: String(i + 1).padStart(2, '0'),
  label: m,
}));

export function monthYearToValue(month: string, year: string): string {
  if (!month || !year) return '';
  return `${year}-${month}`;
}

export function valueToMonthYear(val: string): { month: string; year: string } {
  if (!val || val.length < 7) return { month: '', year: '' };
  const [y, m] = val.split('-');
  return { month: m ?? '', year: y ?? '' };
}

/** Format `YYYY-MM` → `Jan 2024`. */
export function formatMonthYearShort(val: string): string {
  if (!val || val.length < 7) return '';
  const [y, m] = val.split('-');
  const monthNum = parseInt(m ?? '', 10);
  if (Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12) return val;
  return `${MONTH_NAMES_SHORT[monthNum - 1]} ${y}`;
}

/** Format `YYYY-MM` using full month name, abbreviated to 3 letters. */
export function formatMonthYearMedium(val: string): string {
  if (!val || val.length < 7) return '';
  const [y, m] = val.split('-');
  const monthNum = parseInt(m ?? '', 10);
  if (Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12) return val;
  return `${MONTH_NAMES_FULL[monthNum - 1]!.slice(0, 3)} ${y}`;
}

export function yearOptionsFromMin(
  minYear: string | undefined,
  endYear = new Date().getFullYear()
) {
  const all = profileYearOptions(endYear);
  const n = parseInt(minYear ?? '', 10);
  if (!Number.isFinite(n)) return all;
  const min = Math.max(PROFILE_DATE_START_YEAR, Math.min(endYear, n));
  return all.filter((o) => parseInt(o.value, 10) >= min);
}
